import { Card, CardContent } from '@/components/ui/card';
import { DollarSign, ShoppingCart, TrendingUp, LucideIcon } from 'lucide-react';

interface MetricCardProps {
  title: string;
  value: string;
  subtitle?: string;
  icon: LucideIcon;
}

function MetricCard({ title, value, subtitle, icon: Icon }: MetricCardProps) {
  return (
    <Card>
      <CardContent className="p-4">
        <div className="flex items-center justify-between">
          <div className="space-y-0.5">
            <p className="text-xs font-medium text-muted-foreground">{title}</p>
            <p className="text-lg md:text-xl font-bold">{value}</p>
            {subtitle && (
              <p className="text-xs text-muted-foreground">{subtitle}</p>
            )}
          </div>
          <div className="p-2 rounded-full bg-accent/10">
            <Icon className="h-4 w-4 md:h-5 md:w-5 text-accent" />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

interface MetricsCardsProps {
  totalSales: number;
  totalCount: number;
  averageTicket: number;
}

export function MetricsCards({ totalSales, totalCount, averageTicket }: MetricsCardsProps) {
  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(value);
  };

  return (
    <div className="grid gap-3 grid-cols-1 sm:grid-cols-3">
      <MetricCard
        title="Total de Vendas"
        value={formatCurrency(totalSales)}
        icon={DollarSign}
      />
      <MetricCard
        title="Quantidade"
        value={totalCount.toString()}
        subtitle="transações"
        icon={ShoppingCart}
      />
      <MetricCard
        title="Ticket Médio"
        value={formatCurrency(averageTicket)}
        icon={TrendingUp}
      />
    </div>
  );
}
