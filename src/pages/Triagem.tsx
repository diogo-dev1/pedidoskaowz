import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { ClipboardList, Check, Loader2, RefreshCw } from 'lucide-react';

const APPS_SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbxnSBLsmbhkN-WRmMTKfSuw6wIxFtd5j8LZHxmsfjf9_T32Id4vR_DKeSMdOhckIHLPJQ/exec';

interface PedidoPlanilha {
  row: number;
  nome: string;
  item: string;
  aco: string;
  acabamento: string;
  empunhadura: string;
  bainha: string;
  cor_bainha: string;
  prazo: string;
  observacoes: string;
  personalizacao: string;
}

export default function Triagem() {
  const [pedidos, setPedidos] = useState<PedidoPlanilha[]>([]);
  const [loading, setLoading] = useState(true);
  const [lancando, setLancando] = useState<number | null>(null);

  const carregarPedidos = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('read-pedidos-lancar');
      if (error) throw error;
      setPedidos(data?.pedidos || []);
    } catch (err: any) {
      toast.error('Erro ao carregar pedidos: ' + (err.message || err));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { carregarPedidos(); }, []);

  const lancarPedido = async (pedido: PedidoPlanilha) => {
    setLancando(pedido.row);
    try {
      await fetch(APPS_SCRIPT_URL, {
        method: 'POST',
        mode: 'no-cors',
        headers: { 'Content-Type': 'text/plain' },
        body: JSON.stringify({ action: 'lancarLinha', row: pedido.row }),
      });

      toast.success(`Pedido de ${pedido.nome} - ${pedido.item} lançado!`);
      setPedidos(prev => prev.filter(p => p.row !== pedido.row));
    } catch (err: any) {
      toast.error('Erro ao lançar: ' + (err.message || err));
    } finally {
      setLancando(null);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto py-6 px-4 space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <ClipboardList className="h-6 w-6" />
          Pedidos a Lançar
        </h1>
        <div className="flex items-center gap-3">
          <Badge variant="outline" className="text-sm">
            {pedidos.length} pedido(s)
          </Badge>
          <Button variant="outline" size="sm" onClick={carregarPedidos}>
            <RefreshCw className="h-4 w-4 mr-1" />
            Atualizar
          </Button>
        </div>
      </div>

      {pedidos.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center text-muted-foreground">
            Nenhum pedido pendente para lançar.
          </CardContent>
        </Card>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm border rounded-lg overflow-hidden">
            <thead>
              <tr className="bg-zinc-900 text-white">
                <th className="p-3 text-left">Nome</th>
                <th className="p-3 text-left">Item</th>
                <th className="p-3 text-left">Aço</th>
                <th className="p-3 text-left">Acabamento</th>
                <th className="p-3 text-left">Empunhadura</th>
                <th className="p-3 text-left">Bainha</th>
                <th className="p-3 text-left">Cor</th>
                <th className="p-3 text-left">Prazo</th>
                <th className="p-3 text-left">Obs</th>
                <th className="p-3 text-left">Laser</th>
                <th className="p-3 text-center w-[100px]">Ação</th>
              </tr>
            </thead>
            <tbody>
              {pedidos.map((pedido, idx) => (
                <tr
                  key={pedido.row}
                  className={`border-t ${idx % 2 === 0 ? 'bg-white' : 'bg-zinc-50'} hover:bg-zinc-100 transition-colors`}
                >
                  <td className="p-3 font-medium">{pedido.nome}</td>
                  <td className="p-3">{pedido.item}</td>
                  <td className="p-3">{pedido.aco}</td>
                  <td className="p-3">{pedido.acabamento}</td>
                  <td className="p-3">{pedido.empunhadura}</td>
                  <td className="p-3">{pedido.bainha}</td>
                  <td className="p-3">{pedido.cor_bainha}</td>
                  <td className="p-3 whitespace-nowrap">{pedido.prazo}</td>
                  <td className="p-3 max-w-[150px] truncate" title={pedido.observacoes}>{pedido.observacoes || '-'}</td>
                  <td className="p-3 max-w-[120px] truncate" title={pedido.personalizacao}>{pedido.personalizacao || '-'}</td>
                  <td className="p-3 text-center">
                    <Button
                      size="sm"
                      variant="default"
                      className="bg-green-600 hover:bg-green-700"
                      onClick={() => lancarPedido(pedido)}
                      disabled={lancando === pedido.row}
                    >
                      {lancando === pedido.row ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <>
                          <Check className="h-4 w-4 mr-1" />
                          Lançar
                        </>
                      )}
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
