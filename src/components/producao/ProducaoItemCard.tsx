import { Card, CardContent } from '@/components/ui/card';
import { ChevronRight } from 'lucide-react';
import { StatusDot, type ItemStatus } from './StatusDot';

interface Props {
  clienteNome: string;
  modelo: string | null;
  prazo: string | null;
  statusLamina: ItemStatus;
  statusEmpunhadura: ItemStatus;
  statusBainha: ItemStatus;
  statusLaser: ItemStatus;
  onClick: () => void;
}

export function ProducaoItemCard({ clienteNome, modelo, prazo, statusLamina, statusEmpunhadura, statusBainha, statusLaser, onClick }: Props) {
  return (
    <Card className="cursor-pointer transition-all hover:shadow-md hover:border-primary/30" onClick={onClick}>
      <CardContent className="p-4">
        <div className="flex items-center gap-3">
          <div className="flex-1 min-w-0">
            <p className="font-semibold text-sm truncate">{clienteNome}</p>
            <p className="text-xs text-muted-foreground truncate">{modelo || '—'}</p>
          </div>

          <div className="flex items-center gap-1.5 flex-shrink-0" onClick={(e) => e.stopPropagation()}>
            <StatusDot status={statusLamina} label="Lâmina" />
            <StatusDot status={statusEmpunhadura} label="Empunhadura" />
            <StatusDot status={statusBainha} label="Bainha" />
            <StatusDot status={statusLaser} label="Laser" />
          </div>

          {prazo && (
            <span className="text-[10px] text-muted-foreground flex-shrink-0 hidden sm:block">
              {new Date(prazo + 'T12:00:00').toLocaleDateString('pt-BR')}
            </span>
          )}

          <ChevronRight className="h-4 w-4 text-muted-foreground flex-shrink-0" />
        </div>
      </CardContent>
    </Card>
  );
}
