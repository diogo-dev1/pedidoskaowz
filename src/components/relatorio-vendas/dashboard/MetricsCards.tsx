import { useMemo } from 'react';
import { Area, AreaChart, ResponsiveContainer } from 'recharts';
import type { Sale } from '@/types/sales';
import { addDays, aggregateSales, chartBuckets, rangeTotal, saoPauloDay } from '@/lib/homeSalesChart';
import { DashboardCard, DeltaBadge, formatBRL, percentChange } from './shared';

interface MetricCardProps {
  title: string;
  value: string;
  change: number | null;
  subtitle: string;
  trend: number[];
  id: string;
}

function Sparkline({ data, id }: { data: number[]; id: string }) {
  const points = data.map((value, index) => ({ index, value }));
  return (
    <div className="h-10 mt-3 -mx-1" aria-hidden>
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={points} margin={{ top: 2, right: 0, left: 0, bottom: 0 }}>
          <defs>
            <linearGradient id={`spark-${id}`} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="hsl(var(--chart-1))" stopOpacity={0.35} />
              <stop offset="100%" stopColor="hsl(var(--chart-1))" stopOpacity={0} />
            </linearGradient>
          </defs>
          <Area type="monotone" dataKey="value" stroke="hsl(var(--chart-1))" strokeWidth={1.5} fill={`url(#spark-${id})`} isAnimationActive={false} />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}

function MetricCard({ title, value, change, subtitle, trend, id }: MetricCardProps) {
  return (
    <DashboardCard className="flex flex-col">
      <p className="text-xs sm:text-sm text-muted-foreground">{title}</p>
      <div className="flex flex-wrap items-center gap-x-2 gap-y-1 mt-1.5">
        <p className="text-xl sm:text-2xl font-bold tabular-nums tracking-tight">{value}</p>
        <DeltaBadge change={change} />
      </div>
      <p className="text-[11px] sm:text-xs text-muted-foreground mt-1">{subtitle}</p>
      <Sparkline data={trend} id={id} />
    </DashboardCard>
  );
}

interface MetricsCardsProps {
  sales: Sale[];
  totalSales: number;
  totalCount: number;
  averageTicket: number;
}

// Badges compare the last 30 days with the 30 days before; today's card compares with yesterday.
export function MetricsCards({ sales, totalSales, totalCount, averageTicket }: MetricsCardsProps) {
  const stats = useMemo(() => {
    const days = aggregateSales(sales);
    const today = saoPauloDay();
    const buckets = chartBuckets(days, today, 'day');
    const current = rangeTotal(days, addDays(today, -29), today);
    const previous = rangeTotal(days, addDays(today, -59), addDays(today, -30));
    const ticket = (t: { value: number; count: number }) => (t.count ? t.value / t.count : 0);
    const todayTotal = rangeTotal(days, today, today);
    const yesterday = rangeTotal(days, addDays(today, -1), addDays(today, -1));
    return {
      valueTrend: buckets.map(b => b.value),
      countTrend: buckets.map(b => b.count),
      ticketTrend: buckets.map(b => (b.count ? b.value / b.count : 0)),
      valueChange: percentChange(current.value, previous.value),
      countChange: percentChange(current.count, previous.count),
      ticketChange: percentChange(ticket(current), ticket(previous)),
      todayTotal,
      yesterday,
      todayChange: percentChange(todayTotal.value, yesterday.value),
    };
  }, [sales]);

  return (
    <div className="grid gap-3 sm:gap-4 grid-cols-1 sm:grid-cols-2 xl:grid-cols-4">
      <MetricCard id="total" title="Total de Vendas" value={formatBRL(totalSales)} change={stats.valueChange} subtitle="30 dias vs. 30 dias anteriores" trend={stats.valueTrend} />
      <MetricCard id="count" title="Quantidade" value={totalCount.toString()} change={stats.countChange} subtitle="transações" trend={stats.countTrend} />
      <MetricCard id="ticket" title="Ticket Médio" value={formatBRL(averageTicket)} change={stats.ticketChange} subtitle="30 dias vs. 30 dias anteriores" trend={stats.ticketTrend} />
      <MetricCard
        id="today"
        title="Vendas Hoje"
        value={formatBRL(stats.todayTotal.value)}
        change={stats.todayChange}
        subtitle={`${stats.todayTotal.count} ${stats.todayTotal.count === 1 ? 'venda' : 'vendas'} · ontem ${formatBRL(stats.yesterday.value, 0)}`}
        trend={stats.valueTrend.slice(-7)}
      />
    </div>
  );
}
