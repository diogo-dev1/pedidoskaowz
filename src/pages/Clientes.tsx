import { useState, useEffect, useMemo } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { toast } from 'sonner';
import {
  Users, Search, Loader2, RefreshCw, ShoppingCart, DollarSign,
  Mail, Phone, MapPin, ChevronRight, FileText, Package, Clock
} from 'lucide-react';

export default function Clientes() {
  const [contatos, setContatos] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [searchText, setSearchText] = useState('');
  const [selectedContato, setSelectedContato] = useState<any>(null);
  const [pedidosCliente, setPedidosCliente] = useState<any[]>([]);
  const [lastSync, setLastSync] = useState<string | null>(null);

  useEffect(() => {
    loadFromCache();
  }, []);

  const loadFromCache = async () => {
    setLoading(true);
    const [contatosRes, syncRes] = await Promise.all([
      supabase.from('bling_contatos').select('*').order('nome'),
      supabase.from('bling_sync_log').select('*').eq('status', 'completed').order('finished_at', { ascending: false }).limit(1),
    ]);

    setContatos(contatosRes.data || []);
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
      toast.success(`Sincronização concluída! ${result.total} registros atualizados.`);
      await loadFromCache();
    } catch (err: any) {
      toast.error('Erro na sincronização: ' + err.message);
    }
    setSyncing(false);
  };

  const handleContatoClick = async (contato: any) => {
    setSelectedContato(contato);
    const { data } = await supabase
      .from('bling_pedidos')
      .select('*')
      .eq('contato_bling_id', contato.bling_id)
      .order('data', { ascending: false });
    setPedidosCliente(data || []);
  };

  const totalGasto = useMemo(() => {
    return pedidosCliente.reduce((sum, p) => sum + (Number(p.total) || 0), 0);
  }, [pedidosCliente]);

  const todosItens = useMemo(() => {
    return pedidosCliente.flatMap((p) => {
      const itens = (p.itens as any[]) || [];
      return itens.map((item: any) => ({
        descricao: item.descricao || item.produto?.nome || '-',
        valorUnitario: Number(item.valor || item.valorUnidade || 0),
        quantidade: Number(item.quantidade || 1),
        numero: p.numero,
        data: p.data,
      }));
    });
  }, [pedidosCliente]);

  const filteredContatos = useMemo(() => {
    if (!searchText) return contatos;
    const term = searchText.toLowerCase();
    return contatos.filter(c =>
      (c.nome || '').toLowerCase().includes(term) ||
      (c.email || '').toLowerCase().includes(term) ||
      (c.telefone || '').includes(term) ||
      (c.fantasia || '').toLowerCase().includes(term) ||
      (c.numero_documento || '').includes(term)
    );
  }, [contatos, searchText]);

  return (
    <div className="container mx-auto py-4 px-3 md:py-6 md:px-4 max-w-6xl">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-6">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-foreground flex items-center gap-2">
            <Users className="h-6 w-6 text-primary" />
            Clientes
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            {contatos.length} cliente{contatos.length !== 1 ? 's' : ''} •
            {lastSync ? ` Última sync: ${lastSync}` : ' Nunca sincronizado'}
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={handleSync} disabled={syncing} className="self-start">
          <RefreshCw className={`h-4 w-4 mr-2 ${syncing ? 'animate-spin' : ''}`} />
          {syncing ? 'Sincronizando...' : 'Sincronizar'}
        </Button>
      </div>

      {/* Search */}
      <div className="relative mb-6">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Buscar por nome, email, telefone, CPF/CNPJ..."
          value={searchText}
          onChange={(e) => setSearchText(e.target.value)}
          className="pl-10"
        />
      </div>

      {/* Empty state: no cache */}
      {!loading && contatos.length === 0 && (
        <div className="text-center py-16 space-y-4">
          <Users className="h-16 w-16 text-muted-foreground mx-auto opacity-40" />
          <h2 className="text-lg font-semibold">Nenhum cliente no cache</h2>
          <p className="text-muted-foreground text-sm">Clique em "Sincronizar" para buscar seus clientes do Bling.</p>
          <Button onClick={handleSync} disabled={syncing}>
            <RefreshCw className={`h-4 w-4 mr-2 ${syncing ? 'animate-spin' : ''}`} />
            Sincronizar Agora
          </Button>
        </div>
      )}

      {/* Loading */}
      {loading && (
        <div className="flex justify-center py-16">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      )}

      {/* Client Grid */}
      {!loading && filteredContatos.length > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredContatos.map((contato) => {
            const endereco = contato.endereco as Record<string, any> || {};
            return (
              <Card
                key={contato.id}
                className="cursor-pointer hover:shadow-md transition-all hover:border-primary/30 group"
                onClick={() => handleContatoClick(contato)}
              >
                <CardContent className="p-4">
                  <div className="flex items-start justify-between mb-3">
                    <div className="min-w-0 flex-1">
                      <h3 className="font-semibold text-foreground truncate group-hover:text-primary transition-colors">
                        {contato.nome || 'Sem nome'}
                      </h3>
                      {contato.fantasia && (
                        <p className="text-xs text-muted-foreground truncate">{contato.fantasia}</p>
                      )}
                    </div>
                    <Badge variant="outline" className="ml-2 shrink-0 text-xs">
                      {contato.tipo === 'J' ? 'PJ' : 'PF'}
                    </Badge>
                  </div>

                  <div className="space-y-1.5 text-sm text-muted-foreground">
                    {contato.numero_documento && (
                      <div className="flex items-center gap-2">
                        <FileText className="h-3.5 w-3.5 shrink-0" />
                        <span className="truncate">{contato.numero_documento}</span>
                      </div>
                    )}
                    {contato.telefone && (
                      <div className="flex items-center gap-2">
                        <Phone className="h-3.5 w-3.5 shrink-0" />
                        <span className="truncate">{contato.telefone}</span>
                      </div>
                    )}
                    {contato.email && (
                      <div className="flex items-center gap-2">
                        <Mail className="h-3.5 w-3.5 shrink-0" />
                        <span className="truncate">{contato.email}</span>
                      </div>
                    )}
                    {(endereco?.municipio || endereco?.uf) && (
                      <div className="flex items-center gap-2">
                        <MapPin className="h-3.5 w-3.5 shrink-0" />
                        <span className="truncate">
                          {[endereco?.municipio, endereco?.uf].filter(Boolean).join(' - ')}
                        </span>
                      </div>
                    )}
                  </div>

                  <div className="flex items-center justify-end mt-3 pt-2 border-t">
                    <span className="text-xs text-muted-foreground group-hover:text-primary transition-colors flex items-center gap-1">
                      Ver registros <ChevronRight className="h-3 w-3" />
                    </span>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* No results */}
      {!loading && contatos.length > 0 && filteredContatos.length === 0 && (
        <div className="text-center py-16 text-muted-foreground">
          <Search className="h-12 w-12 mx-auto mb-3 opacity-40" />
          <p>Nenhum cliente encontrado para essa busca.</p>
        </div>
      )}

      {/* Detail Modal */}
      <Dialog open={!!selectedContato} onOpenChange={(open) => { if (!open) { setSelectedContato(null); setPedidosCliente([]); } }}>
        <DialogContent className="max-w-3xl max-h-[85vh] p-0 gap-0">
          <DialogHeader className="p-5 pb-3">
            <DialogTitle className="text-lg">Últimos registros deste cliente</DialogTitle>
            <p className="text-sm text-muted-foreground">{selectedContato?.nome}</p>
          </DialogHeader>

          <ScrollArea className="max-h-[calc(85vh-80px)]">
            <div className="px-5 pb-5 space-y-4">
              {/* Contact summary */}
              <div className="flex flex-wrap gap-4 text-sm">
                {selectedContato?.telefone && (
                  <span className="flex items-center gap-1.5 text-muted-foreground">
                    <Phone className="h-3.5 w-3.5" /> {selectedContato.telefone}
                  </span>
                )}
                {selectedContato?.email && (
                  <span className="flex items-center gap-1.5 text-muted-foreground">
                    <Mail className="h-3.5 w-3.5" /> {selectedContato.email}
                  </span>
                )}
                {selectedContato?.numero_documento && (
                  <span className="flex items-center gap-1.5 text-muted-foreground">
                    <FileText className="h-3.5 w-3.5" /> {selectedContato.numero_documento}
                  </span>
                )}
              </div>

              {/* KPIs */}
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                <Card className="bg-primary/5 border-primary/10">
                  <CardContent className="p-3 flex items-center gap-3">
                    <ShoppingCart className="h-6 w-6 text-primary shrink-0" />
                    <div>
                      <p className="text-xs text-muted-foreground">Pedidos</p>
                      <p className="text-xl font-bold">{pedidosCliente.length}</p>
                    </div>
                  </CardContent>
                </Card>
                <Card className="bg-green-500/5 border-green-500/10">
                  <CardContent className="p-3 flex items-center gap-3">
                    <DollarSign className="h-6 w-6 text-green-600 shrink-0" />
                    <div>
                      <p className="text-xs text-muted-foreground">Total Gasto</p>
                      <p className="text-lg font-bold truncate">R$ {totalGasto.toFixed(2)}</p>
                    </div>
                  </CardContent>
                </Card>
                <Card className="bg-blue-500/5 border-blue-500/10 col-span-2 sm:col-span-1">
                  <CardContent className="p-3 flex items-center gap-3">
                    <Package className="h-6 w-6 text-blue-600 shrink-0" />
                    <div>
                      <p className="text-xs text-muted-foreground">Itens</p>
                      <p className="text-xl font-bold">{todosItens.length}</p>
                    </div>
                  </CardContent>
                </Card>
              </div>

              <Separator />

              <Tabs defaultValue="produtos">
                <TabsList className="w-full grid grid-cols-2">
                  <TabsTrigger value="produtos" className="gap-1.5">
                    <Package className="h-4 w-4" /> Produtos
                  </TabsTrigger>
                  <TabsTrigger value="pedidos" className="gap-1.5">
                    <ShoppingCart className="h-4 w-4" /> Pedidos
                  </TabsTrigger>
                </TabsList>

                <TabsContent value="produtos" className="mt-3">
                  {todosItens.length > 0 ? (
                    <div className="rounded-lg border overflow-hidden">
                      <Table>
                        <TableHeader>
                          <TableRow className="bg-muted/50">
                            <TableHead className="text-xs">Descrição</TableHead>
                            <TableHead className="text-xs text-right">Valor</TableHead>
                            <TableHead className="text-xs text-center">Qtd</TableHead>
                            <TableHead className="text-xs">Pedido</TableHead>
                            <TableHead className="text-xs">Data</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {todosItens.map((item, i) => (
                            <TableRow key={i}>
                              <TableCell className="text-sm font-medium max-w-[200px] truncate">{item.descricao}</TableCell>
                              <TableCell className="text-sm text-right">{item.valorUnitario.toFixed(2)}</TableCell>
                              <TableCell className="text-sm text-center">{item.quantidade}</TableCell>
                              <TableCell className="text-sm text-primary font-medium">{item.numero}</TableCell>
                              <TableCell className="text-sm whitespace-nowrap">
                                {item.data ? new Date(item.data).toLocaleDateString('pt-BR') : '-'}
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                  ) : (
                    <p className="text-center text-muted-foreground py-8 text-sm">Nenhum produto encontrado.</p>
                  )}
                </TabsContent>

                <TabsContent value="pedidos" className="mt-3">
                  {pedidosCliente.length > 0 ? (
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
                          {pedidosCliente.map((p) => (
                            <TableRow key={p.id}>
                              <TableCell className="text-sm font-medium">{p.numero}</TableCell>
                              <TableCell className="text-sm">
                                {p.data ? new Date(p.data).toLocaleDateString('pt-BR') : '-'}
                              </TableCell>
                              <TableCell className="text-sm text-right font-medium">
                                R$ {Number(p.total).toFixed(2)}
                              </TableCell>
                              <TableCell>
                                <Badge variant="outline" className="text-xs">{p.situacao || '-'}</Badge>
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                  ) : (
                    <p className="text-center text-muted-foreground py-8 text-sm">Nenhum pedido encontrado.</p>
                  )}
                </TabsContent>
              </Tabs>
            </div>
          </ScrollArea>
        </DialogContent>
      </Dialog>
    </div>
  );
}
