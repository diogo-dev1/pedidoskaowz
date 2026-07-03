import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { Sale } from '@/types/sales';
import { CalendarDays, TrendingDown } from 'lucide-react';

interface WeeklySalesListProps {
  sales: Sale[];
}

export function WeeklySalesList({ sales }: WeeklySalesListProps) {
  const today = new Date();
  const startOfWeek = new Date(today);
  startOfWeek.setDate(today.getDate() - today.getDay());
  startOfWeek.setHours(0, 0, 0, 0);

  const endOfWeek = new Date(startOfWeek);
  endOfWeek.setDate(startOfWeek.getDate() + 6);
  endOfWeek.setHours(23, 59, 59, 999);

  const parseDate = (dateStr: string): Date => {
    const [day, month, year] = dateStr.split('/').map(Number);
    return new Date(year, month - 1, day);
  };

  const weeklySales = sales.filter(sale => {
    const saleDate = parseDate(sale.date);
    return saleDate >= startOfWeek && saleDate <= endOfWeek;
  });

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(value);
  };

  const totalWeek = weeklySales.reduce((sum, sale) => sum + sale.value, 0);

  const formatDateShort = (date: Date) => {
    return `${String(date.getDate()).padStart(2, '0')}/${String(date.getMonth() + 1).padStart(2, '0')}`;
  };

  return (
    <Card className="h-full flex flex-col border-0 shadow-md bg-gradient-to-br from-card to-card/80">
      <CardHeader className="pb-2 space-y-0">
        <div className="flex items-start justify-between gap-2">
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-lg bg-accent/10">
              <CalendarDays className="h-4 w-4 text-accent" />
            </div>
            <div>
              <CardTitle className="text-base font-semibold">Semana</CardTitle>
              <p className="text-xs text-muted-foreground">
                {formatDateShort(startOfWeek)} - {formatDateShort(endOfWeek)}
              </p>
            </div>
          </div>
          <div className="text-right">
            <p className="text-lg font-bold text-accent">{formatCurrency(totalWeek)}</p>
            <p className="text-[10px] text-muted-foreground">{weeklySales.length} vendas</p>
          </div>
        </div>
      </CardHeader>
      <CardContent className="flex-1 pt-2 pb-3">
        <ScrollArea className="h-[220px] md:h-[260px]">
          {weeklySales.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-muted-foreground gap-2 py-8">
              <TrendingDown className="h-8 w-8 opacity-50" />
              <p className="text-sm">Nenhuma venda esta semana</p>
            </div>
          ) : (
            <div className="space-y-2 pr-3">
              {weeklySales.map((sale) => (
                <div
                  key={sale.id}
                  className="p-2.5 rounded-lg bg-muted/40 hover:bg-muted/60 transition-colors border border-border/50"
                >
                  <div className="flex items-center justify-between gap-2 mb-1.5">
                    <p className="font-medium text-sm line-clamp-1 flex-1">{sale.name}</p>
                    <p className="font-semibold text-accent text-sm whitespace-nowrap">{formatCurrency(sale.value)}</p>
                  </div>
                  <div className="flex items-center justify-between mb-2">
                    <p className="text-xs text-muted-foreground line-clamp-1 flex-1">{sale.item}</p>
                    <span className="text-[10px] text-muted-foreground ml-2">{sale.date}</span>
                  </div>
                  <div className="flex flex-wrap gap-1">
                    <Badge variant="secondary" className="text-[10px] px-1.5 py-0">{sale.seller}</Badge>
                    <Badge variant="outline" className="text-[10px] px-1.5 py-0">{sale.channel}</Badge>
                  </div>
                </div>
              ))}
            </div>
          )}
        </ScrollArea>
      </CardContent>
    </Card>
  );
}
