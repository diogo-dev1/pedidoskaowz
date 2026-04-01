import { useState, useEffect, useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { toast } from 'sonner';
import { Link2, Link2Off, RefreshCw, Package, Users, FileText, ShoppingCart, Loader2, ChevronRight, DollarSign, X } from 'lucide-react';

const BLING_CLIENT_ID = '7feedd12c2cc706ef96607e32aa8acbdc52fac4d';

export default function BlingIntegration() {
  const [searchParams] = useSearchParams();
  const [connected, setConnected] = useState(false);
  const [loading, setLoading] = useState(true);
  const [dataLoading, setDataLoading] = useState(false);
  const [produtos, setProdutos] = useState<any[]>([]);
  const [pedidos, setPedidos] = useState<any[]>([]);
  const [contatos, setContatos] = useState<any[]>([]);
  const [nfes, setNfes] = useState<any[]>([]);
  const [selectedContato, setSelectedContato] = useState<any>(null);
  const [contatoPedidos, setContatoPedidos] = useState<any[]>([]);
  const [contatoLoading, setContatoLoading] = useState(false);

  // Check if we have a valid token
  const checkConnection = async () => {
    const { data } = await supabase.from('bling_tokens').select('expires_at').order('created_at', { ascending: false }).limit(1);
    if (data?.length) {
      const expiresAt = new Date(data[0].expires_at);
      setConnected(expiresAt > new Date());
    } else {
      setConnected(false);
    }
    setLoading(false);
  };

  // Handle OAuth callback code
  useEffect(() => {
    const code = searchParams.get('code');
    if (code) {
      (async () => {
        setLoading(true);
        try {
          const projectId = import.meta.env.VITE_SUPABASE_PROJECT_ID;
          const res = await fetch(`https://${projectId}.supabase.co/functions/v1/bling-auth`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ code }),
          });
          const result = await res.json();
          if (result.success) {
            toast.success('Bling conectado com sucesso!');
            setConnected(true);
            // Clean URL
            window.history.replaceState({}, '', '/bling');
          } else {
            toast.error('Erro ao conectar: ' + (result.error || 'Erro desconhecido'));
          }
        } catch (err: any) {
          toast.error('Erro ao conectar com o Bling: ' + err.message);
        }
        setLoading(false);
      })();
    } else {
      checkConnection();
    }
  }, []);

  const handleConnect = () => {
    const redirectUri = encodeURIComponent(`${window.location.origin}/bling`);
    const state = Math.random().toString(36).substring(7);
    window.location.href = `https://www.bling.com.br/b/Api/v3/oauth/authorize?response_type=code&client_id=${BLING_CLIENT_ID}&state=${state}&redirect_uri=${redirectUri}`;
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

  const loadProdutos = async () => {
    setDataLoading(true);
    try {
      const data = await fetchBlingData('produtos', { limite: '100' });
      setProdutos(data?.data || []);
    } catch (err: any) {
      toast.error('Erro ao carregar produtos: ' + err.message);
    }
    setDataLoading(false);
  };

  const loadPedidos = async () => {
    setDataLoading(true);
    try {
      const data = await fetchBlingData('pedidos/vendas', { limite: '100' });
      setPedidos(data?.data || []);
    } catch (err: any) {
      toast.error('Erro ao carregar pedidos: ' + err.message);
    }
    setDataLoading(false);
  };

  const loadContatos = async () => {
    setDataLoading(true);
    try {
      const data = await fetchBlingData('contatos', { limite: '100' });
      setContatos(data?.data || []);
    } catch (err: any) {
      toast.error('Erro ao carregar contatos: ' + err.message);
    }
    setDataLoading(false);
  };

  const loadNfes = async () => {
    setDataLoading(true);
    try {
      const data = await fetchBlingData('nfe', { limite: '100' });
      setNfes(data?.data || []);
    } catch (err: any) {
      toast.error('Erro ao carregar notas fiscais: ' + err.message);
    }
    setDataLoading(false);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!connected) {
    return (
      <div className="p-4 md:p-6 max-w-2xl mx-auto">
        <Card>
          <CardHeader className="text-center">
            <CardTitle className="text-2xl">Integração Bling</CardTitle>
            <CardDescription>Conecte sua conta do Bling para acessar produtos, pedidos, contatos e notas fiscais.</CardDescription>
          </CardHeader>
          <CardContent className="flex justify-center">
            <Button onClick={handleConnect} size="lg" className="gap-2">
              <Link2 className="h-5 w-5" />
              Conectar ao Bling
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="p-4 md:p-6 space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Bling</h1>
          <p className="text-sm text-muted-foreground">Dados sincronizados da sua conta Bling</p>
        </div>
        <Badge variant="outline" className="gap-1 text-green-600 border-green-600">
          <Link2 className="h-3 w-3" /> Conectado
        </Badge>
      </div>

      <Tabs defaultValue="produtos" onValueChange={(v) => {
        if (v === 'produtos' && !produtos.length) loadProdutos();
        if (v === 'pedidos' && !pedidos.length) loadPedidos();
        if (v === 'contatos' && !contatos.length) loadContatos();
        if (v === 'nfes' && !nfes.length) loadNfes();
      }}>
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="produtos" className="gap-1"><Package className="h-4 w-4" /> Produtos</TabsTrigger>
          <TabsTrigger value="pedidos" className="gap-1"><ShoppingCart className="h-4 w-4" /> Pedidos</TabsTrigger>
          <TabsTrigger value="contatos" className="gap-1"><Users className="h-4 w-4" /> Contatos</TabsTrigger>
          <TabsTrigger value="nfes" className="gap-1"><FileText className="h-4 w-4" /> NF-e</TabsTrigger>
        </TabsList>

        <TabsContent value="produtos">
          <Card>
            <CardHeader className="flex-row items-center justify-between">
              <CardTitle className="text-lg">Produtos</CardTitle>
              <Button variant="outline" size="sm" onClick={loadProdutos} disabled={dataLoading}>
                <RefreshCw className={`h-4 w-4 mr-1 ${dataLoading ? 'animate-spin' : ''}`} /> Atualizar
              </Button>
            </CardHeader>
            <CardContent>
              {dataLoading && !produtos.length ? (
                <div className="flex justify-center py-8"><Loader2 className="h-6 w-6 animate-spin" /></div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Nome</TableHead>
                      <TableHead>Código</TableHead>
                      <TableHead className="text-right">Preço</TableHead>
                      <TableHead className="text-right">Estoque</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {produtos.map((p: any) => (
                      <TableRow key={p.id}>
                        <TableCell className="font-medium">{p.nome || '-'}</TableCell>
                        <TableCell>{p.codigo || '-'}</TableCell>
                        <TableCell className="text-right">
                          {p.preco ? `R$ ${Number(p.preco).toFixed(2)}` : '-'}
                        </TableCell>
                        <TableCell className="text-right">{p.estoque?.saldoVirtualTotal ?? '-'}</TableCell>
                      </TableRow>
                    ))}
                    {!produtos.length && !dataLoading && (
                      <TableRow><TableCell colSpan={4} className="text-center text-muted-foreground py-8">Clique em "Atualizar" para carregar</TableCell></TableRow>
                    )}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="pedidos">
          <Card>
            <CardHeader className="flex-row items-center justify-between">
              <CardTitle className="text-lg">Pedidos de Venda</CardTitle>
              <Button variant="outline" size="sm" onClick={loadPedidos} disabled={dataLoading}>
                <RefreshCw className={`h-4 w-4 mr-1 ${dataLoading ? 'animate-spin' : ''}`} /> Atualizar
              </Button>
            </CardHeader>
            <CardContent>
              {dataLoading && !pedidos.length ? (
                <div className="flex justify-center py-8"><Loader2 className="h-6 w-6 animate-spin" /></div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Número</TableHead>
                      <TableHead>Cliente</TableHead>
                      <TableHead>Data</TableHead>
                      <TableHead className="text-right">Total</TableHead>
                      <TableHead>Situação</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {pedidos.map((p: any) => (
                      <TableRow key={p.id}>
                        <TableCell className="font-medium">{p.numero || p.id}</TableCell>
                        <TableCell>{p.contato?.nome || '-'}</TableCell>
                        <TableCell>{p.data ? new Date(p.data).toLocaleDateString('pt-BR') : '-'}</TableCell>
                        <TableCell className="text-right">
                          {p.total ? `R$ ${Number(p.total).toFixed(2)}` : '-'}
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline">{p.situacao?.valor || '-'}</Badge>
                        </TableCell>
                      </TableRow>
                    ))}
                    {!pedidos.length && !dataLoading && (
                      <TableRow><TableCell colSpan={5} className="text-center text-muted-foreground py-8">Clique em "Atualizar" para carregar</TableCell></TableRow>
                    )}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="contatos">
          <Card>
            <CardHeader className="flex-row items-center justify-between">
              <CardTitle className="text-lg">Contatos</CardTitle>
              <Button variant="outline" size="sm" onClick={loadContatos} disabled={dataLoading}>
                <RefreshCw className={`h-4 w-4 mr-1 ${dataLoading ? 'animate-spin' : ''}`} /> Atualizar
              </Button>
            </CardHeader>
            <CardContent>
              {dataLoading && !contatos.length ? (
                <div className="flex justify-center py-8"><Loader2 className="h-6 w-6 animate-spin" /></div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Nome</TableHead>
                      <TableHead>Tipo</TableHead>
                      <TableHead>Telefone</TableHead>
                      <TableHead>Email</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {contatos.map((c: any) => (
                      <TableRow key={c.id}>
                        <TableCell className="font-medium">{c.nome || '-'}</TableCell>
                        <TableCell>{c.tipo || '-'}</TableCell>
                        <TableCell>{c.telefone || '-'}</TableCell>
                        <TableCell>{c.email || '-'}</TableCell>
                      </TableRow>
                    ))}
                    {!contatos.length && !dataLoading && (
                      <TableRow><TableCell colSpan={4} className="text-center text-muted-foreground py-8">Clique em "Atualizar" para carregar</TableCell></TableRow>
                    )}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="nfes">
          <Card>
            <CardHeader className="flex-row items-center justify-between">
              <CardTitle className="text-lg">Notas Fiscais</CardTitle>
              <Button variant="outline" size="sm" onClick={loadNfes} disabled={dataLoading}>
                <RefreshCw className={`h-4 w-4 mr-1 ${dataLoading ? 'animate-spin' : ''}`} /> Atualizar
              </Button>
            </CardHeader>
            <CardContent>
              {dataLoading && !nfes.length ? (
                <div className="flex justify-center py-8"><Loader2 className="h-6 w-6 animate-spin" /></div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Número</TableHead>
                      <TableHead>Série</TableHead>
                      <TableHead>Data</TableHead>
                      <TableHead className="text-right">Valor</TableHead>
                      <TableHead>Situação</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {nfes.map((n: any) => (
                      <TableRow key={n.id}>
                        <TableCell className="font-medium">{n.numero || '-'}</TableCell>
                        <TableCell>{n.serie || '-'}</TableCell>
                        <TableCell>{n.dataEmissao ? new Date(n.dataEmissao).toLocaleDateString('pt-BR') : '-'}</TableCell>
                        <TableCell className="text-right">
                          {n.valorNota ? `R$ ${Number(n.valorNota).toFixed(2)}` : '-'}
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline">{n.situacao || '-'}</Badge>
                        </TableCell>
                      </TableRow>
                    ))}
                    {!nfes.length && !dataLoading && (
                      <TableRow><TableCell colSpan={5} className="text-center text-muted-foreground py-8">Clique em "Atualizar" para carregar</TableCell></TableRow>
                    )}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
