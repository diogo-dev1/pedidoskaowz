/* ════════════════════════════════════════════════════════════════
   Landings por categoria — tipos e regras de exibição.

   Módulo puro (sem Supabase, sem React) para poder ser testado com
   `npx tsx --test src/lib/landingsRegras.test.ts`. O acesso ao banco
   fica em `landings.ts`, que reexporta tudo daqui.
   ════════════════════════════════════════════════════════════════ */

/* ─────────── Vocabulário (mesmos valores dos CHECKs da migration) ─────────── */

export type NivelLanding = 'entrada' | 'ideal' | 'definitiva';
export type ExibicaoPreco = 'mostrar' | 'a_partir' | 'consulta';
export type TipoCta = 'detalhes' | 'montar' | 'vendedor';
export type TipoMidia = 'imagem' | 'video';
export type EventoLanding = 'visita' | 'fim_scroll' | 'clique_cta';
/** CTAs que geram evento: os três dos cards e o "Fazer o quiz" do fechamento. */
export type CtaEvento = TipoCta | 'quiz';

export const NIVEIS: NivelLanding[] = ['entrada', 'ideal', 'definitiva'];
export const EXIBICOES_PRECO: ExibicaoPreco[] = ['mostrar', 'a_partir', 'consulta'];
export const TIPOS_CTA: TipoCta[] = ['detalhes', 'montar', 'vendedor'];

export const NIVEL_LABEL: Record<NivelLanding, string> = {
  entrada: 'Entrada',
  ideal: 'Ideal',
  definitiva: 'Definitiva',
};

export const PRECO_LABEL: Record<ExibicaoPreco, string> = {
  mostrar: 'Mostrar o preço',
  a_partir: '"A partir de" + preço',
  consulta: 'Valor sob consulta',
};

/** Rótulo do botão na página pública. */
export const CTA_LABEL: Record<TipoCta, string> = {
  detalhes: 'Ver detalhes',
  montar: 'Montar a minha',
  vendedor: 'Falar com um vendedor',
};

/** Rótulo do CTA no admin (explica para onde o botão leva). */
export const CTA_LABEL_ADMIN: Record<TipoCta, string> = {
  detalhes: 'Ver detalhes (loja ou catálogo)',
  montar: 'Montar no configurador',
  vendedor: 'Falar com vendedor (WhatsApp)',
};

export const PADRAO_PRECO: Record<NivelLanding, ExibicaoPreco> = {
  entrada: 'mostrar',
  ideal: 'a_partir',
  definitiva: 'consulta',
};

export const PADRAO_CTA: Record<NivelLanding, TipoCta> = {
  entrada: 'detalhes',
  ideal: 'montar',
  definitiva: 'vendedor',
};

export const MENSAGEM_WHATSAPP_PADRAO = 'Olá! Vi uma página da Kaowz e quero saber mais';

const ehNivel = (v: unknown): v is NivelLanding => NIVEIS.includes(v as NivelLanding);
const ehPreco = (v: unknown): v is ExibicaoPreco => EXIBICOES_PRECO.includes(v as ExibicaoPreco);
const ehCta = (v: unknown): v is TipoCta => TIPOS_CTA.includes(v as TipoCta);

/* ─────────── Linhas do banco ─────────── */

export interface Landing {
  id: string;
  slug: string;
  titulo: string;
  frase_abertura: string | null;
  subtitulo: string | null;
  capa_url: string | null;
  capa_tipo: TipoMidia;
  publicada: boolean;
  ordem: number;
  filtro_casos_uso: string[];
  filtro_tipo_porte: string[];
  texto_nivel_entrada: string | null;
  texto_nivel_ideal: string | null;
  texto_nivel_definitiva: string | null;
  preco_entrada: ExibicaoPreco;
  preco_ideal: ExibicaoPreco;
  preco_definitiva: ExibicaoPreco;
  cta_entrada: TipoCta;
  cta_ideal: TipoCta;
  cta_definitiva: TipoCta;
  mensagem_whatsapp: string | null;
  created_at?: string;
  updated_at?: string;
}

export interface LandingPasso {
  id: string;
  landing_id: string;
  ordem: number;
  titulo: string;
  texto: string | null;
  midia_url: string | null;
  midia_tipo: TipoMidia;
  foco: string | null;
}

export interface LandingLamina {
  id: string;
  landing_id: string;
  modelo_id: string;
  ordem: number;
  nivel_override: NivelLanding | null;
  texto_categoria: string | null;
  preco_override: ExibicaoPreco | null;
  cta_override: TipoCta | null;
  url_compra: string | null;
  destaque: boolean;
}

/** Subconjunto de `catalogo_modelos` que a landing usa. */
export interface ModeloLanding {
  id: string;
  nome_modelo: string;
  preco_base: number;
  imagem_modelo: string | null;
  video_url: string | null;
  posicao_escada: string | null;
  grupo_escada: string | null;
  casos_uso: string[] | null;
  tipo_porte: string[] | null;
  porque_texto: string | null;
  apresentacao_venda: string | null;
  prazo_entrega: string | null;
  garantia: string | null;
  pronta_entrega: boolean | null;
  visivel_catalogo: boolean;
  visivel_publico: boolean;
}

/** Colunas pedidas no join com `catalogo_modelos` (mesma ordem da interface). */
export const COLUNAS_MODELO =
  'id,nome_modelo,preco_base,imagem_modelo,video_url,posicao_escada,grupo_escada,casos_uso,tipo_porte,' +
  'porque_texto,apresentacao_venda,prazo_entrega,garantia,pronta_entrega,visivel_catalogo,visivel_publico';

export interface DestinoCta {
  href: string;
  /** Abre em nova aba (loja e WhatsApp); interno usa o roteador. */
  externo: boolean;
}

/** Lâmina com nível, preço e CTA já decididos — o que a página desenha. */
export interface LaminaResolvida {
  id: string;
  ordem: number;
  modelo: ModeloLanding;
  nivel: NivelLanding;
  texto: string;
  exibicaoPreco: ExibicaoPreco;
  precoTexto: string;
  cta: TipoCta;
  ctaLabel: string;
  destino: DestinoCta;
  destaque: boolean;
}

/* ─────────── Regras de resolução (uma função pura cada) ─────────── */

/** Mesmo filtro de `carregarModelosPublicos()`: visível no catálogo e no público. */
export const modeloEhPublico = (m: Pick<ModeloLanding, 'visivel_catalogo' | 'visivel_publico'> | null | undefined) =>
  !!m && m.visivel_catalogo === true && m.visivel_publico === true;

/** nível = override da landing → posição na escada do modelo → 'ideal'. */
export function nivelEfetivo(
  lamina: Pick<LandingLamina, 'nivel_override'>,
  modelo: Pick<ModeloLanding, 'posicao_escada'>,
): NivelLanding {
  if (ehNivel(lamina.nivel_override)) return lamina.nivel_override;
  if (ehNivel(modelo.posicao_escada)) return modelo.posicao_escada;
  return 'ideal';
}

const ENTIDADES: Record<string, string> = {
  '&nbsp;': ' ', '&amp;': '&', '&lt;': '<', '&gt;': '>', '&quot;': '"', '&#39;': "'", '&apos;': "'",
};

/** Remove tags e entidades simples de HTML e junta os espaços. */
export function textoSemHtml(html: string | null | undefined): string {
  if (!html) return '';
  return html
    .replace(/<\s*(br|\/p|\/div|\/li|\/h[1-6])\s*\/?>/gi, ' ')
    .replace(/<[^>]*>/g, '')
    .replace(/&[a-z#0-9]+;/gi, (e) => ENTIDADES[e.toLowerCase()] ?? ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

/** texto = texto desta categoria → "porquê" do modelo → apresentação de venda (sem HTML). */
export function textoEfetivo(
  lamina: Pick<LandingLamina, 'texto_categoria'>,
  modelo: Pick<ModeloLanding, 'porque_texto' | 'apresentacao_venda'>,
): string {
  return (
    lamina.texto_categoria?.trim() ||
    modelo.porque_texto?.trim() ||
    textoSemHtml(modelo.apresentacao_venda)
  );
}

/** Padrão do nível configurado na landing (com fallback para o padrão do sistema). */
export function precoPadraoDoNivel(landing: Pick<Landing, 'preco_entrada' | 'preco_ideal' | 'preco_definitiva'>, nivel: NivelLanding): ExibicaoPreco {
  const valor = landing[`preco_${nivel}`];
  return ehPreco(valor) ? valor : PADRAO_PRECO[nivel];
}

export function ctaPadraoDoNivel(landing: Pick<Landing, 'cta_entrada' | 'cta_ideal' | 'cta_definitiva'>, nivel: NivelLanding): TipoCta {
  const valor = landing[`cta_${nivel}`];
  return ehCta(valor) ? valor : PADRAO_CTA[nivel];
}

/** exibição de preço = override da lâmina → padrão do nível na landing. */
export function exibicaoPrecoEfetiva(
  lamina: Pick<LandingLamina, 'preco_override'>,
  landing: Pick<Landing, 'preco_entrada' | 'preco_ideal' | 'preco_definitiva'>,
  nivel: NivelLanding,
): ExibicaoPreco {
  return ehPreco(lamina.preco_override) ? lamina.preco_override : precoPadraoDoNivel(landing, nivel);
}

/** CTA = override da lâmina → padrão do nível na landing. */
export function ctaEfetivo(
  lamina: Pick<LandingLamina, 'cta_override'>,
  landing: Pick<Landing, 'cta_entrada' | 'cta_ideal' | 'cta_definitiva'>,
  nivel: NivelLanding,
): TipoCta {
  return ehCta(lamina.cta_override) ? lamina.cta_override : ctaPadraoDoNivel(landing, nivel);
}

export const formatarBRL = (valor: number) =>
  valor.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

/** "R$ 1.090,00" · "a partir de R$ 1.090,00" · "Valor sob consulta". Sem valor válido vira consulta. */
export function formatarPreco(exibicao: ExibicaoPreco, valor: number | null | undefined): string {
  const numero = Number(valor);
  if (exibicao === 'consulta' || !Number.isFinite(numero) || numero <= 0) return 'Valor sob consulta';
  return exibicao === 'a_partir' ? `a partir de ${formatarBRL(numero)}` : formatarBRL(numero);
}

/** Mensagem do WhatsApp para uma lâmina: mensagem da landing + " — " + nome da lâmina. */
export const mensagemVendedor = (mensagemLanding: string | null | undefined, nomeModelo?: string) => {
  const base = mensagemLanding?.trim() || MENSAGEM_WHATSAPP_PADRAO;
  return nomeModelo ? `${base} — ${nomeModelo}` : base;
};

/**
 * Destino do CTA.
 * - detalhes: URL de compra da loja, senão a página do catálogo (/catalogo/:id)
 * - montar: configurador já com o modelo escolhido
 * - vendedor: WhatsApp com a mensagem da landing e o nome da lâmina
 * `linkWhatsApp` é injetado para este módulo não depender do Supabase.
 */
export function destinoCta(
  cta: TipoCta,
  contexto: {
    modelo: Pick<ModeloLanding, 'id' | 'nome_modelo'>;
    urlCompra?: string | null;
    mensagemWhatsapp?: string | null;
    linkWhatsApp: (mensagem: string) => string;
  },
): DestinoCta {
  const { modelo } = contexto;
  if (cta === 'detalhes') {
    const url = contexto.urlCompra?.trim();
    return url ? { href: url, externo: true } : { href: `/catalogo/${modelo.id}`, externo: false };
  }
  if (cta === 'montar') {
    return { href: `/montar?modelo=${encodeURIComponent(modelo.nome_modelo)}`, externo: false };
  }
  return { href: contexto.linkWhatsApp(mensagemVendedor(contexto.mensagemWhatsapp, modelo.nome_modelo)), externo: true };
}

/** Junta tudo: a lâmina pronta para desenhar. */
export function resolverLamina(
  landing: Landing,
  lamina: LandingLamina,
  modelo: ModeloLanding,
  linkWhatsApp: (mensagem: string) => string,
): LaminaResolvida {
  const nivel = nivelEfetivo(lamina, modelo);
  const exibicaoPreco = exibicaoPrecoEfetiva(lamina, landing, nivel);
  const cta = ctaEfetivo(lamina, landing, nivel);
  return {
    id: lamina.id,
    ordem: lamina.ordem,
    modelo,
    nivel,
    texto: textoEfetivo(lamina, modelo),
    exibicaoPreco,
    precoTexto: formatarPreco(exibicaoPreco, modelo.preco_base),
    cta,
    ctaLabel: CTA_LABEL[cta],
    destino: destinoCta(cta, {
      modelo,
      urlCompra: lamina.url_compra,
      mensagemWhatsapp: landing.mensagem_whatsapp,
      linkWhatsApp,
    }),
    destaque: !!lamina.destaque,
  };
}

/** Separa por nível, cada nível na ordem definida no admin. Nível vazio fica como []. */
export function agruparPorNivel<T extends { nivel: NivelLanding; ordem: number }>(laminas: T[]): Record<NivelLanding, T[]> {
  const grupos: Record<NivelLanding, T[]> = { entrada: [], ideal: [], definitiva: [] };
  laminas.forEach((l) => grupos[l.nivel].push(l));
  NIVEIS.forEach((n) => grupos[n].sort((a, b) => a.ordem - b.ordem));
  return grupos;
}

/** Primeira lâmina de cada nível que tem lâmina — o comparativo só aparece com 2 ou mais. */
export function comparativo<T extends { nivel: NivelLanding; ordem: number }>(laminas: T[]): T[] {
  const grupos = agruparPorNivel(laminas);
  return NIVEIS.map((n) => grupos[n][0]).filter((l): l is T => !!l);
}

/* ─────────── Admin ─────────── */

/** "Porte velado" → "porte-velado" (mesmo formato do CHECK do banco). */
export function gerarSlug(texto: string): string {
  return texto
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 80)
    .replace(/-+$/g, '');
}

export const slugValido = (slug: string) => /^[a-z0-9]+(-[a-z0-9]+)*$/.test(slug);

export interface FiltrosSugestao {
  casosUso: string[];
  tiposPorte: string[];
}

/** Modelo bate com os filtros: precisa de um caso de uso E de um porte, quando cada filtro tem valores. */
export function bateComFiltros(m: Pick<ModeloLanding, 'casos_uso' | 'tipo_porte'>, f: FiltrosSugestao): boolean {
  const usos = m.casos_uso ?? [];
  const portes = m.tipo_porte ?? [];
  const okUso = f.casosUso.length === 0 || f.casosUso.some((u) => usos.includes(u));
  const okPorte = f.tiposPorte.length === 0 || f.tiposPorte.some((p) => portes.includes(p));
  return okUso && okPorte;
}

export const SEM_GRUPO = 'Sem família';

/** Agrupa por família (`grupo_escada`); famílias em ordem alfabética, "Sem família" por último. */
export function agruparPorGrupo<T extends Pick<ModeloLanding, 'grupo_escada' | 'nome_modelo'>>(modelos: T[]): { grupo: string; modelos: T[] }[] {
  const mapa = new Map<string, T[]>();
  modelos.forEach((m) => {
    const g = m.grupo_escada?.trim() || SEM_GRUPO;
    mapa.set(g, [...(mapa.get(g) ?? []), m]);
  });
  return [...mapa.entries()]
    .sort(([a], [b]) => (a === SEM_GRUPO ? 1 : b === SEM_GRUPO ? -1 : a.localeCompare(b, 'pt-BR')))
    .map(([grupo, lista]) => ({ grupo, modelos: [...lista].sort((x, y) => x.nome_modelo.localeCompare(y.nome_modelo, 'pt-BR')) }));
}

/** Sugestão do admin: modelos públicos que batem com os filtros, agrupados por família. */
export function sugerirModelos<T extends ModeloLanding>(modelos: T[], filtros: FiltrosSugestao) {
  return agruparPorGrupo(modelos.filter((m) => modeloEhPublico(m) && bateComFiltros(m, filtros)));
}

/* ─────────── Métricas ─────────── */

export interface MetricasLanding {
  landing_id: string;
  visitas: number;
  fins: number;
  cliques_detalhes: number;
  cliques_montar: number;
  cliques_vendedor: number;
  cliques_quiz: number;
}

export const totalCliques = (m: MetricasLanding | undefined) =>
  m ? m.cliques_detalhes + m.cliques_montar + m.cliques_vendedor + m.cliques_quiz : 0;

/** % de visitas que chegaram ao fim, arredondado. Sem visita → null (mostra "—"). */
export const taxaFim = (m: MetricasLanding | undefined) =>
  m && m.visitas > 0 ? Math.round((Math.min(m.fins, m.visitas) / m.visitas) * 100) : null;
