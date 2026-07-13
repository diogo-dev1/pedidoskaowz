import { useEffect, useRef, useState } from "react";

interface KnifeViewer360Props {
  videoUrl: string;
  nome: string;
  /** Sensibilidade do arraste. Pixels para cobrir a duração inteira. Default 400px. */
  sensitivity?: number;
  className?: string;
}

/**
 * Visualizador 360° por scrubbing de vídeo.
 * Arrastar horizontalmente altera currentTime proporcionalmente à duração.
 */
export default function KnifeViewer360({
  videoUrl,
  nome,
  sensitivity = 400,
  className = "",
}: KnifeViewer360Props) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const draggingRef = useRef(false);
  const startXRef = useRef(0);
  const startTimeRef = useRef(0);
  const [duration, setDuration] = useState(0);
  const [ready, setReady] = useState(false);
  const [dragging, setDragging] = useState(false);

  useEffect(() => {
    const v = videoRef.current;
    if (!v) return;
    const onLoaded = () => {
      setDuration(v.duration || 0);
      setReady(true);
      // parar no primeiro frame
      v.pause();
      v.currentTime = 0;
    };
    v.addEventListener("loadedmetadata", onLoaded);
    return () => v.removeEventListener("loadedmetadata", onLoaded);
  }, [videoUrl]);

  const onPointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!videoRef.current || !duration) return;
    draggingRef.current = true;
    setDragging(true);
    startXRef.current = e.clientX;
    startTimeRef.current = videoRef.current.currentTime;
    (e.currentTarget as HTMLDivElement).setPointerCapture(e.pointerId);
  };

  const onPointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!draggingRef.current || !videoRef.current || !duration) return;
    const dx = e.clientX - startXRef.current;
    const ratio = dx / sensitivity;
    let next = startTimeRef.current + ratio * duration;
    // loop 360°
    next = ((next % duration) + duration) % duration;
    try {
      videoRef.current.currentTime = next;
    } catch {
      /* ignore seek errors */
    }
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
      ref={containerRef}
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
      <video
        ref={videoRef}
        src={videoUrl}
        muted
        playsInline
        preload="auto"
        // sem controls e sem autoplay
        className="w-full h-full object-contain pointer-events-none"
        draggable={false}
      />
      {!ready && (
        <div className="absolute inset-0 flex items-center justify-center bg-zinc-950/60">
          <div className="h-8 w-8 rounded-full border-2 border-zinc-600 border-t-white animate-spin" />
        </div>
      )}
    </div>
  );
}
