import "jsr:@supabase/functions-js/edge-runtime.d.ts";

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
  laminas: Array<{
    modelo: string;
    aco: string;
    empunhadura: string;
    acabamento: string;
    bainha: string;
    laser: boolean;
    textoLaser: string;
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

Deno.serve(async (req) => {
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

    // Prepare row data
    const timestamp = new Date().toLocaleString('pt-BR');
    
    // Format laminas as string
    const laminasText = data.laminas.map((l, i) => 
      `Lâmina ${i + 1}: ${l.modelo} ${l.aco} ${l.acabamento} ${l.empunhadura} ${l.bainha}${l.laser ? ` (Laser: ${l.textoLaser})` : ''} - R$ ${l.subtotal.toFixed(2)}`
    ).join(' | ');

    // Format produtos adicionais as string
    const produtosText = data.produtosAdicionais.length > 0
      ? data.produtosAdicionais.map(p => `${p.nome} (${p.quantidade}x R$ ${p.precoUnitario.toFixed(2)}) = R$ ${p.total.toFixed(2)}`).join(' | ')
      : 'Nenhum';

    const rowData = [
      timestamp,
      data.vendedor,
      data.nomeCompleto,
      data.cpf,
      data.email,
      data.celular,
      data.dataNascimento,
      data.cep,
      data.endereco,
      data.numero,
      data.bairro,
      data.cidade,
      data.estado,
      data.complemento,
      data.nomeCertificado,
      laminasText,
      produtosText,
      `R$ ${data.valorTotal.toFixed(2)}`,
      data.formaPagamento,
    ];

    // Append to sheet
    const appendResponse = await fetch(
      `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/A:A:append?valueInputOption=RAW`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          values: [rowData],
        }),
      }
    );

    if (!appendResponse.ok) {
      const errorText = await appendResponse.text();
      console.error('Google Sheets API error:', errorText);
      throw new Error(`Failed to append to sheet: ${errorText}`);
    }

    const result = await appendResponse.json();
    console.log('Successfully exported to Google Sheets:', result);

    return new Response(
      JSON.stringify({ success: true, message: 'Dados exportados com sucesso!' }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error exporting to Google Sheets:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
});
