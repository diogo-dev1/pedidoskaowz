import { useMemo } from 'react';
import { Sale } from '@/types/sales';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip } from 'recharts';

interface SellerStatisticsProps {
  sales: Sale[];
}

const COLORS = ['#f59e0b', '#10b981', '#3b82f6', '#ef4444', '#8b5cf6', '#ec4899', '#06b6d4', '#84cc16'];

export function SellerStatistics({ sales }: SellerStatisticsProps) {
  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(value);
  };

  const sellerStats = useMemo(() => {
    const stats: Record<string, { quantity: number; value: number }> = {};

    sales.forEach(sale => {
      const seller = sale.seller || 'Não informado';
      if (!stats[seller]) {
        stats[seller] = { quantity: 0, value: 0 };
      }
      stats[seller].quantity += 1;
      stats[seller].value += sale.value;
    });

    const totalValue = Object.values(stats).reduce((sum, s) => sum + s.value, 0);
    const totalQuantity = Object.values(stats).reduce((sum, s) => sum + s.quantity, 0);

    const result = Object.entries(stats)
      .map(([name, data]) => ({
        name,
        quantity: data.quantity,
        value: data.value,
        percentage: totalValue > 0 ? (data.value / totalValue) * 100 : 0,
        commission3: data.value * 0.03,
        commission5: data.value * 0.05,
      }))
      .sort((a, b) => b.value - a.value);

    return {
      sellers: result,
      totalValue,
      totalQuantity,
      totalCommission3: totalValue * 0.03,
      totalCommission5: totalValue * 0.05,
    };
  }, [sales]);

  const pieData = sellerStats.sellers.map((seller, index) => ({
    name: seller.name,
    value: seller.value,
    percentage: seller.percentage,
    color: COLORS[index % COLORS.length],
  }));

  if (sales.length === 0) {
    return null;
  }

  return (
    <Card className="mb-4">
      <CardHeader className="pb-2">
        <CardTitle className="text-base">Estatísticas por Vendedor</CardTitle>
      </CardHeader>
      <CardContent className="p-3 md:p-6 pt-0">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {/* Table */}
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="text-xs">Vendedor</TableHead>
                  <TableHead className="text-xs text-center">Qtd</TableHead>
                  <TableHead className="text-xs text-right">Valor</TableHead>
                  <TableHead className="text-xs text-right">3%</TableHead>
                  <TableHead className="text-xs text-right">5%</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {sellerStats.sellers.map((seller, index) => (
                  <TableRow key={seller.name}>
                    <TableCell className="font-medium text-sm">
                      <div className="flex items-center gap-2">
                        <div
                          className="w-3 h-3 rounded-full flex-shrink-0"
                          style={{ backgroundColor: COLORS[index % COLORS.length] }}
                        />
                        <span className="truncate">{seller.name}</span>
                      </div>
                    </TableCell>
                    <TableCell className="text-sm text-center">{seller.quantity}</TableCell>
                    <TableCell className="text-sm text-right">{formatCurrency(seller.value)}</TableCell>
                    <TableCell className="text-sm text-right text-muted-foreground">
                      {formatCurrency(seller.commission3)}
                    </TableCell>
                    <TableCell className="text-sm text-right text-muted-foreground">
                      {formatCurrency(seller.commission5)}
                    </TableCell>
                  </TableRow>
                ))}
                <TableRow className="bg-muted/50 font-bold">
                  <TableCell className="text-sm">Total</TableCell>
                  <TableCell className="text-sm text-center">{sellerStats.totalQuantity}</TableCell>
                  <TableCell className="text-sm text-right">{formatCurrency(sellerStats.totalValue)}</TableCell>
                  <TableCell className="text-sm text-right text-muted-foreground">
                    {formatCurrency(sellerStats.totalCommission3)}
                  </TableCell>
                  <TableCell className="text-sm text-right text-muted-foreground">
                    {formatCurrency(sellerStats.totalCommission5)}
                  </TableCell>
                </TableRow>
              </TableBody>
            </Table>
          </div>

          {/* Pie Chart */}
          <div className="flex flex-col items-center">
            <p className="text-sm text-muted-foreground mb-2">% por vendedor</p>
            <ResponsiveContainer width="100%" height={200}>
              <PieChart>
                <Pie
                  data={pieData}
                  cx="50%"
                  cy="50%"
                  innerRadius={40}
                  outerRadius={70}
                  paddingAngle={2}
                  dataKey="value"
                  nameKey="name"
                >
                  {pieData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip
                  formatter={(value: number) => formatCurrency(value)}
                  contentStyle={{
                    backgroundColor: 'hsl(var(--card))',
                    borderColor: 'hsl(var(--border))',
                    borderRadius: '8px',
                  }}
                />
                <Legend
                  formatter={(value) => {
                    const item = pieData.find(p => p.name === value);
                    return `${value} (${item?.percentage.toFixed(1)}%)`;
                  }}
                  wrapperStyle={{ fontSize: '12px' }}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
