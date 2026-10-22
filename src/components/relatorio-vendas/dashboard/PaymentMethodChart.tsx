import { Cell, Pie, PieChart, ResponsiveContainer } from 'recharts';
import { DashboardCard, formatBRL } from './shared';

interface PaymentMethodChartProps {
  data: Record<string, number>;
}

const COLORS = ['hsl(var(--chart-1))', 'hsl(var(--chart-2))', 'hsl(var(--chart-3))', 'hsl(var(--chart-4))', 'hsl(var(--chart-5))'];

export function PaymentMethodChart({ data }: PaymentMethodChartProps) {
  const chartData = Object.entries(data)
    .map(([name, value]) => ({ name, value }))
    .sort((a, b) => b.value - a.value);
  const total = chartData.reduce((sum, item) => sum + item.value, 0);
  const pct = (value: number) => (total ? `${((value / total) * 100).toFixed(1).replace('.', ',')}%` : '0%');

  return (
    <DashboardCard className="flex flex-col">
      <h3 className="font-semibold mb-4">Forma de Pagamento</h3>
      <div className="flex flex-col sm:flex-row lg:flex-col 2xl:flex-row items-center gap-5 flex-1">
        <div className="relative h-48 w-48 shrink-0">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie data={chartData} dataKey="value" innerRadius="72%" outerRadius="100%" paddingAngle={2} stroke="none" isAnimationActive={false}>
                {chartData.map((entry, index) => (
                  <Cell key={entry.name} fill={COLORS[index % COLORS.length]} />
                ))}
              </Pie>
            </PieChart>
          </ResponsiveContainer>
          <div className="absolute inset-0 flex flex-col items-center justify-center text-center pointer-events-none">
            <p className="text-lg font-bold tabular-nums leading-tight">{formatBRL(total, 0)}</p>
            <p className="text-xs text-muted-foreground">Total</p>
          </div>
        </div>
        <ul className="space-y-3 w-full min-w-0">
          {chartData.map((item, index) => (
            <li key={item.name} className="flex items-start gap-2.5">
              <span className="mt-1.5 h-2.5 w-2.5 rounded-full shrink-0" style={{ backgroundColor: COLORS[index % COLORS.length] }} />
              <div className="min-w-0">
                <p className="text-sm font-medium truncate">{item.name}</p>
                <p className="text-xs text-muted-foreground tabular-nums">{formatBRL(item.value, 0)} ({pct(item.value)})</p>
              </div>
            </li>
          ))}
        </ul>
      </div>
    </DashboardCard>
  );
}
