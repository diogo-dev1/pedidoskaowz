import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Planilha de Produção (Produção Semanal)
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

function parseDataLote(raw: string): string | null {
  const s = (raw ?? '').trim();
  if (!s) return null;
  // DD/MM/YYYY
  let m = s.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (m) return `${m[3]}-${m[2].padStart(2, '0')}-${m[1].padStart(2, '0')}`;
  // DD/MM (assume ano corrente)
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

interface SheetRow {
  dataLote: string;
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

    // Parsear linhas válidas (pula cabeçalhos e linhas vazias)
    const items: SheetRow[] = [];
    for (const row of allRows) {
      const dataLoteRaw = (row[0] ?? '').trim();
      const nome = (row[2] ?? '').trim();
      if (!nome || !dataLoteRaw) continue;
      // Pular linhas de cabeçalho
      if (nome.toLowerCase() === 'nome' || dataLoteRaw.toLowerCase() === 'data lote') continue;

      const dataLote = parseDataLote(dataLoteRaw);
      if (!dataLote) continue;

      items.push({
        dataLote,
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
        prazo: parseDataLote(row[13]) ?? null,
        observacoes: val(row[14]),
      });
    }

    console.log(`Itens válidos parseados: ${items.length}`);

    if (items.length === 0) {
      return new Response(
        JSON.stringify({ sucesso: true, mensagem: 'Nenhum item encontrado na planilha', lotes: 0, pedidos: 0, itens: 0 }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      );
    }

    // Agrupar por Data Lote → cria um lote por data
    const lotesByDate = new Map<string, SheetRow[]>();
    for (const item of items) {
      const arr = lotesByDate.get(item.dataLote) || [];
      arr.push(item);
      lotesByDate.set(item.dataLote, arr);
    }

    // Buscar lotes já existentes no banco (por numero_lote)
    const { data: lotesExistentes } = await supabase.from('lotes').select('id, numero_lote');
    const lotesMap = new Map<number, string>();
    (lotesExistentes ?? []).forEach((l: any) => lotesMap.set(l.numero_lote, l.id));

    // Buscar o maior numero_lote para gerar novos sequenciais
    let maxLote = 0;
    lotesMap.forEach((_, n) => { if (n > maxLote) maxLote = n; });

    let lotesImportados = 0;
    let pedidosImportados = 0;
    let itensImportados = 0;
    let lotesPulados = 0;

    // Processar cada lote (agrupado por data)
    const sortedDates = [...lotesByDate.keys()].sort();

    for (const dataLote of sortedDates) {
      const loteItems = lotesByDate.get(dataLote)!;

      // Verificar se já existe um lote para essa data (usando prazo_envio como referência)
      const { data: loteExistente } = await supabase
        .from('lotes')
        .select('id')
        .eq('prazo_envio', dataLote)
        .maybeSingle();

      let loteId: string;

      if (loteExistente) {
        loteId = loteExistente.id;
        lotesPulados++;
        console.log(`Lote para data ${dataLote} já existe (${loteId}) — adicionando itens novos`);
      } else {
        // Criar novo lote
        maxLote++;
        const { data: novoLote, error: erroLote } = await supabase
          .from('lotes')
          .insert({
            numero_lote: maxLote,
            prazo_envio: dataLote,
            total_pedidos: 0,
            status: 'aberto',
          })
          .select()
          .single();

        if (erroLote) {
          console.error(`Erro ao criar lote para ${dataLote}:`, erroLote);
          continue;
        }
        loteId = novoLote.id;
        lotesImportados++;
        console.log(`Lote ${maxLote} criado para data ${dataLote}`);
      }

      // Agrupar itens do lote por cliente (nome)
      const clienteItems = new Map<string, SheetRow[]>();
      for (const item of loteItems) {
        const arr = clienteItems.get(item.nome) || [];
        arr.push(item);
        clienteItems.set(item.nome, arr);
      }

      for (const [nomeCliente, clientItems] of clienteItems) {
        // Verificar se esse pedido (cliente + lote) já existe no banco
        const { data: pedidoExistente } = await supabase
          .from('pedidos')
          .select('id')
          .eq('lote_id', loteId)
          .eq('cliente_nome', nomeCliente)
          .maybeSingle();

        if (pedidoExistente) {
          console.log(`Pedido ${nomeCliente} no lote já existe — pulando`);
          continue;
        }

        // Gerar numero_pedido
        let numeroPedido = `KWZ-PLAN-${Date.now().toString(36).slice(-6)}`;
        try {
          const { data: numData } = await supabase.rpc('gerar_numero_pedido');
          if (numData) numeroPedido = numData;
        } catch { /* usa fallback */ }

        // Extrair observações/embalagem do primeiro item
        const firstItem = clientItems[0];
        let embalagem: string | null = null;
        let obsLimpas: string | null = null;
        for (const ci of clientItems) {
          if (ci.observacoes) {
            const matchCaixa = ci.observacoes.match(/CAIXA:\s*(.+)/i);
            if (matchCaixa && !embalagem) embalagem = matchCaixa[1].trim();
          }
        }
        const allObs = clientItems.map((ci) => ci.observacoes).filter(Boolean).join(' | ');
        if (allObs) obsLimpas = allObs;

        // Status do pedido baseado nos status dos itens
        const algumConcluido = clientItems.some((ci) => ci.statusLamina === 'concluido');
        const todosEntregues = clientItems.every((ci) => ci.entregue);
        const algumAndamento = clientItems.some((ci) => ci.statusLamina === 'em_andamento');
        let statusPedido = 'aguardando_triagem';
        if (todosEntregues) statusPedido = 'entregue';
        else if (algumConcluido || algumAndamento) statusPedido = 'em_producao';

        // Inserir pedido
        const { data: pedido, error: erroPedido } = await supabase
          .from('pedidos')
          .insert({
            numero_pedido: numeroPedido,
            cliente_nome: nomeCliente,
            lote_id: loteId,
            prazo_entrega: firstItem.prazo || null,
            embalagem,
            observacao: obsLimpas,
            status: statusPedido,
            canal: 'WhatsApp',
          })
          .select()
          .single();

        if (erroPedido) {
          console.error(`Erro ao inserir pedido de ${nomeCliente}:`, erroPedido);
          continue;
        }

        pedidosImportados++;

        // Inserir pedido_itens
        const itensParaInserir = clientItems.map((ci) => ({
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
          console.error(`Erro ao inserir itens de ${nomeCliente}:`, erroItens);
        } else {
          itensImportados += itensParaInserir.length;
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
      lotesPulados > 0 ? `${lotesPulados} lote(s) já existente(s)` : null,
      `${pedidosImportados} pedido(s) importado(s)`,
      `${itensImportados} item(ns) importado(s)`,
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
