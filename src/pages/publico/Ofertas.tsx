import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Search } from 'lucide-react';
import { OfertaCard, OfertaDetalheModal, type Oferta } from '@/components/ofertas/OfertaVisual';
export type { Oferta, MidiaOferta } from '@/components/ofertas/OfertaVisual';

export default function Ofertas() {
  const [ofertas, setOfertas] = useState<Oferta[]>([]);
  const [loading, setLoading] = useState(true);
  const [erro, setErro] = useState(false);
  const [busca, setBusca] = useState('');
  const [selecionada, setSelecionada] = useState<Oferta | null>(null);

  useEffect(() => {
    document.title = 'Novidades e Ofertas | Kaowz';

    let ativo = true;

    const carregarOfertas = async (mostrarCarregamento = false) => {
      if (mostrarCarregamento && ativo) setLoading(true);

      const { data, error } = await supabase
        .from('ofertas')
        .select('*')
        .eq('ativo', true)
        .order('ordem', { ascending: true });

      if (!ativo) return;

      if (error) {
        setErro(true);
        setLoading(false);
        return;
      }

       setOfertas((data as unknown as Oferta[]) || []);
      setErro(false);
      setLoading(false);
    };

    const atualizarAoRetornar = () => {
      if (document.visibilityState === 'visible') void carregarOfertas();
    };

    void carregarOfertas(true);
    window.addEventListener('focus', atualizarAoRetornar);
    document.addEventListener('visibilitychange', atualizarAoRetornar);

    const canal = supabase
      .channel('ofertas-publicas-atualizacao')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'ofertas' },
        () => void carregarOfertas(),
      )
      .subscribe();

    return () => {
      ativo = false;
      window.removeEventListener('focus', atualizarAoRetornar);
      document.removeEventListener('visibilitychange', atualizarAoRetornar);
      void supabase.removeChannel(canal);
    };
  }, []);

  const filtradas = ofertas.filter((o) => o.titulo.toLowerCase().includes(busca.toLowerCase()));

  return (
    <div className="min-h-screen bg-zinc-950 overflow-x-hidden max-w-[100vw]">
      <header className="bg-black border-b border-white/10 sticky top-0 z-40">
        <div className="w-full max-w-7xl mx-auto px-3 sm:px-4 py-3 md:py-4">
          <div className="flex flex-col md:flex-row items-center justify-between gap-3 md:gap-4">
            <h1 className="text-lg md:text-3xl font-bold text-white tracking-tight">
               <span className="text-accent">NOVIDADES</span>
            </h1>
            <div className="flex gap-2 w-full md:w-auto">
              <div className="relative flex-1 md:w-80">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 md:h-4 md:w-4 text-white/40" />
                <Input
                  placeholder="Buscar oferta..."
                  value={busca}
                  onChange={(e) => setBusca(e.target.value)}
                  className="pl-9 md:pl-10 text-sm md:text-base bg-white/5 border-white/20 text-white placeholder:text-white/40 focus:border-accent h-9 md:h-10"
                />
              </div>
            </div>
          </div>
        </div>
      </header>

      <div className="w-full bg-gradient-to-r from-emerald-950/30 via-zinc-900/50 to-emerald-950/30 border-b border-emerald-800/20">
        <div className="max-w-7xl mx-auto px-3 sm:px-4 py-2 flex items-center justify-center gap-2">
          <span className="text-emerald-400 text-sm">🛡️</span>
          <span className="text-zinc-400 text-xs">
            Garantia Vitalícia de qualidade e manutenção de afiação em todas as nossas lâminas
          </span>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-3 sm:px-4 py-6">
        {loading ? (
          <div className="grid grid-cols-2 lg:grid-cols-3 gap-1.5 md:gap-4">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="bg-zinc-800 border border-zinc-700 rounded-lg p-3 animate-pulse">
                <div className="aspect-[3/4] bg-zinc-700 rounded-lg mb-2" />
                <div className="h-3 bg-zinc-700 rounded mb-1.5" />
                <div className="h-5 bg-zinc-700 rounded w-1/2" />
              </div>
            ))}
          </div>
        ) : erro ? (
          <div className="py-20 text-center">
            <p className="mb-3 text-sm text-zinc-400">Não foi possível atualizar as ofertas.</p>
            <Button variant="outline" onClick={() => window.location.reload()}>
              Tentar novamente
            </Button>
          </div>
        ) : filtradas.length === 0 ? (
          <p className="text-center text-zinc-400 py-20">Nenhuma oferta disponível no momento</p>
        ) : (
          <div className="grid grid-cols-2 lg:grid-cols-3 gap-1.5 md:gap-4">
            {filtradas.map((o) => (
              <OfertaCard key={o.id} o={o} onOpen={() => setSelecionada(o)} />
            ))}
          </div>
        )}
      </div>
      <OfertaDetalheModal oferta={selecionada} onClose={() => setSelecionada(null)} />
    </div>
  );
}
