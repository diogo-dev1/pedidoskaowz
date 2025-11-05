import { Card, CardHeader, CardTitle } from '@/components/ui/card';
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
    <Card
      className={`cursor-pointer transition-all hover:shadow-md ${
        isSelected ? 'ring-2 ring-accent shadow-md' : ''
      }`}
      onClick={onClick}
    >
      {imagem && (
        <img
          src={imagem}
          alt={nome}
          className="w-full h-24 object-cover rounded-t-lg"
        />
      )}
      <CardHeader className="p-3">
        <CardTitle className="text-sm flex items-center justify-between">
          <div>
            <div className="font-semibold">{nome}</div>
            <div className="text-xs text-muted-foreground mt-1">R$ {preco.toFixed(2)}</div>
          </div>
          {isSelected && <Check className="h-4 w-4 text-accent flex-shrink-0" />}
        </CardTitle>
      </CardHeader>
    </Card>
  );
}
