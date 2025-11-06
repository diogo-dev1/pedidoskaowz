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
    <div className="border border-border rounded-lg bg-card p-4 shadow-sm">
      <h3 className="text-sm font-medium text-card-foreground">{nome}</h3>
      <p className="text-xs text-muted-foreground mt-1">R$ {precoUnitario.toFixed(2)} / un</p>
      <div className="flex items-center gap-2 mt-3">
        <Button 
          variant="outline" 
          size="icon" 
          className="h-8 w-8 border-accent text-accent hover:bg-accent hover:text-accent-foreground" 
          onClick={onRemove}
          disabled={quantidade === 0}
        >
          <Minus className="h-4 w-4" />
        </Button>
        <span className="text-sm font-semibold w-10 text-center">{quantidade}</span>
        <Button 
          variant="outline" 
          size="icon" 
          className="h-8 w-8 border-accent text-accent hover:bg-accent hover:text-accent-foreground" 
          onClick={onAdd}
        >
          <Plus className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}
