import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const API_VERSION = Deno.env.get('SHOPIFY_API_VERSION') ?? '2024-01';

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
    cachedToken = data.access_token;
    const expiresIn = typeof data.expires_in === 'number' ? data.expires_in : 86400;
    tokenExpiresAt = Date.now() + Math.max(0, expiresIn - 60) * 1000;
    return cachedToken!;
  }

  const staticToken = Deno.env.get('SHOPIFY_ACCESS_TOKEN');
  if (staticToken) return staticToken;
  throw new Error('Shopify credentials not configured');
}

async function resolveShopDomain(): Promise<string> {
  const raw = Deno.env.get('SHOPIFY_SHOP') ?? Deno.env.get('SHOPIFY_STORE_URL');
  if (!raw) throw new Error('Shopify shop not configured');
  let domain = raw.replace(/^https?:\/\//, '').replace(/\/$/, '');
  if (!domain.endsWith('.myshopify.com')) {
    try {
      const metaRes = await fetch(`https://${domain}/meta.json`);
      if (metaRes.ok) {
        const meta = await metaRes.json();
        if (meta?.myshopify_domain) domain = meta.myshopify_domain;
      }
    } catch (_) {}
  }
  return domain;
}

async function getGoogleAccessToken(serviceAccountKey: string): Promise<string> {
  const credentials = JSON.parse(serviceAccountKey);
  const header = { alg: "RS256", typ: "JWT" };
  const now = Math.floor(Date.now() / 1000);
  const claim = {
    iss: credentials.client_email,
    scope: "https://www.googleapis.com/auth/spreadsheets",
    aud: "https://oauth2.googleapis.com/token",
    exp: now + 3600,
    iat: now,
  };

  const headerB64 = btoa(JSON.stringify(header)).replace(/=/g, '').replace(/\+/g, '-').replace(/\//g, '_');
  const claimB64 = btoa(JSON.stringify(claim)).replace(/=/g, '').replace(/\+/g, '-').replace(/\//g, '_');
  const signatureInput = `${headerB64}.${claimB64}`;

  const privateKeyPem = credentials.private_key
    .replace(/-----BEGIN PRIVATE KEY-----/, '')
    .replace(/-----END PRIVATE KEY-----/, '')
    .replace(/\s/g, '');
  const binaryKey = Uint8Array.from(atob(privateKeyPem), (c: string) => c.charCodeAt(0));

  const key = await crypto.subtle.importKey('pkcs8', binaryKey,
    { name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-256' }, false, ['sign']);
  const signature = await crypto.subtle.sign('RSASSA-PKCS1-v1_5', key,
    new TextEncoder().encode(signatureInput));
  const signatureB64 = btoa(String.fromCharCode(...new Uint8Array(signature)))
    .replace(/=/g, '').replace(/\+/g, '-').replace(/\//g, '_');

  const jwt = `${signatureInput}.${signatureB64}`;
  const tokenResponse = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({ grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer', assertion: jwt }),
  });
  const tokenData = await tokenResponse.json();
  return tokenData.access_token;
}

function formatDate(isoDate: string): string {
  const d = new Date(isoDate);
  return `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}/${d.getFullYear()}`;
}

function mapPaymentGateway(gateways: string[]): string {
  const g = (gateways || []).join(', ').toLowerCase();
  if (g.includes('pix')) return 'Pix';
  if (g.includes('credit') || g.includes('cartao') || g.includes('cartão') || g.includes('card')) return 'Cartão';
  if (g.includes('boleto')) return 'Boleto';
  if (g.includes('manual')) return 'Manual';
  return gateways.join(', ') || '-';
}

function mapFinancialStatus(status: string): string {
  const map: Record<string, string> = {
    'paid': 'pago',
    'pending': 'pendente',
    'refunded': 'reembolsado',
    'partially_refunded': 'parcialmente reembolsado',
    'voided': 'cancelado',
    'authorized': 'autorizado',
  };
  return map[status] || status || '-';
}

interface ShopifyOrder {
  id: number;
  name: string;
  created_at: string;
  total_price: string;
  financial_status: string;
  payment_gateway_names: string[];
  customer?: { first_name?: string; last_name?: string };
  line_items: { title: string; quantity: number }[];
  note?: string;
  discount_codes?: { code: string }[];
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const body = await req.json().catch(() => ({}));
    const dataInicio = body.data_inicio || new Date().toISOString().split('T')[0];
    const dataFim = body.data_fim || dataInicio;

    const shopDomain = await resolveShopDomain();
    const accessToken = await getShopifyToken(shopDomain);
    const baseUrl = `https://${shopDomain}/admin/api/${API_VERSION}`;
    const shopifyHeaders = {
      'X-Shopify-Access-Token': accessToken,
      'Content-Type': 'application/json',
    };

    const createdAtMin = `${dataInicio}T00:00:00-03:00`;
    const createdAtMax = `${dataFim}T23:59:59-03:00`;

    let allOrders: ShopifyOrder[] = [];
    let url: string | null = `${baseUrl}/orders.json?status=any&created_at_min=${encodeURIComponent(createdAtMin)}&created_at_max=${encodeURIComponent(createdAtMax)}&limit=250`;

    while (url) {
      const res = await fetch(url, { headers: shopifyHeaders });
      if (!res.ok) throw new Error(`Shopify orders error [${res.status}]: ${await res.text()}`);
      const data = await res.json();
      allOrders.push(...(data.orders || []));
      const link = res.headers.get('link') ?? '';
      const next = link.split(',').find((p: string) => p.includes('rel="next"'));
      const match = next?.match(/<([^>]+)>/);
      url = match ? match[1] : null;
    }

    console.log(`Shopify: ${allOrders.length} pedido(s) de ${dataInicio} a ${dataFim}`);

    if (allOrders.length === 0) {
      return new Response(
        JSON.stringify({ sucesso: true, total: 0, mensagem: 'Nenhum pedido encontrado no período' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const serviceAccountKey = Deno.env.get('GOOGLE_SERVICE_ACCOUNT_KEY');
    const vendasSpreadsheetId = Deno.env.get('GOOGLE_SHEETS_VENDAS_ID');
    if (!serviceAccountKey || !vendasSpreadsheetId) {
      throw new Error('GOOGLE_SERVICE_ACCOUNT_KEY ou GOOGLE_SHEETS_VENDAS_ID não configurados');
    }

    const googleToken = await getGoogleAccessToken(serviceAccountKey);

    const rows = allOrders.map(order => {
      const nomeCliente = order.customer
        ? `${order.customer.first_name || ''} ${order.customer.last_name || ''}`.trim()
        : '-';
      const itens = order.line_items.map(li => `${li.title}${li.quantity > 1 ? ` x${li.quantity}` : ''}`).join(', ');
      const cupom = (order.discount_codes || []).map(dc => dc.code).join(', ') || '-';
      const valor = parseFloat(order.total_price).toFixed(2).replace('.', ',');

      return [
        formatDate(order.created_at),
        nomeCliente,
        'Site',
        'Site',
        valor,
        mapPaymentGateway(order.payment_gateway_names),
        mapFinancialStatus(order.financial_status),
        itens,
        order.note || '-',
        cupom,
      ];
    });

    const range = encodeURIComponent('Vendas Diário!B:K');
    const appendUrl = `https://sheets.googleapis.com/v4/spreadsheets/${vendasSpreadsheetId}/values/${range}:append?valueInputOption=USER_ENTERED&insertDataOption=INSERT_ROWS`;

    const response = await fetch(appendUrl, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${googleToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ values: rows }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Erro ao exportar para Vendas Diário: ${errorText}`);
    }

    console.log(`Exportados ${rows.length} pedido(s) Shopify para Vendas Diário`);

    return new Response(
      JSON.stringify({
        sucesso: true,
        total: allOrders.length,
        mensagem: `${allOrders.length} pedido(s) da Shopify exportados para Vendas Diário`,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Erro sync-shopify-orders:', error);
    return new Response(
      JSON.stringify({ sucesso: false, erro: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
