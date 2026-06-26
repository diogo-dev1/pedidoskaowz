import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { StatusBadge, type ItemStatus } from './StatusDot';
import type { PedidoItem } from '@/hooks/usePedidosByLote';

interface Props {
  open: boolean;
  onClose: () => void;
  item: PedidoItem | null;
  clienteNome: string;
  numeroPedido: string;
  prazo: string | null;
  loteId: string | null;
}

type StatusField = 'status_lamina' | 'status_empunhadura' | 'status_bainha' | 'status_laser';

const FIELD_LABELS: Record<StatusField, string> = {
  status_lamina: 'Lâmina',
  status_empunhadura: 'Empunhadura',
  status_bainha: 'Bainha',
  status_laser: 'Laser',
};

function InfoRow({ label, value }: { label: string; value: string | null }) {
  if (!value) return null;
  return (
    <div className="flex justify-between items-baseline gap-2">
      <span className="text-xs text-muted-foreground">{label}</span>
      <span className="text-sm font-medium text-right">{value}</span>
    </div>
  );
}

export function ProducaoItemModal({ open, onClose, item, clienteNome, numeroPedido, prazo, loteId }: Props) {
  const qc = useQueryClient();

  const mutation = useMutation({
    mutationFn: async ({ field, value }: { field: StatusField; value: ItemStatus }) => {
      const { error } = await supabase
        .from('pedido_itens')
        .update({ [field]: value })
        .eq('id', item!.id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['pedidos-lote', loteId] });
    },
    onError: () => {
      toast.error('Erro ao atualizar status');
    },
  });

  if (!item) return null;

  const handleStatusChange = (field: StatusField) => (next: ItemStatus) => {
    mutation.mutate({ field, value: next });
  };

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-base">{item.modelo || 'Item'}</DialogTitle>
          <p className="text-xs text-muted-foreground">{clienteNome} · {numeroPedido}</p>
        </DialogHeader>

        <div className="space-y-4">
          {/* Specs */}
          <div className="space-y-1.5 p-3 rounded-lg bg-muted/50">
            <InfoRow label="Aço" value={item.aco} />
            <InfoRow label="Acabamento" value={item.acabamento} />
            <InfoRow label="Empunhadura" value={item.empunhadura} />
            <InfoRow label="Bainha" value={item.bainha} />
            <InfoRow label="Cor Bainha" value={item.cor_bainha} />
            {item.brute_forge && <InfoRow label="Brute Forge" value="Sim" />}
            {item.dragon_scale && <InfoRow label="Dragon Scale" value="Sim" />}
            <InfoRow label="Laser" value={item.texto_laser} />
            <InfoRow label="Embalagem" value={item.embalagem_item} />
            <InfoRow label="Observações" value={item.observacoes_item} />
            {prazo && <InfoRow label="Prazo" value={new Date(prazo + 'T12:00:00').toLocaleDateString('pt-BR')} />}
          </div>

          {/* Status */}
          <div className="space-y-1.5">
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Status de Produção</p>
            {(Object.keys(FIELD_LABELS) as StatusField[]).map((f) => (
              <StatusBadge
                key={f}
                status={(item[f] as ItemStatus) || 'pendente'}
                label={FIELD_LABELS[f]}
                onClick={handleStatusChange(f)}
              />
            ))}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
