import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { FileDown, BarChart3 } from 'lucide-react';

interface ExportPDFDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onExport: (includeCharts: boolean) => void;
  title: string;
  isSellersTab?: boolean;
}

export function ExportPDFDialog({ open, onOpenChange, onExport, title, isSellersTab = false }: ExportPDFDialogProps) {
  const [includeCharts, setIncludeCharts] = useState(false);

  const handleExport = () => {
    onExport(includeCharts);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileDown className="h-5 w-5" />
            Exportar PDF
          </DialogTitle>
          <DialogDescription>
            Relatório {title}
          </DialogDescription>
        </DialogHeader>

        {!isSellersTab ? (
          <div className="py-4">
            <div className="flex items-center space-x-3 p-3 rounded-lg border bg-muted/30">
              <Checkbox
                id="include-charts"
                checked={includeCharts}
                onCheckedChange={(checked) => setIncludeCharts(checked === true)}
              />
              <div className="flex-1">
                <Label htmlFor="include-charts" className="flex items-center gap-2 cursor-pointer">
                  <BarChart3 className="h-4 w-4 text-primary" />
                  Incluir gráficos
                </Label>
                <p className="text-xs text-muted-foreground mt-1">
                  Adiciona gráficos de vendas por canal, vendedor e forma de pagamento
                </p>
              </div>
            </div>
          </div>
        ) : (
          <div className="py-4">
            <p className="text-sm text-muted-foreground">
              O relatório incluirá a tabela de estatísticas por vendedor com quantidade, valores, porcentagens e comissões (3% e 5%), além de um gráfico de distribuição.
            </p>
          </div>
        )}

        <DialogFooter className="gap-2 sm:gap-0">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button onClick={handleExport}>
            <FileDown className="h-4 w-4 mr-2" />
            Gerar PDF
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
