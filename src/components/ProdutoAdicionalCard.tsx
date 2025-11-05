import { Card, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Minus, Plus } from 'lucide-react';

interface ProdutoAdicionalCardProps {
  nome: string;
  precoUnitario: number;
  quantidade: number;
  onAdd: () => void;
  onRemove: () => void;
}

export default function ProdutoAdicionalCard({ 
  nome, 
  precoUnitario, 
  quantidade, 
  onAdd, 
  onRemove 
}: ProdutoAdicionalCardProps) {
  return (
    <Card>
      <CardHeader className="p-3">
        <CardTitle className="text-xs">
          <div className="font-semibold">{nome}</div>
          <div className="text-xs text-muted-foreground mt-1">R$ {precoUnitario.toFixed(2)} / un</div>
        </CardTitle>
        <div className="flex items-center gap-2 mt-2">
          <Button 
            variant="outline" 
            size="icon" 
            className="h-7 w-7" 
            onClick={onRemove}
            disabled={quantidade === 0}
          >
            <Minus className="h-3 w-3" />
          </Button>
          <span className="text-sm font-semibold w-8 text-center">{quantidade}</span>
          <Button 
            variant="outline" 
            size="icon" 
            className="h-7 w-7" 
            onClick={onAdd}
          >
            <Plus className="h-3 w-3" />
          </Button>
        </div>
      </CardHeader>
    </Card>
  );
}
