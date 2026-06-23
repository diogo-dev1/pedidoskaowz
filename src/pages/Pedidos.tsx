import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { Loader2, RefreshCw, ChevronRight, X, Package, Clock, CheckCircle2, Truck, Box, AlertTriangle } from 'lucide-react';

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
  cliente_cpf: string;
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
  embalagem: string;
  brindes: string;
  observacao: string;
  bloqueado_expedicao: boolean;
  motivo_bloqueio: string;
  bling_pedido_id: number;
  cupom: string;
  created_at: string;
  pedido_itens?: PedidoItem[];
}

const STATUS_CONFIG: Record<string, { label: string; cor: string; bg: string; icon: any }> = {
  'aguardando_triagem': { label: 'Aguardando', cor: 'text-amber-700', bg: 'bg-amber-50 border-amber-200', icon: Clock },
  'aprovado': { label: 'Aprovado', cor: 'text-green-700', bg: 'bg-green-50 border-green-200', icon: CheckCircle2 },
  'em_producao': { label: 'Produção', cor: 'text-blue-700', bg: 'bg-blue-50 border-blue-200', icon: Package },
  'pronto': { label: 'Pronto', cor: 'text-purple-700', bg: 'bg-purple-50 border-purple-200', icon: Box },
  'em_expedicao': { label: 'Expedição', cor: 'text-orange-700', bg: 'bg-orange-50 border-orange-200', icon: Truck },
  'entregue': { label: 'Entregue', cor: 'text-gray-500', bg: 'bg-gray-50 border-gray-200', icon: CheckCircle2 },
};

export default function Pedidos() {
  const [pedidos, setPedidos] = useState<Pedido[]>([]);
  const [loading, setLoading] = useState(true);
  const [selecionado, setSelecionado] = useState<string | null>(null);
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

  const contadores = pedidos.reduce((acc, p) => {
    acc[p.status] = (acc[p.status] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  const pedidosFiltrados = filtro === 'todos'
    ? pedidos
    : pedidos.filter(p => p.status === filtro);

  const pedidoAberto = pedidos.find(p => p.id === selecionado);

  const formatarData = (data: string) => {
    if (!data) return '-';
    const d = new Date(data);
    return `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}/${d.getFullYear()}`;
  };

  const formatarValor = (valor: number) => {
    if (!valor) return '-';
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(valor);
  };

  const atualizarStatus = async (pedidoId: string, novoStatus: string) => {
    const { error } = await supabase
      .from('pedidos')
      .update({ status: novoStatus, ...(novoStatus === 'aprovado' ? { aprovado_em: new Date().toISOString() } : {}) })
      .eq('id', pedidoId);
    if (error) {
      toast.error('Erro ao atualizar');
    } else {
      toast.success('Status atualizado');
      carregarPedidos();
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  // Detalhe do pedido aberto
  if (pedidoAberto) {
    const cfg = STATUS_CONFIG[pedidoAberto.status] || STATUS_CONFIG['aguardando_triagem'];
    const StatusIcon = cfg.icon;
    return (
      <div className="max-w-2xl mx-auto py-6 px-4 space-y-4">
        <button onClick={() => setSelecionado(null)} className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
          ← Voltar
        </button>

        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold">{pedidoAberto.numero_pedido}</h1>
            <p className="text-sm text-muted-foreground">{formatarData(pedidoAberto.created_at)}</p>
          </div>
          <div className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full border text-sm font-medium ${cfg.bg} ${cfg.cor}`}>
            <StatusIcon className="h-3.5 w-3.5" />
            {cfg.label}
          </div>
        </div>

        {pedidoAberto.bloqueado_expedicao && (
          <div className="flex items-center gap-2 p-3 rounded-lg bg-red-50 border border-red-200 text-red-700 text-sm">
            <AlertTriangle className="h-4 w-4 flex-shrink-0" />
            <span><strong>Bloqueado:</strong> {pedidoAberto.motivo_bloqueio || 'Expedição bloqueada'}</span>
          </div>
        )}

        {/* Cliente */}
        <div className="rounded-xl border bg-card p-4 space-y-3">
          <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Cliente</h3>
          <div className="space-y-1">
            <p className="font-semibold">{pedidoAberto.cliente_nome}</p>
            <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-sm text-muted-foreground">
              {pedidoAberto.cliente_celular && <p>{pedidoAberto.cliente_celular}</p>}
              {pedidoAberto.cliente_email && <p>{pedidoAberto.cliente_email}</p>}
              {pedidoAberto.cliente_cpf && <p>CPF: {pedidoAberto.cliente_cpf}</p>}
            </div>
            {pedidoAberto.cliente_endereco && (
              <p className="text-sm text-muted-foreground">
                {[pedidoAberto.cliente_endereco, pedidoAberto.cliente_numero, pedidoAberto.cliente_complemento, pedidoAberto.cliente_bairro, pedidoAberto.cliente_cidade, pedidoAberto.cliente_estado, pedidoAberto.cliente_cep].filter(Boolean).join(', ')}
              </p>
            )}
          </div>
        </div>

        {/* Detalhes do pedido */}
        <div className="rounded-xl border bg-card p-4 space-y-3">
          <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Pedido</h3>
          <div className="grid grid-cols-3 gap-3">
            <div className="text-center p-3 rounded-lg bg-muted">
              <p className="text-lg font-bold">{formatarValor(pedidoAberto.valor_total)}</p>
              <p className="text-[10px] text-muted-foreground">Valor</p>
            </div>
            <div className="text-center p-3 rounded-lg bg-muted">
              <p className="text-lg font-bold">{pedidoAberto.pedido_itens?.length || 0}</p>
              <p className="text-[10px] text-muted-foreground">Itens</p>
            </div>
            <div className="text-center p-3 rounded-lg bg-muted">
              <p className="text-lg font-bold">{formatarData(pedidoAberto.prazo_entrega)}</p>
              <p className="text-[10px] text-muted-foreground">Prazo</p>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-2 text-sm">
            <div><span className="text-muted-foreground">Canal:</span> {pedidoAberto.canal || '-'}</div>
            <div><span className="text-muted-foreground">Pagamento:</span> {pedidoAberto.forma_pagamento || '-'}</div>
            {pedidoAberto.embalagem && <div><span className="text-muted-foreground">Embalagem:</span> {pedidoAberto.embalagem}</div>}
            {pedidoAberto.cupom && <div><span className="text-muted-foreground">Cupom:</span> {pedidoAberto.cupom}</div>}
            {pedidoAberto.bling_pedido_id && <div><span className="text-muted-foreground">Bling:</span> #{pedidoAberto.bling_pedido_id}</div>}
          </div>
          {pedidoAberto.observacao && (
            <div className="p-3 rounded-lg bg-amber-50 border border-amber-100 text-sm">
              <p className="text-amber-800">{pedidoAberto.observacao}</p>
            </div>
          )}
        </div>

        {/* Itens */}
        {pedidoAberto.pedido_itens && pedidoAberto.pedido_itens.length > 0 && (
          <div className="rounded-xl border bg-card p-4 space-y-3">
            <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Lâminas</h3>
            <div className="space-y-2">
              {pedidoAberto.pedido_itens.map((item, idx) => (
                <div key={item.id} className="p-3 rounded-lg bg-muted space-y-1">
                  <div className="flex items-center justify-between">
                    <p className="font-semibold text-sm">
                      {item.modelo}
                      {item.brute_forge && <span className="ml-1 text-xs text-orange-600">BF</span>}
                      {item.quantidade > 1 && <span className="ml-1 text-xs text-muted-foreground">x{item.quantidade}</span>}
                    </p>
                    {item.preco_unitario > 0 && (
                      <span className="text-sm font-medium">{formatarValor(item.preco_unitario)}</span>
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {[
                      item.aco && `Aço: ${item.aco}`,
                      item.acabamento && `Acab: ${item.acabamento}`,
                      item.empunhadura && `Emp: ${item.empunhadura}${item.dragon_scale ? ' + DS' : ''}`,
                      item.bainha && `Bainha: ${item.bainha}`,
                      item.cor_bainha && `Cor: ${item.cor_bainha}`,
                    ].filter(Boolean).join(' • ')}
                  </p>
                  {item.texto_laser && item.texto_laser !== '-' && (
                    <p className="text-xs text-blue-600">Laser: {item.texto_laser}</p>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Ações */}
        <div className="space-y-2">
          {pedidoAberto.status === 'aguardando_triagem' && (
            <Button className="w-full bg-green-600 hover:bg-green-700" onClick={() => atualizarStatus(pedidoAberto.id, 'aprovado')}>
              <CheckCircle2 className="h-4 w-4 mr-2" />
              Aprovar Pedido
            </Button>
          )}
          {pedidoAberto.status === 'aprovado' && (
            <Button className="w-full bg-blue-600 hover:bg-blue-700" onClick={() => atualizarStatus(pedidoAberto.id, 'em_producao')}>
              <Package className="h-4 w-4 mr-2" />
              Enviar para Produção
            </Button>
          )}
          {pedidoAberto.status === 'em_producao' && (
            <Button className="w-full bg-purple-600 hover:bg-purple-700" onClick={() => atualizarStatus(pedidoAberto.id, 'pronto')}>
              <Box className="h-4 w-4 mr-2" />
              Marcar como Pronto
            </Button>
          )}
          {pedidoAberto.status === 'pronto' && (
            <Button className="w-full bg-orange-600 hover:bg-orange-700" onClick={() => atualizarStatus(pedidoAberto.id, 'em_expedicao')}>
              <Truck className="h-4 w-4 mr-2" />
              Enviar para Expedição
            </Button>
          )}
        </div>
      </div>
    );
  }

  // Lista de pedidos
  return (
    <div className="max-w-3xl mx-auto py-6 px-4 space-y-5">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold">Pedidos</h1>
        <Button variant="ghost" size="sm" onClick={carregarPedidos} className="h-8 w-8 p-0">
          <RefreshCw className="h-4 w-4" />
        </Button>
      </div>

      {/* Contadores por status */}
      <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
        {Object.entries(STATUS_CONFIG).map(([key, cfg]) => {
          const count = contadores[key] || 0;
          const StatusIcon = cfg.icon;
          return (
            <button
              key={key}
              onClick={() => setFiltro(filtro === key ? 'todos' : key)}
              className={`p-2.5 rounded-xl border text-center transition-all ${
                filtro === key ? `${cfg.bg} ${cfg.cor} ring-2 ring-offset-1` : count > 0 ? 'bg-card hover:bg-muted' : 'bg-card opacity-50'
              }`}
            >
              <StatusIcon className={`h-4 w-4 mx-auto mb-1 ${filtro === key ? cfg.cor : 'text-muted-foreground'}`} />
              <p className="text-lg font-bold">{count}</p>
              <p className="text-[9px] leading-tight text-muted-foreground">{cfg.label}</p>
            </button>
          );
        })}
      </div>

      {filtro !== 'todos' && (
        <button onClick={() => setFiltro('todos')} className="text-xs text-muted-foreground hover:text-foreground flex items-center gap-1">
          <X className="h-3 w-3" /> Limpar filtro
        </button>
      )}

      {/* Cards dos pedidos */}
      {pedidosFiltrados.length === 0 ? (
        <div className="py-16 text-center text-muted-foreground text-sm">
          Nenhum pedido encontrado.
        </div>
      ) : (
        <div className="space-y-2">
          {pedidosFiltrados.map(pedido => {
            const cfg = STATUS_CONFIG[pedido.status] || STATUS_CONFIG['aguardando_triagem'];
            return (
              <button
                key={pedido.id}
                onClick={() => setSelecionado(pedido.id)}
                className="w-full text-left p-4 rounded-xl border bg-card hover:shadow-md transition-all flex items-center gap-3"
              >
                <div className={`w-1 h-12 rounded-full flex-shrink-0 ${cfg.cor.replace('text-', 'bg-')}`} />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="font-semibold text-sm truncate">{pedido.cliente_nome}</p>
                    {pedido.bloqueado_expedicao && <AlertTriangle className="h-3.5 w-3.5 text-red-500 flex-shrink-0" />}
                  </div>
                  <p className="text-xs text-muted-foreground truncate">
                    {pedido.numero_pedido} • {pedido.pedido_itens?.length || 0} item(ns) • {pedido.canal || '-'}
                  </p>
                </div>
                <div className="text-right flex-shrink-0">
                  <p className="font-semibold text-sm">{formatarValor(pedido.valor_total)}</p>
                  <p className="text-[10px] text-muted-foreground">{formatarData(pedido.created_at)}</p>
                </div>
                <ChevronRight className="h-4 w-4 text-muted-foreground flex-shrink-0" />
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
