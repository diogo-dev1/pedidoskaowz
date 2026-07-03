import { useMemo, useState } from 'react';
import { useSales } from '@/hooks/useSales';
import { useSalesFilter } from '@/hooks/useSalesFilter';
import { SalesTable } from '@/components/relatorio-vendas/reports/SalesTable';
import { SellerStatistics } from '@/components/relatorio-vendas/reports/SellerStatistics';
import { ExportPDFDialog } from '@/components/relatorio-vendas/reports/ExportPDFDialog';
import { RelatorioVendasNav } from '@/components/relatorio-vendas/RelatorioVendasNav';
import { Button } from '@/components/ui/button';
import { RefreshCw, AlertCircle, FileDown, ChevronDown } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Sale } from '@/types/sales';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

function MultiSellerFilter({ sellers, selectedSellers, onToggle, onClear }: {
  sellers: string[];
  selectedSellers: string[];
  onToggle: (seller: string) => void;
  onClear: () => void;
}) {
  const hasSelection = selectedSellers.length > 0;
  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="outline" size="sm" className={`h-8 text-xs gap-1 ${hasSelection ? 'border-primary' : ''}`}>
          Vendedor
          {hasSelection && (
            <Badge variant="secondary" className="ml-1 px-1.5 py-0 text-xs">{selectedSellers.length}</Badge>
          )}
          <ChevronDown className="h-3 w-3 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-48 p-2" align="start">
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs font-medium text-muted-foreground">Vendedor</span>
          {hasSelection && (
            <Button variant="ghost" size="sm" className="h-6 px-2 text-xs" onClick={onClear}>Limpar</Button>
          )}
        </div>
        <ScrollArea className="max-h-48">
          <div className="space-y-1">
            {sellers.map(seller => (
              <label key={seller} className="flex items-center gap-2 px-2 py-1.5 rounded hover:bg-muted cursor-pointer">
                <Checkbox checked={selectedSellers.includes(seller)} onCheckedChange={() => onToggle(seller)} className="h-3.5 w-3.5" />
                <span className="text-xs truncate">{seller}</span>
              </label>
            ))}
          </div>
        </ScrollArea>
      </PopoverContent>
    </Popover>
  );
}

export default function RelatorioVendasRelatorios() {
  const { sales, lastUpdated, isLoading, isError, error, refetch, isFetching } = useSales();
  const [activeTab, setActiveTab] = useState('daily');
  const [exportDialogOpen, setExportDialogOpen] = useState(false);
  const [selectedSellers, setSelectedSellers] = useState<string[]>([]);

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString('pt-BR');
  };

  // Parse date from DD/MM/YYYY format
  const parseDate = (dateStr: string): Date => {
    const [day, month, year] = dateStr.split('/').map(Number);
    return new Date(year, month - 1, day);
  };

  // Filter sales by period
  const filteredSales = useMemo(() => {
    // Find the most recent sale date to use as reference
    let referenceDate = new Date();

    if (sales.length > 0) {
      // Find the latest sale date in the data
      const saleDates = sales.map(sale => parseDate(sale.date));
      const maxDate = new Date(Math.max(...saleDates.map(d => d.getTime())));
      referenceDate = maxDate;
    }

    referenceDate.setHours(23, 59, 59, 999);

    const todayStart = new Date(referenceDate);
    todayStart.setHours(0, 0, 0, 0);

    const startOfWeek = new Date(todayStart);
    startOfWeek.setDate(todayStart.getDate() - todayStart.getDay());

    const startOfMonth = new Date(referenceDate.getFullYear(), referenceDate.getMonth(), 1);

    const dailySales = sales.filter(sale => {
      const saleDate = parseDate(sale.date);
      saleDate.setHours(0, 0, 0, 0);
      return saleDate.getTime() === todayStart.getTime();
    });

    const weeklySales = sales.filter(sale => {
      const saleDate = parseDate(sale.date);
      saleDate.setHours(0, 0, 0, 0);
      return saleDate >= startOfWeek && saleDate <= referenceDate;
    });

    const monthlySales = sales.filter(sale => {
      const saleDate = parseDate(sale.date);
      saleDate.setHours(0, 0, 0, 0);
      return saleDate >= startOfMonth && saleDate <= referenceDate;
    });

    // Format dates for display
    const formatPeriodDate = (date: Date) => {
      return `${String(date.getDate()).padStart(2, '0')}/${String(date.getMonth() + 1).padStart(2, '0')}/${date.getFullYear()}`;
    };

    return {
      daily: dailySales,
      weekly: weeklySales,
      monthly: monthlySales,
      periods: {
        daily: formatPeriodDate(todayStart),
        weeklyStart: formatPeriodDate(startOfWeek),
        weeklyEnd: formatPeriodDate(referenceDate),
        monthlyStart: formatPeriodDate(startOfMonth),
        monthlyEnd: formatPeriodDate(referenceDate),
      }
    };
  }, [sales]);

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(value);
  };

  const getTabTitle = (tab: string) => {
    switch (tab) {
      case 'daily': return 'Diário';
      case 'weekly': return 'Semanal';
      case 'monthly': return 'Mensal';
      case 'custom': return 'Período';
      case 'sellers': return 'Vendedores';
      default: return 'Relatório';
    }
  };

  const getCurrentPeriodSales = () => {
    switch (activeTab) {
      case 'daily': return filteredSales.daily;
      case 'weekly': return filteredSales.weekly;
      case 'monthly': return filteredSales.monthly;
      case 'custom': return sales; // All sales for custom period
      default: return filteredSales.daily;
    }
  };

  // Apply search/filter on top of period filter
  const salesFilter = useSalesFilter(getCurrentPeriodSales());

  // Get the final filtered sales for export and display
  const getCurrentSales = () => salesFilter.filteredSales;

  const calculateChartData = (salesData: Sale[]) => {
    const byChannel: Record<string, number> = {};
    const bySeller: Record<string, number> = {};
    const byPayment: Record<string, number> = {};

    salesData.forEach(sale => {
      const channel = sale.channel || 'Não informado';
      const seller = sale.seller || 'Não informado';
      const payment = sale.paymentMethod || 'Não informado';

      byChannel[channel] = (byChannel[channel] || 0) + sale.value;
      bySeller[seller] = (bySeller[seller] || 0) + sale.value;
      byPayment[payment] = (byPayment[payment] || 0) + sale.value;
    });

    return { byChannel, bySeller, byPayment };
  };

  const getReferencePeriod = (): string => {
    switch (activeTab) {
      case 'daily':
        return filteredSales.periods.daily;
      case 'weekly':
        return `${filteredSales.periods.weeklyStart} a ${filteredSales.periods.weeklyEnd}`;
      case 'monthly':
        return `${filteredSales.periods.monthlyStart} a ${filteredSales.periods.monthlyEnd}`;
      case 'custom': {
        const from = salesFilter.filters.dateFrom;
        const to = salesFilter.filters.dateTo;
        if (from && to) {
          const fmt = (d: Date) => `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}/${d.getFullYear()}`;
          return `${fmt(from)} a ${fmt(to)}`;
        }
        if (from) {
          const fmt = (d: Date) => `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}/${d.getFullYear()}`;
          return `A partir de ${fmt(from)}`;
        }
        return 'Todos os registros';
      }
      case 'sellers':
        return `${filteredSales.periods.monthlyStart} a ${filteredSales.periods.monthlyEnd}`;
      default:
        return '';
    }
  };

  const getReferencePeriodFilename = (): string => {
    return getReferencePeriod().replace(/\//g, '-').replace(/ /g, '_');
  };

  const drawBarChart = (doc: jsPDF, data: Record<string, number>, startY: number, title: string, color: [number, number, number]) => {
    const entries = Object.entries(data).sort((a, b) => b[1] - a[1]);
    if (entries.length === 0) return startY;

    const maxValue = Math.max(...entries.map(e => e[1]));
    const pageH = doc.internal.pageSize.getHeight();
    const bottomLimit = pageH - 20;
    const chartWidth = 80;
    const barHeight = 6;
    const spacing = 2;
    const leftMargin = 20;
    const labelWidth = 40;

    // Calculate total height needed for this chart
    const chartTotalHeight = 6 + (entries.length * (barHeight + spacing)) + 8;

    // If chart won't fit on current page, start a new page
    if (startY + chartTotalHeight > bottomLimit) {
      doc.addPage();
      startY = 20;
    }

    // Title
    doc.setFontSize(10);
    doc.setTextColor(40);
    doc.setFont('helvetica', 'bold');
    doc.text(title, leftMargin, startY);
    startY += 6;

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7);

    entries.forEach(([label, value]) => {
      // Check if we need a new page
      if (startY + barHeight + spacing > bottomLimit) {
        doc.addPage();
        startY = 20;
      }

      const barWidth = (value / maxValue) * chartWidth;

      doc.setTextColor(80);
      doc.setFontSize(7);
      const truncatedLabel = label.length > 15 ? label.substring(0, 15) + '...' : label;
      doc.text(truncatedLabel, leftMargin, startY + 4);

      doc.setFillColor(230, 230, 230);
      doc.rect(leftMargin + labelWidth, startY, chartWidth, barHeight, 'F');

      doc.setFillColor(...color);
      doc.rect(leftMargin + labelWidth, startY, barWidth, barHeight, 'F');

      doc.setTextColor(40);
      doc.text(formatCurrency(value), leftMargin + labelWidth + chartWidth + 4, startY + 4);

      startY += barHeight + spacing;
    });

    return startY + 8;
  };

  const exportToPDF = (includeCharts: boolean) => {
    const salesData = getCurrentSales();
    const doc = new jsPDF('portrait');
    const pageWidth = 210;
    const pageHeight = 297;

    // Header with better styling
    doc.setFillColor(51, 51, 51);
    doc.rect(0, 0, pageWidth, 42, 'F');

    doc.setFontSize(20);
    doc.setTextColor(255);
    doc.setFont('helvetica', 'bold');
    doc.text(`Relatório ${getTabTitle(activeTab)}`, 14, 16);

    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.text(`Gerado em: ${new Date().toLocaleString('pt-BR')}`, 14, 27);

    const refPeriod = getReferencePeriod();
    doc.text(`Referente a: ${refPeriod}`, 14, 37);

    // Summary cards
    const total = salesData.reduce((sum, s) => sum + s.value, 0);
    const count = salesData.length;
    const average = count > 0 ? total / count : 0;

    doc.setTextColor(40);
    doc.setFontSize(11);

    // Summary section - centered on portrait page
    const cardWidth = 58;
    const cardGap = 6;
    const totalCardsWidth = (cardWidth * 3) + (cardGap * 2);
    const cardsStartX = (pageWidth - totalCardsWidth) / 2;

    doc.setFillColor(245, 245, 245);
    doc.roundedRect(cardsStartX, 50, cardWidth, 25, 2, 2, 'F');
    doc.roundedRect(cardsStartX + cardWidth + cardGap, 50, cardWidth, 25, 2, 2, 'F');
    doc.roundedRect(cardsStartX + (cardWidth + cardGap) * 2, 50, cardWidth, 25, 2, 2, 'F');

    doc.setFontSize(9);
    doc.setTextColor(100);
    doc.text('Total de Vendas', cardsStartX + 6, 60);
    doc.text('Quantidade', cardsStartX + cardWidth + cardGap + 6, 60);
    doc.text('Ticket Médio', cardsStartX + (cardWidth + cardGap) * 2 + 6, 60);

    doc.setFontSize(14);
    doc.setTextColor(40);
    doc.setFont('helvetica', 'bold');
    doc.text(formatCurrency(total), cardsStartX + 6, 70);
    doc.text(`${count} vendas`, cardsStartX + cardWidth + cardGap + 6, 70);
    doc.text(formatCurrency(average), cardsStartX + (cardWidth + cardGap) * 2 + 6, 70);

    let currentY = 86;

    // Charts section
    if (includeCharts && salesData.length > 0) {
      const chartData = calculateChartData(salesData);

      currentY = drawBarChart(doc, chartData.byChannel, currentY, 'Vendas por Canal', [59, 130, 246]);
      currentY = drawBarChart(doc, chartData.bySeller, currentY, 'Vendas por Vendedor', [16, 185, 129]);
      currentY = drawBarChart(doc, chartData.byPayment, currentY, 'Vendas por Forma de Pagamento', [245, 158, 11]);

      // Add new page for table if charts took too much space
      if (currentY > pageHeight - 80) {
        doc.addPage();
        currentY = 20;
      }
    }

    // Table with improved styling
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(11);
    doc.setTextColor(40);
    doc.text('Detalhamento das Vendas', 14, currentY);
    currentY += 5;

    autoTable(doc, {
      startY: currentY,
      head: [['Data', 'Cliente', 'Produto', 'Vendedor', 'Canal', 'Pgto', 'Status', 'Cupom', 'Valor', 'Obs']],
      body: salesData.map(sale => [
        sale.date,
        sale.name || '-',
        sale.item || '-',
        sale.seller || '-',
        sale.channel || '-',
        sale.paymentMethod || '-',
        sale.status || '-',
        sale.coupon && sale.coupon !== '-' ? sale.coupon : '-',
        formatCurrency(sale.value),
        sale.observation && sale.observation !== '-' ? sale.observation : '-'
      ]),
      styles: {
        fontSize: 7,
        cellPadding: 1.5,
        overflow: 'linebreak',
        minCellHeight: 7,
      },
      headStyles: {
        fillColor: [51, 51, 51],
        textColor: [255, 255, 255],
        fontStyle: 'bold',
        fontSize: 7,
      },
      alternateRowStyles: {
        fillColor: [250, 250, 250],
      },
      margin: { left: 8, right: 8 },
      tableWidth: 'auto',
    });

    doc.save(`Relatorio_referente_a_${getReferencePeriodFilename()}.pdf`);
  };

  const exportSellersToPDF = () => {
    const doc = new jsPDF('portrait');
    const pageWidth = 210;
    const pageHeight = 297;

    // Header with styling
    doc.setFillColor(51, 51, 51);
    doc.rect(0, 0, pageWidth, 42, 'F');

    doc.setFontSize(20);
    doc.setTextColor(255);
    doc.setFont('helvetica', 'bold');
    doc.text('Relatório de Vendedores', 14, 16);

    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.text(`Gerado em: ${new Date().toLocaleString('pt-BR')}`, 14, 27);

    const refPeriod = getReferencePeriod();
    doc.text(`Referente a: ${refPeriod}`, 14, 37);

    // Calculate seller stats
    const filteredForExport = selectedSellers.length > 0
      ? sales.filter(s => selectedSellers.includes(s.seller || 'Não informado'))
      : sales;
    const sellerStats: Record<string, { quantity: number; value: number }> = {};
    filteredForExport.forEach(sale => {
      const seller = sale.seller || 'Não informado';
      if (!sellerStats[seller]) {
        sellerStats[seller] = { quantity: 0, value: 0 };
      }
      sellerStats[seller].quantity += 1;
      sellerStats[seller].value += sale.value;
    });

    const totalValue = Object.values(sellerStats).reduce((sum, s) => sum + s.value, 0);
    const totalQuantity = Object.values(sellerStats).reduce((sum, s) => sum + s.quantity, 0);

    const sellersData = Object.entries(sellerStats)
      .map(([name, data]) => ({
        name,
        quantity: data.quantity,
        value: data.value,
        percentage: totalValue > 0 ? (data.value / totalValue) * 100 : 0,
        commission3: data.value * 0.03,
        commission5: data.value * 0.05,
      }))
      .sort((a, b) => b.value - a.value);

    // Summary section - centered on portrait page
    const cardWidth = 58;
    const cardGap = 6;
    const totalCardsWidth = (cardWidth * 3) + (cardGap * 2);
    const cardsStartX = (pageWidth - totalCardsWidth) / 2;

    doc.setTextColor(40);
    doc.setFillColor(245, 245, 245);
    doc.roundedRect(cardsStartX, 50, cardWidth, 22, 2, 2, 'F');
    doc.roundedRect(cardsStartX + cardWidth + cardGap, 50, cardWidth, 22, 2, 2, 'F');
    doc.roundedRect(cardsStartX + (cardWidth + cardGap) * 2, 50, cardWidth, 22, 2, 2, 'F');

    doc.setFontSize(8);
    doc.setTextColor(100);
    doc.text('Total de Vendas', cardsStartX + 6, 58);
    doc.text('Quantidade', cardsStartX + cardWidth + cardGap + 6, 58);
    doc.text('Vendedores', cardsStartX + (cardWidth + cardGap) * 2 + 6, 58);

    doc.setFontSize(12);
    doc.setTextColor(40);
    doc.setFont('helvetica', 'bold');
    doc.text(formatCurrency(totalValue), cardsStartX + 6, 67);
    doc.text(`${totalQuantity} vendas`, cardsStartX + cardWidth + cardGap + 6, 67);
    doc.text(`${sellersData.length}`, cardsStartX + (cardWidth + cardGap) * 2 + 6, 67);

    // Pie chart simulation with colored bars
    let currentY = 82;
    doc.setFontSize(11);
    doc.setTextColor(40);
    doc.text('Distribuição por Vendedor', 14, currentY);
    currentY += 10;

    const COLORS: [number, number, number][] = [
      [59, 130, 246], [16, 185, 129], [245, 158, 11], [239, 68, 68],
      [139, 92, 246], [236, 72, 153], [6, 182, 212], [132, 204, 22]
    ];

    const chartWidth = 90;
    const barHeight = 10;
    const spacing = 4;

    sellersData.forEach((seller, index) => {
      // Check if we need a new page
      if (currentY + barHeight + spacing > pageHeight - 20) {
        doc.addPage();
        currentY = 20;
      }

      const barWidth = (seller.percentage / 100) * chartWidth;
      const color = COLORS[index % COLORS.length];

      // Color indicator
      doc.setFillColor(...color);
      doc.rect(14, currentY, 6, barHeight, 'F');

      // Name
      doc.setFontSize(8);
      doc.setTextColor(60);
      const truncatedName = seller.name.length > 20 ? seller.name.substring(0, 20) + '...' : seller.name;
      doc.text(truncatedName, 24, currentY + 7);

      // Bar background
      const barX = 70;
      doc.setFillColor(230, 230, 230);
      doc.rect(barX, currentY, chartWidth, barHeight, 'F');

      // Bar fill
      doc.setFillColor(...color);
      doc.rect(barX, currentY, barWidth, barHeight, 'F');

      // Percentage
      doc.setTextColor(40);
      doc.text(`${seller.percentage.toFixed(1)}%`, barX + chartWidth + 5, currentY + 7);

      currentY += barHeight + spacing;
    });

    currentY += 10;

    // Add bar charts like monthly report (Canal, Vendedor, Pagamento)
    const chartDataSellers = calculateChartData(filteredForExport);
    currentY = drawBarChart(doc, chartDataSellers.byChannel, currentY, 'Vendas por Canal', [59, 130, 246]);
    currentY = drawBarChart(doc, chartDataSellers.bySeller, currentY, 'Vendas por Vendedor', [16, 185, 129]);
    currentY = drawBarChart(doc, chartDataSellers.byPayment, currentY, 'Vendas por Forma de Pagamento', [245, 158, 11]);

    // Add new page if charts took too much space
    if (currentY > pageHeight - 80) {
      doc.addPage();
      currentY = 20;
    }

    // Seller statistics table
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(11);
    doc.setTextColor(40);
    doc.text('Estatísticas Detalhadas', 14, currentY);
    currentY += 5;

    autoTable(doc, {
      startY: currentY,
      head: [['Vendedor', 'Qtd', 'Valor Total', '%', 'Comissão 3%', 'Comissão 5%']],
      body: [
        ...sellersData.map(seller => [
          seller.name,
          seller.quantity.toString(),
          formatCurrency(seller.value),
          `${seller.percentage.toFixed(1)}%`,
          formatCurrency(seller.commission3),
          formatCurrency(seller.commission5)
        ]),
        // Total row
        ['TOTAL', totalQuantity.toString(), formatCurrency(totalValue), '100%', formatCurrency(totalValue * 0.03), formatCurrency(totalValue * 0.05)]
      ],
      styles: {
        fontSize: 8,
        cellPadding: 3,
      },
      headStyles: {
        fillColor: [51, 51, 51],
        textColor: [255, 255, 255],
        fontStyle: 'bold',
        fontSize: 9,
      },
      alternateRowStyles: {
        fillColor: [250, 250, 250],
      },
      columnStyles: {
        0: { cellWidth: 42 },
        1: { cellWidth: 14, halign: 'center' },
        2: { cellWidth: 32, halign: 'right' },
        3: { cellWidth: 16, halign: 'center' },
        4: { cellWidth: 32, halign: 'right' },
        5: { cellWidth: 32, halign: 'right' },
      },
      didParseCell: (data) => {
        // Style the total row
        if (data.row.index === sellersData.length) {
          data.cell.styles.fontStyle = 'bold';
          data.cell.styles.fillColor = [220, 220, 220];
        }
      }
    });

    doc.save(`Relatorio_Vendedores_referente_a_${getReferencePeriodFilename()}.pdf`);
  };

  const handleExport = (includeCharts: boolean) => {
    if (activeTab === 'sellers') {
      exportSellersToPDF();
    } else {
      exportToPDF(includeCharts);
    }
  };

  return (
    <div className="space-y-4 md:space-y-6">
      {/* Header with refresh button */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="space-y-2">
          <h2 className="text-xl md:text-2xl font-bold tracking-tight">Relatórios de Vendas</h2>
          <RelatorioVendasNav />
        </div>
        <div className="flex flex-wrap items-center gap-2 sm:gap-3">
          {lastUpdated && (
            <span className="text-xs text-muted-foreground hidden md:block">
              Atualizado em {formatDate(lastUpdated)}
            </span>
          )}
          <Button
            variant="outline"
            size="sm"
            onClick={() => setExportDialogOpen(true)}
            disabled={isLoading}
          >
            <FileDown className="h-4 w-4 mr-2" />
            <span className="hidden sm:inline">Exportar</span> PDF
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => refetch()}
            disabled={isFetching}
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${isFetching ? 'animate-spin' : ''}`} />
            Atualizar
          </Button>
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
        <Skeleton className="h-[600px] rounded-lg" />
      ) : (
        <Tabs defaultValue="daily" value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-5 mb-4">
            <TabsTrigger value="daily" className="text-xs sm:text-sm">
              Diário
              <span className="hidden sm:inline ml-1">({filteredSales.daily.length})</span>
            </TabsTrigger>
            <TabsTrigger value="weekly" className="text-xs sm:text-sm">
              Semanal
              <span className="hidden sm:inline ml-1">({filteredSales.weekly.length})</span>
            </TabsTrigger>
            <TabsTrigger value="monthly" className="text-xs sm:text-sm">
              Mensal
              <span className="hidden sm:inline ml-1">({filteredSales.monthly.length})</span>
            </TabsTrigger>
            <TabsTrigger value="custom" className="text-xs sm:text-sm">
              Período
            </TabsTrigger>
            <TabsTrigger value="sellers" className="text-xs sm:text-sm">
              Vendedores
            </TabsTrigger>
          </TabsList>

          <TabsContent value="daily">
            <div className="mb-3 p-3 bg-muted/50 rounded-lg">
              <div className="flex items-center justify-between mb-1">
                <span className="text-sm text-muted-foreground">
                  Total do dia {salesFilter.hasActiveFilters && '(filtrado)'}
                </span>
                <span className="font-bold text-primary">{formatCurrency(salesFilter.filteredSales.reduce((sum, s) => sum + s.value, 0))}</span>
              </div>
              <p className="text-xs text-muted-foreground">{filteredSales.periods.daily}</p>
            </div>
            <SalesTable
              sales={filteredSales.daily}
              filteredSales={salesFilter.filteredSales}
              filters={salesFilter.filters}
              onSearchChange={salesFilter.setSearch}
              onToggleValue={salesFilter.toggleFilterValue}
              onClearFilter={salesFilter.clearFilter}
              sellers={salesFilter.sellers}
              channels={salesFilter.channels}
              paymentMethods={salesFilter.paymentMethods}
              sortField={salesFilter.sortField}
              sortDirection={salesFilter.sortDirection}
              onSort={salesFilter.handleSort}
            />
          </TabsContent>

          <TabsContent value="weekly">
            <div className="mb-3 p-3 bg-muted/50 rounded-lg">
              <div className="flex items-center justify-between mb-1">
                <span className="text-sm text-muted-foreground">
                  Total da semana {salesFilter.hasActiveFilters && '(filtrado)'}
                </span>
                <span className="font-bold text-primary">{formatCurrency(salesFilter.filteredSales.reduce((sum, s) => sum + s.value, 0))}</span>
              </div>
              <p className="text-xs text-muted-foreground">{filteredSales.periods.weeklyStart} - {filteredSales.periods.weeklyEnd}</p>
            </div>
            <SalesTable
              sales={filteredSales.weekly}
              filteredSales={salesFilter.filteredSales}
              filters={salesFilter.filters}
              onSearchChange={salesFilter.setSearch}
              onToggleValue={salesFilter.toggleFilterValue}
              onClearFilter={salesFilter.clearFilter}
              sellers={salesFilter.sellers}
              channels={salesFilter.channels}
              paymentMethods={salesFilter.paymentMethods}
              sortField={salesFilter.sortField}
              sortDirection={salesFilter.sortDirection}
              onSort={salesFilter.handleSort}
            />
          </TabsContent>

          <TabsContent value="monthly">
            <div className="mb-3 p-3 bg-muted/50 rounded-lg">
              <div className="flex items-center justify-between mb-1">
                <span className="text-sm text-muted-foreground">
                  Total do mês {salesFilter.hasActiveFilters && '(filtrado)'}
                </span>
                <span className="font-bold text-primary">{formatCurrency(salesFilter.filteredSales.reduce((sum, s) => sum + s.value, 0))}</span>
              </div>
              <p className="text-xs text-muted-foreground">{filteredSales.periods.monthlyStart} - {filteredSales.periods.monthlyEnd}</p>
            </div>
            <SalesTable
              sales={filteredSales.monthly}
              filteredSales={salesFilter.filteredSales}
              filters={salesFilter.filters}
              onSearchChange={salesFilter.setSearch}
              onToggleValue={salesFilter.toggleFilterValue}
              onClearFilter={salesFilter.clearFilter}
              sellers={salesFilter.sellers}
              channels={salesFilter.channels}
              paymentMethods={salesFilter.paymentMethods}
              sortField={salesFilter.sortField}
              sortDirection={salesFilter.sortDirection}
              onSort={salesFilter.handleSort}
            />
          </TabsContent>

          <TabsContent value="custom">
            <div className="mb-3 p-3 bg-muted/50 rounded-lg">
              <div className="flex items-center justify-between mb-1">
                <span className="text-sm text-muted-foreground">
                  Total do período {salesFilter.hasActiveFilters && '(filtrado)'}
                </span>
                <span className="font-bold text-primary">{formatCurrency(salesFilter.filteredSales.reduce((sum, s) => sum + s.value, 0))}</span>
              </div>
              <p className="text-xs text-muted-foreground">
                {salesFilter.filters.dateFrom || salesFilter.filters.dateTo
                  ? 'Período personalizado selecionado'
                  : 'Selecione um período usando o filtro abaixo'}
              </p>
            </div>
            <SalesTable
              sales={sales}
              filteredSales={salesFilter.filteredSales}
              filters={salesFilter.filters}
              onSearchChange={salesFilter.setSearch}
              onToggleValue={salesFilter.toggleFilterValue}
              onClearFilter={salesFilter.clearFilter}
              onDateChange={salesFilter.setDateRange}
              sellers={salesFilter.sellers}
              channels={salesFilter.channels}
              paymentMethods={salesFilter.paymentMethods}
              sortField={salesFilter.sortField}
              sortDirection={salesFilter.sortDirection}
              onSort={salesFilter.handleSort}
              showDateFilter={true}
            />
          </TabsContent>

          <TabsContent value="sellers">
            {(() => {
              const allSellers = [...new Set(sales.map(s => s.seller || 'Não informado'))].sort();
              const sellerFilteredSales = selectedSellers.length > 0
                ? sales.filter(s => selectedSellers.includes(s.seller || 'Não informado'))
                : sales;
              const totalFiltered = sellerFilteredSales.reduce((sum, s) => sum + s.value, 0);

              return (
                <>
                  <div className="mb-3 p-3 bg-muted/50 rounded-lg">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-sm text-muted-foreground">
                        Estatísticas dos Vendedores {selectedSellers.length > 0 && '(filtrado)'}
                      </span>
                      <span className="font-bold text-primary">{formatCurrency(totalFiltered)}</span>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      {selectedSellers.length > 0
                        ? `${selectedSellers.length} vendedor(es) selecionado(s)`
                        : 'Baseado em todas as vendas registradas'}
                    </p>
                  </div>
                  <div className="flex flex-wrap gap-2 mb-4">
                    <MultiSellerFilter
                      sellers={allSellers}
                      selectedSellers={selectedSellers}
                      onToggle={(seller) => setSelectedSellers(prev =>
                        prev.includes(seller) ? prev.filter(s => s !== seller) : [...prev, seller]
                      )}
                      onClear={() => setSelectedSellers([])}
                    />
                  </div>
                  <SellerStatistics sales={sellerFilteredSales} />
                </>
              );
            })()}
          </TabsContent>
        </Tabs>
      )}

      {/* Export Dialog */}
      <ExportPDFDialog
        open={exportDialogOpen}
        onOpenChange={setExportDialogOpen}
        onExport={handleExport}
        title={getTabTitle(activeTab)}
        isSellersTab={activeTab === 'sellers'}
      />
    </div>
  );
}
