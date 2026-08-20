/* Área pública Kaowz — helpers compartilhados entre quiz, vitrine,
   configurador e arsenal. Sem login, sem dependência do app interno. */

import { supabase } from '@/integrations/supabase/client';
import { PERGUNTAS } from '@/lib/recomendacao';
import type { ModeloRecomendavel, PerguntaQuiz, RespostasQuiz } from '@/lib/recomendacao';
import type { ItemCfg } from '@/lib/simuladorData';

export const WHATSAPP_KAOWZ = '5528999025695';

export const linkWhatsApp = (mensagem: string) =>
  `https://wa.me/${WHATSAPP_KAOWZ}?text=${encodeURIComponent(mensagem)}`;

/* ── Persistência local do quiz (permite refazer e voltar) ── */

const CHAVE_QUIZ = 'kaowz_quiz_respostas';

export const salvarRespostas = (r: RespostasQuiz) => {
  try { sessionStorage.setItem(CHAVE_QUIZ, JSON.stringify(r)); } catch { /* ignore */ }
};

export const lerRespostas = (): RespostasQuiz | null => {
  try {
    const raw = sessionStorage.getItem(CHAVE_QUIZ);
    return raw ? (JSON.parse(raw) as RespostasQuiz) : null;
  } catch { return null; }
};

/* ── Token do arsenal (o link é o objeto) ── */

const CHAVE_TOKEN = 'kaowz_arsenal_token';
export const lerToken = () => { try { return localStorage.getItem(CHAVE_TOKEN); } catch { return null; } };
export const gravarToken = (t: string) => { try { localStorage.setItem(CHAVE_TOKEN, t); } catch { /* ignore */ } };

/* ── Modelos públicos com atributos de recomendação ── */

/** Mesma fonte e mesmos filtros do catálogo público (inclui exigência de mídia). */
export async function carregarModelosPublicos(): Promise<ModeloRecomendavel[]> {
  const [{ data: midias }, { data, error }] = await Promise.all([
    supabase.from('midias_catalogo').select('modelo_id'),
    supabase
      .from('catalogo_modelos')
      .select('*')
      .eq('visivel_catalogo', true)
      .eq('visivel_publico', true)
      .order('nome_modelo'),
  ]);
  if (error || !data) return [];
  const contagem = new Map<string, number>();
  (midias || []).forEach((m: any) => contagem.set(m.modelo_id, (contagem.get(m.modelo_id) ?? 0) + 1));
  return (data as any[])
    .filter((m) => m.imagem_modelo || m.video_url || contagem.has(m.id))
    .map((m) => ({
      ...m,
      casos_uso: m.casos_uso ?? [],
      tipo_porte: m.tipo_porte ?? [],
      nivel_envolvimento: m.nivel_envolvimento ?? [],
      forma_enxoval: m.forma_enxoval ?? [],
      manutencao: Array.isArray(m.manutencao) ? m.manutencao : m.manutencao ? [m.manutencao] : [],
      categorias: m.categorias ?? [],
      pronta_entrega: !!m.pronta_entrega,
      midias_count:
        (contagem.get(m.id) ?? 0) + (m.imagem_modelo ? 1 : 0) + (m.video_url ? 1 : 0),
    })) as ModeloRecomendavel[];
}


/* ── Etapas do quiz configuráveis pelo admin ──
   Só textos e visibilidade são editáveis; os ids/valores continuam fixos
   porque o motor de recomendação depende deles. */

export const CHAVE_QUIZ_CONFIG = 'quiz_perguntas';

export interface QuizOpcaoConfig { valor: string; titulo: string; descricao: string; ativo: boolean }
export interface QuizPerguntaConfig {
  id: string;
  titulo: string;
  ajuda: string;
  ativo: boolean;
  ordem: number;
  opcoes: QuizOpcaoConfig[];
}

/** Config padrão derivada do motor — usada quando nada foi salvo ainda. */
export function quizConfigPadrao(): QuizPerguntaConfig[] {
  return PERGUNTAS.map((p, i) => ({
    id: p.id as string,
    titulo: p.titulo,
    ajuda: p.ajuda ?? '',
    ativo: true,
    ordem: i,
    opcoes: p.opcoes.map((o) => ({ ...o, ativo: true })),
  }));
}

/** Mescla o que está salvo com o padrão (novas perguntas/opções aparecem sozinhas). */
export function mesclarQuizConfig(salvo: QuizPerguntaConfig[] | null): QuizPerguntaConfig[] {
  const padrao = quizConfigPadrao();
  if (!salvo?.length) return padrao;
  return padrao
    .map((p) => {
      const s = salvo.find((x) => x.id === p.id);
      if (!s) return p;
      return {
        ...p,
        titulo: s.titulo || p.titulo,
        ajuda: s.ajuda ?? p.ajuda,
        ativo: s.ativo !== false,
        ordem: typeof s.ordem === 'number' ? s.ordem : p.ordem,
        opcoes: p.opcoes.map((o) => {
          const so = s.opcoes?.find((x) => x.valor === o.valor);
          return so ? { ...o, titulo: so.titulo || o.titulo, descricao: so.descricao ?? o.descricao, ativo: so.ativo !== false } : o;
        }),
      };
    })
    .sort((a, b) => a.ordem - b.ordem);
}

export async function carregarQuizConfig(): Promise<QuizPerguntaConfig[]> {
  const { data } = await supabase
    .from('configuracoes_catalogo')
    .select('valor')
    .eq('chave', CHAVE_QUIZ_CONFIG)
    .maybeSingle();
  try {
    return mesclarQuizConfig(data?.valor ? (JSON.parse(data.valor) as QuizPerguntaConfig[]) : null);
  } catch {
    return quizConfigPadrao();
  }
}

export async function salvarQuizConfig(cfg: QuizPerguntaConfig[]) {
  const { error } = await supabase
    .from('configuracoes_catalogo')
    .upsert({ chave: CHAVE_QUIZ_CONFIG, valor: JSON.stringify(cfg) }, { onConflict: 'chave' });
  if (error) throw error;
}

/** Perguntas prontas para o quiz público (aplica textos e filtros do admin). */
export function perguntasDoConfig(cfg: QuizPerguntaConfig[]): PerguntaQuiz[] {
  return cfg
    .filter((p) => p.ativo)
    .map((p) => {
      const base = PERGUNTAS.find((x) => (x.id as string) === p.id)!;
      return {
        ...base,
        titulo: p.titulo,
        ajuda: p.ajuda || undefined,
        opcoes: p.opcoes.filter((o) => o.ativo).map((o) => ({ valor: o.valor, titulo: o.titulo, descricao: o.descricao })),
      } as PerguntaQuiz;
    });
}

/* ── Traduções em linguagem de cliente (uma linha por opção) ── */

export const TRADUCOES: Record<string, string> = {
  // Aços
  'Inox': 'Não enferruja, aguenta descuido, manutenção simples.',
  'Sandvik 14C28N': 'Corte fino e duradouro, ainda resistente à corrosão.',
  '52100': 'Corte extremo de aço carbono — pede óleo e cuidado.',
  'Brute Forge': 'Superfície forjada bruta, cada peça com marca própria.',
  // Empunhaduras
  'Grafite': 'Leve, seca e firme na mão, discreta.',
  'G10': 'Aderência alta mesmo molhada, praticamente indestrutível.',
  'Imbuia': 'Madeira nobre, aquece na mão, peça com identidade.',
  'Espaçador': 'Detalhe de cor entre as escamas, personaliza a peça.',
  'Dragon Scale': 'Textura em escamas, agarra mais sob suor e chuva.',
  'Micarta': 'Leve, absorve suor, aderência melhora com o uso.',
  // Acabamentos
  'Acetinado': 'Acabamento limpo e clássico, fácil de manter.',
  'Stone Washed': 'Fosco, disfarça riscos, baixa reflexão de luz.',
  'Black Stone Washed': 'Preto fosco, discreto, esconde marcas de uso.',
  'Tactical': 'Baixíssima reflexão, feito para não chamar atenção.',
  // Bainhas
  'Velada': 'Feita para sumir sob a roupa, saque discreto.',
  'Multifuncional': 'Cinto, colete ou mochila — muda de posição sem ferramenta.',
};

export const traducao = (nome: string) => TRADUCOES[nome] ?? '';

/* ── Resumo da configuração para WhatsApp e para o arsenal ── */

export interface ResumoConfig {
  titulo: string;
  linhas: string[];
  preco: number;
}

export const mensagemConfiguracao = (r: ResumoConfig, nomeProjeto?: string) =>
  [
    'Olá! Montei uma configuração no site da Kaowz e quero tirar do papel:',
    '',
    nomeProjeto ? `Projeto: ${nomeProjeto}` : null,
    r.titulo,
    ...r.linhas,
    '',
    `Valor estimado: ${r.preco.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}`,
  ]
    .filter(Boolean)
    .join('\n');

/* ── Chamadas ao arsenal (edge function, sem login) ── */

interface RespostaArsenal {
  token: string;
  arsenal: { token: string; nome_cliente: string | null; visitas: number };
  projetos: {
    id: string; nome: string; modelo_nome: string | null; preco: number | null;
    resumo: string | null; configuracao: any; tirar_do_papel: boolean; created_at: string;
  }[];
}

const invocar = async (body: Record<string, unknown>) => {
  const { data, error } = await supabase.functions.invoke('arsenal', { body });
  if (error) throw error;
  return data as RespostaArsenal;
};

export const abrirArsenal = (token: string) => invocar({ acao: 'obter', token });

export const salvarProjeto = (p: {
  token?: string | null;
  whatsapp?: string;
  nomeCliente?: string;
  nome: string;
  modeloId?: string | null;
  modeloNome?: string | null;
  preco: number;
  resumo: string;
  configuracao: ItemCfg | Record<string, unknown>;
  perfil?: RespostasQuiz | null;
  etiquetas?: string[];
}) => invocar({ acao: 'salvar', ...p });

export const tirarDoPapel = (token: string, projetoId: string) =>
  invocar({ acao: 'tirar_do_papel', token, projetoId });

export const removerProjeto = (token: string, projetoId: string) =>
  invocar({ acao: 'remover', token, projetoId });
