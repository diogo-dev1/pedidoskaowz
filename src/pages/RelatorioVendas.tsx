import { useSales } from '@/hooks/useSales';
import { MetricsCards, TodaySalesList, RecentSalesList, WeeklySalesList, PaymentMethodChart, SellerChart, ChannelChart } from '@/components/relatorio-vendas/dashboard';
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
    <div className="space-y-4 md:space-y-6">
      {/* Header with refresh button */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="space-y-2">
          <h2 className="text-xl md:text-2xl font-bold tracking-tight">Relatório de Vendas</h2>
          <RelatorioVendasNav />
        </div>
        <div className="flex items-center gap-3">
          {lastUpdated && (
            <span className="text-xs text-muted-foreground hidden md:block">
              Atualizado em {formatDate(lastUpdated)}
            </span>
          )}
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
          <div className="grid gap-3 grid-cols-1 sm:grid-cols-3">
            {[1, 2, 3].map(i => <Skeleton key={i} className="h-24 rounded-lg" />)}
          </div>
          <Skeleton className="h-[300px] rounded-lg" />
          <div className="grid gap-3 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
            {[1, 2, 3].map(i => <Skeleton key={i} className="h-[280px] rounded-lg" />)}
          </div>
        </div>
      ) : (
        <>
          {/* Metrics Cards */}
          <MetricsCards totalSales={metrics.totalSales} totalCount={metrics.totalCount} averageTicket={metrics.averageTicket} />

          {/* Sales Lists Grid */}
          <div className="grid gap-4 grid-cols-1 md:grid-cols-2 xl:grid-cols-3">
            <TodaySalesList sales={sales} />
            <RecentSalesList sales={sales} />
            <WeeklySalesList sales={sales} />
          </div>

          {/* Charts Grid */}
          <div className="grid gap-3 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
            <PaymentMethodChart data={metrics.salesByPaymentMethod} />
            <SellerChart data={metrics.salesBySeller} />
            <ChannelChart data={metrics.salesByChannel} />
          </div>
        </>
      )}
    </div>
  );
}
