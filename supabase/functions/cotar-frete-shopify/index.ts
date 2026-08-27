// Cota o frete REAL do checkout: cria um draft order temporário na Shopify,
// lê as opções de entrega disponíveis (app de frete da loja) e apaga o rascunho.
// Autenticação igual à de criar-draft-order-shopify: client_credentials, sem cache.

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const API_VERSION = '2024-10';

interface ItemIn {
  /** gid://shopify/ProductVariant/... — produto real do catálogo */
  variantId?: string;
  title?: string;
  price?: number;
  quantity?: number;
}

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
    body: JSON.stringify({ grant_type: 'client_credentials', client_id: clientId, client_secret: clientSecret }),
  });
  const text = await res.text();
  if (!res.ok) throw new Error(`Falha ao obter token client_credentials (HTTP ${res.status}): ${text.slice(0, 300)}`);
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

// Calcula o rascunho SEM persistir nada na loja — retorna as mesmas taxas
// de entrega que o checkout ofereceria (app de frete da loja).
const DRAFT_CALCULATE = `
  mutation($input: DraftOrderInput!) {
    draftOrderCalculate(input: $input) {
      calculatedDraftOrder {
        availableShippingRates { handle title price { amount currencyCode } }
      }
      userErrors { field message }
    }
  }`;


const truncaLimpo = (s: string, max: number) => (s.length <= max ? s : s.slice(0, max).trimEnd());

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  let draftId: string | undefined;
  try {
    const body = await req.json().catch(() => ({}));
    const cep = String(body?.cep ?? '').replace(/\D/g, '');
    const itens: ItemIn[] = Array.isArray(body?.itens) ? body.itens : [];

    if (cep.length !== 8) {
      return new Response(JSON.stringify({ sucesso: false, erro: 'Informe um CEP de destino com 8 dígitos.' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
    if (!itens.length) {
      return new Response(JSON.stringify({ sucesso: false, erro: 'Adicione pelo menos um item ao pedido.' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const lineItems = itens.map((i) => {
      const quantity = Math.max(1, Number(i.quantity) || 1);
      if (i.variantId) return { variantId: i.variantId, quantity };
      return {
        title: truncaLimpo(String(i.title ?? 'Item personalizado'), 100),
        quantity,
        requiresShipping: true,
        originalUnitPriceWithCurrency: { amount: (Number(i.price) || 0).toFixed(2), currencyCode: 'BRL' },
      };
    });

    const input: Record<string, unknown> = {
      lineItems,
      taxExempt: true,
      shippingAddress: {
        firstName: 'Cotação',
        lastName: 'Frete',
        address1: '-',
        zip: `${cep.slice(0, 5)}-${cep.slice(5)}`,
        countryCode: 'BR',
      },
    };

    // draftOrderCalculate: não cria rascunho algum na loja, então não há o que apagar.
    let rates: any[] = [];
    for (let tentativa = 0; tentativa < 3; tentativa++) {
      const calc = await shopify(DRAFT_CALCULATE, { input });
      const errs = calc?.draftOrderCalculate?.userErrors ?? [];
      if (errs.length) {
        return new Response(JSON.stringify({
          sucesso: false,
          erro: errs.map((e: any) => `${(e.field ?? []).join('.')}: ${e.message}`).join(' | '),
        }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
      }
      rates = calc?.draftOrderCalculate?.calculatedDraftOrder?.availableShippingRates ?? [];
      if (rates.length) break;
      // O app de frete pode demorar a responder na primeira chamada.
      await new Promise((r) => setTimeout(r, 1200));
    }

    const opcoes = rates.map((r: any) => ({
      handle: r.handle,
      nome: r.title,
      valor: Number(r.price?.amount ?? 0),
      moeda: r.price?.currencyCode ?? 'BRL',
    }));

    if (!opcoes.length) {
      return new Response(JSON.stringify({
        sucesso: false,
        erro: 'O Shopify não devolveu nenhuma opção de entrega para esse CEP. Verifique o CEP, se o app de frete está no ar e se os produtos têm peso cadastrado.',
      }), { status: 422, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    return new Response(JSON.stringify({ sucesso: true, opcoes }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error: any) {
    console.error('cotar-frete-shopify:', error);
    return new Response(JSON.stringify({ sucesso: false, erro: error?.message ?? 'Erro desconhecido' }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

});
