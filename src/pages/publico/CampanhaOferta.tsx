import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { OfertaCard, OfertaDetalheModal, type Oferta } from '@/components/ofertas/OfertaVisual';
import { type Campanha, moeda, ofertaDoItem } from '@/lib/campanhas';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Clock, Search } from 'lucide-react';
import { type ItemExtra, extrasDoItem, nomesBrindes } from '@/lib/campanhaExtras';
import { BrindesFaixa, CampanhaExtrasPublicos } from '@/components/ofertas/CampanhaExtrasPublicos';

export default function CampanhaOferta() {
  const { slug } = useParams();
  const [campanha, setCampanha] = useState<Campanha | null>(null);
  const [ofertas, setOfertas] = useState<Oferta[]>([]);
  const [loading, setLoading] = useState(true);
  const [erro, setErro] = useState(false);
  const [busca, setBusca] = useState('');
  const [selecionada, setSelecionada] = useState<Oferta | null>(null);
  const [extras, setExtras] = useState<ItemExtra[]>([]);
  useEffect(() => {
    let ativo = true;
    setLoading(true); setSelecionada(null);
    async function carregar() {
      const { data: c, error } = await supabase.from('campanhas_oferta').select('*').eq('slug', slug ?? '').eq('ativo', true).maybeSingle();
      if (!ativo) return;
      if (error) { setErro(true); setLoading(false); return; }
      if (!c) { setCampanha(null); setOfertas([]); setLoading(false); setErro(false); document.title = 'Campanha indisponível | Kaowz'; return; }
      const { data, error: itensErro } = await supabase.from('campanha_itens').select('*').eq('campanha_id', c.id).eq('ativo', true).order('ordem').order('created_at');
      if (!ativo) return;
      const { data: vinculos, error: extrasErro } = data?.length ? await supabase.from('campanha_item_extras').select('*, campanha_extras(*)').in('campanha_item_id', data.map(i => i.id)).order('ordem').order('created_at') : { data: [], error: null };
      if (!ativo) return;
      setExtras(vinculos ?? []);
      setCampanha(c); setOfertas((data ?? []).map(i => ofertaDoItem(i, c))); setErro(!!itensErro || !!extrasErro); setLoading(false);
      document.title = `${c.titulo} | Kaowz`;
      setSelecionada(prev => prev ? (data ?? []).filter(i => i.id === prev.id).map(i => ofertaDoItem(i, c))[0] ?? null : null);
    }
    const foco = () => { if (document.visibilityState === 'visible') void carregar(); };
    void carregar(); window.addEventListener('focus', foco); document.addEventListener('visibilitychange', foco);
    const canal = supabase.channel(`campanha-${slug}`).on('postgres_changes', { event: '*', schema: 'public', table: 'campanhas_oferta' }, foco).on('postgres_changes', { event: '*', schema: 'public', table: 'campanha_itens' }, foco).on('postgres_changes', { event: '*', schema: 'public', table: 'campanha_extras' }, foco).on('postgres_changes', { event: '*', schema: 'public', table: 'campanha_item_extras' }, foco).subscribe();
    return () => { ativo = false; window.removeEventListener('focus', foco); document.removeEventListener('visibilitychange', foco); void supabase.removeChannel(canal); };
  }, [slug]);
  const brindes = (id: string) => extrasDoItem(extras, id, 'brinde');
  const mensagem = (o: Oferta) => `Olá! Tenho interesse na ${o.titulo} - ${moeda(Number(o.valor ?? 0))}${brindes(o.id).length ? ` (com brinde: ${nomesBrindes(brindes(o.id))})` : ''} (campanha ${campanha?.titulo})`;
  return <div className="oferta-publica min-h-screen overflow-x-hidden max-w-[100vw] bg-[hsl(var(--oferta-fundo))] text-[hsl(var(--oferta-texto))]">
    <header className="sticky top-0 z-40 border-b border-[hsl(var(--oferta-texto)/0.1)] bg-[hsl(var(--oferta-preto))]">
      <div className="max-w-7xl mx-auto px-3 sm:px-4 py-3 md:py-4 flex flex-col md:flex-row items-center justify-between gap-3 md:gap-4">
        <div className="min-w-0 text-center md:text-left"><h1 className="text-lg md:text-3xl font-bold text-accent break-words">{campanha?.titulo ?? 'Campanhas de oferta'}</h1>{campanha?.subtitulo && <p className="text-xs mt-1 text-[hsl(var(--oferta-muted))]">{campanha.subtitulo}</p>}</div>
        <div className="relative w-full md:w-80 shrink-0"><Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 opacity-40"/><Input aria-label="Buscar oferta" placeholder="Buscar oferta..." value={busca} onChange={e => setBusca(e.target.value)} className="pl-9 h-9 md:h-10 bg-[hsl(var(--oferta-texto)/0.05)] border-[hsl(var(--oferta-texto)/0.2)] text-[hsl(var(--oferta-texto))] placeholder:text-[hsl(var(--oferta-texto)/0.4)]"/></div>
      </div>
    </header>
    {campanha?.aviso_prazo && <div className="border-b border-accent/20 bg-accent/10 px-3 py-2 flex justify-center items-center gap-2 text-sm text-accent"><Clock className="h-4 w-4 shrink-0"/>{campanha.aviso_prazo}</div>}
    <div className="oferta-garantia border-b"><div className="max-w-7xl mx-auto px-3 sm:px-4 py-2 flex justify-center items-center gap-2"><span className="text-sm">🛡️</span><span className="text-xs text-[hsl(var(--oferta-muted))]">Garantia Vitalícia de qualidade e manutenção de afiação em todas as nossas lâminas</span></div></div>
    <main className="max-w-7xl mx-auto px-3 sm:px-4 py-6">
      {loading ? <p className="py-20 text-center text-sm">Carregando…</p> : erro ? <div className="py-20 text-center"><p className="mb-3">Não foi possível atualizar a campanha.</p><Button onClick={() => window.location.reload()}>Tentar novamente</Button></div> : !campanha ? <div className="py-20 text-center space-y-4"><p>Esta campanha não está disponível no momento.</p><Button asChild><Link to="/ofertas">Ver Novidades e Ofertas</Link></Button></div> : ofertas.length === 0 ? <p className="text-center py-20 text-[hsl(var(--oferta-muted))]">Em breve, novos produtos nesta campanha.</p> : <div className="grid grid-cols-2 lg:grid-cols-3 gap-1.5 md:gap-4">{ofertas.filter(o => o.titulo.toLowerCase().includes(busca.toLowerCase())).map(o => <OfertaCard key={o.id} o={o} onOpen={() => setSelecionada(o)} mensagemWhatsApp={mensagem} abaixoDoPreco={<BrindesFaixa lista={brindes(o.id)}/>}/>)}</div>}
    </main><OfertaDetalheModal oferta={selecionada} onClose={() => setSelecionada(null)} mensagemWhatsApp={mensagem} extras={selecionada && <CampanhaExtrasPublicos brindes={brindes(selecionada.id)} upsells={extrasDoItem(extras, selecionada.id, 'upsell')} produto={selecionada.titulo}/>}/>
  </div>;
}