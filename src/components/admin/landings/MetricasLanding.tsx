import { useEffect, useState } from 'react';
import { carregarMetricas, taxaFim, totalCliques, type MetricasLanding as Metricas } from '@/lib/landings';

interface Props {
  landingId: string;
}

const numero = (n: number) => n.toLocaleString('pt-BR');

/** Visitas, quem chegou ao fim e cliques por botão nos últimos 30 dias. */
export function MetricasLanding({ landingId }: Props) {
  const [m, setM] = useState<Metricas | null | undefined>(undefined);

  useEffect(() => {
    let ativo = true;
    carregarMetricas().then((mapa) => ativo && setM(mapa[landingId] ?? null));
    return () => {
      ativo = false;
    };
  }, [landingId]);

  if (m === undefined) return null;
  const visitas = m?.visitas ?? 0;
  const taxa = taxaFim(m ?? undefined);
  const cliques: [string, number][] = [
    ['Ver detalhes', m?.cliques_detalhes ?? 0],
    ['Montar', m?.cliques_montar ?? 0],
    ['Vendedor', m?.cliques_vendedor ?? 0],
    ['Quiz', m?.cliques_quiz ?? 0],
  ];

  return (
    <section aria-label="Resultados dos últimos 30 dias" className="rounded-lg border bg-card p-4">
      <p className="text-sm text-muted-foreground">Últimos 30 dias</p>
      <dl className="mt-3 grid grid-cols-2 gap-x-6 gap-y-4 md:grid-cols-[repeat(3,minmax(0,1fr))_minmax(0,2fr)]">
        <div>
          <dt className="text-xs text-muted-foreground">Visitas</dt>
          <dd className="text-2xl font-semibold tabular-nums">{numero(visitas)}</dd>
        </div>
        <div>
          <dt className="text-xs text-muted-foreground">Chegaram ao fim</dt>
          <dd className="text-2xl font-semibold tabular-nums">{taxa === null ? '—' : `${taxa}%`}</dd>
        </div>
        <div>
          <dt className="text-xs text-muted-foreground">Cliques</dt>
          <dd className="text-2xl font-semibold tabular-nums">{numero(totalCliques(m ?? undefined))}</dd>
        </div>
        <div className="col-span-2 md:col-span-1">
          <dt className="text-xs text-muted-foreground">Cliques por botão</dt>
          <dd className="mt-1 flex flex-wrap gap-x-4 gap-y-1 text-sm">
            {cliques.map(([rotulo, n]) => (
              <span key={rotulo} className="tabular-nums">
                <span className="text-muted-foreground">{rotulo}</span> {numero(n)}
              </span>
            ))}
          </dd>
        </div>
      </dl>
      {visitas === 0 && (
        <p className="mt-3 text-xs text-muted-foreground">
          Nenhuma visita registrada ainda. Visitas pela prévia não contam.
        </p>
      )}
    </section>
  );
}
