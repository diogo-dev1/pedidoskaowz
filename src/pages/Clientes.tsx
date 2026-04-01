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
  Mail, Phone, MapPin, User, Calendar, ChevronRight,
  FileText, Package
} from 'lucide-react';

interface RegistroCliente {
  descricao: string;
  valorUnitario: number;
  quantidade: number;
  tipo: string;
  numero: string;
  data: string;
  pedidoId?: string;
  nfeId?: string;
}

export default function Clientes() {
  const [contatos, setContatos] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchText, setSearchText] = useState('');
  const [selectedContato, setSelectedContato] = useState<any>(null);
  const [registrosCliente, setRegistrosCliente] = useState<RegistroCliente[]>([]);
  const [contatoLoading, setContatoLoading] = useState(false);
  const [connected, setConnected] = useState(false);
  const [checkingConnection, setCheckingConnection] = useState(true);

  useEffect(() => {
    checkConnection();
  }, []);

  const checkConnection = async () => {
    const { data } = await supabase.from('bling_tokens').select('expires_at').order('created_at', { ascending: false }).limit(1);
    if (data?.length) {
      const expiresAt = new Date(data[0].expires_at);
      const isConnected = expiresAt > new Date();
      setConnected(isConnected);
      if (isConnected) loadContatos();
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

  const loadContatos = async () => {
    setLoading(true);
    try {
      const data = await fetchBlingData('contatos', {}, true);
      setContatos(data?.data || []);
    } catch (err: any) {
      toast.error('Erro ao carregar clientes: ' + err.message);
    }
    setLoading(false);
  };

  const handleContatoClick = async (contato: any) => {
    setSelectedContato(contato);
    setContatoLoading(true);
    setRegistrosCliente([]);

    try {
      // Fetch pedidos desse contato com paginação
      const pedidosData = await fetchBlingData('pedidos/vendas', { idContato: String(contato.id) }, true);
      const pedidos = pedidosData?.data || [];

      const registros: RegistroCliente[] = [];

      // Para cada pedido, buscar detalhes com itens
      const detailPromises = pedidos.map(async (pedido: any) => {
        try {
          const detail = await fetchBlingData(`pedidos/vendas/${pedido.id}`);
          const pedidoDetail = detail?.data || pedido;
          const itens = pedidoDetail?.itens || [];

          for (const item of itens) {
            registros.push({
              descricao: item.descricao || item.produto?.nome || '-',
              valorUnitario: Number(item.valor || item.valorUnidade || 0),
              quantidade: Number(item.quantidade || 1),
              tipo: 'Venda',
              numero: String(pedidoDetail.numero || pedido.numero || pedido.id),
              data: pedidoDetail.data || pedido.data || '',
              pedidoId: String(pedido.id),
            });
          }

          // Se não tem itens, registra o pedido como linha
          if (itens.length === 0) {
            registros.push({
              descricao: pedidoDetail.contato?.nome || 'Pedido sem itens detalhados',
              valorUnitario: Number(pedidoDetail.total || pedido.total || 0),
              quantidade: 1,
              tipo: 'Venda',
              numero: String(pedidoDetail.numero || pedido.numero || pedido.id),
              data: pedidoDetail.data || pedido.data || '',
              pedidoId: String(pedido.id),
            });
          }
        } catch {
          // Fallback: register just the order
          registros.push({
            descricao: 'Pedido (sem detalhes)',
            valorUnitario: Number(pedido.total || 0),
            quantidade: 1,
            tipo: 'Venda',
            numero: String(pedido.numero || pedido.id),
            data: pedido.data || '',
            pedidoId: String(pedido.id),
          });
        }
      });

      await Promise.all(detailPromises);

      // Buscar NF-es do contato
      try {
        const nfesData = await fetchBlingData('nfe', { idContato: String(contato.id) }, true);
        const nfes = nfesData?.data || [];

        for (const nfe of nfes) {
          try {
            const nfeDetail = await fetchBlingData(`nfe/${nfe.id}`);
            const nfeData = nfeDetail?.data || nfe;
            const itens = nfeData?.itens || [];

            for (const item of itens) {
              registros.push({
                descricao: item.descricao || item.produto?.nome || '-',
                valorUnitario: Number(item.valor || item.valorUnidade || 0),
                quantidade: Number(item.quantidade || 1),
                tipo: 'Nota Fiscal',
                numero: String(nfeData.numero || nfe.numero || nfe.id),
                data: nfeData.dataEmissao || nfe.dataEmissao || '',
                nfeId: String(nfe.id),
              });
            }

            if (itens.length === 0) {
              registros.push({
                descricao: 'NF-e (sem itens detalhados)',
                valorUnitario: Number(nfeData.total || nfe.total || 0),
                quantidade: 1,
                tipo: 'Nota Fiscal',
                numero: String(nfeData.numero || nfe.numero || nfe.id),
                data: nfeData.dataEmissao || nfe.dataEmissao || '',
                nfeId: String(nfe.id),
              });
            }
          } catch {
            registros.push({
              descricao: 'NF-e (sem detalhes)',
              valorUnitario: Number(nfe.total || 0),
              quantidade: 1,
              tipo: 'Nota Fiscal',
              numero: String(nfe.numero || nfe.id),
              data: nfe.dataEmissao || '',
              nfeId: String(nfe.id),
            });
          }
        }
      } catch {
        // NF-e fetch failed silently
      }

      // Sort by date desc
      registros.sort((a, b) => {
        const dA = a.data ? new Date(a.data).getTime() : 0;
        const dB = b.data ? new Date(b.data).getTime() : 0;
        return dB - dA;
      });

      setRegistrosCliente(registros);
    } catch {
      toast.error('Erro ao carregar registros do cliente');
    }
    setContatoLoading(false);
  };

  const totalGasto = useMemo(() => {
    // Sum only "Venda" types to avoid double counting with NF-e
    return registrosCliente
      .filter(r => r.tipo === 'Venda')
      .reduce((sum, r) => sum + (r.valorUnitario * r.quantidade), 0);
  }, [registrosCliente]);

  const totalPedidos = useMemo(() => {
    const ids = new Set(registrosCliente.filter(r => r.pedidoId).map(r => r.pedidoId));
    return ids.size;
  }, [registrosCliente]);

  const registrosProdutos = useMemo(() => {
    return registrosCliente.filter(r => r.tipo === 'Venda');
  }, [registrosCliente]);

  const registrosFinanceiro = useMemo(() => {
    return registrosCliente.filter(r => r.tipo === 'Nota Fiscal');
  }, [registrosCliente]);

  const filteredContatos = useMemo(() => {
    if (!searchText) return contatos;
    const term = searchText.toLowerCase();
    return contatos.filter(c =>
      (c.nome || '').toLowerCase().includes(term) ||
      (c.email || '').toLowerCase().includes(term) ||
      (c.telefone || '').includes(term) ||
      (c.fantasia || '').toLowerCase().includes(term) ||
      (c.numeroDocumento || '').includes(term)
    );
  }, [contatos, searchText]);

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
          <Users className="h-16 w-16 text-muted-foreground mx-auto" />
          <h1 className="text-2xl font-bold">Clientes</h1>
          <p className="text-muted-foreground">
            Conecte sua conta do Bling na página de integração para visualizar seus clientes.
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
            <Users className="h-6 w-6 text-primary" />
            Clientes
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            {contatos.length} cliente{contatos.length !== 1 ? 's' : ''} cadastrado{contatos.length !== 1 ? 's' : ''}
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={loadContatos} disabled={loading} className="self-start">
          <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
          Atualizar
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

      {/* Client Cards Grid */}
      {loading && !contatos.length ? (
        <div className="flex justify-center py-16">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      ) : filteredContatos.length === 0 ? (
        <div className="text-center py-16 text-muted-foreground">
          <Users className="h-12 w-12 mx-auto mb-3 opacity-40" />
          <p>{searchText ? 'Nenhum cliente encontrado para essa busca.' : 'Nenhum cliente carregado.'}</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredContatos.map((contato) => (
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
                  {contato.numeroDocumento && (
                    <div className="flex items-center gap-2">
                      <FileText className="h-3.5 w-3.5 shrink-0" />
                      <span className="truncate">{contato.numeroDocumento}</span>
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
                  {(contato.endereco?.municipio || contato.endereco?.uf) && (
                    <div className="flex items-center gap-2">
                      <MapPin className="h-3.5 w-3.5 shrink-0" />
                      <span className="truncate">
                        {[contato.endereco?.municipio, contato.endereco?.uf].filter(Boolean).join(' - ')}
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
          ))}
        </div>
      )}

      {/* Client Detail Modal - similar to reference image */}
      <Dialog open={!!selectedContato} onOpenChange={(open) => !open && setSelectedContato(null)}>
        <DialogContent className="max-w-3xl max-h-[85vh] p-0 gap-0">
          <DialogHeader className="p-5 pb-3">
            <DialogTitle className="text-lg">
              Últimos registros deste cliente
            </DialogTitle>
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
                {selectedContato?.numeroDocumento && (
                  <span className="flex items-center gap-1.5 text-muted-foreground">
                    <FileText className="h-3.5 w-3.5" /> {selectedContato.numeroDocumento}
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
                      <p className="text-xl font-bold">{contatoLoading ? '...' : totalPedidos}</p>
                    </div>
                  </CardContent>
                </Card>
                <Card className="bg-green-500/5 border-green-500/10">
                  <CardContent className="p-3 flex items-center gap-3">
                    <DollarSign className="h-6 w-6 text-green-600 shrink-0" />
                    <div>
                      <p className="text-xs text-muted-foreground">Total Gasto</p>
                      <p className="text-lg font-bold truncate">{contatoLoading ? '...' : `R$ ${totalGasto.toFixed(2)}`}</p>
                    </div>
                  </CardContent>
                </Card>
                <Card className="bg-blue-500/5 border-blue-500/10 col-span-2 sm:col-span-1">
                  <CardContent className="p-3 flex items-center gap-3">
                    <Package className="h-6 w-6 text-blue-600 shrink-0" />
                    <div>
                      <p className="text-xs text-muted-foreground">Itens</p>
                      <p className="text-xl font-bold">{contatoLoading ? '...' : registrosCliente.length}</p>
                    </div>
                  </CardContent>
                </Card>
              </div>

              <Separator />

              {/* Tabs: Produtos + Financeiro */}
              <Tabs defaultValue="produtos">
                <TabsList className="w-full grid grid-cols-2">
                  <TabsTrigger value="produtos" className="gap-1.5">
                    <Package className="h-4 w-4" /> Produtos
                  </TabsTrigger>
                  <TabsTrigger value="financeiro" className="gap-1.5">
                    <FileText className="h-4 w-4" /> Financeiro
                  </TabsTrigger>
                </TabsList>

                <TabsContent value="produtos" className="mt-3">
                  {/* Search within products */}
                  {contatoLoading ? (
                    <div className="flex justify-center py-8">
                      <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                    </div>
                  ) : registrosProdutos.length > 0 ? (
                    <div className="rounded-lg border overflow-hidden">
                      <Table>
                        <TableHeader>
                          <TableRow className="bg-muted/50">
                            <TableHead className="text-xs">Descrição</TableHead>
                            <TableHead className="text-xs text-right">Valor unitário</TableHead>
                            <TableHead className="text-xs text-center">Qtd</TableHead>
                            <TableHead className="text-xs">Tipo</TableHead>
                            <TableHead className="text-xs">Número</TableHead>
                            <TableHead className="text-xs">Data</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {registrosProdutos.map((r, i) => (
                            <TableRow key={`prod-${i}`}>
                              <TableCell className="text-sm font-medium max-w-[200px] truncate">{r.descricao}</TableCell>
                              <TableCell className="text-sm text-right">
                                {r.valorUnitario.toFixed(2)}
                              </TableCell>
                              <TableCell className="text-sm text-center">{r.quantidade.toFixed(3)}</TableCell>
                              <TableCell>
                                <Badge variant="outline" className="text-xs whitespace-nowrap">{r.tipo}</Badge>
                              </TableCell>
                              <TableCell className="text-sm text-primary font-medium">{r.numero}</TableCell>
                              <TableCell className="text-sm whitespace-nowrap">
                                {r.data ? new Date(r.data).toLocaleDateString('pt-BR') : '-'}
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                  ) : (
                    <p className="text-center text-muted-foreground py-8 text-sm">
                      Nenhum produto encontrado para este cliente.
                    </p>
                  )}
                </TabsContent>

                <TabsContent value="financeiro" className="mt-3">
                  {contatoLoading ? (
                    <div className="flex justify-center py-8">
                      <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                    </div>
                  ) : registrosFinanceiro.length > 0 ? (
                    <div className="rounded-lg border overflow-hidden">
                      <Table>
                        <TableHeader>
                          <TableRow className="bg-muted/50">
                            <TableHead className="text-xs">Descrição</TableHead>
                            <TableHead className="text-xs text-right">Valor unitário</TableHead>
                            <TableHead className="text-xs text-center">Qtd</TableHead>
                            <TableHead className="text-xs">Tipo</TableHead>
                            <TableHead className="text-xs">Número</TableHead>
                            <TableHead className="text-xs">Data</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {registrosFinanceiro.map((r, i) => (
                            <TableRow key={`fin-${i}`}>
                              <TableCell className="text-sm font-medium max-w-[200px] truncate">{r.descricao}</TableCell>
                              <TableCell className="text-sm text-right">
                                {r.valorUnitario.toFixed(2)}
                              </TableCell>
                              <TableCell className="text-sm text-center">{r.quantidade.toFixed(3)}</TableCell>
                              <TableCell>
                                <Badge variant="outline" className="text-xs whitespace-nowrap">{r.tipo}</Badge>
                              </TableCell>
                              <TableCell className="text-sm text-primary font-medium">{r.numero}</TableCell>
                              <TableCell className="text-sm whitespace-nowrap">
                                {r.data ? new Date(r.data).toLocaleDateString('pt-BR') : '-'}
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                  ) : (
                    <p className="text-center text-muted-foreground py-8 text-sm">
                      Nenhuma nota fiscal encontrada para este cliente.
                    </p>
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
