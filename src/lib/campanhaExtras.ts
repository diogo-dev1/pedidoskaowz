import type { Database } from '@/integrations/supabase/types';
import type { ProdutoCampanha } from './campanhas';

export type Extra = Database['public']['Tables']['campanha_extras']['Row'];
export type VinculoExtra = Database['public']['Tables']['campanha_item_extras']['Row'];
export type ItemExtra = VinculoExtra & { campanha_extras: Extra | null };
export type TipoExtra = 'brinde' | 'upsell';
export function nomeCurtoExtra(extra: { nome: string; nome_curto?: string | null }): string {
  if (extra.nome_curto?.trim()) return extra.nome_curto.trim();
  return extra.nome.split(/\s+[-–—]\s*|[-–—]/)[0].trim().split(/\s+/).slice(0, 2).join(' ');
}
export function precoExtra(v: ItemExtra): number | null {
  if (v.tipo === 'brinde') return 0;
  const normal = v.campanha_extras?.preco ?? null;
  return v.preco_campanha != null && (normal == null || v.preco_campanha < normal) ? v.preco_campanha : normal;
}
export const extrasDoItem = (lista: ItemExtra[], id: string, tipo: TipoExtra) => lista.filter(v => v.campanha_item_id === id && v.tipo === tipo && v.campanha_extras).sort((a, b) => a.ordem - b.ordem || a.created_at.localeCompare(b.created_at));
export const nomesBrindes = (lista: ItemExtra[]) => lista.map(v => v.campanha_extras?.nome).filter(Boolean).join(' + ');
export function atualizacaoExtraDoSite(p: ProdutoCampanha) {
  return { preco: p.preco, imagem_url: p.imagens[0] ?? null, link: p.link };
}