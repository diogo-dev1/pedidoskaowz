import { useEffect, useRef, useState } from 'react';
import {
  AnimatePresence,
  motion,
  useMotionValueEvent,
  useReducedMotion,
  useScroll,
  useTransform,
  type MotionValue,
} from 'framer-motion';
import { useIsMobile } from '@/hooks/use-mobile';
import type { Landing, LandingPasso } from '@/lib/landingsRegras';
import { PassosLista } from './PassosLista';
import { HAIRLINE, numeroPasso } from './estilo';

type CapaLanding = Pick<Landing, 'capa_url' | 'capa_tipo'>;

interface Props {
  passos: LandingPasso[];
  landing: CapaLanding;
}

const CURVA = [0.23, 1, 0.32, 1] as const;

/**
 * Passos com mídia fixa (sticky) e texto rolando.
 * Celular: mídia na metade de cima, texto embaixo. Desktop: texto à esquerda, mídia à direita.
 * Com "reduzir movimento", vira a lista estática.
 */
export function PassosScrolly({ passos, landing }: Props) {
  const reduzir = useReducedMotion();
  const celular = useIsMobile();
  if (!passos.length) return null;
  if (reduzir) return <PassosLista passos={passos} landing={landing} />;
  // A linha de leitura muda com o layout, e o useScroll lê o offset só na montagem.
  return <PassosAnimados key={celular ? 'celular' : 'desktop'} passos={passos} landing={landing} celular={celular} />;
}

function PassosAnimados({ passos, landing, celular }: Props & { celular: boolean }) {
  // O progresso é medido só sobre a lista de passos: no celular a seção também contém a mídia,
  // e medir pela seção deslocaria a troca de passo.
  const lista = useRef<HTMLOListElement>(null);
  const [ativo, setAtivo] = useState(0);
  // Linha de leitura: centro da tela no desktop; no celular, o centro da área de texto (abaixo da mídia).
  const linha = celular ? '75%' : 'center';
  const { scrollYProgress } = useScroll({ target: lista, offset: [`start ${linha}`, `end ${linha}`] });
  const zoomCapa = useTransform(scrollYProgress, [0, 1], [1, 1.15]);

  useMotionValueEvent(scrollYProgress, 'change', (v) => {
    const indice = Math.min(passos.length - 1, Math.max(0, Math.floor(v * passos.length)));
    setAtivo((atual) => (atual === indice ? atual : indice));
  });

  const foco = passos[ativo]?.foco;

  return (
    <section aria-label="Como funciona" className="relative py-8 md:grid md:grid-cols-2 md:gap-12 md:py-16">
      {/* top: 62px (header no celular); no desktop 66px do header + 24px de respiro. */}
      <div className="sticky top-[62px] z-10 h-[46svh] bg-[hsl(var(--oferta-fundo))] pb-3 md:order-2 md:top-[90px] md:h-[calc(100svh-114px)] md:self-start md:pb-0">
        <div className={`relative h-full overflow-hidden rounded-xl border ${HAIRLINE} bg-[hsl(var(--oferta-modal))]`}>
          {passos.map((p, i) => (
            <CamadaMidia key={p.id} passo={p} landing={landing} ativa={i === ativo} zoom={p.midia_url ? null : zoomCapa} />
          ))}

          <AnimatePresence mode="wait" initial={false}>
            {foco && (
              <motion.p
                key={`${ativo}-${foco}`}
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.25, ease: CURVA }}
                className="absolute bottom-3 left-3 z-10 max-w-[calc(100%-1.5rem)] truncate rounded-md bg-[hsl(var(--oferta-fundo)/0.85)] px-2 py-1 text-xs text-[hsl(var(--oferta-texto))]"
              >
                {foco}
              </motion.p>
            )}
          </AnimatePresence>

          <div
            role="img"
            aria-label={`Passo ${ativo + 1} de ${passos.length}`}
            className="absolute right-3 top-3 z-10 flex gap-1 rounded-full bg-[hsl(var(--oferta-fundo)/0.6)] px-1.5 py-1"
          >
            {passos.map((p, i) => (
              <span
                key={p.id}
                className={`h-1.5 w-1.5 rounded-full transition-colors duration-200 ${i === ativo ? 'bg-[hsl(var(--oferta-texto))]' : 'bg-[hsl(var(--oferta-texto)/0.35)]'}`}
              />
            ))}
          </div>
        </div>
      </div>

      {/* pb no desktop: a mídia fixa continua presa até o último passo chegar ao centro. */}
      <ol ref={lista} className="relative md:order-1 md:pb-24">
        {passos.map((p, i) => (
          <li key={p.id} className="flex min-h-[70svh] items-center md:min-h-[85vh]" aria-current={i === ativo ? 'step' : undefined}>
            <motion.div
              initial={false}
              animate={{ opacity: i === ativo ? 1 : 0.3 }}
              transition={{ duration: 0.35, ease: CURVA }}
              className="max-w-md py-6"
            >
              <p className="font-mono text-xs tabular-nums text-[hsl(var(--oferta-muted))]">{numeroPasso(i)}</p>
              <h2 className="mt-2 text-[28px] font-medium leading-tight text-[hsl(var(--oferta-texto))] md:text-[40px]">{p.titulo}</h2>
              {p.texto && <p className="mt-3 text-base leading-7 text-[hsl(var(--oferta-detalhe))] md:text-lg md:leading-8">{p.texto}</p>}
            </motion.div>
          </li>
        ))}
      </ol>
    </section>
  );
}

/** Uma mídia empilhada: entra com crossfade e leve zoom (1.05 → 1). Vídeo só toca quando ativo. */
function CamadaMidia({ passo, landing, ativa, zoom }: { passo: LandingPasso; landing: CapaLanding; ativa: boolean; zoom: MotionValue<number> | null }) {
  const video = useRef<HTMLVideoElement>(null);
  const url = passo.midia_url || landing.capa_url;
  const tipo = passo.midia_url ? passo.midia_tipo : landing.capa_tipo;

  useEffect(() => {
    const v = video.current;
    if (!v) return;
    if (ativa) v.play().catch(() => undefined);
    else v.pause();
  }, [ativa]);

  return (
    <motion.div
      aria-hidden={!ativa}
      initial={false}
      animate={{ opacity: ativa ? 1 : 0, scale: ativa ? 1 : 1.05 }}
      transition={{ duration: 0.6, ease: CURVA }}
      className="absolute inset-0"
    >
      <motion.div style={zoom ? { scale: zoom } : undefined} className="h-full w-full">
        {!url ? null : tipo === 'video' ? (
          <video ref={video} src={url} aria-label={passo.foco || passo.titulo} className="h-full w-full object-cover" muted loop playsInline preload="metadata" />
        ) : (
          <img src={url} alt={passo.foco || passo.titulo} loading="lazy" decoding="async" className="h-full w-full object-cover" />
        )}
      </motion.div>
    </motion.div>
  );
}
