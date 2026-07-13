import { useEffect, useRef, useState } from "react";

interface KnifeViewer360Props {
  videoUrl: string;
  nome: string;
  /** Sensibilidade do arraste. Pixels para cobrir a volta inteira. Default 350px. */
  sensitivity?: number;
  /** Quantidade de frames pré-extraídos. Mais = mais suave, porém mais RAM. */
  frameCount?: number;
  className?: string;
}

/**
 * Visualizador 360° ultra-fluido.
 * Pré-extrai N frames do vídeo para bitmaps e renderiza em canvas.
 * Arraste altera o índice do frame — zero latência de seek.
 */
export default function KnifeViewer360({
  videoUrl,
  nome,
  sensitivity = 350,
  frameCount = 72,
  className = "",
}: KnifeViewer360Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const framesRef = useRef<Array<ImageBitmap | HTMLCanvasElement>>([]);
  const indexRef = useRef(0);
  const targetIndexRef = useRef(0);
  const rafRef = useRef<number | null>(null);
  const draggingRef = useRef(false);
  const startXRef = useRef(0);
  const startIndexRef = useRef(0);

  const [ready, setReady] = useState(false);
  const [progress, setProgress] = useState(0);
  const [dragging, setDragging] = useState(false);

  // Pré-extração dos frames
  useEffect(() => {
    let cancelled = false;
    const video = document.createElement("video");
    video.src = videoUrl;
    video.crossOrigin = "anonymous";
    video.muted = true;
    video.playsInline = true;
    video.preload = "auto";
    // @ts-ignore
    video.playbackRate = 0;

    const extract = async () => {
      await new Promise<void>((res, rej) => {
        video.onloadedmetadata = () => res();
        video.onerror = () => rej(new Error("video load error"));
      });

      const duration = video.duration;
      if (!duration || !isFinite(duration)) return;

      const w = video.videoWidth;
      const h = video.videoHeight;

      const seekTo = (t: number) =>
        new Promise<void>((res) => {
          const onSeeked = () => {
            video.removeEventListener("seeked", onSeeked);
            res();
          };
          video.addEventListener("seeked", onSeeked);
          video.currentTime = Math.min(t, duration - 0.001);
        });

      const useBitmap = typeof createImageBitmap === "function";

      for (let i = 0; i < frameCount; i++) {
        if (cancelled) return;
        const t = (i / frameCount) * duration;
        await seekTo(t);
        if (useBitmap) {
          try {
            const bmp = await createImageBitmap(video);
            framesRef.current.push(bmp);
          } catch {
            const c = document.createElement("canvas");
            c.width = w;
            c.height = h;
            c.getContext("2d")!.drawImage(video, 0, 0, w, h);
            framesRef.current.push(c);
          }
        } else {
          const c = document.createElement("canvas");
          c.width = w;
          c.height = h;
          c.getContext("2d")!.drawImage(video, 0, 0, w, h);
          framesRef.current.push(c);
        }
        setProgress((i + 1) / frameCount);
      }

      // Ajusta canvas ao vídeo
      const canvas = canvasRef.current;
      if (canvas) {
        canvas.width = w;
        canvas.height = h;
        drawFrame(0);
      }
      setReady(true);
    };

    extract().catch(() => {});

    return () => {
      cancelled = true;
      framesRef.current.forEach((f) => {
        if ("close" in f) (f as ImageBitmap).close?.();
      });
      framesRef.current = [];
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, [videoUrl, frameCount]);

  const drawFrame = (idx: number) => {
    const canvas = canvasRef.current;
    const frame = framesRef.current[idx];
    if (!canvas || !frame) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(frame as CanvasImageSource, 0, 0, canvas.width, canvas.height);
  };

  // Loop de animação para easing suave até o target
  const tick = () => {
    const total = framesRef.current.length;
    if (total > 0) {
      const cur = indexRef.current;
      const target = targetIndexRef.current;
      // caminho mais curto no círculo
      let delta = target - cur;
      if (delta > total / 2) delta -= total;
      if (delta < -total / 2) delta += total;
      const next = cur + delta * 0.35; // easing
      let idx = ((next % total) + total) % total;
      indexRef.current = idx;
      drawFrame(Math.round(idx) % total);

      if (Math.abs(delta) > 0.05) {
        rafRef.current = requestAnimationFrame(tick);
      } else {
        indexRef.current = target;
        drawFrame(((Math.round(target) % total) + total) % total);
        rafRef.current = null;
      }
    }
  };

  const scheduleTick = () => {
    if (rafRef.current == null) {
      rafRef.current = requestAnimationFrame(tick);
    }
  };

  const onPointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!ready) return;
    draggingRef.current = true;
    setDragging(true);
    startXRef.current = e.clientX;
    startIndexRef.current = indexRef.current;
    (e.currentTarget as HTMLDivElement).setPointerCapture(e.pointerId);
  };

  const onPointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!draggingRef.current || !ready) return;
    const total = framesRef.current.length;
    const dx = e.clientX - startXRef.current;
    const ratio = dx / sensitivity;
    targetIndexRef.current = startIndexRef.current + ratio * total;
    scheduleTick();
  };

  const endDrag = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!draggingRef.current) return;
    draggingRef.current = false;
    setDragging(false);
    try {
      (e.currentTarget as HTMLDivElement).releasePointerCapture(e.pointerId);
    } catch {
      /* noop */
    }
  };

  return (
    <div
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={endDrag}
      onPointerLeave={endDrag}
      onPointerCancel={endDrag}
      className={`relative select-none touch-none overflow-hidden bg-zinc-950 ${
        dragging ? "cursor-grabbing" : "cursor-grab"
      } ${className}`}
      style={{ WebkitUserSelect: "none" }}
      aria-label={`Visualizador 360° de ${nome}`}
      role="img"
    >
      <canvas
        ref={canvasRef}
        className="w-full h-full object-contain pointer-events-none"
      />
      {!ready && (
        <div className="absolute inset-0 flex flex-col items-center justify-center bg-zinc-950/80 gap-3">
          <div className="h-8 w-8 rounded-full border-2 border-zinc-700 border-t-white animate-spin" />
          <div className="text-[10px] uppercase tracking-widest text-zinc-500">
            Carregando {Math.round(progress * 100)}%
          </div>
        </div>
      )}
    </div>
  );
}
