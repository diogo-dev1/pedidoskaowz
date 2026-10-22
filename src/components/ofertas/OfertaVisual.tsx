import { useEffect, useRef, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { MessageCircle, ExternalLink, ChevronLeft, ChevronRight, Play } from 'lucide-react';
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
  [key: string]: string;
  url: string;
  tipo: 'imagem' | 'video';
}

export function midiasDaOferta(o: Oferta): MidiaOferta[] {
  if (Array.isArray(o.midias) && o.midias.length) return o.midias;
  return (o.imagens || []).map((url) => ({ url, tipo: 'imagem' as const }));
}

export function Midia({ item, titulo, ativa, className = '' }: { item: MidiaOferta; titulo: string; ativa: boolean; className?: string }) {
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

export function OfertaCard({ o, onOpen, mensagemWhatsApp }: { o: Oferta; onOpen: () => void; mensagemWhatsApp?: (oferta: Oferta) => string }) {
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

  const msg = mensagemWhatsApp?.(o) ?? `Olá! Tenho interesse nesta oferta: ${o.titulo}${o.valor ? ` - ${BRL(Number(o.valor))}` : ''}`;
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

      <div className="bg-[hsl(var(--oferta-superficie))] border border-[hsl(var(--oferta-borda))] hover:border-accent hover:shadow-lg transition-all rounded-lg overflow-hidden h-full flex flex-col">
        <div
          className="relative"
          onMouseEnter={onEnter}
          onMouseLeave={onLeave}
          onTouchStart={onTouchStart}
          onTouchEnd={onTouchEnd}
        >
          <div className="aspect-[3/4] overflow-hidden bg-[hsl(var(--oferta-borda))] relative">
            {midias.length ? (
              midias.map((item, i) => (
                <div key={item.url + i} className={`absolute inset-0 transition-opacity duration-300 ${i === idx ? 'opacity-100' : 'opacity-0'}`}>
                  <Midia item={item} titulo={o.titulo} ativa={i === idx} className="h-full w-full object-cover" />
                  {item.tipo === 'video' && <Play className="absolute bottom-2 right-2 h-5 w-5 rounded-full bg-[hsl(var(--oferta-fundo)/0.7)] p-1 text-[hsl(var(--oferta-texto))]" />}
                </div>
              ))
            ) : (
              <div className="flex h-full w-full items-center justify-center text-[hsl(var(--oferta-suporte))] text-xs">Sem imagem</div>
            )}

            {midias.length > 1 && (
              <div className="absolute bottom-2 left-0 right-0 z-20 flex justify-center gap-1">
                {midias.map((_, i) => (
                  <span
                    key={i}
                    className={`h-1.5 w-1.5 rounded-full transition-colors ${i === idx ? 'bg-accent' : 'bg-[hsl(var(--oferta-texto)/0.4)]'}`}
                  />
                ))}
              </div>
            )}

            {o.selos?.length > 0 && (
              <div className="absolute left-2 top-2 z-20 flex max-w-[calc(100%-1rem)] flex-col items-start gap-1">
                {o.selos.map((selo, i) => (
                  <Badge
                    key={`${selo}-${i}`}
                    className="max-w-full truncate rounded border-0 bg-accent px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wide text-[hsl(var(--oferta-texto))] md:text-[10px]"
                  >
                    {selo}
                  </Badge>
                ))}
              </div>
            )}
          </div>

          {o.etiqueta && (
            <Badge className="absolute bottom-3 left-3 z-20 border-0 bg-accent text-[10px] text-[hsl(var(--oferta-texto))]">
              {o.etiqueta}
            </Badge>
          )}
        </div>

        <div className="flex flex-1 flex-col gap-1 p-2 md:p-4">
          <h3 className="line-clamp-1 text-sm font-bold text-[hsl(var(--oferta-texto))] md:text-base">{o.titulo}</h3>
          {o.descricao && <p className="line-clamp-2 text-[10px] leading-snug text-[hsl(var(--oferta-muted))] md:text-xs">{o.descricao}</p>}

          <div className="flex-1">
            {o.valor != null && (
              <>
                {o.valor_de != null && (
                  <p className="mt-0.5 text-[10px] text-[hsl(var(--oferta-suporte))] line-through md:text-xs">{BRL(Number(o.valor_de))}</p>
                )}
                <p className="truncate text-base font-black text-accent [filter:drop-shadow(var(--oferta-sombra))] md:text-2xl">
                  {BRL(Number(o.valor))}
                </p>
              </>
            )}
            {o.texto_pix && (
              <p className="truncate text-[10px] font-bold text-[hsl(var(--oferta-pix))] md:text-sm">{o.texto_pix}</p>
            )}
            {o.texto_parcelamento && (
              <p className="truncate text-[10px] text-[hsl(var(--oferta-muted))] md:text-xs">{o.texto_parcelamento}</p>
            )}
          </div>

          <div className={`mt-0.5 grid gap-1.5 ${temLink ? 'grid-cols-2' : 'grid-cols-1'}`}>
            <Button
              asChild
              size="sm"
              className="h-8 rounded-lg bg-[hsl(var(--oferta-whatsapp)/0.9)] text-[10px] font-semibold text-[hsl(var(--oferta-texto))] hover:bg-[hsl(var(--oferta-whatsapp))] md:h-9 md:text-xs"
            >
              <a
                href={`https://wa.me/${WHATSAPP}?text=${encodeURIComponent(msg)}`}
                target="_blank"
                rel="noopener noreferrer"
                onClick={(e) => e.stopPropagation()}
              >
                <MessageCircle className="mr-1 h-3 w-3" /> <span className={mensagemWhatsApp && temLink ? 'hidden md:inline' : ''}>Falar no WhatsApp</span>{mensagemWhatsApp && temLink && <span className="md:hidden">WhatsApp</span>}
              </a>
            </Button>
            {temLink && (
              <Button
                asChild
                size="sm"
                variant="outline"
                className="h-8 border-[hsl(var(--oferta-borda-suave))] bg-transparent text-[10px] font-semibold text-[hsl(var(--oferta-detalhe))] hover:border-accent hover:bg-transparent hover:text-accent md:h-9 md:text-xs"
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

export function OfertaDetalheModal({ oferta, onClose, mensagemWhatsApp }: { oferta: Oferta | null; onClose: () => void; mensagemWhatsApp?: (oferta: Oferta) => string }) {
  const [idx, setIdx] = useState(0);
  const midias = oferta ? midiasDaOferta(oferta) : [];

  useEffect(() => setIdx(0), [oferta?.id]);
  if (!oferta) return null;

  const mover = (dir: -1 | 1) => setIdx((atual) => (atual + dir + midias.length) % midias.length);
  const msg = mensagemWhatsApp?.(oferta) ?? `Olá! Tenho interesse nesta novidade: ${oferta.titulo}${oferta.valor ? ` - ${BRL(Number(oferta.valor))}` : ''}`;

  return (
    <Dialog open={!!oferta} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-h-[94vh] w-[calc(100%-1rem)] max-w-5xl overflow-y-auto border-[hsl(var(--oferta-borda))] bg-[hsl(var(--oferta-modal))] p-0 text-[hsl(var(--oferta-texto))] sm:rounded-lg">
        <DialogTitle className="sr-only">{oferta.titulo}</DialogTitle>
        <div className="grid md:grid-cols-[minmax(0,1.1fr)_minmax(320px,0.9fr)]">
          <div className="relative min-h-[42vh] overflow-hidden bg-[hsl(var(--oferta-fundo))] md:min-h-[72vh]">
            {midias.length ? midias.map((item, i) => (
              <div key={item.url + i} className={`absolute inset-0 transition-opacity duration-300 ${i === idx ? 'opacity-100' : 'pointer-events-none opacity-0'}`}>
                <Midia item={item} titulo={oferta.titulo} ativa={i === idx} className="h-full w-full object-contain" />
              </div>
            )) : <div className="flex h-full items-center justify-center text-sm text-[hsl(var(--oferta-suporte))]">Sem mídia</div>}

            {midias.length > 1 && (
              <>
                <Button type="button" variant="secondary" size="icon" className="absolute left-2 top-1/2 z-10 -translate-y-1/2 bg-[hsl(var(--oferta-fundo)/0.75)] text-[hsl(var(--oferta-texto))] hover:bg-[hsl(var(--oferta-fundo))]" onClick={() => mover(-1)} aria-label="Mídia anterior">
                  <ChevronLeft className="h-5 w-5" />
                </Button>
                <Button type="button" variant="secondary" size="icon" className="absolute right-2 top-1/2 z-10 -translate-y-1/2 bg-[hsl(var(--oferta-fundo)/0.75)] text-[hsl(var(--oferta-texto))] hover:bg-[hsl(var(--oferta-fundo))]" onClick={() => mover(1)} aria-label="Próxima mídia">
                  <ChevronRight className="h-5 w-5" />
                </Button>
                <div className="absolute bottom-3 left-0 right-0 z-10 flex justify-center gap-1.5">
                  {midias.map((_, i) => <Button key={i} variant="ghost" type="button" onClick={() => setIdx(i)} className={`h-2 w-2 p-0 min-w-0 rounded-full ${i === idx ? 'bg-accent' : 'bg-[hsl(var(--oferta-texto)/0.4)]'}`} aria-label={`Abrir mídia ${i + 1}`} />)}
                </div>
              </>
            )}
          </div>

          <div className="flex flex-col gap-4 p-4 sm:p-6">
            <div className="flex flex-wrap gap-1.5 pr-8">
              {oferta.selos?.map((selo) => <Badge key={selo} className="border-0 bg-accent text-[10px] font-bold uppercase text-[hsl(var(--oferta-texto))]">{selo}</Badge>)}
              {oferta.etiqueta && <Badge variant="outline" className="border-[hsl(var(--oferta-borda-suave))] text-[hsl(var(--oferta-detalhe))]">{oferta.etiqueta}</Badge>}
            </div>
            <div>
              <h2 className="text-2xl font-black leading-tight md:text-3xl">{oferta.titulo}</h2>
              {oferta.bordao_modal && (
                <p className="mt-3 border-l-4 border-accent pl-3 text-lg font-bold leading-snug text-accent md:text-xl">{oferta.bordao_modal}</p>
              )}
            </div>
            {oferta.descricao && <p className="whitespace-pre-line text-sm leading-relaxed text-[hsl(var(--oferta-detalhe))]">{oferta.descricao}</p>}
            <div className="mt-auto border-t border-[hsl(var(--oferta-borda))] pt-4">
              {oferta.valor_de != null && <p className="text-sm text-[hsl(var(--oferta-suporte))] line-through">{BRL(Number(oferta.valor_de))}</p>}
              {oferta.valor != null && <p className="text-3xl font-black text-accent [filter:drop-shadow(var(--oferta-sombra))]">{BRL(Number(oferta.valor))}</p>}
              {oferta.texto_pix && <p className="mt-1 font-bold text-[hsl(var(--oferta-pix))]">{oferta.texto_pix}</p>}
              {oferta.texto_parcelamento && <p className="text-sm text-[hsl(var(--oferta-muted))]">{oferta.texto_parcelamento}</p>}
            </div>
            <div className={`grid gap-2 ${oferta.link_produto ? 'grid-cols-2' : 'grid-cols-1'}`}>
              <Button asChild className="bg-[hsl(var(--oferta-whatsapp)/0.9)] text-[hsl(var(--oferta-texto))] hover:bg-[hsl(var(--oferta-whatsapp))]">
                <a href={`https://wa.me/${WHATSAPP}?text=${encodeURIComponent(msg)}`} target="_blank" rel="noopener noreferrer"><MessageCircle className="mr-1 h-4 w-4" /> WhatsApp</a>
              </Button>
              {oferta.link_produto && <Button asChild variant="outline" className="border-[hsl(var(--oferta-borda-suave))] bg-transparent text-[hsl(var(--oferta-detalhe))] hover:border-accent hover:bg-transparent hover:text-accent"><a href={oferta.link_produto} target="_blank" rel="noopener noreferrer"><ExternalLink className="mr-1 h-4 w-4" /> Ver na loja</a></Button>}
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

