import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { Sale } from '@/types/sales';
import { Clock, Inbox } from 'lucide-react';

interface RecentSalesListProps {
  sales: Sale[];
  limit?: number;
}

export function RecentSalesList({ sales, limit = 10 }: RecentSalesListProps) {
  const recentSales = [...sales]
    .sort((a, b) => {
      const [dayA, monthA, yearA] = a.date.split('/').map(Number);
      const [dayB, monthB, yearB] = b.date.split('/').map(Number);
      const dateA = new Date(yearA, monthA - 1, dayA);
      const dateB = new Date(yearB, monthB - 1, dayB);
      return dateB.getTime() - dateA.getTime();
    })
    .slice(0, limit);

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(value);
  };

  return (
    <Card className="h-full flex flex-col border-0 shadow-md bg-gradient-to-br from-card to-card/80">
      <CardHeader className="pb-2 space-y-0">
        <div className="flex items-center gap-2">
          <div className="p-2 rounded-lg bg-accent/10">
            <Clock className="h-4 w-4 text-accent" />
          </div>
          <div>
            <CardTitle className="text-base font-semibold">Últimas Vendas</CardTitle>
            <p className="text-xs text-muted-foreground">Mais recentes</p>
          </div>
        </div>
      </CardHeader>
      <CardContent className="flex-1 pt-2 pb-3">
        <ScrollArea className="h-[220px] md:h-[260px]">
          {recentSales.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-muted-foreground gap-2 py-8">
              <Inbox className="h-8 w-8 opacity-50" />
              <p className="text-sm">Nenhuma venda registrada</p>
            </div>
          ) : (
            <div className="space-y-2 pr-3">
              {recentSales.map((sale) => (
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
