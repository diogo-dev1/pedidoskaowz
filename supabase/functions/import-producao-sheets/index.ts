import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const SPREADSHEET_ID = '1k5EIAyrdojpi-9IMHNjpbhii9XwTlt8h3dOhm0GjVkM';
const ABA = 'Produção Semanal';

async function getAccessToken(serviceAccountKey: string): Promise<string> {
  const credentials = JSON.parse(serviceAccountKey);
  const header = { alg: 'RS256', typ: 'JWT' };
  const now = Math.floor(Date.now() / 1000);
  const claim = {
    iss: credentials.client_email,
    scope: 'https://www.googleapis.com/auth/spreadsheets.readonly',
    aud: 'https://oauth2.googleapis.com/token',
    exp: now + 3600,
    iat: now,
  };
  const b64url = (s: string) => btoa(s).replace(/=/g, '').replace(/\+/g, '-').replace(/\//g, '_');
  const signatureInput = `${b64url(JSON.stringify(header))}.${b64url(JSON.stringify(claim))}`;
  const pem = credentials.private_key.replace(/-----BEGIN PRIVATE KEY-----/, '').replace(/-----END PRIVATE KEY-----/, '').replace(/\s/g, '');
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
  if (!tokenData.access_token) throw new Error('Falha ao obter token Google');
  return tokenData.access_token;
}

function val(s: string | undefined): string | null {
  const v = (s ?? '').trim();
  return v && v !== '-' && v !== '--' ? v : null;
}

function parseData(raw: string): string | null {
  const s = (raw ?? '').trim();
  if (!s) return null;
  let m = s.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (m) return `${m[3]}-${m[2].padStart(2, '0')}-${m[1].padStart(2, '0')}`;
  m = s.match(/^(\d{1,2})\/(\d{1,2})$/);
  if (m) return `${new Date().getFullYear()}-${m[2].padStart(2, '0')}-${m[1].padStart(2, '0')}`;
  return null;
}

function mapStatus(raw: string | undefined): string {
  const s = (raw ?? '').trim().toLowerCase();
  if (s === 'andamento' || s === 'em andamento') return 'em_andamento';
  if (s === 'concluido' || s === 'concluído' || s === 'pronto') return 'concluido';
  return 'pendente';
}

/**
 * Detecta se uma linha é um separador de lote.
 * Padrões: "L52", "Lote 53", "LOTE 54", "L 55", "Lote_44"
 * Procura em TODAS as colunas da linha (pode estar em A, B ou C).
 * Retorna o número do lote ou null.
 */
function detectarLote(row: string[]): number | null {
  for (const cell of row) {
    const s = (cell ?? '').trim();
    // "Lote 53", "LOTE 53", "lote53"
    let m = s.match(/^[Ll][Oo]?[Tt][Ee][\s_.-]*(\d+)$/);
    if (m) return parseInt(m[1], 10);
    // "L52", "L 52"
    m = s.match(/^[Ll]\s*(\d+)$/);
    if (m) return parseInt(m[1], 10);
    // Dentro de texto maior: "Data Lote 44 Data" ou similar
    m = s.match(/[Ll]ote\s*(\d+)/i);
    if (m) return parseInt(m[1], 10);
  }
  return null;
}

/** Detecta se a linha é um cabeçalho (Data | Código | Nome | Item...) */
function isHeader(row: string[]): boolean {
  const joined = row.map((c) => (c ?? '').trim().toLowerCase()).join(' ');
  return joined.includes('nome') && (joined.includes('item') || joined.includes('código') || joined.includes('codigo'));
}

/** Detecta se a linha tem dados válidos (tem nome na coluna C e data na coluna A) */
function isDataRow(row: string[]): boolean {
  const nome = (row[2] ?? '').trim();
  const data = (row[0] ?? '').trim();
  return nome.length > 1 && /\d/.test(data);
}

interface ParsedItem {
  loteNum: number;
  dataLote: string | null;
  codigo: string | null;
  nome: string;
  item: string | null;
  aco: string | null;
  acabamento: string | null;
  empunhadura: string | null;
  tipoBainha: string | null;
  corBainha: string | null;
  statusLamina: string;
  statusEmpunhadura: string;
  statusBainha: string;
  entregue: boolean;
  prazo: string | null;
  observacoes: string | null;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const serviceAccountKey = Deno.env.get('GOOGLE_SERVICE_ACCOUNT_KEY');
    if (!serviceAccountKey) throw new Error('GOOGLE_SERVICE_ACCOUNT_KEY não configurada');

    const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    // Ler a planilha inteira
    const accessToken = await getAccessToken(serviceAccountKey);
    const range = encodeURIComponent(`${ABA}!A:O`);
    const url = `https://sheets.googleapis.com/v4/spreadsheets/${SPREADSHEET_ID}/values/${range}`;
    const res = await fetch(url, { headers: { Authorization: `Bearer ${accessToken}` } });
    if (!res.ok) throw new Error(`Erro ao ler planilha: ${await res.text()}`);
    const data = await res.json();
    const allRows: string[][] = data.values || [];

    console.log(`Planilha lida: ${allRows.length} linhas`);

    // ── Fase 1: Parsear por lotes (separados por "Lote XX" / "LXX") ──
    const items: ParsedItem[] = [];
    let currentLote = 0; // 0 = nenhum lote detectado ainda

    for (const row of allRows) {
      // Detecta separador de lote
      const loteNum = detectarLote(row);
      if (loteNum !== null) {
        currentLote = loteNum;
        console.log(`Detectado: Lote ${loteNum}`);
        continue;
      }

      // Pula cabeçalhos e linhas vazias
      if (isHeader(row)) continue;
      if (!isDataRow(row)) continue;
      if (currentLote === 0) continue; // dados antes do primeiro lote — ignora

      const nome = (row[2] ?? '').trim();
      if (!nome) continue;

      items.push({
        loteNum: currentLote,
        dataLote: parseData(row[0]),
        codigo: val(row[1]),
        nome,
        item: val(row[3]),
        aco: val(row[4]),
        acabamento: val(row[5]),
        empunhadura: val(row[6]),
        tipoBainha: val(row[7]),
        corBainha: val(row[8]),
        statusLamina: mapStatus(row[9]),
        statusEmpunhadura: mapStatus(row[10]),
        statusBainha: mapStatus(row[11]),
        entregue: (row[12] ?? '').trim().toUpperCase() === 'TRUE',
        prazo: parseData(row[13]) ?? null,
        observacoes: val(row[14]),
      });
    }

    console.log(`Itens válidos parseados: ${items.length} em ${new Set(items.map((i) => i.loteNum)).size} lote(s)`);

    if (items.length === 0) {
      return new Response(
        JSON.stringify({ sucesso: true, mensagem: 'Nenhum item encontrado na planilha (verifique se os lotes estão marcados como "Lote XX")', lotes: 0, pedidos: 0, itens: 0 }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      );
    }

    // ── Fase 2: Agrupar por numero_lote ──
    const loteGroups = new Map<number, ParsedItem[]>();
    for (const item of items) {
      const arr = loteGroups.get(item.loteNum) || [];
      arr.push(item);
      loteGroups.set(item.loteNum, arr);
    }

    // Buscar lotes já existentes no banco
    const { data: lotesExistentes } = await supabase.from('lotes').select('id, numero_lote');
    const lotesMap = new Map<number, string>();
    (lotesExistentes ?? []).forEach((l: any) => lotesMap.set(l.numero_lote, l.id));

    let lotesImportados = 0;
    let lotesPulados = 0;
    let pedidosImportados = 0;
    let itensImportados = 0;

    for (const [loteNum, loteItems] of loteGroups) {
      let loteId: string;

      if (lotesMap.has(loteNum)) {
        // Lote já existe — usa o ID existente, adiciona itens novos
        loteId = lotesMap.get(loteNum)!;
        lotesPulados++;
        console.log(`Lote ${loteNum} já existe (${loteId}) — verificando pedidos novos`);
      } else {
        // Criar novo lote com o numero_lote da planilha
        const prazos = loteItems.map((i) => i.prazo).filter(Boolean).sort();
        const prazoEnvio = prazos[prazos.length - 1] || null;

        const { data: novoLote, error: erroLote } = await supabase
          .from('lotes')
          .insert({
            numero_lote: loteNum,
            prazo_envio: prazoEnvio,
            total_pedidos: 0,
            status: 'aberto',
          })
          .select()
          .single();

        if (erroLote) {
          console.error(`Erro ao criar lote ${loteNum}:`, erroLote);
          continue;
        }
        loteId = novoLote.id;
        lotesMap.set(loteNum, loteId);
        lotesImportados++;
        console.log(`Lote ${loteNum} criado (${loteId})`);
      }

      // Agrupar itens por cliente
      const clienteItems = new Map<string, ParsedItem[]>();
      for (const item of loteItems) {
        const arr = clienteItems.get(item.nome) || [];
        arr.push(item);
        clienteItems.set(item.nome, arr);
      }

      for (const [nomeCliente, cItems] of clienteItems) {
        // Verificar se pedido já existe (cliente + lote)
        const { data: pedidoExistente } = await supabase
          .from('pedidos')
          .select('id')
          .eq('lote_id', loteId)
          .eq('cliente_nome', nomeCliente)
          .maybeSingle();

        if (pedidoExistente) {
          console.log(`  ${nomeCliente} já existe no lote ${loteNum} — pulando`);
          continue;
        }

        // Gerar numero_pedido
        let numeroPedido = `KWZ-PLAN-${loteNum}-${Date.now().toString(36).slice(-4)}`;
        try {
          const { data: numData } = await supabase.rpc('gerar_numero_pedido');
          if (numData) numeroPedido = numData;
        } catch { /* usa fallback */ }

        // Extrair embalagem das observações
        let embalagem: string | null = null;
        const allObs: string[] = [];
        for (const ci of cItems) {
          if (ci.observacoes) {
            const matchCaixa = ci.observacoes.match(/CAIXA:\s*(.+)/i);
            if (matchCaixa && !embalagem) embalagem = matchCaixa[1].trim();
            allObs.push(ci.observacoes);
          }
        }

        // Status do pedido
        const algumAndamento = cItems.some((ci) => ci.statusLamina === 'em_andamento' || ci.statusEmpunhadura === 'em_andamento');
        const algumConcluido = cItems.some((ci) => ci.statusLamina === 'concluido');
        const todosEntregues = cItems.every((ci) => ci.entregue);
        let statusPedido = 'em_producao';
        if (todosEntregues) statusPedido = 'entregue';
        else if (!algumAndamento && !algumConcluido) statusPedido = 'aguardando_triagem';

        const firstItem = cItems[0];

        const { data: pedido, error: erroPedido } = await supabase
          .from('pedidos')
          .insert({
            numero_pedido: numeroPedido,
            cliente_nome: nomeCliente,
            lote_id: loteId,
            prazo_entrega: firstItem.prazo || null,
            embalagem,
            observacao: allObs.length ? allObs.join(' | ') : null,
            status: statusPedido,
            canal: 'WhatsApp',
          })
          .select()
          .single();

        if (erroPedido) {
          console.error(`  Erro ao inserir pedido de ${nomeCliente}:`, erroPedido);
          continue;
        }

        pedidosImportados++;

        const itensParaInserir = cItems.map((ci) => ({
          pedido_id: pedido.id,
          modelo: ci.item,
          aco: ci.aco,
          acabamento: ci.acabamento,
          empunhadura: ci.empunhadura,
          bainha: ci.tipoBainha,
          cor_bainha: ci.corBainha,
          status_lamina: ci.statusLamina,
          status_empunhadura: ci.statusEmpunhadura,
          status_bainha: ci.statusBainha,
          status_laser: 'nao_aplicavel',
          observacoes_item: ci.observacoes,
        }));

        const { error: erroItens } = await supabase.from('pedido_itens').insert(itensParaInserir);
        if (erroItens) {
          console.error(`  Erro ao inserir itens de ${nomeCliente}:`, erroItens);
        } else {
          itensImportados += itensParaInserir.length;
          console.log(`  ${nomeCliente}: ${itensParaInserir.length} item(ns)`);
        }
      }

      // Atualizar total_pedidos do lote
      const { count } = await supabase
        .from('pedidos')
        .select('id', { count: 'exact', head: true })
        .eq('lote_id', loteId);
      await supabase.from('lotes').update({ total_pedidos: count ?? 0 }).eq('id', loteId);
    }

    const mensagem = [
      `${lotesImportados} lote(s) criado(s)`,
      lotesPulados > 0 ? `${lotesPulados} já existente(s)` : null,
      `${pedidosImportados} pedido(s)`,
      `${itensImportados} faca(s)`,
    ].filter(Boolean).join(' · ');

    console.log('Importação concluída:', mensagem);

    return new Response(
      JSON.stringify({ sucesso: true, lotes: lotesImportados, pedidos: pedidosImportados, itens: itensImportados, mensagem }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    );

  } catch (error) {
    console.error('Erro import-producao-sheets:', error);
    return new Response(
      JSON.stringify({ sucesso: false, erro: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    );
  }
});
