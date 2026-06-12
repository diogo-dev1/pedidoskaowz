import { createClient } from 'npm:@supabase/supabase-js@2';
import { corsHeaders } from 'npm:@supabase/supabase-js@2/cors';
import { z } from 'npm:zod@3.23.8';

const API_VERSION = '2024-01';

const BodySchema = z.discriminatedUnion('action', [
  z.object({ action: z.literal('list') }),
  z.object({
    action: z.literal('set'),
    inventory_item_id: z.number().int().positive(),
    location_id: z.number().int().positive(),
    available: z.number().int().min(0).max(1000000),
  }),
]);

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    // Auth: only logged-in users
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

    const accessToken = Deno.env.get('SHOPIFY_ACCESS_TOKEN');
    const shopifyStore = Deno.env.get('SHOPIFY_STORE_URL');
    if (!accessToken || !shopifyStore) {
      throw new Error('Shopify Admin credentials not configured');
    }

    const storeDomain = shopifyStore.replace(/^https?:\/\//, '').replace(/\/$/, '');
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
      // Fetch products (paginated via page_info) + locations in parallel
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
        // Fallback: derive location IDs from inventory levels (requires read_inventory only)
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
