import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface ShopifyProduct {
  id: number;
  title: string;
  body_html: string;
  product_type: string;
  tags: string;
  variants: { price: string }[];
  images: { src: string; alt: string }[];
  image: { src: string } | null;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Auth check
    const authHeader = req.headers.get('Authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401, headers: corsHeaders });
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
    });

    const token = authHeader.replace('Bearer ', '');
    const { data: claimsData, error: claimsError } = await supabase.auth.getClaims(token);
    if (claimsError || !claimsData?.claims) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401, headers: corsHeaders });
    }

    const shopifyToken = Deno.env.get('SHOPIFY_ACCESS_TOKEN');
    const shopifyStore = Deno.env.get('SHOPIFY_STORE_URL');
    if (!shopifyToken || !shopifyStore) {
      throw new Error('Shopify credentials not configured');
    }

    // Clean store URL
    const storeDomain = shopifyStore.replace(/^https?:\/\//, '').replace(/\/$/, '');

    // Fetch all products from Shopify (paginated)
    let allProducts: ShopifyProduct[] = [];
    let nextPageUrl: string | null = `https://${storeDomain}/admin/api/2024-01/products.json?limit=250`;

    while (nextPageUrl) {
      const response = await fetch(nextPageUrl, {
        headers: {
          'X-Shopify-Access-Token': shopifyToken,
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Shopify API error [${response.status}]: ${errorText}`);
      }

      const data = await response.json();
      allProducts = allProducts.concat(data.products || []);

      // Check for pagination
      const linkHeader = response.headers.get('Link');
      nextPageUrl = null;
      if (linkHeader) {
        const nextMatch = linkHeader.match(/<([^>]+)>;\s*rel="next"/);
        if (nextMatch) {
          nextPageUrl = nextMatch[1];
        }
      }
    }

    console.log(`Fetched ${allProducts.length} products from Shopify`);

    // Use service role for inserts
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey);

    let synced = 0;
    let errors = 0;

    for (const product of allProducts) {
      const price = product.variants?.[0]?.price ? parseFloat(product.variants[0].price) : 0;
      const mainImage = product.image?.src || product.images?.[0]?.src || null;

      // Map product_type or tags to categoria
      const tipo = (product.product_type || '').toLowerCase();
      let categoria = 'EDC';
      if (tipo.includes('campo') || tipo.includes('caça')) categoria = 'Campo';
      else if (tipo.includes('cozinha') || tipo.includes('churrasco')) categoria = 'Cozinha';
      else if (tipo.includes('tático') || tipo.includes('tatico') || tipo.includes('defesa')) categoria = 'Defesa';
      else if (tipo.includes('kzr')) categoria = 'KZR';

      // Upsert into catalogo_modelos
      const { data: modeloData, error: modeloError } = await supabaseAdmin
        .from('catalogo_modelos')
        .upsert(
          {
            nome_modelo: product.title,
            preco_base: price,
            categoria,
            imagem_modelo: mainImage,
            apresentacao_venda: product.body_html ? product.body_html.replace(/<[^>]*>/g, '').substring(0, 500) : null,
          },
          { onConflict: 'nome_modelo' }
        )
        .select('id')
        .single();

      if (modeloError) {
        console.error(`Error upserting ${product.title}:`, modeloError);
        errors++;
        continue;
      }

      // Sync images as midias_catalogo
      if (modeloData && product.images && product.images.length > 0) {
        for (const img of product.images) {
          const { error: midiaError } = await supabaseAdmin
            .from('midias_catalogo')
            .upsert(
              {
                modelo_id: modeloData.id,
                nome_arquivo: img.alt || product.title,
                url: img.src,
                visivel_catalogo: true,
              },
              { onConflict: 'modelo_id,url' }
            );

          if (midiaError) {
            console.error(`Error inserting media for ${product.title}:`, midiaError);
          }
        }
      }

      synced++;
    }

    return new Response(
      JSON.stringify({ success: true, total: allProducts.length, synced, errors }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : 'Unknown error';
    console.error('Sync error:', error);
    return new Response(JSON.stringify({ success: false, error: msg }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
