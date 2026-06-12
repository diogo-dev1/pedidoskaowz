// v2: client_credentials + fallback de token estático
import { createClient } from 'npm:@supabase/supabase-js@2';
import { corsHeaders } from 'npm:@supabase/supabase-js@2/cors';
import { z } from 'npm:zod@3.23.8';

// Versão da Admin API — configurável via secret, com default seguro.
const API_VERSION = Deno.env.get('SHOPIFY_API_VERSION') ?? '2024-01';

const BodySchema = z.discriminatedUnion('action', [
  z.object({ action: z.literal('list') }),
  z.object({
    action: z.literal('set'),
    inventory_item_id: z.number().int().positive(),
    location_id: z.number().int().positive(),
    available: z.number().int().min(0).max(1000000),
  }),
]);

// ───────────────────────────────────────────────────────────────────────────
// Token Shopify — cache em memória (persiste enquanto a instância está "quente")
//
// Fluxo primário: client_credentials (novo dev dashboard).
//   POST https://{SHOP}/admin/oauth/access_token
//   body: { grant_type, client_id, client_secret } → { access_token, expires_in }
// Renova ~60s antes de expirar. Fallback: SHOPIFY_ACCESS_TOKEN estático (shpat_…).
// ───────────────────────────────────────────────────────────────────────────
let cachedToken: string | null = null;
let tokenExpiresAt = 0; // epoch ms

async function getShopifyToken(shopDomain: string): Promise<string> {
  const clientId = Deno.env.get('SHOPIFY_CLIENT_ID');
  const clientSecret = Deno.env.get('SHOPIFY_CLIENT_SECRET');

  // Caminho 1: client_credentials
  if (clientId && clientSecret) {
    if (cachedToken && Date.now() < tokenExpiresAt) {
      return cachedToken;
    }
    const res = await fetch(`https://${shopDomain}/admin/oauth/access_token`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        grant_type: 'client_credentials',
        client_id: clientId,
        client_secret: clientSecret,
      }),
    });
    if (!res.ok) {
      const text = await res.text();
      throw new Error(`Shopify token error [${res.status}]: ${text}`);
    }
    const data = await res.json();
    if (!data?.access_token) {
      throw new Error('Shopify token response missing access_token');
    }
    cachedToken = data.access_token as string;
    const expiresIn = typeof data.expires_in === 'number' ? data.expires_in : 86400;
    tokenExpiresAt = Date.now() + Math.max(0, expiresIn - 60) * 1000;
    return cachedToken;
  }

  // Caminho 2 (fallback): token estático da Admin API
  const staticToken = Deno.env.get('SHOPIFY_ACCESS_TOKEN');
  if (staticToken) return staticToken;

  throw new Error(
    'Shopify credentials not configured. Set SHOPIFY_CLIENT_ID + SHOPIFY_CLIENT_SECRET (recommended) or SHOPIFY_ACCESS_TOKEN.',
  );
}

// Resolve o domínio .myshopify.com (a Admin API só funciona nele).
async function resolveShopDomain(): Promise<string> {
  const raw = Deno.env.get('SHOPIFY_SHOP') ?? Deno.env.get('SHOPIFY_STORE_URL');
  if (!raw) {
    throw new Error('Shopify shop not configured. Set SHOPIFY_SHOP (ex.: minha-loja.myshopify.com).');
  }
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
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    // Auth: apenas usuários logados
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

    const token = authHeader.replace('Bearer ', '');
    const { data: claimsData, error: claimsError } = await supabase.auth.getClaims(token);
    if (claimsError || !claimsData?.claims) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const storeDomain = await resolveShopDomain();
    const accessToken = await getShopifyToken(storeDomain);

    const baseUrl = `https://${storeDomain}/admin/api/${API_VERSION}`;
    const shopifyHeaders = {
      'X-Shopify-Access-Token': accessToken,
      'Content-Type': 'application/json',
    };

    const parsed = BodySchema.safeParse(await req.json());
    if (!parsed.success) {
      return new Response(JSON.stringify({ error: parsed.error.flatten() }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
    const body = parsed.data;

    if (body.action === 'list') {
      // Produtos (paginação automática via header Link) + locations em paralelo
      const fetchAllProducts = async () => {
        const products: unknown[] = [];
        let url: string | null =
          `${baseUrl}/products.json?limit=250&fields=id,title,status,image,variants`;
        while (url) {
          const res: Response = await fetch(url, { headers: shopifyHeaders });
          if (!res.ok) {
            const text = await res.text();
            throw new Error(`Shopify products error [${res.status}]: ${text}`);
          }
          const data = await res.json();
          products.push(...(data.products ?? []));
          const link = res.headers.get('link') ?? '';
          const next = link.split(',').find((p) => p.includes('rel="next"'));
          const match = next?.match(/<([^>]+)>/);
          url = match ? match[1] : null;
        }
        return products;
      };

      const fetchLocations = async () => {
        const res = await fetch(`${baseUrl}/locations.json`, { headers: shopifyHeaders });
        if (!res.ok) {
          console.warn('locations.json unavailable, will fall back to inventory_levels');
          return null;
        }
        const data = await res.json();
        return (data.locations ?? []).filter((l: { active: boolean }) => l.active);
      };

      const [products, locationsResult] = await Promise.all([fetchAllProducts(), fetchLocations()]);

      let locations = locationsResult;
      if (!locations || locations.length === 0) {
        // Fallback: derivar location IDs dos inventory levels (requer só read_inventory)
        const itemIds = (products as { variants?: { inventory_item_id: number }[] }[])
          .flatMap((p) => p.variants ?? [])
          .map((v) => v.inventory_item_id)
          .filter(Boolean)
          .slice(0, 50);
        locations = [];
        if (itemIds.length > 0) {
          const res = await fetch(
            `${baseUrl}/inventory_levels.json?inventory_item_ids=${itemIds.join(',')}&limit=250`,
            { headers: shopifyHeaders },
          );
          if (res.ok) {
            const data = await res.json();
            const ids = [
              ...new Set(
                (data.inventory_levels ?? []).map((l: { location_id: number }) => l.location_id),
              ),
            ];
            locations = ids.map((id) => ({ id, name: `Localização ${id}` }));
          } else {
            console.error('inventory_levels fallback failed:', res.status, await res.text());
          }
        }
      }

      return new Response(JSON.stringify({ products, locations }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // action === 'set'
    const res = await fetch(`${baseUrl}/inventory_levels/set.json`, {
      method: 'POST',
      headers: shopifyHeaders,
      body: JSON.stringify({
        location_id: body.location_id,
        inventory_item_id: body.inventory_item_id,
        available: body.available,
      }),
    });

    if (!res.ok) {
      const text = await res.text();
      console.error('inventory_levels/set failed:', res.status, text);
      return new Response(
        JSON.stringify({ error: `Shopify set inventory error [${res.status}]: ${text}` }),
        { status: 502, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      );
    }

    const data = await res.json();
    return new Response(JSON.stringify({ success: true, inventory_level: data.inventory_level }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('shopify-inventory error:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Erro desconhecido' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    );
  }
});
