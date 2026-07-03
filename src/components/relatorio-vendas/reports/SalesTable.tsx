import { Fragment, useState } from 'react';
import { Sale } from '@/types/sales';
import { Card, CardContent } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { SalesFilters } from './SalesFilters';
import { SalesFilters as FiltersType } from '@/hooks/useSalesFilter';
import { ChevronDown, ChevronUp, Check, X } from 'lucide-react';

const isTruthy = (val: string | undefined) => {
  if (!val) return false;
  const v = val.trim().toLowerCase();
  return v === 'true' || v === 'sim' || v === 'yes' || v === '1' || v === 'x';
};

const StatusIcon = ({ value }: { value: string | undefined }) => {
  return isTruthy(value)
    ? <Check className="h-4 w-4 text-green-600" />
    : <X className="h-4 w-4 text-muted-foreground/40" />;
};

interface SalesTableProps {
  sales: Sale[];
  filteredSales: Sale[];
  filters: FiltersType;
  onSearchChange: (value: string) => void;
  onToggleValue: (key: 'sellers' | 'channels' | 'paymentMethods', value: string) => void;
  onClearFilter: (key: 'sellers' | 'channels' | 'paymentMethods' | 'dateRange') => void;
  onDateChange?: (dateFrom: Date | undefined, dateTo: Date | undefined) => void;
  sellers: string[];
  channels: string[];
  paymentMethods: string[];
  sortField: keyof Sale;
  sortDirection: 'asc' | 'desc';
  onSort: (field: keyof Sale) => void;
  showDateFilter?: boolean;
}

// Check if item text is long (suggests multiple items or large order)
const isLongItem = (item: string) => {
  if (!item) return false;
  return item.length > 50 || item.includes(',') || item.includes('+') || item.includes('/');
};

export function SalesTable({
  sales,
  filteredSales,
  filters,
  onSearchChange,
  onToggleValue,
  onClearFilter,
  onDateChange,
  sellers,
  channels,
  paymentMethods,
  sortField,
  sortDirection,
  onSort,
  showDateFilter = false,
}: SalesTableProps) {
  const [expandedCards, setExpandedCards] = useState<Set<string>>(new Set());

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(value);
  };

  const toggleCard = (id: string) => {
    setExpandedCards(prev => {
      const newSet = new Set(prev);
      if (newSet.has(id)) {
        newSet.delete(id);
      } else {
        newSet.add(id);
      }
      return newSet;
    });
  };

  return (
    <Card>
      <CardContent className="p-3 md:p-6">
        {/* Filters */}
        <SalesFilters
          filters={filters}
          onSearchChange={onSearchChange}
          onToggleValue={onToggleValue}
          onClearFilter={onClearFilter}
          onDateChange={onDateChange}
          sellers={sellers}
          channels={channels}
          paymentMethods={paymentMethods}
          showDateFilter={showDateFilter}
        />

        {/* Mobile Cards View */}
        <div className="block md:hidden">
          <ScrollArea className="h-[500px]">
            {filteredSales.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground text-sm">
                Nenhuma venda encontrada
              </div>
            ) : (
              <div className="space-y-2 pr-4">
                {filteredSales.map((sale) => {
                  const isExpanded = expandedCards.has(sale.id);
                  const hasLongItem = isLongItem(sale.item);

                  return (
                    <div
                      key={sale.id}
                      className="p-3 rounded-lg bg-muted/50 space-y-2 cursor-pointer transition-all"
                      onClick={() => toggleCard(sale.id)}
                    >
                      <div className="flex items-center justify-between gap-2">
                        <p className="font-medium text-sm truncate flex-1">{sale.name || '-'}</p>
                        <p className="font-bold text-sm text-primary whitespace-nowrap">{formatCurrency(sale.value)}</p>
                      </div>

                      {/* Item with conditional truncation */}
                      <p className={`text-xs text-muted-foreground ${!isExpanded ? 'line-clamp-2' : ''}`}>
                        {sale.item || 'Item não informado'}
                      </p>

                      <div className="flex items-center justify-between gap-2 text-xs">
                        <span className="text-muted-foreground">{sale.date}</span>
                        {sale.status && (
                          <Badge
                            variant={sale.status.toLowerCase() === 'pago' ? 'default' : 'secondary'}
                            className="text-xs"
                          >
                            {sale.status}
                          </Badge>
                        )}
                      </div>

                      <div className="flex flex-wrap gap-1">
                        {sale.seller && <Badge variant="outline" className="text-xs">{sale.seller}</Badge>}
                        {sale.channel && <Badge variant="outline" className="text-xs">{sale.channel}</Badge>}
                        {sale.paymentMethod && <Badge variant="secondary" className="text-xs">{sale.paymentMethod}</Badge>}
                        {sale.coupon && sale.coupon !== '-' && <Badge variant="default" className="text-xs">🎟️ {sale.coupon}</Badge>}
                        <Badge variant="outline" className="text-xs gap-1">📦 Grupo <StatusIcon value={sale.grupoPedidos} /></Badge>
                        <Badge variant="secondary" className="text-xs gap-1">Bling <StatusIcon value={sale.bling} /></Badge>
                        <Badge variant="secondary" className="text-xs gap-1">Ctrl <StatusIcon value={sale.controle} /></Badge>
                      </div>

                      {/* Expanded details */}
                      {isExpanded && (
                        <div className="border-t pt-2 mt-2 space-y-1 text-xs">
                          <div className="flex items-center gap-2 text-muted-foreground">
                            <span className="font-medium">Grupo de Pedidos:</span> <StatusIcon value={sale.grupoPedidos} />
                          </div>
                          <div className="flex items-center gap-2 text-muted-foreground">
                            <span className="font-medium">Bling:</span> <StatusIcon value={sale.bling} />
                          </div>
                          <div className="flex items-center gap-2 text-muted-foreground">
                            <span className="font-medium">Controle:</span> <StatusIcon value={sale.controle} />
                          </div>
                          {sale.coupon && sale.coupon !== '-' && sale.coupon !== '' && (
                            <p className="text-muted-foreground">
                              <span className="font-medium">Cupom:</span> {sale.coupon}
                            </p>
                          )}
                          {sale.observation && sale.observation !== '-' && sale.observation !== '' && (
                            <p className="text-muted-foreground">
                              <span className="font-medium">Observação:</span> {sale.observation}
                            </p>
                          )}
                          <p className="text-muted-foreground">
                            <span className="font-medium">ID:</span> {sale.id}
                          </p>
                        </div>
                      )}

                      {/* Ver mais / Ver menos button */}
                      <div className="flex items-center justify-end pt-1">
                        {(hasLongItem || sale.observation) && (
                          <button
                            className="text-xs text-primary hover:underline flex items-center gap-1"
                            onClick={(e) => {
                              e.stopPropagation();
                              toggleCard(sale.id);
                            }}
                          >
                            {isExpanded ? (
                              <>
                                Ver menos <ChevronUp className="h-3 w-3" />
                              </>
                            ) : (
                              <>
                                Ver mais <ChevronDown className="h-3 w-3" />
                              </>
                            )}
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </ScrollArea>
        </div>

        {/* Desktop Table View */}
        <div className="hidden md:block rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead
                  className="cursor-pointer hover:bg-muted/50 text-xs"
                  onClick={() => onSort('date')}
                >
                  Data {sortField === 'date' && (sortDirection === 'asc' ? '↑' : '↓')}
                </TableHead>
                <TableHead
                  className="cursor-pointer hover:bg-muted/50 text-xs"
                  onClick={() => onSort('name')}
                >
                  Cliente {sortField === 'name' && (sortDirection === 'asc' ? '↑' : '↓')}
                </TableHead>
                <TableHead className="text-xs">Item</TableHead>
                <TableHead
                  className="cursor-pointer hover:bg-muted/50 text-xs"
                  onClick={() => onSort('seller')}
                >
                  Vendedor {sortField === 'seller' && (sortDirection === 'asc' ? '↑' : '↓')}
                </TableHead>
                <TableHead className="text-xs">Canal</TableHead>
                <TableHead
                  className="cursor-pointer hover:bg-muted/50 text-right text-xs"
                  onClick={() => onSort('value')}
                >
                  Valor {sortField === 'value' && (sortDirection === 'asc' ? '↑' : '↓')}
                </TableHead>
                <TableHead className="text-xs">Pagamento</TableHead>
                <TableHead className="text-xs">Cupom</TableHead>
                <TableHead className="text-xs w-10"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredSales.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={9} className="text-center py-8 text-muted-foreground text-sm">
                    Nenhuma venda encontrada
                  </TableCell>
                </TableRow>
              ) : (
                filteredSales.map((sale) => {
                  const isExpanded = expandedCards.has(sale.id);
                  const hasLongItem = isLongItem(sale.item);

                  return (
                    <Fragment key={sale.id}>
                      <TableRow
                        className="cursor-pointer"
                        onClick={() => toggleCard(sale.id)}
                      >
                        <TableCell className="font-medium text-sm">{sale.date}</TableCell>
                        <TableCell className="text-sm">{sale.name}</TableCell>
                        <TableCell className="max-w-[150px] truncate text-sm" title={sale.item}>
                          {sale.item}
                        </TableCell>
                        <TableCell className="text-sm">{sale.seller}</TableCell>
                        <TableCell>
                          <Badge variant="secondary" className="text-xs">{sale.channel}</Badge>
                        </TableCell>
                        <TableCell className="text-right font-medium text-sm">
                          {formatCurrency(sale.value)}
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline" className="text-xs">{sale.paymentMethod}</Badge>
                        </TableCell>
                        <TableCell className="text-sm">
                          {sale.coupon && sale.coupon !== '-' ? (
                            <Badge variant="default" className="text-xs">🎟️ {sale.coupon}</Badge>
                          ) : (
                            <span className="text-muted-foreground">-</span>
                          )}
                        </TableCell>
                        <TableCell>
                          {(hasLongItem || sale.observation) && (
                            <button className="text-primary hover:underline text-xs flex items-center">
                              {isExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                            </button>
                          )}
                        </TableCell>
                      </TableRow>
                      {isExpanded && (
                        <TableRow className="bg-muted/30">
                          <TableCell colSpan={9} className="p-4">
                            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-8 gap-4 text-sm">
                              <div>
                                <p className="text-xs text-muted-foreground mb-1">Item Completo</p>
                                <p className="font-medium">{sale.item || '-'}</p>
                              </div>
                              <div>
                                <p className="text-xs text-muted-foreground mb-1">Status</p>
                                <Badge variant={sale.status?.toLowerCase() === 'pago' ? 'default' : 'secondary'}>
                                  {sale.status || '-'}
                                </Badge>
                              </div>
                              <div>
                                <p className="text-xs text-muted-foreground mb-1">Cupom</p>
                                {sale.coupon && sale.coupon !== '-' && sale.coupon !== '' ? (
                                  <Badge variant="default" className="text-xs">🎟️ {sale.coupon}</Badge>
                                ) : (
                                  <p className="text-muted-foreground">-</p>
                                )}
                              </div>
                              <div>
                                <p className="text-xs text-muted-foreground mb-1">Observação</p>
                                <p className="font-medium">{sale.observation || '-'}</p>
                              </div>
                              <div>
                                <p className="text-xs text-muted-foreground mb-1">Grupo de Pedidos</p>
                                <StatusIcon value={sale.grupoPedidos} />
                              </div>
                              <div>
                                <p className="text-xs text-muted-foreground mb-1">Bling</p>
                                <StatusIcon value={sale.bling} />
                              </div>
                              <div>
                                <p className="text-xs text-muted-foreground mb-1">Controle</p>
                                <StatusIcon value={sale.controle} />
                              </div>
                              <div>
                                <p className="text-xs text-muted-foreground mb-1">ID</p>
                                <p className="font-mono text-xs">{sale.id}</p>
                              </div>
                            </div>
                          </TableCell>
                        </TableRow>
                      )}
                    </Fragment>
                  );
                })
              )}
            </TableBody>
          </Table>
        </div>

        <p className="text-xs text-muted-foreground mt-3">
          {filteredSales.length} de {sales.length} vendas
        </p>
      </CardContent>
    </Card>
  );
}
