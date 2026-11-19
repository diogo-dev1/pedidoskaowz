import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

import { corsHeaders } from 'npm:@supabase/supabase-js@2/cors';
import { z } from 'npm:zod@3';
import { authenticatedRequest, cronRequest } from '../_shared/auth.ts';
import { shopifySheetStatus, netShopifyValue, paymentDate, shopifyMarker, sheetPaymentCellEqual, type PaymentTransaction } from '../_shared/salesPayment.ts';

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
    return data.access_token;
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

/** Lê a tag `vendedor:Nome` do pedido. Sem tag (venda direta pelo site) → "Site". */
function vendedorDoPedido(tags?: string): string {
  const lista = (tags || '').split(',').map((t) => t.trim());
  const tag = lista.find((t) => t.toLowerCase().startsWith('vendedor:'));
  const nome = tag ? tag.slice('vendedor:'.length).trim() : '';
  return nome || 'Site';
}

interface ShopifyOrder {
  id: number;
  name: string;
  created_at: string;
  processed_at?: string;
  cancelled_at?: string | null;
  refunds?: { transactions?: { kind: string; status: string; amount: string }[] }[];
  total_price: string;
  financial_status: string;
  payment_gateway_names: string[];
  tags?: string;
  note_attributes?: { name?: string; value?: string }[];

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
      name?: string;
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

/** Origem definida no rascunho; vendas feitas diretamente no site usam "Site". */
function origemDoPedido(noteAttributes?: ShopifyOrder['note_attributes']): string {
  const atributo = (noteAttributes || []).find((item) => item.name?.trim().toLowerCase() === 'origem');
  return atributo?.value?.trim() || 'Site';
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

const ABA_VENDAS = 'Vendas Diário';
const TIMEZONE_BR = 'America/Sao_Paulo';
const PRIMEIRA_LINHA_VENDAS = 24;

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

/** Lê todas as linhas (B:L) da aba "Vendas Diário" — coluna A é vazia, dados começam em B. */
async function lerVendas(accessToken: string, spreadsheetId: string): Promise<string[][]> {
  const range = encodeURIComponent(`${ABA_VENDAS}!B:L`);
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

/** Escreve os valores de um pedido na linha rowNumber1 (1-based) da aba "Vendas Diário" (B:L). */
async function escreverLinhaVendas(accessToken: string, spreadsheetId: string, rowNumber1: number, row: string[]): Promise<void> {
  const range = encodeURIComponent(`${ABA_VENDAS}!B${rowNumber1}:L${rowNumber1}`);
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
    const supabase = createClient(Deno.env.get('SUPABASE_URL') || '', Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || '');
    if (!(await authenticatedRequest(req)) && !(await cronRequest(req, supabase, 'shopify_cron_secret'))) {
      return new Response(JSON.stringify({ erro: 'Não autorizado' }), { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }
    const day = z.string().regex(/^\d{4}-\d{2}-\d{2}$/).refine(v => Number.isFinite(Date.parse(v)));
    const parsed = z.object({ data_inicio: day.optional(), data_fim: day.optional(), modo: z.enum(['sincronizar', 'auditar', 'limpar']).default('sincronizar') }).safeParse(await req.json().catch(() => ({})));
    if (!parsed.success) return new Response(JSON.stringify({ erro: 'Datas ou modo inválidos' }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    const body = parsed.data;
    const dataInicio = body.data_inicio || new Date().toLocaleDateString('en-CA', { timeZone: TIMEZONE_BR });
    const dataFim = body.data_fim || dataInicio;
    if (dataInicio > dataFim) return new Response(JSON.stringify({ erro: 'Intervalo inválido' }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });

    const serviceAccountKey = Deno.env.get('GOOGLE_SERVICE_ACCOUNT_KEY');
    const vendasSpreadsheetId = Deno.env.get('GOOGLE_SHEETS_VENDAS_ID');
    if (!serviceAccountKey || !vendasSpreadsheetId) throw new Error('Credenciais da planilha indisponíveis');
    const initialSheetsToken = await getGoogleAccessToken(serviceAccountKey);
    const initialRows = await lerVendas(initialSheetsToken, vendasSpreadsheetId);
    if (body.modo === 'auditar') {
      const nowBR = new Date().toLocaleDateString('en-CA', { timeZone: TIMEZONE_BR });
      const month = nowBR.slice(0, 7);
      const stats: Record<string, { linhas: number; soma: number; mes_linhas: number; mes_soma: number }> = {};
      let pendentesShopify = 0;
      let pendentesShopifyMes = 0;
      for (const row of initialRows.slice(PRIMEIRA_LINHA_VENDAS - 1)) {
        const ts = diaDaDataBR(row[0] || '');
        if (ts === null) continue;
        const date = new Date(ts).toISOString().slice(0, 10);
        const raw = (row[4] || '').replace(/R\$|\s/g, '');
        const value = Number(raw.includes(',') ? raw.replace(/\./g, '').replace(',', '.') : raw) || 0;
        const status = (row[6] || '').trim() || '(vazio)';
        const st = stats[status] ||= { linhas: 0, soma: 0, mes_linhas: 0, mes_soma: 0 };
        st.linhas++; st.soma += value;
        const current = date.startsWith(month) && date <= nowBR;
        if (current) { st.mes_linhas++; st.mes_soma += value; }
        if (status.toLowerCase() === 'pendente' && shopifyMarker(row[8] || '')) { pendentesShopify++; if (current) pendentesShopifyMes++; }
      }
      return new Response(JSON.stringify({ status: stats, pendentes_shopify: pendentesShopify, pendentes_shopify_mes: pendentesShopifyMes, mesma_planilha_relatorio: vendasSpreadsheetId === '1gSgwf7vOAHAk7fzA87_9Bo-darg1dSYyAf9lNk2p8pg' }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }
    const shopDomain = await resolveShopDomain();
    const accessToken = await getShopifyToken(shopDomain);
    const baseUrl = `https://${shopDomain}/admin/api/${API_VERSION}`;
    const shopifyHeaders = {
      'X-Shopify-Access-Token': accessToken,
      'Content-Type': 'application/json',
    };

    const createdAtMin = `${dataInicio}T00:00:00-03:00`;
    const createdAtMax = `${dataFim}T23:59:59-03:00`;

    async function listOrders(url: string): Promise<ShopifyOrder[]> {
      const orders: ShopifyOrder[] = [];
      let next: string | null = url;
      let pages = 0;
      while (next) {
        if (++pages > 100) throw new Error('Intervalo excede o limite seguro; reduza o período');
        const res = await fetch(next, { headers: shopifyHeaders });
        if (res.status === 429) { pages--; await new Promise(r => setTimeout(r, 2000)); continue; }
        if (!res.ok) throw new Error(`Shopify orders error [${res.status}]`);
        orders.push(...((await res.json()).orders || []));
        next = res.headers.get('link')?.split(',').find(p => p.includes('rel="next"'))?.match(/<([^>]+)>/)?.[1] || null;
        if (next) await new Promise(r => setTimeout(r, 550));
      }
      return orders;
    }
    let allOrders: ShopifyOrder[];
    if (body.modo === 'limpar') {
      allOrders = [];
      const markers = new Set(initialRows.filter(r => (r[6] || '').trim().toLowerCase() === 'pendente').map(r => shopifyMarker(r[8] || '')).filter(Boolean));
      for (const name of markers) {
        const matches = await listOrders(`${baseUrl}/orders.json?status=any&name=${encodeURIComponent(name || '')}&limit=250`);
        const exact = matches.find(o => o.name === name);
        if (!exact) throw new Error(`Pedido ${name} não encontrado para limpeza`);
        allOrders.push(exact);
        await new Promise(r => setTimeout(r, 550));
      }
    } else {
      const created = await listOrders(`${baseUrl}/orders.json?status=any&created_at_min=${encodeURIComponent(createdAtMin)}&created_at_max=${encodeURIComponent(createdAtMax)}&limit=250`);
      const updated = await listOrders(`${baseUrl}/orders.json?status=any&updated_at_min=${encodeURIComponent(createdAtMin)}&updated_at_max=${encodeURIComponent(createdAtMax)}&limit=250`);
      allOrders = [...new Map([...created, ...updated].map(o => [o.id, o])).values()];
    }
    console.log(`Shopify: ${allOrders.length} pedido(s) de ${dataInicio} a ${dataFim}`);

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
    let sheetsToken: string | null = null;
    let sheetId: number | null = null;
    // Estado local da planilha, atualizado a cada gravação
    let colDatas: (number | null)[] = []; // data (dia) de cada linha
    let linhaVazia: boolean[] = []; // se a linha está sem dados em B (Data vazia = linha disponível)
    let linhasVendas: string[][] = initialRows;
    let obsVendasExistentes: string[] = []; // coluna OBS — para deduplicação
    if (serviceAccountKey && vendasSpreadsheetId) {
      try {
        sheetsToken = initialSheetsToken;
        sheetId = await getSheetId(sheetsToken, vendasSpreadsheetId, ABA_VENDAS);
        const linhas = initialRows;
        colDatas = linhas.map((r) => diaDaDataBR((r?.[0] || '').toString()));
        linhaVazia = linhas.map((r) => !((r?.[0] || '').toString().trim()));
        obsVendasExistentes = linhas.map((r) => (r?.[8] || '').toString());
        console.log(`Vendas Diário: ${linhas.length} linha(s) lidas (B:L, sheetId=${sheetId})`);
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
    const linhaDoPedido = (orderName: string): number => obsVendasExistentes.findIndex(o => shopifyMarker(o) === orderName);

    /**
     * Primeira linha (0-based) disponível para gravar: sempre DEPOIS da última linha com Data
     * preenchida (a partir da linha 24). Isso evita que o pedido caia em uma linha em branco
     * no meio da planilha, fora da ordem cronológica.
     */
    const acharLinhaVazia = (): number => {
      let ultimaComData = -1;
      for (let i = colDatas.length - 1; i >= 0; i--) {
        if (colDatas[i] !== null) { ultimaComData = i; break; }
      }
      const inicio = Math.max(PRIMEIRA_LINHA_VENDAS - 1, ultimaComData + 1);
      for (let i = inicio; i < linhaVazia.length; i++) if (linhaVazia[i]) return i;
      return -1;
    };


    let importados = 0;
    let erros = 0;
    let planilhaLancados = 0;
    let planilhaDuplicados = 0;
    let planilhaAtualizados = 0;
    let planilhaIgnorados = 0;

    for (const order of pedidosOrdenados) {
      try {
        const nomeCliente = order.customer
          ? `${order.customer.first_name || ''} ${order.customer.last_name || ''}`.trim()
          : 'Cliente Shopify';
        const endereco = order.shipping_address || order.customer?.default_address;
        const itensTexto = order.line_items.map(li => `${li.title}${li.quantity > 1 ? ` x${li.quantity}` : ''}`).join(', ');
        const cupom = (order.discount_codes || []).map(dc => dc.code).join(', ') || null;

        // ── Banco: só insere se o pedido ainda não foi importado (dedup via shopify_orders_sync) ──
        if (body.modo !== 'limpar' && !idsJaImportados.has(order.id)) {
          try {
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
            } else {
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
            }
          } catch (dbErr) {
            console.error(`Erro no banco para pedido Shopify ${order.name}:`, dbErr);
            erros++;
          }
        } // ── fim do bloco banco ──

        // Lançar na planilha de Relatório de Vendas — na posição correta (dia/ordem) e sem duplicar
        if (sheetsToken && vendasSpreadsheetId && sheetId !== null) {
          const existing = linhaDoPedido(order.name);
          const status = shopifySheetStatus(order);
          if (existing >= 0) {
            planilhaDuplicados++;
            if (status) {
              const old = linhasVendas[existing] || [];
              const row = [...old];
              row[6] = status;
              if (status === 'Pago') {
                const res = await fetch(`${baseUrl}/orders/${order.id}/transactions.json`, { headers: shopifyHeaders });
                if (!res.ok) throw new Error(`Falha ao buscar pagamento ${order.name}`);
                row[0] = paymentDate(order, ((await res.json()).transactions || []) as PaymentTransaction[]);
                row[4] = netShopifyValue(order).toFixed(2).replace('.', ',');
                await new Promise(r => setTimeout(r, 550));
              }
              const changedCells = [0, 4, 6].filter(i => !sheetPaymentCellEqual(i, String(old[i] || ''), String(row[i] || '')));
              if (changedCells.length > 0) {
                // Only patch payment cells; keep formulas, notes, formatting and manual fields intact.
                const res = await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${vendasSpreadsheetId}/values:batchUpdate`, {
                  method: 'POST', headers: { Authorization: `Bearer ${sheetsToken}`, 'Content-Type': 'application/json' },
                  body: JSON.stringify({ valueInputOption: 'USER_ENTERED', data: changedCells.map(i => ({ range: `'${ABA_VENDAS}'!${['B', '', '', '', 'F', '', 'H'][i]}${existing + 1}`, values: [[row[i]]] })) }),
                });
                if (!res.ok) throw new Error('Falha ao atualizar pagamento na planilha');
                linhasVendas[existing] = row;
                colDatas[existing] = diaDaDataBR(row[0]);
                planilhaAtualizados++;
              }
            } else planilhaIgnorados++;
          } else if (status === 'Pago' && body.modo !== 'limpar') {
            try {
              const res = await fetch(`${baseUrl}/orders/${order.id}/transactions.json`, { headers: shopifyHeaders });
              if (!res.ok) throw new Error(`Falha ao buscar pagamento ${order.name}`);
              const dataBR = paymentDate(order, ((await res.json()).transactions || []) as PaymentTransaction[]);
              await new Promise(r => setTimeout(r, 550));
              const diaTs = diaDaDataBR(dataBR) ?? Date.now();
              const obs = valorOuTraco([order.note, marcadorShopify(order.name)].filter(Boolean).join(' | '));
              const row = [
                dataBR,                                                             // B - Data
                valorOuTraco(nomeCliente),                                          // C - Nome
                vendedorDoPedido(order.tags),                                       // D - Vendedor (tag vendedor: / "Site")
                'Site',                                                             // E - Canal


                netShopifyValue(order).toFixed(2).replace('.', ','), // F - Valor líquido (R$)
                mapPaymentGateway(order.payment_gateway_names),                     // G - Forma de Pag.
                'Pago',                                                             // H - Status
                valorOuTraco(itensTexto),                                           // I - Item
                obs,                                                                // J - OBS (inclui marcador de dedup)
                valorOuTraco(cupom),                                                // K - Cupom
                origemDoPedido(order.note_attributes),                              // L - Origem
              ];

              // Reaproveita primeira linha em branco a partir da 24 (preserva formatação/validação existentes).
              // Se não houver linha em branco disponível, apenas escreve na próxima linha livre —
              // SEM insertDimension, para não deslocar linhas e não alterar formatação das linhas existentes.
              const posVazia = acharLinhaVazia();
              let pos0: number;
              if (posVazia >= 0) {
                pos0 = posVazia;
              } else {
                pos0 = Math.max(colDatas.length, PRIMEIRA_LINHA_VENDAS - 1);
                // garante slots no estado local sem tocar em linhas anteriores
                while (colDatas.length <= pos0) {
                  colDatas.push(null);
                  linhaVazia.push(true);
                  obsVendasExistentes.push('');
                }
              }
              await escreverLinhaVendas(sheetsToken, vendasSpreadsheetId, pos0 + 1, row);

              // Atualiza o estado local
              colDatas[pos0] = diaTs;
              linhaVazia[pos0] = false;
              obsVendasExistentes[pos0] = obs;
              linhasVendas[pos0] = row;

              planilhaLancados++;
              console.log(`Pedido ${order.name} gravado na planilha de Vendas (linha ${pos0 + 1})`);
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
      partesMsg.push(`${planilhaAtualizados} atualizado(s) na planilha`);
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
        planilha_atualizados: planilhaAtualizados,
        planilha_ignorados: planilhaIgnorados,
        erros,
        mensagem: partesMsg.join(' · '),
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Erro sync-shopify-orders:', error);
    return new Response(
      JSON.stringify({ sucesso: false, erro: error instanceof Error ? error.message : String(error) }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
