import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, Inbox } from 'lucide-react';
import type { Sale } from '@/types/sales';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { DashboardCard, formatBRL, parseSaleDate } from './shared';

type ListView = 'today' | 'week' | 'recent';

const RECENT_LIMIT = 10;
const viewLabels: Record<ListView, { select: string; empty: string }> = {
  today: { select: 'Hoje', empty: 'Nenhuma venda hoje' },
  week: { select: 'Esta semana', empty: 'Nenhuma venda esta semana' },
  recent: { select: 'Últimas vendas', empty: 'Nenhuma venda registrada' },
};

const initials = (name: string) =>
  name.split(/\s+/).filter(Boolean).slice(0, 2).map(part => part[0]?.toUpperCase()).join('') || '?';

const shortDate = (date: Date) => `${String(date.getDate()).padStart(2, '0')}/${String(date.getMonth() + 1).padStart(2, '0')}`;

export function SalesListCard({ sales }: { sales: Sale[] }) {
  const [view, setView] = useState<ListView>('today');

  const { rows, caption } = useMemo(() => {
    const today = new Date();
    const todayStr = `${String(today.getDate()).padStart(2, '0')}/${String(today.getMonth() + 1).padStart(2, '0')}/${today.getFullYear()}`;
    if (view === 'today') {
      return { rows: sales.filter(sale => sale.date === todayStr), caption: 'Vendas de hoje' };
    }
    if (view === 'week') {
      const startOfWeek = new Date(today);
      startOfWeek.setDate(today.getDate() - today.getDay());
      startOfWeek.setHours(0, 0, 0, 0);
      const endOfWeek = new Date(startOfWeek);
      endOfWeek.setDate(startOfWeek.getDate() + 6);
      endOfWeek.setHours(23, 59, 59, 999);
      return {
        rows: sales.filter(sale => {
          const date = parseSaleDate(sale.date);
          return date >= startOfWeek && date <= endOfWeek;
        }),
        caption: `${shortDate(startOfWeek)} - ${shortDate(endOfWeek)}`,
      };
    }
    return {
      rows: [...sales].sort((a, b) => parseSaleDate(b.date).getTime() - parseSaleDate(a.date).getTime()).slice(0, RECENT_LIMIT),
      caption: 'Mais recentes',
    };
  }, [sales, view]);

  const total = rows.reduce((sum, sale) => sum + sale.value, 0);

  return (
    <DashboardCard className="lg:col-span-2 flex flex-col">
      <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
        <div className="flex flex-wrap items-center gap-3">
          <h3 className="font-semibold">Vendas</h3>
          <Select value={view} onValueChange={v => setView(v as ListView)}>
            <SelectTrigger className="h-8 w-auto gap-2 text-xs" aria-label="Lista de vendas">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {(Object.keys(viewLabels) as ListView[]).map(key => (
                <SelectItem key={key} value={key} className="text-xs">{viewLabels[key].select}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="text-right">
          <p className="text-lg font-bold text-primary tabular-nums leading-tight">{formatBRL(total)}</p>
          <p className="text-[11px] text-muted-foreground">{caption} · {rows.length} {rows.length === 1 ? 'venda' : 'vendas'}</p>
        </div>
      </div>

      {rows.length === 0 ? (
        <div className="flex flex-col items-center justify-center flex-1 text-muted-foreground gap-2 py-12">
          <Inbox className="h-8 w-8 opacity-50" />
          <p className="text-sm">{viewLabels[view].empty}</p>
        </div>
      ) : (
        <div className="max-h-[380px] overflow-y-auto -mx-4 sm:-mx-5 px-4 sm:px-5">
          <table className="w-full text-sm">
            <thead className="sticky top-0 bg-card z-10">
              <tr className="text-left text-xs text-muted-foreground">
                <th className="font-medium pb-2 pr-3">Cliente</th>
                <th className="font-medium pb-2 pr-3 text-right">Valor</th>
                <th className="font-medium pb-2 pr-3 hidden md:table-cell">Vendedor</th>
                <th className="font-medium pb-2 pr-3 hidden md:table-cell">Canal</th>
                <th className="font-medium pb-2 pr-3 hidden xl:table-cell">Pagamento</th>
                <th className="font-medium pb-2 text-right hidden sm:table-cell">Data</th>
              </tr>
            </thead>
            <tbody>
              {rows.map(sale => (
                <tr key={sale.id} className="border-t border-border/60">
                  <td className="py-2.5 pr-3 max-w-0 w-full">
                    <div className="flex items-center gap-2.5 min-w-0">
                      <Avatar className="h-8 w-8 shrink-0">
                        <AvatarFallback className="text-[11px] bg-primary/10 text-primary font-semibold">{initials(sale.name)}</AvatarFallback>
                      </Avatar>
                      <div className="min-w-0">
                        <p className="font-medium truncate">{sale.name}</p>
                        <p className="text-xs text-muted-foreground truncate">{sale.item}</p>
                        <p className="text-[11px] text-muted-foreground truncate md:hidden">{sale.seller} · {sale.channel} · {sale.date}</p>
                      </div>
                    </div>
                  </td>
                  <td className="py-2.5 pr-3 text-right font-semibold text-primary whitespace-nowrap tabular-nums">{formatBRL(sale.value)}</td>
                  <td className="py-2.5 pr-3 hidden md:table-cell whitespace-nowrap">
                    <Badge variant="secondary" className="text-[11px] font-normal">{sale.seller}</Badge>
                  </td>
                  <td className="py-2.5 pr-3 hidden md:table-cell whitespace-nowrap text-muted-foreground">{sale.channel}</td>
                  <td className="py-2.5 pr-3 hidden xl:table-cell whitespace-nowrap text-muted-foreground">{sale.paymentMethod}</td>
                  <td className="py-2.5 text-right hidden sm:table-cell whitespace-nowrap text-xs text-muted-foreground">{sale.date}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <div className="mt-4">
        <Button asChild variant="outline" size="sm" className="gap-1.5">
          <Link to="/relatorio-vendas/relatorios">Ver todas as vendas <ArrowRight className="h-3.5 w-3.5" /></Link>
        </Button>
      </div>
    </DashboardCard>
  );
}
