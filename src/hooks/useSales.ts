import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Sale, SalesMetrics } from '@/types/sales';

async function fetchSales(): Promise<{ sales: Sale[]; timestamp: string }> {
  const { data, error } = await supabase.functions.invoke('fetch-sales');

  if (error) {
    throw new Error(error.message);
  }

  return data;
}

function calculateMetrics(sales: Sale[]): SalesMetrics {
  const totalSales = sales.reduce((sum, sale) => sum + sale.value, 0);
  const totalCount = sales.length;
  const averageTicket = totalCount > 0 ? totalSales / totalCount : 0;

  const salesByPaymentMethod: Record<string, number> = {};
  const salesBySeller: Record<string, number> = {};
  const salesByChannel: Record<string, number> = {};
  const salesByDateMap: Record<string, number> = {};

  sales.forEach(sale => {
    // By payment method
    const method = sale.paymentMethod || 'Não informado';
    salesByPaymentMethod[method] = (salesByPaymentMethod[method] || 0) + sale.value;

    // By seller
    const seller = sale.seller || 'Não informado';
    salesBySeller[seller] = (salesBySeller[seller] || 0) + sale.value;

    // By channel
    const channel = sale.channel || 'Não informado';
    salesByChannel[channel] = (salesByChannel[channel] || 0) + sale.value;

    // By date
    const date = sale.date || 'Não informado';
    salesByDateMap[date] = (salesByDateMap[date] || 0) + sale.value;
  });

  // Convert date map to sorted array
  const salesByDate = Object.entries(salesByDateMap)
    .map(([date, value]) => ({ date, value }))
    .sort((a, b) => {
      // Parse Brazilian date format DD/MM/YYYY
      const [dayA, monthA, yearA] = a.date.split('/').map(Number);
      const [dayB, monthB, yearB] = b.date.split('/').map(Number);
      const dateA = new Date(yearA, monthA - 1, dayA);
      const dateB = new Date(yearB, monthB - 1, dayB);
      return dateA.getTime() - dateB.getTime();
    });

  return {
    totalSales,
    totalCount,
    averageTicket,
    salesByPaymentMethod,
    salesBySeller,
    salesByChannel,
    salesByDate,
  };
}

export function useSales() {
  const query = useQuery({
    queryKey: ['sales'],
    queryFn: fetchSales,
    staleTime: 1000 * 60 * 5, // 5 minutes
    refetchInterval: 1000 * 60 * 5, // Auto-refresh every 5 minutes
  });

  const sales = query.data?.sales || [];
  const metrics = calculateMetrics(sales);
  const lastUpdated = query.data?.timestamp;

  return {
    sales,
    metrics,
    lastUpdated,
    isLoading: query.isLoading,
    isError: query.isError,
    error: query.error,
    refetch: query.refetch,
    isFetching: query.isFetching,
  };
}
