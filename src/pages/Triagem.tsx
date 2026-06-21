import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { ClipboardList, ChevronDown, ChevronUp, Loader2 } from 'lucide-react';

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
  embalagem_item: string;
  observacoes_item: string;
  preco_unitario: number;
  quantidade: number;
}

interface Pedido {
  id: string;
  numero_pedido: string;
  cliente_nome: string;
  cliente_cpf: string;
  cliente_celular: string;
  cliente_email: string;
  cliente_cep: string;
  cliente_estado: string;
  cliente_cidade: string;
  cliente_bairro: string;
  cliente_endereco: string;
  cliente_numero: string;
  cliente_complemento: string;
  canal: string;
  forma_pagamento: string;
  valor_total: number;
  status: string;
  prazo_entrega: string;
  nome_certificado: string;
  embalagem: string;
  brindes: string;
  observacao: string;
  bloqueado_expedicao: boolean;
  motivo_bloqueio: string;
  cupom: string;
  created_at: string;
  pedido_itens?: PedidoItem[];
}

export default function Triagem() {
  const [pedidos, setPedidos] = useState<Pedido[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandido, setExpandido] = useState<string | null>(null);
  const [atualizando, setAtualizando] = useState<string | null>(null);

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

  const atualizarStatus = async (pedidoId: string, novoStatus: string) => {
    setAtualizando(pedidoId);
    const updates: any = { status: novoStatus };
    if (novoStatus === 'aprovado') {
      updates.aprovado_em = new Date().toISOString();
    }
    const { error } = await supabase
      .from('pedidos')
      .update(updates)
      .eq('id', pedidoId);

    if (error) {
      toast.error('Erro ao atualizar status');
    } else {
      toast.success(`Pedido ${novoStatus === 'aprovado' ? 'aprovado' : 'atualizado'}!`);
      carregarPedidos();
    }
    setAtualizando(null);
  };

  const statusCor = (status: string) => {
    const cores: Record<string, string> = {
      'aguardando_triagem': 'bg-yellow-500',
      'aprovado': 'bg-green-500',
      'em_producao': 'bg-blue-500',
      'pronto': 'bg-purple-500',
      'em_expedicao': 'bg-orange-500',
      'entregue': 'bg-gray-500',
    };
    return cores[status] || 'bg-gray-400';
  };

  const statusLabel = (status: string) => {
    const labels: Record<string, string> = {
      'aguardando_triagem': 'Aguardando Triagem',
      'aprovado': 'Aprovado',
      'em_producao': 'Em Produção',
      'pronto': 'Pronto',
      'em_expedicao': 'Em Expedição',
      'entregue': 'Entregue',
    };
    return labels[status] || status;
  };

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
          <ClipboardList className="h-6 w-6" />
          Pedidos
        </h1>
        <Badge variant="outline" className="text-sm">
          {pedidos.length} pedido(s)
        </Badge>
      </div>

      {pedidos.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center text-muted-foreground">
            Nenhum pedido encontrado.
          </CardContent>
        </Card>
      ) : (
        pedidos.map(pedido => (
          <Card key={pedido.id} className={pedido.bloqueado_expedicao ? 'border-red-400' : ''}>
            <CardHeader
              className="cursor-pointer pb-3"
              onClick={() => setExpandido(expandido === pedido.id ? null : pedido.id)}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <CardTitle className="text-base">{pedido.numero_pedido}</CardTitle>
                  <Badge className={`${statusCor(pedido.status)} text-white text-xs`}>
                    {statusLabel(pedido.status)}
                  </Badge>
                  {pedido.bloqueado_expedicao && (
                    <Badge variant="destructive" className="text-xs">BLOQUEADO</Badge>
                  )}
                </div>
                <div className="flex items-center gap-4 text-sm text-muted-foreground">
                  <span>{pedido.cliente_nome}</span>
                  <span>{formatarValor(pedido.valor_total)}</span>
                  <span>{pedido.pedido_itens?.length || 0} item(ns)</span>
                  {expandido === pedido.id ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                </div>
              </div>
            </CardHeader>

            {expandido === pedido.id && (
              <CardContent className="pt-0 space-y-4">
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
                  <div><span className="font-medium text-muted-foreground">Canal:</span> {pedido.canal || '-'}</div>
                  <div><span className="font-medium text-muted-foreground">Pagamento:</span> {pedido.forma_pagamento || '-'}</div>
                  <div><span className="font-medium text-muted-foreground">Prazo:</span> {formatarData(pedido.prazo_entrega)}</div>
                  <div><span className="font-medium text-muted-foreground">Cupom:</span> {pedido.cupom || '-'}</div>
                  <div><span className="font-medium text-muted-foreground">Celular:</span> {pedido.cliente_celular || '-'}</div>
                  <div><span className="font-medium text-muted-foreground">Email:</span> {pedido.cliente_email || '-'}</div>
                  <div><span className="font-medium text-muted-foreground">CPF:</span> {pedido.cliente_cpf || '-'}</div>
                  <div><span className="font-medium text-muted-foreground">Criado em:</span> {formatarData(pedido.created_at)}</div>
                  <div className="col-span-2"><span className="font-medium text-muted-foreground">Endereço:</span> {[pedido.cliente_endereco, pedido.cliente_numero, pedido.cliente_complemento, pedido.cliente_bairro, pedido.cliente_cidade, pedido.cliente_estado, pedido.cliente_cep].filter(Boolean).join(', ') || '-'}</div>
                  <div><span className="font-medium text-muted-foreground">Embalagem:</span> {pedido.embalagem || '-'}</div>
                  <div><span className="font-medium text-muted-foreground">Brindes:</span> {pedido.brindes || '-'}</div>
                </div>

                {pedido.observacao && (
                  <div className="text-sm p-2 bg-muted rounded-md">
                    <span className="font-medium">OBS:</span> {pedido.observacao}
                  </div>
                )}

                {pedido.bloqueado_expedicao && pedido.motivo_bloqueio && (
                  <div className="text-sm p-2 bg-red-50 text-red-700 rounded-md border border-red-200">
                    <span className="font-medium">Bloqueio:</span> {pedido.motivo_bloqueio}
                  </div>
                )}

                {pedido.pedido_itens && pedido.pedido_itens.length > 0 && (
                  <div className="space-y-2">
                    <h4 className="font-medium text-sm">Lâminas:</h4>
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
                            <th className="p-2 text-left">Laser</th>
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
                              <td className="p-2">{item.texto_laser && item.texto_laser !== '-' ? item.texto_laser : '-'}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}

                <div className="flex gap-2 pt-2">
                  {pedido.status === 'aguardando_triagem' && (
                    <Button
                      size="sm"
                      onClick={() => atualizarStatus(pedido.id, 'aprovado')}
                      disabled={atualizando === pedido.id}
                    >
                      {atualizando === pedido.id ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : null}
                      Aprovar Pedido
                    </Button>
                  )}
                  {pedido.status === 'aprovado' && (
                    <Button
                      size="sm"
                      onClick={() => atualizarStatus(pedido.id, 'em_producao')}
                      disabled={atualizando === pedido.id}
                    >
                      Enviar para Produção
                    </Button>
                  )}
                  {pedido.status === 'em_producao' && (
                    <Button
                      size="sm"
                      onClick={() => atualizarStatus(pedido.id, 'pronto')}
                      disabled={atualizando === pedido.id}
                    >
                      Marcar como Pronto
                    </Button>
                  )}
                </div>
              </CardContent>
            )}
          </Card>
        ))
      )}
    </div>
  );
}
