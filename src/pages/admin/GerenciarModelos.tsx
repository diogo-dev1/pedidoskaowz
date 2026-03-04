import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { toast } from 'sonner';
import { Plus, Pencil, Trash2 } from 'lucide-react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';

interface ModeloBase {
  id: string;
  nome_modelo: string;
  preco_base: number;
  categoria: string | null;
  categorias: string[] | null;
  imagem_modelo: string | null;
}

const TODAS_CATEGORIAS = ['Defesa', "EDC's", 'EDC Mini', 'Campo', 'Cozinha', 'Churrasco', 'Kits', 'Utensílios', 'Vestuário', 'Cafés'];

export default function GerenciarModelos() {
  const [modelos, setModelos] = useState<ModeloBase[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingModelo, setEditingModelo] = useState<ModeloBase | null>(null);
  const [nomeModelo, setNomeModelo] = useState('');
  const [precoBase, setPrecoBase] = useState('');
  const [categoriasSelecionadas, setCategoriasSelecionadas] = useState<string[]>(['EDC']);
  const [svgFile, setSvgFile] = useState<File | null>(null);
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

    let svgUrl = editingModelo?.imagem_modelo || null;

    // Upload do SVG se houver
    if (svgFile) {
      const fileName = `svg-${Math.random()}.svg`;
      const { error: uploadError } = await supabase.storage
        .from('modelo-imagens')
        .upload(fileName, svgFile, {
          contentType: 'image/svg+xml'
        });

      if (uploadError) {
        toast.error('Erro ao fazer upload do SVG');
        setUploading(false);
        return;
      }

      const { data: { publicUrl } } = supabase.storage
        .from('modelo-imagens')
        .getPublicUrl(fileName);

      svgUrl = publicUrl;
    }

    const modeloData = {
      nome_modelo: nomeModelo,
      preco_base: parseFloat(precoBase),
      categoria: categoriasSelecionadas[0] || 'EDC',
      categorias: categoriasSelecionadas,
      imagem_modelo: svgUrl,
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
    setCategoriasSelecionadas(modelo.categorias && modelo.categorias.length > 0 ? modelo.categorias : [modelo.categoria || 'EDC']);
    setDialogOpen(true);
  };

  const resetForm = () => {
    setEditingModelo(null);
    setNomeModelo('');
    setPrecoBase('');
    setCategoriasSelecionadas(['EDC']);
    setSvgFile(null);
  };

  if (loading) {
    return <div className="text-center py-8">Carregando...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:justify-between sm:items-center">
        <div className="min-w-0">
          <h1 className="text-lg sm:text-2xl font-bold">Modelos Base</h1>
          <p className="text-muted-foreground text-xs sm:text-sm">Modelos usados na customização de lâminas</p>
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
                Modelo base para customização de lâminas
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="nome">Nome do Modelo</Label>
                <Input
                  id="nome"
                  value={nomeModelo}
                  onChange={(e) => setNomeModelo(e.target.value)}
                  placeholder="Ex: EDC, Jagunço, KZR-NIMBUS"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label>Categorias</Label>
                <div className="grid grid-cols-2 gap-2">
                  {TODAS_CATEGORIAS.map((cat) => {
                    const checked = categoriasSelecionadas.includes(cat);
                    return (
                      <label key={cat} className="flex items-center gap-2 text-sm cursor-pointer">
                        <input
                          type="checkbox"
                          checked={checked}
                          onChange={() => {
                            setCategoriasSelecionadas(prev =>
                              checked ? prev.filter(c => c !== cat) : [...prev, cat]
                            );
                          }}
                          className="rounded border-input"
                        />
                        {cat}
                      </label>
                    );
                  })}
                </div>
                {categoriasSelecionadas.length === 0 && (
                  <p className="text-xs text-destructive">Selecione ao menos uma categoria</p>
                )}
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
                <Label htmlFor="svg">Arquivo SVG</Label>
                <Input
                  id="svg"
                  type="file"
                  accept=".svg"
                  onChange={(e) => setSvgFile(e.target.files?.[0] || null)}
                />
                <p className="text-xs text-muted-foreground">
                  Upload do desenho vetorial (SVG) do modelo
                </p>
                {editingModelo?.imagem_modelo && !svgFile && (
                  <p className="text-xs text-accent">Já existe um SVG. Selecione outro para substituir.</p>
                )}
              </div>
              <Button type="submit" disabled={uploading} className="w-full">
                {uploading ? 'Salvando...' : 'Salvar'}
              </Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid gap-3 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
        {modelos.map((modelo) => (
          <Card key={modelo.id} className="overflow-hidden">
            <div className="flex items-center gap-3 p-3">
              <div className="w-14 h-14 flex-shrink-0 rounded-md overflow-hidden bg-muted">
                {modelo.imagem_modelo ? (
                  <img
                    src={modelo.imagem_modelo}
                    alt={modelo.nome_modelo}
                    className="w-full h-full object-contain"
                    style={{ filter: 'invert(1)' }}
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center">
                    <span className="text-muted-foreground text-[10px]">Sem SVG</span>
                  </div>
                )}
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="font-semibold text-sm truncate">{modelo.nome_modelo}</h3>
                <div className="flex flex-wrap gap-1 mt-0.5">
                  {(modelo.categorias && modelo.categorias.length > 0 ? modelo.categorias : modelo.categoria ? [modelo.categoria] : []).map(cat => (
                    <span key={cat} className="text-[10px] bg-accent/20 px-1.5 py-0.5 rounded">{cat}</span>
                  ))}
                </div>
                <p className="text-xs font-semibold text-accent mt-0.5">R$ {modelo.preco_base.toFixed(2)}</p>
                <div className="flex gap-1.5 mt-1.5">
                  <Button variant="outline" size="sm" onClick={() => openEditDialog(modelo)} className="h-7 text-xs px-2">
                    <Pencil className="h-3 w-3 mr-1" /> Editar
                  </Button>
                  <Button variant="destructive" size="sm" onClick={() => handleDelete(modelo.id)} className="h-7 text-xs px-2">
                    <Trash2 className="h-3 w-3" />
                  </Button>
                </div>
              </div>
            </div>
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
