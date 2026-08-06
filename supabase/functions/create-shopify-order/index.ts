import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const API_VERSION = Deno.env.get('SHOPIFY_API_VERSION') ?? '2024-01';

let cachedToken: string | null = null;
let tokenExpiresAt = 0;

async function getShopifyToken(shopDomain: string): Promise<string> {
  // client_credentials primeiro (token estático fica como fallback)


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

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const body = await req.json();
    const { pedido_id, debug } = body;

    if (debug) {
      const dom = await resolveShopDomain();
      const results: Record<string, unknown> = { shop: dom };
      for (const mode of ['cc', 'static'] as const) {
        try {
          let tk: string;
          if (mode === 'cc') {
            const cid = Deno.env.get('SHOPIFY_CLIENT_ID');
            const cs = Deno.env.get('SHOPIFY_CLIENT_SECRET');
            if (!cid || !cs) { results[mode] = 'not configured'; continue; }
            const r = await fetch(`https://${dom}/admin/oauth/access_token`, {
              method: 'POST', headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ grant_type: 'client_credentials', client_id: cid, client_secret: cs }),
            });
            const d = await r.json();
            tk = d.access_token;
          } else {
            tk = Deno.env.get('SHOPIFY_ACCESS_TOKEN') ?? '';
            if (!tk) { results[mode] = 'not configured'; continue; }
          }
          const rc = await fetch(`https://${dom}/admin/api/${API_VERSION}/orders/count.json`, {
            headers: { 'X-Shopify-Access-Token': tk },
          });
          results[mode] = { read_orders_status: rc.status, body: (await rc.text()).slice(0, 200) };
        } catch (e: any) {
          results[mode] = 'erro: ' + e.message;
        }
      }
      return new Response(JSON.stringify(results), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }


    if (!pedido_id) {
      return new Response(
        JSON.stringify({ sucesso: false, erro: 'pedido_id obrigatório' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    const { data: pedido, error: erroPedido } = await supabase
      .from('pedidos')
      .select('*')
      .eq('id', pedido_id)
      .single();

    if (erroPedido || !pedido) {
      return new Response(
        JSON.stringify({ sucesso: false, erro: 'Pedido não encontrado' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (pedido.shopify_order_id) {
      return new Response(
        JSON.stringify({ sucesso: false, erro: `Pedido já existe no Shopify: ${pedido.shopify_order_name || '#' + pedido.shopify_order_id}` }),
        { status: 409, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const { data: itens } = await supabase
      .from('pedido_itens')
      .select('*')
      .eq('pedido_id', pedido_id);

    const lineItems = (itens || []).map((item: any) => ({
      title: [
        item.modelo,
        item.aco && `Aço: ${item.aco}`,
        item.acabamento && `Acab: ${item.acabamento}`,
        item.empunhadura && `Emp: ${item.empunhadura}`,
        item.bainha && `Bainha: ${item.bainha}`,
        item.brute_forge && 'Brute Forge',
        item.dragon_scale && 'Dragon Scale',
        item.texto_laser && `Laser: ${item.texto_laser}`,
      ].filter(Boolean).join(' | '),
      quantity: item.quantidade || 1,
      price: item.preco_unitario ? String(Number(item.preco_unitario).toFixed(2)) : '0.00',
      requires_shipping: true,
    }));

    if (lineItems.length === 0) {
      lineItems.push({
        title: `Pedido Kaowz ${pedido.numero_pedido}`,
        quantity: 1,
        price: pedido.valor_total ? String(Number(pedido.valor_total).toFixed(2)) : '0.00',
        requires_shipping: true,
      });
    }

    const nomeParts = (pedido.cliente_nome || '').trim().split(' ');
    const firstName = nomeParts[0] || pedido.cliente_nome;
    const lastName = nomeParts.slice(1).join(' ') || '';

    const enderecoLine = [
      pedido.cliente_endereco,
      pedido.cliente_numero,
      pedido.cliente_complemento,
    ].filter(Boolean).join(', ');

    const shopifyOrderPayload: any = {
      email: pedido.cliente_email || undefined,
      phone: pedido.cliente_celular || undefined,
      financial_status: 'paid',
      send_receipt: false,
      send_fulfillment_receipt: false,
      note: [
        `Pedido: ${pedido.numero_pedido}`,
        pedido.canal && `Canal: ${pedido.canal}`,
        pedido.forma_pagamento && `Pagamento: ${pedido.forma_pagamento}`,
        pedido.observacao && `Obs: ${pedido.observacao}`,
      ].filter(Boolean).join(' | '),
      tags: ['Kaowz-App', pedido.canal].filter(Boolean).join(', '),
      customer: {
        first_name: firstName,
        last_name: lastName,
        ...(pedido.cliente_email ? { email: pedido.cliente_email } : {}),
        ...(pedido.cliente_celular ? { phone: pedido.cliente_celular } : {}),
      },
      line_items: lineItems,
    };

    if (enderecoLine || pedido.cliente_cidade) {
      shopifyOrderPayload.shipping_address = {
        first_name: firstName,
        last_name: lastName,
        address1: enderecoLine || '-',
        address2: pedido.cliente_bairro || '',
        city: pedido.cliente_cidade || '',
        province: pedido.cliente_estado || '',
        zip: pedido.cliente_cep || '',
        country: 'BR',
        ...(pedido.cliente_celular ? { phone: pedido.cliente_celular } : {}),
      };
    }

    const shopDomain = await resolveShopDomain();
    const accessToken = await getShopifyToken(shopDomain);

    const res = await fetch(
      `https://${shopDomain}/admin/api/${API_VERSION}/orders.json`,
      {
        method: 'POST',
        headers: {
          'X-Shopify-Access-Token': accessToken,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ order: shopifyOrderPayload }),
      }
    );

    if (!res.ok) {
      const errorText = await res.text();
      throw new Error(`Shopify error [${res.status}]: ${errorText}`);
    }

    const shopifyData = await res.json();
    const shopifyOrderId = shopifyData.order?.id;
    const shopifyOrderName = shopifyData.order?.name;

    if (shopifyOrderId) {
      await supabase
        .from('pedidos')
        .update({ shopify_order_id: shopifyOrderId, shopify_order_name: shopifyOrderName })
        .eq('id', pedido_id);
    }

    console.log(`Pedido ${pedido.numero_pedido} criado no Shopify: ${shopifyOrderName} (${shopifyOrderId})`);

    return new Response(
      JSON.stringify({
        sucesso: true,
        shopify_order_id: shopifyOrderId,
        shopify_order_name: shopifyOrderName,
        mensagem: `Pedido ${shopifyOrderName} criado no Shopify`,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: any) {
    console.error('Erro create-shopify-order:', error);
    return new Response(
      JSON.stringify({ sucesso: false, erro: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
