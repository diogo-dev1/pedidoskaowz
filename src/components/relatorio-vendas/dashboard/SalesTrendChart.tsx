import { useMemo, useState } from 'react';
import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import type { Sale } from '@/types/sales';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { aggregateSales, chartBuckets, periodSummaries, salesBRL, saoPauloDay, type SalesBucket, type SalesPeriod } from '@/lib/homeSalesChart';
import { DashboardCard, DeltaBadge } from './shared';

const periodLabels: Record<SalesPeriod, { select: string; current: string; previous: string }> = {
  day: { select: 'Por dia', current: 'Vendido hoje', previous: 'vs. ontem' },
  week: { select: 'Por semana', current: 'Vendido na semana', previous: 'vs. semana passada' },
  month: { select: 'Por mês', current: 'Vendido no mês', previous: 'vs. mês passado' },
};
const countText = (count: number) => `${count} ${count === 1 ? 'venda' : 'vendas'}`;

export function SalesTrendChart({ sales }: { sales: Sale[] }) {
  const [period, setPeriod] = useState<SalesPeriod>('day');
  const days = useMemo(() => aggregateSales(sales), [sales]);
  const today = useMemo(() => saoPauloDay(), []);
  const buckets = useMemo(() => chartBuckets(days, today, period), [days, today, period]);
  const summary = useMemo(() => periodSummaries(days, today).find(s => s.type === period)!, [days, today, period]);

  return (
    <DashboardCard className="lg:col-span-2 flex flex-col">
      <div className="flex flex-wrap items-center gap-3 mb-4">
        <h3 className="font-semibold">Evolução de Vendas</h3>
        <Select value={period} onValueChange={v => setPeriod(v as SalesPeriod)}>
          <SelectTrigger className="h-8 w-auto gap-2 text-xs" aria-label="Período">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {(Object.keys(periodLabels) as SalesPeriod[]).map(key => (
              <SelectItem key={key} value={key} className="text-xs">{periodLabels[key].select}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="flex flex-col-reverse md:flex-row gap-4 flex-1">
        <div className="h-60 md:h-auto md:min-h-[240px] flex-1 min-w-0">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={buckets} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
              <defs>
                <linearGradient id="trend-fill" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="hsl(var(--chart-1))" stopOpacity={0.3} />
                  <stop offset="100%" stopColor="hsl(var(--chart-1))" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" />
              <XAxis dataKey="label" tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }} tickLine={false} axisLine={false} interval="preserveStartEnd" minTickGap={16} />
              <YAxis tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }} tickLine={false} axisLine={false} width={56} tickFormatter={(v: number) => (v >= 1000 ? `R$ ${(v / 1000).toFixed(0)}k` : `R$ ${v}`)} />
              <Tooltip
                cursor={{ stroke: 'hsl(var(--muted-foreground))', strokeDasharray: '3 3' }}
                content={({ active, payload }) => {
                  const bucket = payload?.[0]?.payload as SalesBucket | undefined;
                  return active && bucket ? (
                    <div className="rounded-lg border bg-popover text-popover-foreground p-2 text-xs shadow-md">
                      <p className="font-medium">{bucket.period}</p>
                      <p className="text-muted-foreground">{salesBRL(bucket.value)} · {countText(bucket.count)}</p>
                    </div>
                  ) : null;
                }}
              />
              <Area
                type="monotone"
                dataKey="value"
                stroke="hsl(var(--chart-1))"
                strokeWidth={2}
                fill="url(#trend-fill)"
                dot={period === 'day' ? false : { r: 3, fill: 'hsl(var(--chart-1))', strokeWidth: 0 }}
                activeDot={{ r: 4 }}
                isAnimationActive={false}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-1 md:w-40 gap-3 md:content-start">
          <div className="rounded-lg border border-primary/60 p-3">
            <p className="text-lg sm:text-xl font-bold tabular-nums">{salesBRL(summary.value)}</p>
            <p className="text-[11px] text-muted-foreground mt-0.5">{periodLabels[period].current}</p>
            <p className="text-[11px] text-muted-foreground">{countText(summary.count)}</p>
          </div>
          <div className="rounded-lg border p-3">
            {summary.change === null ? (
              <p className="text-lg font-bold text-muted-foreground">—</p>
            ) : (
              <DeltaBadge change={summary.change} className="text-base px-2" />
            )}
            <p className="text-[11px] text-muted-foreground mt-1">{periodLabels[period].previous}</p>
            <p className="text-[11px] text-muted-foreground tabular-nums">{salesBRL(summary.previous)}</p>
          </div>
        </div>
      </div>
    </DashboardCard>
  );
}
