import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Package, Loader2 } from 'lucide-react';
import type { Lote } from '@/hooks/useLoteSelector';
import type { PedidoItem } from '@/hooks/usePedidosByLote';

interface Props {
  lotes: Lote[];
  selectedLoteId: string | null;
  onSelectLote: (id: string) => void;
  isLoading: boolean;
  items?: PedidoItem[];
}

function countStatus(items: PedidoItem[]) {
  let total = 0;
  let concluido = 0;
  const fields = ['status_lamina', 'status_empunhadura', 'status_bainha', 'status_laser'] as const;
  for (const item of items) {
    for (const f of fields) {
      const v = item[f];
      if (v === 'nao_aplicavel') continue;
      total++;
      if (v === 'concluido') concluido++;
    }
  }
  return { total, concluido, pct: total > 0 ? Math.round((concluido / total) * 100) : 0 };
}

export function LoteSelectorHeader({ lotes, selectedLoteId, onSelectLote, isLoading, items = [] }: Props) {
  const selected = lotes.find((l) => l.id === selectedLoteId);
  const stats = countStatus(items);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12 text-muted-foreground">
        <Loader2 className="h-5 w-5 animate-spin mr-2" />
        Carregando lotes...
      </div>
    );
  }

  if (lotes.length === 0) {
    return (
      <div className="text-center py-12 text-muted-foreground">
        <Package className="h-10 w-10 mx-auto mb-3 opacity-40" />
        <p className="font-medium">Nenhum lote encontrado</p>
        <p className="text-xs mt-1">Crie um lote para começar o acompanhamento de produção.</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-3 flex-wrap">
        <Select value={selectedLoteId ?? ''} onValueChange={onSelectLote}>
          <SelectTrigger className="w-[240px]">
            <SelectValue placeholder="Selecione o lote" />
          </SelectTrigger>
          <SelectContent>
            {lotes.map((l) => (
              <SelectItem key={l.id} value={l.id}>
                Lote {l.numero_lote}{l.lote_id_semana ? ` · ${l.lote_id_semana}` : ''}{l.status === 'fechado' ? ' (fechado)' : ''}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {selected && (
          <>
            <Badge variant={selected.status === 'aberto' ? 'default' : 'secondary'}>
              {selected.status === 'aberto' ? 'Aberto' : 'Fechado'}
            </Badge>
            <span className="text-xs text-muted-foreground">
              {selected.total_pedidos ?? 0}/{selected.capacidade_max ?? 45} pedidos
            </span>
            {selected.prazo_envio && (
              <span className="text-xs text-muted-foreground">
                Prazo: {new Date(selected.prazo_envio + 'T12:00:00').toLocaleDateString('pt-BR')}
              </span>
            )}
          </>
        )}
      </div>

      {items.length > 0 && (
        <div className="flex items-center gap-3">
          <Progress value={stats.pct} className="flex-1 h-2" />
          <span className="text-xs font-medium text-muted-foreground whitespace-nowrap">
            {stats.concluido}/{stats.total} etapas ({stats.pct}%)
          </span>
        </div>
      )}
    </div>
  );
}
