import { NIVEL_LABEL, comparativo, garantiaTexto, prazoTexto, type LaminaResolvida } from '@/lib/landingsRegras';
import { CtaLink } from './CtaLink';
import { BOTAO_NEUTRO, HAIRLINE } from './estilo';

interface Props {
  laminas: LaminaResolvida[];
  onClique?: (lamina: LaminaResolvida) => void;
}

const COLUNAS: Record<number, string> = { 2: 'sm:grid-cols-2', 3: 'sm:grid-cols-3' };

/** A primeira lâmina de cada nível lado a lado. Só aparece com 2 níveis ou mais. */
export function Comparativo({ laminas, onClique }: Props) {
  const itens = comparativo(laminas);
  if (itens.length < 2) return null;

  return (
    <section aria-labelledby="titulo-comparativo" className={`border-t ${HAIRLINE} py-16 md:py-24`}>
      <h2 id="titulo-comparativo" className="font-bebas text-[44px] leading-none text-[hsl(var(--oferta-texto))] md:text-[64px]">
        Lado a lado
      </h2>
      <p className="mt-3 text-base text-[hsl(var(--oferta-muted))]">A primeira escolha de cada nível</p>

      <div
        className={`-mx-3 mt-8 flex snap-x snap-mandatory scroll-px-3 gap-3 overflow-x-auto px-3 pb-2 sm:mx-0 sm:grid sm:gap-6 sm:overflow-visible sm:px-0 sm:pb-0 ${COLUNAS[itens.length]}`}
      >
        {itens.map((l) => {
          const m = l.modelo;
          const consulta = l.exibicaoPreco === 'consulta' || !(Number(m.preco_base) > 0);
          return (
            <article
              key={l.id}
              className={`flex w-[78%] shrink-0 snap-start flex-col overflow-hidden rounded-xl border ${HAIRLINE} bg-[hsl(var(--oferta-modal))] sm:w-auto`}
            >
              <div className="aspect-[4/3] overflow-hidden bg-[hsl(var(--oferta-fundo))]">
                {m.imagem_modelo && <img src={m.imagem_modelo} alt={m.nome_modelo} loading="lazy" decoding="async" className="h-full w-full object-cover" />}
              </div>
              <div className="flex flex-1 flex-col gap-4 p-4 md:p-5">
                <div>
                  <p className="text-xs text-[hsl(var(--oferta-muted))]">{NIVEL_LABEL[l.nivel]}</p>
                  <h3 className="mt-1 line-clamp-2 min-h-[2em] font-bebas text-[26px] leading-none text-[hsl(var(--oferta-texto))] md:text-[30px]">
                    {m.nome_modelo}
                  </h3>
                </div>
                <dl className="divide-y divide-[hsl(var(--oferta-texto)/0.08)] text-sm">
                  <div className="flex items-baseline justify-between gap-3 py-2.5">
                    <dt className="text-[hsl(var(--oferta-muted))]">Preço</dt>
                    <dd className={`text-right tabular-nums ${consulta ? 'text-[hsl(var(--oferta-detalhe))]' : 'font-semibold text-accent'}`}>{l.precoTexto}</dd>
                  </div>
                  <div className="flex items-baseline justify-between gap-3 py-2.5">
                    <dt className="text-[hsl(var(--oferta-muted))]">Prazo de entrega</dt>
                    <dd className="text-right text-[hsl(var(--oferta-texto))]">{prazoTexto(m)}</dd>
                  </div>
                  <div className="flex items-baseline justify-between gap-3 py-2.5">
                    <dt className="text-[hsl(var(--oferta-muted))]">Garantia</dt>
                    <dd className="text-right text-[hsl(var(--oferta-texto))]">{garantiaTexto(m)}</dd>
                  </div>
                </dl>
                <CtaLink destino={l.destino} className={`${BOTAO_NEUTRO} mt-auto w-full`} onClique={() => onClique?.(l)}>
                  {l.ctaLabel}
                </CtaLink>
              </div>
            </article>
          );
        })}
      </div>
    </section>
  );
}
