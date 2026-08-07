// Lista clientes que fecharam pedidos na Shopify (base para upsell)
import { createClient } from 'npm:@supabase/supabase-js@2';
import { corsHeaders } from 'npm:@supabase/supabase-js@2/cors';
import { z } from 'npm:zod@3.23.8';

const API_VERSION = Deno.env.get('SHOPIFY_API_VERSION') ?? '2024-01';

const BodySchema = z.object({
  dias: z.number().int().min(1).max(365).optional(),
});

let cachedToken: string | null = null;
let tokenExpiresAt = 0;

async function getShopifyToken(shopDomain: string): Promise<string> {
  const clientId = Deno.env.get('SHOPIFY_CLIENT_ID');
  const clientSecret = Deno.env.get('SHOPIFY_CLIENT_SECRET');

  if (clientId && clientSecret) {
    if (cachedToken && Date.now() < tokenExpiresAt) return cachedToken;
    const res = await fetch(`https://${shopDomain}/admin/oauth/access_token`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ grant_type: 'client_credentials', client_id: clientId, client_secret: clientSecret }),
    });
    if (!res.ok) throw new Error(`Shopify token error [${res.status}]: ${await res.text()}`);
    const data = await res.json();
    if (!data?.access_token) throw new Error('Shopify token response missing access_token');
    cachedToken = data.access_token as string;
    const expiresIn = typeof data.expires_in === 'number' ? data.expires_in : 86400;
    tokenExpiresAt = Date.now() + Math.max(0, expiresIn - 60) * 1000;
    return cachedToken;
  }

  const staticToken = Deno.env.get('SHOPIFY_ACCESS_TOKEN');
  if (staticToken) return staticToken;
  throw new Error('Shopify credentials not configured.');
}

async function resolveShopDomain(): Promise<string> {
  const raw = Deno.env.get('SHOPIFY_SHOP') ?? Deno.env.get('SHOPIFY_STORE_URL');
  if (!raw) throw new Error('Shopify shop not configured.');
  let domain = raw.replace(/^https?:\/\//, '').replace(/\/$/, '');
  if (!domain.endsWith('.myshopify.com')) {
    try {
      const metaRes = await fetch(`https://${domain}/meta.json`);
      if (metaRes.ok) {
        const meta = await metaRes.json();
        if (meta?.myshopify_domain) domain = meta.myshopify_domain;
      }
    } catch (e) {
      console.warn('Could not resolve myshopify domain:', e);
    }
  }
  return domain;
}

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
    const dias = parsed.data.dias ?? 90;

    const storeDomain = await resolveShopDomain();
    const accessToken = await getShopifyToken(storeDomain);
    const shopifyHeaders = { 'X-Shopify-Access-Token': accessToken, 'Content-Type': 'application/json' };

    const since = new Date(Date.now() - dias * 86400_000).toISOString();
    let url: string | null =
      `https://${storeDomain}/admin/api/${API_VERSION}/orders.json?limit=250&status=any&financial_status=paid&created_at_min=${encodeURIComponent(since)}`;

    const orders: any[] = [];
    let pages = 0;
    while (url && pages < 10) {
      const res: Response = await fetch(url, { headers: shopifyHeaders });
      if (!res.ok) {
        const text = await res.text();
        console.error(`Shopify orders error [${res.status}]: ${text}`);
        return new Response(
          JSON.stringify({ error: 'Erro na API Shopify', status: res.status, details: text }),
          { status: res.status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
        );
      }
      const data = await res.json();
      orders.push(...(data.orders ?? []));
      const link = res.headers.get('link') ?? '';
      const next = link.split(',').find((p) => p.includes('rel="next"'));
      const match = next?.match(/<([^>]+)>/);
      url = match ? match[1] : null;
      pages++;
    }

    // Agrupa por cliente (email/telefone) para saber recorrência
    const chaveCliente = (o: any) => {
      const cli = o.customer ?? {};
      return (o.email || cli.email || o.phone || cli.phone || String(o.id)).toLowerCase();
    };
    const totaisPorCliente = new Map<string, { pedidos: number; total: number }>();
    for (const o of orders) {
      const k = chaveCliente(o);
      const acc = totaisPorCliente.get(k) ?? { pedidos: 0, total: 0 };
      acc.pedidos += 1;
      acc.total += parseFloat(o.total_price ?? '0') || 0;
      totaisPorCliente.set(k, acc);
    }

    const simplificados = orders.map((o) => {
      const cli = o.customer ?? {};
      const end = o.shipping_address ?? o.billing_address ?? {};
      const nome =
        [cli.first_name, cli.last_name].filter(Boolean).join(' ').trim() ||
        [end.first_name, end.last_name].filter(Boolean).join(' ').trim() ||
        o.email ||
        'Cliente';
      const telefone = o.phone || cli.phone || end.phone || null;
      const agg = totaisPorCliente.get(chaveCliente(o)) ?? { pedidos: 1, total: 0 };
      return {
        id: String(o.id),
        numero: o.name ?? `#${o.order_number ?? o.id}`,
        nome,
        email: o.email ?? cli.email ?? null,
        telefone,
        cidade: end.city ?? null,
        estado: end.province_code ?? end.province ?? null,
        total: o.total_price ?? '0',
        moeda: o.currency ?? 'BRL',
        criado_em: o.created_at,
        financeiro: o.financial_status ?? null,
        entrega: o.fulfillment_status ?? 'unfulfilled',
        pedidos_cliente: agg.pedidos,
        total_cliente: agg.total,
        itens: (o.line_items ?? []).map((li: any) => ({
          titulo: li.title,
          variante: li.variant_title ?? null,
          quantidade: li.quantity,
          preco: li.price,
        })),
      };
    });

    simplificados.sort((a, b) => (a.criado_em < b.criado_em ? 1 : -1));

    return new Response(JSON.stringify({ pedidos: simplificados }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('shopify-clientes-pedidos error:', error);
    return new Response(JSON.stringify({ error: (error as Error).message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
