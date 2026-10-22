import { useSales } from '@/hooks/useSales';
import { MetricsCards, SalesTrendChart, PaymentMethodChart, SalesListCard, PerformanceCard, InsightBanner } from '@/components/relatorio-vendas/dashboard';
import { AddSaleDialog } from '@/components/relatorio-vendas/AddSaleDialog';
import { RelatorioVendasNav } from '@/components/relatorio-vendas/RelatorioVendasNav';
import { Button } from '@/components/ui/button';
import { RefreshCw, AlertCircle } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';

export default function RelatorioVendas() {
  const {
    sales,
    metrics,
    lastUpdated,
    isLoading,
    isError,
    error,
    refetch,
    isFetching,
  } = useSales();

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString('pt-BR');
  };

  return (
    <div className="space-y-4 md:space-y-5">
      {/* Header */}
      <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-4">
        <div className="space-y-1">
          <p className="text-xs font-semibold uppercase tracking-wider text-primary">Relatório de Vendas</p>
          <h2 className="text-2xl md:text-3xl font-bold tracking-tight">Dashboard de Vendas</h2>
          <p className="text-sm text-muted-foreground">
            {lastUpdated ? `Atualizado em ${formatDate(lastUpdated)}` : 'Acompanhe faturamento, vendedores e canais em tempo real.'}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <RelatorioVendasNav />
          <Button variant="outline" size="sm" onClick={() => refetch()} disabled={isFetching}>
            <RefreshCw className={`h-4 w-4 mr-2 ${isFetching ? 'animate-spin' : ''}`} />
            Atualizar
          </Button>
          <AddSaleDialog onSaleAdded={() => refetch()} />
        </div>
      </div>

      {/* Error state */}
      {isError && (
        <div className="flex items-center gap-2 p-3 rounded-lg bg-destructive/10 text-destructive text-sm">
          <AlertCircle className="h-4 w-4 flex-shrink-0" />
          <span>Erro ao carregar dados: {error?.message}</span>
        </div>
      )}

      {/* Loading state */}
      {isLoading ? (
        <div className="space-y-4">
          <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 xl:grid-cols-4">
            {[1, 2, 3, 4].map(i => <Skeleton key={i} className="h-36 rounded-xl" />)}
          </div>
          <div className="grid gap-4 grid-cols-1 lg:grid-cols-3">
            <Skeleton className="h-[340px] rounded-xl lg:col-span-2" />
            <Skeleton className="h-[340px] rounded-xl" />
          </div>
          <div className="grid gap-4 grid-cols-1 lg:grid-cols-3">
            <Skeleton className="h-[420px] rounded-xl lg:col-span-2" />
            <Skeleton className="h-[420px] rounded-xl" />
          </div>
        </div>
      ) : (
        <>
          <MetricsCards sales={sales} totalSales={metrics.totalSales} totalCount={metrics.totalCount} averageTicket={metrics.averageTicket} />

          <div className="grid gap-4 grid-cols-1 lg:grid-cols-3">
            <SalesTrendChart sales={sales} />
            <PaymentMethodChart data={metrics.salesByPaymentMethod} />
          </div>

          <div className="grid gap-4 grid-cols-1 lg:grid-cols-3">
            <SalesListCard sales={sales} />
            <PerformanceCard sales={sales} />
          </div>

          <InsightBanner sales={sales} totalSales={metrics.totalSales} />
        </>
      )}
    </div>
  );
}
