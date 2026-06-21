import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

async function getAccessToken(serviceAccountKey: string): Promise<string> {
  const credentials = JSON.parse(serviceAccountKey);
  
  const header = {
    alg: "RS256",
    typ: "JWT",
  };

  const now = Math.floor(Date.now() / 1000);
  const claim = {
    iss: credentials.client_email,
    scope: "https://www.googleapis.com/auth/spreadsheets",
    aud: "https://oauth2.googleapis.com/token",
    exp: now + 3600,
    iat: now,
  };

  const encoder = new TextEncoder();
  const headerB64 = btoa(JSON.stringify(header)).replace(/=/g, '').replace(/\+/g, '-').replace(/\//g, '_');
  const claimB64 = btoa(JSON.stringify(claim)).replace(/=/g, '').replace(/\+/g, '-').replace(/\//g, '_');
  
  const signatureInput = `${headerB64}.${claimB64}`;
  
  // Import private key
  const privateKeyPem = credentials.private_key
    .replace(/-----BEGIN PRIVATE KEY-----/, '')
    .replace(/-----END PRIVATE KEY-----/, '')
    .replace(/\s/g, '');
  
  const binaryKey = Uint8Array.from(atob(privateKeyPem), c => c.charCodeAt(0));
  
  const key = await crypto.subtle.importKey(
    'pkcs8',
    binaryKey,
    {
      name: 'RSASSA-PKCS1-v1_5',
      hash: 'SHA-256',
    },
    false,
    ['sign']
  );

  const signature = await crypto.subtle.sign(
    'RSASSA-PKCS1-v1_5',
    key,
    encoder.encode(signatureInput)
  );

  const signatureB64 = btoa(String.fromCharCode(...new Uint8Array(signature)))
    .replace(/=/g, '')
    .replace(/\+/g, '-')
    .replace(/\//g, '_');

  const jwt = `${signatureInput}.${signatureB64}`;

  // Exchange JWT for access token
  const tokenResponse = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: new URLSearchParams({
      grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
      assertion: jwt,
    }),
  });

  const tokenData = await tokenResponse.json();
  return tokenData.access_token;
}

interface LaminaData {
  modelo: string;
  aco: string;
  acabamento: string;
  empunhadura: string;
  bainha: string;
  corBainha: string;
  laser: boolean;
  textoLaser: string;
  localGravacao: string;
  embalagem: string;
  embalagemGravacao: boolean;
  embalagemTextoGravacao: string;
  observacoesLamina?: string;
}

interface ProdutoAdicional {
  nome: string;
  quantidade: number;
  precoUnitario: number;
  total: number;
}

interface ExportData {
  nomeCompleto: string;
  cpf?: string;
  email?: string;
  celular?: string;
  cep?: string;
  endereco?: string;
  numero?: string;
  bairro?: string;
  cidade?: string;
  estado?: string;
  complemento?: string;
  dataNascimento?: string;
  nomeCertificado?: string;
  formaPagamento?: string;
  canal?: string;
  status?: string;
  origemCliente?: string;
  observacao?: string;
  cupom?: string;
  prazo?: string;
  numeroPedido?: string;
  laminas: LaminaData[];
  produtosAdicionais?: ProdutoAdicional[];
  valorTotal?: number;
  vendedor?: string;
  prontaEntrega?: boolean;
}

// Helper para garantir que campos vazios sejam preenchidos com "-"
function valorOuTraco(valor: string | undefined | null): string {
  return valor?.trim() || '-';
}

// Função para gerar número do pedido baseado em timestamp
function gerarNumeroPedido(): string {
  const now = new Date();
  const year = now.getFullYear().toString().slice(-2);
  const month = (now.getMonth() + 1).toString().padStart(2, '0');
  const day = now.getDate().toString().padStart(2, '0');
  const random = Math.floor(Math.random() * 1000).toString().padStart(3, '0');
  return `${year}${month}${day}-${random}`;
}

// Função para formatar data atual como DD/MM/YYYY
function getDataAtual(): string {
  const now = new Date();
  const day = now.getDate().toString().padStart(2, '0');
  const month = (now.getMonth() + 1).toString().padStart(2, '0');
  const year = now.getFullYear();
  return `${day}/${month}/${year}`;
}

// URL do Web App do Google Apps Script para executar "lancarPedido"
const GOOGLE_SCRIPT_WEB_APP_URL = 'https://script.google.com/macros/s/AKfycbxp-uq9EJTeB69ptLrE5dsDrcsLMQPn1i89ydZ_EP7NjggRaNZtrdSEu6MxKVY9f2fBsw/exec';

// Planilha nova — "PEDIDOS A LANÇAR"
const PEDIDOS_A_LANCAR_SPREADSHEET_ID = '1VjHLz1jQLk9r6W5YMt6g7dbAgeTS4-lVpGxZkJT0cDo';

interface LaminaResult {
  index: number;
  success: boolean;
  error?: string;
}

// Exportar para planilha de Produção (aba "Lançamento Venda")
// Insere dados em C6:M6 e executa o script "lancarPedido" via Web App
// Processa lâminas sequencialmente e para em caso de erro
async function exportarParaProducao(
  accessToken: string, 
  spreadsheetId: string, 
  data: ExportData
): Promise<{ success: boolean; processadas: number; total: number; erro?: string }> {
  const total = data.laminas.length;
  let processadas = 0;

  for (let i = 0; i < data.laminas.length; i++) {
    const lamina = data.laminas[i];
    
    // Construir texto de personalização
    let personalizacao = '-';
    if (lamina.laser && lamina.textoLaser) {
      personalizacao = lamina.textoLaser;
      if (lamina.localGravacao) {
        personalizacao += ` (${lamina.localGravacao})`;
      }
    }
    if (lamina.embalagemGravacao && lamina.embalagemTextoGravacao) {
      if (personalizacao !== '-') personalizacao += ' | ';
      else personalizacao = '';
      personalizacao += `Embalagem: ${lamina.embalagemTextoGravacao}`;
    }

    // Dados para as células C6:M6
    // C=Nome, D=Item, E=Aço, F=Acabamento, G=Empunhadura, H=Bainha, 
    // I=Cor Bainha, J=Prazo, K=Observações (da lâmina), L=Personalização, M=Embalagem
    const rowData = [
      valorOuTraco(data.nomeCompleto), // C - Nome
      valorOuTraco(lamina.modelo), // D - Item
      valorOuTraco(lamina.aco), // E - Aço
      valorOuTraco(lamina.acabamento), // F - Acabamento
      valorOuTraco(lamina.empunhadura), // G - Empunhadura
      valorOuTraco(lamina.bainha), // H - Bainha
      valorOuTraco(lamina.corBainha), // I - Cor Bainha
      valorOuTraco(data.prazo), // J - Prazo
      valorOuTraco(lamina.observacoesLamina), // K - Observações da lâmina específica
      personalizacao, // L - Personalização
      valorOuTraco(lamina.embalagem), // M - Embalagem
    ];

    // 1. Inserir dados na aba "Lançamento Venda" em C6:M6
    const range = encodeURIComponent('Lançamento Venda!C6:M6');
    const updateUrl = `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${range}?valueInputOption=USER_ENTERED`;
    
    console.log(`Inserindo lâmina ${i + 1}/${total} em Produção:`, { modelo: lamina.modelo });
    
    try {
      const updateResponse = await fetch(updateUrl, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          values: [rowData],
        }),
      });

      if (!updateResponse.ok) {
        const errorText = await updateResponse.text();
        console.error(`Erro ao inserir lâmina ${i + 1}:`, errorText);
        return {
          success: false,
          processadas,
          total,
          erro: `Erro ao inserir lâmina ${i + 1} (${lamina.modelo || 'sem modelo'}): ${errorText}`
        };
      }

      console.log(`Lâmina ${i + 1} inserida, executando script lancarPedido...`);

      // 2. Executar o script "lancarPedido" via Web App (GET request)
      const scriptResponse = await fetch(`${GOOGLE_SCRIPT_WEB_APP_URL}?action=lancarPedido`, {
        method: 'GET',
      });

      if (!scriptResponse.ok) {
        const errorText = await scriptResponse.text();
        console.error(`Erro ao executar script para lâmina ${i + 1}:`, errorText);
        return {
          success: false,
          processadas,
          total,
          erro: `Erro ao executar lancarPedido para lâmina ${i + 1} (${lamina.modelo || 'sem modelo'}): ${errorText}`
        };
      }

      const result = await scriptResponse.text();
      console.log(`Script lancarPedido executado com sucesso para lâmina ${i + 1}:`, result);
      processadas++;

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Erro desconhecido';
      console.error(`Erro ao processar lâmina ${i + 1}:`, errorMessage);
      return {
        success: false,
        processadas,
        total,
        erro: `Erro ao processar lâmina ${i + 1} (${lamina.modelo || 'sem modelo'}): ${errorMessage}`
      };
    }
  }

  console.log('Exportado para Produção:', processadas, 'de', total, 'lâmina(s)');
  return { success: true, processadas, total };
}

// Exportar para aba "PEDIDOS A LANÇAR" na planilha nova (append por lâmina)
async function exportarParaPedidosALancar(
  accessToken: string,
  data: ExportData
): Promise<void> {
  const rows = data.laminas.map(lamina => {
    let personalizacao = '-';
    if (lamina.laser && lamina.textoLaser) {
      personalizacao = lamina.textoLaser;
      if (lamina.localGravacao) {
        personalizacao += ` (${lamina.localGravacao})`;
      }
    }

    return [
      valorOuTraco(data.nomeCompleto), // B — Nome
      valorOuTraco(lamina.modelo), // C — Item
      valorOuTraco(lamina.aco), // D — Aço
      valorOuTraco(lamina.acabamento), // E — Acabamento
      valorOuTraco(lamina.empunhadura), // F — Empunhadura
      valorOuTraco(lamina.bainha), // G — Bainha
      valorOuTraco(lamina.corBainha), // H — Cor bainha
      valorOuTraco(data.prazo), // I — Prazo
      valorOuTraco(lamina.observacoesLamina), // J — Observações
      personalizacao, // K — Personalização
    ];
  });

  // Encontrar última linha com dados na coluna B
  const readRange = encodeURIComponent('PEDIDOS A LANÇAR!B:B');
  const readUrl = `https://sheets.googleapis.com/v4/spreadsheets/${PEDIDOS_A_LANCAR_SPREADSHEET_ID}/values/${readRange}`;
  const readRes = await fetch(readUrl, { headers: { 'Authorization': `Bearer ${accessToken}` } });
  let nextRow = 2;
  if (readRes.ok) {
    const readData = await readRes.json();
    const colB = readData.values || [];
    for (let i = colB.length - 1; i >= 0; i--) {
      if (colB[i][0] && colB[i][0].toString().trim()) {
        nextRow = i + 2;
        break;
      }
    }
  }

  const writeRange = encodeURIComponent(`PEDIDOS A LANÇAR!B${nextRow}:K${nextRow + rows.length - 1}`);
  const writeUrl = `https://sheets.googleapis.com/v4/spreadsheets/${PEDIDOS_A_LANCAR_SPREADSHEET_ID}/values/${writeRange}?valueInputOption=USER_ENTERED`;

  const response = await fetch(writeUrl, {
    method: 'PUT',
    headers: {
      'Authorization': `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ values: rows }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error('Erro ao exportar para PEDIDOS A LANÇAR:', errorText);
    throw new Error(`Falha ao exportar para PEDIDOS A LANÇAR: ${errorText}`);
  }

  console.log(`Exportado para PEDIDOS A LANÇAR: ${rows.length} lâmina(s)`);
}

// Exportar para planilha de Relatório de Vendas (aba "Vendas Diário")
async function exportarParaVendas(
  accessToken: string, 
  spreadsheetId: string, 
  data: ExportData
): Promise<void> {
  const dataAtual = getDataAtual();

  // Formatar itens para a coluna "Item"
  const itens = data.laminas.map(l => l.modelo).filter(Boolean).join(', ') || '-';

  // Uma linha por pedido (não por lâmina)
  // Colunas: Data, Nome, Canal, Vendedor, Valor, Forma Pag., Status, Item, OBS, Cupom
  const row = [
    dataAtual, // Data
    valorOuTraco(data.nomeCompleto), // Nome
    valorOuTraco(data.canal), // Canal
    valorOuTraco(data.vendedor), // Vendedor
    data.valorTotal ? data.valorTotal.toFixed(2).replace('.', ',') : '-', // Valor (R$)
    valorOuTraco(data.formaPagamento), // Forma de Pag.
    data.status || 'Pendente', // Status
    itens, // Item
    valorOuTraco(data.observacao), // OBS
    valorOuTraco(data.cupom), // Cupom
  ];

  // Append na aba "Vendas Diário" - usar encodeURIComponent para o range
  const range = encodeURIComponent('Vendas Diário!A:J');
  const url = `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${range}:append?valueInputOption=USER_ENTERED&insertDataOption=INSERT_ROWS`;
  
  console.log('Exportando para Vendas:', { spreadsheetId, range: 'Vendas Diário!A:J' });
  
  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      values: [row],
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error('Erro ao exportar para Vendas:', errorText);
    throw new Error(`Falha ao exportar para planilha de Vendas: ${errorText}`);
  }

  console.log('Exportado para Vendas: 1 linha');
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const serviceAccountKey = Deno.env.get('GOOGLE_SERVICE_ACCOUNT_KEY');
    const producaoSpreadsheetId = Deno.env.get('GOOGLE_SHEETS_PRODUCAO_ID');
    const vendasSpreadsheetId = Deno.env.get('GOOGLE_SHEETS_VENDAS_ID');

    if (!serviceAccountKey) {
      throw new Error('GOOGLE_SERVICE_ACCOUNT_KEY não configurada');
    }

    if (!producaoSpreadsheetId) {
      throw new Error('GOOGLE_SHEETS_PRODUCAO_ID não configurada');
    }

    if (!vendasSpreadsheetId) {
      throw new Error('GOOGLE_SHEETS_VENDAS_ID não configurada');
    }

    const data: ExportData = await req.json();
    console.log('Exportando dados para Google Sheets:', { 
      nomeCliente: data.nomeCompleto, 
      laminas: data.laminas.length,
      valorTotal: data.valorTotal
    });

    // Get access token
    const accessToken = await getAccessToken(serviceAccountKey);

    // Gerar número do pedido
    const numeroPedido = data.numeroPedido || gerarNumeroPedido();

    // Pronta Entrega — só exporta para Vendas Diário
    if (data.prontaEntrega) {
      await exportarParaVendas(accessToken, vendasSpreadsheetId, data);
      console.log('Pronta entrega exportada para Vendas');
      return new Response(
        JSON.stringify({ success: true, message: 'Exportado para Vendas Diário' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Primeiro exportar para Produção (sequencial com validação)
    const resultadoProducao = await exportarParaProducao(accessToken, producaoSpreadsheetId, data);

    if (!resultadoProducao.success) {
      console.error('Erro na exportação para Produção:', resultadoProducao.erro);
      return new Response(
        JSON.stringify({
          error: resultadoProducao.erro,
          processadas: resultadoProducao.processadas,
          total: resultadoProducao.total
        }),
        {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }

    // Depois exportar para Vendas
    await exportarParaVendas(accessToken, vendasSpreadsheetId, data);

    // Exportar para PEDIDOS A LANÇAR (planilha nova)
    try {
      await exportarParaPedidosALancar(accessToken, data);
    } catch (error) {
      console.error('Erro ao exportar para PEDIDOS A LANÇAR (não bloqueia):', error);
    }

    console.log('Exportação concluída com sucesso');

    return new Response(
      JSON.stringify({
        success: true,
        message: `${resultadoProducao.processadas} lâmina(s) exportada(s) com sucesso para Produção e Vendas!`,
        numeroPedido,
        processadas: resultadoProducao.processadas,
        total: resultadoProducao.total
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Erro ao exportar para Google Sheets:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Erro desconhecido' }),
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
});
