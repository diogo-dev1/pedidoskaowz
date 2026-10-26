// Conteúdo editável da página de vendas /sls. Padrões abaixo valem até o admin salvar algo.
export const SLUG_PAGINA_SLS = 'sls';

export interface VideoPagina { url: string; legenda?: string }
export interface PerguntaPagina { p: string; r: string }
export const BLOCOS_SLS = { hero: 'Topo', videos: 'Vídeos', dor: 'Uma nova linha de fabricação', mecanismo: 'Processo de fabricação', porte: 'Porte', oferta: 'Tudo o que você leva', ficha: 'Ficha técnica', paraQuem: 'Para quem é', customizar: 'Configurador', garantia: 'Garantia', perguntas: 'Perguntas frequentes', fechamento: 'Fechamento' } as const;
export type TipoBlocoSls = keyof typeof BLOCOS_SLS | 'livre';
export interface BlocoSls { id: string; tipo: TipoBlocoSls; titulo?: string; texto?: string; imagem?: string }
export type ImagemSls = 'hero' | 'porte' | 'ac etinada' | 'stoneWashed' | 'tactical';
export function normalizarBlocosSls(valor: unknown): BlocoSls[] {
  if (!Array.isArray(valor)) return Object.keys(BLOCOS_SLS).map(tipo => ({ id: tipo, tipo: tipo as TipoBlocoSls }));
  const ids = new Set<string>(); const tipos = new Set<string>();
  return valor.filter((b): b is BlocoSls => {
    if (!b || typeof b !== 'object' || typeof b.id !== 'string' || !b.id || ids.has(b.id) || !(b.tipo === 'livre' || Object.hasOwn(BLOCOS_SLS, b.tipo)) || (b.tipo !== 'livre' && tipos.has(b.tipo))) return false;
    ids.add(b.id); tipos.add(b.tipo); return true;
  }).map(b => ({ id: b.id, tipo: b.tipo, titulo: typeof b.titulo === 'string' ? b.titulo : '', texto: typeof b.texto === 'string' ? b.texto : '', imagem: urlImagemSls(b.imagem) ?? '' }));
}
function urlImagemSls(v: unknown): string | null {
  if (typeof v !== 'string' || !v.trim()) return null;
  try { return /^https?:$/.test(new URL(v).protocol) ? v.trim() : null; } catch { return null; }
}
export function imagemDaPagina(c: ConteudoSls, chave: ImagemSls, padrao: string | null): string | null {
  return Object.hasOwn(c.imagens, chave) ? c.imagens[chave] ?? null : padrao;
}

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
  blocos: BlocoSls[];
  imagens: Partial<Record<ImagemSls, string | null>>;
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
  blocos: normalizarBlocosSls(undefined),
  imagens: {},
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
  out.blocos = normalizarBlocosSls(s.blocos);
  out.imagens = {};
  if (s.imagens && typeof s.imagens === 'object') {
    for (const chave of ['hero', 'porte', 'ac etinada', 'stoneWashed', 'tactical'] as const) {
      if (Object.hasOwn(s.imagens, chave)) (out.imagens as ConteudoSls['imagens'])[chave] = urlImagemSls((s.imagens as Record<string, unknown>)[chave]);
    }
  }
  const legado = /pix parcelado|some no bolso|sem esperar|não quer esperar|três meses de espera|resolver exatamente isso|pronta até|feche hoje|\d{2}\/\d{2}\/\d{4}/i;
  for (const k of ['heroTitulo', 'heroTexto', 'dorTitulo', 'ps'] as const) {
    const texto = out[k] as string;
    if (legado.test(texto) || texto === 'Uma lâmina feita à mão leva tempo.' || texto === 'Lâmina em aço sueco usinada em CNC, empunhadura em Nylon 12 sinterizada a laser.' || texto.startsWith('Pela primeira vez na história da Kaowz')) out[k] = PADRAO_SLS[k];
  }
  if ((out.dorParagrafos as string[]).some(t => legado.test(t) || t.startsWith('Toda Kaowz sob encomenda passa'))) out.dorParagrafos = PADRAO_SLS.dorParagrafos;
  out.paraQuemSim = (out.paraQuemSim as string[]).map(t => legado.test(t) ? PADRAO_SLS.paraQuemSim[1] : t);
  out.perguntas = (out.perguntas as PerguntaPagina[]).map(q => {
    const padrao = PADRAO_SLS.perguntas.find(p => p.p === q.p);
    return padrao && (legado.test(q.r) || (q.p === 'Quando ela fica pronta?' && q.r.startsWith('Em até'))) ? { ...padrao } : q;
  });
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
