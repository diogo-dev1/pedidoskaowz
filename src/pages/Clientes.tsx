import { useState, useEffect, useMemo } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { toast } from 'sonner';
import {
  Users, Search, Loader2, RefreshCw, ShoppingCart, DollarSign,
  Mail, Phone, MapPin, Building2, User, Calendar, ChevronRight,
  FileText, Hash
} from 'lucide-react';

export default function Clientes() {
  const [contatos, setContatos] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchText, setSearchText] = useState('');
  const [selectedContato, setSelectedContato] = useState<any>(null);
  const [contatoPedidos, setContatoPedidos] = useState<any[]>([]);
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

  const fetchBlingData = async (endpoint: string, params: Record<string, string> = {}) => {
    const projectId = import.meta.env.VITE_SUPABASE_PROJECT_ID;
    const res = await fetch(`https://${projectId}.supabase.co/functions/v1/bling-api`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ endpoint, params }),
    });
    return res.json();
  };

  const loadContatos = async () => {
    setLoading(true);
    try {
      const data = await fetchBlingData('contatos', { limite: '100' });
      setContatos(data?.data || []);
    } catch (err: any) {
      toast.error('Erro ao carregar clientes: ' + err.message);
    }
    setLoading(false);
  };

  const handleContatoClick = async (contato: any) => {
    setSelectedContato(contato);
    setContatoLoading(true);
    setContatoPedidos([]);
    try {
      const data = await fetchBlingData('pedidos/vendas', { limite: '100', idContato: String(contato.id) });
      setContatoPedidos(data?.data || []);
    } catch {
      toast.error('Erro ao carregar pedidos do cliente');
    }
    setContatoLoading(false);
  };

  const totalGasto = useMemo(() => {
    return contatoPedidos.reduce((sum, p) => sum + (Number(p.total) || 0), 0);
  }, [contatoPedidos]);

  const ultimaCompra = useMemo(() => {
    if (!contatoPedidos.length) return null;
    const sorted = [...contatoPedidos].sort((a, b) => new Date(b.data).getTime() - new Date(a.data).getTime());
    return sorted[0]?.data ? new Date(sorted[0].data) : null;
  }, [contatoPedidos]);

  const filteredContatos = useMemo(() => {
    if (!searchText) return contatos;
    const term = searchText.toLowerCase();
    return contatos.filter(c =>
      (c.nome || '').toLowerCase().includes(term) ||
      (c.email || '').toLowerCase().includes(term) ||
      (c.telefone || '').includes(term) ||
      (c.fantasia || '').toLowerCase().includes(term)
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
          placeholder="Buscar por nome, email, telefone..."
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
                    Ver detalhes <ChevronRight className="h-3 w-3" />
                  </span>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Client Detail Modal */}
      <Dialog open={!!selectedContato} onOpenChange={(open) => !open && setSelectedContato(null)}>
        <DialogContent className="max-w-2xl max-h-[85vh] p-0 gap-0">
          <DialogHeader className="p-6 pb-4">
            <DialogTitle className="flex items-center gap-2 text-lg">
              <User className="h-5 w-5 text-primary" />
              {selectedContato?.nome}
            </DialogTitle>
          </DialogHeader>

          <ScrollArea className="max-h-[calc(85vh-80px)]">
            <div className="px-6 pb-6 space-y-5">
              {/* Info do Cliente */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {selectedContato?.email && (
                  <div className="flex items-center gap-2 text-sm">
                    <Mail className="h-4 w-4 text-muted-foreground shrink-0" />
                    <span className="truncate">{selectedContato.email}</span>
                  </div>
                )}
                {selectedContato?.telefone && (
                  <div className="flex items-center gap-2 text-sm">
                    <Phone className="h-4 w-4 text-muted-foreground shrink-0" />
                    <span>{selectedContato.telefone}</span>
                  </div>
                )}
                {selectedContato?.celular && (
                  <div className="flex items-center gap-2 text-sm">
                    <Phone className="h-4 w-4 text-muted-foreground shrink-0" />
                    <span>{selectedContato.celular}</span>
                  </div>
                )}
                {selectedContato?.numeroDocumento && (
                  <div className="flex items-center gap-2 text-sm">
                    <FileText className="h-4 w-4 text-muted-foreground shrink-0" />
                    <span>{selectedContato.numeroDocumento}</span>
                  </div>
                )}
                {(selectedContato?.endereco?.geral?.endereco || selectedContato?.endereco?.municipio) && (
                  <div className="flex items-start gap-2 text-sm col-span-full">
                    <MapPin className="h-4 w-4 text-muted-foreground shrink-0 mt-0.5" />
                    <span>
                      {[
                        selectedContato?.endereco?.geral?.endereco,
                        selectedContato?.endereco?.geral?.numero,
                        selectedContato?.endereco?.geral?.bairro,
                        selectedContato?.endereco?.municipio || selectedContato?.endereco?.geral?.municipio,
                        selectedContato?.endereco?.uf || selectedContato?.endereco?.geral?.uf,
                        selectedContato?.endereco?.geral?.cep,
                      ].filter(Boolean).join(', ')}
                    </span>
                  </div>
                )}
              </div>

              <Separator />

              {/* Resumo de Compras */}
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                <Card className="bg-primary/5 border-primary/10">
                  <CardContent className="p-3 flex items-center gap-3">
                    <ShoppingCart className="h-7 w-7 text-primary shrink-0" />
                    <div className="min-w-0">
                      <p className="text-xs text-muted-foreground">Pedidos</p>
                      <p className="text-xl font-bold text-foreground">
                        {contatoLoading ? '...' : contatoPedidos.length}
                      </p>
                    </div>
                  </CardContent>
                </Card>
                <Card className="bg-green-500/5 border-green-500/10">
                  <CardContent className="p-3 flex items-center gap-3">
                    <DollarSign className="h-7 w-7 text-green-600 shrink-0" />
                    <div className="min-w-0">
                      <p className="text-xs text-muted-foreground">Total Gasto</p>
                      <p className="text-xl font-bold text-foreground truncate">
                        {contatoLoading ? '...' : `R$ ${totalGasto.toFixed(2)}`}
                      </p>
                    </div>
                  </CardContent>
                </Card>
                <Card className="bg-blue-500/5 border-blue-500/10 col-span-2 sm:col-span-1">
                  <CardContent className="p-3 flex items-center gap-3">
                    <Calendar className="h-7 w-7 text-blue-600 shrink-0" />
                    <div className="min-w-0">
                      <p className="text-xs text-muted-foreground">Última Compra</p>
                      <p className="text-sm font-bold text-foreground">
                        {contatoLoading ? '...' : ultimaCompra ? ultimaCompra.toLocaleDateString('pt-BR') : 'N/A'}
                      </p>
                    </div>
                  </CardContent>
                </Card>
              </div>

              <Separator />

              {/* Histórico de Pedidos */}
              <div>
                <h3 className="font-semibold text-sm mb-3 flex items-center gap-2">
                  <ShoppingCart className="h-4 w-4" />
                  Histórico de Pedidos
                </h3>

                {contatoLoading ? (
                  <div className="flex justify-center py-8">
                    <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                  </div>
                ) : contatoPedidos.length > 0 ? (
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
                        {contatoPedidos.map((p: any) => (
                          <TableRow key={p.id}>
                            <TableCell className="font-medium text-sm">{p.numero || p.id}</TableCell>
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
                  <p className="text-center text-muted-foreground py-8 text-sm">
                    Nenhum pedido encontrado para este cliente.
                  </p>
                )}
              </div>
            </div>
          </ScrollArea>
        </DialogContent>
      </Dialog>
    </div>
  );
}
