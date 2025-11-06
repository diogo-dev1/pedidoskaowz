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
    <div className="border border-border bg-card p-3">
      <div className="text-sm font-medium">{nome}</div>
      <div className="text-xs text-muted-foreground mt-1">R$ {precoUnitario.toFixed(2)} / un</div>
      <div className="flex items-center gap-2 mt-3">
        <Button 
          variant="outline" 
          size="icon" 
          className="h-8 w-8" 
          onClick={onRemove}
          disabled={quantidade === 0}
        >
          <Minus className="h-3 w-3" />
        </Button>
        <span className="text-sm font-medium w-8 text-center">{quantidade}</span>
        <Button 
          variant="outline" 
          size="icon" 
          className="h-8 w-8" 
          onClick={onAdd}
        >
          <Plus className="h-3 w-3" />
        </Button>
      </div>
    </div>
  );
}
