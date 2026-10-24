import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import type { Campanha, CampanhaItem } from '@/lib/campanhas';
import type { ItemExtra } from '@/lib/campanhaExtras';
import type { ComboCompleto } from '@/lib/campanhaCombos';

/**
 * Carrega uma campanha pública ativa com itens, extras e combos.
 * Com `aoVivo` (padrão), recarrega quando o admin edita ou quando a aba volta ao foco;
 * desligue em páginas de disparo para não abrir um WebSocket por visitante.
 */
export function useCampanhaOferta(slug: string | undefined, { aoVivo = true }: { aoVivo?: boolean } = {}) {
  const [campanha, setCampanha] = useState<Campanha | null>(null);
  const [ofertas, setOfertas] = useState<CampanhaItem[]>([]);
  const [extras, setExtras] = useState<ItemExtra[]>([]);
  const [combos, setCombos] = useState<ComboCompleto[]>([]);
  const [loading, setLoading] = useState(true);
  const [erro, setErro] = useState(false);
  useEffect(() => {
    let ativo = true;
    let pedido = 0;
    let carregou = false;
    setLoading(true);
    async function carregar() {
      // Só a resposta mais recente vale; recargas em segundo plano não trocam a página pela tela de erro.
      const meu = ++pedido;
      const valido = () => ativo && meu === pedido;
      const { data: c, error } = await supabase.from('campanhas_oferta').select('*').eq('slug', slug ?? '').eq('ativo', true).maybeSingle();
      if (!valido()) return;
      if (error) { if (!carregou) setErro(true); setLoading(false); return; }
      if (!c) { carregou = true; setCampanha(null); setOfertas([]); setLoading(false); setErro(false); return; }
      const { data, error: itensErro } = await supabase.from('campanha_itens').select('*').eq('campanha_id', c.id).eq('ativo', true).order('ordem').order('created_at');
      if (!valido()) return;
      const [v, co] = data?.length ? await Promise.all([supabase.from('campanha_item_extras').select('*, campanha_extras(*)').in('campanha_item_id', data.map(i => i.id)).order('ordem').order('created_at'), supabase.from('campanha_combos').select('*, campanha_combo_extras(*, campanha_extras(*))').in('campanha_item_id', data.map(i => i.id)).order('ordem').order('created_at')]) : [{ data: [], error: null }, { data: [], error: null }];
      if (!valido()) return;
      const falhou = !!itensErro || !!v.error || !!co.error;
      setLoading(false);
      if (falhou) { if (!carregou) setErro(true); return; }
      carregou = true;
      setExtras(v.data ?? []); setCombos(co.data ?? []);
      setCampanha(c); setOfertas(data ?? []); setErro(false);
    }
    void carregar();
    if (!aoVivo) return () => { ativo = false; };
    // focus e visibilitychange disparam juntos ao voltar para a aba: agrupa num só recarregamento.
    let espera: ReturnType<typeof setTimeout> | undefined;
    const foco = () => {
      if (document.visibilityState !== 'visible') return;
      clearTimeout(espera);
      espera = setTimeout(() => void carregar(), 300);
    };
    window.addEventListener('focus', foco); document.addEventListener('visibilitychange', foco);
    const canal = supabase.channel(`campanha-${slug}-${Math.random().toString(36).slice(2)}`).on('postgres_changes', { event: '*', schema: 'public', table: 'campanhas_oferta' }, foco).on('postgres_changes', { event: '*', schema: 'public', table: 'campanha_itens' }, foco).on('postgres_changes', { event: '*', schema: 'public', table: 'campanha_extras' }, foco).on('postgres_changes', { event: '*', schema: 'public', table: 'campanha_item_extras' }, foco).on('postgres_changes', { event: '*', schema: 'public', table: 'campanha_combos' }, foco).on('postgres_changes', { event: '*', schema: 'public', table: 'campanha_combo_extras' }, foco).subscribe();
    return () => { ativo = false; clearTimeout(espera); window.removeEventListener('focus', foco); document.removeEventListener('visibilitychange', foco); void supabase.removeChannel(canal); };
  }, [slug, aoVivo]);
  return { campanha, ofertas, extras, combos, loading, erro };
}
