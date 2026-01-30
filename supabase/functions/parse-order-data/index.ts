import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { text } = await req.json();
    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');

    if (!LOVABLE_API_KEY) {
      throw new Error('LOVABLE_API_KEY is not configured');
    }

    const systemPrompt = `Você é um assistente especializado em extrair informações de pedidos de facas artesanais.
Analise o texto fornecido e extraia TODOS os dados disponíveis sobre o pedido.

REGRAS IMPORTANTES:
1. SEMPRE extraia qualquer nome de pessoa que aparecer no texto como "nomeCompleto"
2. Se o texto contiver apenas um nome (como "João Silva" ou "Maria"), ainda assim extraia como nomeCompleto
3. Extraia TODOS os dados que conseguir identificar, mesmo que parciais
4. Não invente dados que não estão no texto

DADOS DO CLIENTE:
- nomeCompleto: Nome da pessoa (OBRIGATÓRIO se houver qualquer nome no texto)
- cpf: Número do CPF
- email: Endereço de email
- celular: Número de telefone/celular
- cep: Código postal
- endereco: Rua/Avenida
- numero: Número do endereço
- bairro: Bairro
- cidade: Cidade
- estado: Estado (sigla ou nome completo)
- complemento: Complemento do endereço
- dataNascimento: Data de nascimento
- nomeCertificado: Nome para certificado (se diferente do nome completo)

DADOS DO PEDIDO:
- canal: Canal de venda (WhatsApp, Instagram, etc)
- status: Status do pedido
- origemCliente: Como o cliente chegou
- observacao: Observações gerais
- cupom: Cupom de desconto
- formaPagamento: Forma de pagamento

LÂMINAS (pode haver múltiplas):
- modelo: Nome/modelo da faca
- aco: Tipo de aço
- acabamento: Tipo de acabamento
- empunhadura: Material da empunhadura
- bainha: Tipo de bainha
- corBainha: Cor da bainha
- textoLaser: Texto para gravação a laser
- observacao: Observações específicas da lâmina

PRODUTOS ADICIONAIS:
- nome: Nome do produto
- quantidade: Quantidade

Extraia todas as informações disponíveis. Se houver apenas um nome de pessoa, extraia como nomeCompleto.`;

    const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${LOVABLE_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: text }
        ],
        tools: [{
          type: 'function',
          function: {
            name: 'extract_order_data',
            description: 'Extrai dados estruturados de um pedido',
            parameters: {
              type: 'object',
              properties: {
                cliente: {
                  type: 'object',
                  properties: {
                    nomeCompleto: { type: 'string' },
                    cpf: { type: 'string' },
                    email: { type: 'string' },
                    celular: { type: 'string' },
                    cep: { type: 'string' },
                    endereco: { type: 'string' },
                    numero: { type: 'string' },
                    bairro: { type: 'string' },
                    cidade: { type: 'string' },
                    estado: { type: 'string' },
                    complemento: { type: 'string' },
                    dataNascimento: { type: 'string' },
                    nomeCertificado: { type: 'string' }
                  }
                },
                pedido: {
                  type: 'object',
                  properties: {
                    canal: { type: 'string' },
                    status: { type: 'string' },
                    origemCliente: { type: 'string' },
                    observacao: { type: 'string' },
                    cupom: { type: 'string' },
                    formaPagamento: { type: 'string' }
                  }
                },
                laminas: {
                  type: 'array',
                  items: {
                    type: 'object',
                    properties: {
                      modelo: { type: 'string' },
                      aco: { type: 'string' },
                      acabamento: { type: 'string' },
                      empunhadura: { type: 'string' },
                      bainha: { type: 'string' },
                      corBainha: { type: 'string' },
                      textoLaser: { type: 'string' },
                      observacao: { type: 'string' }
                    }
                  }
                },
                produtosAdicionais: {
                  type: 'array',
                  items: {
                    type: 'object',
                    properties: {
                      nome: { type: 'string' },
                      quantidade: { type: 'number' }
                    }
                  }
                }
              }
            }
          }
        }],
        tool_choice: { type: 'function', function: { name: 'extract_order_data' } }
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(
          JSON.stringify({ error: 'Limite de requisições excedido. Tente novamente em instantes.' }),
          { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      if (response.status === 402) {
        return new Response(
          JSON.stringify({ error: 'Créditos insuficientes. Adicione créditos em Settings -> Workspace -> Usage.' }),
          { status: 402, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      const errorText = await response.text();
      console.error('AI gateway error:', response.status, errorText);
      return new Response(
        JSON.stringify({ error: 'Erro ao processar com IA' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const data = await response.json();
    console.log('AI Response:', JSON.stringify(data, null, 2));

    const toolCall = data.choices?.[0]?.message?.tool_calls?.[0];
    if (!toolCall) {
      return new Response(
        JSON.stringify({ error: 'Não foi possível extrair dados do texto fornecido' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const extractedData = JSON.parse(toolCall.function.arguments);

    return new Response(
      JSON.stringify({ success: true, data: extractedData }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Erro desconhecido' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
