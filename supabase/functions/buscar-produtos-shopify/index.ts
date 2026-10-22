// Busca produtos ATIVOS e PUBLICADOS na vitrine (online store) via Admin API GraphQL.
// Mesmo fluxo de autenticação client_credentials usado em criar-draft-order-shopify.
import { corsHeaders } from 'npm:@supabase/supabase-js@2/cors';
import { authenticatedRequest } from '../_shared/auth.ts';
import { mapearProduto, type ProdutoNode } from './produtos.ts';


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
          vendor
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
    if (body.modo === 'produtos') {
      if (!await authenticatedRequest(req)) return new Response(JSON.stringify({ erro: 'Não autorizado' }), { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
      if (body.ids !== undefined && (!Array.isArray(body.ids) || body.ids.length > 250 || body.ids.some((id: unknown) => typeof id !== 'string' || !/^gid:\/\/shopify\/Product\/\d+$/.test(id)))) {
        return new Response(JSON.stringify({ erro: 'IDs de produtos inválidos (máximo 250)' }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
      }
      const fields = 'id title status descriptionHtml handle onlineStoreUrl images(first:10){nodes{url}} variants(first:250){nodes{price compareAtPrice availableForSale}}';
      let nodes: ProdutoNode[];
      if (body.ids) {
        const data = await shopify(`query($ids:[ID!]!){nodes(ids:$ids){... on Product{${fields}}}}`, { ids: body.ids });
        nodes = (data?.nodes ?? []).filter(Boolean);
      } else {
        const termo = String(body.termo ?? '').trim().slice(0, 200).replace(/["\\()]/g, '');
        const q = `status:active published_status:published${termo ? ` (title:*${termo}* OR tag:*${termo}* OR sku:*${termo}*)` : ''}`;
        const data = await shopify(`query($q:String!,$n:Int!){products(first:$n,query:$q,sortKey:RELEVANCE){nodes{${fields}}}}`, { q, n: Math.min(50, Math.max(1, Number(body.limite) || 30)) });
        nodes = data?.products?.nodes ?? [];
      }
      return new Response(JSON.stringify({ sucesso: true, produtos: nodes.map(mapearProduto) }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }
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
      for (const ve of p.variants?.edges ?? []) {
        const v = ve.node;
        produtos.push({
          produtoId: p.id,
          titulo: p.title,
          vendor: p.vendor ?? '',
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
