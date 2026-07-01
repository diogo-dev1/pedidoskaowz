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

// ─────────────────────────────────────────────────────────────
// Google Sheets — Relatório de Vendas (aba "Vendas Diário")
// Reutiliza a mesma lógica de autenticação do export-to-sheets,
// sem modificar aquela função.
// ─────────────────────────────────────────────────────────────
async function getGoogleAccessToken(serviceAccountKey: string): Promise<string> {
  const credentials = JSON.parse(serviceAccountKey);
  const header = { alg: 'RS256', typ: 'JWT' };
  const now = Math.floor(Date.now() / 1000);
  const claim = {
    iss: credentials.client_email,
    scope: 'https://www.googleapis.com/auth/spreadsheets',
    aud: 'https://oauth2.googleapis.com/token',
    exp: now + 3600,
    iat: now,
  };
  const b64url = (s: string) => btoa(s).replace(/=/g, '').replace(/\+/g, '-').replace(/\//g, '_');
  const signatureInput = `${b64url(JSON.stringify(header))}.${b64url(JSON.stringify(claim))}`;
  const pem = credentials.private_key
    .replace(/-----BEGIN PRIVATE KEY-----/, '')
    .replace(/-----END PRIVATE KEY-----/, '')
    .replace(/\s/g, '');
  const binaryKey = Uint8Array.from(atob(pem), (c) => c.charCodeAt(0));
  const key = await crypto.subtle.importKey('pkcs8', binaryKey, { name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-256' }, false, ['sign']);
  const signature = await crypto.subtle.sign('RSASSA-PKCS1-v1_5', key, new TextEncoder().encode(signatureInput));
  const signatureB64 = btoa(String.fromCharCode(...new Uint8Array(signature))).replace(/=/g, '').replace(/\+/g, '-').replace(/\//g, '_');
  const jwt = `${signatureInput}.${signatureB64}`;
  const res = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({ grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer', assertion: jwt }),
  });
  const tokenData = await res.json();
  if (!tokenData.access_token) throw new Error('Falha ao obter token Google: ' + JSON.stringify(tokenData));
  return tokenData.access_token;
}

const ABA_VENDAS = 'Vendas Site';
const TIMEZONE_BR = 'America/Sao_Paulo';

function valorOuTraco(v: unknown): string {
  return (v ?? '').toString().trim() || '-';
}

/** Data DD/MM/YYYY no fuso de São Paulo (Deno roda em UTC — sem isso, pedidos da noite cairiam no dia seguinte). */
function formatarDataBR(iso: string): string {
  const d = new Date(iso);
  const base = isNaN(d.getTime()) ? new Date() : d;
  return base.toLocaleDateString('pt-BR', { timeZone: TIMEZONE_BR });
}

/** Converte "DD/MM/YYYY" no número do dia (meia-noite UTC) para comparação de posição. null se não for data. */
function diaDaDataBR(s: string): number | null {
  const m = (s || '').trim().match(/^(\d{1,2})\/(\d{1,2})\/(\d{2,4})$/);
  if (!m) return null;
  let year = parseInt(m[3], 10);
  if (year < 100) year += 2000;
  return Date.UTC(year, parseInt(m[2], 10) - 1, parseInt(m[1], 10));
}

/** Marcador único do pedido Shopify gravado na coluna OBS da planilha — base da deduplicação. */
function marcadorShopify(orderName: string): string {
  return `Shopify ${orderName}`.trim();
}

/** Descobre o sheetId (gid) numérico de uma aba pelo título. */
async function getSheetId(accessToken: string, spreadsheetId: string, title: string): Promise<number | null> {
  const url = `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}?fields=sheets.properties(sheetId,title)`;
  const res = await fetch(url, { headers: { Authorization: `Bearer ${accessToken}` } });
  if (!res.ok) {
    console.error('Erro ao obter metadados da planilha:', await res.text());
    return null;
  }
  const data = await res.json();
  const sheet = (data.sheets || []).find((s: any) => s.properties?.title === title);
  return sheet?.properties?.sheetId ?? null;
}

/** Lê todas as linhas (A:J) da aba "Vendas Diário". */
async function lerVendas(accessToken: string, spreadsheetId: string): Promise<string[][]> {
  const range = encodeURIComponent(`${ABA_VENDAS}!A:J`);
  const url = `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${range}`;
  const res = await fetch(url, { headers: { Authorization: `Bearer ${accessToken}` } });
  if (!res.ok) {
    console.error('Erro ao ler a aba Vendas Diário:', await res.text());
    return [];
  }
  const data = await res.json();
  return (data.values || []) as string[][];
}

/** Insere uma linha em branco na posição rowIndex0 (0-based), herdando a formatação da linha acima. */
async function inserirLinhaVazia(accessToken: string, spreadsheetId: string, sheetId: number, rowIndex0: number): Promise<void> {
  const url = `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}:batchUpdate`;
  const res = await fetch(url, {
    method: 'POST',
    headers: { Authorization: `Bearer ${accessToken}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      requests: [{
        insertDimension: {
          range: { sheetId, dimension: 'ROWS', startIndex: rowIndex0, endIndex: rowIndex0 + 1 },
          inheritFromBefore: rowIndex0 > 0,
        },
      }],
    }),
  });
  if (!res.ok) throw new Error(`Falha ao inserir linha na planilha: ${await res.text()}`);
}

/** Escreve os valores de um pedido na linha rowNumber1 (1-based) da aba "Vendas Diário". */
async function escreverLinhaVendas(accessToken: string, spreadsheetId: string, rowNumber1: number, row: string[]): Promise<void> {
  const range = encodeURIComponent(`${ABA_VENDAS}!A${rowNumber1}:J${rowNumber1}`);
  const url = `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${range}?valueInputOption=USER_ENTERED`;
  const res = await fetch(url, {
    method: 'PUT',
    headers: { Authorization: `Bearer ${accessToken}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ values: [row] }),
  });
  if (!res.ok) throw new Error(`Falha ao escrever linha na planilha de Vendas: ${await res.text()}`);
}

/**
 * Calcula a posição (0-based) onde inserir um pedido da data `diaTs`, mantendo a ordem cronológica.
 * Insere logo após a última linha cuja data <= diaTs (fim do bloco do dia). Como os pedidos são
 * processados em ordem de hora, os do mesmo dia ficam ordenados entre si.
 */
function calcularPosicaoInsercao(colDatas: (number | null)[], diaTs: number): number {
  // última linha com data <= diaTs
  for (let i = colDatas.length - 1; i >= 0; i--) {
    if (colDatas[i] !== null && (colDatas[i] as number) <= diaTs) return i + 1;
  }
  // nenhuma data <= diaTs: inserir antes da primeira data existente (pedido mais antigo que tudo)
  for (let i = 0; i < colDatas.length; i++) {
    if (colDatas[i] !== null) return i;
  }
  // planilha sem datas (só cabeçalho/vazia): vai para o fim
  return colDatas.length;
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
    // Processa TODOS os pedidos do período. A deduplicação de banco (shopify_orders_sync)
    // e a de planilha (coluna OBS) são independentes — um pedido pode já estar no banco
    // mas ainda não na planilha (ex.: importado antes desta integração).
    const pedidosOrdenados = [...allOrders]
      .sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());

    // Preparar integração com a planilha de Relatório de Vendas (aba "Vendas Diário")
    const serviceAccountKey = Deno.env.get('GOOGLE_SERVICE_ACCOUNT_KEY');
    const vendasSpreadsheetId = Deno.env.get('GOOGLE_SHEETS_VENDAS_ID');
    let sheetsToken: string | null = null;
    let sheetId: number | null = null;
    // Estado local da planilha, atualizado a cada inserção para manter a ordem correta no lote
    let colDatas: (number | null)[] = []; // data (dia) de cada linha — para posicionar
    let obsVendasExistentes: string[] = []; // coluna OBS — para deduplicação
    if (serviceAccountKey && vendasSpreadsheetId) {
      try {
        sheetsToken = await getGoogleAccessToken(serviceAccountKey);
        sheetId = await getSheetId(sheetsToken, vendasSpreadsheetId, ABA_VENDAS);
        const linhas = await lerVendas(sheetsToken, vendasSpreadsheetId);
        colDatas = linhas.map((r) => diaDaDataBR((r?.[0] || '').toString()));
        obsVendasExistentes = linhas.map((r) => (r?.[8] || '').toString());
        console.log(`Vendas Diário: ${linhas.length} linha(s) lidas (sheetId=${sheetId}) para posicionamento e dedup`);
        if (sheetId === null) {
          console.error(`Aba "${ABA_VENDAS}" não encontrada — pulando lançamento na planilha`);
          sheetsToken = null;
        }
      } catch (e) {
        console.error('Não foi possível preparar a planilha de Vendas (segue só com o banco):', e);
        sheetsToken = null;
      }
    } else {
      console.warn('GOOGLE_SERVICE_ACCOUNT_KEY ou GOOGLE_SHEETS_VENDAS_ID ausente — pulando lançamento na planilha');
    }

    // Verifica se um pedido Shopify já consta na planilha (pelo marcador na coluna OBS)
    const jaNaPlanilha = (orderName: string): boolean => {
      const marcador = marcadorShopify(orderName).toLowerCase();
      return obsVendasExistentes.some((o) => o.toLowerCase().includes(marcador));
    };

    let importados = 0;
    let erros = 0;
    let planilhaLancados = 0;
    let planilhaDuplicados = 0;

    for (const order of pedidosOrdenados) {
      try {
        const nomeCliente = order.customer
          ? `${order.customer.first_name || ''} ${order.customer.last_name || ''}`.trim()
          : 'Cliente Shopify';
        const endereco = order.shipping_address || order.customer?.default_address;
        const itensTexto = order.line_items.map(li => `${li.title}${li.quantity > 1 ? ` x${li.quantity}` : ''}`).join(', ');
        const cupom = (order.discount_codes || []).map(dc => dc.code).join(', ') || null;

        // ── Banco: só insere se o pedido ainda não foi importado (dedup via shopify_orders_sync) ──
        if (!idsJaImportados.has(order.id)) {
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
        } // ── fim do bloco banco ──

        // Lançar na planilha de Relatório de Vendas — na posição correta (dia/ordem) e sem duplicar
        if (sheetsToken && vendasSpreadsheetId && sheetId !== null) {
          if (jaNaPlanilha(order.name)) {
            planilhaDuplicados++;
            console.log(`Pedido ${order.name} já existe na planilha de Vendas — não duplicado`);
          } else {
            try {
              const dataBR = formatarDataBR(order.created_at);
              const diaTs = diaDaDataBR(dataBR) ?? Date.now();
              const obs = valorOuTraco([order.note, marcadorShopify(order.name)].filter(Boolean).join(' | '));
              const row = [
                dataBR,                                                             // A - Data
                valorOuTraco(nomeCliente),                                          // B - Nome
                'Site',                                                             // C - Canal
                'Site',                                                             // D - Vendedor
                (parseFloat(order.total_price) || 0).toFixed(2).replace('.', ','), // E - Valor
                mapPaymentGateway(order.payment_gateway_names),                     // F - Forma de Pag.
                order.financial_status === 'paid' ? 'Pago' : 'Pendente',           // G - Status
                valorOuTraco(itensTexto),                                           // H - Item
                obs,                                                                // I - OBS (inclui marcador de dedup)
                valorOuTraco(cupom),                                                // J - Cupom
              ];

              // Posiciona no dia correto (pedidos já vêm ordenados por hora)
              const pos0 = calcularPosicaoInsercao(colDatas, diaTs);
              await inserirLinhaVazia(sheetsToken, vendasSpreadsheetId, sheetId, pos0);
              await escreverLinhaVendas(sheetsToken, vendasSpreadsheetId, pos0 + 1, row);

              // Atualiza o estado local para os próximos pedidos do mesmo lote
              colDatas.splice(pos0, 0, diaTs);
              obsVendasExistentes.splice(pos0, 0, obs);

              planilhaLancados++;
              console.log(`Pedido ${order.name} lançado na planilha de Vendas (linha ${pos0 + 1})`);
            } catch (e) {
              console.error(`Erro ao lançar ${order.name} na planilha de Vendas:`, e);
              erros++;
            }
          }
        }

      } catch (err) {
        console.error(`Erro ao processar pedido Shopify ${order.name}:`, err);
        erros++;
      }
    }

    const partesMsg = [`${importados} pedido(s) importado(s) para o banco`];
    if (sheetsToken) {
      partesMsg.push(`${planilhaLancados} lançado(s) na planilha de Vendas`);
      if (planilhaDuplicados > 0) partesMsg.push(`${planilhaDuplicados} já existente(s) na planilha`);
    }
    if (erros > 0) partesMsg.push(`${erros} erro(s)`);

    return new Response(
      JSON.stringify({
        sucesso: true,
        total: pedidosOrdenados.length,
        importados,
        planilha_lancados: planilhaLancados,
        planilha_duplicados: planilhaDuplicados,
        erros,
        mensagem: partesMsg.join(' · '),
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
