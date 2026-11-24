/* Landings por categoria — acesso ao banco.
   As regras puras (nível, preço, CTA) estão em `landingsRegras.ts`.
   O types.ts do Supabase ainda não conhece estas tabelas (o Lovable regenera
   depois da migration), por isso o `as any`, no mesmo padrão do projeto. */

import { supabase } from '@/integrations/supabase/client';
import { linkWhatsApp } from '@/lib/publico';
import {
  COLUNAS_MODELO,
  modeloEhPublico,
  resolverLamina,
  sugerirModelos,
  type CtaEvento,
  type EventoLanding,
  type FiltrosSugestao,
  type Landing,
  type LandingLamina,
  type LandingPasso,
  type LaminaResolvida,
  type MetricasLanding,
  type ModeloLanding,
} from '@/lib/landingsRegras';

export * from '@/lib/landingsRegras';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const db = supabase as any;

const T_LANDINGS = 'landings_categoria';
const T_PASSOS = 'landing_passos';
const T_LAMINAS = 'landing_laminas';
const T_EVENTOS = 'landing_eventos';
export const BUCKET_LANDINGS = 'landings';

type LaminaComModelo = LandingLamina & { modelo: ModeloLanding | null };

/* ─────────── Página pública ─────────── */

export type ResultadoLanding =
  | { estado: 'ok'; landing: Landing; passos: LandingPasso[]; laminas: LaminaResolvida[] }
  | { estado: 'nao_encontrada' }
  | { estado: 'erro' };

/**
 * Busca a landing, os passos e as lâminas (com o modelo do catálogo).
 * Rascunho só aparece com `preview` — e a RLS só entrega rascunho para admin.
 * Modelos que deixaram de ser públicos são descartados.
 */
export async function carregarLanding(slug: string, { preview = false } = {}): Promise<ResultadoLanding> {
  const { data: landing, error } = await db.from(T_LANDINGS).select('*').eq('slug', slug).maybeSingle();
  if (error) return { estado: 'erro' };
  if (!landing || (!landing.publicada && !preview)) return { estado: 'nao_encontrada' };

  const [passos, laminas] = await Promise.all([
    db.from(T_PASSOS).select('*').eq('landing_id', landing.id).order('ordem', { ascending: true }),
    db
      .from(T_LAMINAS)
      .select(`*, modelo:catalogo_modelos(${COLUNAS_MODELO})`)
      .eq('landing_id', landing.id)
      .order('ordem', { ascending: true }),
  ]);
  if (passos.error || laminas.error) return { estado: 'erro' };

  const resolvidas = ((laminas.data ?? []) as LaminaComModelo[])
    .filter((l) => modeloEhPublico(l.modelo))
    .map((l) => resolverLamina(landing as Landing, l, l.modelo as ModeloLanding, linkWhatsApp));

  return {
    estado: 'ok',
    landing: landing as Landing,
    passos: (passos.data ?? []) as LandingPasso[],
    laminas: resolvidas,
  };
}

/** Dispara e esquece: nunca quebra a página e não registra em modo preview. */
export function registrarEvento(
  landingId: string,
  evento: EventoLanding,
  extra: { modeloId?: string | null; cta?: CtaEvento | null } = {},
  opcoes: { preview?: boolean } = {},
) {
  if (opcoes.preview || !landingId) return;
  try {
    db.from(T_EVENTOS)
      .insert({ landing_id: landingId, evento, modelo_id: extra.modeloId ?? null, cta: extra.cta ?? null })
      .then(() => undefined, () => undefined);
  } catch {
    /* evento é opcional */
  }
}

/* ─────────── Admin ─────────── */

export interface LandingResumo extends Landing {
  total_laminas: number;
}

export async function listarLandings(): Promise<LandingResumo[]> {
  const { data, error } = await db
    .from(T_LANDINGS)
    .select('*, landing_laminas(count)')
    .order('ordem', { ascending: true })
    .order('created_at', { ascending: true });
  if (error) throw error;
  return ((data ?? []) as (Landing & { landing_laminas: { count: number }[] })[]).map(({ landing_laminas, ...l }) => ({
    ...l,
    total_laminas: landing_laminas?.[0]?.count ?? 0,
  }));
}

export interface LandingCompleta {
  landing: Landing;
  passos: LandingPasso[];
  laminas: LaminaComModelo[];
}

export async function carregarLandingAdmin(id: string): Promise<LandingCompleta | null> {
  const { data: landing, error } = await db.from(T_LANDINGS).select('*').eq('id', id).maybeSingle();
  if (error) throw error;
  if (!landing) return null;
  const [passos, laminas] = await Promise.all([
    db.from(T_PASSOS).select('*').eq('landing_id', id).order('ordem', { ascending: true }),
    db
      .from(T_LAMINAS)
      .select(`*, modelo:catalogo_modelos(${COLUNAS_MODELO})`)
      .eq('landing_id', id)
      .order('ordem', { ascending: true }),
  ]);
  if (passos.error) throw passos.error;
  if (laminas.error) throw laminas.error;
  return { landing, passos: passos.data ?? [], laminas: laminas.data ?? [] };
}

export type LandingEdicao = Omit<Landing, 'id' | 'created_at' | 'updated_at'> & { id?: string };

/** Cria ou atualiza a landing e devolve a linha salva. */
export async function salvarLanding(dados: LandingEdicao): Promise<Landing> {
  const { id, ...campos } = dados as LandingEdicao & { created_at?: string; updated_at?: string };
  delete (campos as { created_at?: string }).created_at;
  delete (campos as { updated_at?: string }).updated_at;
  const consulta = id
    ? db.from(T_LANDINGS).update(campos).eq('id', id).select('*').single()
    : db.from(T_LANDINGS).insert(campos).select('*').single();
  const { data, error } = await consulta;
  if (error) throw error;
  return data as Landing;
}

/** Grava a lista inteira de passos na ordem recebida; os que saíram da lista são apagados. */
export async function salvarPassos(landingId: string, passos: Omit<LandingPasso, 'landing_id' | 'ordem'>[]) {
  const linhas = passos.map((p, i) => ({
    id: p.id,
    landing_id: landingId,
    ordem: i,
    titulo: p.titulo.trim(),
    texto: p.texto?.trim() || null,
    midia_url: p.midia_url?.trim() || null,
    midia_tipo: p.midia_tipo,
    foco: p.foco?.trim() || null,
  }));
  if (linhas.length) {
    const { error } = await db.from(T_PASSOS).upsert(linhas, { onConflict: 'id' });
    if (error) throw error;
  }
  let remover = db.from(T_PASSOS).delete().eq('landing_id', landingId);
  if (linhas.length) remover = remover.not('id', 'in', `(${linhas.map((l) => l.id).join(',')})`);
  const { error } = await remover;
  if (error) throw error;
}

export type LaminaEdicao = Pick<
  LandingLamina,
  'modelo_id' | 'nivel_override' | 'texto_categoria' | 'preco_override' | 'cta_override' | 'url_compra' | 'destaque'
>;

/** Grava as lâminas na ordem recebida (chave: landing + modelo); as que saíram são apagadas. */
export async function salvarLaminas(landingId: string, laminas: LaminaEdicao[]) {
  const linhas = laminas.map((l, i) => ({
    landing_id: landingId,
    modelo_id: l.modelo_id,
    ordem: i,
    nivel_override: l.nivel_override,
    texto_categoria: l.texto_categoria?.trim() || null,
    preco_override: l.preco_override,
    cta_override: l.cta_override,
    url_compra: l.url_compra?.trim() || null,
    destaque: !!l.destaque,
  }));
  if (linhas.length) {
    const { error } = await db.from(T_LAMINAS).upsert(linhas, { onConflict: 'landing_id,modelo_id' });
    if (error) throw error;
  }
  let remover = db.from(T_LAMINAS).delete().eq('landing_id', landingId);
  if (linhas.length) remover = remover.not('modelo_id', 'in', `(${linhas.map((l) => l.modelo_id).join(',')})`);
  const { error } = await remover;
  if (error) throw error;
}

/** Modelos públicos do catálogo (mesmo filtro de `carregarModelosPublicos`), para escolher no admin. */
export async function carregarModelosPublicosLanding(): Promise<ModeloLanding[]> {
  const { data, error } = await db
    .from('catalogo_modelos')
    .select(COLUNAS_MODELO)
    .eq('visivel_catalogo', true)
    .eq('visivel_publico', true)
    .order('nome_modelo', { ascending: true });
  if (error) throw error;
  return (data ?? []) as ModeloLanding[];
}

/** Sugestão do admin: modelos públicos que batem com casos de uso e porte, por família. */
export async function sugerirLaminas(filtros: FiltrosSugestao) {
  return sugerirModelos(await carregarModelosPublicosLanding(), filtros);
}

/** Envia capa ou mídia de passo para o bucket `landings` e devolve a URL pública. */
export async function enviarMidiaLanding(arquivo: File, pasta: string) {
  const nome = arquivo.name.replace(/[^\w.-]/g, '_');
  const caminho = `${pasta || 'geral'}/${Date.now()}-${Math.random().toString(36).slice(2, 8)}-${nome}`;
  const { error } = await supabase.storage
    .from(BUCKET_LANDINGS)
    .upload(caminho, arquivo, { upsert: false, contentType: arquivo.type });
  if (error) throw error;
  return {
    url: supabase.storage.from(BUCKET_LANDINGS).getPublicUrl(caminho).data.publicUrl,
    tipo: arquivo.type.startsWith('video/') ? ('video' as const) : ('imagem' as const),
  };
}

/** Visitas, fins e cliques por landing desde `desde` (padrão: 30 dias). Falha vira vazio. */
export async function carregarMetricas(desde?: Date): Promise<Record<string, MetricasLanding>> {
  const { data, error } = await db.rpc('landing_metricas', desde ? { _desde: desde.toISOString() } : {});
  if (error || !Array.isArray(data)) return {};
  const mapa: Record<string, MetricasLanding> = {};
  (data as MetricasLanding[]).forEach((m) => {
    mapa[m.landing_id] = {
      landing_id: m.landing_id,
      visitas: Number(m.visitas) || 0,
      fins: Number(m.fins) || 0,
      cliques_detalhes: Number(m.cliques_detalhes) || 0,
      cliques_montar: Number(m.cliques_montar) || 0,
      cliques_vendedor: Number(m.cliques_vendedor) || 0,
      cliques_quiz: Number(m.cliques_quiz) || 0,
    };
  });
  return mapa;
}
