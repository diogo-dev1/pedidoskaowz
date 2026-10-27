// Busca de checkouts abandonados na Shopify — fonte única da tela e das notificações.
export const API_VERSION = Deno.env.get('SHOPIFY_API_VERSION') ?? '2024-01';

let cachedToken: string | null = null;
let tokenExpiresAt = 0;

export async function getShopifyToken(shopDomain: string): Promise<string> {
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

export async function resolveShopDomain(): Promise<string> {
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

export interface CheckoutSimplificado {
  id: string; token: string; nome: string; email: string | null; telefone: string | null;
  cidade: string | null; estado: string | null; total: string; moeda: string;
  criado_em: string; atualizado_em: string; abandoned_checkout_url: string | null;
  itens: { titulo: string; variante: string | null; quantidade: number; preco: string }[];
}

export class ShopifyHttpError extends Error {
  constructor(public status: number, public details: string) { super('Erro na API Shopify'); }
}

/** Checkouts abertos dos últimos `dias`, mais recentes primeiro. */
export async function buscarCheckouts(dias: number): Promise<CheckoutSimplificado[]> {
  return (await buscarCheckoutsIntervalo({ de: new Date(Date.now() - dias * 86400_000).toISOString() }, 10 * 250)).checkouts;
}

/** Checkouts abertos no intervalo [de, ate], paginando até cobrir tudo ou atingir `limite`. */
export async function buscarCheckoutsIntervalo(
  intervalo: { de: string; ate?: string }, limite = 2000,
): Promise<{ checkouts: CheckoutSimplificado[]; limiteAtingido: boolean }> {
  const storeDomain = await resolveShopDomain();
  const accessToken = await getShopifyToken(storeDomain);
  const shopifyHeaders = { 'X-Shopify-Access-Token': accessToken, 'Content-Type': 'application/json' };

  let url: string | null =
    `https://${storeDomain}/admin/api/${API_VERSION}/checkouts.json?limit=250&status=open&created_at_min=${encodeURIComponent(intervalo.de)}` +
    (intervalo.ate ? `&created_at_max=${encodeURIComponent(intervalo.ate)}` : '');

  const checkouts: any[] = [];
  let limiteAtingido = false;
  while (url) {
    if (checkouts.length >= limite) { limiteAtingido = true; break; }
    const res: Response = await fetch(url, { headers: shopifyHeaders });
    if (!res.ok) {
      const text = await res.text();
      console.error(`Shopify checkouts error [${res.status}]: ${text}`);
      throw new ShopifyHttpError(res.status, text);
    }
    const data = await res.json();
    checkouts.push(...(data.checkouts ?? []));
    const link = res.headers.get('link') ?? '';
    const next = link.split(',').find((p) => p.includes('rel="next"'));
    const match = next?.match(/<([^>]+)>/);
    url = match ? match[1] : null;
  }
  if (checkouts.length > limite) { checkouts.length = limite; limiteAtingido = true; }

  const simplificados: CheckoutSimplificado[] = checkouts.map((c) => {
    const cli = c.customer ?? {};
    const end = c.shipping_address ?? c.billing_address ?? {};
    const nome =
      [cli.first_name, cli.last_name].filter(Boolean).join(' ').trim() ||
      [end.first_name, end.last_name].filter(Boolean).join(' ').trim() ||
      c.email ||
      'Cliente';
    const telefone = c.phone || cli.phone || end.phone || null;
    return {
      id: String(c.id),
      token: c.token,
      nome,
      email: c.email ?? null,
      telefone,
      cidade: end.city ?? null,
      estado: end.province_code ?? end.province ?? null,
      total: c.total_price ?? '0',
      moeda: c.currency ?? 'BRL',
      criado_em: c.created_at,
      atualizado_em: c.updated_at,
      abandoned_checkout_url: c.abandoned_checkout_url ?? null,
      itens: (c.line_items ?? []).map((li: any) => ({
        titulo: li.title,
        variante: li.variant_title ?? null,
        quantidade: li.quantity,
        preco: li.price,
      })),
    };
  });

  simplificados.sort((a, b) => (a.criado_em < b.criado_em ? 1 : -1));
  return { checkouts: simplificados, limiteAtingido };
}

/** Existe pedido desse e-mail criado depois de `depoisDe`? */
export async function clienteComprouDepois(email: string, depoisDe: string): Promise<boolean> {
  const storeDomain = await resolveShopDomain();
  const accessToken = await getShopifyToken(storeDomain);
  const q = `email:"${email.replace(/"/g, '')}" created_at:>='${depoisDe}'`;
  const res = await fetch(`https://${storeDomain}/admin/api/${API_VERSION}/graphql.json`, {
    method: 'POST',
    headers: { 'X-Shopify-Access-Token': accessToken, 'Content-Type': 'application/json' },
    body: JSON.stringify({ query: 'query($q:String!){orders(first:5,query:$q){edges{node{id createdAt email}}}}', variables: { q } }),
  });
  if (!res.ok) throw new Error(`Shopify orders [${res.status}]`);
  const json = await res.json();
  if (json.errors) throw new Error(JSON.stringify(json.errors).slice(0, 200));
  const t = new Date(depoisDe).getTime();
  return (json.data?.orders?.edges ?? []).some((e: any) =>
    (e.node.email ?? '').toLowerCase() === email.toLowerCase() && new Date(e.node.createdAt).getTime() > t);
}
