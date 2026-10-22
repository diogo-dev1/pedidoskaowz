import type { Database } from '@/integrations/supabase/types';
import type { Oferta, MidiaOferta } from '@/components/ofertas/OfertaVisual';

export type Campanha = Database['public']['Tables']['campanhas_oferta']['Row'];
export type CampanhaItem = Database['public']['Tables']['campanha_itens']['Row'];
export interface ProdutoCampanha { produtoId: string; titulo: string; descricao: string; imagens: string[]; preco: number; precoDe: number | null; link: string; disponivel: boolean }
export const linkCampanha = (slug: string) => `https://pedidoskaowz.lovable.app/ofertas/${encodeURIComponent(slug)}`;
export const moeda = (n: number) => n.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
export function ofertaDoItem(item: CampanhaItem, campanha: Campanha): Oferta {
  return { ...item, midias: item.midias as unknown as MidiaOferta[], imagens: [], etiqueta: null, condicoes: null,
    texto_pix: item.texto_pix?.trim() || campanha.texto_pix_padrao,
    texto_parcelamento: item.texto_parcelamento?.trim() || campanha.texto_parcelamento_padrao };
}
export function atualizacaoDoSite(p: ProdutoCampanha) {
  return { valor: p.preco, valor_de: p.precoDe, midias: p.imagens.map(url => ({ url, tipo: 'imagem' })), link_produto: p.link };
}