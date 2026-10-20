import { useMemo, useState } from 'react';
import { Bar, BarChart, CartesianGrid, Cell, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import type { Sale } from '@/types/sales';
import { aggregateSales, chartBuckets, dateKey, periodSummaries, salesBRL, saoPauloDay, type SalesBucket, type SalesPeriod } from '@/lib/homeSalesChart';
import { cn } from '@/lib/utils';

const names = { day: 'Dia', week: 'Semana', month: 'Mês' };
const titles = { day: 'Vendas por dia', week: 'Vendas por semana', month: 'Vendas por mês' };
const countText = (count: number) => `${count} ${count === 1 ? 'venda' : 'vendas'}`;

export function HomeSalesChart({ sales, dailyGoal }: { sales: Sale[]; dailyGoal: number }) {
  const [period, setPeriod] = useState<SalesPeriod>('day');
  const [drill, setDrill] = useState<SalesBucket | null>(null);
  const todayKey = dateKey(saoPauloDay());
  const days = useMemo(() => aggregateSales(sales), [sales]);
  const today = useMemo(() => new Date(`${todayKey}T00:00:00Z`), [todayKey]);
  const summaries = useMemo(() => periodSummaries(days, today), [days, today]);
  const buckets = useMemo(() => chartBuckets(days, today, period, drill), [days, today, period, drill]);
  const canDrill = period !== 'day' && !drill;
  const daily = period === 'day' || !!drill;
  const selectedBucket = drill ? chartBuckets(days, today, period).find(b => b.key === drill.key) ?? drill : null;

  return (
    <div className="rounded-xl border bg-card p-4 sm:p-5 min-w-0" aria-label="Gráfico de vendas">
      <div role="tablist" aria-label="Período de vendas" className="grid grid-cols-3 rounded-lg border overflow-hidden mb-4">
        {summaries.map(summary => (
          <Button key={summary.type} role="tab" aria-selected={period === summary.type} aria-controls="home-sales-plot" id={`sales-tab-${summary.type}`} variant="ghost"
            onClick={() => { setPeriod(summary.type); setDrill(null); }}
            className={cn('h-auto min-w-0 rounded-none flex flex-col items-start gap-1 px-2 py-3 sm:px-3 whitespace-normal text-left border-r last:border-r-0', period === summary.type ? 'bg-accent text-accent-foreground hover:bg-accent hover:text-accent-foreground' : 'text-foreground hover:bg-muted')}>
            <span className="text-xs font-medium">{names[summary.type]}</span>
            <span className="text-sm sm:text-lg font-bold tabular-nums max-w-full break-words">{salesBRL(summary.value)}</span>
            <span className="text-[11px] font-normal opacity-80">{countText(summary.count)}</span>
            <span className={cn('text-[10px] sm:text-xs font-normal leading-snug min-h-7', summary.type !== 'day' && summary.change !== null && (summary.change > 0 ? 'text-success' : summary.change < 0 ? 'text-destructive' : ''))}>
              {summary.previous !== 0 && (summary.type === 'day' ? `Ontem: ${salesBRL(summary.previous)}` : `${summary.change && summary.change > 0 ? '▲' : summary.change && summary.change < 0 ? '▼' : '—'} ${Math.abs(Math.round(summary.change ?? 0))}% vs. ${summary.type === 'week' ? 'semana passada' : 'mês passado'}`)}
            </span>
          </Button>
        ))}
      </div>
      <h2 className="font-semibold mb-2">{drill ? titles.day : titles[period]}</h2>
      {selectedBucket && <Button variant="outline" size="sm" className="h-auto py-2 mb-2 max-w-full gap-1.5 whitespace-normal text-left justify-start" onClick={() => setDrill(null)}>
        <ArrowLeft className="h-3 w-3 shrink-0" /><span>Voltar · {selectedBucket.period} · {salesBRL(selectedBucket.value)}</span>
      </Button>}
      {canDrill && <p className="text-xs text-muted-foreground mb-2">Toque numa barra para ver os dias</p>}
      <div id="home-sales-plot" role="tabpanel" aria-labelledby={`sales-tab-${period}`} className="h-56 min-w-0">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={buckets} margin={{ top: 20, right: 8, left: 0, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" />
            <XAxis dataKey="label" tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }} tickLine={false} axisLine={false} interval="preserveStartEnd" minTickGap={12} />
            <YAxis tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }} tickLine={false} axisLine={false} width={62} tickFormatter={(v: number) => v >= 1000 ? `R$ ${(v / 1000).toFixed(0)}k` : `R$ ${v}`} />
            <Tooltip cursor={{ fill: 'hsl(var(--muted))' }} content={({ active, payload }) => {
              const bucket = payload?.[0]?.payload as SalesBucket | undefined;
              return active && bucket ? <div className="rounded-lg border bg-popover text-popover-foreground p-2 text-xs shadow-md max-w-64">{bucket.period} · {salesBRL(bucket.value)} · {countText(bucket.count)}</div> : null;
            }} />
            {daily && <ReferenceLine y={dailyGoal} ifOverflow="extendDomain" stroke="hsl(var(--muted-foreground))" strokeDasharray="4 4" label={{ value: 'Meta', position: 'insideTopRight', fontSize: 10, fill: 'hsl(var(--muted-foreground))' }} />}
            <Bar dataKey="value" fill="hsl(var(--chart-1))" radius={[4, 4, 0, 0]} maxBarSize={40} minPointSize={3} isAnimationActive={false} onClick={data => { if (canDrill) setDrill(data as SalesBucket); }}>
              {buckets.map(bucket => <Cell key={bucket.key} fillOpacity={bucket.current ? 1 : 0.4} className={canDrill ? 'cursor-pointer' : ''} role={canDrill ? 'button' : undefined} tabIndex={canDrill ? 0 : undefined} aria-label={canDrill ? `Ver dias: ${bucket.period}` : undefined} onKeyDown={event => { if (canDrill && (event.key === 'Enter' || event.key === ' ')) { event.preventDefault(); setDrill(bucket); } }} />)}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}