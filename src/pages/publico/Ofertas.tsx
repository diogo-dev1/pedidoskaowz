import { useEffect, useRef, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Search, MessageCircle, ExternalLink, ChevronLeft, ChevronRight, Play } from 'lucide-react';
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog';

const WHATSAPP = '5528999025695';
const BRL = (n: number) => n.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

export interface Oferta {
  id: string;
  titulo: string;
  descricao: string | null;
  etiqueta: string | null;
  valor: number | null;
  valor_de: number | null;
  condicoes: string | null;
  texto_pix: string | null;
  texto_parcelamento: string | null;
  selos: string[];
  link_produto: string | null;
  imagens: string[];
  midias: MidiaOferta[];
  bordao_modal: string | null;
  ordem: number;
  ativo: boolean;
}

export interface MidiaOferta {
  url: string;
  tipo: 'imagem' | 'video';
}

function midiasDaOferta(o: Oferta): MidiaOferta[] {
  if (Array.isArray(o.midias) && o.midias.length) return o.midias;
  return (o.imagens || []).map((url) => ({ url, tipo: 'imagem' as const }));
}

function Midia({ item, titulo, ativa, className = '' }: { item: MidiaOferta; titulo: string; ativa: boolean; className?: string }) {
  return item.tipo === 'video' ? (
    <video
      src={item.url}
      aria-label={`Vídeo de ${titulo}`}
      className={className}
      muted
      loop
      playsInline
      autoPlay={ativa}
      preload={ativa ? 'metadata' : 'none'}
    />
  ) : (
    <img src={item.url} alt={titulo} loading="lazy" className={className} />
  );
}

function OfertaCard({ o, onOpen }: { o: Oferta; onOpen: () => void }) {
  const midias = midiasDaOferta(o);
  const [idx, setIdx] = useState(0);
  const timer = useRef<ReturnType<typeof setInterval> | null>(null);
  const touchX = useRef<number | null>(null);

  useEffect(() => () => { if (timer.current) clearInterval(timer.current); }, []);

  const onEnter = () => {
    if (midias.length < 2) return;
    if (midias.length === 2) { setIdx(1); return; }
    setIdx(1);
    if (timer.current) clearInterval(timer.current);
    timer.current = setInterval(() => setIdx((i) => (i + 1) % midias.length), 2500);
  };

  const onLeave = () => {
    if (timer.current) { clearInterval(timer.current); timer.current = null; }
    setIdx(0);
  };

  const onTouchStart = (e: React.TouchEvent) => { touchX.current = e.touches[0].clientX; };
  const onTouchEnd = (e: React.TouchEvent) => {
    if (touchX.current === null || midias.length < 2) return;
    const dx = e.changedTouches[0].clientX - touchX.current;
    if (Math.abs(dx) > 40) {
      setIdx((i) => (dx < 0 ? (i + 1) % midias.length : (i - 1 + midias.length) % midias.length));
    }
    touchX.current = null;
  };

  const msg = `Olá! Tenho interesse nesta oferta: ${o.titulo}${o.valor ? ` - ${BRL(Number(o.valor))}` : ''}`;
  const temLink = !!o.link_produto;

  return (
    <div
      className="group relative overflow-hidden rounded-lg transition-all cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
      onClick={onOpen}
      onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') onOpen(); }}
      role="button"
      tabIndex={0}
      aria-label={`Ver detalhes de ${o.titulo}`}
    >
      <div className="absolute top-0 right-0 w-full h-1 bg-gradient-to-r from-transparent via-accent/50 to-accent z-10" />

      <div className="bg-zinc-800 border border-zinc-700 hover:border-accent hover:shadow-lg transition-all rounded-lg overflow-hidden h-full flex flex-col">
        <div
          className="relative"
          onMouseEnter={onEnter}
          onMouseLeave={onLeave}
          onTouchStart={onTouchStart}
          onTouchEnd={onTouchEnd}
        >
          <div className="aspect-[3/4] overflow-hidden bg-zinc-700 relative">
            {midias.length ? (
              midias.map((item, i) => (
                <div key={item.url + i} className={`absolute inset-0 transition-opacity duration-300 ${i === idx ? 'opacity-100' : 'opacity-0'}`}>
                  <Midia item={item} titulo={o.titulo} ativa={i === idx} className="h-full w-full object-cover" />
                  {item.tipo === 'video' && <Play className="absolute bottom-2 right-2 h-5 w-5 rounded-full bg-zinc-950/70 p-1 text-white" />}
                </div>
              ))
            ) : (
              <div className="flex h-full w-full items-center justify-center text-zinc-500 text-xs">Sem imagem</div>
            )}

            {midias.length > 1 && (
              <div className="absolute bottom-2 left-0 right-0 z-20 flex justify-center gap-1">
                {midias.map((_, i) => (
                  <span
                    key={i}
                    className={`h-1.5 w-1.5 rounded-full transition-colors ${i === idx ? 'bg-accent' : 'bg-white/40'}`}
                  />
                ))}
              </div>
            )}

            {o.selos?.length > 0 && (
              <div className="absolute left-2 top-2 z-20 flex max-w-[calc(100%-1rem)] flex-col items-start gap-1">
                {o.selos.map((selo, i) => (
                  <Badge
                    key={`${selo}-${i}`}
                    className="max-w-full truncate rounded border-0 bg-accent px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wide text-white md:text-[10px]"
                  >
                    {selo}
                  </Badge>
                ))}
              </div>
            )}
          </div>

          {o.etiqueta && (
            <Badge className="absolute bottom-3 left-3 z-20 border-0 bg-accent text-[10px] text-white">
              {o.etiqueta}
            </Badge>
          )}
        </div>

        <div className="flex flex-1 flex-col gap-1 p-2 md:p-4">
          <h3 className="line-clamp-1 text-sm font-bold text-white md:text-base">{o.titulo}</h3>
          {o.descricao && <p className="line-clamp-2 text-[10px] leading-snug text-zinc-400 md:text-xs">{o.descricao}</p>}

          <div className="flex-1">
            {o.valor != null && (
              <>
                {o.valor_de != null && (
                  <p className="mt-0.5 text-[10px] text-zinc-500 line-through md:text-xs">{BRL(Number(o.valor_de))}</p>
                )}
                <p className="truncate text-base font-black text-accent drop-shadow-[0_2px_10px_rgba(251,146,60,0.3)] md:text-2xl">
                  {BRL(Number(o.valor))}
                </p>
              </>
            )}
            {o.texto_pix && (
              <p className="truncate text-[10px] font-bold text-emerald-400 md:text-sm">{o.texto_pix}</p>
            )}
            {o.texto_parcelamento && (
              <p className="truncate text-[10px] text-zinc-400 md:text-xs">{o.texto_parcelamento}</p>
            )}
          </div>

          <div className={`mt-0.5 grid gap-1.5 ${temLink ? 'grid-cols-2' : 'grid-cols-1'}`}>
            <Button
              asChild
              size="sm"
              className="h-8 rounded-lg bg-green-600/90 text-[10px] font-semibold text-white hover:bg-green-600 md:h-9 md:text-xs"
            >
              <a
                href={`https://wa.me/${WHATSAPP}?text=${encodeURIComponent(msg)}`}
                target="_blank"
                rel="noopener noreferrer"
                onClick={(e) => e.stopPropagation()}
              >
                <MessageCircle className="mr-1 h-3 w-3" /> Falar no WhatsApp
              </a>
            </Button>
            {temLink && (
              <Button
                asChild
                size="sm"
                variant="outline"
                className="h-8 border-zinc-600 bg-transparent text-[10px] font-semibold text-zinc-300 hover:border-accent hover:bg-transparent hover:text-accent md:h-9 md:text-xs"
              >
                <a href={o.link_produto} target="_blank" rel="noopener noreferrer" onClick={(e) => e.stopPropagation()}>
                  <ExternalLink className="mr-1 h-3 w-3" /> Ver na loja
                </a>
              </Button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function OfertaDetalheModal({ oferta, onClose }: { oferta: Oferta | null; onClose: () => void }) {
  const [idx, setIdx] = useState(0);
  const midias = oferta ? midiasDaOferta(oferta) : [];

  useEffect(() => setIdx(0), [oferta?.id]);
  if (!oferta) return null;

  const mover = (dir: -1 | 1) => setIdx((atual) => (atual + dir + midias.length) % midias.length);
  const msg = `Olá! Tenho interesse nesta novidade: ${oferta.titulo}${oferta.valor ? ` - ${BRL(Number(oferta.valor))}` : ''}`;

  return (
    <Dialog open={!!oferta} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-h-[94vh] w-[calc(100%-1rem)] max-w-5xl overflow-y-auto border-zinc-700 bg-zinc-900 p-0 text-white sm:rounded-lg">
        <DialogTitle className="sr-only">{oferta.titulo}</DialogTitle>
        <div className="grid md:grid-cols-[minmax(0,1.1fr)_minmax(320px,0.9fr)]">
          <div className="relative min-h-[42vh] overflow-hidden bg-zinc-950 md:min-h-[72vh]">
            {midias.length ? midias.map((item, i) => (
              <div key={item.url + i} className={`absolute inset-0 transition-opacity duration-300 ${i === idx ? 'opacity-100' : 'pointer-events-none opacity-0'}`}>
                <Midia item={item} titulo={oferta.titulo} ativa={i === idx} className="h-full w-full object-contain" />
              </div>
            )) : <div className="flex h-full items-center justify-center text-sm text-zinc-500">Sem mídia</div>}

            {midias.length > 1 && (
              <>
                <Button type="button" variant="secondary" size="icon" className="absolute left-2 top-1/2 z-10 -translate-y-1/2 bg-zinc-950/75 text-white hover:bg-zinc-950" onClick={() => mover(-1)} aria-label="Mídia anterior">
                  <ChevronLeft className="h-5 w-5" />
                </Button>
                <Button type="button" variant="secondary" size="icon" className="absolute right-2 top-1/2 z-10 -translate-y-1/2 bg-zinc-950/75 text-white hover:bg-zinc-950" onClick={() => mover(1)} aria-label="Próxima mídia">
                  <ChevronRight className="h-5 w-5" />
                </Button>
                <div className="absolute bottom-3 left-0 right-0 z-10 flex justify-center gap-1.5">
                  {midias.map((_, i) => <button key={i} type="button" onClick={() => setIdx(i)} className={`h-2 w-2 rounded-full ${i === idx ? 'bg-accent' : 'bg-white/40'}`} aria-label={`Abrir mídia ${i + 1}`} />)}
                </div>
              </>
            )}
          </div>

          <div className="flex flex-col gap-4 p-4 sm:p-6">
            <div className="flex flex-wrap gap-1.5 pr-8">
              {oferta.selos?.map((selo) => <Badge key={selo} className="border-0 bg-accent text-[10px] font-bold uppercase text-white">{selo}</Badge>)}
              {oferta.etiqueta && <Badge variant="outline" className="border-zinc-600 text-zinc-300">{oferta.etiqueta}</Badge>}
            </div>
            <div>
              <h2 className="text-2xl font-black leading-tight md:text-3xl">{oferta.titulo}</h2>
              {oferta.bordao_modal && (
                <p className="mt-3 border-l-4 border-accent pl-3 text-lg font-bold leading-snug text-accent md:text-xl">{oferta.bordao_modal}</p>
              )}
            </div>
            {oferta.descricao && <p className="whitespace-pre-line text-sm leading-relaxed text-zinc-300">{oferta.descricao}</p>}
            <div className="mt-auto border-t border-zinc-700 pt-4">
              {oferta.valor_de != null && <p className="text-sm text-zinc-500 line-through">{BRL(Number(oferta.valor_de))}</p>}
              {oferta.valor != null && <p className="text-3xl font-black text-accent drop-shadow-[0_2px_10px_rgba(251,146,60,0.3)]">{BRL(Number(oferta.valor))}</p>}
              {oferta.texto_pix && <p className="mt-1 font-bold text-emerald-400">{oferta.texto_pix}</p>}
              {oferta.texto_parcelamento && <p className="text-sm text-zinc-400">{oferta.texto_parcelamento}</p>}
            </div>
            <div className={`grid gap-2 ${oferta.link_produto ? 'grid-cols-2' : 'grid-cols-1'}`}>
              <Button asChild className="bg-green-600/90 text-white hover:bg-green-600">
                <a href={`https://wa.me/${WHATSAPP}?text=${encodeURIComponent(msg)}`} target="_blank" rel="noopener noreferrer"><MessageCircle className="mr-1 h-4 w-4" /> WhatsApp</a>
              </Button>
              {oferta.link_produto && <Button asChild variant="outline" className="border-zinc-600 bg-transparent text-zinc-300 hover:border-accent hover:bg-transparent hover:text-accent"><a href={oferta.link_produto} target="_blank" rel="noopener noreferrer"><ExternalLink className="mr-1 h-4 w-4" /> Ver na loja</a></Button>}
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

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

      setOfertas((data as Oferta[]) || []);
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
