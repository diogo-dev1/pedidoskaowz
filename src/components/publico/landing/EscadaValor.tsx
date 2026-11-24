import type { ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { motion, useReducedMotion } from 'framer-motion';
import { NIVEIS, NIVEL_LABEL, agruparPorNivel, type Landing, type LaminaResolvida } from '@/lib/landingsRegras';
import { LaminaLandingCard } from './LaminaLandingCard';
import { HAIRLINE } from './estilo';

interface Props {
  landing: Landing;
  laminas: LaminaResolvida[];
  onClique?: (lamina: LaminaResolvida) => void;
}

/** Card sobe e aparece ao entrar na tela, uma vez só. Definitiva revela mais devagar. */
function Revelar({ children, indice, lento }: { children: ReactNode; indice: number; lento: boolean }) {
  const reduzir = useReducedMotion();
  if (reduzir) return <div className="h-full">{children}</div>;
  return (
    <motion.div
      className="h-full"
      initial={{ opacity: 0, y: lento ? 24 : 16 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: '0px 0px -12% 0px' }}
      transition={{ duration: lento ? 0.8 : 0.45, delay: Math.min(indice, 5) * (lento ? 0.12 : 0.06), ease: [0.23, 1, 0.32, 1] }}
    >
      {children}
    </motion.div>
  );
}

/** Blocos Entrada → Ideal → Definitiva. Nível sem lâmina não aparece. */
export function EscadaValor({ landing, laminas, onClique }: Props) {
  const grupos = agruparPorNivel(laminas);
  const niveis = NIVEIS.filter((n) => grupos[n].length > 0);

  return (
    <section id="laminas" aria-labelledby="titulo-laminas" className="scroll-mt-20 py-16 md:py-24">
      <h2 id="titulo-laminas" className="font-bebas text-[44px] leading-none text-[hsl(var(--oferta-texto))] md:text-[72px]">
        Do primeiro passo à definitiva
      </h2>

      {niveis.length === 0 ? (
        <p className="mt-4 max-w-xl text-base leading-7 text-[hsl(var(--oferta-detalhe))]">
          As lâminas desta categoria estão sendo escolhidas.{' '}
          <Link to="/vitrine" className="underline underline-offset-4 hover:text-[hsl(var(--oferta-texto))]">
            Veja todas as lâminas
          </Link>
        </p>
      ) : (
        <>
          <p className="mt-3 text-base text-[hsl(var(--oferta-muted))]">
            {laminas.length} {laminas.length === 1 ? 'lâmina escolhida' : 'lâminas escolhidas'} para {landing.titulo.toLowerCase()}
          </p>
          {niveis.map((nivel) => {
            const frase = landing[`texto_nivel_${nivel}`];
            return (
              <div key={nivel} className="mt-12 md:mt-20">
                <div className={`mb-6 flex flex-col gap-1 border-t ${HAIRLINE} pt-6 md:mb-8 md:flex-row md:items-baseline md:gap-8`}>
                  <h3 className="shrink-0 text-sm text-[hsl(var(--oferta-muted))] md:w-32">{NIVEL_LABEL[nivel]}</h3>
                  {frase && <p className="max-w-2xl text-xl leading-7 text-[hsl(var(--oferta-texto))] md:text-2xl md:leading-8">{frase}</p>}
                </div>
                <div className={nivel === 'definitiva' ? 'grid gap-4 sm:grid-cols-2 md:gap-6' : 'grid grid-cols-2 gap-3 md:gap-6 lg:grid-cols-3'}>
                  {grupos[nivel].map((l, i) => (
                    <Revelar key={l.id} indice={i} lento={nivel === 'definitiva'}>
                      <LaminaLandingCard lamina={l} grande={nivel === 'definitiva'} onClique={onClique} />
                    </Revelar>
                  ))}
                </div>
              </div>
            );
          })}
        </>
      )}
    </section>
  );
}
