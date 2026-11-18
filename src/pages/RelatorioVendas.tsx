import { useSales } from '@/hooks/useSales';
import { MetricsCards, SalesTrendChart, PaymentMethodChart, SalesListCard, PerformanceCard, InsightBanner } from '@/components/relatorio-vendas/dashboard';
import { AddSaleDialog } from '@/components/relatorio-vendas/AddSaleDialog';
import { RelatorioVendasNav } from '@/components/relatorio-vendas/RelatorioVendasNav';
import { Button } from '@/components/ui/button';
import { RefreshCw, AlertCircle } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { useEffect, useMemo, useState } from 'react';
import { Select, SelectContent, SelectGroup, SelectItem, SelectLabel, SelectSeparator, SelectTrigger, SelectValue } from '@/components/ui/select';
import { calculateMetrics } from '@/hooks/useSales';
import { saoPauloDay } from '@/lib/homeSalesChart';
import { filtrarPeriodo, mesesDisponiveis, mesTitulo, resolverPeriodo, type PeriodoEscolha } from '@/lib/relatorioPeriodo';

const PERIODO_KEY = 'relatorio-vendas:periodo';
const lerEscolha = (): string => {
  try { return localStorage.getItem(PERIODO_KEY) || 'mes_atual'; } catch { return 'mes_atual'; }
};
const paraEscolha = (v: string): PeriodoEscolha => v.startsWith('mes:') ? { tipo: 'mes', mes: v.slice(4) } : { tipo: v as PeriodoEscolha['tipo'] };
const rotuloMes = (k: string) => { const [y, m] = k.split('-').map(Number); return mesTitulo(y, m - 1); };

export default function RelatorioVendas() {
  const {
    sales: allSales,
    lastUpdated,
    isLoading,
    isError,
    error,
    refetch,
    isFetching,
  } = useSales();

  const [escolha, setEscolha] = useState<string>(lerEscolha);
  useEffect(() => { try { localStorage.setItem(PERIODO_KEY, escolha); } catch { /* ignore */ } }, [escolha]);
  const today = saoPauloDay();
  const todayKey = today.toISOString().slice(0, 10);
  // "Este mês" é sempre relativo a hoje em São Paulo, então vira sozinho no novo mês.
  const periodo = useMemo(() => resolverPeriodo(paraEscolha(escolha), today), [escolha, todayKey]); // eslint-disable-line react-hooks/exhaustive-deps
  const sales = useMemo(() => filtrarPeriodo(allSales, periodo.inicio, periodo.fim), [allSales, periodo]);
  const metrics = useMemo(() => calculateMetrics(sales), [sales]);
  const meses = useMemo(() => mesesDisponiveis(allSales), [allSales]);
  const incluiHoje = periodo.inicio <= today && periodo.fim >= today;

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
          <p className="text-sm font-medium">{periodo.titulo} · {periodo.intervalo}</p>
          <p className="text-sm text-muted-foreground">
            {lastUpdated ? `Atualizado em ${formatDate(lastUpdated)}` : 'Acompanhe faturamento, vendedores e canais em tempo real.'}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <RelatorioVendasNav />
          <Select value={escolha} onValueChange={setEscolha}>
            <SelectTrigger className="h-9 w-auto gap-2 text-sm" aria-label="Período do relatório">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="mes_atual">Este mês</SelectItem>
              <SelectItem value="mes_anterior">Mês anterior</SelectItem>
              <SelectItem value="ultimos30">Últimos 30 dias</SelectItem>
              {meses.length > 0 && <SelectSeparator />}
              {meses.length > 0 && <SelectGroup><SelectLabel className="text-xs text-muted-foreground">Escolher mês</SelectLabel>
              {meses.map(k => <SelectItem key={k} value={`mes:${k}`}>{rotuloMes(k)}</SelectItem>)}</SelectGroup>}
              {escolha.startsWith('mes:') && !meses.includes(escolha.slice(4)) && <SelectItem value={escolha}>{rotuloMes(escolha.slice(4))}</SelectItem>}
            </SelectContent>
          </Select>
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
          <MetricsCards periodo={periodo} sales={allSales} totalSales={metrics.totalSales} totalCount={metrics.totalCount} averageTicket={metrics.averageTicket} />

          <div className="grid gap-4 grid-cols-1 lg:grid-cols-3">
            <SalesTrendChart sales={allSales} periodo={periodo} />
            <PaymentMethodChart data={metrics.salesByPaymentMethod} />
          </div>

          <div className="grid gap-4 grid-cols-1 lg:grid-cols-3">
            <SalesListCard key={escolha} sales={sales} defaultView={incluiHoje ? 'today' : 'recent'} />
            <PerformanceCard sales={sales} />
          </div>

          <InsightBanner sales={sales} totalSales={metrics.totalSales} />
        </>
      )}
    </div>
  );
}
