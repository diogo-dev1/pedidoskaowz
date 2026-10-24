import { useState } from 'react';
import { Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { acaoPE, type PedidoPE } from '@/lib/pedidoPE';
import { rastrearPE } from './PedidoDetalhes';

interface Props {
  pedidos: PedidoPE[] | null;
  onClose: () => void;
  onDone: () => void;
}

/** Confirma "Envio concluído" de um ou vários pedidos e depois busca o rastreio no Bling. */
export function EnviarDialog({ pedidos, onClose, onDone }: Props) {
  const [busy, setBusy] = useState(false);

  if (!pedidos?.length) return null;

  const confirmar = async () => {
    setBusy(true);
    const ok: PedidoPE[] = [];
    const falhas: string[] = [];

    for (const p of pedidos) {
      try {
        await acaoPE({ acao: 'marcar_enviado', id: p.id });
        ok.push(p);
      } catch {
        falhas.push(p.cliente_nome || p.pedido_numero);
      }
    }
    setBusy(false);

    if (ok.length) {
      toast.success(ok.length === 1 ? 'Envio concluído' : `${ok.length} envios concluídos`);
      onDone();
    }
    if (falhas.length) toast.error(`Não foi possível concluir: ${falhas.join(', ')}`);
    else onClose();

    // Busca o rastreio dos pedidos do Shopify (pode ainda não estar no Bling).
    for (const p of ok) {
      if (!p.shopify_order_id) continue;
      try {
        await rastrearPE(p);
      } catch {
        toast.info('O rastreio ainda não está no Bling — vamos tentar de novo automaticamente');
      } finally {
        onDone();
      }
    }
  };

  const titulo = pedidos.length === 1
    ? `Confirmar envio para ${pedidos[0].cliente_nome || 'Sem nome'}?`
    : `Confirmar ${pedidos.length} envios?`;

  return (
    <AlertDialog open onOpenChange={(v) => !v && !busy && onClose()}>
      <AlertDialogContent className="max-h-[90dvh] overflow-y-auto">
        <AlertDialogHeader>
          <AlertDialogTitle>{titulo}</AlertDialogTitle>
          <AlertDialogDescription>Confira os itens que serão marcados como enviados.</AlertDialogDescription>
        </AlertDialogHeader>

        <div className="space-y-3 text-sm">
          {pedidos.map((p) => (
            <div key={p.id}>
              {pedidos.length > 1 && (
                <p className="font-medium">
                  {p.cliente_nome} · {p.pedido_numero}
                </p>
              )}
              <ul>
                {p.itens
                  .filter((i) => i.pronta_entrega && !i.enviado)
                  .map((i, n) => (
                    <li key={n}>
                      {i.quantidade}x {i.titulo}
                    </li>
                  ))}
              </ul>
            </div>
          ))}
        </div>

        <AlertDialogFooter>
          <AlertDialogCancel disabled={busy} onClick={onClose}>
            Cancelar
          </AlertDialogCancel>
          <AlertDialogAction
            disabled={busy}
            onClick={(e) => {
              e.preventDefault();
              confirmar();
            }}
          >
            {busy && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Envio concluído
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
