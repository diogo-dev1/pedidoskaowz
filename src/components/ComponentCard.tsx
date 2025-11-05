import { Card, CardHeader, CardTitle } from '@/components/ui/card';
import { Check } from 'lucide-react';

interface ComponentCardProps {
  nome: string;
  preco: number;
  isSelected: boolean;
  onClick: () => void;
}

export default function ComponentCard({ nome, preco, isSelected, onClick }: ComponentCardProps) {
  return (
    <Card
      className={`cursor-pointer transition-all hover:shadow-md ${
        isSelected ? 'ring-2 ring-accent shadow-md' : ''
      }`}
      onClick={onClick}
    >
      <CardHeader className="p-3">
        <CardTitle className="text-xs flex items-center justify-between gap-2">
          <div className="flex-1 min-w-0">
            <div className="font-semibold truncate">{nome}</div>
            <div className="text-xs text-muted-foreground mt-0.5">+R$ {preco.toFixed(2)}</div>
          </div>
          {isSelected && <Check className="h-3 w-3 text-accent flex-shrink-0" />}
        </CardTitle>
      </CardHeader>
    </Card>
  );
}
