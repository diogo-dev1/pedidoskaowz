// Lista pedidos PAGOS da Shopify com as propriedades das linhas, para
// montar as linhas da planilha de produção.
import { createClient } from 'npm:@supabase/supabase-js@2';
import { corsHeaders } from 'npm:@supabase/supabase-js@2/cors';
import { z } from 'npm:zod@3.23.8';

const API_VERSION = Deno.env.get('SHOPIFY_API_VERSION') ?? '2024-01';

const BodySchema = z.object({
  dias: z.number().int().min(1).max(365).optional(),
});

async function getShopifyToken(shopDomain: string): Promise<string> {
  const clientId = Deno.env.get('SHOPIFY_CLIENT_ID');
  const clientSecret = Deno.env.get('SHOPIFY_CLIENT_SECRET');
  if (clientId && clientSecret) {
    const res = await fetch(`https://${shopDomain}/admin/oauth/access_token`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ grant_type: 'client_credentials', client_id: clientId, client_secret: clientSecret }),
    });
    if (!res.ok) throw new Error(`Shopify token error [${res.status}]: ${await res.text()}`);
    const data = await res.json();
    if (!data?.access_token) throw new Error('Shopify token response missing access_token');
    return data.access_token as string;
  }
  const staticToken = Deno.env.get('SHOPIFY_ADMIN_TOKEN') ?? Deno.env.get('SHOPIFY_ACCESS_TOKEN');
  if (staticToken) return staticToken;
  throw new Error('Shopify credentials not configured.');
}

function resolveShopDomain(): string {
  const raw = Deno.env.get('SHOPIFY_STORE_DOMAIN') ?? Deno.env.get('SHOPIFY_SHOP') ?? Deno.env.get('SHOPIFY_STORE_URL');
  if (!raw) throw new Error('Shopify shop not configured.');
  return raw.replace(/^https?:\/\//, '').replace(/\/$/, '');
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_ANON_KEY')!,
      { global: { headers: { Authorization: authHeader } } },
    );
    const { data: claims, error: claimsError } = await supabase.auth.getClaims(authHeader.replace('Bearer ', ''));
    if (claimsError || !claims?.claims) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    let raw: unknown = {};
    try { raw = await req.json(); } catch (_) { /* body vazio */ }
    const parsed = BodySchema.safeParse(raw ?? {});
    if (!parsed.success) {
      return new Response(JSON.stringify({ error: parsed.error.flatten() }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
    const dias = parsed.data.dias ?? 30;

    const domain = resolveShopDomain();
    const token = await getShopifyToken(domain);
    const headers = { 'X-Shopify-Access-Token': token, 'Content-Type': 'application/json' };

    const since = new Date(Date.now() - dias * 86400_000).toISOString();
    let url: string | null =
      `https://${domain}/admin/api/${API_VERSION}/orders.json?limit=250&status=any&financial_status=paid&created_at_min=${encodeURIComponent(since)}`;

    const orders: any[] = [];
    let pages = 0;
    while (url && pages < 10) {
      const res: Response = await fetch(url, { headers });
      if (!res.ok) {
        const text = await res.text();
        console.error(`Shopify orders error [${res.status}]: ${text}`);
        return new Response(JSON.stringify({ error: 'Erro na API Shopify', status: res.status, details: text }), {
          status: res.status, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      const data = await res.json();
      orders.push(...(data.orders ?? []));
      const link = res.headers.get('link') ?? '';
      const next = link.split(',').find((p) => p.includes('rel="next"'));
      const m = next?.match(/<([^>]+)>/);
      url = m ? m[1] : null;
      pages++;
    }

    const pedidos = orders.map((o) => {
      const cli = o.customer ?? {};
      const end = o.shipping_address ?? o.billing_address ?? {};
      const nome =
        [cli.first_name, cli.last_name].filter(Boolean).join(' ').trim() ||
        [end.first_name, end.last_name].filter(Boolean).join(' ').trim() ||
        o.email || 'Cliente';
      return {
        id: String(o.id),
        numero: o.name ?? `#${o.order_number ?? o.id}`,
        nome,
        criado_em: o.created_at,
        total: o.total_price ?? '0',
        nota: o.note ?? '',
        itens: (o.line_items ?? []).map((li: any) => ({
          titulo: li.title,
          variante: li.variant_title ?? null,
          quantidade: li.quantity,
          preco: li.price,
          propriedades: (li.properties ?? []).map((p: any) => ({ nome: p.name, valor: String(p.value ?? '') })),
        })),
      };
    });

    pedidos.sort((a, b) => (a.criado_em < b.criado_em ? 1 : -1));

    return new Response(JSON.stringify({ pedidos }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('pedidos-planilha error:', error);
    return new Response(JSON.stringify({ error: (error as Error).message }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
