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
      className={`cursor-pointer transition-all bg-card rounded-lg overflow-hidden shadow-sm hover:shadow-md ${
        isSelected ? 'ring-2 ring-accent' : 'border border-border'
      }`}
      onClick={onClick}
    >
      <div className="p-4">
        <div className="flex items-center justify-between gap-2">
          <div className="flex-1 min-w-0">
            <h3 className="text-sm font-medium text-card-foreground truncate">{nome}</h3>
            <p className="text-sm font-semibold text-accent mt-0.5">+R$ {preco.toFixed(2)}</p>
          </div>
          {isSelected && (
            <div className="w-5 h-5 rounded-full bg-accent flex items-center justify-center flex-shrink-0">
              <Check className="h-3 w-3 text-accent-foreground" />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
