import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { salvarNoBanco } from "./_handlers/banco.ts";
import { criarNoBling } from "./_handlers/bling.ts";
import { criarExpedicao } from "./_handlers/expedicao.ts";
import { registrarFinanceiro } from "./_handlers/financeiro.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
  const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

  try {
    const payload = await req.json();

    // Quando waitForBling=true, o Bling roda de forma síncrona e o resultado
    // é retornado na resposta — permite que o cliente saiba se deu certo.
    const waitForBling = payload.waitForBling === true;

    // PASSO 1: Salvar no banco (síncrono — crítico)
    const { pedido, itens } = await salvarNoBanco(supabase, payload);

    // PASSO 2A: Bling síncrono (quando solicitado)
    let blingStatus: { sucesso: boolean; erro?: string } | null = null;
    if (waitForBling) {
      try {
        await criarNoBling(supabase, pedido, itens);
        blingStatus = { sucesso: true };
      } catch (blingErr: any) {
        blingStatus = { sucesso: false, erro: blingErr?.message ?? 'Erro desconhecido' };
        console.error('[bling] Erro síncrono:', blingErr?.message);
      }
    }

    // PASSO 2B: Demais tarefas em background (expedição + financeiro + Bling assíncrono)
    const tarefasBackground = [
      criarExpedicao(supabase, pedido),
      registrarFinanceiro(supabase, pedido),
      ...(waitForBling ? [] : [criarNoBling(supabase, pedido, itens)]),
    ];

    const distribuir = Promise.allSettled(tarefasBackground).then(resultados => {
      const handlers = waitForBling
        ? ['expedicao', 'financeiro']
        : ['expedicao', 'financeiro', 'bling'];
      const log = resultados.map((r, i) => ({
        handler: handlers[i],
        status: r.status,
        erro: r.status === 'rejected' ? r.reason?.message : null,
      }));
      console.log('Background concluído:', JSON.stringify(log));
    });

    // @ts-ignore
    if (typeof EdgeRuntime !== 'undefined') {
      EdgeRuntime.waitUntil(distribuir);
    }

    return new Response(
      JSON.stringify({
        sucesso: true,
        numero_pedido: pedido.numero_pedido,
        prazo: pedido.prazo_entrega,
        mensagem: `Pedido ${pedido.numero_pedido} confirmado! Prazo: ${pedido.prazo_entrega}`,
        bling: blingStatus,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Erro crítico em confirmar-pedido:', error);
    return new Response(
      JSON.stringify({ sucesso: false, erro: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
