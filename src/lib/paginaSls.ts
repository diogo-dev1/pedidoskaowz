// Conteúdo editável da página de vendas /sls. Padrões abaixo valem até o admin salvar algo.
export const SLUG_PAGINA_SLS = 'sls';

export interface VideoPagina { url: string; legenda?: string }
export interface PerguntaPagina { p: string; r: string }

export interface ConteudoSls {
  prazoSls: number;
  prazoSobEncomenda: number;
  heroTitulo: string;
  heroTexto: string;
  videos: VideoPagina[];
  videosTitulo: string;
  dorTitulo: string;
  dorParagrafos: string[];
  inclusosExtras: string[];
  paraQuemSim: string[];
  paraQuemNao: string[];
  customizarTitulo: string;
  customizarTexto: string;
  garantiaTitulo: string;
  garantiaTexto: string;
  perguntas: PerguntaPagina[];
  ps: string;
}

/** Marcadores aceitos nos textos: {prazo} {prazo_encomenda} {parcelamento} */
export const PADRAO_SLS: ConteudoSls = {
  prazoSls: 15,
  prazoSobEncomenda: 65,
  heroTitulo: 'A Push Dagger que fica pronta em',
  heroTexto: 'Lâmina em aço sueco usinada em CNC, empunhadura em Nylon 12 sinterizada a laser.',
  videos: [],
  videosTitulo: 'Veja na mão',
  dorTitulo: 'Uma lâmina feita à mão leva tempo.',
  dorParagrafos: [
    'Toda Kaowz sob encomenda passa por tratamento térmico, lixamento manual e montagem peça por peça. São {prazo_encomenda} dias úteis entre o pedido e a bancada de envio.',
    'Para quem precisa da lâmina agora, são três meses de espera.',
    'A série SLS foi criada para resolver exatamente isso.',
  ],
  inclusosExtras: [],
  paraQuemSim: ['Quer uma lâmina compacta para porte velado no dia a dia', 'Não quer esperar {prazo_encomenda} dias úteis por uma peça Kaowz', 'Valoriza aço Sandvik 14C28N com 60 HRC e acabamento Stone Washed'],
  paraQuemNao: ['Quer escolher aço, acabamento e cor da empunhadura', 'Procura uma faca de cozinha ou de campo'],
  customizarTitulo: 'Prefere uma Push Dagger com a sua cara?',
  customizarTexto: 'No configurador você escolhe tamanho, aço, acabamento, empunhadura e bainha, e vê o preço mudar na hora. Quando terminar, envia a montagem direto para o nosso WhatsApp.',
  garantiaTitulo: 'Garantia vitalícia',
  garantiaTexto: 'Garantia vitalícia de qualidade e manutenção de afiação, como em todas as lâminas Kaowz. Você compra uma vez.',
  perguntas: [
    { p: 'Como faço o pedido?', r: 'Toque no botão verde, escolha o tamanho e a mensagem já vai pronta para o nosso WhatsApp. A equipe confirma os dados de entrega e envia o link de pagamento.' },
    { p: 'Quando ela fica pronta?', r: 'Em até {prazo} dias úteis, contados a partir da confirmação do pedido. Depois vem o envio pelos Correios, com código de rastreio.' },
    { p: 'Quais as formas de pagamento?', r: 'PIX, cartão de crédito ({parcelamento}) ou Pix parcelado.' },
    { p: 'Qual tamanho eu escolho?', r: 'A Micro some no bolso, a Compact é o equilíbrio para o dia a dia e a Standard tem a maior pegada e lâmina. Compare as medidas na tabela acima ou pergunte no WhatsApp.' },
    { p: 'Os brindes valem para todos os tamanhos?', r: 'Sim, cada tamanho tem o seu pacote de brindes, mostrado na seção "Tudo o que você leva". Eles valem enquanto a campanha estiver no ar.' },
    { p: 'Posso mudar a cor ou o acabamento da SLS?', r: 'A SLS tem configuração fixa, é isso que permite o prazo curto. Para escolher cada detalhe, use o configurador.' },
  ],
  ps: 'Pela primeira vez na história da Kaowz uma Push Dagger sai da bancada em {prazo} dias úteis, com os brindes desta campanha. Quando a campanha sair do ar, os brindes saem junto.',
};

/** Junta o que foi salvo com os padrões; campos ausentes ou de tipo errado usam o padrão. */
export function mesclarConteudoSls(salvo: unknown): ConteudoSls {
  const s = (salvo && typeof salvo === 'object' ? salvo : {}) as Record<string, unknown>;
  const out = { ...PADRAO_SLS } as Record<string, unknown>;
  for (const [k, v] of Object.entries(PADRAO_SLS)) {
    const x = s[k];
    if (typeof v === 'number') { const n = Number(x); if (x != null && x !== '' && Number.isFinite(n) && n > 0) out[k] = Math.round(n); }
    else if (Array.isArray(v)) { if (Array.isArray(x)) out[k] = x; }
    else if (typeof x === 'string') out[k] = x;
  }
  return out as unknown as ConteudoSls;
}

export function preencher(texto: string, c: ConteudoSls, parcelamento?: string | null) {
  return texto
    .replace(/\{prazo\}/g, String(c.prazoSls))
    .replace(/\{prazo_encomenda\}/g, String(c.prazoSobEncomenda))
    .replace(/\s*\(\{parcelamento\}\)/g, parcelamento ? ` (${parcelamento})` : '')
    .replace(/\{parcelamento\}/g, parcelamento ?? '');
}
