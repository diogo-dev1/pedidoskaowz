import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { toast } from 'sonner';
import { Plus, Pencil, Trash2, Video } from 'lucide-react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';

interface Configuracao {
  id: string;
  nome_modelo: string;
  preco_base: number;
  categoria: string | null;
  imagem_modelo: string | null;
  video_url: string | null;
  apresentacao_venda: string | null;
  garantia: string | null;
  prazo_entrega: string | null;
}

export default function GerenciarConfiguracoes() {
  const [configuracoes, setConfiguracoes] = useState<Configuracao[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingConfig, setEditingConfig] = useState<Configuracao | null>(null);
  const [nomeModelo, setNomeModelo] = useState('');
  const [precoBase, setPrecoBase] = useState('');
  const [categoria, setCategoria] = useState<string>('EDC');
  const [apresentacaoVenda, setApresentacaoVenda] = useState('');
  const [garantia, setGarantia] = useState('');
  const [prazoEntrega, setPrazoEntrega] = useState('');
  const [imagemFile, setImagemFile] = useState<File | null>(null);
  const [videoFile, setVideoFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    fetchConfiguracoes();
  }, []);

  const fetchConfiguracoes = async () => {
    const { data, error } = await supabase
      .from('catalogo_modelos')
      .select('*')
      .order('nome_modelo');

    if (error) {
      toast.error('Erro ao carregar configurações');
      console.error(error);
    } else {
      setConfiguracoes(data || []);
    }
    setLoading(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setUploading(true);

    let imagemUrl = editingConfig?.imagem_modelo || null;
    let videoUrl = editingConfig?.video_url || null;

    // Upload da imagem se houver
    if (imagemFile) {
      const fileExt = imagemFile.name.split('.').pop();
      const fileName = `config-${Math.random()}.${fileExt}`;
      const { error: uploadError } = await supabase.storage
        .from('catalogo-midias')
        .upload(fileName, imagemFile);

      if (uploadError) {
        toast.error('Erro ao fazer upload da imagem');
        setUploading(false);
        return;
      }

      const { data: { publicUrl } } = supabase.storage
        .from('catalogo-midias')
        .getPublicUrl(fileName);

      imagemUrl = publicUrl;
    }

    // Upload do vídeo se houver
    if (videoFile) {
      const fileExt = videoFile.name.split('.').pop();
      const fileName = `videos/config-${Math.random()}.${fileExt}`;
      const { error: uploadError } = await supabase.storage
        .from('catalogo-midias')
        .upload(fileName, videoFile);

      if (uploadError) {
        toast.error('Erro ao fazer upload do vídeo');
        setUploading(false);
        return;
      }

      const { data: { publicUrl } } = supabase.storage
        .from('catalogo-midias')
        .getPublicUrl(fileName);

      videoUrl = publicUrl;
    }

    const configData = {
      nome_modelo: nomeModelo,
      preco_base: parseFloat(precoBase),
      categoria: categoria,
      imagem_modelo: imagemUrl,
      video_url: videoUrl,
      apresentacao_venda: apresentacaoVenda || null,
      garantia: garantia || null,
      prazo_entrega: prazoEntrega || null,
    };

    if (editingConfig) {
      const { error } = await supabase
        .from('catalogo_modelos')
        .update(configData)
        .eq('id', editingConfig.id);

      if (error) {
        toast.error('Erro ao atualizar configuração');
      } else {
        toast.success('Configuração atualizada com sucesso!');
        setDialogOpen(false);
        resetForm();
        fetchConfiguracoes();
      }
    } else {
      const { error } = await supabase
        .from('catalogo_modelos')
        .insert([configData]);

      if (error) {
        toast.error('Erro ao criar configuração');
      } else {
        toast.success('Configuração criada com sucesso!');
        setDialogOpen(false);
        resetForm();
        fetchConfiguracoes();
      }
    }

    setUploading(false);
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Tem certeza que deseja excluir esta configuração?')) return;

    const { error } = await supabase
      .from('catalogo_modelos')
      .delete()
      .eq('id', id);

    if (error) {
      toast.error('Erro ao excluir configuração');
    } else {
      toast.success('Configuração excluída com sucesso!');
      fetchConfiguracoes();
    }
  };

  const openEditDialog = (config: Configuracao) => {
    setEditingConfig(config);
    setNomeModelo(config.nome_modelo);
    setPrecoBase(config.preco_base.toString());
    setCategoria(config.categoria || 'EDC');
    setApresentacaoVenda(config.apresentacao_venda || '');
    setGarantia(config.garantia || '');
    setPrazoEntrega(config.prazo_entrega || '');
    setDialogOpen(true);
  };

  const resetForm = () => {
    setEditingConfig(null);
    setNomeModelo('');
    setPrecoBase('');
    setCategoria('EDC');
    setApresentacaoVenda('');
    setGarantia('');
    setPrazoEntrega('');
    setImagemFile(null);
    setVideoFile(null);
  };

  if (loading) {
    return <div className="text-center py-8">Carregando...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Gerenciar Configurações</h1>
          <p className="text-muted-foreground">
            Configurações específicas de lâminas do catálogo (ex: Adaga Full Size Sandvik SW)
          </p>
        </div>
        <Dialog open={dialogOpen} onOpenChange={(open) => { setDialogOpen(open); if (!open) resetForm(); }}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="mr-2 h-4 w-4" />
              Nova Configuração
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>{editingConfig ? 'Editar' : 'Nova'} Configuração</DialogTitle>
              <DialogDescription>
                Configure uma lâmina específica para o catálogo público
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="nome">Nome da Configuração</Label>
                  <Input
                    id="nome"
                    value={nomeModelo}
                    onChange={(e) => setNomeModelo(e.target.value)}
                    placeholder="Ex: Adaga Full Size Sandvik SW"
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
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="preco">Preço (R$)</Label>
                  <Input
                    id="preco"
                    type="number"
                    step="0.01"
                    value={precoBase}
                    onChange={(e) => setPrecoBase(e.target.value)}
                    placeholder="Ex: 890.00"
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="garantia">Garantia</Label>
                  <Input
                    id="garantia"
                    value={garantia}
                    onChange={(e) => setGarantia(e.target.value)}
                    placeholder="Ex: Vitalícia"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="prazoEntrega">Prazo de Entrega</Label>
                <Input
                  id="prazoEntrega"
                  value={prazoEntrega}
                  onChange={(e) => setPrazoEntrega(e.target.value)}
                  placeholder="Ex: 30 a 45 dias úteis"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="apresentacao">Apresentação de Venda</Label>
                <Textarea
                  id="apresentacao"
                  value={apresentacaoVenda}
                  onChange={(e) => setApresentacaoVenda(e.target.value)}
                  placeholder="Descrição detalhada para vendas..."
                  rows={4}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="imagem">Imagem</Label>
                  <Input
                    id="imagem"
                    type="file"
                    accept="image/*"
                    onChange={(e) => setImagemFile(e.target.files?.[0] || null)}
                  />
                  {editingConfig?.imagem_modelo && !imagemFile && (
                    <p className="text-xs text-muted-foreground">Já existe uma imagem.</p>
                  )}
                </div>
                <div className="space-y-2">
                  <Label htmlFor="video">Vídeo</Label>
                  <Input
                    id="video"
                    type="file"
                    accept="video/*,.mov,.MOV,.mp4,.MP4"
                    onChange={(e) => setVideoFile(e.target.files?.[0] || null)}
                  />
                  {editingConfig?.video_url && !videoFile && (
                    <p className="text-xs text-muted-foreground">Já existe um vídeo.</p>
                  )}
                </div>
              </div>

              <Button type="submit" disabled={uploading} className="w-full">
                {uploading ? 'Salvando...' : 'Salvar Configuração'}
              </Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {configuracoes.map((config) => (
          <Card key={config.id}>
            <CardHeader>
              {config.video_url ? (
                <video
                  src={config.video_url}
                  className="w-full h-48 object-cover rounded-md mb-4"
                  controls
                  muted
                />
              ) : config.imagem_modelo ? (
                <img
                  src={config.imagem_modelo}
                  alt={config.nome_modelo}
                  className="w-full h-48 object-cover rounded-md mb-4"
                />
              ) : (
                <div className="w-full h-48 bg-muted rounded-md mb-4 flex items-center justify-center">
                  <span className="text-muted-foreground text-sm">Sem mídia</span>
                </div>
              )}
              <CardTitle className="flex items-center gap-2 text-base">
                {config.nome_modelo}
                {config.video_url && <Video className="h-4 w-4 text-muted-foreground" />}
              </CardTitle>
              <CardDescription>
                <span className="text-xs bg-accent/20 px-2 py-1 rounded mr-2">{config.categoria}</span>
                <span className="font-semibold text-accent">R$ {config.preco_base.toFixed(2)}</span>
              </CardDescription>
            </CardHeader>
            <CardContent className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => openEditDialog(config)}
                className="flex-1"
              >
                <Pencil className="mr-2 h-4 w-4" />
                Editar
              </Button>
              <Button
                variant="destructive"
                size="sm"
                onClick={() => handleDelete(config.id)}
                className="flex-1"
              >
                <Trash2 className="mr-2 h-4 w-4" />
                Excluir
              </Button>
            </CardContent>
          </Card>
        ))}
      </div>

      {configuracoes.length === 0 && (
        <Card>
          <CardContent className="py-12 text-center">
            <p className="text-muted-foreground">Nenhuma configuração cadastrada ainda.</p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
