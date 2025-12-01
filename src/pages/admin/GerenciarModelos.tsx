import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { toast } from 'sonner';
import { Plus, Pencil, Trash2, Upload } from 'lucide-react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';

interface ModeloBase {
  id: string;
  nome_modelo: string;
  preco_base: number;
  categoria: string | null;
  imagem_modelo: string | null;
}

export default function GerenciarModelos() {
  const [modelos, setModelos] = useState<ModeloBase[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingModelo, setEditingModelo] = useState<ModeloBase | null>(null);
  const [nomeModelo, setNomeModelo] = useState('');
  const [precoBase, setPrecoBase] = useState('');
  const [categoria, setCategoria] = useState<string>('EDC');
  const [imagemFile, setImagemFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    fetchModelos();
  }, []);

  const fetchModelos = async () => {
    const { data, error } = await supabase
      .from('modelos')
      .select('*')
      .order('nome_modelo');

    if (error) {
      toast.error('Erro ao carregar modelos');
      console.error(error);
    } else {
      setModelos(data || []);
    }
    setLoading(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setUploading(true);

    let imagemUrl = editingModelo?.imagem_modelo || null;

    // Upload da imagem se houver
    if (imagemFile) {
      const fileExt = imagemFile.name.split('.').pop();
      const fileName = `${Math.random()}.${fileExt}`;
      const { error: uploadError } = await supabase.storage
        .from('modelo-imagens')
        .upload(fileName, imagemFile);

      if (uploadError) {
        toast.error('Erro ao fazer upload da imagem');
        setUploading(false);
        return;
      }

      const { data: { publicUrl } } = supabase.storage
        .from('modelo-imagens')
        .getPublicUrl(fileName);

      imagemUrl = publicUrl;
    }

    const modeloData = {
      nome_modelo: nomeModelo,
      preco_base: parseFloat(precoBase),
      categoria: categoria,
      imagem_modelo: imagemUrl,
    };

    if (editingModelo) {
      const { error } = await supabase
        .from('modelos')
        .update(modeloData)
        .eq('id', editingModelo.id);

      if (error) {
        toast.error('Erro ao atualizar modelo');
      } else {
        toast.success('Modelo atualizado com sucesso!');
        setDialogOpen(false);
        resetForm();
        fetchModelos();
      }
    } else {
      const { error } = await supabase
        .from('modelos')
        .insert([modeloData]);

      if (error) {
        toast.error('Erro ao criar modelo');
      } else {
        toast.success('Modelo criado com sucesso!');
        setDialogOpen(false);
        resetForm();
        fetchModelos();
      }
    }

    setUploading(false);
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Tem certeza que deseja excluir este modelo?')) return;

    const { error } = await supabase
      .from('modelos')
      .delete()
      .eq('id', id);

    if (error) {
      toast.error('Erro ao excluir modelo');
    } else {
      toast.success('Modelo excluído com sucesso!');
      fetchModelos();
    }
  };

  const openEditDialog = (modelo: ModeloBase) => {
    setEditingModelo(modelo);
    setNomeModelo(modelo.nome_modelo);
    setPrecoBase(modelo.preco_base.toString());
    setCategoria(modelo.categoria || 'EDC');
    setDialogOpen(true);
  };

  const resetForm = () => {
    setEditingModelo(null);
    setNomeModelo('');
    setPrecoBase('');
    setCategoria('EDC');
    setImagemFile(null);
  };

  if (loading) {
    return <div className="text-center py-8">Carregando...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Gerenciar Modelos</h1>
          <p className="text-muted-foreground">Gerencie os modelos base de lâminas</p>
        </div>
        <Dialog open={dialogOpen} onOpenChange={(open) => { setDialogOpen(open); if (!open) resetForm(); }}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="mr-2 h-4 w-4" />
              Novo Modelo
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{editingModelo ? 'Editar' : 'Novo'} Modelo</DialogTitle>
              <DialogDescription>
                Preencha os dados do modelo de lâmina
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="nome">Nome do Modelo</Label>
                <Input
                  id="nome"
                  value={nomeModelo}
                  onChange={(e) => setNomeModelo(e.target.value)}
                  placeholder="Ex: Adaga EDC, Jagunço, KZR-NIMBUS"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="categoria">Categoria</Label>
                <select
                  id="categoria"
                  value={categoria}
                  onChange={(e) => setCategoria(e.target.value)}
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  required
                >
                  <option value="EDC">EDC</option>
                  <option value="Adaga">Adaga</option>
                  <option value="Campo">Campo</option>
                  <option value="Cozinha">Cozinha</option>
                  <option value="Defesa">Defesa</option>
                  <option value="KZR">KZR</option>
                  <option value="Upsell">Upsell</option>
                  <option value="Customização">Customização</option>
                </select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="preco">Preço Base (R$)</Label>
                <Input
                  id="preco"
                  type="number"
                  step="0.01"
                  value={precoBase}
                  onChange={(e) => setPrecoBase(e.target.value)}
                  placeholder="Ex: 250.00"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="imagem">Imagem do Modelo</Label>
                <Input
                  id="imagem"
                  type="file"
                  accept="image/*"
                  onChange={(e) => setImagemFile(e.target.files?.[0] || null)}
                />
                {editingModelo?.imagem_modelo && !imagemFile && (
                  <p className="text-xs text-muted-foreground">Já existe uma imagem. Selecione outra para substituir.</p>
                )}
              </div>
              <Button type="submit" disabled={uploading} className="w-full">
                {uploading ? 'Salvando...' : 'Salvar'}
              </Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {modelos.map((modelo) => (
          <Card key={modelo.id}>
            <CardHeader>
              {modelo.imagem_modelo && (
                <img
                  src={modelo.imagem_modelo}
                  alt={modelo.nome_modelo}
                  className="w-full h-48 object-cover rounded-md mb-4"
                />
              )}
              <CardTitle>{modelo.nome_modelo}</CardTitle>
              <CardDescription>
                {modelo.categoria && <span className="text-xs bg-accent/20 px-2 py-1 rounded mr-2">{modelo.categoria}</span>}
                R$ {modelo.preco_base.toFixed(2)}
              </CardDescription>
            </CardHeader>
            <CardContent className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => openEditDialog(modelo)}
                className="flex-1"
              >
                <Pencil className="mr-2 h-4 w-4" />
                Editar
              </Button>
              <Button
                variant="destructive"
                size="sm"
                onClick={() => handleDelete(modelo.id)}
                className="flex-1"
              >
                <Trash2 className="mr-2 h-4 w-4" />
                Excluir
              </Button>
            </CardContent>
          </Card>
        ))}
      </div>

      {modelos.length === 0 && (
        <Card>
          <CardContent className="py-12 text-center">
            <p className="text-muted-foreground">Nenhum modelo cadastrado ainda.</p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
