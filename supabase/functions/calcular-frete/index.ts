// Edge function proxy para a API dos Correios (CalcPrecoPrazo)
// Necessária pois a API não permite CORS direto do navegador.

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface ServicoResultado {
  codigo: string;
  nome: string;
  valor: string;
  prazoEntrega: string;
  msgErro: string;
  erro: string;
}

function extractTag(xml: string, tag: string): string {
  const re = new RegExp(`<${tag}>([\\s\\S]*?)<\\/${tag}>`, 'i');
  const m = xml.match(re);
  if (!m) return '';
  return m[1].replace(/<!\[CDATA\[/g, '').replace(/\]\]>/g, '').trim();
}

function parseServicos(xml: string): ServicoResultado[] {
  const blocks = xml.match(/<cServico>[\s\S]*?<\/cServico>/g) || [];
  return blocks.map((block) => ({
    codigo: extractTag(block, 'Codigo'),
    nome: '',
    valor: extractTag(block, 'Valor'),
    prazoEntrega: extractTag(block, 'PrazoEntrega'),
    msgErro: extractTag(block, 'MsgErro'),
    erro: extractTag(block, 'Erro'),
  }));
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const body = await req.json();
    const {
      cepOrigem,
      cepDestino,
      peso,
      comprimento,
      altura,
      largura,
      formato, // 1 = Caixa/Pacote, 2 = Rolo/Prisma, 3 = Envelope
      valorDeclarado = '0',
      avisoRecebimento = 'N',
    } = body;

    const params = new URLSearchParams({
      nCdEmpresa: '',
      sDsSenha: '',
      nCdServico: '04014,04510', // SEDEX, PAC
      sCepOrigem: String(cepOrigem || '').replace(/\D/g, ''),
      sCepDestino: String(cepDestino || '').replace(/\D/g, ''),
      nVlPeso: String(peso),
      nCdFormato: String(formato),
      nVlComprimento: String(comprimento),
      nVlAltura: String(altura),
      nVlLargura: String(largura),
      nVlDiametro: '0',
      sCdMaoPropria: 'N',
      nVlValorDeclarado: String(valorDeclarado || '0').replace(',', '.'),
      sCdAvisoRecebimento: avisoRecebimento === 'S' ? 'S' : 'N',
      StrRetorno: 'xml',
      nIndicaCalculo: '3',
    });

    const url = `https://ws.correios.com.br/calculador/CalcPrecoPrazo.asmx/CalcPrecoPrazo?${params.toString()}`;

    const resp = await fetch(url, {
      method: 'GET',
      headers: { 'Accept': 'application/xml, text/xml, */*' },
    });

    const xml = await resp.text();

    if (!resp.ok) {
      return new Response(
        JSON.stringify({ error: `Correios respondeu ${resp.status}`, raw: xml.slice(0, 500) }),
        { status: 502, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      );
    }

    const servicos = parseServicos(xml);
    const nomeMap: Record<string, string> = { '04014': 'SEDEX', '04510': 'PAC' };
    const enriched = servicos.map((s) => ({ ...s, nome: nomeMap[s.codigo] || s.codigo }));

    return new Response(JSON.stringify({ servicos: enriched }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return new Response(JSON.stringify({ error: msg }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
