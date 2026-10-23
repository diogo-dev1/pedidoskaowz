import { useMemo } from 'react';
import type { Sale } from '@/types/sales';
import { aggregateSales, dateKey, periodRankings, periodSummaries, salesBRL, saoPauloDay } from '@/lib/homeSalesChart';
import { cn } from '@/lib/utils';

const names = { day: 'Hoje', week: 'Semana', month: 'Mês' };
const countText = (count: number) => `${count} ${count === 1 ? 'venda' : 'vendas'}`;

export function HomeSalesChart({ sales }: { sales: Sale[] }) {
  const todayKey = dateKey(saoPauloDay());
  const days = useMemo(() => aggregateSales(sales), [sales]);
  const today = useMemo(() => new Date(`${todayKey}T00:00:00Z`), [todayKey]);
  const summaries = useMemo(() => periodSummaries(days, today), [days, today]);
  const rankings = useMemo(() => periodRankings(sales, today), [sales, today]);

  return (
    <div className="grid grid-cols-1 gap-2 sm:grid-cols-3 sm:gap-3" aria-label="Resumo de vendas">
      {summaries.map(summary => (
        <div key={summary.type} className="rounded-xl border bg-card p-3 sm:p-4 min-w-0">
          <div className="flex items-baseline justify-between gap-2">
            <span className="text-xs font-medium text-muted-foreground">{names[summary.type]}</span>
            <span className="text-[11px] text-muted-foreground">{countText(summary.count)}</span>
          </div>
          <p className="text-lg font-bold tabular-nums">{salesBRL(summary.value)}</p>
          {rankings[summary.type].length > 0 && (
            <ol className="mt-2 space-y-0.5">
              {rankings[summary.type].map((rank, i) => (
                <li key={rank.seller} className={cn('flex items-baseline justify-between gap-2 text-xs', i > 0 && 'text-muted-foreground')}>
                  <span className="min-w-0 truncate">{rank.seller}</span>
                  <span className="shrink-0 tabular-nums">{salesBRL(rank.value)}</span>
                </li>
              ))}
            </ol>
          )}
        </div>
      ))}
    </div>
  );
}
