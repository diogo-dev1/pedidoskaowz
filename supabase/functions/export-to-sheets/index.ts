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
  localGravacao: string[];
  embalagem: string;
  embalagemGravacao: boolean;
  embalagemTextoGravacao: string;
}

interface ExportData {
  nomeCliente: string;
  prazo?: string;
  observacoes?: string;
  laminas: LaminaData[];
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
    console.log('Exporting data to Google Sheets:', { nomeCliente: data.nomeCliente, laminas: data.laminas.length });

    // Get access token
    const accessToken = await getAccessToken(serviceAccountKey);

    // Prepare rows for each blade
    // Columns: Nome | Item | Aço | Acabamento | Empunhadura | Bainha | Cor bainha | Prazo | Observações | Personalização
    const rows = data.laminas.map((lamina) => {
      // Build personalization text
      let personalizacao = '';
      if (lamina.laser && lamina.textoLaser) {
        personalizacao = lamina.textoLaser;
        if (lamina.localGravacao && lamina.localGravacao.length > 0) {
          personalizacao += ` (${lamina.localGravacao.join(', ')})`;
        }
      }
      if (lamina.embalagemGravacao && lamina.embalagemTextoGravacao) {
        if (personalizacao) personalizacao += ' | ';
        personalizacao += `Embalagem: ${lamina.embalagemTextoGravacao}`;
      }

      return [
        data.nomeCliente || '',
        lamina.modelo || '',
        lamina.aco || '',
        lamina.acabamento || '',
        lamina.empunhadura || '',
        lamina.bainha || '',
        lamina.corBainha || '',
        data.prazo || '',
        data.observacoes || '',
        personalizacao || '',
      ];
    });

    if (rows.length > 0) {
      // Append to first sheet (default)
      const response = await fetch(
        `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/A:J:append?valueInputOption=RAW`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${accessToken}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            values: rows,
          }),
        }
      );

      if (!response.ok) {
        const errorText = await response.text();
        console.error('Google Sheets API error:', errorText);
        throw new Error(`Failed to append to sheet: ${errorText}`);
      }
    }

    console.log('Successfully exported to Google Sheets: ' + rows.length + ' rows');

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
