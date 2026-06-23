const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const SPREADSHEET_ID = '1VjHLz1jQLk9r6W5YMt6g7dbAgeTS4-lVpGxZkJT0cDo';

async function getAccessToken(serviceAccountKey: string): Promise<string> {
  const credentials = JSON.parse(serviceAccountKey);
  const header = { alg: "RS256", typ: "JWT" };
  const now = Math.floor(Date.now() / 1000);
  const claim = {
    iss: credentials.client_email,
    scope: "https://www.googleapis.com/auth/spreadsheets.readonly",
    aud: "https://oauth2.googleapis.com/token",
    exp: now + 3600,
    iat: now,
  };

  const headerB64 = btoa(JSON.stringify(header)).replace(/=/g, '').replace(/\+/g, '-').replace(/\//g, '_');
  const claimB64 = btoa(JSON.stringify(claim)).replace(/=/g, '').replace(/\+/g, '-').replace(/\//g, '_');
  const signatureInput = `${headerB64}.${claimB64}`;

  const privateKeyPem = credentials.private_key
    .replace(/-----BEGIN PRIVATE KEY-----/, '')
    .replace(/-----END PRIVATE KEY-----/, '')
    .replace(/\s/g, '');
  const binaryKey = Uint8Array.from(atob(privateKeyPem), (c: string) => c.charCodeAt(0));

  const key = await crypto.subtle.importKey('pkcs8', binaryKey,
    { name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-256' }, false, ['sign']);
  const signature = await crypto.subtle.sign('RSASSA-PKCS1-v1_5', key,
    new TextEncoder().encode(signatureInput));
  const signatureB64 = btoa(String.fromCharCode(...new Uint8Array(signature)))
    .replace(/=/g, '').replace(/\+/g, '-').replace(/\//g, '_');

  const jwt = `${signatureInput}.${signatureB64}`;
  const tokenResponse = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({ grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer', assertion: jwt }),
  });
  const tokenData = await tokenResponse.json();
  return tokenData.access_token;
}

const APPS_SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbxnSBLsmbhkN-WRmMTKfSuw6wIxFtd5j8LZHxmsfjf9_T32Id4vR_DKeSMdOhckIHLPJQ/exec';

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    let body: any = {};
    try {
      const text = await req.text();
      if (text) body = JSON.parse(text);
    } catch (_) {}

    // POST com action = lancar → lê dados da linha, chama Apps Script, exporta para Vendas
    if (body.action === 'lancar' && body.row) {
      const serviceAccountKey = Deno.env.get('GOOGLE_SERVICE_ACCOUNT_KEY')!;
      const vendasSpreadsheetId = Deno.env.get('GOOGLE_SHEETS_VENDAS_ID');
      const accessToken = await getAccessToken(serviceAccountKey);

      // Ler dados da linha antes de lançar (o Apps Script deleta a linha)
      const rowRange = encodeURIComponent(`PEDIDOS A LANÇAR!B${body.row}:K${body.row}`);
      const rowUrl = `https://sheets.googleapis.com/v4/spreadsheets/${SPREADSHEET_ID}/values/${rowRange}`;
      const rowRes = await fetch(rowUrl, { headers: { 'Authorization': `Bearer ${accessToken}` } });
      let dadosLinha: string[] = [];
      if (rowRes.ok) {
        const rowData = await rowRes.json();
        dadosLinha = rowData.values?.[0] || [];
      }

      // Chamar Apps Script para lançar no Controle/Expedição
      const scriptRes = await fetch(APPS_SCRIPT_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'lancarLinha', row: body.row }),
        redirect: 'follow',
      });
      const scriptText = await scriptRes.text();
      let scriptData;
      try { scriptData = JSON.parse(scriptText); } catch (_) { scriptData = { raw: scriptText }; }

      if (scriptData.error) {
        return new Response(
          JSON.stringify({ sucesso: false, erro: scriptData.error }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // Exportar para Vendas Diário
      if (vendasSpreadsheetId && dadosLinha.length >= 2) {
        try {
          const hoje = new Date();
          const dataFormatada = `${String(hoje.getDate()).padStart(2, '0')}/${String(hoje.getMonth() + 1).padStart(2, '0')}/${hoje.getFullYear()}`;
          const vendaRow = [
            dataFormatada,          // Data
            dadosLinha[0] || '-',   // Nome
            body.canal || 'WhatsApp', // Canal
            body.vendedor || '-',   // Vendedor
            body.valor || '-',      // Valor
            body.formaPagamento || '-', // Forma Pag
            'pago',                 // Status
            dadosLinha[1] || '-',   // Item
            dadosLinha[8] || '-',   // Obs
            '-',                    // Cupom
          ];

          const vendaRange = encodeURIComponent('Vendas Diário!B:K');
          const vendaUrl = `https://sheets.googleapis.com/v4/spreadsheets/${vendasSpreadsheetId}/values/${vendaRange}:append?valueInputOption=USER_ENTERED&insertDataOption=INSERT_ROWS`;
          await fetch(vendaUrl, {
            method: 'POST',
            headers: { 'Authorization': `Bearer ${accessToken}`, 'Content-Type': 'application/json' },
            body: JSON.stringify({ values: [vendaRow] }),
          });
          console.log('Exportado para Vendas Diário:', dadosLinha[0]);
        } catch (e) {
          console.error('Erro ao exportar para Vendas (não bloqueia):', e);
        }
      }

      return new Response(
        JSON.stringify({ sucesso: true }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // GET ou POST sem action → lê a planilha
    const serviceAccountKey = Deno.env.get('GOOGLE_SERVICE_ACCOUNT_KEY');
    if (!serviceAccountKey) throw new Error('GOOGLE_SERVICE_ACCOUNT_KEY não configurada');

    const accessToken = await getAccessToken(serviceAccountKey);

    const range = encodeURIComponent('PEDIDOS A LANÇAR!A1:K');
    const url = `https://sheets.googleapis.com/v4/spreadsheets/${SPREADSHEET_ID}/values/${range}`;

    const response = await fetch(url, {
      headers: { 'Authorization': `Bearer ${accessToken}` },
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Erro ao ler planilha: ${errorText}`);
    }

    const data = await response.json();
    const rows = data.values || [];

    if (rows.length <= 1) {
      return new Response(
        JSON.stringify({ pedidos: [] }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const pedidos = rows.slice(1).map((row: string[], index: number) => ({
      row: index + 2,
      lancar: row[0] || false,
      nome: row[1] || '',
      item: row[2] || '',
      aco: row[3] || '',
      acabamento: row[4] || '',
      empunhadura: row[5] || '',
      bainha: row[6] || '',
      cor_bainha: row[7] || '',
      prazo: row[8] || '',
      observacoes: row[9] || '',
      personalizacao: row[10] || '',
    })).filter((p: any) => p.nome);

    return new Response(
      JSON.stringify({ pedidos }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Erro read-pedidos-lancar:', error);
    return new Response(
      JSON.stringify({ erro: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
