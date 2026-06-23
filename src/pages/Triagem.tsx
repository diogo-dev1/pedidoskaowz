import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { ClipboardList, Loader2, RefreshCw, ChevronDown, ChevronUp, BarChart3, Link2, Factory, X } from 'lucide-react';

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
  const [selecionado, setSelecionado] = useState<number | null>(null);
  const [processando, setProcessando] = useState<string | null>(null);

  const carregarPedidos = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('read-pedidos-lancar');
      if (error) throw error;
      setPedidos(data?.pedidos || []);
    } catch (err: any) {
      toast.error('Erro ao carregar: ' + (err.message || err));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { carregarPedidos(); }, []);

  const executarAcao = async (pedido: PedidoPlanilha, action: string, label: string) => {
    setProcessando(action);
    try {
      const { data, error } = await supabase.functions.invoke('read-pedidos-lancar', {
        body: { action, row: pedido.row },
      });

      if (error) {
        const ctx = (error as any).context;
        let detalhe = error.message;
        if (ctx && typeof ctx.json === 'function') {
          try {
            const body = await ctx.json();
            detalhe = body?.erro || body?.error || JSON.stringify(body);
          } catch (_) {}
        }
        toast.error('Erro: ' + detalhe);
        return;
      }

      if (data?.sucesso) {
        toast.success(`${label} realizado com sucesso!`);
        if (action === 'lancar') {
          setSelecionado(null);
          await carregarPedidos();
        }
      } else {
        toast.error('Erro: ' + (data?.erro || JSON.stringify(data) || 'Erro desconhecido'));
      }
    } catch (err: any) {
      toast.error('Erro: ' + (err.message || err));
    } finally {
      setProcessando(null);
    }
  };

  const pedidoSelecionado = pedidos.find(p => p.row === selecionado);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto py-6 px-4 space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold flex items-center gap-2">
          <ClipboardList className="h-5 w-5" />
          Pedidos a Lançar
        </h1>
        <div className="flex items-center gap-2">
          <Badge variant="outline" className="text-xs">{pedidos.length}</Badge>
          <Button variant="ghost" size="sm" onClick={carregarPedidos} className="h-8 w-8 p-0">
            <RefreshCw className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {pedidos.length === 0 ? (
        <Card>
          <CardContent className="py-16 text-center text-muted-foreground">
            Nenhum pedido pendente.
          </CardContent>
        </Card>
      ) : (
        <>
          {/* Cards minimalistas */}
          <div className="grid gap-2">
            {pedidos.map(pedido => (
              <Card
                key={pedido.row}
                className={`cursor-pointer transition-all hover:shadow-md ${
                  selecionado === pedido.row ? 'ring-2 ring-accent' : ''
                }`}
                onClick={() => setSelecionado(selecionado === pedido.row ? null : pedido.row)}
              >
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-sm truncate">{pedido.nome}</p>
                      <p className="text-xs text-muted-foreground truncate">
                        {pedido.item} • {pedido.aco || '-'} • {pedido.empunhadura || '-'}
                      </p>
                    </div>
                    <div className="flex items-center gap-2 ml-3">
                      {pedido.prazo && (
                        <Badge variant="secondary" className="text-[10px] whitespace-nowrap">
                          {pedido.prazo}
                        </Badge>
                      )}
                      {selecionado === pedido.row
                        ? <ChevronUp className="h-4 w-4 text-muted-foreground" />
                        : <ChevronDown className="h-4 w-4 text-muted-foreground" />
                      }
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          {/* Detalhe do pedido selecionado */}
          {pedidoSelecionado && (
            <Card className="border-accent">
              <CardContent className="p-5 space-y-4">
                <div className="flex items-center justify-between">
                  <h2 className="font-bold text-lg">{pedidoSelecionado.nome}</h2>
                  <Button variant="ghost" size="sm" className="h-7 w-7 p-0" onClick={() => setSelecionado(null)}>
                    <X className="h-4 w-4" />
                  </Button>
                </div>

                {/* Detalhes da lâmina */}
                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div className="bg-muted p-3 rounded-lg">
                    <p className="text-[10px] text-muted-foreground uppercase tracking-wide">Modelo</p>
                    <p className="font-medium">{pedidoSelecionado.item || '-'}</p>
                  </div>
                  <div className="bg-muted p-3 rounded-lg">
                    <p className="text-[10px] text-muted-foreground uppercase tracking-wide">Aço</p>
                    <p className="font-medium">{pedidoSelecionado.aco || '-'}</p>
                  </div>
                  <div className="bg-muted p-3 rounded-lg">
                    <p className="text-[10px] text-muted-foreground uppercase tracking-wide">Acabamento</p>
                    <p className="font-medium">{pedidoSelecionado.acabamento || '-'}</p>
                  </div>
                  <div className="bg-muted p-3 rounded-lg">
                    <p className="text-[10px] text-muted-foreground uppercase tracking-wide">Empunhadura</p>
                    <p className="font-medium">{pedidoSelecionado.empunhadura || '-'}</p>
                  </div>
                  <div className="bg-muted p-3 rounded-lg">
                    <p className="text-[10px] text-muted-foreground uppercase tracking-wide">Bainha</p>
                    <p className="font-medium">{pedidoSelecionado.bainha || '-'}</p>
                  </div>
                  <div className="bg-muted p-3 rounded-lg">
                    <p className="text-[10px] text-muted-foreground uppercase tracking-wide">Cor Bainha</p>
                    <p className="font-medium">{pedidoSelecionado.cor_bainha || '-'}</p>
                  </div>
                  <div className="bg-muted p-3 rounded-lg">
                    <p className="text-[10px] text-muted-foreground uppercase tracking-wide">Prazo</p>
                    <p className="font-medium">{pedidoSelecionado.prazo || '-'}</p>
                  </div>
                  <div className="bg-muted p-3 rounded-lg">
                    <p className="text-[10px] text-muted-foreground uppercase tracking-wide">Personalização</p>
                    <p className="font-medium">{pedidoSelecionado.personalizacao || '-'}</p>
                  </div>
                </div>

                {pedidoSelecionado.observacoes && pedidoSelecionado.observacoes !== '-' && (
                  <div className="bg-yellow-50 border border-yellow-200 p-3 rounded-lg text-sm">
                    <p className="text-[10px] text-yellow-700 uppercase tracking-wide font-medium">Observações</p>
                    <p className="text-yellow-900">{pedidoSelecionado.observacoes}</p>
                  </div>
                )}

                {/* Botões de ação */}
                <div className="grid gap-2 pt-2">
                  <Button
                    className="w-full bg-green-600 hover:bg-green-700"
                    onClick={() => executarAcao(pedidoSelecionado, 'vendas', 'Lançamento no Relatório de Vendas')}
                    disabled={!!processando}
                  >
                    {processando === 'vendas' ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <BarChart3 className="h-4 w-4 mr-2" />}
                    Lançar no Relatório de Vendas
                  </Button>

                  <Button
                    className="w-full bg-blue-600 hover:bg-blue-700"
                    onClick={() => executarAcao(pedidoSelecionado, 'bling', 'Pedido de venda no Bling')}
                    disabled={!!processando}
                  >
                    {processando === 'bling' ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Link2 className="h-4 w-4 mr-2" />}
                    Gerar Pedido no Bling
                  </Button>

                  <Button
                    className="w-full bg-orange-600 hover:bg-orange-700"
                    onClick={() => executarAcao(pedidoSelecionado, 'lancar', 'Lançamento na Produção')}
                    disabled={!!processando}
                  >
                    {processando === 'lancar' ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Factory className="h-4 w-4 mr-2" />}
                    Lançar na Produção
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}
        </>
      )}
    </div>
  );
}
