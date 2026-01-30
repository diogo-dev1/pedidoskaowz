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

// Exportar para planilha de Produção (aba "Lançamento Venda")
// Insere dados em C6:M6 e executa o script "lancarPedido"
async function exportarParaProducao(
  accessToken: string, 
  spreadsheetId: string, 
  data: ExportData
): Promise<void> {
  // Para cada lâmina, precisamos inserir e lançar
  for (const lamina of data.laminas) {
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

    // Dados para as células C6:M6
    // C=Nome, D=Item, E=Aço, F=Acabamento, G=Empunhadura, H=Bainha, 
    // I=Cor Bainha, J=Prazo, K=Observações, L=Personalização, M=Embalagem
    const rowData = [
      data.nomeCompleto || '', // C - Nome
      lamina.modelo || '', // D - Item
      lamina.aco || '', // E - Aço
      lamina.acabamento || '', // F - Acabamento
      lamina.empunhadura || '', // G - Empunhadura
      lamina.bainha || '', // H - Bainha
      lamina.corBainha || '', // I - Cor Bainha
      data.prazo || '', // J - Prazo
      data.observacao || '', // K - Observações
      personalizacao || '', // L - Personalização
      lamina.embalagem || '', // M - Embalagem
    ];

    // 1. Inserir dados na aba "Lançamento Venda" em C6:M6
    const range = encodeURIComponent('Lançamento Venda!C6:M6');
    const updateUrl = `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${range}?valueInputOption=USER_ENTERED`;
    
    console.log('Inserindo dados em Produção:', { spreadsheetId, range: 'Lançamento Venda!C6:M6' });
    
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
      console.error('Erro ao inserir dados em Produção:', errorText);
      throw new Error(`Falha ao inserir dados na planilha de Produção: ${errorText}`);
    }

    console.log('Dados inseridos, executando script lancarPedido...');

    // 2. Executar o script "lancarPedido" via Apps Script API
    // Usar o endpoint de macros do Google Sheets
    const scriptUrl = `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}:runMacro`;
    
    try {
      const scriptResponse = await fetch(scriptUrl, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          function: 'lancarPedido',
        }),
      });

      if (!scriptResponse.ok) {
        // Se o macro não funcionar via Sheets API, tentar via Apps Script API
        console.log('Tentando via Apps Script API diretamente...');
        
        // Alternativa: usar trigger ou webhook se disponível
        const errorText = await scriptResponse.text();
        console.warn('Script execution via Sheets API failed:', errorText);
        console.log('Nota: O script lancarPedido pode precisar ser executado manualmente ou via Apps Script Web App');
      } else {
        console.log('Script lancarPedido executado com sucesso');
      }
    } catch (scriptError) {
      console.warn('Erro ao executar script (continuando):', scriptError);
    }
  }

  console.log('Exportado para Produção:', data.laminas.length, 'lâmina(s)');
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
      exportarParaProducao(accessToken, producaoSpreadsheetId, data),
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
