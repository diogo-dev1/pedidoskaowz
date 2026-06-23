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

function mapPaymentGateway(gateways: string[]): string {
  const g = (gateways || []).join(', ').toLowerCase();
  if (g.includes('pix')) return 'PIX';
  if (g.includes('credit') || g.includes('cartao') || g.includes('cartão') || g.includes('card')) return 'Cartão de Crédito';
  if (g.includes('boleto')) return 'Boleto';
  return gateways.join(', ') || '-';
}

interface ShopifyOrder {
  id: number;
  name: string;
  created_at: string;
  total_price: string;
  financial_status: string;
  payment_gateway_names: string[];
  customer?: {
    first_name?: string;
    last_name?: string;
    email?: string;
    phone?: string;
    default_address?: {
      address1?: string;
      address2?: string;
      city?: string;
      province_code?: string;
      zip?: string;
      country?: string;
    };
  };
  line_items: { title: string; quantity: number; price: string }[];
  note?: string;
  discount_codes?: { code: string }[];
  shipping_address?: {
    first_name?: string;
    last_name?: string;
    address1?: string;
    address2?: string;
    city?: string;
    province_code?: string;
    zip?: string;
    name?: string;
  };
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    let body: any = {};
    try {
      const text = await req.text();
      if (text) body = JSON.parse(text);
    } catch (_) {}

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

    const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    // Filtrar pedidos já importados
    const orderIds = allOrders.map(o => o.id);
    const { data: jaImportados } = await supabase
      .from('shopify_orders_sync')
      .select('shopify_order_id')
      .in('shopify_order_id', orderIds);

    const idsJaImportados = new Set((jaImportados || []).map(r => r.shopify_order_id));
    const pedidosNovos = allOrders
      .filter(o => !idsJaImportados.has(o.id))
      .sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());

    if (pedidosNovos.length === 0) {
      return new Response(
        JSON.stringify({ sucesso: true, total: 0, mensagem: `Todos os ${allOrders.length} pedido(s) já foram importados` }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    let importados = 0;
    let erros = 0;

    for (const order of pedidosNovos) {
      try {
        const nomeCliente = order.customer
          ? `${order.customer.first_name || ''} ${order.customer.last_name || ''}`.trim()
          : 'Cliente Shopify';
        const endereco = order.shipping_address || order.customer?.default_address;
        const itensTexto = order.line_items.map(li => `${li.title}${li.quantity > 1 ? ` x${li.quantity}` : ''}`).join(', ');
        const cupom = (order.discount_codes || []).map(dc => dc.code).join(', ') || null;

        // Gerar número do pedido
        const { data: numData } = await supabase.rpc('gerar_numero_pedido');
        const numeroPedido = numData || `KWZ-SHOP-${order.id}`;

        // Inserir pedido
        const { data: pedido, error: erroPedido } = await supabase
          .from('pedidos')
          .insert({
            numero_pedido: numeroPedido,
            canal: 'Site',
            cliente_nome: nomeCliente,
            cliente_email: order.customer?.email || null,
            cliente_celular: order.customer?.phone || null,
            cliente_cep: endereco?.zip || null,
            cliente_estado: endereco?.province_code || null,
            cliente_cidade: endereco?.city || null,
            cliente_endereco: endereco?.address1 || null,
            cliente_complemento: endereco?.address2 || null,
            valor_total: parseFloat(order.total_price) || 0,
            forma_pagamento: mapPaymentGateway(order.payment_gateway_names),
            cupom,
            status: 'aguardando_triagem',
            observacao: [order.note, `Shopify ${order.name}`].filter(Boolean).join(' | ') || null,
          })
          .select()
          .single();

        if (erroPedido) {
          console.error(`Erro ao inserir pedido Shopify ${order.name}:`, erroPedido);
          erros++;
          continue;
        }

        // Inserir itens
        const itensParaInserir = order.line_items.map(li => ({
          pedido_id: pedido.id,
          modelo: li.title,
          preco_unitario: parseFloat(li.price) || 0,
          quantidade: li.quantity || 1,
        }));

        if (itensParaInserir.length > 0) {
          await supabase.from('pedido_itens').insert(itensParaInserir);
        }

        // Criar expedição
        await supabase.from('expedicao').insert({
          pedido_id: pedido.id,
          nome_destinatario: endereco?.name || nomeCliente,
          cep_destino: endereco?.zip || null,
          endereco_completo: [endereco?.address1, endereco?.address2, endereco?.city, endereco?.province_code].filter(Boolean).join(', ') || null,
          status: 'aguardando',
        });

        // Criar financeiro
        await supabase.from('financeiro_recebimentos').insert({
          pedido_id: pedido.id,
          valor: parseFloat(order.total_price) || 0,
          forma_pagamento: mapPaymentGateway(order.payment_gateway_names),
          status: order.financial_status === 'paid' ? 'recebido' : 'pendente',
          data_recebimento: order.financial_status === 'paid' ? new Date().toISOString().split('T')[0] : null,
        });

        // Registrar como importado
        await supabase.from('shopify_orders_sync').upsert({
          shopify_order_id: order.id,
          shopify_order_name: order.name,
        }, { onConflict: 'shopify_order_id' });

        importados++;
        console.log(`Pedido Shopify ${order.name} → ${numeroPedido} salvo no banco`);

      } catch (err) {
        console.error(`Erro ao processar pedido Shopify ${order.name}:`, err);
        erros++;
      }
    }

    return new Response(
      JSON.stringify({
        sucesso: true,
        total: pedidosNovos.length,
        importados,
        erros,
        mensagem: `${importados} pedido(s) importado(s) para o banco${erros > 0 ? `, ${erros} erro(s)` : ''}`,
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
