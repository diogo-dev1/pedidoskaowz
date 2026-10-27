// Lista checkouts abandonados da Shopify Admin API
import { createClient } from 'npm:@supabase/supabase-js@2';
import { corsHeaders } from 'npm:@supabase/supabase-js@2/cors';
import { z } from 'npm:zod@3.23.8';
import { buscarCheckoutsIntervalo, ShopifyHttpError } from '../_shared/checkoutsShopify.ts';

const BodySchema = z.object({
  dias: z.number().int().min(1).max(366).optional(),
  de: z.string().datetime({ offset: true }).optional(),
  ate: z.string().datetime({ offset: true }).optional(),
});
const LIMITE = 2000;

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_ANON_KEY')!,
      { global: { headers: { Authorization: authHeader } } },
    );
    const { data: claimsData, error: claimsError } = await supabase.auth.getClaims(
      authHeader.replace('Bearer ', ''),
    );
    if (claimsError || !claimsData?.claims) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    let raw: unknown = {};
    try {
      raw = await req.json();
    } catch (_) { /* body vazio */ }
    const parsed = BodySchema.safeParse(raw ?? {});
    if (!parsed.success) {
      return new Response(JSON.stringify({ error: parsed.error.flatten() }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
    const { de, ate } = parsed.data;
    const dias = parsed.data.dias ?? 30;
    const inicio = de ?? new Date(Date.now() - dias * 86400_000).toISOString();
    if (ate && new Date(ate) < new Date(inicio)) {
      return new Response(JSON.stringify({ error: 'Data final antes da inicial' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    try {
      const { checkouts, limiteAtingido } = await buscarCheckoutsIntervalo({ de: inicio, ate }, LIMITE);
      const aviso = limiteAtingido ? `Limite de ${LIMITE} carrinhos atingido; refine o período.` : null;
      return new Response(JSON.stringify({ checkouts, limite_atingido: limiteAtingido, aviso, de: inicio, ate: ate ?? null }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    } catch (e) {
      if (e instanceof ShopifyHttpError) {
        return new Response(
          JSON.stringify({ error: 'Erro na API Shopify', status: e.status, details: e.details }),
          { status: e.status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
        );
      }
      throw e;
    }
  } catch (error) {
    console.error('shopify-checkouts error:', error);
    return new Response(JSON.stringify({ error: (error as Error).message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
