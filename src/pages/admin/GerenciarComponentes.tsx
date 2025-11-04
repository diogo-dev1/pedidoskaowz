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

interface OpcaoComponente {
  id: string;
  nome_opcao: string;
  tipo_opcao: 'Aço' | 'Empunhadura' | 'Acabamento' | 'Bainha';
  preco_adicional: number;
}

const tiposOpcao = ['Aço', 'Empunhadura', 'Acabamento', 'Bainha'] as const;

export default function GerenciarComponentes() {
  const [componentes, setComponentes] = useState<OpcaoComponente[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingComponente, setEditingComponente] = useState<OpcaoComponente | null>(null);
  const [nomeOpcao, setNomeOpcao] = useState('');
  const [tipoOpcao, setTipoOpcao] = useState<typeof tiposOpcao[number]>('Aço');
  const [precoAdicional, setPrecoAdicional] = useState('');

  useEffect(() => {
    fetchComponentes();
  }, []);

  const fetchComponentes = async () => {
    const { data, error } = await supabase
      .from('opcoes_componentes')
      .select('*')
      .order('tipo_opcao')
      .order('nome_opcao');

    if (error) {
      toast.error('Erro ao carregar componentes');
      console.error(error);
    } else {
      setComponentes((data as OpcaoComponente[]) || []);
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
        fetchComponentes();
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
        fetchComponentes();
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
      fetchComponentes();
    }
  };

  const openEditDialog = (componente: OpcaoComponente) => {
    setEditingComponente(componente);
    setNomeOpcao(componente.nome_opcao);
    setTipoOpcao(componente.tipo_opcao);
    setPrecoAdicional(componente.preco_adicional.toString());
    setDialogOpen(true);
  };

  const resetForm = () => {
    setEditingComponente(null);
    setNomeOpcao('');
    setTipoOpcao('Aço');
    setPrecoAdicional('');
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
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Gerenciar Componentes</h1>
          <p className="text-muted-foreground">Gerencie as opções de personalização</p>
        </div>
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

      <div className="space-y-6">
        {tiposOpcao.map((tipo) => (
          <div key={tipo}>
            <h2 className="text-xl font-semibold mb-3 flex items-center gap-2">
              {tipo}
              <Badge variant="secondary">{groupedComponentes[tipo].length}</Badge>
            </h2>
            <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
              {groupedComponentes[tipo].map((componente) => (
                <Card key={componente.id}>
                  <CardHeader>
                    <CardTitle className="text-base">{componente.nome_opcao}</CardTitle>
                    <CardDescription>+ R$ {componente.preco_adicional.toFixed(2)}</CardDescription>
                  </CardHeader>
                  <CardContent className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => openEditDialog(componente)}
                      className="flex-1"
                    >
                      <Pencil className="mr-2 h-3 w-3" />
                      Editar
                    </Button>
                    <Button
                      variant="destructive"
                      size="sm"
                      onClick={() => handleDelete(componente.id)}
                      className="flex-1"
                    >
                      <Trash2 className="mr-2 h-3 w-3" />
                      Excluir
                    </Button>
                  </CardContent>
                </Card>
              ))}
              {groupedComponentes[tipo].length === 0 && (
                <Card className="col-span-full">
                  <CardContent className="py-6 text-center text-muted-foreground">
                    Nenhum componente deste tipo cadastrado.
                  </CardContent>
                </Card>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
