/* ════════════════════════════════════════════════════════════════
   Motor de recomendação — Quiz de descoberta Kaowz (área pública).

   Módulo puro (sem React). Usado pelo quiz, pela vitrine filtrada e
   pelo painel interno. Nunca retorna vazio: na falta de casamento
   forte, cai para os melhores parciais.
   ════════════════════════════════════════════════════════════════ */

/* ─────────── Vocabulário de atributos (valores gravados no banco) ─────────── */

export const CASOS_USO = [
  { valor: 'campo', label: 'Campo' },
  { valor: 'caca', label: 'Caça' },
  { valor: 'pesca', label: 'Pesca' },
  { valor: 'edc_urbano', label: 'EDC urbano' },
  { valor: 'defesa', label: 'Defesa' },
  { valor: 'tatico', label: 'Tático / operacional' },
  { valor: 'churrasco', label: 'Churrasco' },
  { valor: 'colecao', label: 'Coleção' },
] as const;

export const TIPOS_PORTE = [
  { valor: 'velado', label: 'Velado' },
  { valor: 'ostensivo_cintura', label: 'Ostensivo na cintura' },
  { valor: 'mochila_colete', label: 'Mochila / colete' },
  { valor: 'nao_se_aplica', label: 'Não se aplica' },
] as const;

export const NIVEIS_ENVOLVIMENTO = [
  { valor: 'iniciante', label: 'Iniciante' },
  { valor: 'usuario', label: 'Usuário' },
  { valor: 'experiente', label: 'Experiente' },
  { valor: 'colecionador', label: 'Colecionador' },
] as const;

export const POSICOES_ESCADA = [
  { valor: 'entrada', label: 'Entrada' },
  { valor: 'ideal', label: 'Ideal' },
  { valor: 'definitiva', label: 'Definitiva' },
] as const;

export const MANUTENCOES = [
  { valor: 'corte_extremo', label: 'Corte extremo (pede óleo e cuidado)' },
  { valor: 'resistente', label: 'Resistente (esquece e não enferruja)' },
] as const;

/** Lista fixa de famílias da escada de valor (C8 — select, sem texto livre). */
export const GRUPOS_ESCADA = [
  'Nimbowie', 'Nimbus', 'Jagunço', 'Adaga', 'Defcon', 'Camp Knife', 'Ring',
  'Tantô', 'Wharncliffe', 'EDC Mini', 'EDC', 'Canivete', 'Butcher',
  'Chef Royal', 'Picanheira', 'Kiritsuke',
] as const;

export type CasoUso = (typeof CASOS_USO)[number]['valor'];
export type TipoPorte = (typeof TIPOS_PORTE)[number]['valor'];
export type Nivel = (typeof NIVEIS_ENVOLVIMENTO)[number]['valor'];
export type PosicaoEscada = (typeof POSICOES_ESCADA)[number]['valor'];
export type Manutencao = (typeof MANUTENCOES)[number]['valor'];


export const labelDe = (
  lista: readonly { valor: string; label: string }[],
  valor: string | null | undefined,
) => lista.find((x) => x.valor === valor)?.label ?? valor ?? '';

/** F4 — etiqueta curta da função que a peça ocupa dentro do conjunto. */
export const ETIQUETA_FUNCAO: Record<CasoUso, string> = {
  campo: 'Campo',
  caca: 'Caça',
  pesca: 'Pesca',
  edc_urbano: 'Dia a dia',
  defesa: 'Defesa',
  tatico: 'Operacional',
  churrasco: 'Churrasco',
  colecao: 'Coleção',
};

/* ─────────── Modelo (subconjunto de catalogo_modelos) ─────────── */

export interface ModeloRecomendavel {
  id: string;
  nome_modelo: string;
  preco_base: number;
  imagem_modelo: string | null;
  descricao_html?: string | null;
  apresentacao_venda?: string | null;
  categoria?: string | null;
  casos_uso: string[];
  tipo_porte: string[];
  nivel_envolvimento: string[];
  posicao_escada: string | null;
  grupo_escada: string | null;
  forma_enxoval: string[];
  /** C7 — manutenção é multivalorada: uma lâmina pode atender os dois perfis. */
  manutencao: string[];
  porque_texto: string | null;
  /* Campos do catálogo (mesma fonte das lâminas do catálogo público) */
  video_url?: string | null;
  pronta_entrega?: boolean;
  categorias?: string[];
  /** Quantidade de mídias cadastradas (usada em desempates). */
  midias_count?: number;

}

/* ─────────── Respostas do quiz ─────────── */

export interface RespostasQuiz {
  quem: string[];          // múltipla
  onde: string[];          // múltipla
  porte: string[];         // múltipla (B1)
  funcao: string[];        // múltipla (B2)
  envolvimento: string | null; // única
  /** C2/C4 — bifurcação "é presente". */
  presente: boolean;
}

export const respostasVazias = (): RespostasQuiz => ({
  quem: [], onde: [], porte: [], funcao: [], envolvimento: null, presente: false,
});

/** B7 — respostas antigas (string / null) viram array sem quebrar. */
export function normalizarRespostas(bruto: any): RespostasQuiz {
  const arr = (v: any): string[] =>
    Array.isArray(v) ? v.filter((x) => typeof x === 'string') : typeof v === 'string' && v ? [v] : [];
  return {
    quem: arr(bruto?.quem),
    onde: arr(bruto?.onde),
    porte: arr(bruto?.porte),
    funcao: arr(bruto?.funcao),
    envolvimento: typeof bruto?.envolvimento === 'string' ? bruto.envolvimento : null,
    presente: bruto?.presente === true || (Array.isArray(bruto?.quem) && bruto.quem.includes('presente')),
  };
}

/* ─────────── Perguntas (linguagem do cliente, sem termo técnico) ─────────── */

export interface OpcaoQuiz { valor: string; titulo: string; descricao: string }
export interface PerguntaQuiz {
  id: keyof RespostasQuiz;
  titulo: string;
  ajuda?: string;
  multipla: boolean;
  opcoes: OpcaoQuiz[];
}

const AJUDA_MULTIPLA = 'Pode marcar mais de uma.';

export const PERGUNTAS: PerguntaQuiz[] = [
  {
    id: 'quem',
    titulo: 'Quem é você?',
    ajuda: AJUDA_MULTIPLA,
    multipla: true,
    opcoes: [
      { valor: 'civil', titulo: 'Civil', descricao: 'Uso pessoal, no dia a dia' },
      { valor: 'seguranca_publica', titulo: 'Segurança pública', descricao: 'Serviço, escala, plantão' },
      { valor: 'militar', titulo: 'Militar', descricao: 'Operacional, instrução, campo' },
      { valor: 'cacador_pescador', titulo: 'Caçador ou pescador', descricao: 'Mato, água, preparo de animal' },
      { valor: 'colecionador', titulo: 'Colecionador', descricao: 'Valorizo a peça em si' },
    ],
  },
  {
    id: 'onde',
    titulo: 'Onde ela vai andar com você?',
    ajuda: AJUDA_MULTIPLA,
    multipla: true,
    opcoes: [
      { valor: 'urbano', titulo: 'Dia a dia urbano', descricao: 'Bolso, cinto, trabalho, cidade' },
      { valor: 'mato_campo', titulo: 'Mato e campo', descricao: 'Trilha, acampamento, fazenda' },
      { valor: 'operacional', titulo: 'Serviço operacional', descricao: 'Colete, farda, missão' },
      { valor: 'casa_churrasco', titulo: 'Casa e churrasco', descricao: 'Cozinha, corte de carne, mesa' },
    ],
  },
  {
    id: 'porte',
    titulo: 'Como pretende levar?',
    ajuda: AJUDA_MULTIPLA,
    multipla: true,
    opcoes: [
      { valor: 'velado', titulo: 'Velada na calça', descricao: 'Ninguém precisa perceber' },
      { valor: 'ostensivo_cintura', titulo: 'No cinto, à vista', descricao: 'Saque rápido, sem esconder' },
      { valor: 'mochila_colete', titulo: 'Mochila ou colete', descricao: 'Fica no equipamento' },
      { valor: 'nao_se_aplica', titulo: 'Não porto', descricao: 'Fica em casa ou guardada' },
    ],
  },
  {
    id: 'funcao',
    titulo: 'O que ela vai fazer na maior parte do tempo?',
    ajuda: AJUDA_MULTIPLA,
    multipla: true,
    opcoes: [
      { valor: 'corte_utilitario', titulo: 'Corte do dia a dia', descricao: 'Corda, caixa, fruta, tarefa comum' },
      { valor: 'defesa', titulo: 'Defesa', descricao: 'Segurança pessoal em primeiro lugar' },
      { valor: 'preparo_animal', titulo: 'Preparo de animal', descricao: 'Caça, pesca, limpeza e corte' },
      { valor: 'corte_pesado', titulo: 'Corte pesado', descricao: 'Madeira, bater, trabalho bruto' },
    ],
  },
  {
    id: 'envolvimento',
    titulo: 'Como é a sua relação com lâminas hoje?',
    multipla: false,
    opcoes: [
      { valor: 'iniciante', titulo: 'É a minha primeira', descricao: 'Estou começando agora' },
      { valor: 'usuario', titulo: 'Tenho uma ou duas de uso', descricao: 'Uso, mas sem me aprofundar' },
      { valor: 'experiente', titulo: 'Tenho algumas', descricao: 'Escolho pelo tipo de serviço' },
      { valor: 'colecionador', titulo: 'Tenho coleção', descricao: 'Valorizo a peça em si' },
    ],
  },
];

/** C4 — títulos na terceira pessoa quando o quiz está em modo presente. */
export const TITULOS_PRESENTE: Record<string, string> = {
  quem: 'Quem é a pessoa?',
  onde: 'Onde ela vai andar com ela?',
  porte: 'Como ela pretende levar?',
  funcao: 'O que ela vai fazer na maior parte do tempo?',
  envolvimento: 'Como é a relação dela com lâminas hoje?',
};

/* ─────────── Pesos ─────────── */

type Pesos = Map<CasoUso, number>;

const soma = (m: Pesos, k: CasoUso, v: number) => m.set(k, (m.get(k) ?? 0) + v);

/** B3 — teto: peso dividido pela quantidade marcada, arredondando para cima, mínimo 1. */
const comTeto = (peso: number, marcadas: number) => Math.max(1, Math.ceil(peso / Math.max(1, marcadas)));

/** E1 — pares em que 'onde' e 'funcao' dizem a mesma coisa. */
const PARES_SOBREPOSTOS: { onde: string; funcao: string; casos: CasoUso[] }[] = [
  { onde: 'casa_churrasco', funcao: 'preparo_animal', casos: ['churrasco'] },
  { onde: 'mato_campo', funcao: 'corte_pesado', casos: ['campo'] },
  { onde: 'operacional', funcao: 'defesa', casos: ['tatico', 'defesa'] },
  { onde: 'urbano', funcao: 'corte_utilitario', casos: ['edc_urbano'] },
];

/** Traduz as respostas em pesos por caso de uso — o coração do motor. */
export function pesosDeCasoUso(r: RespostasQuiz): Pesos {
  const p: Pesos = new Map();

  r.quem.forEach((q) => {
    if (q === 'civil') { soma(p, 'edc_urbano', 2); soma(p, 'defesa', 1); }
    if (q === 'seguranca_publica') { soma(p, 'tatico', 3); soma(p, 'defesa', 2); soma(p, 'edc_urbano', 1); }
    if (q === 'militar') { soma(p, 'tatico', 3); soma(p, 'campo', 2); soma(p, 'defesa', 1); }
    if (q === 'cacador_pescador') { soma(p, 'caca', 3); soma(p, 'pesca', 3); soma(p, 'campo', 2); }
    if (q === 'colecionador') { soma(p, 'colecao', 3); }
  });

  // B3 — 'onde' e 'funcao' ganham teto pela quantidade marcada.
  const nOnde = r.onde.length;
  const nFuncao = r.funcao.length;
  const pOnde: Pesos = new Map();
  const pFuncao: Pesos = new Map();
  const t = (base: number, n: number) => comTeto(base, n);

  r.onde.forEach((o) => {
    if (o === 'urbano') { soma(pOnde, 'edc_urbano', t(3, nOnde)); }
    if (o === 'mato_campo') { soma(pOnde, 'campo', t(3, nOnde)); soma(pOnde, 'caca', t(1, nOnde)); soma(pOnde, 'pesca', t(1, nOnde)); }
    if (o === 'operacional') { soma(pOnde, 'tatico', t(3, nOnde)); soma(pOnde, 'defesa', t(1, nOnde)); }
    if (o === 'casa_churrasco') { soma(pOnde, 'churrasco', t(3, nOnde)); }
  });

  r.funcao.forEach((f) => {
    if (f === 'corte_utilitario') { soma(pFuncao, 'edc_urbano', t(2, nFuncao)); soma(pFuncao, 'campo', t(1, nFuncao)); }
    if (f === 'defesa') { soma(pFuncao, 'defesa', t(3, nFuncao)); }
    if (f === 'preparo_animal') { soma(pFuncao, 'caca', t(2, nFuncao)); soma(pFuncao, 'pesca', t(2, nFuncao)); soma(pFuncao, 'churrasco', t(1, nFuncao)); }
    if (f === 'corte_pesado') { soma(pFuncao, 'campo', t(3, nFuncao)); soma(pFuncao, 'tatico', t(1, nFuncao)); }
  });

  // E1 — casos que aparecem nos dois lados por sobreposição: 1,5x o maior, nunca a soma.
  const sobrepostos = new Set<CasoUso>();
  PARES_SOBREPOSTOS.forEach((par) => {
    if (r.onde.includes(par.onde) && r.funcao.includes(par.funcao)) par.casos.forEach((c) => sobrepostos.add(c));
  });

  const casos = new Set<CasoUso>([...pOnde.keys(), ...pFuncao.keys()]);
  casos.forEach((c) => {
    const a = pOnde.get(c) ?? 0;
    const b = pFuncao.get(c) ?? 0;
    soma(p, c, sobrepostos.has(c) ? Math.max(a, b) * 1.5 : a + b);
  });

  return p;
}

export interface Recomendacao {
  modelo: ModeloRecomendavel;
  score: number;
  /** Caso de uso pelo qual este modelo entrou (usado no enxoval). */
  casoUso: CasoUso | null;
  porque: string;
}

const PESO_PORTE = 4;
const PESO_MANUTENCAO = 3;
const PESO_NIVEL = 6; // C3 — nível precisa competir com os casos de uso.
const BONUS_VERSATILIDADE = 3; // B4

/** Quantidade de mídias conhecida do modelo (imagem + vídeo + galeria). */
export const midiasDe = (m: ModeloRecomendavel): number =>
  typeof m.midias_count === 'number'
    ? m.midias_count
    : (m.imagem_modelo ? 1 : 0) + (m.video_url ? 1 : 0);

/** C7 — manutenção da lâmina como array (tolera dado antigo em string). */
export const manutencoesDe = (m: ModeloRecomendavel): string[] =>
  Array.isArray(m.manutencao) ? m.manutencao : m.manutencao ? [m.manutencao as unknown as string] : [];

/** Pontua um modelo contra as respostas. */
export function pontuar(m: ModeloRecomendavel, r: RespostasQuiz, pesos: Pesos): number {
  let s = 0;

  // C2 — caça e pesca são um par irmão: vale o MAIOR dos dois pesos, nunca a soma.
  const irmaos: CasoUso[] = ['caca', 'pesca'];
  m.casos_uso.forEach((c) => {
    if (irmaos.includes(c as CasoUso)) return;
    s += pesos.get(c as CasoUso) ?? 0;
  });
  if (m.casos_uso.some((c) => irmaos.includes(c as CasoUso))) {
    s += Math.max(pesos.get('caca') ?? 0, pesos.get('pesca') ?? 0);
  }

  // B3 — porte pontua UMA única vez, por interseção.
  if (r.porte.length && r.porte.some((x) => m.tipo_porte.includes(x))) s += PESO_PORTE;
  // B4 — bônus de versatilidade: cobre TODOS os portes marcados.
  if (r.porte.length >= 2 && r.porte.every((x) => m.tipo_porte.includes(x))) s += BONUS_VERSATILIDADE;

  if (r.envolvimento && m.nivel_envolvimento.includes(r.envolvimento)) s += PESO_NIVEL;

  // C3 — escada pesa de acordo com o envolvimento declarado.
  if (r.envolvimento === 'colecionador') {
    if (m.posicao_escada === 'definitiva') s += 5;
    if (m.posicao_escada === 'entrada') s -= 4;
  }
  if (r.envolvimento === 'iniciante') {
    if (m.posicao_escada === 'entrada') s += 3;
    if (m.posicao_escada === 'definitiva') s -= 2;
  }

  // C4 — modo presente tem lógica própria.
  if (r.presente) {
    if (m.posicao_escada === 'ideal') s += 4;
    if (midiasDe(m) >= 3) s += 2;
  }

  // Desempate suave por completude de cadastro, para não empatar tudo em zero.
  s += Math.min(m.casos_uso.length, 3) * 0.1;
  return s;
}

/** Texto do porquê — usa o cadastrado no admin e complementa com o perfil. */
function porqueDe(m: ModeloRecomendavel, r: RespostasQuiz, caso: CasoUso | null): string {
  if (m.porque_texto?.trim()) return m.porque_texto.trim();
  const partes: string[] = [];
  if (caso) partes.push(`atende ${labelDe(CASOS_USO, caso).toLowerCase()}`);
  const portesCobertos = r.porte.filter((x) => m.tipo_porte.includes(x));
  if (portesCobertos.length) {
    partes.push(`aceita porte ${portesCobertos.map((x) => labelDe(TIPOS_PORTE, x).toLowerCase()).join(' e ')}`);
  }
  return partes.length ? `Indicada porque ${partes.join(', ')}.` : 'Indicada pelo conjunto do seu perfil.';
}

/** C1 — desempate: 'ideal' primeiro, depois mais mídias, depois preço MAIOR. */
const desempatar = (a: ModeloRecomendavel, b: ModeloRecomendavel): number => {
  const ideal = (m: ModeloRecomendavel) => (m.posicao_escada === 'ideal' ? 0 : 1);
  return (
    ideal(a) - ideal(b) ||
    midiasDe(b) - midiasDe(a) ||
    (b.preco_base ?? 0) - (a.preco_base ?? 0)
  );
};

/** Ranking geral — nunca vazio. */
export function recomendar(modelos: ModeloRecomendavel[], r: RespostasQuiz, limite = 6): Recomendacao[] {
  const pesos = pesosDeCasoUso(r);
  const principal = casoPrincipal(r);
  return modelos
    .map((m) => {
      const caso = (m.casos_uso.find((c) => c === principal) ??
        [...pesos.entries()].sort((a, b) => b[1] - a[1]).find(([k]) => m.casos_uso.includes(k))?.[0] ??
        null) as CasoUso | null;
      const score = pontuar(m, r, pesos);
      return { modelo: m, score, casoUso: caso, porque: porqueDe(m, r, caso) };
    })
    .sort((a, b) => b.score - a.score || desempatar(a.modelo, b.modelo))
    .slice(0, limite);
}


/** Caso de uso dominante do perfil. */
export function casoPrincipal(r: RespostasQuiz): CasoUso | null {
  const pesos = [...pesosDeCasoUso(r).entries()].sort((a, b) => b[1] - a[1]);
  return pesos.length ? pesos[0][0] : null;
}

/** C5 — corte RELATIVO: só entra caso com peso >= 60% do principal, máx. 3. */
export function casosRelevantes(r: RespostasQuiz, fracao = 0.6): CasoUso[] {
  const pesos = [...pesosDeCasoUso(r).entries()].filter(([, v]) => v > 0).sort((a, b) => b[1] - a[1]);
  if (!pesos.length) return [];
  const corte = pesos[0][1] * fracao;
  return pesos.filter(([, v]) => v >= corte).slice(0, 3).map(([k]) => k);
}

/** Enxoval: a melhor peça para cada uso relevante, sem repetir modelo (F3). */
export function montarEnxoval(modelos: ModeloRecomendavel[], r: RespostasQuiz): Recomendacao[] {
  const pesos = pesosDeCasoUso(r);
  const usados = new Set<string>();
  const out: Recomendacao[] = [];
  casosRelevantes(r).forEach((caso) => {
    const melhor = modelos
      .filter((m) => m.casos_uso.includes(caso) && !usados.has(m.id))
      .map((m) => ({ m, s: pontuar(m, r, pesos) }))
      .sort((a, b) => b.s - a.s || desempatar(a.m, b.m))[0];
    if (melhor) {
      usados.add(melhor.m.id);
      out.push({ modelo: melhor.m, score: melhor.s, casoUso: caso, porque: porqueDe(melhor.m, r, caso) });
    }
  });
  return out;
}

/** Escada de valor (entrada / ideal / definitiva) a partir do modelo âncora.
 *  C6 — sempre 3 degraus: o que faltar no grupo é completado por fora, desde
 *  que o candidato compartilhe ao menos um caso de uso com a âncora.
 *  Se ainda assim não fechar os três, devolve vazio (escada não é exibida). */
export function montarEscada(
  modelos: ModeloRecomendavel[],
  ancora: ModeloRecomendavel,
  r: RespostasQuiz,
): { posicao: PosicaoEscada; modelo: ModeloRecomendavel; porque: string }[] {
  const pesos = pesosDeCasoUso(r);
  const grupo = ancora.grupo_escada
    ? modelos.filter((m) => m.grupo_escada === ancora.grupo_escada)
    : modelos.filter((m) => m.casos_uso.some((c) => ancora.casos_uso.includes(c)));
  const pool = grupo.length ? grupo : modelos;
  const fora = modelos.filter(
    (m) => !pool.some((p) => p.id === m.id) && m.casos_uso.some((c) => ancora.casos_uso.includes(c)),
  );

  const melhorDe = (lista: ModeloRecomendavel[], pos: PosicaoEscada, usados: Set<string>) =>
    lista
      .filter((m) => m.posicao_escada === pos && !usados.has(m.id))
      .map((m) => ({ m, s: pontuar(m, r, pesos) }))
      .sort((a, b) => b.s - a.s || desempatar(a.m, b.m))[0]?.m ?? null;

  const usados = new Set<string>();
  const degraus: { posicao: PosicaoEscada; modelo: ModeloRecomendavel; porque: string }[] = [];
  (['entrada', 'ideal', 'definitiva'] as PosicaoEscada[]).forEach((pos) => {
    const escolhido = melhorDe(pool, pos, usados) ?? melhorDe(fora, pos, usados);
    if (escolhido) {
      usados.add(escolhido.id);
      degraus.push({ posicao: pos, modelo: escolhido, porque: porqueDe(escolhido, r, null) });
    }
  });

  if (degraus.length < 3) return [];
  return ordenarEscada(degraus, r.envolvimento);
}


/** Hierarquia visual: iniciante vê a entrada primeiro; colecionador, a definitiva. */
export function ordenarEscada<T extends { posicao: PosicaoEscada }>(degraus: T[], envolvimento: string | null): T[] {
  const ordemBaixo: PosicaoEscada[] = ['entrada', 'ideal', 'definitiva'];
  const ordemAlto: PosicaoEscada[] = ['definitiva', 'ideal', 'entrada'];
  const ordem = envolvimento === 'colecionador' || envolvimento === 'experiente' ? ordemAlto : ordemBaixo;
  return [...degraus].sort((a, b) => ordem.indexOf(a.posicao) - ordem.indexOf(b.posicao));
}

/** B5 — trecho de porte, tolerando múltiplas marcações. */
function trechoDePorte(porte: string[]): string {
  const reais = porte.filter((x) => x !== 'nao_se_aplica');
  if (reais.length === 0) return '';
  if (reais.length === 1) {
    return reais[0] === 'velado' ? ' que valoriza discrição no dia a dia'
      : reais[0] === 'ostensivo_cintura' ? ' que quer a peça à mão, sem esconder'
      : reais[0] === 'mochila_colete' ? ' que carrega a peça no equipamento'
      : '';
  }
  const nome: Record<string, string> = {
    velado: 'velado',
    ostensivo_cintura: 'ostensivo',
    mochila_colete: 'no equipamento',
  };
  const lista = reais.map((x) => nome[x] ?? x);
  const texto =
    lista.length === 2
      ? `${lista[0]} e ${lista[1]}`
      : `${lista.slice(0, -1).join(', ')} e ${lista[lista.length - 1]}`;
  return ` que alterna entre porte ${texto}`;
}

/** Frase que descreve A PESSOA (nunca o produto) — abre a tela de resultado. */
export function fraseDoPerfil(r: RespostasQuiz): string {
  const casos = casosRelevantes(r);
  const nomeCaso: Record<CasoUso, string> = {
    campo: 'de campo', caca: 'de caça', pesca: 'de pesca', edc_urbano: 'urbano',
    defesa: 'voltado à defesa', tatico: 'operacional', churrasco: 'de mesa e churrasco', colecao: 'colecionador',
  };
  const perfil = casos.length
    ? `um usuário ${casos.slice(0, 2).map((c) => nomeCaso[c]).join(' e ')}`
    : 'um usuário versátil';

  // C4 — quando é presente, a frase fala de quem vai receber, não do comprador.
  const base = r.presente
    ? `Você está escolhendo para alguém que é ${perfil}`
    : `Você é ${perfil}`;

  return `${base}${trechoDePorte(r.porte)}.`;
}

/** Etiquetas do lead para o funil (n8n → Kommo). */
export function etiquetasDoPerfil(r: RespostasQuiz): string[] {
  return [
    ...r.quem.map((q) => `quem:${q}`),
    ...casosRelevantes(r).map((c) => `uso:${c}`),
    ...r.porte.map((p) => `porte:${p}`),
    ...r.funcao.map((f) => `funcao:${f}`),
    r.envolvimento ? `envolvimento:${r.envolvimento}` : null,
    r.presente ? 'presente:sim' : null,
  ].filter(Boolean) as string[];
}
