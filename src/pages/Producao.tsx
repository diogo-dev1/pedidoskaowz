import { useMemo, useState } from 'react';
import { Input } from '@/components/ui/input';
import { Search, Factory } from 'lucide-react';
import { useLoteSelector } from '@/hooks/useLoteSelector';
import { usePedidosByLote, type PedidoItem } from '@/hooks/usePedidosByLote';
import { LoteSelectorHeader } from '@/components/producao/LoteSelectorHeader';
import { ProducaoItemCard } from '@/components/producao/ProducaoItemCard';
import { ProducaoItemModal } from '@/components/producao/ProducaoItemModal';
import type { ItemStatus } from '@/components/producao/StatusDot';

interface FlatItem extends PedidoItem {
  clienteNome: string;
  numeroPedido: string;
  prazo: string | null;
  loteId: string | null;
}

export default function Producao() {
  const { lotes, selectedLote, selectedLoteId, setSelectedLoteId, isLoading: loadingLotes } = useLoteSelector();
  const { data: pedidos = [], isLoading: loadingPedidos } = usePedidosByLote(selectedLoteId);

  const [search, setSearch] = useState('');
  const [selectedItem, setSelectedItem] = useState<FlatItem | null>(null);

  const flatItems: FlatItem[] = useMemo(() => {
    const items: FlatItem[] = [];
    for (const p of pedidos) {
      for (const item of p.pedido_itens) {
        items.push({
          ...item,
          clienteNome: p.cliente_nome,
          numeroPedido: p.numero_pedido,
          prazo: p.prazo_entrega,
          loteId: p.lote_id,
        });
      }
    }
    return items;
  }, [pedidos]);

  const allPedidoItems = useMemo(() => flatItems.map((fi) => fi as PedidoItem), [flatItems]);

  const filtered = useMemo(() => {
    if (!search.trim()) return flatItems;
    const q = search.toLowerCase();
    return flatItems.filter(
      (i) => i.clienteNome.toLowerCase().includes(q) || (i.modelo || '').toLowerCase().includes(q),
    );
  }, [flatItems, search]);

  return (
    <div className="max-w-5xl mx-auto py-6 px-4 space-y-6">
      <div className="flex items-center gap-3">
        <Factory className="h-6 w-6 text-primary" />
        <div>
          <h1 className="text-xl sm:text-2xl font-bold">Acompanhamento de Produção</h1>
          <p className="text-xs text-muted-foreground">Status de cada faca no lote</p>
        </div>
      </div>

      <LoteSelectorHeader
        lotes={lotes}
        selectedLoteId={selectedLoteId}
        onSelectLote={setSelectedLoteId}
        isLoading={loadingLotes}
        items={allPedidoItems}
      />

      {selectedLote && (
        <>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Buscar por cliente ou modelo..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9"
            />
          </div>

          {loadingPedidos ? (
            <p className="text-center text-muted-foreground py-8">Carregando itens...</p>
          ) : filtered.length === 0 ? (
            <p className="text-center text-muted-foreground py-8">
              {flatItems.length === 0 ? 'Nenhum pedido neste lote' : 'Nenhum item encontrado'}
            </p>
          ) : (
            <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
              {filtered.map((item) => (
                <ProducaoItemCard
                  key={item.id}
                  clienteNome={item.clienteNome}
                  modelo={item.modelo}
                  prazo={item.prazo}
                  statusLamina={(item.status_lamina as ItemStatus) || 'pendente'}
                  statusEmpunhadura={(item.status_empunhadura as ItemStatus) || 'pendente'}
                  statusBainha={(item.status_bainha as ItemStatus) || 'pendente'}
                  statusLaser={(item.status_laser as ItemStatus) || 'nao_aplicavel'}
                  onClick={() => setSelectedItem(item)}
                />
              ))}
            </div>
          )}
        </>
      )}

      <ProducaoItemModal
        open={!!selectedItem}
        onClose={() => setSelectedItem(null)}
        item={selectedItem}
        clienteNome={selectedItem?.clienteNome ?? ''}
        numeroPedido={selectedItem?.numeroPedido ?? ''}
        prazo={selectedItem?.prazo ?? null}
        loteId={selectedLoteId}
      />
    </div>
  );
}
