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
  heroTexto: 'Lâmina em aço sueco usinada em CNC e empunhadura em Nylon 12 sinterizada a laser. Uma nova linha de fabricação Kaowz.',
  videos: [],
  videosTitulo: 'Veja na mão',
  dorTitulo: 'Uma nova linha de fabricação',
  dorParagrafos: [
    'Toda lâmina Kaowz sob encomenda é feita à mão, peça por peça, em até {prazo_encomenda} dias úteis — e continua assim. A SLS é uma linha nova: usinagem CNC e manufatura aditiva permitem produzi-la em até {prazo} dias úteis, sem abrir mão da qualidade.',
    'Não simplificamos o produto. Evoluímos o processo.',
  ],
  inclusosExtras: [],
  paraQuemSim: ['Quer uma lâmina compacta para porte velado no dia a dia', 'Quer uma Push Dagger Kaowz com produção em até {prazo} dias úteis', 'Valoriza aço Sandvik 14C28N com 60 HRC e acabamento Stone Washed'],
  paraQuemNao: ['Quer escolher aço, acabamento e cor da empunhadura', 'Procura uma faca de cozinha ou de campo'],
  customizarTitulo: 'Prefere uma Push Dagger com a sua cara?',
  customizarTexto: 'No configurador você escolhe tamanho, aço, acabamento, empunhadura e bainha, e vê o preço mudar na hora. Quando terminar, envia a montagem direto para o nosso WhatsApp.',
  garantiaTitulo: 'Garantia vitalícia',
  garantiaTexto: 'Garantia vitalícia de qualidade e manutenção de afiação, como em todas as lâminas Kaowz. Você compra uma vez.',
  perguntas: [
    { p: 'Como faço o pedido?', r: 'Toque no botão verde, escolha o tamanho e a mensagem já vai pronta para o nosso WhatsApp. A equipe confirma os dados de entrega e envia o link de pagamento.' },
    { p: 'Quando ela fica pronta?', r: 'A produção leva até {prazo} dias úteis a partir da confirmação do pedido. Depois vem o envio, com código de rastreio.' },
    { p: 'Quais as formas de pagamento?', r: 'PIX ou cartão de crédito em até 10x sem juros.' },
    { p: 'Qual tamanho eu escolho?', r: 'A Micro é a mais compacta, discreta no porte do dia a dia. A Compact é o equilíbrio entre tamanho e pegada. A Standard tem a maior lâmina e a empunhadura mais firme da linha.' },
    { p: 'Os brindes valem para todos os tamanhos?', r: 'Sim, cada tamanho tem o seu pacote de brindes, mostrado na seção "Tudo o que você leva". Eles valem enquanto a campanha estiver no ar.' },
    { p: 'Posso mudar a cor ou o acabamento da SLS?', r: 'A SLS tem configuração fixa, é isso que permite o prazo curto. Para escolher cada detalhe, use o configurador.' },
  ],
  ps: 'Pela primeira vez na Kaowz, uma Push Dagger com produção em até {prazo} dias úteis — e com os brindes desta campanha, válidos enquanto ela estiver no ar.',
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
  // Retire legacy campaign promises even when an older editor configuration was saved.
  out.prazoSls = 15;
  out.prazoSobEncomenda = 65;
  for (const k of ['heroTitulo', 'heroTexto', 'dorTitulo', 'dorParagrafos', 'paraQuemSim', 'perguntas', 'ps'] as const) out[k] = PADRAO_SLS[k];
  return out as unknown as ConteudoSls;
}

export const PAGAMENTO_SLS = { pix: true, cartao: true, pixParcelado: false, maxParcelasSemJuros: 10 } as const;
export function pilaresSls<T extends { titulo: string }>(pilares: T[]): T[] {
  return pilares.filter(p => !/tratamento termico/.test(p.titulo.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase()));
}

export function preencher(texto: string, c: ConteudoSls, parcelamento?: string | null) {
  return texto
    .replace(/\{prazo\}/g, String(c.prazoSls))
    .replace(/\{prazo_encomenda\}/g, String(c.prazoSobEncomenda))
    .replace(/\s*\(\{parcelamento\}\)/g, parcelamento ? ` (${parcelamento})` : '')
    .replace(/\{parcelamento\}/g, parcelamento ?? '');
}
