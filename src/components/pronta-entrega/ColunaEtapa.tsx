import { cn } from '@/lib/utils';

interface Props {
  titulo: string;
  total: number;
  atrasados: number;
  venceHoje: number;
  /** Texto quando a coluna está vazia. */
  vazio: string;
  /** No celular só a aba escolhida aparece; no desktop todas aparecem. */
  visivelNoCelular: boolean;
  /** Barra opcional acima dos cards (ex.: seleção múltipla). */
  barra?: React.ReactNode;
  children: React.ReactNode;
}

export function ColunaEtapa({ titulo, total, atrasados, venceHoje, vazio, visivelNoCelular, barra, children }: Props) {
  return (
    <section
      aria-label={titulo}
      className={cn('min-h-0 min-w-0 flex-col', visivelNoCelular ? 'flex' : 'hidden lg:flex')}
    >
      <header className="mb-3 shrink-0 border-b pb-3">
        <div className="flex items-baseline gap-3">
          <span className="text-4xl font-semibold tabular-nums">{total}</span>
          <h2 className="text-sm font-medium text-muted-foreground">{titulo}</h2>
        </div>

        {(atrasados > 0 || venceHoje > 0) && (
          <p className="mt-1 flex flex-wrap items-center gap-x-3 text-xs font-medium">
            {atrasados > 0 && (
              <span className="text-destructive">
                {atrasados} {atrasados === 1 ? 'atrasado' : 'atrasados'}
              </span>
            )}
            {/* Âmbar em letra pequena não tem contraste: a cor vai num ponto ao lado. */}
            {venceHoje > 0 && (
              <span className="flex items-center gap-1.5">
                <span aria-hidden className="h-2 w-2 rounded-full bg-warning" />
                {venceHoje} para hoje
              </span>
            )}
          </p>
        )}
      </header>

      <div className="pe-column-scroll min-h-0 space-y-2 lg:overflow-y-auto lg:pr-1">
        {barra}
        {total > 0 ? children : <p className="border border-dashed p-4 text-xs text-muted-foreground">{vazio}</p>}
      </div>
    </section>
  );
}
