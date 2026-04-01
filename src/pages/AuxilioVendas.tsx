import { useState, useEffect, useMemo } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { toast } from 'sonner';
import {
  Users, Search, Loader2, RefreshCw, ShoppingCart, DollarSign,
  TrendingUp, TrendingDown, Clock, AlertTriangle, UserCheck,
  Target, Filter, ArrowUpDown, Calendar, ChevronRight, Phone,
  Mail, BarChart3, Zap, UserX, Repeat
} from 'lucide-react';

interface ClienteEnriquecido {
  id: number;
  nome: string;
  email: string;
  telefone: string;
  celular: string;
  tipo: string;
  fantasia: string;
  numeroDocumento: string;
  endereco: any;
  totalPedidos: number;
  totalGasto: number;
  ultimaCompra: Date | null;
  pedidos: any[];
  diasSemCompra: number;
  ticketMedio: number;
}

type FiltroTipo = 'todos' | 'alto_valor' | 'recorrentes' | 'inativos' | 'novos' | 'risco';
type OrdenacaoTipo = 'nome' | 'total_gasto' | 'ultima_compra' | 'total_pedidos';

export default function AuxilioVendas() {
  const [contatos, setContatos] = useState<any[]>([]);
  const [pedidosPorContato, setPedidosPorContato] = useState<Record<string, any[]>>({});
  const [loading, setLoading] = useState(false);
  const [loadingPedidos, setLoadingPedidos] = useState(false);
  const [searchText, setSearchText] = useState('');
  const [filtroAtivo, setFiltroAtivo] = useState<FiltroTipo>('todos');
  const [ordenacao, setOrdenacao] = useState<OrdenacaoTipo>('total_gasto');
  const [selectedCliente, setSelectedCliente] = useState<ClienteEnriquecido | null>(null);
  const [connected, setConnected] = useState(false);
  const [checkingConnection, setCheckingConnection] = useState(true);
  const [diasInatividadeLimite, setDiasInatividadeLimite] = useState(90);

  useEffect(() => {
    checkConnection();
  }, []);

  const checkConnection = async () => {
    const { data } = await supabase.from('bling_tokens').select('expires_at').order('created_at', { ascending: false }).limit(1);
    if (data?.length) {
      const expiresAt = new Date(data[0].expires_at);
      const isConnected = expiresAt > new Date();
      setConnected(isConnected);
      if (isConnected) loadAllData();
    }
    setCheckingConnection(false);
  };

  const fetchBlingData = async (endpoint: string, params: Record<string, string> = {}, paginate = false) => {
    const projectId = import.meta.env.VITE_SUPABASE_PROJECT_ID;
    const res = await fetch(`https://${projectId}.supabase.co/functions/v1/bling-api`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ endpoint, params, paginate }),
    });
    return res.json();
  };

  const loadAllData = async () => {
    setLoading(true);
    try {
      const contatosData = await fetchBlingData('contatos', {}, true);
      const contatosList = contatosData?.data || [];
      setContatos(contatosList);

      setLoadingPedidos(true);
      const pedidosData = await fetchBlingData('pedidos/vendas', {}, true);
      const pedidosList = pedidosData?.data || [];

      const pedidosMap: Record<string, any[]> = {};
      for (const pedido of pedidosList) {
        const contatoId = String(pedido.contato?.id || '');
        if (contatoId) {
          if (!pedidosMap[contatoId]) pedidosMap[contatoId] = [];
          pedidosMap[contatoId].push(pedido);
        }
      }
      setPedidosPorContato(pedidosMap);
      setLoadingPedidos(false);
    } catch (err: any) {
      toast.error('Erro ao carregar dados: ' + err.message);
    }
    setLoading(false);
  };

  const clientesEnriquecidos: ClienteEnriquecido[] = useMemo(() => {
    return contatos.map((c) => {
      const pedidos = pedidosPorContato[String(c.id)] || [];
      const totalGasto = pedidos.reduce((sum: number, p: any) => sum + (Number(p.total) || 0), 0);
      const datas = pedidos.map((p: any) => p.data ? new Date(p.data) : null).filter(Boolean) as Date[];
      const ultimaCompra = datas.length > 0 ? new Date(Math.max(...datas.map(d => d.getTime()))) : null;
      const diasSemCompra = ultimaCompra ? Math.floor((Date.now() - ultimaCompra.getTime()) / (1000 * 60 * 60 * 24)) : 9999;
      const ticketMedio = pedidos.length > 0 ? totalGasto / pedidos.length : 0;

      return {
        id: c.id,
        nome: c.nome || 'Sem nome',
        email: c.email || '',
        telefone: c.telefone || '',
        celular: c.celular || '',
        tipo: c.tipo || '',
        fantasia: c.fantasia || '',
        numeroDocumento: c.numeroDocumento || '',
        endereco: c.endereco || {},
        totalPedidos: pedidos.length,
        totalGasto,
        ultimaCompra,
        pedidos,
        diasSemCompra,
        ticketMedio,
      };
    });
  }, [contatos, pedidosPorContato]);

  const filteredClientes = useMemo(() => {
    let list = [...clientesEnriquecidos];

    // Text search
    if (searchText) {
      const term = searchText.toLowerCase();
      list = list.filter(c =>
        c.nome.toLowerCase().includes(term) ||
        c.email.toLowerCase().includes(term) ||
        c.telefone.includes(term) ||
        c.fantasia.toLowerCase().includes(term)
      );
    }

    // Filter
    switch (filtroAtivo) {
      case 'alto_valor':
        list = list.filter(c => c.totalGasto > 0).sort((a, b) => b.totalGasto - a.totalGasto);
        break;
      case 'recorrentes':
        list = list.filter(c => c.totalPedidos >= 2);
        break;
      case 'inativos':
        list = list.filter(c => c.totalPedidos > 0 && c.diasSemCompra >= diasInatividadeLimite);
        break;
      case 'novos':
        list = list.filter(c => c.totalPedidos <= 1);
        break;
      case 'risco':
        list = list.filter(c => c.totalPedidos >= 2 && c.diasSemCompra >= 60);
        break;
    }

    // Sort
    switch (ordenacao) {
      case 'total_gasto':
        list.sort((a, b) => b.totalGasto - a.totalGasto);
        break;
      case 'ultima_compra':
        list.sort((a, b) => (b.ultimaCompra?.getTime() || 0) - (a.ultimaCompra?.getTime() || 0));
        break;
      case 'total_pedidos':
        list.sort((a, b) => b.totalPedidos - a.totalPedidos);
        break;
      case 'nome':
        list.sort((a, b) => a.nome.localeCompare(b.nome));
        break;
    }

    return list;
  }, [clientesEnriquecidos, searchText, filtroAtivo, ordenacao, diasInatividadeLimite]);

  // KPIs
  const kpis = useMemo(() => {
    const comPedidos = clientesEnriquecidos.filter(c => c.totalPedidos > 0);
    const recorrentes = clientesEnriquecidos.filter(c => c.totalPedidos >= 2);
    const inativos = clientesEnriquecidos.filter(c => c.totalPedidos > 0 && c.diasSemCompra >= diasInatividadeLimite);
    const totalReceita = comPedidos.reduce((s, c) => s + c.totalGasto, 0);
    const ticketMedioGeral = comPedidos.length > 0 ? totalReceita / comPedidos.reduce((s, c) => s + c.totalPedidos, 0) : 0;

    return {
      totalClientes: contatos.length,
      clientesAtivos: comPedidos.length - inativos.length,
      recorrentes: recorrentes.length,
      inativos: inativos.length,
      totalReceita,
      ticketMedioGeral,
    };
  }, [clientesEnriquecidos, contatos.length, diasInatividadeLimite]);

  const getStatusBadge = (cliente: ClienteEnriquecido) => {
    if (cliente.totalPedidos === 0) return <Badge variant="secondary" className="text-xs">Novo</Badge>;
    if (cliente.diasSemCompra >= diasInatividadeLimite) return <Badge variant="destructive" className="text-xs">Inativo</Badge>;
    if (cliente.totalPedidos >= 2 && cliente.diasSemCompra >= 60) return <Badge className="bg-amber-500 text-white text-xs">Risco</Badge>;
    if (cliente.totalPedidos >= 3) return <Badge className="bg-green-600 text-white text-xs">Fiel</Badge>;
    return <Badge variant="outline" className="text-xs">Ativo</Badge>;
  };

  const getDicaRepescagem = (cliente: ClienteEnriquecido): string => {
    if (cliente.diasSemCompra >= 180) return '⚠️ Cliente muito ausente. Ofereça desconto exclusivo ou novidade.';
    if (cliente.diasSemCompra >= 90) return '💡 Período longo sem compra. Envie mensagem personalizada.';
    if (cliente.diasSemCompra >= 60 && cliente.totalPedidos >= 2) return '🔄 Cliente recorrente esfriando. Hora de reativar com novidades.';
    if (cliente.totalPedidos === 1) return '🎯 Primeira compra! Fidelizar com acompanhamento pós-venda.';
    if (cliente.totalPedidos >= 3) return '⭐ Cliente fiel. Mantenha relacionamento e ofereça lançamentos.';
    return '📋 Acompanhe o cliente para identificar oportunidades.';
  };

  const filtros: { key: FiltroTipo; label: string; icon: React.ReactNode; desc: string }[] = [
    { key: 'todos', label: 'Todos', icon: <Users className="h-4 w-4" />, desc: 'Todos os clientes' },
    { key: 'alto_valor', label: 'Alto Valor', icon: <DollarSign className="h-4 w-4" />, desc: 'Maior gasto total' },
    { key: 'recorrentes', label: 'Recorrentes', icon: <Repeat className="h-4 w-4" />, desc: '2+ pedidos' },
    { key: 'inativos', label: 'Inativos', icon: <UserX className="h-4 w-4" />, desc: `Sem compra há ${diasInatividadeLimite}+ dias` },
    { key: 'novos', label: 'Novos', icon: <Zap className="h-4 w-4" />, desc: '0-1 pedidos' },
    { key: 'risco', label: 'Em Risco', icon: <AlertTriangle className="h-4 w-4" />, desc: 'Recorrentes esfriando' },
  ];

  if (checkingConnection) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!connected) {
    return (
      <div className="container mx-auto py-8 px-4">
        <div className="text-center max-w-md mx-auto space-y-4">
          <Target className="h-16 w-16 text-muted-foreground mx-auto" />
          <h1 className="text-2xl font-bold">Auxílio de Vendas</h1>
          <p className="text-muted-foreground">
            Conecte sua conta do Bling para utilizar as ferramentas de análise e repescagem de clientes.
          </p>
          <Button variant="outline" onClick={() => window.location.href = '/bling'}>
            Ir para Integração Bling
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-4 px-3 md:py-6 md:px-4 max-w-6xl">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-6">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-foreground flex items-center gap-2">
            <Target className="h-6 w-6 text-primary" />
            Auxílio de Vendas
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Análise de clientes e estratégias de repescagem
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={loadAllData} disabled={loading} className="self-start">
          <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
          Atualizar Dados
        </Button>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 mb-6">
        <Card className="bg-card">
          <CardContent className="p-3 text-center">
            <Users className="h-5 w-5 text-primary mx-auto mb-1" />
            <p className="text-xs text-muted-foreground">Total</p>
            <p className="text-lg font-bold">{loading ? '...' : kpis.totalClientes}</p>
          </CardContent>
        </Card>
        <Card className="bg-card">
          <CardContent className="p-3 text-center">
            <UserCheck className="h-5 w-5 text-green-600 mx-auto mb-1" />
            <p className="text-xs text-muted-foreground">Ativos</p>
            <p className="text-lg font-bold">{loading ? '...' : kpis.clientesAtivos}</p>
          </CardContent>
        </Card>
        <Card className="bg-card">
          <CardContent className="p-3 text-center">
            <Repeat className="h-5 w-5 text-blue-600 mx-auto mb-1" />
            <p className="text-xs text-muted-foreground">Recorrentes</p>
            <p className="text-lg font-bold">{loading ? '...' : kpis.recorrentes}</p>
          </CardContent>
        </Card>
        <Card className="bg-card">
          <CardContent className="p-3 text-center">
            <UserX className="h-5 w-5 text-red-500 mx-auto mb-1" />
            <p className="text-xs text-muted-foreground">Inativos</p>
            <p className="text-lg font-bold">{loading ? '...' : kpis.inativos}</p>
          </CardContent>
        </Card>
        <Card className="bg-card">
          <CardContent className="p-3 text-center">
            <DollarSign className="h-5 w-5 text-emerald-600 mx-auto mb-1" />
            <p className="text-xs text-muted-foreground">Receita Total</p>
            <p className="text-sm font-bold truncate">{loading ? '...' : `R$ ${kpis.totalReceita.toFixed(0)}`}</p>
          </CardContent>
        </Card>
        <Card className="bg-card">
          <CardContent className="p-3 text-center">
            <BarChart3 className="h-5 w-5 text-purple-600 mx-auto mb-1" />
            <p className="text-xs text-muted-foreground">Ticket Médio</p>
            <p className="text-sm font-bold truncate">{loading ? '...' : `R$ ${kpis.ticketMedioGeral.toFixed(0)}`}</p>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <div className="space-y-4 mb-6">
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Buscar cliente por nome, email, telefone..."
              value={searchText}
              onChange={(e) => setSearchText(e.target.value)}
              className="pl-10"
            />
          </div>
          <Select value={ordenacao} onValueChange={(v) => setOrdenacao(v as OrdenacaoTipo)}>
            <SelectTrigger className="w-full sm:w-48">
              <ArrowUpDown className="h-4 w-4 mr-2" />
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="total_gasto">Maior Gasto</SelectItem>
              <SelectItem value="ultima_compra">Última Compra</SelectItem>
              <SelectItem value="total_pedidos">Mais Pedidos</SelectItem>
              <SelectItem value="nome">Nome A-Z</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <ScrollArea className="w-full whitespace-nowrap">
          <div className="flex gap-2 pb-2">
            {filtros.map((f) => (
              <Button
                key={f.key}
                variant={filtroAtivo === f.key ? 'default' : 'outline'}
                size="sm"
                onClick={() => setFiltroAtivo(f.key)}
                className="gap-1.5 shrink-0"
              >
                {f.icon}
                {f.label}
              </Button>
            ))}
          </div>
        </ScrollArea>

        {filtroAtivo === 'inativos' && (
          <div className="flex items-center gap-3 text-sm">
            <span className="text-muted-foreground whitespace-nowrap">Dias sem compra:</span>
            <Select value={String(diasInatividadeLimite)} onValueChange={(v) => setDiasInatividadeLimite(Number(v))}>
              <SelectTrigger className="w-28">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="30">30 dias</SelectItem>
                <SelectItem value="60">60 dias</SelectItem>
                <SelectItem value="90">90 dias</SelectItem>
                <SelectItem value="120">120 dias</SelectItem>
                <SelectItem value="180">180 dias</SelectItem>
                <SelectItem value="365">1 ano</SelectItem>
              </SelectContent>
            </Select>
          </div>
        )}
      </div>

      {/* Results info */}
      <div className="flex items-center justify-between mb-4">
        <p className="text-sm text-muted-foreground">
          {filteredClientes.length} cliente{filteredClientes.length !== 1 ? 's' : ''} encontrado{filteredClientes.length !== 1 ? 's' : ''}
        </p>
        {loadingPedidos && (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Loader2 className="h-3 w-3 animate-spin" />
            Analisando pedidos...
          </div>
        )}
      </div>

      {/* Client List */}
      {loading && !contatos.length ? (
        <div className="flex justify-center py-16">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      ) : filteredClientes.length === 0 ? (
        <div className="text-center py-16 text-muted-foreground">
          <Filter className="h-12 w-12 mx-auto mb-3 opacity-40" />
          <p>Nenhum cliente encontrado com esse filtro.</p>
        </div>
      ) : (
        <div className="space-y-2">
          {filteredClientes.map((cliente) => (
            <Card
              key={cliente.id}
              className="cursor-pointer hover:shadow-md transition-all hover:border-primary/30 group"
              onClick={() => setSelectedCliente(cliente)}
            >
              <CardContent className="p-3 sm:p-4">
                <div className="flex items-center gap-3">
                  {/* Avatar / Icon */}
                  <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                    <Users className="h-5 w-5 text-primary" />
                  </div>

                  {/* Name + info */}
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h3 className="font-semibold text-sm text-foreground truncate group-hover:text-primary transition-colors">
                        {cliente.nome}
                      </h3>
                      {getStatusBadge(cliente)}
                    </div>
                    <div className="flex items-center gap-3 mt-0.5 text-xs text-muted-foreground flex-wrap">
                      {cliente.telefone && (
                        <span className="flex items-center gap-1">
                          <Phone className="h-3 w-3" /> {cliente.telefone}
                        </span>
                      )}
                      {cliente.ultimaCompra && (
                        <span className="flex items-center gap-1">
                          <Calendar className="h-3 w-3" /> {cliente.ultimaCompra.toLocaleDateString('pt-BR')}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Metrics */}
                  <div className="hidden sm:flex items-center gap-4 text-sm shrink-0">
                    <div className="text-center">
                      <p className="font-bold text-foreground">{cliente.totalPedidos}</p>
                      <p className="text-xs text-muted-foreground">pedidos</p>
                    </div>
                    <div className="text-center">
                      <p className="font-bold text-foreground">R$ {cliente.totalGasto.toFixed(0)}</p>
                      <p className="text-xs text-muted-foreground">gasto</p>
                    </div>
                    <div className="text-center">
                      <p className="font-bold text-foreground">R$ {cliente.ticketMedio.toFixed(0)}</p>
                      <p className="text-xs text-muted-foreground">ticket</p>
                    </div>
                  </div>

                  <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0" />
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Client Detail Dialog */}
      <Dialog open={!!selectedCliente} onOpenChange={(open) => !open && setSelectedCliente(null)}>
        <DialogContent className="max-w-lg max-h-[85vh] p-0 gap-0">
          <DialogHeader className="p-5 pb-3">
            <DialogTitle className="text-lg flex items-center gap-2">
              <Users className="h-5 w-5 text-primary" />
              {selectedCliente?.nome}
            </DialogTitle>
          </DialogHeader>
          <ScrollArea className="max-h-[calc(85vh-70px)]">
            {selectedCliente && (
              <div className="px-5 pb-5 space-y-4">
                {/* Contact info */}
                <div className="flex flex-wrap gap-3 text-sm">
                  {selectedCliente.telefone && (
                    <span className="flex items-center gap-1.5 text-muted-foreground">
                      <Phone className="h-3.5 w-3.5" /> {selectedCliente.telefone}
                    </span>
                  )}
                  {selectedCliente.email && (
                    <span className="flex items-center gap-1.5 text-muted-foreground">
                      <Mail className="h-3.5 w-3.5" /> {selectedCliente.email}
                    </span>
                  )}
                </div>

                {/* Status & tip */}
                <Card className="bg-muted/50 border-muted">
                  <CardContent className="p-3">
                    <div className="flex items-start gap-2">
                      <Target className="h-4 w-4 text-primary mt-0.5 shrink-0" />
                      <div>
                        <p className="text-xs font-medium text-foreground mb-0.5">Dica de Repescagem</p>
                        <p className="text-sm text-muted-foreground">{getDicaRepescagem(selectedCliente)}</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Metrics */}
                <div className="grid grid-cols-2 gap-3">
                  <Card>
                    <CardContent className="p-3 flex items-center gap-2">
                      <ShoppingCart className="h-6 w-6 text-primary shrink-0" />
                      <div>
                        <p className="text-xs text-muted-foreground">Pedidos</p>
                        <p className="text-lg font-bold">{selectedCliente.totalPedidos}</p>
                      </div>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardContent className="p-3 flex items-center gap-2">
                      <DollarSign className="h-6 w-6 text-green-600 shrink-0" />
                      <div>
                        <p className="text-xs text-muted-foreground">Total Gasto</p>
                        <p className="text-lg font-bold truncate">R$ {selectedCliente.totalGasto.toFixed(2)}</p>
                      </div>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardContent className="p-3 flex items-center gap-2">
                      <BarChart3 className="h-6 w-6 text-purple-600 shrink-0" />
                      <div>
                        <p className="text-xs text-muted-foreground">Ticket Médio</p>
                        <p className="text-lg font-bold truncate">R$ {selectedCliente.ticketMedio.toFixed(2)}</p>
                      </div>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardContent className="p-3 flex items-center gap-2">
                      <Clock className="h-6 w-6 text-amber-600 shrink-0" />
                      <div>
                        <p className="text-xs text-muted-foreground">Dias sem compra</p>
                        <p className="text-lg font-bold">{selectedCliente.diasSemCompra === 9999 ? 'N/A' : selectedCliente.diasSemCompra}</p>
                      </div>
                    </CardContent>
                  </Card>
                </div>

                <Separator />

                {/* Orders */}
                <div>
                  <h3 className="font-semibold text-sm mb-2">Histórico de Pedidos</h3>
                  {selectedCliente.pedidos.length > 0 ? (
                    <div className="rounded-lg border overflow-hidden">
                      <Table>
                        <TableHeader>
                          <TableRow className="bg-muted/50">
                            <TableHead className="text-xs">Nº</TableHead>
                            <TableHead className="text-xs">Data</TableHead>
                            <TableHead className="text-xs text-right">Total</TableHead>
                            <TableHead className="text-xs">Situação</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {selectedCliente.pedidos.map((p: any) => (
                            <TableRow key={p.id}>
                              <TableCell className="text-sm font-medium">{p.numero || p.id}</TableCell>
                              <TableCell className="text-sm">{p.data ? new Date(p.data).toLocaleDateString('pt-BR') : '-'}</TableCell>
                              <TableCell className="text-sm text-right font-medium">
                                {p.total ? `R$ ${Number(p.total).toFixed(2)}` : '-'}
                              </TableCell>
                              <TableCell>
                                <Badge variant="outline" className="text-xs">{p.situacao?.valor || '-'}</Badge>
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                  ) : (
                    <p className="text-center text-muted-foreground py-6 text-sm">Nenhum pedido encontrado.</p>
                  )}
                </div>
              </div>
            )}
          </ScrollArea>
        </DialogContent>
      </Dialog>
    </div>
  );
}
