// Cria um Draft Order na Shopify a partir do Simulador de Preços.
// Autentica via client_credentials (SHOPIFY_CLIENT_ID/SECRET) contra SHOPIFY_STORE_DOMAIN.

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const API_VERSION = '2024-10';

interface LineItemIn {
  title: string;
  quantity: number;
  price: number;
  properties?: { name: string; value: string }[];
  /** Variante real da Shopify (gid://shopify/ProductVariant/...) */
  variantId?: string;
}


interface Payload {
  itens: LineItemIn[];
  cliente?: {
    nome?: string;
    email?: string;
    telefone?: string;
    cpf?: string;
    dataNascimento?: string;
  };
  endereco?: {
    cep?: string;
    estado?: string;
    cidade?: string;
    bairro?: string;
    endereco?: string;
    numero?: string;
    complemento?: string;
  };
  observacao?: string;
  /** Notas internas (ex.: embalagem) — vão só na note do draft, nunca no checkout */
  notasInternas?: string[];
  /** Total manual do pedido — aplica desconto/acréscimo sobre a soma dos itens */
  totalDesejado?: number;
  /** Força frete grátis no draft order, independente do valor. Quando omitido, usa a regra automática. */
  freteGratis?: boolean;
}

/** Valor mínimo do pedido (BRL) para aplicar frete grátis no draft order. */
const FRETE_GRATIS_MINIMO = 1000;




function resolveDomain(): string {
  const raw = Deno.env.get('SHOPIFY_STORE_DOMAIN') ?? Deno.env.get('SHOPIFY_SHOP')
    ?? Deno.env.get('SHOPIFY_STORE_URL') ?? '';
  return raw.replace(/^https?:\/\//, '').replace(/\/$/, '');
}

// App do novo Dev Dashboard: sempre obtém token via client_credentials.
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
  console.log('[shopify] client_credentials scope:', data?.scope ?? '(sem campo scope)');
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




function normalizaTelefone(t?: string): string | undefined {
  if (!t) return undefined;
  const d = t.replace(/\D/g, '');
  if (d.length < 10) return undefined;
  return d.startsWith('55') ? `+${d}` : `+55${d}`;
}

// Trunca de forma limpa (sem cortar palavra no meio quando possível).
function truncaLimpo(s: string, max: number): string {
  if (s.length <= max) return s;
  const corte = s.slice(0, max);
  const ultimoEspaco = corte.lastIndexOf(' ');
  // Só volta até o espaço se não perdermos muito do texto
  return (ultimoEspaco > max - 30 ? corte.slice(0, ultimoEspaco) : corte).trimEnd();
}

const MAX_TITULO_LINHA = 100;   // limite defensivo p/ merchandise title (erro 400)
const MAX_VALOR_PROP = 255;     // limite seguro p/ valor de customAttribute de linha

const CUSTOMERS_QUERY = `
  query($q: String!) {
    customers(first: 1, query: $q) { edges { node { id } } }
  }`;

const CUSTOMER_CREATE = `
  mutation($input: CustomerInput!) {
    customerCreate(input: $input) {
      customer { id }
      userErrors { field message }
    }
  }`;

const DRAFT_CREATE = `
  mutation($input: DraftOrderInput!) {
    draftOrderCreate(input: $input) {
      draftOrder { id name invoiceUrl totalPriceSet { shopMoney { amount currencyCode } } lineItems(first: 30) { edges { node { title quantity originalUnitPriceSet { shopMoney { amount } } } } } }
      userErrors { field message }
    }
  }`;

async function resolveCustomer(cliente: Payload['cliente'], metafields: any[]): Promise<string | null> {
  if (!cliente) return null;
  const email = cliente.email?.trim() || undefined;
  const phone = normalizaTelefone(cliente.telefone);
  // Shopify exige e-mail OU telefone para criar cliente
  if (!email && !phone) return null;

  const q = email ? `email:${email}` : `phone:${phone}`;
  try {
    const found = await shopify(CUSTOMERS_QUERY, { q });
    const id = found?.customers?.edges?.[0]?.node?.id;
    if (id) return id;
  } catch (_) { /* segue para criação */ }

  const partes = (cliente.nome ?? '').trim().split(/\s+/);
  const input: Record<string, unknown> = {
    firstName: partes[0] || undefined,
    lastName: partes.slice(1).join(' ') || undefined,
    email,
    phone,
  };
  if (metafields.length) input.metafields = metafields;

  try {
    const created = await shopify(CUSTOMER_CREATE, { input });
    const errs = created?.customerCreate?.userErrors ?? [];
    if (errs.length) {
      console.error('customerCreate userErrors', errs);
      return null;
    }
    return created?.customerCreate?.customer?.id ?? null;
  } catch (e) {
    // Sem escopo write_customers (ou outra falha): segue sem vincular cliente.
    console.warn('customerCreate falhou, seguindo sem cliente vinculado:', (e as Error)?.message);
    return null;
  }
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  try {
    const payload: Payload & { diagnostico?: boolean } = await req.json();

    if (payload.diagnostico) {
      const dom = resolveDomain();
      const out: Record<string, unknown> = { domain: dom };
      try {
        const token = await getAccessToken(dom);
        const r = await fetch(`https://${dom}/admin/api/${API_VERSION}/oauth/access_scopes.json`, {
          headers: { 'X-Shopify-Access-Token': token },
        });
        const t = await r.text();
        out.escopos = r.ok
          ? (JSON.parse(t).access_scopes ?? []).map((s: any) => s.handle)
          : `HTTP ${r.status}: ${t.slice(0, 200)}`;
      } catch (e) {
        out.erro = (e as Error).message;
      }
      return new Response(JSON.stringify(out, null, 2), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }



    const itens = (payload.itens ?? []).filter((i) => i?.title && Number(i.price) >= 0);
    if (!itens.length) {
      return new Response(JSON.stringify({ sucesso: false, erro: 'Nenhum item enviado' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const cliente = payload.cliente ?? {};
    const end = payload.endereco ?? {};

    // CPF / nascimento não têm campo nativo → metafields do cliente
    const metafields: any[] = [];
    if (cliente.cpf?.trim()) {
      metafields.push({ namespace: 'kaowz', key: 'cpf', type: 'single_line_text_field', value: cliente.cpf.trim() });
    }
    if (cliente.dataNascimento?.trim()) {
      metafields.push({ namespace: 'kaowz', key: 'data_nascimento', type: 'single_line_text_field', value: cliente.dataNascimento.trim() });
    }

    const customerId = await resolveCustomer(cliente, metafields);

    // Títulos longos que precisaram ser truncados vão integralmente na note interna
    const titulosCompletos: string[] = [];

    const lineItems: Record<string, unknown>[] = itens.map((i) => {
      const base: Record<string, unknown> = {
        quantity: Math.max(1, Number(i.quantity) || 1),
        customAttributes: (i.properties ?? [])
          .filter((p) => p?.name && p?.value)
          .map((p) => ({ key: String(p.name).slice(0, 100), value: truncaLimpo(String(p.value), MAX_VALOR_PROP) })),
      };
      if (i.variantId) {
        // Produto real do catálogo: usa a variante (baixa estoque / relatórios por produto).
        base.variantId = i.variantId;
        // Preço editado no simulador → sobrescreve o preço da variante.
        base.priceOverride = {
          amount: Number(i.price).toFixed(2),
          currencyCode: 'BRL',
        };
        return base;
      }

      // Título defensivo: Shopify rejeita (400 "merchandise title") títulos muito longos
      const tituloCompleto = String(i.title);
      const tituloSeguro = truncaLimpo(tituloCompleto, MAX_TITULO_LINHA);
      if (tituloSeguro !== tituloCompleto) {
        // Nenhuma informação perdida: texto integral vai como propriedade da linha e na note interna
        (base.customAttributes as { key: string; value: string }[]).unshift({
          key: 'Descrição completa',
          value: truncaLimpo(tituloCompleto, MAX_VALOR_PROP),
        });
        titulosCompletos.push(tituloCompleto);
      }
      base.title = tituloSeguro;
      base.requiresShipping = true;
      base.originalUnitPriceWithCurrency = {
        amount: Number(i.price).toFixed(2),
        currencyCode: 'BRL',
      };
      return base;
    });


    // Atributos do pedido (CPF/nascimento também aqui, para visibilidade)
    const customAttributes: { key: string; value: string }[] = [];
    if (cliente.cpf?.trim()) customAttributes.push({ key: 'CPF', value: cliente.cpf.trim() });
    if (cliente.dataNascimento?.trim()) customAttributes.push({ key: 'Data de nascimento', value: cliente.dataNascimento.trim() });
    customAttributes.push({ key: 'Origem', value: 'Simulador Kaowz' });

    const input: Record<string, unknown> = {
      lineItems,
      customAttributes,
      tags: ['Kaowz-Simulador'],
      // Pedido isento de tributos: remove a linha de "Tributos" do checkout/e-mail
      taxExempt: true,
      useCustomerDefaultAddress: !!customerId,
    };
    if (customerId) {
      input.purchasingEntity = { customerId };
    } else {
      // Sem cliente vinculado: registra contato nos atributos para não perder o dado
      if (cliente.nome?.trim()) customAttributes.push({ key: 'Cliente', value: cliente.nome.trim() });
      if (cliente.email?.trim()) customAttributes.push({ key: 'E-mail', value: cliente.email.trim() });
      const tel = normalizaTelefone(cliente.telefone);
      if (tel) customAttributes.push({ key: 'Telefone', value: tel });
    }
    // Note do draft = observação + notas internas (visível só no admin, nunca no checkout)
    const notaPartes: string[] = [];
    if (payload.observacao?.trim()) notaPartes.push(payload.observacao.trim());
    const internas = (payload.notasInternas ?? []).map((n) => String(n).trim()).filter(Boolean);
    if (titulosCompletos.length) {
      internas.push('Descrições completas de itens (título truncado na linha):', ...titulosCompletos);
    }
    if (internas.length) notaPartes.push('[INTERNO]', ...internas);
    if (notaPartes.length) input.note = notaPartes.join('\n');

    // Total manual: aplica desconto (ou linha de acréscimo) sobre a soma dos itens
    const somaItens = itens.reduce((s, i) => s + Number(i.price) * Math.max(1, Number(i.quantity) || 1), 0);
    const desejado = Number(payload.totalDesejado);
    if (Number.isFinite(desejado) && Math.abs(desejado - somaItens) >= 0.01) {
      const diff = +(somaItens - desejado).toFixed(2);
      if (diff > 0) {
        input.appliedDiscount = {
          title: 'Desconto',
          description: 'Ajuste de valor do pedido',
          valueType: 'FIXED_AMOUNT',
          value: diff,
        };
      } else {
        lineItems.push({
          title: 'Ajuste de valor',
          quantity: 1,
          originalUnitPriceWithCurrency: { amount: Math.abs(diff).toFixed(2), currencyCode: 'BRL' },
          requiresShipping: false,
          customAttributes: [],
        });
      }
    }


    const temEndereco = !!(end.endereco || end.cep || end.cidade);
    if (temEndereco) {
      const partes = (cliente.nome ?? '').trim().split(/\s+/);
      // Shopify não tem campo de bairro → bairro + complemento na linha 2
      const address2 = [end.bairro, end.complemento].filter(Boolean).join(' - ');
      input.shippingAddress = {
        firstName: partes[0] || 'Cliente',
        lastName: partes.slice(1).join(' ') || '-',
        address1: [end.endereco, end.numero].filter(Boolean).join(', ') || '-',
        address2: address2 || undefined,
        city: end.cidade || undefined,
        provinceCode: end.estado && end.estado.length === 2 ? end.estado.toUpperCase() : undefined,
        province: end.estado && end.estado.length > 2 ? end.estado : undefined,
        zip: end.cep || undefined,
        countryCode: 'BR',
        phone: normalizaTelefone(cliente.telefone),
      };
      input.useCustomerDefaultAddress = false;
    }
    // Frete grátis: a flag manual tem precedência sobre a regra automática de valor.
    const totalPedido = Number.isFinite(desejado) ? desejado : somaItens;
    const aplicarFreteGratis = payload.freteGratis === true || (payload.freteGratis == null && totalPedido >= FRETE_GRATIS_MINIMO);
    if (aplicarFreteGratis) {
      input.shippingLine = { title: 'Frete grátis', price: '0.00' };
    }
    // Sem frete grátis: não enviamos shippingLine → a Shopify aplica as regras de envio da loja.


    const data = await shopify(DRAFT_CREATE, { input });
    const errs = data?.draftOrderCreate?.userErrors ?? [];
    if (errs.length) {
      return new Response(JSON.stringify({
        sucesso: false,
        erro: errs.map((e: any) => `${(e.field ?? []).join('.')}: ${e.message}`).join(' | '),
      }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    const draft = data?.draftOrderCreate?.draftOrder;
    return new Response(JSON.stringify({
      sucesso: true,
      id: draft?.id,
      nome: draft?.name,
      invoiceUrl: draft?.invoiceUrl,
      total: draft?.totalPriceSet?.shopMoney?.amount,
      cliente_vinculado: !!customerId,
      linhas: (draft?.lineItems?.edges ?? []).map((e: any) => ({ t: e.node.title, q: e.node.quantity, p: e.node.originalUnitPriceSet?.shopMoney?.amount })),
    }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });

  } catch (error: any) {
    console.error('criar-draft-order-shopify:', error);
    return new Response(JSON.stringify({ sucesso: false, erro: error?.message ?? 'Erro desconhecido' }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
