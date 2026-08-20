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
  porte: string | null;    // única
  funcao: string | null;   // única
  manutencao: string | null; // única
  desempate: string | null;  // caso de uso que pesa mais
  envolvimento: string | null; // única
}

export const respostasVazias = (): RespostasQuiz => ({
  quem: [], onde: [], porte: null, funcao: null, manutencao: null, desempate: null, envolvimento: null,
});

/* ─────────── Perguntas (linguagem do cliente, sem termo técnico) ─────────── */

export interface OpcaoQuiz { valor: string; titulo: string; descricao: string }
export interface PerguntaQuiz {
  id: keyof RespostasQuiz;
  titulo: string;
  ajuda?: string;
  multipla: boolean;
  opcoes: OpcaoQuiz[];
}

export const PERGUNTAS: PerguntaQuiz[] = [
  {
    id: 'quem',
    titulo: 'Quem é você?',
    ajuda: 'Pode marcar mais de uma.',
    multipla: true,
    opcoes: [
      { valor: 'civil', titulo: 'Civil', descricao: 'Uso pessoal, no dia a dia' },
      { valor: 'seguranca_publica', titulo: 'Segurança pública', descricao: 'Serviço, escala, plantão' },
      { valor: 'militar', titulo: 'Militar', descricao: 'Operacional, instrução, campo' },
      { valor: 'cacador_pescador', titulo: 'Caçador ou pescador', descricao: 'Mato, água, preparo de animal' },
      { valor: 'colecionador', titulo: 'Colecionador', descricao: 'Valorizo a peça em si' },
      { valor: 'presente', titulo: 'É presente', descricao: 'Quero acertar para outra pessoa' },
    ],
  },
  {
    id: 'onde',
    titulo: 'Onde ela vai andar com você?',
    ajuda: 'Pode marcar mais de uma.',
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
    multipla: false,
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
    multipla: false,
    opcoes: [
      { valor: 'corte_utilitario', titulo: 'Corte do dia a dia', descricao: 'Corda, caixa, fruta, tarefa comum' },
      { valor: 'defesa', titulo: 'Defesa', descricao: 'Segurança pessoal em primeiro lugar' },
      { valor: 'preparo_animal', titulo: 'Preparo de animal', descricao: 'Caça, pesca, limpeza e corte' },
      { valor: 'corte_pesado', titulo: 'Corte pesado', descricao: 'Madeira, bater, trabalho bruto' },
    ],
  },
  {
    id: 'manutencao',
    titulo: 'Qual das duas descreve você melhor?',
    multipla: false,
    opcoes: [
      { valor: 'corte_extremo', titulo: 'Quero corte extremo', descricao: 'Aceito passar óleo e cuidar da peça' },
      { valor: 'resistente', titulo: 'Quero esquecer e usar', descricao: 'Resistente, não enferruja, sem cuidado especial' },
    ],
  },
  {
    id: 'desempate',
    titulo: 'Entre o que você marcou, o que pesa mais no dia a dia?',
    multipla: false,
    opcoes: [], // preenchido dinamicamente por opcoesDesempate()
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

/** Opções do desempate: casos de uso derivados do que a pessoa já marcou. */
export function opcoesDesempate(r: RespostasQuiz): OpcaoQuiz[] {
  const casos = new Set<CasoUso>();
  pesosDeCasoUso(r).forEach((_, k) => casos.add(k));
  const desc: Record<CasoUso, string> = {
    campo: 'Trilha, acampamento, fazenda',
    caca: 'Mato, rastro, preparo do animal',
    pesca: 'Água, escama, filé',
    edc_urbano: 'Cidade, bolso, tarefa comum',
    defesa: 'Segurança pessoal',
    tatico: 'Serviço, farda, equipamento',
    churrasco: 'Carne, mesa, cozinha',
    colecao: 'A peça em si',
  };
  const lista = [...casos].map((c) => ({
    valor: c,
    titulo: labelDe(CASOS_USO, c),
    descricao: desc[c],
  }));
  return lista.length ? lista : CASOS_USO.map((c) => ({ valor: c.valor, titulo: c.label, descricao: desc[c.valor] }));
}

/* ─────────── Pesos ─────────── */

type Pesos = Map<CasoUso, number>;

const soma = (m: Pesos, k: CasoUso, v: number) => m.set(k, (m.get(k) ?? 0) + v);

/** Traduz as respostas em pesos por caso de uso — o coração do motor. */
export function pesosDeCasoUso(r: RespostasQuiz): Pesos {
  const p: Pesos = new Map();

  r.quem.forEach((q) => {
    if (q === 'civil') { soma(p, 'edc_urbano', 2); soma(p, 'defesa', 1); }
    if (q === 'seguranca_publica') { soma(p, 'tatico', 3); soma(p, 'defesa', 2); soma(p, 'edc_urbano', 1); }
    if (q === 'militar') { soma(p, 'tatico', 3); soma(p, 'campo', 2); soma(p, 'defesa', 1); }
    if (q === 'cacador_pescador') { soma(p, 'caca', 3); soma(p, 'pesca', 3); soma(p, 'campo', 2); }
    if (q === 'colecionador') { soma(p, 'colecao', 3); }
    if (q === 'presente') { soma(p, 'edc_urbano', 1); soma(p, 'colecao', 1); }
  });

  r.onde.forEach((o) => {
    if (o === 'urbano') { soma(p, 'edc_urbano', 3); }
    if (o === 'mato_campo') { soma(p, 'campo', 3); soma(p, 'caca', 1); soma(p, 'pesca', 1); }
    if (o === 'operacional') { soma(p, 'tatico', 3); soma(p, 'defesa', 1); }
    if (o === 'casa_churrasco') { soma(p, 'churrasco', 3); }
  });

  if (r.funcao === 'corte_utilitario') { soma(p, 'edc_urbano', 2); soma(p, 'campo', 1); }
  if (r.funcao === 'defesa') { soma(p, 'defesa', 3); }
  if (r.funcao === 'preparo_animal') { soma(p, 'caca', 2); soma(p, 'pesca', 2); soma(p, 'churrasco', 1); }
  if (r.funcao === 'corte_pesado') { soma(p, 'campo', 3); soma(p, 'tatico', 1); }

  if (r.desempate) soma(p, r.desempate as CasoUso, 4);

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
const PESO_NIVEL = 3;

/** Pontua um modelo contra as respostas. */
export function pontuar(m: ModeloRecomendavel, r: RespostasQuiz, pesos: Pesos): number {
  let s = 0;
  m.casos_uso.forEach((c) => { s += pesos.get(c as CasoUso) ?? 0; });
  if (r.porte && m.tipo_porte.includes(r.porte)) s += PESO_PORTE;
  if (r.manutencao && m.manutencao === r.manutencao) s += PESO_MANUTENCAO;
  if (r.envolvimento && m.nivel_envolvimento.includes(r.envolvimento)) s += PESO_NIVEL;
  // Desempate suave por completude de cadastro, para não empatar tudo em zero.
  s += Math.min(m.casos_uso.length, 3) * 0.1;
  return s;
}

/** Texto do porquê — usa o cadastrado no admin e complementa com o perfil. */
function porqueDe(m: ModeloRecomendavel, r: RespostasQuiz, caso: CasoUso | null): string {
  if (m.porque_texto?.trim()) return m.porque_texto.trim();
  const partes: string[] = [];
  if (caso) partes.push(`atende ${labelDe(CASOS_USO, caso).toLowerCase()}`);
  if (r.porte && m.tipo_porte.includes(r.porte)) partes.push(`aceita porte ${labelDe(TIPOS_PORTE, r.porte).toLowerCase()}`);
  if (r.manutencao && m.manutencao === r.manutencao) {
    partes.push(r.manutencao === 'resistente' ? 'aguenta descuido sem enferrujar' : 'entrega corte extremo para quem cuida');
  }
  return partes.length ? `Indicada porque ${partes.join(', ')}.` : 'Indicada pelo conjunto do seu perfil.';
}

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
    .sort((a, b) => b.score - a.score || a.modelo.preco_base - b.modelo.preco_base)
    .slice(0, limite);
}

/** Caso de uso dominante do perfil. */
export function casoPrincipal(r: RespostasQuiz): CasoUso | null {
  const pesos = [...pesosDeCasoUso(r).entries()].sort((a, b) => b[1] - a[1]);
  return pesos.length ? pesos[0][0] : null;
}

/** Perfil misto: dois ou mais casos de uso relevantes → resultado vira enxoval. */
export function casosRelevantes(r: RespostasQuiz, minimo = 3): CasoUso[] {
  const pesos = [...pesosDeCasoUso(r).entries()].filter(([, v]) => v >= minimo).sort((a, b) => b[1] - a[1]);
  return pesos.slice(0, 4).map(([k]) => k);
}

/** Enxoval: a melhor peça para cada uso relevante, sem repetir modelo. */
export function montarEnxoval(modelos: ModeloRecomendavel[], r: RespostasQuiz): Recomendacao[] {
  const pesos = pesosDeCasoUso(r);
  const usados = new Set<string>();
  const out: Recomendacao[] = [];
  casosRelevantes(r).forEach((caso) => {
    const melhor = modelos
      .filter((m) => m.casos_uso.includes(caso) && !usados.has(m.id))
      .map((m) => ({ m, s: pontuar(m, r, pesos) }))
      .sort((a, b) => b.s - a.s)[0];
    if (melhor) {
      usados.add(melhor.m.id);
      out.push({ modelo: melhor.m, score: melhor.s, casoUso: caso, porque: porqueDe(melhor.m, r, caso) });
    }
  });
  return out;
}

/** Escada de valor (entrada / ideal / definitiva) a partir do modelo âncora. */
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
  const degraus: { posicao: PosicaoEscada; modelo: ModeloRecomendavel; porque: string }[] = [];
  (['entrada', 'ideal', 'definitiva'] as PosicaoEscada[]).forEach((pos) => {
    const cand = pool
      .filter((m) => m.posicao_escada === pos)
      .map((m) => ({ m, s: pontuar(m, r, pesos) }))
      .sort((a, b) => b.s - a.s)[0];
    if (cand) degraus.push({ posicao: pos, modelo: cand.m, porque: porqueDe(cand.m, r, null) });
  });
  return ordenarEscada(degraus, r.envolvimento);
}

/** Hierarquia visual: iniciante vê a entrada primeiro; colecionador, a definitiva. */
export function ordenarEscada<T extends { posicao: PosicaoEscada }>(degraus: T[], envolvimento: string | null): T[] {
  const ordemBaixo: PosicaoEscada[] = ['entrada', 'ideal', 'definitiva'];
  const ordemAlto: PosicaoEscada[] = ['definitiva', 'ideal', 'entrada'];
  const ordem = envolvimento === 'colecionador' || envolvimento === 'experiente' ? ordemAlto : ordemBaixo;
  return [...degraus].sort((a, b) => ordem.indexOf(a.posicao) - ordem.indexOf(b.posicao));
}

/** Frase que descreve A PESSOA (nunca o produto) — abre a tela de resultado. */
export function fraseDoPerfil(r: RespostasQuiz): string {
  const casos = casosRelevantes(r);
  const nomeCaso: Record<CasoUso, string> = {
    campo: 'de campo', caca: 'de caça', pesca: 'de pesca', edc_urbano: 'urbano',
    defesa: 'voltado à defesa', tatico: 'operacional', churrasco: 'de mesa e churrasco', colecao: 'colecionador',
  };
  const base = casos.length
    ? `Você é um usuário ${casos.slice(0, 2).map((c) => nomeCaso[c]).join(' e ')}`
    : 'Você é um usuário versátil';
  const porte =
    r.porte === 'velado' ? ' que valoriza discrição no dia a dia'
    : r.porte === 'ostensivo_cintura' ? ' que quer a peça à mão, sem esconder'
    : r.porte === 'mochila_colete' ? ' que carrega a peça no equipamento'
    : '';
  const manut =
    r.manutencao === 'corte_extremo' ? ' e não abre mão de corte extremo.'
    : r.manutencao === 'resistente' ? ' e prefere uma lâmina que aguenta descuido.'
    : '.';
  return `${base}${porte}${manut}`;
}

/** Etiquetas do lead para o funil (n8n → Kommo). */
export function etiquetasDoPerfil(r: RespostasQuiz): string[] {
  return [
    ...r.quem.map((q) => `quem:${q}`),
    ...casosRelevantes(r).map((c) => `uso:${c}`),
    r.porte ? `porte:${r.porte}` : null,
    r.manutencao ? `manutencao:${r.manutencao}` : null,
    r.envolvimento ? `envolvimento:${r.envolvimento}` : null,
  ].filter(Boolean) as string[];
}
