import { useState, useEffect, useMemo } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent } from '@/components/ui/card';
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
  UserCheck, Target, Filter, ArrowUpDown, Calendar, ChevronRight, Phone,
  Mail, BarChart3, Zap, UserX, Repeat, Clock, AlertTriangle
} from 'lucide-react';

interface ClienteEnriquecido {
  id: string;
  bling_id: number;
  nome: string;
  email: string;
  telefone: string;
  celular: string;
  tipo: string;
  fantasia: string;
  numero_documento: string;
  totalPedidos: number;
  totalGasto: number;
  ultimaCompra: Date | null;
  diasSemCompra: number;
  ticketMedio: number;
  pedidos: any[];
}

type FiltroTipo = 'todos' | 'alto_valor' | 'recorrentes' | 'inativos' | 'novos' | 'risco';
type OrdenacaoTipo = 'nome' | 'total_gasto' | 'ultima_compra' | 'total_pedidos';

export default function AuxilioVendas() {
  const [contatos, setContatos] = useState<any[]>([]);
  const [pedidos, setPedidos] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [searchText, setSearchText] = useState('');
  const [filtroAtivo, setFiltroAtivo] = useState<FiltroTipo>('todos');
  const [ordenacao, setOrdenacao] = useState<OrdenacaoTipo>('total_gasto');
  const [selectedCliente, setSelectedCliente] = useState<ClienteEnriquecido | null>(null);
  const [diasInatividadeLimite, setDiasInatividadeLimite] = useState(90);
  const [lastSync, setLastSync] = useState<string | null>(null);

  useEffect(() => {
    loadFromCache();
  }, []);

  const loadFromCache = async () => {
    setLoading(true);
    const [contatosRes, pedidosRes, syncRes] = await Promise.all([
      supabase.from('bling_contatos').select('*').order('nome'),
      supabase.from('bling_pedidos').select('*').order('data', { ascending: false }),
      supabase.from('bling_sync_log').select('*').eq('status', 'completed').order('finished_at', { ascending: false }).limit(1),
    ]);
    setContatos(contatosRes.data || []);
    setPedidos(pedidosRes.data || []);
    if (syncRes.data?.[0]?.finished_at) {
      setLastSync(new Date(syncRes.data[0].finished_at).toLocaleString('pt-BR'));
    }
    setLoading(false);
  };

  const handleSync = async () => {
    setSyncing(true);
    try {
      const projectId = import.meta.env.VITE_SUPABASE_PROJECT_ID;
      const res = await fetch(`https://${projectId}.supabase.co/functions/v1/bling-sync`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type: 'full' }),
      });
      const result = await res.json();
      if (result.error) throw new Error(result.error);
      toast.success(`Sincronização concluída! ${result.total} registros.`);
      await loadFromCache();
    } catch (err: any) {
      toast.error('Erro: ' + err.message);
    }
    setSyncing(false);
  };

  const pedidosPorContato = useMemo(() => {
    const map: Record<number, any[]> = {};
    for (const p of pedidos) {
      const cid = p.contato_bling_id;
      if (cid) {
        if (!map[cid]) map[cid] = [];
        map[cid].push(p);
      }
    }
    return map;
  }, [pedidos]);

  const clientesEnriquecidos: ClienteEnriquecido[] = useMemo(() => {
    return contatos.map((c) => {
      const peds = pedidosPorContato[c.bling_id] || [];
      const totalGasto = peds.reduce((sum: number, p: any) => sum + (Number(p.total) || 0), 0);
      const datas = peds.map((p: any) => p.data ? new Date(p.data) : null).filter(Boolean) as Date[];
      const ultimaCompra = datas.length > 0 ? new Date(Math.max(...datas.map(d => d.getTime()))) : null;
      const diasSemCompra = ultimaCompra ? Math.floor((Date.now() - ultimaCompra.getTime()) / (1000 * 60 * 60 * 24)) : 9999;

      return {
        id: c.id,
        bling_id: c.bling_id,
        nome: c.nome || 'Sem nome',
        email: c.email || '',
        telefone: c.telefone || '',
        celular: c.celular || '',
        tipo: c.tipo || '',
        fantasia: c.fantasia || '',
        numero_documento: c.numero_documento || '',
        totalPedidos: peds.length,
        totalGasto,
        ultimaCompra,
        diasSemCompra,
        ticketMedio: peds.length > 0 ? totalGasto / peds.length : 0,
        pedidos: peds,
      };
    });
  }, [contatos, pedidosPorContato]);

  const filteredClientes = useMemo(() => {
    let list = [...clientesEnriquecidos];

    if (searchText) {
      const term = searchText.toLowerCase();
      list = list.filter(c =>
        c.nome.toLowerCase().includes(term) ||
        c.email.toLowerCase().includes(term) ||
        c.telefone.includes(term) ||
        c.fantasia.toLowerCase().includes(term)
      );
    }

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

    switch (ordenacao) {
      case 'total_gasto': list.sort((a, b) => b.totalGasto - a.totalGasto); break;
      case 'ultima_compra': list.sort((a, b) => (b.ultimaCompra?.getTime() || 0) - (a.ultimaCompra?.getTime() || 0)); break;
      case 'total_pedidos': list.sort((a, b) => b.totalPedidos - a.totalPedidos); break;
      case 'nome': list.sort((a, b) => a.nome.localeCompare(b.nome)); break;
    }

    return list;
  }, [clientesEnriquecidos, searchText, filtroAtivo, ordenacao, diasInatividadeLimite]);

  const kpis = useMemo(() => {
    const comPedidos = clientesEnriquecidos.filter(c => c.totalPedidos > 0);
    const recorrentes = clientesEnriquecidos.filter(c => c.totalPedidos >= 2);
    const inativos = clientesEnriquecidos.filter(c => c.totalPedidos > 0 && c.diasSemCompra >= diasInatividadeLimite);
    const totalReceita = comPedidos.reduce((s, c) => s + c.totalGasto, 0);
    const totalPedidosGeral = comPedidos.reduce((s, c) => s + c.totalPedidos, 0);

    return {
      totalClientes: contatos.length,
      clientesAtivos: comPedidos.length - inativos.length,
      recorrentes: recorrentes.length,
      inativos: inativos.length,
      totalReceita,
      ticketMedioGeral: totalPedidosGeral > 0 ? totalReceita / totalPedidosGeral : 0,
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

  const filtros: { key: FiltroTipo; label: string; icon: React.ReactNode }[] = [
    { key: 'todos', label: 'Todos', icon: <Users className="h-4 w-4" /> },
    { key: 'alto_valor', label: 'Alto Valor', icon: <DollarSign className="h-4 w-4" /> },
    { key: 'recorrentes', label: 'Recorrentes', icon: <Repeat className="h-4 w-4" /> },
    { key: 'inativos', label: 'Inativos', icon: <UserX className="h-4 w-4" /> },
    { key: 'novos', label: 'Novos', icon: <Zap className="h-4 w-4" /> },
    { key: 'risco', label: 'Em Risco', icon: <AlertTriangle className="h-4 w-4" /> },
  ];

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
            Análise de clientes • {lastSync ? `Sync: ${lastSync}` : 'Nunca sincronizado'}
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={handleSync} disabled={syncing} className="self-start">
          <RefreshCw className={`h-4 w-4 mr-2 ${syncing ? 'animate-spin' : ''}`} />
          {syncing ? 'Sincronizando...' : 'Sincronizar'}
        </Button>
      </div>

      {/* Empty state */}
      {!loading && contatos.length === 0 && (
        <div className="text-center py-16 space-y-4">
          <Target className="h-16 w-16 text-muted-foreground mx-auto opacity-40" />
          <h2 className="text-lg font-semibold">Nenhum dado disponível</h2>
          <p className="text-muted-foreground text-sm">Sincronize os dados do Bling para começar.</p>
          <Button onClick={handleSync} disabled={syncing}>
            <RefreshCw className={`h-4 w-4 mr-2 ${syncing ? 'animate-spin' : ''}`} />
            Sincronizar Agora
          </Button>
        </div>
      )}

      {loading && (
        <div className="flex justify-center py-16">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      )}

      {!loading && contatos.length > 0 && (
        <>
          {/* KPIs */}
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 mb-6">
            <Card><CardContent className="p-3 text-center">
              <Users className="h-5 w-5 text-primary mx-auto mb-1" />
              <p className="text-xs text-muted-foreground">Total</p>
              <p className="text-lg font-bold">{kpis.totalClientes}</p>
            </CardContent></Card>
            <Card><CardContent className="p-3 text-center">
              <UserCheck className="h-5 w-5 text-green-600 mx-auto mb-1" />
              <p className="text-xs text-muted-foreground">Ativos</p>
              <p className="text-lg font-bold">{kpis.clientesAtivos}</p>
            </CardContent></Card>
            <Card><CardContent className="p-3 text-center">
              <Repeat className="h-5 w-5 text-blue-600 mx-auto mb-1" />
              <p className="text-xs text-muted-foreground">Recorrentes</p>
              <p className="text-lg font-bold">{kpis.recorrentes}</p>
            </CardContent></Card>
            <Card><CardContent className="p-3 text-center">
              <UserX className="h-5 w-5 text-red-500 mx-auto mb-1" />
              <p className="text-xs text-muted-foreground">Inativos</p>
              <p className="text-lg font-bold">{kpis.inativos}</p>
            </CardContent></Card>
            <Card><CardContent className="p-3 text-center">
              <DollarSign className="h-5 w-5 text-emerald-600 mx-auto mb-1" />
              <p className="text-xs text-muted-foreground">Receita</p>
              <p className="text-sm font-bold truncate">R$ {kpis.totalReceita.toFixed(0)}</p>
            </CardContent></Card>
            <Card><CardContent className="p-3 text-center">
              <BarChart3 className="h-5 w-5 text-purple-600 mx-auto mb-1" />
              <p className="text-xs text-muted-foreground">Ticket Médio</p>
              <p className="text-sm font-bold truncate">R$ {kpis.ticketMedioGeral.toFixed(0)}</p>
            </CardContent></Card>
          </div>

          {/* Filters */}
          <div className="space-y-4 mb-6">
            <div className="flex flex-col sm:flex-row gap-3">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input placeholder="Buscar cliente..." value={searchText} onChange={(e) => setSearchText(e.target.value)} className="pl-10" />
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
                  <Button key={f.key} variant={filtroAtivo === f.key ? 'default' : 'outline'} size="sm" onClick={() => setFiltroAtivo(f.key)} className="gap-1.5 shrink-0">
                    {f.icon} {f.label}
                  </Button>
                ))}
              </div>
            </ScrollArea>

            {filtroAtivo === 'inativos' && (
              <div className="flex items-center gap-3 text-sm">
                <span className="text-muted-foreground whitespace-nowrap">Dias sem compra:</span>
                <Select value={String(diasInatividadeLimite)} onValueChange={(v) => setDiasInatividadeLimite(Number(v))}>
                  <SelectTrigger className="w-28"><SelectValue /></SelectTrigger>
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

          {/* Results */}
          <p className="text-sm text-muted-foreground mb-4">
            {filteredClientes.length} cliente{filteredClientes.length !== 1 ? 's' : ''}
          </p>

          {filteredClientes.length === 0 ? (
            <div className="text-center py-16 text-muted-foreground">
              <Filter className="h-12 w-12 mx-auto mb-3 opacity-40" />
              <p>Nenhum cliente encontrado com esse filtro.</p>
            </div>
          ) : (
            <div className="space-y-2">
              {filteredClientes.map((cliente) => (
                <Card key={cliente.id} className="cursor-pointer hover:shadow-md transition-all hover:border-primary/30 group" onClick={() => setSelectedCliente(cliente)}>
                  <CardContent className="p-3 sm:p-4">
                    <div className="flex items-center gap-3">
                      <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                        <Users className="h-5 w-5 text-primary" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <h3 className="font-semibold text-sm text-foreground truncate group-hover:text-primary transition-colors">{cliente.nome}</h3>
                          {getStatusBadge(cliente)}
                        </div>
                        <div className="flex items-center gap-3 mt-0.5 text-xs text-muted-foreground flex-wrap">
                          {cliente.telefone && <span className="flex items-center gap-1"><Phone className="h-3 w-3" /> {cliente.telefone}</span>}
                          {cliente.ultimaCompra && <span className="flex items-center gap-1"><Calendar className="h-3 w-3" /> {cliente.ultimaCompra.toLocaleDateString('pt-BR')}</span>}
                        </div>
                      </div>
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
        </>
      )}

      {/* Detail Dialog */}
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
                <div className="flex flex-wrap gap-3 text-sm">
                  {selectedCliente.telefone && <span className="flex items-center gap-1.5 text-muted-foreground"><Phone className="h-3.5 w-3.5" /> {selectedCliente.telefone}</span>}
                  {selectedCliente.email && <span className="flex items-center gap-1.5 text-muted-foreground"><Mail className="h-3.5 w-3.5" /> {selectedCliente.email}</span>}
                </div>

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

                <div className="grid grid-cols-2 gap-3">
                  <Card><CardContent className="p-3 flex items-center gap-2">
                    <ShoppingCart className="h-6 w-6 text-primary shrink-0" />
                    <div><p className="text-xs text-muted-foreground">Pedidos</p><p className="text-lg font-bold">{selectedCliente.totalPedidos}</p></div>
                  </CardContent></Card>
                  <Card><CardContent className="p-3 flex items-center gap-2">
                    <DollarSign className="h-6 w-6 text-green-600 shrink-0" />
                    <div><p className="text-xs text-muted-foreground">Total Gasto</p><p className="text-lg font-bold truncate">R$ {selectedCliente.totalGasto.toFixed(2)}</p></div>
                  </CardContent></Card>
                  <Card><CardContent className="p-3 flex items-center gap-2">
                    <BarChart3 className="h-6 w-6 text-purple-600 shrink-0" />
                    <div><p className="text-xs text-muted-foreground">Ticket Médio</p><p className="text-lg font-bold truncate">R$ {selectedCliente.ticketMedio.toFixed(2)}</p></div>
                  </CardContent></Card>
                  <Card><CardContent className="p-3 flex items-center gap-2">
                    <Clock className="h-6 w-6 text-amber-600 shrink-0" />
                    <div><p className="text-xs text-muted-foreground">Dias sem compra</p><p className="text-lg font-bold">{selectedCliente.diasSemCompra === 9999 ? 'N/A' : selectedCliente.diasSemCompra}</p></div>
                  </CardContent></Card>
                </div>

                <Separator />

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
                              <TableCell className="text-sm font-medium">{p.numero}</TableCell>
                              <TableCell className="text-sm">{p.data ? new Date(p.data).toLocaleDateString('pt-BR') : '-'}</TableCell>
                              <TableCell className="text-sm text-right font-medium">R$ {Number(p.total).toFixed(2)}</TableCell>
                              <TableCell><Badge variant="outline" className="text-xs">{p.situacao || '-'}</Badge></TableCell>
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
