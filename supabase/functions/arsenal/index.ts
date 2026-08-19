import { createClient } from 'npm:@supabase/supabase-js@2';
import { corsHeaders } from 'npm:@supabase/supabase-js@2/cors';
import { z } from 'npm:zod@3';

const Body = z.object({
  acao: z.enum(['obter', 'salvar', 'tirar_do_papel', 'remover']),
  token: z.string().min(8).max(64).nullish(),
  whatsapp: z.string().max(20).optional(),
  nomeCliente: z.string().max(120).optional(),
  nome: z.string().min(1).max(120).optional(),
  modeloId: z.string().uuid().nullish(),
  modeloNome: z.string().max(160).nullish(),
  preco: z.number().nonnegative().optional(),
  resumo: z.string().max(4000).optional(),
  configuracao: z.record(z.unknown()).optional(),
  perfil: z.record(z.unknown()).nullish(),
  etiquetas: z.array(z.string().max(60)).max(30).optional(),
  projetoId: z.string().uuid().optional(),
});

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });

const novoToken = () => crypto.randomUUID().replace(/-/g, '').slice(0, 24);

/** Dispara o evento para o funil (n8n → Kommo). Nunca quebra o fluxo do cliente. */
async function notificarFunil(evento: string, payload: Record<string, unknown>) {
  const url = Deno.env.get('FUNIL_WEBHOOK_URL');
  if (!url) return;
  try {
    await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ evento, origem: 'arsenal-publico', ...payload }),
    });
  } catch (e) {
    console.error('webhook do funil falhou', e);
  }
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  const parsed = Body.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return json({ error: parsed.error.flatten().fieldErrors }, 400);
  const b = parsed.data;

  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
  );

  const carregar = async (token: string) => {
    const { data: arsenal } = await supabase
      .from('arsenais')
      .select('id, token, nome_cliente, visitas')
      .eq('token', token)
      .maybeSingle();
    if (!arsenal) return null;
    const { data: projetos } = await supabase
      .from('arsenal_projetos')
      .select('id, nome, modelo_nome, preco, resumo, configuracao, tirar_do_papel, created_at')
      .eq('arsenal_id', arsenal.id)
      .order('created_at', { ascending: false });
    return { token, arsenal, projetos: projetos ?? [] };
  };

  try {
    if (b.acao === 'obter') {
      if (!b.token) return json({ error: 'token obrigatório' }, 400);
      const res = await carregar(b.token);
      if (!res) return json({ error: 'arsenal não encontrado' }, 404);
      await supabase
        .from('arsenais')
        .update({ visitas: (res.arsenal.visitas ?? 0) + 1, ultima_visita: new Date().toISOString() })
        .eq('id', res.arsenal.id);
      return json(res);
    }

    if (b.acao === 'salvar') {
      if (!b.nome) return json({ error: 'nome obrigatório' }, 400);
      let arsenalId: string | null = null;
      let token = b.token ?? null;

      if (token) {
        const { data } = await supabase.from('arsenais').select('id').eq('token', token).maybeSingle();
        arsenalId = data?.id ?? null;
      }
      if (!arsenalId) {
        token = novoToken();
        const { data, error } = await supabase
          .from('arsenais')
          .insert({
            token,
            nome_cliente: b.nomeCliente ?? null,
            whatsapp: b.whatsapp || null,
            perfil: b.perfil ?? null,
          })
          .select('id')
          .single();
        if (error) throw error;
        arsenalId = data.id;
      } else if (b.whatsapp || b.perfil) {
        await supabase
          .from('arsenais')
          .update({
            ...(b.whatsapp ? { whatsapp: b.whatsapp } : {}),
            ...(b.perfil ? { perfil: b.perfil } : {}),
          })
          .eq('id', arsenalId);
      }

      const { error: erroProjeto } = await supabase.from('arsenal_projetos').insert({
        arsenal_id: arsenalId,
        nome: b.nome,
        modelo_id: b.modeloId ?? null,
        modelo_nome: b.modeloNome ?? null,
        preco: b.preco ?? null,
        resumo: b.resumo ?? null,
        configuracao: b.configuracao ?? {},
      });
      if (erroProjeto) throw erroProjeto;

      await notificarFunil('projeto_salvo', {
        token,
        whatsapp: b.whatsapp ?? null,
        projeto: b.nome,
        modelo: b.modeloNome ?? null,
        preco: b.preco ?? null,
        etiquetas: b.etiquetas ?? [],
      });

      const res = await carregar(token!);
      return json(res);
    }

    if (b.acao === 'tirar_do_papel' || b.acao === 'remover') {
      if (!b.token || !b.projetoId) return json({ error: 'token e projetoId obrigatórios' }, 400);
      const { data: arsenal } = await supabase
        .from('arsenais')
        .select('id')
        .eq('token', b.token)
        .maybeSingle();
      if (!arsenal) return json({ error: 'arsenal não encontrado' }, 404);

      if (b.acao === 'remover') {
        await supabase.from('arsenal_projetos').delete().eq('id', b.projetoId).eq('arsenal_id', arsenal.id);
      } else {
        const { data: projeto } = await supabase
          .from('arsenal_projetos')
          .update({ tirar_do_papel: true })
          .eq('id', b.projetoId)
          .eq('arsenal_id', arsenal.id)
          .select('nome, modelo_nome, preco')
          .maybeSingle();
        await notificarFunil('tirar_do_papel', {
          token: b.token,
          projeto: projeto?.nome ?? null,
          modelo: projeto?.modelo_nome ?? null,
          preco: projeto?.preco ?? null,
        });
      }
      const res = await carregar(b.token);
      return json(res);
    }

    return json({ error: 'ação inválida' }, 400);
  } catch (e) {
    console.error('erro no arsenal', e);
    return json({ error: 'erro interno' }, 500);
  }
});
