import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ChevronRight, AlertTriangle } from 'lucide-react';
import type { PedidoComItens } from '@/hooks/usePedidosByLote';

const STATUS_COLORS: Record<string, string> = {
  aguardando: 'bg-yellow-500',
  conferida: 'bg-blue-500',
  embalada: 'bg-purple-500',
  postada: 'bg-green-500',
  entregue: 'bg-emerald-600',
};

interface Props {
  pedido: PedidoComItens;
  expedicaoStatus?: string | null;
  onClick: () => void;
}

export function ExpedicaoClienteCard({ pedido, expedicaoStatus, onClick }: Props) {
  const status = expedicaoStatus || 'aguardando';

  return (
    <Card className="cursor-pointer transition-all hover:shadow-md hover:border-primary/30" onClick={onClick}>
      <CardContent className="p-4">
        <div className="flex items-center gap-3">
          <div className={`w-1 h-12 rounded-full flex-shrink-0 ${STATUS_COLORS[status] || 'bg-zinc-400'}`} />

          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <p className="font-semibold text-sm truncate">{pedido.cliente_nome}</p>
              {pedido.bloqueado_expedicao && (
                <AlertTriangle className="h-3.5 w-3.5 text-destructive flex-shrink-0" />
              )}
            </div>
            <p className="text-xs text-muted-foreground truncate">
              {pedido.numero_pedido} · {pedido.pedido_itens.length} {pedido.pedido_itens.length === 1 ? 'item' : 'itens'}
            </p>
          </div>

          <div className="text-right flex-shrink-0">
            <Badge variant="secondary" className="text-[10px]">{status}</Badge>
            {pedido.valor_total != null && (
              <p className="text-xs font-semibold mt-1">
                {pedido.valor_total.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
              </p>
            )}
          </div>

          <ChevronRight className="h-4 w-4 text-muted-foreground flex-shrink-0" />
        </div>
      </CardContent>
    </Card>
  );
}
