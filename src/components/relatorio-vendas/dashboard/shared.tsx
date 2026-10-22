import { ArrowDown, ArrowUp } from 'lucide-react';
import type { Sale } from '@/types/sales';
import { cn } from '@/lib/utils';

export const formatBRL = (value: number, fractionDigits = 2) =>
  new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
    minimumFractionDigits: fractionDigits,
    maximumFractionDigits: fractionDigits,
  }).format(value);

export const parseSaleDate = (dateStr: string): Date => {
  const [day, month, year] = dateStr.split('/').map(Number);
  return new Date(year, month - 1, day);
};

export const percentChange = (current: number, previous: number) =>
  previous === 0 ? null : ((current - previous) / previous) * 100;

export function groupSales(sales: Sale[], field: 'seller' | 'channel' | 'paymentMethod') {
  const groups: Record<string, { value: number; count: number }> = {};
  for (const sale of sales) {
    const key = sale[field] || 'Não informado';
    groups[key] = groups[key] ?? { value: 0, count: 0 };
    groups[key].value += sale.value;
    groups[key].count += 1;
  }
  return Object.entries(groups)
    .map(([name, totals]) => ({ name, ...totals }))
    .sort((a, b) => b.value - a.value);
}

export function DeltaBadge({ change, className }: { change: number | null; className?: string }) {
  if (change === null || !Number.isFinite(change)) return null;
  const up = change >= 0;
  const Icon = up ? ArrowUp : ArrowDown;
  return (
    <span
      className={cn(
        'inline-flex items-center gap-0.5 rounded-md px-1.5 py-0.5 text-[11px] font-medium tabular-nums',
        up ? 'bg-success/10 text-success' : 'bg-destructive/10 text-destructive',
        className,
      )}
    >
      <Icon className="h-3 w-3" />
      {Math.abs(change).toFixed(1).replace('.', ',')}%
    </span>
  );
}

export function DashboardCard({ className, children }: { className?: string; children: React.ReactNode }) {
  return <div className={cn('rounded-xl border bg-card text-card-foreground p-4 sm:p-5 min-w-0', className)}>{children}</div>;
}
