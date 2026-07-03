import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

const SPREADSHEET_ID = '1gSgwf7vOAHAk7fzA87_9Bo-darg1dSYyAf9lNk2p8pg';
const SHEET_NAME = 'Vendas';

interface SaleData {
  date: string;
  name: string;
  channel: string;
  seller: string;
  value: number;
  paymentMethod: string;
  status: string;
  item: string;
  observation?: string;
  coupon?: string;
}

async function getAccessToken(serviceAccount: { client_email: string; private_key: string }): Promise<string> {
  const header = {
    alg: 'RS256',
    typ: 'JWT',
  };

  const now = Math.floor(Date.now() / 1000);
  const claim = {
    iss: serviceAccount.client_email,
    scope: 'https://www.googleapis.com/auth/spreadsheets',
    aud: 'https://oauth2.googleapis.com/token',
    exp: now + 3600,
    iat: now,
  };

  // Base64URL encode
  const base64UrlEncode = (obj: object): string => {
    const json = JSON.stringify(obj);
    const base64 = btoa(json);
    return base64.replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
  };

  const headerEncoded = base64UrlEncode(header);
  const claimEncoded = base64UrlEncode(claim);
  const signatureInput = `${headerEncoded}.${claimEncoded}`;

  // Import the private key and sign
  const pemContents = serviceAccount.private_key
    .replace(/-----BEGIN PRIVATE KEY-----/, '')
    .replace(/-----END PRIVATE KEY-----/, '')
    .replace(/\n/g, '');

  const binaryKey = Uint8Array.from(atob(pemContents), c => c.charCodeAt(0));

  const cryptoKey = await crypto.subtle.importKey(
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
    cryptoKey,
    new TextEncoder().encode(signatureInput)
  );

  const signatureEncoded = btoa(String.fromCharCode(...new Uint8Array(signature)))
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');

  const jwt = `${signatureInput}.${signatureEncoded}`;

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

  if (!tokenResponse.ok) {
    const errorText = await tokenResponse.text();
    throw new Error(`Failed to get access token: ${errorText}`);
  }

  const tokenData = await tokenResponse.json();
  return tokenData.access_token;
}

async function appendToSheet(accessToken: string, values: string[][]): Promise<void> {
  const url = `https://sheets.googleapis.com/v4/spreadsheets/${SPREADSHEET_ID}/values/${SHEET_NAME}!A:L:append?valueInputOption=USER_ENTERED&insertDataOption=INSERT_ROWS`;

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      values: values,
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Failed to append to sheet: ${errorText}`);
  }
}

function formatDateBR(dateStr: string): string {
  const date = new Date(dateStr);
  const day = String(date.getDate()).padStart(2, '0');
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const year = date.getFullYear();
  return `${day}/${month}/${year}`;
}

function formatValueBR(value: number): string {
  return value.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Este projeto usa GOOGLE_SERVICE_ACCOUNT_KEY (mesmo secret do export-to-sheets);
    // GOOGLE_SERVICE_ACCOUNT_JSON fica como fallback para compatibilidade.
    const serviceAccountJson = Deno.env.get('GOOGLE_SERVICE_ACCOUNT_KEY') ?? Deno.env.get('GOOGLE_SERVICE_ACCOUNT_JSON');
    if (!serviceAccountJson) {
      throw new Error('GOOGLE_SERVICE_ACCOUNT_KEY not configured');
    }

    const serviceAccount = JSON.parse(serviceAccountJson);
    const saleData: SaleData = await req.json();

    console.log('Adding sale:', saleData);

    // Validate required fields
    if (!saleData.date || !saleData.name || !saleData.channel || !saleData.seller ||
        saleData.value === undefined || !saleData.paymentMethod || !saleData.item) {
      throw new Error('Missing required fields');
    }

    // Get access token
    const accessToken = await getAccessToken(serviceAccount);

    // Format values for the spreadsheet
    // Column order: Data, Nome, Tipo (empty), Canal, Vendedor, Valor, Forma Pagamento, Status, ID (empty), Item, Observação, Cupom
    const rowValues = [
      formatDateBR(saleData.date),
      saleData.name,
      '', // Tipo column (empty for now)
      saleData.channel,
      saleData.seller,
      formatValueBR(saleData.value),
      saleData.paymentMethod,
      saleData.status || 'Confirmado',
      '', // ID column (empty)
      saleData.item,
      saleData.observation || '',
      saleData.coupon || '',
    ];

    // Append to sheet
    await appendToSheet(accessToken, [rowValues]);

    console.log('Sale added successfully');

    return new Response(
      JSON.stringify({ success: true, message: 'Venda adicionada com sucesso' }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error adding sale:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ success: false, error: errorMessage }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
});
