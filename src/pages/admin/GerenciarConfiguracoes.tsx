import { useState, useEffect, useMemo } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { toast } from 'sonner';
import { Plus, Pencil, Trash2, Video, Search, Upload, Star, Loader2, X, Image as ImageIcon } from 'lucide-react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

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
  aspect_ratio: string;
}

interface Midia {
  id: string;
  nome_arquivo: string;
  url: string;
  visivel_catalogo: boolean;
}

const CATEGORIAS = ['EDC', 'Adaga', 'Campo', 'Cozinha', 'Defesa', 'KZR', 'Upsell'];

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
  const [aspectRatio, setAspectRatio] = useState('9/16');
  const [imagemFile, setImagemFile] = useState<File | null>(null);
  const [videoFile, setVideoFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);

  // Media management
  const [midiaDialogOpen, setMidiaDialogOpen] = useState(false);
  const [midiaConfig, setMidiaConfig] = useState<Configuracao | null>(null);
  const [midias, setMidias] = useState<Midia[]>([]);
  const [carregandoMidias, setCarregandoMidias] = useState(false);
  const [uploadandoMidia, setUploadandoMidia] = useState(false);
  
  // Filtros
  const [searchTerm, setSearchTerm] = useState('');
  const [categoriaFiltro, setCategoriaFiltro] = useState<string>('todas');

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

  const filteredConfiguracoes = useMemo(() => {
    return configuracoes.filter(config => {
      const matchesSearch = searchTerm.trim() === '' || 
        config.nome_modelo.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesCategoria = categoriaFiltro === 'todas' || config.categoria === categoriaFiltro;
      return matchesSearch && matchesCategoria;
    });
  }, [configuracoes, searchTerm, categoriaFiltro]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setUploading(true);

    let imagemUrl = editingConfig?.imagem_modelo || null;
    let videoUrl = editingConfig?.video_url || null;

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
      aspect_ratio: aspectRatio,
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
    setAspectRatio(config.aspect_ratio || '9/16');
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
    setAspectRatio('9/16');
    setImagemFile(null);
    setVideoFile(null);
  };

  // --- Media management functions ---
  const abrirMidiaDialog = (config: Configuracao) => {
    setMidiaConfig(config);
    setMidiaDialogOpen(true);
    carregarMidias(config.id);
  };

  const carregarMidias = async (modeloId: string) => {
    setCarregandoMidias(true);
    let allMidias: Midia[] = [];
    let from = 0;
    const pageSize = 1000;
    
    while (true) {
      const { data, error } = await supabase
        .from('midias_catalogo')
        .select('*')
        .eq('modelo_id', modeloId)
        .order('created_at', { ascending: false })
        .range(from, from + pageSize - 1);

      if (error) {
        console.error('Erro ao carregar mídias:', error);
        break;
      }
      
      allMidias = [...allMidias, ...(data || [])];
      if (!data || data.length < pageSize) break;
      from += pageSize;
    }

    setMidias(allMidias);
    setCarregandoMidias(false);
  };

  const handleUploadMidia = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!midiaConfig || !e.target.files?.length) return;

    setUploadandoMidia(true);
    const files = Array.from(e.target.files);

    for (const file of files) {
      const fileName = `${midiaConfig.id}/${Date.now()}-${file.name}`;
      const { error: uploadError } = await supabase.storage
        .from('catalogo-midias')
        .upload(fileName, file);

      if (uploadError) {
        toast.error(`Erro ao enviar ${file.name}`);
        continue;
      }

      const { data: urlData } = supabase.storage
        .from('catalogo-midias')
        .getPublicUrl(fileName);

      await supabase.from('midias_catalogo').insert({
        modelo_id: midiaConfig.id,
        nome_arquivo: fileName,
        url: urlData.publicUrl,
        visivel_catalogo: true,
      });
    }

    toast.success('Upload realizado!');
    carregarMidias(midiaConfig.id);
    setUploadandoMidia(false);
    e.target.value = '';
  };

  const definirComoCapa = async (midia: Midia) => {
    if (!midiaConfig) return;

    const isVideo = midia.nome_arquivo.match(/\.(mp4|webm|mov|avi)$/i);

    const updateData: Record<string, string | null> = {};
    if (isVideo) {
      updateData.video_url = midia.url;
      updateData.imagem_modelo = null;
    } else {
      updateData.imagem_modelo = midia.url;
      updateData.video_url = null;
    }

    const { error } = await supabase
      .from('catalogo_modelos')
      .update(updateData)
      .eq('id', midiaConfig.id);

    if (error) {
      toast.error('Erro ao definir capa');
      return;
    }

    setMidiaConfig(prev => prev ? { ...prev, ...updateData } : null);
    toast.success('Capa definida com sucesso!');
    fetchConfiguracoes();
  };

  const deletarMidia = async (midia: Midia) => {
    await supabase.storage.from('catalogo-midias').remove([midia.nome_arquivo]);
    const { error } = await supabase.from('midias_catalogo').delete().eq('id', midia.id);

    if (error) {
      toast.error('Erro ao deletar mídia');
      return;
    }

    setMidias(prev => prev.filter(m => m.id !== midia.id));
    toast.success('Mídia removida');
  };

  if (loading) {
    return <div className="text-center py-8">Carregando...</div>;
  }

  return (
    <div className="space-y-4 px-1">
      <div className="flex flex-col gap-3 sm:flex-row sm:justify-between sm:items-center">
        <div className="min-w-0">
          <h1 className="text-lg sm:text-2xl font-bold">Configurações</h1>
          <p className="text-muted-foreground text-xs sm:text-sm">
            Configurações de lâminas do catálogo
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
                    {CATEGORIAS.map(cat => (
                      <option key={cat} value={cat}>{cat}</option>
                    ))}
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

              <div className="grid grid-cols-2 gap-4">
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
                  <Label htmlFor="aspectRatio">Proporção da Imagem</Label>
                  <select
                    id="aspectRatio"
                    value={aspectRatio}
                    onChange={(e) => setAspectRatio(e.target.value)}
                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  >
                    <option value="9/16">Vertical (9:16)</option>
                    <option value="3/4">Retrato (3:4)</option>
                    <option value="1/1">Quadrado (1:1)</option>
                    <option value="4/3">Paisagem (4:3)</option>
                    <option value="16/9">Horizontal (16:9)</option>
                  </select>
                </div>
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

      {/* Filtros */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar por nome..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>
        <Select value={categoriaFiltro} onValueChange={setCategoriaFiltro}>
          <SelectTrigger className="w-full sm:w-[180px]">
            <SelectValue placeholder="Categoria" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="todas">Todas ({configuracoes.length})</SelectItem>
            {CATEGORIAS.map(cat => {
              const count = configuracoes.filter(c => c.categoria === cat).length;
              return (
                <SelectItem key={cat} value={cat}>
                  {cat} ({count})
                </SelectItem>
              );
            })}
          </SelectContent>
        </Select>
      </div>

      <div className="grid gap-3 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
        {filteredConfiguracoes.map((config) => (
          <Card key={config.id} className="overflow-hidden">
            <div className="flex items-center gap-3 p-3">
              {/* Thumbnail compacto */}
              <div className="w-16 h-16 flex-shrink-0 rounded-md overflow-hidden bg-muted">
                {config.video_url ? (
                  <video
                    src={config.video_url}
                    className="w-full h-full object-cover"
                    muted
                  />
                ) : config.imagem_modelo ? (
                  <img
                    src={config.imagem_modelo}
                    alt={config.nome_modelo}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center">
                    <span className="text-muted-foreground text-[10px]">Sem mídia</span>
                  </div>
                )}
              </div>

              {/* Info */}
              <div className="flex-1 min-w-0">
                <h3 className="font-semibold text-sm truncate flex items-center gap-1">
                  {config.nome_modelo}
                  {config.video_url && <Video className="h-3 w-3 text-muted-foreground flex-shrink-0" />}
                </h3>
                <div className="flex items-center gap-1.5 mt-0.5">
                  <span className="text-[10px] bg-accent/20 px-1.5 py-0.5 rounded">{config.categoria}</span>
                  <span className="font-semibold text-accent text-xs">R$ {config.preco_base.toFixed(2)}</span>
                </div>
                {/* Botões inline */}
                <div className="flex gap-1.5 mt-1.5">
                  <Button variant="outline" size="sm" onClick={() => abrirMidiaDialog(config)} className="h-7 text-xs px-2">
                    <ImageIcon className="h-3 w-3 mr-1" />
                    Mídias
                  </Button>
                  <Button variant="outline" size="sm" onClick={() => openEditDialog(config)} className="h-7 text-xs px-2">
                    <Pencil className="h-3 w-3 mr-1" />
                    Editar
                  </Button>
                  <Button variant="destructive" size="sm" onClick={() => handleDelete(config.id)} className="h-7 text-xs px-2">
                    <Trash2 className="h-3 w-3" />
                  </Button>
                </div>
              </div>
            </div>
          </Card>
        ))}
      </div>

      {filteredConfiguracoes.length === 0 && (
        <Card>
          <CardContent className="py-12 text-center">
            <p className="text-muted-foreground">
              {searchTerm || categoriaFiltro !== 'todas' 
                ? 'Nenhuma configuração encontrada com os filtros aplicados.' 
                : 'Nenhuma configuração cadastrada ainda.'}
            </p>
          </CardContent>
        </Card>
      )}

      {/* Dialog de Mídias */}
      <Dialog open={midiaDialogOpen} onOpenChange={setMidiaDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Mídias - {midiaConfig?.nome_modelo}</DialogTitle>
            <DialogDescription>
              Gerencie fotos e vídeos. Escolha a capa e controle a visibilidade no catálogo.
            </DialogDescription>
          </DialogHeader>

          {/* Upload */}
          <div className="flex items-center gap-2">
            <Label
              htmlFor="upload-midias"
              className="flex-1 flex items-center justify-center gap-2 border-2 border-dashed border-border rounded-lg p-4 cursor-pointer hover:border-accent transition-colors"
            >
              {uploadandoMidia ? (
                <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
              ) : (
                <Upload className="h-5 w-5 text-muted-foreground" />
              )}
              <span className="text-sm text-muted-foreground">
                {uploadandoMidia ? 'Enviando...' : 'Clique para enviar fotos ou vídeos'}
              </span>
            </Label>
            <Input
              id="upload-midias"
              type="file"
              accept="image/*,video/*"
              multiple
              onChange={handleUploadMidia}
              className="hidden"
              disabled={uploadandoMidia}
            />
          </div>

          {/* Capa atual */}
          {midiaConfig && (midiaConfig.imagem_modelo || midiaConfig.video_url) && (
            <div className="space-y-2">
              <p className="text-sm font-medium text-muted-foreground">Capa atual:</p>
              <div className="w-24 h-24 rounded-lg overflow-hidden ring-2 ring-accent bg-muted">
                {midiaConfig.imagem_modelo ? (
                  <img src={midiaConfig.imagem_modelo} alt="Capa" className="w-full h-full object-contain" />
                ) : midiaConfig.video_url ? (
                  <video src={midiaConfig.video_url} className="w-full h-full object-contain" muted />
                ) : null}
              </div>
            </div>
          )}

          {/* Grid de mídias */}
          {carregandoMidias ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : midias.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground text-sm">
              Nenhuma mídia enviada ainda
            </div>
          ) : (
            <div className="grid grid-cols-3 gap-3">
              {midias.map((midia) => {
                const isVideo = midia.nome_arquivo.match(/\.(mp4|webm|mov|avi)$/i);
                const isCapa = midiaConfig?.imagem_modelo === midia.url || midiaConfig?.video_url === midia.url;

                return (
                  <div
                    key={midia.id}
                    className={`relative group aspect-square rounded-lg overflow-hidden border-2 transition-all ${
                      isCapa ? 'border-accent' : midia.visivel_catalogo ? 'border-transparent hover:border-border' : 'border-transparent opacity-50 hover:border-border'
                    }`}
                  >
                    {isVideo ? (
                      <video src={midia.url} className="w-full h-full object-contain bg-muted" muted />
                    ) : (
                      <img src={midia.url} alt="" className="w-full h-full object-contain bg-muted" />
                    )}

                    {isCapa && (
                      <div className="absolute top-1 left-1 bg-accent rounded-full p-1">
                        <Star className="h-3 w-3 text-accent-foreground fill-current" />
                      </div>
                    )}

                    {!midia.visivel_catalogo && (
                      <div className="absolute top-1 right-1 bg-destructive rounded-full px-1.5 py-0.5">
                        <span className="text-[9px] text-destructive-foreground font-medium">Oculto</span>
                      </div>
                    )}

                    {/* Overlay com ações */}
                    <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center gap-1.5">
                      {!isCapa && (
                        <Button
                          size="sm"
                          variant="secondary"
                          className="h-7 text-xs w-24"
                          onClick={() => definirComoCapa(midia)}
                        >
                          <Star className="h-3 w-3 mr-1" />
                          Capa
                        </Button>
                      )}
                      <Button
                        size="sm"
                        variant={midia.visivel_catalogo ? "outline" : "secondary"}
                        className="h-7 text-xs w-24"
                        onClick={async () => {
                          const { error } = await supabase
                            .from('midias_catalogo')
                            .update({ visivel_catalogo: !midia.visivel_catalogo })
                            .eq('id', midia.id);
                          if (error) {
                            toast.error('Erro ao alterar visibilidade');
                            return;
                          }
                          setMidias(prev => prev.map(m => m.id === midia.id ? { ...m, visivel_catalogo: !m.visivel_catalogo } : m));
                          toast.success(midia.visivel_catalogo ? 'Oculto do catálogo' : 'Visível no catálogo');
                        }}
                      >
                        {midia.visivel_catalogo ? 'Ocultar' : 'Mostrar'}
                      </Button>
                      <Button
                        size="sm"
                        variant="destructive"
                        className="h-7 text-xs w-24"
                        onClick={() => deletarMidia(midia)}
                      >
                        <X className="h-3 w-3 mr-1" />
                        Excluir
                      </Button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
