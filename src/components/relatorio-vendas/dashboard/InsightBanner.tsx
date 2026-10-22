import { Link } from 'react-router-dom';
import { ArrowRight, Lightbulb } from 'lucide-react';
import type { Sale } from '@/types/sales';
import { Button } from '@/components/ui/button';
import { DashboardCard, groupSales } from './shared';

export function InsightBanner({ sales, totalSales }: { sales: Sale[]; totalSales: number }) {
  const [topSeller] = groupSales(sales, 'seller');
  const [topChannel] = groupSales(sales, 'channel');
  if (!topSeller || !topChannel || totalSales === 0) return null;
  const share = (value: number) => `${Math.round((value / totalSales) * 100)}%`;

  return (
    <DashboardCard className="flex flex-col sm:flex-row sm:items-center gap-4">
      <div className="h-12 w-12 rounded-xl bg-primary/10 text-primary flex items-center justify-center shrink-0">
        <Lightbulb className="h-6 w-6" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="font-semibold text-sm">Destaque</p>
        <p className="text-sm text-muted-foreground">
          <span className="text-primary font-medium">{topSeller.name}</span> lidera com {share(topSeller.value)} do faturamento, e{' '}
          <span className="text-primary font-medium">{topChannel.name}</span> é o canal mais forte ({share(topChannel.value)}).
        </p>
      </div>
      <Button asChild className="gap-1.5 shrink-0">
        <Link to="/relatorio-vendas/relatorios">Ver relatórios <ArrowRight className="h-4 w-4" /></Link>
      </Button>
    </DashboardCard>
  );
}
