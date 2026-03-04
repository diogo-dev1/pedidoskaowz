import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { toast } from 'sonner';
import { Plus, Pencil, Trash2 } from 'lucide-react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

interface OpcaoComponente {
  id: string;
  nome_opcao: string;
  tipo_opcao: 'Aço' | 'Empunhadura' | 'Acabamento' | 'Bainha' | 'Espaçador' | 'Variação' | 'Cor de Bainha' | 'Embalagem';
  preco_adicional: number;
}

interface ProdutoAdicional {
  id: string;
  nome_produto: string;
  preco_unitario: number;
}

const tiposOpcao = ['Aço', 'Empunhadura', 'Acabamento', 'Bainha', 'Espaçador', 'Variação', 'Cor de Bainha', 'Embalagem'] as const;

export default function GerenciarComponentes() {
  const [componentes, setComponentes] = useState<OpcaoComponente[]>([]);
  const [produtosAdicionais, setProdutosAdicionais] = useState<ProdutoAdicional[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [dialogProdutoOpen, setDialogProdutoOpen] = useState(false);
  const [editingComponente, setEditingComponente] = useState<OpcaoComponente | null>(null);
  const [editingProduto, setEditingProduto] = useState<ProdutoAdicional | null>(null);
  const [nomeOpcao, setNomeOpcao] = useState('');
  const [tipoOpcao, setTipoOpcao] = useState<typeof tiposOpcao[number]>('Aço');
  const [precoAdicional, setPrecoAdicional] = useState('');
  const [nomeProduto, setNomeProduto] = useState('');
  const [precoUnitario, setPrecoUnitario] = useState('');

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    const [componentesRes, produtosRes] = await Promise.all([
      supabase.from('opcoes_componentes').select('*').order('tipo_opcao').order('nome_opcao'),
      supabase.from('produtos_adicionais').select('*').order('nome_produto')
    ]);

    if (componentesRes.error) {
      toast.error('Erro ao carregar componentes');
      console.error(componentesRes.error);
    } else {
      setComponentes((componentesRes.data as OpcaoComponente[]) || []);
    }

    if (produtosRes.error) {
      toast.error('Erro ao carregar produtos');
      console.error(produtosRes.error);
    } else {
      setProdutosAdicionais((produtosRes.data as ProdutoAdicional[]) || []);
    }

    setLoading(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const componenteData = {
      nome_opcao: nomeOpcao,
      tipo_opcao: tipoOpcao,
      preco_adicional: parseFloat(precoAdicional),
    };

    if (editingComponente) {
      const { error } = await supabase
        .from('opcoes_componentes')
        .update(componenteData)
        .eq('id', editingComponente.id);

      if (error) {
        toast.error('Erro ao atualizar componente');
      } else {
        toast.success('Componente atualizado com sucesso!');
        setDialogOpen(false);
        resetForm();
        fetchData();
      }
    } else {
      const { error } = await supabase
        .from('opcoes_componentes')
        .insert([componenteData]);

      if (error) {
        toast.error('Erro ao criar componente');
      } else {
        toast.success('Componente criado com sucesso!');
        setDialogOpen(false);
        resetForm();
        fetchData();
      }
    }
  };

  const handleSubmitProduto = async (e: React.FormEvent) => {
    e.preventDefault();

    const produtoData = {
      nome_produto: nomeProduto,
      preco_unitario: parseFloat(precoUnitario),
    };

    if (editingProduto) {
      const { error } = await supabase
        .from('produtos_adicionais')
        .update(produtoData)
        .eq('id', editingProduto.id);

      if (error) {
        toast.error('Erro ao atualizar produto');
      } else {
        toast.success('Produto atualizado com sucesso!');
        setDialogProdutoOpen(false);
        resetFormProduto();
        fetchData();
      }
    } else {
      const { error } = await supabase
        .from('produtos_adicionais')
        .insert([produtoData]);

      if (error) {
        toast.error('Erro ao criar produto');
      } else {
        toast.success('Produto criado com sucesso!');
        setDialogProdutoOpen(false);
        resetFormProduto();
        fetchData();
      }
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Tem certeza que deseja excluir este componente?')) return;

    const { error } = await supabase
      .from('opcoes_componentes')
      .delete()
      .eq('id', id);

    if (error) {
      toast.error('Erro ao excluir componente');
    } else {
      toast.success('Componente excluído com sucesso!');
      fetchData();
    }
  };

  const handleDeleteProduto = async (id: string) => {
    if (!confirm('Tem certeza que deseja excluir este produto?')) return;

    const { error } = await supabase
      .from('produtos_adicionais')
      .delete()
      .eq('id', id);

    if (error) {
      toast.error('Erro ao excluir produto');
    } else {
      toast.success('Produto excluído com sucesso!');
      fetchData();
    }
  };

  const openEditDialog = (componente: OpcaoComponente) => {
    setEditingComponente(componente);
    setNomeOpcao(componente.nome_opcao);
    setTipoOpcao(componente.tipo_opcao);
    setPrecoAdicional(componente.preco_adicional.toString());
    setDialogOpen(true);
  };

  const openEditProduto = (produto: ProdutoAdicional) => {
    setEditingProduto(produto);
    setNomeProduto(produto.nome_produto);
    setPrecoUnitario(produto.preco_unitario.toString());
    setDialogProdutoOpen(true);
  };

  const resetForm = () => {
    setEditingComponente(null);
    setNomeOpcao('');
    setTipoOpcao('Aço');
    setPrecoAdicional('');
  };

  const resetFormProduto = () => {
    setEditingProduto(null);
    setNomeProduto('');
    setPrecoUnitario('');
  };

  const groupedComponentes = tiposOpcao.reduce((acc, tipo) => {
    acc[tipo] = componentes.filter(c => c.tipo_opcao === tipo);
    return acc;
  }, {} as Record<typeof tiposOpcao[number], OpcaoComponente[]>);

  if (loading) {
    return <div className="text-center py-8">Carregando...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="min-w-0">
        <h1 className="text-lg sm:text-2xl font-bold">Componentes</h1>
        <p className="text-muted-foreground text-xs sm:text-sm">Opções de personalização e produtos adicionais</p>
      </div>

      <Tabs defaultValue="componentes" className="w-full">
        <TabsList>
          <TabsTrigger value="componentes">Componentes</TabsTrigger>
          <TabsTrigger value="produtos">Produtos Adicionais</TabsTrigger>
        </TabsList>

        <TabsContent value="componentes" className="space-y-4">
          <div className="flex justify-end">
            <Dialog open={dialogOpen} onOpenChange={(open) => { setDialogOpen(open); if (!open) resetForm(); }}>
              <DialogTrigger asChild>
                <Button>
                  <Plus className="mr-2 h-4 w-4" />
                  Novo Componente
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>{editingComponente ? 'Editar' : 'Novo'} Componente</DialogTitle>
                  <DialogDescription>
                    Preencha os dados do componente personalizável
                  </DialogDescription>
                </DialogHeader>
                <form onSubmit={handleSubmit} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="tipo">Tipo de Componente</Label>
                    <Select value={tipoOpcao} onValueChange={(value: any) => setTipoOpcao(value)}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {tiposOpcao.map(tipo => (
                          <SelectItem key={tipo} value={tipo}>{tipo}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="nome">Nome da Opção</Label>
                    <Input
                      id="nome"
                      value={nomeOpcao}
                      onChange={(e) => setNomeOpcao(e.target.value)}
                      placeholder="Ex: Aço Inox 14C28N"
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="preco">Preço Adicional (R$)</Label>
                    <Input
                      id="preco"
                      type="number"
                      step="0.01"
                      value={precoAdicional}
                      onChange={(e) => setPrecoAdicional(e.target.value)}
                      placeholder="Ex: 50.00"
                      required
                    />
                  </div>
                  <Button type="submit" className="w-full">
                    Salvar
                  </Button>
                </form>
              </DialogContent>
            </Dialog>
          </div>

          <div className="space-y-4">
            {tiposOpcao.map((tipo) => (
              groupedComponentes[tipo].length > 0 && (
                <div key={tipo}>
                  <h2 className="text-sm font-semibold mb-2 flex items-center gap-2">
                    {tipo}
                    <Badge variant="secondary" className="text-[10px]">{groupedComponentes[tipo].length}</Badge>
                  </h2>
                  <div className="space-y-1">
                    {groupedComponentes[tipo].map((componente) => (
                      <div key={componente.id} className="flex items-center gap-3 p-2 rounded-lg border bg-card">
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium truncate">{componente.nome_opcao}</p>
                          <p className="text-xs text-muted-foreground">+ R$ {componente.preco_adicional.toFixed(2)}</p>
                        </div>
                        <div className="flex gap-1">
                          <Button variant="outline" size="sm" onClick={() => openEditDialog(componente)} className="h-7 text-xs px-2">
                            <Pencil className="h-3 w-3" />
                          </Button>
                          <Button variant="destructive" size="sm" onClick={() => handleDelete(componente.id)} className="h-7 text-xs px-2">
                            <Trash2 className="h-3 w-3" />
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )
            ))}
          </div>
        </TabsContent>

        <TabsContent value="produtos" className="space-y-4">
          <div className="flex justify-end">
            <Dialog open={dialogProdutoOpen} onOpenChange={(open) => { setDialogProdutoOpen(open); if (!open) resetFormProduto(); }}>
              <DialogTrigger asChild>
                <Button>
                  <Plus className="mr-2 h-4 w-4" />
                  Novo Produto
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>{editingProduto ? 'Editar' : 'Novo'} Produto Adicional</DialogTitle>
                  <DialogDescription>
                    Preencha os dados do produto adicional
                  </DialogDescription>
                </DialogHeader>
                <form onSubmit={handleSubmitProduto} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="nome-produto">Nome do Produto</Label>
                    <Input
                      id="nome-produto"
                      value={nomeProduto}
                      onChange={(e) => setNomeProduto(e.target.value)}
                      placeholder="Ex: Pedra de Amolar"
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="preco-unitario">Preço Unitário (R$)</Label>
                    <Input
                      id="preco-unitario"
                      type="number"
                      step="0.01"
                      value={precoUnitario}
                      onChange={(e) => setPrecoUnitario(e.target.value)}
                      placeholder="Ex: 25.00"
                      required
                    />
                  </div>
                  <Button type="submit" className="w-full">
                    Salvar
                  </Button>
                </form>
              </DialogContent>
            </Dialog>
          </div>

          <div className="space-y-1">
            {produtosAdicionais.map((produto) => (
              <div key={produto.id} className="flex items-center gap-3 p-2 rounded-lg border bg-card">
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{produto.nome_produto}</p>
                  <p className="text-xs text-muted-foreground">R$ {produto.preco_unitario.toFixed(2)} / un</p>
                </div>
                <div className="flex gap-1">
                  <Button variant="outline" size="sm" onClick={() => openEditProduto(produto)} className="h-7 text-xs px-2">
                    <Pencil className="h-3 w-3" />
                  </Button>
                  <Button variant="destructive" size="sm" onClick={() => handleDeleteProduto(produto.id)} className="h-7 text-xs px-2">
                    <Trash2 className="h-3 w-3" />
                  </Button>
                </div>
              </div>
            ))}
            {produtosAdicionais.length === 0 && (
              <div className="py-6 text-center text-muted-foreground text-sm">
                Nenhum produto adicional cadastrado.
              </div>
            )}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
