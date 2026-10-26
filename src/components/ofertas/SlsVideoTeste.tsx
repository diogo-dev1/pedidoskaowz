import { useEffect, useRef, useState } from 'react';
import { Pause, Play, Volume2, VolumeX } from 'lucide-react';
import { Button } from '@/components/ui/button';

/** Defers the source download and keeps explicit visitor pauses across scrolls. */
export function SlsVideoTeste({ url }: { url: string }) {
  const area = useRef<HTMLDivElement>(null);
  const video = useRef<HTMLVideoElement>(null);
  const [perto, setPerto] = useState(false);
  const [visivel, setVisivel] = useState(false);
  const [mudo, setMudo] = useState(true);
  const [pausaManual, setPausaManual] = useState(false);
  const [tocando, setTocando] = useState(false);

  useEffect(() => {
    const el = area.current;
    if (!el) return;
    const carregar = new IntersectionObserver(entries => {
      if (entries.some(e => e.isIntersecting)) { setPerto(true); carregar.disconnect(); }
    }, { rootMargin: '400px' });
    const reproduzir = new IntersectionObserver(entries => {
      setVisivel(entries.some(e => e.isIntersecting));
    }, { threshold: 0 });
    carregar.observe(el); reproduzir.observe(el);
    return () => { carregar.disconnect(); reproduzir.disconnect(); };
  }, []);

  useEffect(() => {
    const el = video.current;
    if (!el) return;
    const sincronizar = () => {
      if (perto && visivel && !pausaManual && !document.hidden) {
        void el.play().catch(() => setTocando(false));
      } else el.pause();
    };
    sincronizar();
    document.addEventListener('visibilitychange', sincronizar);
    return () => { document.removeEventListener('visibilitychange', sincronizar); el.pause(); };
  }, [perto, visivel, pausaManual]);

  function alternarPausa() {
    if (tocando) setPausaManual(true);
    else {
      setPausaManual(false);
      if (visivel) void video.current?.play().catch(() => setTocando(false));
    }
  }

  return <div ref={area} className="relative mx-auto aspect-[9/16] w-full max-w-[420px] overflow-hidden rounded-lg bg-[hsl(var(--oferta-preto))] md:max-w-[380px]">
    <video ref={video} src={perto ? url : undefined} muted={mudo} playsInline loop preload={perto ? 'metadata' : 'none'} onPlay={() => setTocando(true)} onPause={() => setTocando(false)} className="absolute inset-0 h-full w-full object-cover"/>
    <Button type="button" variant="ghost" aria-label={tocando ? 'Pausar vídeo' : 'Reproduzir vídeo'} onClick={alternarPausa} className="absolute inset-0 h-full w-full rounded-none bg-transparent p-0 hover:bg-transparent hover:text-[hsl(var(--oferta-texto))]">
      {!tocando && <span className="flex h-14 w-14 items-center justify-center rounded-full bg-[hsl(var(--oferta-preto)/0.7)] text-[hsl(var(--oferta-texto))]">{pausaManual ? <Pause className="h-6 w-6"/> : <Play className="h-6 w-6"/>}</span>}
    </Button>
    <Button type="button" size="icon" variant="ghost" title={mudo ? 'Ativar som' : 'Desativar som'} aria-label={mudo ? 'Ativar som' : 'Desativar som'} onClick={() => setMudo(v => !v)} className="absolute bottom-4 right-4 h-11 w-11 rounded-full bg-[hsl(var(--oferta-preto)/0.7)] text-[hsl(var(--oferta-texto))] hover:bg-[hsl(var(--oferta-preto)/0.9)] hover:text-[hsl(var(--oferta-texto))]">
      {mudo ? <VolumeX className="h-5 w-5"/> : <Volume2 className="h-5 w-5"/>}
    </Button>
  </div>;
}