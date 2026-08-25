// Busca produtos ATIVOS e PUBLICADOS na vitrine (online store) via Admin API GraphQL.
// Mesmo fluxo de autenticação client_credentials usado em criar-draft-order-shopify.

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const API_VERSION = '2024-10';

function resolveDomain(): string {
  const raw = Deno.env.get('SHOPIFY_STORE_DOMAIN') ?? Deno.env.get('SHOPIFY_SHOP')
    ?? Deno.env.get('SHOPIFY_STORE_URL') ?? '';
  return raw.replace(/^https?:\/\//, '').replace(/\/$/, '');
}

async function getAccessToken(domain: string): Promise<string> {
  const clientId = Deno.env.get('SHOPIFY_CLIENT_ID');
  const clientSecret = Deno.env.get('SHOPIFY_CLIENT_SECRET');
  if (!clientId || !clientSecret) {
    throw new Error('Shopify não configurado (SHOPIFY_CLIENT_ID/SHOPIFY_CLIENT_SECRET ausentes)');
  }
  const res = await fetch(`https://${domain}/admin/oauth/access_token`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
    body: JSON.stringify({
      grant_type: 'client_credentials',
      client_id: clientId,
      client_secret: clientSecret,
    }),
  });
  const text = await res.text();
  if (!res.ok) {
    throw new Error(`Falha ao obter token client_credentials (HTTP ${res.status}): ${text.slice(0, 300)}`);
  }
  const data = JSON.parse(text);
  if (!data?.access_token) throw new Error('Resposta de token sem access_token');
  return data.access_token as string;
}

async function shopify(query: string, variables: Record<string, unknown>) {
  const domain = resolveDomain();
  if (!domain) throw new Error('Shopify não configurado (domínio ausente)');
  const token = await getAccessToken(domain);
  const res = await fetch(`https://${domain}/admin/api/${API_VERSION}/graphql.json`, {
    method: 'POST',
    headers: { 'X-Shopify-Access-Token': token, 'Content-Type': 'application/json' },
    body: JSON.stringify({ query, variables }),
  });
  const text = await res.text();
  if (!res.ok) throw new Error(`Shopify HTTP ${res.status}: ${text.slice(0, 500)}`);
  const json = JSON.parse(text);
  if (json.errors?.length) throw new Error(json.errors.map((e: any) => e.message).join(' | '));
  return json.data;
}

const PRODUCTS_QUERY = `
  query($q: String!, $n: Int!) {
    products(first: $n, query: $q, sortKey: RELEVANCE) {
      edges {
        node {
          id
          title
          status
          publishedOnCurrentPublication
          featuredImage { url }
          variants(first: 25) {
            edges {
              node {
                id
                title
                price
                availableForSale
                image { url }
              }
            }
          }
        }
      }
    }
  }`;

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  try {
    const body = await req.json().catch(() => ({}));
    const termo = String(body?.termo ?? body?.q ?? '').trim();
    const limite = Math.min(50, Math.max(1, Number(body?.limite) || 20));

    // Só produtos ativos e publicados na vitrine
    const partes = ['status:active', 'published_status:published'];
    if (termo) partes.push(`(title:*${termo}* OR sku:*${termo}* OR tag:*${termo}*)`);
    const q = partes.join(' AND ');

    const data = await shopify(PRODUCTS_QUERY, { q, n: limite });
    const produtos: any[] = [];

    for (const edge of data?.products?.edges ?? []) {
      const p = edge.node;
      if (p.status !== 'ACTIVE') continue;
      if (p.publishedOnCurrentPublication === false) continue;
      for (const ve of p.variants?.edges ?? []) {
        const v = ve.node;
        produtos.push({
          produtoId: p.id,
          titulo: p.title,
          variante: v.title && v.title !== 'Default Title' ? v.title : '',
          variantId: v.id,
          preco: Number(v.price) || 0,
          imagem: v.image?.url ?? p.featuredImage?.url ?? null,
          disponivel: !!v.availableForSale,
        });
      }
    }

    return new Response(JSON.stringify({ sucesso: true, produtos }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error: any) {
    console.error('buscar-produtos-shopify:', error);
    return new Response(JSON.stringify({ sucesso: false, erro: error?.message ?? 'Erro desconhecido', produtos: [] }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
