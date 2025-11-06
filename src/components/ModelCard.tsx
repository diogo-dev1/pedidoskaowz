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
      className={`cursor-pointer transition-all border bg-card ${
        isSelected ? 'border-foreground' : 'border-border hover:border-foreground/30'
      }`}
      onClick={onClick}
    >
      {imagem && (
        <img
          src={imagem}
          alt={nome}
          className="w-full h-24 object-cover"
        />
      )}
      <div className="p-3">
        <div className="flex items-center justify-between">
          <div className="flex-1">
            <div className="text-sm font-medium">{nome}</div>
            <div className="text-xs text-muted-foreground mt-1">R$ {preco.toFixed(2)}</div>
          </div>
          {isSelected && <Check className="h-4 w-4 flex-shrink-0" />}
        </div>
      </div>
    </div>
  );
}
