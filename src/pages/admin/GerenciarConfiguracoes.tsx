import { useState, useEffect, useMemo } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { toast } from 'sonner';
import { Plus, Pencil, Trash2, Video, Search, Upload, Star, Loader2, X, Image as ImageIcon, Eye, EyeOff, Megaphone } from 'lucide-react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';

interface Configuracao {
  id: string;
  nome_modelo: string;
  preco_base: number;
  categoria: string | null;
  categorias: string[] | null;
  imagem_modelo: string | null;
  video_url: string | null;
  apresentacao_venda: string | null;
  garantia: string | null;
  prazo_entrega: string | null;
  aspect_ratio: string;
  visivel_catalogo: boolean;
  visivel_todas: boolean;
  ordem_catalogo: number;
}

interface CategoriaVisivel {
  id: string;
  categoria: string;
  visivel: boolean;
  visivel_todas: boolean;
  ordem: number;
}

interface Midia {
  id: string;
  nome_arquivo: string;
  url: string;
  visivel_catalogo: boolean;
}

interface BannerCatalogo {
  id: string;
  titulo: string | null;
  subtitulo: string | null;
  imagem_url: string;
  link: string | null;
  ordem: number;
  ativo: boolean;
}

const CATEGORIAS = ['Defesa', 'EDCs', 'EDC Mini', 'Campo', 'Cozinha', 'Churrasco', 'Kits', 'Utensílios', 'Vestuário', 'Cafés'];

export default function GerenciarConfiguracoes() {
  const [configuracoes, setConfiguracoes] = useState<Configuracao[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingConfig, setEditingConfig] = useState<Configuracao | null>(null);
  const [nomeModelo, setNomeModelo] = useState('');
  const [precoBase, setPrecoBase] = useState('');
  const [categoriasSelecionadas, setCategoriasSelecionadas] = useState<string[]>(['EDCs']);
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
  
  // Categorias visíveis
  const [categoriasVisiveis, setCategoriasVisiveis] = useState<CategoriaVisivel[]>([]);
  const [categoriasDialogOpen, setCategoriasDialogOpen] = useState(false);

  // Banners
  const [bannersDialogOpen, setBannersDialogOpen] = useState(false);
  const [banners, setBanners] = useState<BannerCatalogo[]>([]);
  const [bannerEditando, setBannerEditando] = useState<BannerCatalogo | null>(null);
  const [bannerTitulo, setBannerTitulo] = useState('');
  const [bannerSubtitulo, setBannerSubtitulo] = useState('');
  const [bannerLink, setBannerLink] = useState('');
  const [bannerOrdem, setBannerOrdem] = useState('0');
  const [bannerImagemFile, setBannerImagemFile] = useState<File | null>(null);
  const [bannerSalvando, setBannerSalvando] = useState(false);
  const [bannerFormOpen, setBannerFormOpen] = useState(false);

  useEffect(() => {
    fetchConfiguracoes();
    fetchCategoriasVisiveis();
    fetchBanners();
  }, []);

  const fetchBanners = async () => {
    const { data } = await supabase
      .from('banners_catalogo')
      .select('*')
      .order('ordem');
    if (data) setBanners(data as BannerCatalogo[]);
  };

  const handleSalvarBanner = async () => {
    if (!bannerImagemFile && !bannerEditando) {
      toast.error('Selecione uma imagem para o banner');
      return;
    }
    setBannerSalvando(true);

    let imagemUrl = bannerEditando?.imagem_url || '';

    if (bannerImagemFile) {
      const fileExt = bannerImagemFile.name.split('.').pop();
      const fileName = `banner-${Date.now()}.${fileExt}`;
      const { error: uploadError } = await supabase.storage
        .from('banners-catalogo')
        .upload(fileName, bannerImagemFile);
      if (uploadError) {
        toast.error('Erro ao enviar imagem');
        setBannerSalvando(false);
        return;
      }
      const { data: urlData } = supabase.storage.from('banners-catalogo').getPublicUrl(fileName);
      imagemUrl = urlData.publicUrl;
    }

    const bannerData = {
      titulo: bannerTitulo || null,
      subtitulo: bannerSubtitulo || null,
      imagem_url: imagemUrl,
      link: bannerLink || null,
      ordem: parseInt(bannerOrdem) || 0,
    };

    if (bannerEditando) {
      const { error } = await supabase.from('banners_catalogo').update(bannerData).eq('id', bannerEditando.id);
      if (error) toast.error('Erro ao atualizar banner');
      else toast.success('Banner atualizado!');
    } else {
      const { error } = await supabase.from('banners_catalogo').insert([{ ...bannerData, ativo: true }]);
      if (error) toast.error('Erro ao criar banner');
      else toast.success('Banner criado!');
    }

    resetBannerForm();
    fetchBanners();
    setBannerSalvando(false);
  };

  const deletarBanner = async (id: string) => {
    if (!confirm('Excluir este banner?')) return;
    await supabase.from('banners_catalogo').delete().eq('id', id);
    toast.success('Banner excluído');
    fetchBanners();
  };

  const toggleBannerAtivo = async (banner: BannerCatalogo) => {
    await supabase.from('banners_catalogo').update({ ativo: !banner.ativo }).eq('id', banner.id);
    setBanners(prev => prev.map(b => b.id === banner.id ? { ...b, ativo: !b.ativo } : b));
    toast.success(banner.ativo ? 'Banner desativado' : 'Banner ativado');
  };

  const editarBanner = (banner: BannerCatalogo) => {
    setBannerEditando(banner);
    setBannerTitulo(banner.titulo || '');
    setBannerSubtitulo(banner.subtitulo || '');
    setBannerLink(banner.link || '');
    setBannerOrdem(banner.ordem.toString());
    setBannerImagemFile(null);
    setBannerFormOpen(true);
  };

  const resetBannerForm = () => {
    setBannerEditando(null);
    setBannerTitulo('');
    setBannerSubtitulo('');
    setBannerLink('');
    setBannerOrdem('0');
    setBannerImagemFile(null);
    setBannerFormOpen(false);
  };

  const fetchCategoriasVisiveis = async () => {
    const { data, error } = await supabase
      .from('categorias_catalogo_visiveis')
      .select('*')
      .order('ordem');
    if (!error && data) setCategoriasVisiveis(data);
  };

  const toggleCategoriaVisivel = async (cat: CategoriaVisivel) => {
    const { error } = await supabase
      .from('categorias_catalogo_visiveis')
      .update({ visivel: !cat.visivel })
      .eq('id', cat.id);
    if (error) {
      toast.error('Erro ao alterar categoria');
      return;
    }
    setCategoriasVisiveis(prev => prev.map(c => c.id === cat.id ? { ...c, visivel: !c.visivel } : c));
    toast.success(cat.visivel ? `${cat.categoria} oculta do catálogo` : `${cat.categoria} visível no catálogo`);
  };

  const toggleVisivelTodas = async (cat: CategoriaVisivel) => {
    const { error } = await supabase
      .from('categorias_catalogo_visiveis')
      .update({ visivel_todas: !cat.visivel_todas })
      .eq('id', cat.id);
    if (error) {
      toast.error('Erro ao alterar configuração');
      return;
    }
    setCategoriasVisiveis(prev => prev.map(c => c.id === cat.id ? { ...c, visivel_todas: !c.visivel_todas } : c));
    toast.success(!cat.visivel_todas ? `${cat.categoria} aparecerá em "Todas"` : `${cat.categoria} removida de "Todas"`);
  };

  const toggleVisivelCatalogo = async (config: Configuracao) => {
    const { error } = await supabase
      .from('catalogo_modelos')
      .update({ visivel_catalogo: !config.visivel_catalogo })
      .eq('id', config.id);
    if (error) {
      toast.error('Erro ao alterar visibilidade');
      return;
    }
    setConfiguracoes(prev => prev.map(c => c.id === config.id ? { ...c, visivel_catalogo: !c.visivel_catalogo } : c));
    toast.success(config.visivel_catalogo ? 'Produto oculto do catálogo' : 'Produto visível no catálogo');
  };

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
      const matchesCategoria = categoriaFiltro === 'todas' || (config.categoria === categoriaFiltro) || ((config as any).categorias && (config as any).categorias.includes(categoriaFiltro));
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
      categoria: categoriasSelecionadas[0] || 'EDCs',
      categorias: categoriasSelecionadas,
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
    setCategoriasSelecionadas(config.categorias && config.categorias.length > 0 ? config.categorias : [config.categoria || 'EDCs']);
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
    setCategoriasSelecionadas(['EDCs']);
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
        <div className="flex gap-2 flex-wrap">
          <Button variant="outline" onClick={() => setBannersDialogOpen(true)}>
            <Megaphone className="mr-2 h-4 w-4" />
            Banners
          </Button>
          <Button variant="outline" onClick={() => setCategoriasDialogOpen(true)}>
            <Eye className="mr-2 h-4 w-4" />
            Categorias
          </Button>
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
                  <Label>Categorias</Label>
                  <div className="grid grid-cols-2 gap-1.5">
                    {CATEGORIAS.map((cat) => {
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
              const count = configuracoes.filter(c => c.categoria === cat || ((c as any).categorias && (c as any).categorias.includes(cat))).length;
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
          <Card key={config.id} className={`overflow-hidden ${!config.visivel_catalogo ? 'opacity-50' : ''}`}>
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
                  {!config.visivel_catalogo && <EyeOff className="h-3 w-3 text-muted-foreground flex-shrink-0" />}
                </h3>
                <div className="flex items-center gap-1.5 mt-0.5 flex-wrap">
                  <span className="text-[10px] bg-accent/20 px-1.5 py-0.5 rounded">{config.categoria}</span>
                  <span className="font-semibold text-accent text-xs">R$ {config.preco_base.toFixed(2)}</span>
                  <span className="text-[10px] text-muted-foreground">Ordem: </span>
                  <Input
                    type="number"
                    value={config.ordem_catalogo}
                    onChange={async (e) => {
                      const val = parseInt(e.target.value) || 0;
                      await supabase.from('catalogo_modelos').update({ ordem_catalogo: val }).eq('id', config.id);
                      setConfiguracoes(prev => prev.map(c => c.id === config.id ? { ...c, ordem_catalogo: val } : c));
                    }}
                    className="h-6 w-14 text-xs px-1"
                  />
                </div>
                {/* Botões inline */}
                <div className="flex gap-1.5 mt-1.5 flex-wrap">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => toggleVisivelCatalogo(config)}
                    className={`h-7 text-xs px-2 ${!config.visivel_catalogo ? 'text-muted-foreground' : ''}`}
                    title={config.visivel_catalogo ? 'Ocultar do catálogo' : 'Mostrar no catálogo'}
                  >
                    {config.visivel_catalogo ? <Eye className="h-3 w-3 mr-1" /> : <EyeOff className="h-3 w-3 mr-1" />}
                    {config.visivel_catalogo ? 'Visível' : 'Oculto'}
                  </Button>
                  <Button
                    variant={config.visivel_todas ? "outline" : "secondary"}
                    size="sm"
                    onClick={async () => {
                      const newVal = !config.visivel_todas;
                      await supabase.from('catalogo_modelos').update({ visivel_todas: newVal }).eq('id', config.id);
                      setConfiguracoes(prev => prev.map(c => c.id === config.id ? { ...c, visivel_todas: newVal } : c));
                      toast.success(newVal ? 'Aparecerá em "Todas"' : 'Removido de "Todas"');
                    }}
                    className="h-7 text-xs px-2"
                    title={config.visivel_todas ? 'Remover de "Todas"' : 'Exibir em "Todas"'}
                  >
                    {config.visivel_todas ? 'Em Todas' : 'Fora de Todas'}
                  </Button>
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

      {/* Dialog de Categorias Visíveis */}
      <Dialog open={categoriasDialogOpen} onOpenChange={setCategoriasDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Categorias do Catálogo</DialogTitle>
            <DialogDescription>
              Escolha quais categorias aparecem na tela inicial do catálogo público.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            {categoriasVisiveis.map((cat) => (
              <div key={cat.id} className="flex flex-col gap-2 py-2 px-3 rounded-lg border">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">{cat.categoria}</span>
                  <Switch
                    checked={cat.visivel}
                    onCheckedChange={() => toggleCategoriaVisivel(cat)}
                  />
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-xs text-muted-foreground">Exibir em "Todas"</span>
                  <Switch
                    checked={cat.visivel_todas}
                    onCheckedChange={() => toggleVisivelTodas(cat)}
                  />
                </div>
              </div>
            ))}
          </div>
        </DialogContent>
      </Dialog>

      {/* Dialog de Banners */}
      <Dialog open={bannersDialogOpen} onOpenChange={(open) => { setBannersDialogOpen(open); if (!open) resetBannerForm(); }}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Banners do Catálogo</DialogTitle>
            <DialogDescription>
              Gerencie banners promocionais exibidos no topo do catálogo público.
            </DialogDescription>
          </DialogHeader>

          {!bannerFormOpen ? (
            <div className="space-y-3">
              <Button onClick={() => setBannerFormOpen(true)} className="w-full">
                <Plus className="mr-2 h-4 w-4" />
                Novo Banner
              </Button>

              {banners.length === 0 ? (
                <p className="text-center text-muted-foreground text-sm py-4">Nenhum banner cadastrado</p>
              ) : (
                <div className="space-y-2">
                  {banners.map((banner) => (
                    <div key={banner.id} className={`flex items-center gap-3 p-3 rounded-lg border ${!banner.ativo ? 'opacity-50' : ''}`}>
                      <div className="w-24 h-14 rounded overflow-hidden bg-muted flex-shrink-0">
                        <img src={banner.imagem_url} alt={banner.titulo || 'Banner'} className="w-full h-full object-cover" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">{banner.titulo || 'Sem título'}</p>
                        {banner.subtitulo && <p className="text-xs text-muted-foreground truncate">{banner.subtitulo}</p>}
                        <span className="text-xs text-muted-foreground">Ordem: {banner.ordem}</span>
                      </div>
                      <div className="flex items-center gap-1.5 flex-shrink-0">
                        <Switch checked={banner.ativo} onCheckedChange={() => toggleBannerAtivo(banner)} />
                        <Button variant="outline" size="sm" className="h-7 px-2" onClick={() => editarBanner(banner)}>
                          <Pencil className="h-3 w-3" />
                        </Button>
                        <Button variant="destructive" size="sm" className="h-7 px-2" onClick={() => deletarBanner(banner.id)}>
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ) : (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Título (opcional)</Label>
                  <Input value={bannerTitulo} onChange={(e) => setBannerTitulo(e.target.value)} placeholder="Ex: Promoção de Verão" />
                </div>
                <div className="space-y-2">
                  <Label>Subtítulo (opcional)</Label>
                  <Input value={bannerSubtitulo} onChange={(e) => setBannerSubtitulo(e.target.value)} placeholder="Ex: Até 20% OFF" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Link (opcional)</Label>
                  <Input value={bannerLink} onChange={(e) => setBannerLink(e.target.value)} placeholder="https://..." />
                </div>
                <div className="space-y-2">
                  <Label>Ordem</Label>
                  <Input type="number" value={bannerOrdem} onChange={(e) => setBannerOrdem(e.target.value)} />
                </div>
              </div>
              <div className="space-y-2">
                <Label>Imagem do Banner</Label>
                <Input type="file" accept="image/*" onChange={(e) => setBannerImagemFile(e.target.files?.[0] || null)} />
                {bannerEditando?.imagem_url && !bannerImagemFile && (
                  <div className="w-full h-24 rounded overflow-hidden bg-muted">
                    <img src={bannerEditando.imagem_url} alt="Preview" className="w-full h-full object-cover" />
                  </div>
                )}
              </div>
              <div className="flex gap-2">
                <Button variant="outline" onClick={resetBannerForm} className="flex-1">Cancelar</Button>
                <Button onClick={handleSalvarBanner} disabled={bannerSalvando} className="flex-1">
                  {bannerSalvando ? 'Salvando...' : bannerEditando ? 'Atualizar' : 'Criar Banner'}
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
