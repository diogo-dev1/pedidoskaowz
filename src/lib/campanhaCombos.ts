import type { Database } from '@/integrations/supabase/types';
import type { CampanhaItem } from './campanhas';
import type { Extra, ItemExtra } from './campanhaExtras';

export type Combo = Database['public']['Tables']['campanha_combos']['Row'];
export type ComboExtra = Database['public']['Tables']['campanha_combo_extras']['Row'] & { campanha_extras: Extra | null };
export type ComboCompleto = Combo & { campanha_combo_extras: ComboExtra[] };
export interface OpcaoCombo { id: string; nome: string; descricao_curta: string | null; preco: number; destaque: boolean; brindes: Extra[]; implicito: boolean }
export function limparDescricao(texto: string | null | undefined): string {
  return (texto ?? '').replace(/^\s*descri[çc][ãa]o\s+do\s+produto\s*[:\-–—]?\s*/i, '').trim();
}
export function descricaoCurta(extra: Pick<Extra, 'descricao_curta' | 'descricao'>): string {
  return limparDescricao(extra.descricao_curta?.trim() || extra.descricao).split(/\r?\n/)[0].trim().slice(0, 80);
}
export function opcoesCombos(item: Pick<CampanhaItem, 'id' | 'valor'>, combos: ComboCompleto[], fixos: ItemExtra[]): OpcaoCombo[] {
  const lista = combos.filter(c => c.campanha_item_id === item.id).sort((a, b) => a.ordem - b.ordem || a.created_at.localeCompare(b.created_at));
  if (!lista.length) return [{ id: `implicito-${item.id}`, nome: 'Kit completo', descricao_curta: null, preco: item.valor ?? 0, destaque: true, implicito: true, brindes: fixos.filter(v => v.campanha_item_id === item.id && v.tipo === 'brinde').sort((a, b) => a.ordem - b.ordem).flatMap(v => v.campanha_extras ? [v.campanha_extras] : []) }];
  return lista.map(c => ({ id: c.id, nome: c.nome, descricao_curta: c.descricao_curta, preco: c.preco, destaque: c.destaque, implicito: false, brindes: [...c.campanha_combo_extras].sort((a, b) => a.ordem - b.ordem).flatMap(v => v.campanha_extras ? [v.campanha_extras] : []) }));
}
export const comboDestaque = (opcoes: OpcaoCombo[]) => opcoes.find(c => c.destaque) ?? opcoes[0];
export function valoresCombo(item: Pick<CampanhaItem, 'valor' | 'valor_de'>, combo: Pick<OpcaoCombo, 'preco' | 'brindes'>) {
  const valorBrindes = combo.brindes.reduce((total, e) => total + (e.preco ?? 0), 0);
  const valorDe = (item.valor_de ?? item.valor ?? 0) + valorBrindes;
  return { valorBrindes, valorDe, economia: Math.max(0, Math.round((valorDe - combo.preco) * 100) / 100) };
}
export const mensagemCombo = (titulo: string, combo: OpcaoCombo, campanha: string) => `Olá! Tenho interesse na ${titulo} – ${combo.nome}${combo.brindes.length ? ` (${combo.brindes.map(e => e.nome).join(' + ')})` : ''} por ${combo.preco.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })} (campanha ${campanha})`;