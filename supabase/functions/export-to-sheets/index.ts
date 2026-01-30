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

// Exportar para planilha de Produção (aba "Controle")
async function exportarParaProducao(
  accessToken: string, 
  spreadsheetId: string, 
  data: ExportData,
  numeroPedido: string
): Promise<void> {
  const dataEntrada = getDataAtual();

  // Preparar linhas para cada lâmina
  // Colunas: B=Data, C=Nº Pedido, D=Nome, E=Item, F=Aço, G=Acabamento, H=Empunhadura, 
  //          I=Bainha, J=Cor Bainha, K=Prazo, O=Observações, P=Personalização, T=Caixa
  const rows = data.laminas.map((lamina) => {
    // Construir texto de personalização
    let personalizacao = '';
    if (lamina.laser && lamina.textoLaser) {
      personalizacao = lamina.textoLaser;
      if (lamina.localGravacao) {
        personalizacao += ` (${lamina.localGravacao})`;
      }
    }
    if (lamina.embalagemGravacao && lamina.embalagemTextoGravacao) {
      if (personalizacao) personalizacao += ' | ';
      personalizacao += `Embalagem: ${lamina.embalagemTextoGravacao}`;
    }

    // Array com 20 elementos (colunas A até T)
    // A=0 (vazio - sequência automática), B=1(Data), C=2 (vazio - sequência automática), 
    // D=3(Nome), E=4(Item), F=5(Aço), G=6(Acabamento), H=7(Empunhadura), I=8(Bainha), 
    // J=9(Cor Bainha), K=10(Prazo), L=11, M=12, N=13, O=14(Obs), P=15(Personalização), 
    // Q=16, R=17, S=18, T=19(Caixa)
    return [
      '', // A - vazio (sequência automática da planilha)
      dataEntrada, // B - Data de Entrada
      '', // C - vazio (Nº Pedido preenchido automaticamente pela planilha)
      data.nomeCompleto || '', // D - Nome
      lamina.modelo || '', // E - Item
      lamina.aco || '', // F - Aço
      lamina.acabamento || '', // G - Acabamento
      lamina.empunhadura || '', // H - Empunhadura
      lamina.bainha || '', // I - Bainha
      lamina.corBainha || '', // J - Cor Bainha
      data.prazo || '', // K - Prazo
      '', // L
      '', // M
      '', // N
      data.observacao || '', // O - Observações do Pedido
      personalizacao || '', // P - Personalização
      '', // Q
      '', // R
      '', // S
      lamina.embalagem || '', // T - Caixa (embalagem)
    ];
  });

  if (rows.length > 0) {
    // Append na aba "Controle" - usar encodeURIComponent para o range
    const range = encodeURIComponent('Controle!A:T');
    const url = `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${range}:append?valueInputOption=USER_ENTERED&insertDataOption=INSERT_ROWS`;
    
    console.log('Exportando para Produção:', { spreadsheetId, range: 'Controle!A:T', rowCount: rows.length });
    
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        values: rows,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Erro ao exportar para Produção:', errorText);
      throw new Error(`Falha ao exportar para planilha de Produção: ${errorText}`);
    }
  }

  console.log('Exportado para Produção:', rows.length, 'linhas');
}

// Exportar para planilha de Relatório de Vendas (aba "Vendas Diário")
async function exportarParaVendas(
  accessToken: string, 
  spreadsheetId: string, 
  data: ExportData
): Promise<void> {
  const dataAtual = getDataAtual();

  // Formatar itens para a coluna "Item"
  const itens = data.laminas.map(l => l.modelo).filter(Boolean).join(', ');

  // Uma linha por pedido (não por lâmina)
  // Colunas: Data, Nome, Canal, Vendedor, Valor, Forma Pag., Status, Item, OBS, Cupom
  const row = [
    dataAtual, // Data
    data.nomeCompleto || '', // Nome
    data.canal || '', // Canal
    data.vendedor || '', // Vendedor
    data.valorTotal ? data.valorTotal.toFixed(2).replace('.', ',') : '', // Valor (R$)
    data.formaPagamento || '', // Forma de Pag.
    data.status || 'Pendente', // Status
    itens, // Item
    data.observacao || '', // OBS
    data.cupom || '', // Cupom
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

    // Exportar para ambas as planilhas
    await Promise.all([
      exportarParaProducao(accessToken, producaoSpreadsheetId, data, numeroPedido),
      exportarParaVendas(accessToken, vendasSpreadsheetId, data),
    ]);

    console.log('Exportação concluída com sucesso');

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: 'Dados exportados com sucesso para Produção e Vendas!',
        numeroPedido 
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
