import { Check } from 'lucide-react';

interface ComponentCardProps {
  nome: string;
  preco: number;
  isSelected: boolean;
  onClick: () => void;
}

export default function ComponentCard({ nome, preco, isSelected, onClick }: ComponentCardProps) {
  return (
    <div
      className={`cursor-pointer transition-all border bg-card ${
        isSelected ? 'border-foreground' : 'border-border hover:border-foreground/30'
      }`}
      onClick={onClick}
    >
      <div className="p-3">
        <div className="flex items-center justify-between gap-2">
          <div className="flex-1 min-w-0">
            <div className="text-sm font-medium truncate">{nome}</div>
            <div className="text-xs text-muted-foreground mt-0.5">+R$ {preco.toFixed(2)}</div>
          </div>
          {isSelected && <Check className="h-4 w-4 flex-shrink-0" />}
        </div>
      </div>
    </div>
  );
}
