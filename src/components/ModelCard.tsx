import { Check } from 'lucide-react';

interface ModelCardProps {
  nome: string;
  preco: number;
  imagem?: string | null;
  isSelected: boolean;
  onClick: () => void;
}

export default function ModelCard({ nome, preco, imagem, isSelected, onClick }: ModelCardProps) {
  return (
    <div
      className={`cursor-pointer transition-all bg-card rounded-lg overflow-hidden shadow-sm hover:shadow-md ${
        isSelected ? 'ring-2 ring-accent' : 'border border-border'
      }`}
      onClick={onClick}
    >
      {imagem && (
        <div className="relative aspect-square bg-muted">
          <img
            src={imagem}
            alt={nome}
            className="w-full h-full object-cover"
          />
        </div>
      )}
      <div className="p-4">
        <div className="flex items-start justify-between gap-2">
          <div className="flex-1 min-w-0">
            <h3 className="text-sm font-semibold text-card-foreground truncate">{nome}</h3>
            <p className="text-lg font-bold text-accent mt-1">R$ {preco.toFixed(2)}</p>
          </div>
          {isSelected && (
            <div className="w-6 h-6 rounded-full bg-accent flex items-center justify-center flex-shrink-0">
              <Check className="h-4 w-4 text-accent-foreground" />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
