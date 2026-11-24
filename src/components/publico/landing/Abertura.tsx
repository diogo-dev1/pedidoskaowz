import { useRef } from 'react';
import { motion, useReducedMotion, useScroll, useTransform } from 'framer-motion';
import { ArrowDown, ChevronDown } from 'lucide-react';
import type { Landing } from '@/lib/landingsRegras';
import { ALTURA_TELA, EASE, SANGRIA } from './estilo';

interface Props {
  landing: Landing;
  preview: boolean;
}

/** Primeira tela: capa em tela cheia, frase de manifesto e convite para rolar. */
export function Abertura({ landing, preview }: Props) {
  const secao = useRef<HTMLElement>(null);
  const reduzir = useReducedMotion();
  const { scrollYProgress } = useScroll({ target: secao, offset: ['start start', 'end start'] });
  // Parallax suave: a capa anda mais devagar que a página; a frase some subindo.
  const capaY = useTransform(scrollYProgress, [0, 1], ['0%', '18%']);
  const fraseOpacidade = useTransform(scrollYProgress, [0, 0.55], [1, 0]);
  const fraseY = useTransform(scrollYProgress, [0, 0.55], [0, -40]);

  return (
    <section
      ref={secao}
      aria-label={landing.titulo}
      className={`relative -mt-6 flex flex-col overflow-hidden ${SANGRIA} ${ALTURA_TELA}`}
    >
      <div aria-hidden className="absolute inset-0 bg-[hsl(var(--oferta-fundo))]">
        {landing.capa_url && (
          <motion.div style={reduzir ? undefined : { y: capaY }} className="h-full w-full">
            {landing.capa_tipo === 'video' ? (
              <video src={landing.capa_url} className="h-full w-full object-cover" muted loop playsInline autoPlay preload="metadata" />
            ) : (
              <img src={landing.capa_url} alt="" className="h-full w-full object-cover" />
            )}
          </motion.div>
        )}
        {/* Escurece de baixo para cima no mesmo preto da página: a frase fica legível e a capa se funde ao resto. */}
        <div className="absolute inset-0 bg-gradient-to-t from-[hsl(var(--oferta-fundo))] via-[hsl(var(--oferta-fundo)/0.6)] to-[hsl(var(--oferta-fundo)/0.2)]" />
      </div>

      <div className="relative mx-auto flex w-full max-w-7xl items-center justify-between gap-3 px-4 pt-4 md:px-8 md:pt-6">
        {preview ? (
          <span className="rounded-md bg-[hsl(var(--oferta-fundo)/0.85)] px-2 py-1 text-xs font-medium text-[hsl(var(--oferta-texto))]">
            Prévia{landing.publicada ? '' : ' · rascunho, só admins veem'}
          </span>
        ) : (
          <span />
        )}
        <a
          href="#laminas"
          className={`inline-flex min-h-11 items-center gap-1.5 rounded-lg px-2 text-sm text-[hsl(var(--oferta-detalhe))] transition-colors duration-150 ${EASE} hover:text-[hsl(var(--oferta-texto))] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent`}
        >
          Pular para as lâminas <ArrowDown aria-hidden strokeWidth={1.5} className="h-4 w-4" />
        </a>
      </div>

      <motion.div
        style={reduzir ? undefined : { opacity: fraseOpacidade, y: fraseY }}
        className="relative mx-auto mt-auto w-full max-w-7xl px-4 pb-10 md:px-8 md:pb-16"
      >
        <p className="mb-3 text-sm text-[hsl(var(--oferta-detalhe))] md:text-base">{landing.titulo}</p>
        <h1 className="max-w-4xl text-balance font-bebas text-[52px] leading-[0.92] text-[hsl(var(--oferta-texto))] sm:text-[64px] md:text-[96px]">
          {landing.frase_abertura || landing.titulo}
        </h1>
        {landing.subtitulo && (
          <p className="mt-4 max-w-xl text-base leading-6 text-[hsl(var(--oferta-detalhe))] md:mt-6 md:text-lg md:leading-7">
            {landing.subtitulo}
          </p>
        )}
        <p className="mt-8 flex items-center gap-1.5 text-sm text-[hsl(var(--oferta-muted))] md:mt-12">
          <ChevronDown aria-hidden strokeWidth={1.5} className="h-4 w-4" /> Role para conhecer
        </p>
      </motion.div>
    </section>
  );
}
