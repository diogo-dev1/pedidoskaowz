// Notificações push de carrinhos perdidos (mesma fonte da tela /checkouts-abandonados)
import { createClient } from 'npm:@supabase/supabase-js@2';
import { corsHeaders } from 'npm:@supabase/supabase-js@2/cors';
import { z } from 'npm:zod@3.23.8';
import webpush from 'npm:web-push@3.6.7';
import { authenticatedRequest } from '../_shared/auth.ts';
import { buscarCheckouts, clienteComprouDepois, type CheckoutSimplificado } from '../_shared/checkoutsShopify.ts';

const BodySchema = z.object({
  acao: z.enum(['chave_publica', 'testar', 'verificar']),
  endpoint: z.string().url().max(2000).optional(),
});

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });

const admin = () => createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!);

const brl = (v: number) => v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

async function lerConfig(db: ReturnType<typeof admin>, chave: string): Promise<string | null> {
  const { data } = await db.from('push_config').select('valor').eq('chave', chave).maybeSingle();
  return data?.valor ?? null;
}

async function prepararVapid(db: ReturnType<typeof admin>): Promise<string> {
  let pub = await lerConfig(db, 'vapid_public');
  let priv = await lerConfig(db, 'vapid_private');
  if (!pub || !priv) {
    const k = webpush.generateVAPIDKeys();
    // ignoreDuplicates evita sobrescrever se outra execução gerou ao mesmo tempo
    await db.from('push_config').upsert(
      [{ chave: 'vapid_public', valor: k.publicKey }, { chave: 'vapid_private', valor: k.privateKey }],
      { onConflict: 'chave', ignoreDuplicates: true },
    );
    pub = await lerConfig(db, 'vapid_public');
    priv = await lerConfig(db, 'vapid_private');
  }
  webpush.setVapidDetails('mailto:kaowzfacas@gmail.com', pub!, priv!);
  return pub!;
}

interface Aparelho { id: string; endpoint: string; p256dh: string; auth: string; falhas: number }

/** Envia para cada aparelho e atualiza seu estado. Devolve quantos receberam. */
async function enviar(db: ReturnType<typeof admin>, aparelhos: Aparelho[], payload: Record<string, unknown>): Promise<number> {
  let ok = 0;
  const body = JSON.stringify(payload);
  for (const a of aparelhos) {
    try {
      await webpush.sendNotification({ endpoint: a.endpoint, keys: { p256dh: a.p256dh, auth: a.auth } }, body, { TTL: 3600, urgency: 'high' });
      ok++;
      a.falhas = 0;
      await db.from('push_aparelhos').update({ falhas: 0, ultimo_envio_em: new Date().toISOString(), ultimo_erro: null }).eq('id', a.id);
    } catch (e) {
      const status = (e as { statusCode?: number }).statusCode;
      const msg = `${status ?? ''} ${(e as Error).message ?? e}`.trim().slice(0, 300);
      console.warn('push falhou', a.id, msg);
      if (status === 404 || status === 410) {
        await db.from('push_aparelhos').update({ ativo: false, ultimo_erro: msg }).eq('id', a.id);
      } else {
        a.falhas += 1;
        await db.from('push_aparelhos').update({ falhas: a.falhas, ultimo_erro: msg, ativo: a.falhas < 5 }).eq('id', a.id);
      }
    }
  }
  return ok;
}

function itensTexto(c: CheckoutSimplificado) {
  return c.itens.map((i) => `${i.quantidade}x ${i.titulo}`).join(', ');
}

function corpoCarrinho(c: CheckoutSimplificado) {
  const local = [c.cidade, c.estado].filter(Boolean).join('/');
  const itens = itensTexto(c);
  let s = c.nome + (itens ? ` — ${itens}` : '') + (local ? ` · ${local}` : '');
  if (s.length > 120) s = s.slice(0, 119).trimEnd() + '…';
  return s;
}

async function verificar(db: ReturnType<typeof admin>) {
  const checkouts = await buscarCheckouts(2);
  const semeado = await lerConfig(db, 'carrinhos_semeado');
  const reg = (c: CheckoutSimplificado, situacao: string, aparelhos = 0) => ({
    checkout_id: c.id, situacao, nome: c.nome, total: parseFloat(c.total) || 0,
    criado_no_shopify: c.criado_em, aparelhos,
  });

  if (semeado !== 'true') {
    if (checkouts.length) {
      await db.from('carrinhos_notificados').upsert(checkouts.map((c) => reg(c, 'existente_na_instalacao')), { onConflict: 'checkout_id', ignoreDuplicates: true });
    }
    await db.from('push_config').upsert({ chave: 'carrinhos_semeado', valor: 'true' }, { onConflict: 'chave' });
    return { semeado: true, novos: 0, notificados: 0, ignorados: checkouts.length, aparelhos: 0 };
  }

  const ids = checkouts.map((c) => c.id);
  const conhecidos = new Set<string>();
  for (let i = 0; i < ids.length; i += 200) {
    const { data } = await db.from('carrinhos_notificados').select('checkout_id').in('checkout_id', ids.slice(i, i + 200));
    (data ?? []).forEach((r) => conhecidos.add(r.checkout_id));
  }
  const novos = checkouts.filter((c) => !conhecidos.has(c.id));

  const aNotificar: CheckoutSimplificado[] = [];
  let ignorados = 0;
  for (const c of novos) {
    if (c.email) {
      try {
        if (await clienteComprouDepois(c.email, c.criado_em)) {
          await db.from('carrinhos_notificados').upsert(reg(c, 'cliente_comprou'), { onConflict: 'checkout_id' });
          ignorados++;
          continue;
        }
      } catch (e) {
        console.warn('checagem de compra falhou', c.id, (e as Error).message);
      }
    }
    aNotificar.push(c);
  }

  const { data: aps } = await db.from('push_aparelhos').select('id, endpoint, p256dh, auth, falhas')
    .eq('ativo', true).contains('tipos', ['carrinho_perdido']);
  const aparelhos = (aps ?? []) as Aparelho[];
  if (aNotificar.length && aparelhos.length) await prepararVapid(db);

  let notificados = 0;
  if (aNotificar.length >= 4) {
    const total = aNotificar.reduce((s, c) => s + (parseFloat(c.total) || 0), 0);
    let corpo = aNotificar.map((c) => c.nome.split(' ')[0]).join(', ');
    if (corpo.length > 120) corpo = corpo.slice(0, 119) + '…';
    const rec = aparelhos.length ? await enviar(db, aparelhos, {
      title: `${aNotificar.length} carrinhos perdidos · ${brl(total)}`, body: corpo,
      url: '/checkouts-abandonados', tag: 'carrinhos-resumo',
    }) : 0;
    for (const c of aNotificar) await db.from('carrinhos_notificados').upsert(reg(c, 'notificado', rec), { onConflict: 'checkout_id' });
    notificados = aNotificar.length;
  } else {
    for (const c of aNotificar) {
      try {
        const rec = aparelhos.length ? await enviar(db, aparelhos.filter((_, i) => i >= 0), {
          title: `Carrinho perdido · ${brl(parseFloat(c.total) || 0)}`, body: corpoCarrinho(c),
          url: `/checkouts-abandonados?checkout=${c.id}`, tag: `carrinho-${c.id}`,
        }) : 0;
        await db.from('carrinhos_notificados').upsert(reg(c, 'notificado', rec), { onConflict: 'checkout_id' });
        notificados++;
      } catch (e) {
        console.error('falha ao notificar carrinho', c.id, (e as Error).message);
      }
    }
  }
  return { novos: novos.length, notificados, ignorados, aparelhos: aparelhos.length };
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  try {
    let raw: unknown = {};
    try { raw = await req.json(); } catch (_) { /* vazio */ }
    const parsed = BodySchema.safeParse(raw ?? {});
    if (!parsed.success) return json({ error: parsed.error.flatten().fieldErrors }, 400);
    const { acao, endpoint } = parsed.data;
    const db = admin();

    if (acao === 'verificar') {
      const anon = Deno.env.get('SUPABASE_ANON_KEY');
      const bearer = (req.headers.get('Authorization') || '').replace(/^Bearer\s+/i, '');
      const apikey = req.headers.get('apikey') || '';
      const permitido = (anon && (apikey === anon || bearer === anon)) || await authenticatedRequest(req);
      if (!permitido) return json({ error: 'Não autorizado' }, 401);
      return json(await verificar(db));
    }

    if (!(await authenticatedRequest(req))) return json({ error: 'Faça login para continuar' }, 401);

    if (acao === 'chave_publica') return json({ chave: await prepararVapid(db) });

    // testar
    if (!endpoint) return json({ error: 'Informe o endpoint do aparelho' }, 400);
    await prepararVapid(db);
    const { data: ap } = await db.from('push_aparelhos').select('id, endpoint, p256dh, auth, falhas').eq('endpoint', endpoint).maybeSingle();
    if (!ap) return json({ error: 'Aparelho não encontrado' }, 404);
    const rec = await enviar(db, [ap as Aparelho], {
      title: 'Notificações ativadas',
      body: 'Este aparelho vai receber os carrinhos perdidos da Kaowz.',
      url: '/checkouts-abandonados', tag: 'teste-notificacao',
    });
    return json({ enviado: rec === 1 });
  } catch (e) {
    console.error('notificar-carrinhos erro:', (e as Error).message);
    return json({ error: (e as Error).message }, 500);
  }
});
