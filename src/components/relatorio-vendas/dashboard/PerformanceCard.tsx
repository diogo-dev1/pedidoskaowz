import { useMemo, useState } from 'react';
import { Radio, UserRound } from 'lucide-react';
import type { Sale } from '@/types/sales';
import { cn } from '@/lib/utils';
import { DashboardCard, formatBRL, groupSales } from './shared';

type Breakdown = 'seller' | 'channel';

const tabs: { key: Breakdown; label: string; icon: typeof UserRound }[] = [
  { key: 'seller', label: 'Vendedor', icon: UserRound },
  { key: 'channel', label: 'Canal', icon: Radio },
];

export function PerformanceCard({ sales }: { sales: Sale[] }) {
  const [breakdown, setBreakdown] = useState<Breakdown>('seller');
  const groups = useMemo(() => groupSales(sales, breakdown), [sales, breakdown]);
  const total = groups.reduce((sum, group) => sum + group.value, 0);
  const Icon = tabs.find(tab => tab.key === breakdown)!.icon;

  return (
    <DashboardCard className="flex flex-col">
      <div className="flex items-center justify-between gap-3 mb-4">
        <h3 className="font-semibold">Desempenho</h3>
        <div role="tablist" aria-label="Agrupar por" className="flex rounded-lg border overflow-hidden">
          {tabs.map(tab => (
            <button
              key={tab.key}
              role="tab"
              aria-selected={breakdown === tab.key}
              onClick={() => setBreakdown(tab.key)}
              className={cn(
                'px-2.5 py-1 text-xs font-medium transition-colors',
                breakdown === tab.key ? 'bg-accent text-accent-foreground' : 'text-muted-foreground hover:bg-muted',
              )}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      <ul className="space-y-3 max-h-[380px] overflow-y-auto flex-1">
        {groups.map(group => (
          <li key={group.name} className="rounded-lg border p-3 flex items-center gap-3">
            <div className="h-10 w-10 rounded-lg bg-primary/10 text-primary flex items-center justify-center shrink-0">
              <Icon className="h-5 w-5" />
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2 min-w-0">
                <p className="font-medium text-sm truncate">{group.name}</p>
                <span className="text-[10px] font-medium rounded px-1.5 py-0.5 bg-success/10 text-success whitespace-nowrap">
                  {total ? Math.round((group.value / total) * 100) : 0}%
                </span>
              </div>
              <p className="text-xs text-muted-foreground">{group.count} {group.count === 1 ? 'venda' : 'vendas'}</p>
            </div>
            <div className="text-right shrink-0">
              <p className="text-[10px] text-muted-foreground">Vendido</p>
              <p className="text-base sm:text-lg font-bold text-primary tabular-nums">{formatBRL(group.value, 0)}</p>
            </div>
          </li>
        ))}
        {groups.length === 0 && <li className="text-sm text-muted-foreground text-center py-8">Sem dados</li>}
      </ul>
    </DashboardCard>
  );
}
