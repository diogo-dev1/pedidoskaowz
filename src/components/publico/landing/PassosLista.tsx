import type { Landing, LandingPasso } from '@/lib/landingsRegras';
import { HAIRLINE, numeroPasso } from './estilo';

interface Props {
  passos: LandingPasso[];
  landing: Pick<Landing, 'capa_url' | 'capa_tipo'>;
}

/** Mídia de um passo; sem mídia própria, usa a capa da landing. */
export function MidiaPasso({ passo, landing, ativa = true, className = '' }: { passo: LandingPasso; landing: Props['landing']; ativa?: boolean; className?: string }) {
  const url = passo.midia_url || landing.capa_url;
  const tipo = passo.midia_url ? passo.midia_tipo : landing.capa_tipo;
  if (!url) return <div className={`bg-[hsl(var(--oferta-superficie))] ${className}`} />;
  return tipo === 'video' ? (
    <video src={url} aria-label={passo.foco || passo.titulo} className={`object-cover ${className}`} muted loop playsInline autoPlay={ativa} preload="metadata" />
  ) : (
    <img src={url} alt={passo.foco || passo.titulo} loading="lazy" decoding="async" className={`object-cover ${className}`} />
  );
}

/** Versão estática dos passos: mídia acima do texto (também usada com "reduzir movimento"). */
export function PassosLista({ passos, landing }: Props) {
  if (!passos.length) return null;
  return (
    <section aria-label="Como funciona" className="mx-auto max-w-5xl space-y-16 py-16 md:space-y-24 md:py-24">
      {passos.map((p, i) => (
        <div key={p.id} className="grid items-center gap-6 md:grid-cols-2 md:gap-12">
          <figure className={`relative overflow-hidden rounded-xl border ${HAIRLINE} ${i % 2 ? 'md:order-2' : ''}`}>
            <MidiaPasso passo={p} landing={landing} className="aspect-[4/5] w-full" />
            {p.foco && (
              <figcaption className="absolute bottom-3 left-3 rounded-md bg-[hsl(var(--oferta-fundo)/0.85)] px-2 py-1 text-xs text-[hsl(var(--oferta-texto))]">
                {p.foco}
              </figcaption>
            )}
          </figure>
          <div>
            <p className="font-mono text-xs tabular-nums text-[hsl(var(--oferta-muted))]">{numeroPasso(i)}</p>
            <h2 className="mt-2 text-2xl font-medium leading-tight text-[hsl(var(--oferta-texto))] md:text-4xl">{p.titulo}</h2>
            {p.texto && <p className="mt-3 max-w-md text-base leading-7 text-[hsl(var(--oferta-detalhe))]">{p.texto}</p>}
          </div>
        </div>
      ))}
    </section>
  );
}
