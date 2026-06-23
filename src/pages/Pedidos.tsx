import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { ShoppingBag, ChevronDown, ChevronUp, Loader2 } from 'lucide-react';

interface PedidoItem {
  id: string;
  modelo: string;
  aco: string;
  acabamento: string;
  empunhadura: string;
  bainha: string;
  cor_bainha: string;
  brute_forge: boolean;
  dragon_scale: boolean;
  texto_laser: string;
  preco_unitario: number;
  quantidade: number;
}

interface Pedido {
  id: string;
  numero_pedido: string;
  cliente_nome: string;
  cliente_celular: string;
  cliente_email: string;
  canal: string;
  forma_pagamento: string;
  valor_total: number;
  status: string;
  prazo_entrega: string;
  embalagem: string;
  brindes: string;
  observacao: string;
  bloqueado_expedicao: boolean;
  motivo_bloqueio: string;
  bling_pedido_id: number;
  created_at: string;
  pedido_itens?: PedidoItem[];
}

const statusCor: Record<string, string> = {
  'aguardando_triagem': 'bg-yellow-500',
  'aprovado': 'bg-green-500',
  'em_producao': 'bg-blue-500',
  'pronto': 'bg-purple-500',
  'em_expedicao': 'bg-orange-500',
  'entregue': 'bg-gray-500',
};

const statusLabel: Record<string, string> = {
  'aguardando_triagem': 'Aguardando',
  'aprovado': 'Aprovado',
  'em_producao': 'Em Produção',
  'pronto': 'Pronto',
  'em_expedicao': 'Expedição',
  'entregue': 'Entregue',
};

export default function Pedidos() {
  const [pedidos, setPedidos] = useState<Pedido[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandido, setExpandido] = useState<string | null>(null);
  const [filtro, setFiltro] = useState('todos');

  const carregarPedidos = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('pedidos')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      toast.error('Erro ao carregar pedidos');
      setLoading(false);
      return;
    }

    const pedidosComItens: Pedido[] = [];
    for (const pedido of (data || [])) {
      const { data: itens } = await supabase
        .from('pedido_itens')
        .select('*')
        .eq('pedido_id', pedido.id);
      pedidosComItens.push({ ...pedido, pedido_itens: itens || [] } as Pedido);
    }

    setPedidos(pedidosComItens);
    setLoading(false);
  };

  useEffect(() => { carregarPedidos(); }, []);

  const pedidosFiltrados = filtro === 'todos'
    ? pedidos
    : pedidos.filter(p => p.status === filtro);

  const formatarData = (data: string) => {
    if (!data) return '-';
    const d = new Date(data);
    return `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}/${d.getFullYear()}`;
  };

  const formatarValor = (valor: number) => {
    if (!valor) return '-';
    return `R$ ${valor.toFixed(2).replace('.', ',')}`;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto py-6 px-4 space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <ShoppingBag className="h-6 w-6" />
          Pedidos
        </h1>
        <Badge variant="outline">{pedidosFiltrados.length} pedido(s)</Badge>
      </div>

      <div className="flex gap-1.5 flex-wrap">
        {['todos', 'aguardando_triagem', 'aprovado', 'em_producao', 'pronto', 'em_expedicao', 'entregue'].map(s => (
          <button key={s} onClick={() => setFiltro(s)}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
              filtro === s ? 'bg-accent text-accent-foreground' : 'bg-muted text-muted-foreground hover:bg-muted/80'
            }`}>
            {s === 'todos' ? 'Todos' : statusLabel[s] || s}
          </button>
        ))}
      </div>

      {pedidosFiltrados.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center text-muted-foreground">
            Nenhum pedido encontrado.
          </CardContent>
        </Card>
      ) : (
        pedidosFiltrados.map(pedido => (
          <Card key={pedido.id} className={pedido.bloqueado_expedicao ? 'border-red-400' : ''}>
            <CardHeader
              className="cursor-pointer pb-3"
              onClick={() => setExpandido(expandido === pedido.id ? null : pedido.id)}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <CardTitle className="text-base">{pedido.numero_pedido}</CardTitle>
                  <Badge className={`${statusCor[pedido.status] || 'bg-gray-400'} text-white text-xs`}>
                    {statusLabel[pedido.status] || pedido.status}
                  </Badge>
                  {pedido.bloqueado_expedicao && (
                    <Badge variant="destructive" className="text-xs">BLOQUEADO</Badge>
                  )}
                  {pedido.bling_pedido_id && (
                    <Badge variant="outline" className="text-xs">Bling</Badge>
                  )}
                </div>
                <div className="flex items-center gap-4 text-sm text-muted-foreground">
                  <span className="hidden sm:inline">{pedido.cliente_nome}</span>
                  <span>{formatarValor(pedido.valor_total)}</span>
                  <span>{pedido.pedido_itens?.length || 0} item(ns)</span>
                  {expandido === pedido.id ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                </div>
              </div>
            </CardHeader>

            {expandido === pedido.id && (
              <CardContent className="pt-0 space-y-4">
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
                  <div><span className="font-medium text-muted-foreground">Cliente:</span> {pedido.cliente_nome}</div>
                  <div><span className="font-medium text-muted-foreground">Canal:</span> {pedido.canal || '-'}</div>
                  <div><span className="font-medium text-muted-foreground">Pagamento:</span> {pedido.forma_pagamento || '-'}</div>
                  <div><span className="font-medium text-muted-foreground">Prazo:</span> {formatarData(pedido.prazo_entrega)}</div>
                  <div><span className="font-medium text-muted-foreground">Celular:</span> {pedido.cliente_celular || '-'}</div>
                  <div><span className="font-medium text-muted-foreground">Email:</span> {pedido.cliente_email || '-'}</div>
                  <div><span className="font-medium text-muted-foreground">Criado:</span> {formatarData(pedido.created_at)}</div>
                  <div><span className="font-medium text-muted-foreground">Embalagem:</span> {pedido.embalagem || '-'}</div>
                </div>

                {pedido.observacao && (
                  <div className="text-sm p-2 bg-muted rounded-md">
                    <span className="font-medium">OBS:</span> {pedido.observacao}
                  </div>
                )}

                {pedido.pedido_itens && pedido.pedido_itens.length > 0 && (
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm border">
                      <thead>
                        <tr className="bg-muted">
                          <th className="p-2 text-left">#</th>
                          <th className="p-2 text-left">Modelo</th>
                          <th className="p-2 text-left">Aço</th>
                          <th className="p-2 text-left">Acabamento</th>
                          <th className="p-2 text-left">Empunhadura</th>
                          <th className="p-2 text-left">Bainha</th>
                          <th className="p-2 text-left">Cor</th>
                        </tr>
                      </thead>
                      <tbody>
                        {pedido.pedido_itens.map((item, idx) => (
                          <tr key={item.id} className="border-t">
                            <td className="p-2">{idx + 1}</td>
                            <td className="p-2 font-medium">
                              {item.modelo}
                              {item.brute_forge && <Badge variant="outline" className="ml-1 text-xs">BF</Badge>}
                            </td>
                            <td className="p-2">{item.aco || '-'}</td>
                            <td className="p-2">{item.acabamento || '-'}</td>
                            <td className="p-2">
                              {item.empunhadura || '-'}
                              {item.dragon_scale && <Badge variant="outline" className="ml-1 text-xs">DS</Badge>}
                            </td>
                            <td className="p-2">{item.bainha || '-'}</td>
                            <td className="p-2">{item.cor_bainha || '-'}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </CardContent>
            )}
          </Card>
        ))
      )}
    </div>
  );
}
