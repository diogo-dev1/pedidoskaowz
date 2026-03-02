import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

const PRODUCTS_QUERY = `
  query ($cursor: String) {
    products(first: 50, after: $cursor) {
      pageInfo {
        hasNextPage
        endCursor
      }
      edges {
        node {
          id
          title
          description
          productType
          tags
          priceRange {
            minVariantPrice {
              amount
            }
          }
          images(first: 10) {
            edges {
              node {
                url
                altText
              }
            }
          }
          featuredImage {
            url
          }
        }
      }
    }
  }
`;

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Auth check
    const authHeader = req.headers.get('Authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
    });

    const token = authHeader.replace('Bearer ', '');
    const { data: claimsData, error: claimsError } = await supabase.auth.getClaims(token);
    if (claimsError || !claimsData?.claims) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    const storefrontToken = Deno.env.get('SHOPIFY_STOREFRONT_TOKEN');
    const shopifyStore = Deno.env.get('SHOPIFY_STORE_URL');
    if (!storefrontToken || !shopifyStore) {
      throw new Error('Shopify Storefront credentials not configured');
    }

    const storeDomain = shopifyStore.replace(/^https?:\/\//, '').replace(/\/$/, '');
    const storefrontUrl = `https://${storeDomain}/api/2024-01/graphql.json`;

    // Fetch all products via Storefront API (paginated)
    interface ProductNode {
      id: string;
      title: string;
      description: string;
      productType: string;
      tags: string[];
      priceRange: { minVariantPrice: { amount: string } };
      images: { edges: { node: { url: string; altText: string | null } }[] };
      featuredImage: { url: string } | null;
    }

    let allProducts: ProductNode[] = [];
    let cursor: string | null = null;
    let hasNextPage = true;

    while (hasNextPage) {
      const response = await fetch(storefrontUrl, {
        method: 'POST',
        headers: {
          'X-Shopify-Storefront-Access-Token': storefrontToken,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          query: PRODUCTS_QUERY,
          variables: { cursor },
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Shopify Storefront API error [${response.status}]: ${errorText}`);
      }

      const json = await response.json();

      if (json.errors) {
        throw new Error(`GraphQL errors: ${JSON.stringify(json.errors)}`);
      }

      const productsData = json.data.products;
      for (const edge of productsData.edges) {
        allProducts.push(edge.node);
      }

      hasNextPage = productsData.pageInfo.hasNextPage;
      cursor = productsData.pageInfo.endCursor;
    }

    console.log(`Fetched ${allProducts.length} products from Shopify Storefront API`);

    // Use service role for inserts
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey);

    let synced = 0;
    let errors = 0;

    for (const product of allProducts) {
      const price = product.priceRange?.minVariantPrice?.amount
        ? parseFloat(product.priceRange.minVariantPrice.amount)
        : 0;
      const mainImage = product.featuredImage?.url || product.images?.edges?.[0]?.node?.url || null;

      // Map product_type to categoria
      const tipo = (product.productType || '').toLowerCase();
      let categoria = 'EDC';
      if (tipo.includes('campo') || tipo.includes('caça')) categoria = 'Campo';
      else if (tipo.includes('cozinha') || tipo.includes('churrasco')) categoria = 'Cozinha';
      else if (tipo.includes('tático') || tipo.includes('tatico') || tipo.includes('defesa')) categoria = 'Defesa';
      else if (tipo.includes('kzr')) categoria = 'KZR';

      const { data: modeloData, error: modeloError } = await supabaseAdmin
        .from('catalogo_modelos')
        .upsert(
          {
            nome_modelo: product.title,
            preco_base: price,
            categoria,
            imagem_modelo: mainImage,
            apresentacao_venda: product.description ? product.description.substring(0, 500) : null,
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

      // Sync images
      if (modeloData && product.images?.edges?.length > 0) {
        for (const imgEdge of product.images.edges) {
          const img = imgEdge.node;
          await supabaseAdmin
            .from('midias_catalogo')
            .upsert(
              {
                modelo_id: modeloData.id,
                nome_arquivo: img.altText || product.title,
                url: img.url,
                visivel_catalogo: true,
              },
              { onConflict: 'modelo_id,url' }
            );
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
