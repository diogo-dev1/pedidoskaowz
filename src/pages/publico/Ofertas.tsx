import { useEffect, useRef, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Search, MessageCircle, ExternalLink } from 'lucide-react';

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
  link_produto: string | null;
  imagens: string[];
  ordem: number;
  ativo: boolean;
}

function OfertaCard({ o }: { o: Oferta }) {
  const imagens = o.imagens?.length ? o.imagens : [];
  const [idx, setIdx] = useState(0);
  const timer = useRef<ReturnType<typeof setInterval> | null>(null);
  const touchX = useRef<number | null>(null);

  useEffect(() => () => { if (timer.current) clearInterval(timer.current); }, []);

  const onEnter = () => {
    if (imagens.length < 2) return;
    if (imagens.length === 2) { setIdx(1); return; }
    setIdx(1);
    if (timer.current) clearInterval(timer.current);
    timer.current = setInterval(() => setIdx((i) => (i + 1) % imagens.length), 1500);
  };

  const onLeave = () => {
    if (timer.current) { clearInterval(timer.current); timer.current = null; }
    setIdx(0);
  };

  const onTouchStart = (e: React.TouchEvent) => { touchX.current = e.touches[0].clientX; };
  const onTouchEnd = (e: React.TouchEvent) => {
    if (touchX.current === null || imagens.length < 2) return;
    const dx = e.changedTouches[0].clientX - touchX.current;
    if (Math.abs(dx) > 40) {
      setIdx((i) => (dx < 0 ? (i + 1) % imagens.length : (i - 1 + imagens.length) % imagens.length));
    }
    touchX.current = null;
  };

  const msg = `Olá! Tenho interesse nesta oferta: ${o.titulo}${o.valor ? ` - ${BRL(Number(o.valor))}` : ''}`;
  const temLink = !!o.link_produto;

  return (
    <div className="group relative overflow-hidden rounded-lg transition-all">
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
            {imagens.length ? (
              imagens.map((src, i) => (
                <img
                  key={src + i}
                  src={src}
                  alt={o.titulo}
                  loading="lazy"
                  className={`absolute inset-0 h-full w-full object-cover transition-opacity duration-300 ${i === idx ? 'opacity-100' : 'opacity-0'}`}
                />
              ))
            ) : (
              <div className="flex h-full w-full items-center justify-center text-zinc-500 text-xs">Sem imagem</div>
            )}

            {imagens.length > 1 && (
              <div className="absolute bottom-2 left-0 right-0 z-20 flex justify-center gap-1">
                {imagens.map((_, i) => (
                  <span
                    key={i}
                    className={`h-1.5 w-1.5 rounded-full transition-colors ${i === idx ? 'bg-accent' : 'bg-white/40'}`}
                  />
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
          <h3 className="font-bold line-clamp-2 text-sm md:text-base text-white">{o.titulo}</h3>
          {o.descricao && <p className="text-[10px] md:text-xs text-zinc-400 line-clamp-3">{o.descricao}</p>}

          <div className="flex-1">
            {o.valor != null && (
              <>
                {o.valor_de != null && (
                  <p className="text-xs text-zinc-500 line-through">{BRL(Number(o.valor_de))}</p>
                )}
                <p className="mt-0.5 truncate text-base md:text-2xl font-black text-accent drop-shadow-[0_2px_10px_rgba(251,146,60,0.3)]">
                  {BRL(Number(o.valor))}
                </p>
              </>
            )}
            {o.condicoes && (
              <p className="text-[10px] md:text-xs text-emerald-400 font-semibold">{o.condicoes}</p>
            )}
          </div>

          <div className={`mt-1.5 grid gap-1.5 ${temLink ? 'grid-cols-2' : 'grid-cols-1'}`}>
            <Button
              asChild
              size="sm"
              className="h-8 rounded-lg bg-green-600 hover:bg-green-700 text-white text-[10px] font-semibold md:h-10 md:text-xs"
            >
              <a
                href={`https://wa.me/${WHATSAPP}?text=${encodeURIComponent(msg)}`}
                target="_blank"
                rel="noopener noreferrer"
              >
                <MessageCircle className="mr-1 h-3 w-3" /> Falar no WhatsApp
              </a>
            </Button>
            {temLink && (
              <Button
                asChild
                size="sm"
                variant="outline"
                className="h-8 border-zinc-600 bg-transparent text-[10px] font-semibold text-zinc-300 hover:border-accent hover:bg-transparent hover:text-accent md:h-10 md:text-xs"
              >
                <a href={o.link_produto!} target="_blank" rel="noopener noreferrer">
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

export default function Ofertas() {
  const [ofertas, setOfertas] = useState<Oferta[]>([]);
  const [loading, setLoading] = useState(true);
  const [busca, setBusca] = useState('');

  useEffect(() => {
    document.title = 'Novidades e Ofertas | Kaowz';
    (async () => {
      const { data } = await supabase
        .from('ofertas')
        .select('*')
        .eq('ativo', true)
        .order('ordem', { ascending: true });
      setOfertas((data as Oferta[]) || []);
      setLoading(false);
    })();
  }, []);

  const filtradas = ofertas.filter((o) => o.titulo.toLowerCase().includes(busca.toLowerCase()));

  return (
    <div className="min-h-screen bg-zinc-950 overflow-x-hidden max-w-[100vw]">
      <header className="bg-black border-b border-white/10 sticky top-0 z-40">
        <div className="w-full max-w-7xl mx-auto px-3 sm:px-4 py-3 md:py-4">
          <div className="flex flex-col md:flex-row items-center justify-between gap-3 md:gap-4">
            <h1 className="text-lg md:text-3xl font-bold text-white tracking-tight">
              KAOWZ <span className="text-accent">OFERTAS</span>
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
        ) : filtradas.length === 0 ? (
          <p className="text-center text-zinc-400 py-20">Nenhuma oferta disponível no momento</p>
        ) : (
          <div className="grid grid-cols-2 lg:grid-cols-3 gap-1.5 md:gap-4">
            {filtradas.map((o) => (
              <OfertaCard key={o.id} o={o} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
