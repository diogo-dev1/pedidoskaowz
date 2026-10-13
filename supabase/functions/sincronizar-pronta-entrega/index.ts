// Pronta Entrega: sincroniza pedidos pagos do Shopify, aplica tags, espelha na planilha
// e executa as ações da página /pronta-entrega (definir modo, marcar enviado, desfazer, manual).
import { createClient } from 'npm:@supabase/supabase-js@2';
import {
  classificarItemPE, calcularPrazoLimite, prazoDoPedido, type ItemPE, TZ_BR,
} from '../_shared/prontaEntrega.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};
const API_VERSION = '2026-07';
const json = (b: unknown, status = 200) =>
  new Response(JSON.stringify(b), { status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });

// ───────────── Shopify ─────────────
function resolveDomain(): string {
  const raw = Deno.env.get('SHOPIFY_STORE_DOMAIN') ?? Deno.env.get('SHOPIFY_SHOP') ?? Deno.env.get('SHOPIFY_STORE_URL') ?? '';
  return raw.replace(/^https?:\/\//, '').replace(/\/$/, '');
}
let tokenCache: string | null = null;
async function getAccessToken(domain: string): Promise<string> {
  if (tokenCache) return tokenCache;
  const res = await fetch(`https://${domain}/admin/oauth/access_token`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
    body: JSON.stringify({
      grant_type: 'client_credentials',
      client_id: Deno.env.get('SHOPIFY_CLIENT_ID'),
      client_secret: Deno.env.get('SHOPIFY_CLIENT_SECRET'),
    }),
  });
  const t = await res.text();
  if (!res.ok) throw new Error(`Falha no token Shopify (HTTP ${res.status}): ${t.slice(0, 200)}`);
  tokenCache = JSON.parse(t).access_token;
  return tokenCache!;
}
async function shopify(query: string, variables: Record<string, unknown>) {
  const domain = resolveDomain();
  if (!domain) throw new Error('Shopify não configurado');
  const token = await getAccessToken(domain);
  const res = await fetch(`https://${domain}/admin/api/${API_VERSION}/graphql.json`, {
    method: 'POST',
    headers: { 'X-Shopify-Access-Token': token, 'Content-Type': 'application/json' },
    body: JSON.stringify({ query, variables }),
  });
  const t = await res.text();
  if (!res.ok) throw new Error(`Shopify HTTP ${res.status}: ${t.slice(0, 300)}`);
  const j = JSON.parse(t);
  if (j.errors?.length) throw new Error(j.errors.map((e: any) => e.message).join(' | '));
  return j.data;
}
const ORDERS_Q = `query($q: String!, $after: String) {
  orders(first: 50, query: $q, after: $after, sortKey: PROCESSED_AT) {
    pageInfo { hasNextPage endCursor }
    edges { node {
      id name tags processedAt
      customer { displayName phone }
      shippingAddress { name phone }
      customAttributes { key value }
      transactions(first: 20) { kind status processedAt }
      lineItems(first: 50) { edges { node { name quantity vendor customAttributes { key value } } } }
    } }
  } }`;
const TAGS_ADD = `mutation($id: ID!, $tags: [String!]!) { tagsAdd(id: $id, tags: $tags) { userErrors { message } } }`;
const TAGS_REMOVE = `mutation($id: ID!, $tags: [String!]!) { tagsRemove(id: $id, tags: $tags) { userErrors { message } } }`;

async function tags(op: 'add' | 'remove', orderId: string | null, list: string[]): Promise<boolean> {
  if (!orderId || !list.length) return false;
  try {
    const d = await shopify(op === 'add' ? TAGS_ADD : TAGS_REMOVE, { id: orderId, tags: list });
    const errs = d?.[op === 'add' ? 'tagsAdd' : 'tagsRemove']?.userErrors ?? [];
    if (errs.length) { console.warn('tags userErrors', errs); return false; }
    return true;
  } catch (e) { console.warn('tags falhou', (e as Error).message); return false; }
}

// ───────────── Google Sheets (mesma autenticação do Sincronizar Pedidos) ─────────────
async function getGoogleAccessToken(serviceAccountKey: string): Promise<string> {
  const credentials = JSON.parse(serviceAccountKey);
  const now = Math.floor(Date.now() / 1000);
  const b64url = (s: string) => btoa(s).replace(/=/g, '').replace(/\+/g, '-').replace(/\//g, '_');
  const input = `${b64url(JSON.stringify({ alg: 'RS256', typ: 'JWT' }))}.${b64url(JSON.stringify({
    iss: credentials.client_email, scope: 'https://www.googleapis.com/auth/spreadsheets',
    aud: 'https://oauth2.googleapis.com/token', exp: now + 3600, iat: now,
  }))}`;
  const pem = credentials.private_key.replace(/-----BEGIN PRIVATE KEY-----/, '').replace(/-----END PRIVATE KEY-----/, '').replace(/\s/g, '');
  const key = await crypto.subtle.importKey('pkcs8', Uint8Array.from(atob(pem), (c) => c.charCodeAt(0)),
    { name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-256' }, false, ['sign']);
  const sig = await crypto.subtle.sign('RSASSA-PKCS1-v1_5', key, new TextEncoder().encode(input));
  const jwt = `${input}.${btoa(String.fromCharCode(...new Uint8Array(sig))).replace(/=/g, '').replace(/\+/g, '-').replace(/\//g, '_')}`;
  const res = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({ grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer', assertion: jwt }),
  });
  const d = await res.json();
  if (!d.access_token) throw new Error('Falha ao obter token Google');
  return d.access_token;
}
const ABA_ESPELHO = 'Pronta entrega';
const ABA_MANUAL = 'PE - Entrada manual';
const CAB_ESPELHO = ['Pedido', 'Origem', 'Cliente', 'Telefone', 'Vendedor', 'Pago em', 'Itens prontos', 'Itens sob encomenda',
  'Modo de envio', 'Prazo limite', 'Status', 'Enviado em', 'Enviado por', 'Rastreio', 'Observação'];
const CAB_MANUAL = ['Cliente', 'Telefone', 'Itens', 'Pago em', 'Prazo dias úteis', 'Observação', 'Importado'];

async function gs(token: string, path: string, init: RequestInit = {}) {
  const sid = Deno.env.get('GOOGLE_SHEETS_VENDAS_ID');
  const res = await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${sid}${path}`, {
    ...init, headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
  });
  const t = await res.text();
  if (!res.ok) throw new Error(`Sheets HTTP ${res.status}: ${t.slice(0, 200)}`);
  return t ? JSON.parse(t) : {};
}
async function garantirAbas(token: string) {
  const meta = await gs(token, '?fields=sheets.properties.title');
  const titulos = (meta.sheets ?? []).map((s: any) => s.properties?.title);
  const novas = [ABA_ESPELHO, ABA_MANUAL].filter((t) => !titulos.includes(t));
  if (novas.length) {
    await gs(token, ':batchUpdate', { method: 'POST', body: JSON.stringify({ requests: novas.map((title) => ({ addSheet: { properties: { title } } })) }) });
  }
  if (novas.includes(ABA_MANUAL)) {
    await gs(token, `/values/${encodeURIComponent(`'${ABA_MANUAL}'!A1:G1`)}?valueInputOption=RAW`, { method: 'PUT', body: JSON.stringify({ values: [CAB_MANUAL] }) });
  }
}

// ───────────── Helpers ─────────────
const modoTexto: Record<string, string> = { junto: 'Tudo junto', parcial: 'Pronta entrega primeiro', a_definir: 'A definir' };
const statusTexto: Record<string, string> = { pendente: 'Pendente', enviado_parcial: 'Enviado parcial', enviado: 'Enviado' };
const dataBR = (iso?: string | null) => iso ? new Date(iso).toLocaleString('pt-BR', { timeZone: TZ_BR }) : '';
const diaBR = (ymd?: string | null) => ymd ? ymd.split('-').reverse().join('/') : '';
const itensTexto = (it: ItemPE[]) => it.map((i) => `${i.quantidade}x ${i.titulo}`).join('; ');

function parseItensTexto(txt: string, prazo: number): ItemPE[] {
  return String(txt ?? '').split(/[\n;]+/).map((l) => l.trim()).filter(Boolean).map((l) => {
    const m = l.match(/^(\d+)\s*x\s*(.+)$/i);
    return { titulo: m ? m[2].trim() : l, quantidade: m ? parseInt(m[1], 10) : 1, pronta_entrega: true, prazo_dias_uteis: prazo, enviado: false, enviado_em: null };
  });
}
function parseDataBR(s: string): Date | null {
  const m = String(s ?? '').trim().match(/^(\d{1,2})\/(\d{1,2})\/(\d{2,4})(?:\s+(\d{1,2}):(\d{2}))?/);
  if (!m) { const d = new Date(s); return isNaN(d.getTime()) ? null : d; }
  let y = parseInt(m[3], 10); if (y < 100) y += 2000;
  // Hora de São Paulo (UTC-3)
  return new Date(Date.UTC(y, parseInt(m[2], 10) - 1, parseInt(m[1], 10), (m[4] ? parseInt(m[4], 10) : 9) + 3, m[5] ? parseInt(m[5], 10) : 0));
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  try {
    const url = Deno.env.get('SUPABASE_URL')!;
    const authHeader = req.headers.get('Authorization') ?? '';
    const userClient = createClient(url, Deno.env.get('SUPABASE_ANON_KEY')!, { global: { headers: { Authorization: authHeader } } });
    const { data: u } = await userClient.auth.getUser();
    if (!u?.user) return json({ sucesso: false, erro: 'Faça login para usar a Pronta Entrega' }, 401);
    const db = createClient(url, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!);

    const body = await req.json().catch(() => ({}));
    const acao = String(body?.acao ?? 'sincronizar');

    const [{ data: fer }, { data: cfg }] = await Promise.all([
      db.from('feriados').select('data'),
      db.from('config_expedicao').select('chave, valor'),
    ]);
    const feriados = new Set<string>((fer ?? []).map((f: any) => f.data));
    const corte = (cfg ?? []).find((c: any) => c.chave === 'horario_corte')?.valor || '14:00';
    const prazoLimite = (pag: string | null, itens: ItemPE[], modo: string | null) =>
      calcularPrazoLimite(pag ? new Date(pag) : new Date(), prazoDoPedido(itens, modo), corte, feriados);

    const carregar = async (id: string) => {
      const { data, error } = await db.from('pedidos_pronta_entrega').select('*').eq('id', id).single();
      if (error || !data) throw new Error('Pedido não encontrado');
      return data as any;
    };

    // ───── Ações da página ─────
    if (acao === 'definir_modo') {
      const modo = body.modo === 'junto' ? 'junto' : body.modo === 'parcial' ? 'parcial' : null;
      if (!modo) return json({ sucesso: false, erro: 'Modo inválido' }, 400);
      const p = await carregar(String(body.id));
      await db.from('pedidos_pronta_entrega').update({ modo_envio: modo, prazo_limite: prazoLimite(p.data_pagamento, p.itens, modo) }).eq('id', p.id);
      await tags('add', p.shopify_order_id, [modo === 'junto' ? 'Envio junto' : 'Envio parcial']);
      return json({ sucesso: true });
    }

    if (acao === 'marcar_enviado') {
      const enviadoPor = String(body.enviado_por ?? '').trim();
      const p = await carregar(String(body.id));
      const agora = new Date().toISOString();
      const itens: ItemPE[] = p.itens ?? [];
      // Parcial ou só pronta → envia os prontos; junto/encomenda restante → envia tudo que falta
      const soProntos = p.status === 'pendente' && p.modo_envio !== 'junto';
      const novos = itens.map((i) => (!i.enviado && (!soProntos || i.pronta_entrega)) ? { ...i, enviado: true, enviado_em: agora } : i);
      const restante = novos.some((i) => !i.enviado);
      const status = restante ? 'enviado_parcial' : 'enviado';
      await db.from('pedidos_pronta_entrega').update({
        itens: novos, status, enviado_em: agora, enviado_por: enviadoPor || p.enviado_por || null,
        rastreio: String(body.rastreio ?? '').trim() || p.rastreio,
        observacao: String(body.observacao ?? '').trim() || p.observacao,
      }).eq('id', p.id);
      if (status === 'enviado') {
        await tags('remove', p.shopify_order_id, ['Enviado parcial']);
        await tags('add', p.shopify_order_id, ['Enviado']);
      } else await tags('add', p.shopify_order_id, ['Enviado parcial']);
      return json({ sucesso: true, status });
    }

    if (acao === 'desfazer') {
      const p = await carregar(String(body.id));
      const itens: ItemPE[] = p.itens ?? [];
      const ultimo = p.enviado_em ? new Date(p.enviado_em).getTime() : 0;
      const novos = itens.map((i) => i.enviado && i.enviado_em && Math.abs(new Date(i.enviado_em).getTime() - ultimo) < 1000
        ? { ...i, enviado: false, enviado_em: null } : i);
      const algum = novos.filter((i) => i.enviado && i.enviado_em);
      const status = algum.length ? 'enviado_parcial' : 'pendente';
      const anterior = algum.length ? algum.map((i) => i.enviado_em!).sort().at(-1)! : null;
      await db.from('pedidos_pronta_entrega').update({
        itens: novos, status, enviado_em: anterior, ...(status === 'pendente' ? { enviado_por: null } : {}),
      }).eq('id', p.id);
      if (p.status === 'enviado') {
        await tags('remove', p.shopify_order_id, ['Enviado']);
        if (status === 'enviado_parcial') await tags('add', p.shopify_order_id, ['Enviado parcial']);
      } else await tags('remove', p.shopify_order_id, ['Enviado parcial']);
      return json({ sucesso: true, status });
    }

    if (acao === 'adicionar_manual') {
      const cliente = String(body.cliente_nome ?? '').trim();
      const prazo = Math.max(1, Number(body.prazo_dias_uteis) || 5);
      const itens = parseItensTexto(body.itens ?? '', prazo);
      if (!cliente || !itens.length) return json({ sucesso: false, erro: 'Informe o cliente e pelo menos um item' }, 400);
      const pag = body.data_pagamento ? new Date(body.data_pagamento).toISOString() : new Date().toISOString();
      const { error } = await db.from('pedidos_pronta_entrega').insert({
        pedido_numero: `MAN-${Date.now()}`, origem: 'manual', cliente_nome: cliente,
        cliente_telefone: String(body.cliente_telefone ?? '').trim() || null, data_pagamento: pag,
        itens, classificacao: 'pronta', modo_envio: null, prazo_limite: prazoLimite(pag, itens, null),
        observacao: String(body.observacao ?? '').trim() || null,
      });
      if (error) throw error;
      return json({ sucesso: true });
    }

    // ───── Sincronização ─────
    const resumo = { novos: 0, atualizados: 0, tags_aplicadas: 0, manuais_importados: 0, avisos: [] as string[] };
    const desde = new Date(Date.now() - 90 * 86400000).toISOString().slice(0, 10);
    const pedidos: any[] = [];
    let after: string | null = null;
    for (let pag = 0; pag < 20; pag++) {
      const d = await shopify(ORDERS_Q, { q: `financial_status:paid processed_at:>=${desde}`, after });
      for (const e of d?.orders?.edges ?? []) pedidos.push(e.node);
      if (!d?.orders?.pageInfo?.hasNextPage) break;
      after = d.orders.pageInfo.endCursor;
    }

    const nomes = pedidos.map((o) => o.name);
    const existentes = new Map<string, any>();
    for (let i = 0; i < nomes.length; i += 200) {
      const { data } = await db.from('pedidos_pronta_entrega').select('*').in('pedido_numero', nomes.slice(i, i + 200));
      (data ?? []).forEach((r: any) => existentes.set(r.pedido_numero, r));
    }

    for (const o of pedidos) {
      const itensNovos: ItemPE[] = (o.lineItems?.edges ?? []).map((e: any) => {
        const n = e.node;
        const c = classificarItemPE(n.vendor, n.customAttributes);
        return { titulo: n.name, quantidade: n.quantity, pronta_entrega: c.pronta, prazo_dias_uteis: c.prazo, enviado: false, enviado_em: null };
      });
      if (!itensNovos.some((i) => i.pronta_entrega)) continue;
      const misto = itensNovos.some((i) => !i.pronta_entrega);
      const tagsAtuais: string[] = o.tags ?? [];
      const temTag = (t: string) => tagsAtuais.some((x) => x.toLowerCase() === t.toLowerCase());
      const origem = temTag('Kaowz-Simulador') ? 'simulador' : 'site';
      // Sem decisão explícita, pedidos comuns do site seguem juntos; só drafts aguardam definição.
      const modoShopify = temTag('Envio parcial') ? 'parcial' : temTag('Envio junto') ? 'junto' : misto ? (origem === 'simulador' ? 'a_definir' : 'junto') : null;
      const pago = (o.transactions ?? []).filter((t: any) => t.status === 'SUCCESS' && ['SALE', 'CAPTURE'].includes(t.kind))
        .map((t: any) => t.processedAt).sort()[0] ?? o.processedAt;
      const vendTag = tagsAtuais.find((t) => /^vendedor:/i.test(t));
      const vendedor = (o.customAttributes ?? []).find((a: any) => a.key === 'Vendedor')?.value ?? (vendTag ? vendTag.split(':').slice(1).join(':').trim() : null);
      const ex = existentes.get(o.name);
      // Mantém as flags de envio já registradas no app
      const itens = itensNovos.map((i, idx) => {
        const antigos: ItemPE[] = ex?.itens ?? [];
        const antigo = antigos[idx]?.titulo === i.titulo ? antigos[idx] : antigos.find((a) => a.titulo === i.titulo);
        return antigo ? { ...i, enviado: !!antigo.enviado, enviado_em: antigo.enviado_em ?? null } : i;
      });
      // modo_envio já definido no app nunca é sobrescrito
      const modo = ex?.modo_envio && ex.modo_envio !== 'a_definir' ? ex.modo_envio : modoShopify;
      const camposShopify = {
        shopify_order_id: o.id,
        origem,
        cliente_nome: o.customer?.displayName ?? o.shippingAddress?.name ?? null,
        cliente_telefone: o.customer?.phone ?? o.shippingAddress?.phone ?? null,
        vendedor, data_pagamento: pago, itens,
        classificacao: misto ? 'misto' : 'pronta',
        prazo_limite: prazoLimite(pago, itens, modo),
        synced_at: new Date().toISOString(),
      };
      if (ex) {
        await db.from('pedidos_pronta_entrega').update({ ...camposShopify, ...(ex.modo_envio && ex.modo_envio !== 'a_definir' ? {} : { modo_envio: modo }) }).eq('id', ex.id);
        resumo.atualizados++;
      } else {
        const { error } = await db.from('pedidos_pronta_entrega').insert({ pedido_numero: o.name, ...camposShopify, modo_envio: modo });
        if (error) resumo.avisos.push(`${o.name}: ${error.message}`); else resumo.novos++;
      }
      const faltando = ['Contém pronta entrega', ...(misto ? ['Misto'] : [])].filter((t) => !temTag(t));
      if (faltando.length && await tags('add', o.id, faltando)) resumo.tags_aplicadas += faltando.length;
    }

    // ───── Planilha ─────
    const sa = Deno.env.get('GOOGLE_SERVICE_ACCOUNT_KEY');
    if (sa && Deno.env.get('GOOGLE_SHEETS_VENDAS_ID')) {
      try {
        const gt = await getGoogleAccessToken(sa);
        await garantirAbas(gt);
        // Importa entradas manuais
        const man = await gs(gt, `/values/${encodeURIComponent(`'${ABA_MANUAL}'!A2:G1000`)}`);
        const linhas: string[][] = man.values ?? [];
        for (let i = 0; i < linhas.length; i++) {
          const [cli, tel, itTxt, pagTxt, prazoTxt, obs, imp] = linhas[i];
          if (!cli?.trim() || (imp ?? '').trim()) continue;
          const prazo = Math.max(1, parseInt(prazoTxt, 10) || 5);
          const itens = parseItensTexto(itTxt, prazo);
          if (!itens.length) continue;
          const pag = (parseDataBR(pagTxt) ?? new Date()).toISOString();
          const { error } = await db.from('pedidos_pronta_entrega').insert({
            pedido_numero: `MAN-${Date.now()}-${i}`, origem: 'manual', cliente_nome: cli.trim(), cliente_telefone: tel?.trim() || null,
            data_pagamento: pag, itens, classificacao: 'pronta', prazo_limite: prazoLimite(pag, itens, null), observacao: obs?.trim() || null,
          });
          if (error) { resumo.avisos.push(`Linha manual ${i + 2}: ${error.message}`); continue; }
          await gs(gt, `/values/${encodeURIComponent(`'${ABA_MANUAL}'!G${i + 2}`)}?valueInputOption=RAW`, { method: 'PUT', body: JSON.stringify({ values: [['Sim']] }) });
          resumo.manuais_importados++;
        }
        // Espelho
        const { data: todos } = await db.from('pedidos_pronta_entrega').select('*').order('prazo_limite', { ascending: true });
        const rows = (todos ?? []).map((p: any) => [
          p.pedido_numero, p.origem, p.cliente_nome ?? '', p.cliente_telefone ?? '', p.vendedor ?? '', dataBR(p.data_pagamento),
          itensTexto((p.itens ?? []).filter((i: ItemPE) => i.pronta_entrega)), itensTexto((p.itens ?? []).filter((i: ItemPE) => !i.pronta_entrega)),
          modoTexto[p.modo_envio] ?? 'Só pronta entrega', diaBR(p.prazo_limite), statusTexto[p.status] ?? p.status,
          dataBR(p.enviado_em), p.enviado_por ?? '', p.rastreio ?? '', p.observacao ?? '',
        ]);
        await gs(gt, `/values/${encodeURIComponent(`'${ABA_ESPELHO}'!A1:O5000`)}:clear`, { method: 'POST', body: '{}' });
        await gs(gt, `/values/${encodeURIComponent(`'${ABA_ESPELHO}'!A1`)}?valueInputOption=RAW`, {
          method: 'PUT', body: JSON.stringify({ values: [['Espelho automático — não editar aqui, use o app'], CAB_ESPELHO, ...rows] }),
        });
      } catch (e) {
        resumo.avisos.push(`Planilha: ${(e as Error).message}`);
      }
    }

    await db.from('config_expedicao').upsert({ chave: 'ultima_sincronizacao', valor: new Date().toISOString() });
    return json({ sucesso: true, ...resumo });
  } catch (e) {
    console.error('sincronizar-pronta-entrega:', e);
    return json({ sucesso: false, erro: (e as Error).message ?? 'Erro desconhecido' }, 500);
  }
});
