import { useEffect, useMemo, useState } from 'react';
import { Input } from '@/components/ui/input';
import { Search, Truck } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useLoteSelector } from '@/hooks/useLoteSelector';
import { usePedidosByLote, type PedidoComItens } from '@/hooks/usePedidosByLote';
import { LoteSelectorHeader } from '@/components/producao/LoteSelectorHeader';
import { ExpedicaoClienteCard } from '@/components/expedicao/ExpedicaoClienteCard';
import { ExpedicaoDetalheModal } from '@/components/expedicao/ExpedicaoDetalheModal';

interface ExpedicaoRow {
  pedido_id: string;
  status: string | null;
}

export default function ExpedicaoPage() {
  const { lotes, selectedLote, selectedLoteId, setSelectedLoteId, isLoading: loadingLotes } = useLoteSelector();
  const { data: pedidos = [], isLoading: loadingPedidos } = usePedidosByLote(selectedLoteId);

  const [search, setSearch] = useState('');
  const [selectedPedido, setSelectedPedido] = useState<PedidoComItens | null>(null);
  const [expedicaoMap, setExpedicaoMap] = useState<Record<string, string | null>>({});

  useEffect(() => {
    if (pedidos.length === 0) return;
    const ids = pedidos.map((p) => p.id);
    supabase
      .from('expedicao')
      .select('pedido_id, status')
      .in('pedido_id', ids)
      .then(({ data }) => {
        const map: Record<string, string | null> = {};
        (data as ExpedicaoRow[] | null)?.forEach((r) => { map[r.pedido_id] = r.status; });
        setExpedicaoMap(map);
      });
  }, [pedidos]);

  const filtered = useMemo(() => {
    if (!search.trim()) return pedidos;
    const q = search.toLowerCase();
    return pedidos.filter(
      (p) => p.cliente_nome.toLowerCase().includes(q) || p.numero_pedido.toLowerCase().includes(q),
    );
  }, [pedidos, search]);

  return (
    <div className="max-w-5xl mx-auto py-6 px-4 space-y-6">
      <div className="flex items-center gap-3">
        <Truck className="h-6 w-6 text-primary" />
        <div>
          <h1 className="text-xl sm:text-2xl font-bold">Expedição</h1>
          <p className="text-xs text-muted-foreground">Envios e acompanhamento por cliente no lote</p>
        </div>
      </div>

      <LoteSelectorHeader
        lotes={lotes}
        selectedLoteId={selectedLoteId}
        onSelectLote={setSelectedLoteId}
        isLoading={loadingLotes}
      />

      {selectedLote && (
        <>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Buscar por cliente ou pedido..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9"
            />
          </div>

          {loadingPedidos ? (
            <p className="text-center text-muted-foreground py-8">Carregando pedidos...</p>
          ) : filtered.length === 0 ? (
            <p className="text-center text-muted-foreground py-8">
              {pedidos.length === 0 ? 'Nenhum pedido neste lote' : 'Nenhum cliente encontrado'}
            </p>
          ) : (
            <div className="grid gap-2 sm:grid-cols-2">
              {filtered.map((p) => (
                <ExpedicaoClienteCard
                  key={p.id}
                  pedido={p}
                  expedicaoStatus={expedicaoMap[p.id]}
                  onClick={() => setSelectedPedido(p)}
                />
              ))}
            </div>
          )}
        </>
      )}

      <ExpedicaoDetalheModal
        open={!!selectedPedido}
        onClose={() => setSelectedPedido(null)}
        pedido={selectedPedido}
        loteId={selectedLoteId}
      />
    </div>
  );
}
