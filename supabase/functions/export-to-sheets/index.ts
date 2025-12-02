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

interface ExportData {
  nomeCompleto: string;
  cpf: string;
  email: string;
  celular: string;
  cep: string;
  endereco: string;
  numero: string;
  bairro: string;
  cidade: string;
  estado: string;
  complemento: string;
  dataNascimento: string;
  nomeCertificado: string;
  formaPagamento: string;
  canal: string;
  status: string;
  origemCliente: string;
  observacao: string;
  cupom: string;
  laminas: Array<{
    modelo: string;
    aco: string;
    empunhadura: string;
    acabamento: string;
    bainha: string;
    corBainha: string;
    laser: boolean;
    textoLaser: string;
    observacaoLamina: string;
    subtotal: number;
  }>;
  produtosAdicionais: Array<{
    nome: string;
    quantidade: number;
    precoUnitario: number;
    total: number;
  }>;
  valorTotal: number;
  vendedor: string;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const serviceAccountKey = Deno.env.get('GOOGLE_SERVICE_ACCOUNT_KEY');
    const spreadsheetId = Deno.env.get('GOOGLE_SHEETS_SPREADSHEET_ID');

    if (!serviceAccountKey || !spreadsheetId) {
      throw new Error('Missing Google Sheets credentials');
    }

    const data: ExportData = await req.json();
    console.log('Exporting data to Google Sheets:', { nomeCompleto: data.nomeCompleto, spreadsheetId });

    // Get access token
    const accessToken = await getAccessToken(serviceAccountKey);

    // Prepare timestamp
    const timestamp = new Date().toLocaleString('pt-BR');
    
    // Prepare item description for sales report
    const itemDescricao = data.laminas.length > 0
      ? `${data.laminas.length} Lâmina(s) Kaowz`
      : 'Produtos diversos';

    // ROW 1: Sales Report (Relatório de Vendas)
    // Data | Nome | Canal | Vendedor | Valor (R$) | Forma de Pag. | Status | Origem Cliente | Item | OBS | Cupom
    const salesRowData = [
      timestamp,
      data.nomeCompleto,
      data.canal || '',
      data.vendedor,
      data.valorTotal.toFixed(2),
      data.formaPagamento,
      data.status || 'Pendente',
      data.origemCliente || '',
      itemDescricao,
      data.observacao || '',
      data.cupom || '',
    ];

    // Append to Vendas sheet
    const salesResponse = await fetch(
      `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/Vendas!A:A:append?valueInputOption=RAW`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          values: [salesRowData],
        }),
      }
    );

    if (!salesResponse.ok) {
      const errorText = await salesResponse.text();
      console.error('Google Sheets API error (Vendas):', errorText);
      throw new Error(`Failed to append to Vendas sheet: ${errorText}`);
    }

    // ROWS 2+: Blade Details (One row per blade)
    // Modelo | Aço | Acabamento | Empunhadura | Bainha | Cor da Bainha | Observação | Personalização
    const bladeRows = data.laminas.map((lamina) => [
      timestamp,
      data.nomeCompleto,
      data.vendedor,
      lamina.modelo,
      lamina.aco,
      lamina.acabamento,
      lamina.empunhadura,
      lamina.bainha,
      lamina.corBainha || '',
      lamina.observacaoLamina || '',
      lamina.laser ? lamina.textoLaser : 'Não',
      lamina.subtotal.toFixed(2),
    ]);

    if (bladeRows.length > 0) {
      const bladesResponse = await fetch(
        `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/Lâminas!A:A:append?valueInputOption=RAW`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${accessToken}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            values: bladeRows,
          }),
        }
      );

      if (!bladesResponse.ok) {
        const errorText = await bladesResponse.text();
        console.error('Google Sheets API error (Lâminas):', errorText);
        throw new Error(`Failed to append to Lâminas sheet: ${errorText}`);
      }
    }

    console.log('Successfully exported to Google Sheets: 1 sales row + ' + bladeRows.length + ' blade rows');

    return new Response(
      JSON.stringify({ success: true, message: 'Dados exportados com sucesso!' }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error exporting to Google Sheets:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Erro desconhecido' }),
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
});
