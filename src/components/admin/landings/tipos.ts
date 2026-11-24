import type { LaminaEdicao, LandingEdicao, ModeloLanding, TipoMidia } from '@/lib/landings';

/** Opção "padrão" dos selects (o Radix Select não aceita valor vazio). */
export const PADRAO = '__padrao__';

export interface PassoEdicao {
  id: string;
  titulo: string;
  texto: string | null;
  midia_url: string | null;
  midia_tipo: TipoMidia;
  foco: string | null;
}

/** Lâmina no editor: o que é gravado + o modelo do catálogo para mostrar foto, nome e preço. */
export interface LaminaEditor extends LaminaEdicao {
  modelo: ModeloLanding | null;
}

export const novoPasso = (): PassoEdicao => ({
  id: crypto.randomUUID(),
  titulo: '',
  texto: null,
  midia_url: null,
  midia_tipo: 'imagem',
  foco: null,
});

export const landingVazia = (): LandingEdicao => ({
  slug: '',
  titulo: '',
  frase_abertura: null,
  subtitulo: null,
  capa_url: null,
  capa_tipo: 'imagem',
  publicada: false,
  ordem: 0,
  filtro_casos_uso: [],
  filtro_tipo_porte: [],
  texto_nivel_entrada: null,
  texto_nivel_ideal: null,
  texto_nivel_definitiva: null,
  preco_entrada: 'mostrar',
  preco_ideal: 'a_partir',
  preco_definitiva: 'consulta',
  cta_entrada: 'detalhes',
  cta_ideal: 'montar',
  cta_definitiva: 'vendedor',
  mensagem_whatsapp: null,
});

export type AtualizarLanding = <K extends keyof LandingEdicao>(campo: K, valor: LandingEdicao[K]) => void;
