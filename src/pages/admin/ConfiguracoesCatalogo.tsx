import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { toast } from 'sonner';
import { Plus, Pencil, Trash2, Upload, Loader2, Eye, EyeOff, Megaphone, Tags, DollarSign } from 'lucide-react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

interface CategoriaVisivel {
  id: string;
  categoria: string;
  visivel: boolean;
  visivel_todas: boolean;
  ordem: number;
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

export default function ConfiguracoesCatalogo() {
  // Categorias
  const [categoriasVisiveis, setCategoriasVisiveis] = useState<CategoriaVisivel[]>([]);

  // Banners
  const [banners, setBanners] = useState<BannerCatalogo[]>([]);
  const [bannerEditando, setBannerEditando] = useState<BannerCatalogo | null>(null);
  const [bannerTitulo, setBannerTitulo] = useState('');
  const [bannerSubtitulo, setBannerSubtitulo] = useState('');
  const [bannerLink, setBannerLink] = useState('');
  const [bannerOrdem, setBannerOrdem] = useState('0');
  const [bannerImagemFile, setBannerImagemFile] = useState<File | null>(null);
  const [bannerSalvando, setBannerSalvando] = useState(false);
  const [bannerFormOpen, setBannerFormOpen] = useState(false);

  // Preços
  const [exibirPrecos, setExibirPrecos] = useState(true);
  const [loadingPrecos, setLoadingPrecos] = useState(true);

  useEffect(() => {
    fetchCategoriasVisiveis();
    fetchBanners();
    fetchConfigPrecos();
  }, []);

  // --- Preços ---
  const fetchConfigPrecos = async () => {
    const { data } = await supabase
      .from('configuracoes_catalogo')
      .select('*')
      .eq('chave', 'exibir_precos')
      .single();
    if (data) setExibirPrecos(data.valor === 'true');
    setLoadingPrecos(false);
  };

  const toggleExibirPrecos = async () => {
    const newVal = !exibirPrecos;
    const { error } = await supabase
      .from('configuracoes_catalogo')
      .update({ valor: newVal.toString() })
      .eq('chave', 'exibir_precos');
    if (error) {
      toast.error('Erro ao alterar configuração');
      return;
    }
    setExibirPrecos(newVal);
    toast.success(newVal ? 'Preços visíveis no catálogo' : 'Preços ocultos do catálogo');
  };

  // --- Categorias ---
  const fetchCategoriasVisiveis = async () => {
    const { data } = await supabase
      .from('categorias_catalogo_visiveis')
      .select('*')
      .order('ordem');
    if (data) setCategoriasVisiveis(data);
  };

  const toggleCategoriaVisivel = async (cat: CategoriaVisivel) => {
    const { error } = await supabase
      .from('categorias_catalogo_visiveis')
      .update({ visivel: !cat.visivel })
      .eq('id', cat.id);
    if (error) { toast.error('Erro ao alterar categoria'); return; }
    setCategoriasVisiveis(prev => prev.map(c => c.id === cat.id ? { ...c, visivel: !c.visivel } : c));
    toast.success(cat.visivel ? `${cat.categoria} oculta` : `${cat.categoria} visível`);
  };

  const toggleVisivelTodas = async (cat: CategoriaVisivel) => {
    const { error } = await supabase
      .from('categorias_catalogo_visiveis')
      .update({ visivel_todas: !cat.visivel_todas })
      .eq('id', cat.id);
    if (error) { toast.error('Erro ao alterar configuração'); return; }
    setCategoriasVisiveis(prev => prev.map(c => c.id === cat.id ? { ...c, visivel_todas: !c.visivel_todas } : c));
    toast.success(!cat.visivel_todas ? `${cat.categoria} aparecerá em "Todas"` : `${cat.categoria} removida de "Todas"`);
  };

  // --- Banners ---
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
      const { error: uploadError } = await supabase.storage.from('banners-catalogo').upload(fileName, bannerImagemFile);
      if (uploadError) { toast.error('Erro ao enviar imagem'); setBannerSalvando(false); return; }
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
      if (error) toast.error('Erro ao atualizar'); else toast.success('Banner atualizado!');
    } else {
      const { error } = await supabase.from('banners_catalogo').insert([{ ...bannerData, ativo: true }]);
      if (error) toast.error('Erro ao criar'); else toast.success('Banner criado!');
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

  return (
    <div className="space-y-4 px-1">
      <div className="min-w-0">
        <h1 className="text-lg sm:text-2xl font-bold">Configurações do Catálogo</h1>
        <p className="text-muted-foreground text-xs sm:text-sm">
          Gerencie banners, categorias e exibição do catálogo público
        </p>
      </div>

      <Tabs defaultValue="geral" className="w-full">
        <TabsList className="w-full justify-start">
          <TabsTrigger value="geral" className="gap-1.5">
            <DollarSign className="h-3.5 w-3.5" />
            Geral
          </TabsTrigger>
          <TabsTrigger value="categorias" className="gap-1.5">
            <Tags className="h-3.5 w-3.5" />
            Categorias
          </TabsTrigger>
          <TabsTrigger value="banners" className="gap-1.5">
            <Megaphone className="h-3.5 w-3.5" />
            Banners
          </TabsTrigger>
        </TabsList>

        {/* Aba Geral */}
        <TabsContent value="geral" className="space-y-4 mt-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Exibição de Preços</CardTitle>
              <CardDescription>
                Quando desativado, os preços são substituídos por uma breve descrição do produto no catálogo.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium">
                    {exibirPrecos ? 'Preços visíveis' : 'Preços ocultos'}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {exibirPrecos 
                      ? 'Clientes veem valor integral, PIX e parcelamento' 
                      : 'Clientes veem apenas nome e descrição do produto'}
                  </p>
                </div>
                <Switch
                  checked={exibirPrecos}
                  onCheckedChange={toggleExibirPrecos}
                  disabled={loadingPrecos}
                />
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Aba Categorias */}
        <TabsContent value="categorias" className="space-y-3 mt-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Categorias do Catálogo</CardTitle>
              <CardDescription>
                Controle quais categorias aparecem na landing page e na visão "Todas".
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
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
            </CardContent>
          </Card>
        </TabsContent>

        {/* Aba Banners */}
        <TabsContent value="banners" className="space-y-3 mt-4">
          {!bannerFormOpen ? (
            <>
              <Button onClick={() => setBannerFormOpen(true)} className="w-full">
                <Plus className="mr-2 h-4 w-4" />
                Novo Banner
              </Button>

              {banners.length === 0 ? (
                <Card>
                  <CardContent className="py-8 text-center text-muted-foreground text-sm">
                    Nenhum banner cadastrado
                  </CardContent>
                </Card>
              ) : (
                <div className="space-y-2">
                  {banners.map((banner) => (
                    <Card key={banner.id} className={!banner.ativo ? 'opacity-50' : ''}>
                      <CardContent className="p-3">
                        <div className="flex items-center gap-3">
                          <div className="w-28 h-16 rounded overflow-hidden bg-muted flex-shrink-0">
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
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </>
          ) : (
            <Card>
              <CardHeader>
                <CardTitle className="text-base">{bannerEditando ? 'Editar Banner' : 'Novo Banner'}</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
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
              </CardContent>
            </Card>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
