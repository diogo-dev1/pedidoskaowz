import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { toast } from 'sonner';
import { Plus, Pencil, Trash2, Upload, Loader2, Eye, EyeOff, Megaphone, Tags, DollarSign, Star, ArrowUp, ArrowDown, X } from 'lucide-react';
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

interface ModeloCatalogo {
  id: string;
  nome_modelo: string;
  imagem_modelo: string | null;
  preco_base: number;
  ordem_catalogo: number;
  visivel_todas: boolean;
  categorias: string[] | null;
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

  // Formas de pagamento
  const [exibirFormasPagamento, setExibirFormasPagamento] = useState(true);
  const [descontoPix, setDescontoPix] = useState('5');
  const [textoPix, setTextoPix] = useState('no PIX');
  const [textoParcelamento, setTextoParcelamento] = useState('3x sem juros ou até 12x no cartão');
  const [loadingPagamento, setLoadingPagamento] = useState(true);
  const [salvandoPagamento, setSalvandoPagamento] = useState(false);

  // Destaques "Todas"
  const [todosModelos, setTodosModelos] = useState<ModeloCatalogo[]>([]);
  const [destaquesIds, setDestaquesIds] = useState<string[]>([]);
  const [salvandoDestaques, setSalvandoDestaques] = useState(false);

  useEffect(() => {
    fetchCategoriasVisiveis();
    fetchBanners();
    fetchConfigPrecos();
    fetchConfigPagamento();
    fetchModelosParaDestaques();
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

  // --- Formas de Pagamento ---
  const fetchConfigPagamento = async () => {
    const { data } = await supabase
      .from('configuracoes_catalogo')
      .select('*')
      .in('chave', ['exibir_formas_pagamento', 'desconto_pix', 'texto_pix', 'texto_parcelamento']);
    if (data) {
      data.forEach(d => {
        if (d.chave === 'exibir_formas_pagamento') setExibirFormasPagamento(d.valor === 'true');
        if (d.chave === 'desconto_pix') setDescontoPix(d.valor);
        if (d.chave === 'texto_pix') setTextoPix(d.valor);
        if (d.chave === 'texto_parcelamento') setTextoParcelamento(d.valor);
      });
    }
    setLoadingPagamento(false);
  };

  const toggleFormasPagamento = async () => {
    const newVal = !exibirFormasPagamento;
    const { error } = await supabase
      .from('configuracoes_catalogo')
      .update({ valor: newVal.toString() })
      .eq('chave', 'exibir_formas_pagamento');
    if (error) { toast.error('Erro ao alterar configuração'); return; }
    setExibirFormasPagamento(newVal);
    toast.success(newVal ? 'Formas de pagamento visíveis' : 'Formas de pagamento ocultas');
  };

  const salvarConfigPagamento = async () => {
    setSalvandoPagamento(true);
    try {
      await Promise.all([
        supabase.from('configuracoes_catalogo').update({ valor: descontoPix }).eq('chave', 'desconto_pix'),
        supabase.from('configuracoes_catalogo').update({ valor: textoPix }).eq('chave', 'texto_pix'),
        supabase.from('configuracoes_catalogo').update({ valor: textoParcelamento }).eq('chave', 'texto_parcelamento'),
      ]);
      toast.success('Configurações de pagamento salvas!');
    } catch {
      toast.error('Erro ao salvar');
    } finally {
      setSalvandoPagamento(false);
    }
  };

  // --- Destaques ---
  const fetchModelosParaDestaques = async () => {
    const { data } = await supabase
      .from('catalogo_modelos')
      .select('id, nome_modelo, imagem_modelo, preco_base, ordem_catalogo, visivel_todas, categorias')
      .eq('visivel_catalogo', true)
      .order('ordem_catalogo');
    if (data) {
      setTodosModelos(data);
      // Os que já estão com ordem < 999 e visivel_todas são os destaques atuais
      const atuais = data
        .filter(m => m.visivel_todas && m.ordem_catalogo < 999)
        .sort((a, b) => a.ordem_catalogo - b.ordem_catalogo)
        .slice(0, 10)
        .map(m => m.id);
      setDestaquesIds(atuais);
    }
  };

  const adicionarDestaque = (id: string) => {
    if (destaquesIds.length >= 10) {
      toast.error('Máximo de 10 destaques atingido');
      return;
    }
    if (destaquesIds.includes(id)) return;
    setDestaquesIds(prev => [...prev, id]);
  };

  const removerDestaque = (id: string) => {
    setDestaquesIds(prev => prev.filter(d => d !== id));
  };

  const moverDestaque = (index: number, direction: 'up' | 'down') => {
    const newList = [...destaquesIds];
    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= newList.length) return;
    [newList[index], newList[targetIndex]] = [newList[targetIndex], newList[index]];
    setDestaquesIds(newList);
  };

  const salvarDestaques = async () => {
    setSalvandoDestaques(true);
    try {
      // Reset all to ordem 999
      const { error: resetError } = await supabase
        .from('catalogo_modelos')
        .update({ ordem_catalogo: 999 })
        .neq('id', '00000000-0000-0000-0000-000000000000'); // update all

      if (resetError) throw resetError;

      // Set ordem for selected destaques
      for (let i = 0; i < destaquesIds.length; i++) {
        const { error } = await supabase
          .from('catalogo_modelos')
          .update({ ordem_catalogo: i + 1, visivel_todas: true })
          .eq('id', destaquesIds[i]);
        if (error) throw error;
      }

      toast.success('Destaques salvos com sucesso!');
      fetchModelosParaDestaques();
    } catch (error) {
      toast.error('Erro ao salvar destaques');
    } finally {
      setSalvandoDestaques(false);
    }
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
        <TabsList className="w-full justify-start flex-wrap">
          <TabsTrigger value="geral" className="gap-1.5">
            <DollarSign className="h-3.5 w-3.5" />
            Geral
          </TabsTrigger>
          <TabsTrigger value="destaques" className="gap-1.5">
            <Star className="h-3.5 w-3.5" />
            Destaques
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
                Quando desativado, os valores são removidos dos cards e da página de detalhes do produto.
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
                      ? 'Clientes veem o valor dos produtos' 
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

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Formas de Pagamento</CardTitle>
              <CardDescription>
                Ative/desative e edite as informações de PIX e parcelamento exibidas no catálogo.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium">
                    {exibirFormasPagamento ? 'Formas de pagamento visíveis' : 'Formas de pagamento ocultas'}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Informações de PIX e parcelamento nos cards e detalhes
                  </p>
                </div>
                <Switch
                  checked={exibirFormasPagamento}
                  onCheckedChange={toggleFormasPagamento}
                  disabled={loadingPagamento}
                />
              </div>

              {exibirFormasPagamento && (
                <div className="space-y-3 pt-2 border-t">
                  <div className="space-y-1.5">
                    <Label className="text-xs">Desconto PIX (%)</Label>
                    <Input
                      type="number"
                      value={descontoPix}
                      onChange={e => setDescontoPix(e.target.value)}
                      placeholder="5"
                      className="h-8"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs">Texto do PIX</Label>
                    <Input
                      value={textoPix}
                      onChange={e => setTextoPix(e.target.value)}
                      placeholder="no PIX"
                      className="h-8"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs">Texto do Parcelamento</Label>
                    <Input
                      value={textoParcelamento}
                      onChange={e => setTextoParcelamento(e.target.value)}
                      placeholder="3x sem juros ou até 12x no cartão"
                      className="h-8"
                    />
                  </div>
                  <Button
                    size="sm"
                    onClick={salvarConfigPagamento}
                    disabled={salvandoPagamento}
                    className="w-full"
                  >
                    {salvandoPagamento ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Salvando...</> : 'Salvar configurações de pagamento'}
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Aba Destaques */}
        <TabsContent value="destaques" className="space-y-4 mt-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Primeiras 10 Lâminas em "Todas"</CardTitle>
              <CardDescription>
                Selecione e ordene as 10 primeiras lâminas que aparecem quando o cliente clica em "Ver todo o catálogo".
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Lista de destaques selecionados */}
              <div className="space-y-2">
                <Label className="text-sm font-semibold">Selecionadas ({destaquesIds.length}/10)</Label>
                {destaquesIds.length === 0 && (
                  <p className="text-xs text-muted-foreground py-4 text-center">Nenhuma lâmina selecionada. Escolha abaixo.</p>
                )}
                {destaquesIds.map((id, index) => {
                  const modelo = todosModelos.find(m => m.id === id);
                  if (!modelo) return null;
                  return (
                    <div key={id} className="flex items-center gap-2 p-2 rounded-lg border bg-muted/30">
                      <span className="text-xs font-bold text-accent w-6 text-center">{index + 1}º</span>
                      {modelo.imagem_modelo && (
                        <img src={modelo.imagem_modelo} alt="" className="w-8 h-8 rounded object-cover" />
                      )}
                      <span className="text-sm flex-1 truncate">{modelo.nome_modelo}</span>
                      <div className="flex items-center gap-1">
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-7 w-7 p-0"
                          disabled={index === 0}
                          onClick={() => moverDestaque(index, 'up')}
                        >
                          <ArrowUp className="h-3.5 w-3.5" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-7 w-7 p-0"
                          disabled={index === destaquesIds.length - 1}
                          onClick={() => moverDestaque(index, 'down')}
                        >
                          <ArrowDown className="h-3.5 w-3.5" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-7 w-7 p-0 text-destructive hover:text-destructive"
                          onClick={() => removerDestaque(id)}
                        >
                          <X className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Lista de todos os modelos para adicionar */}
              <div className="space-y-2">
                <Label className="text-sm font-semibold">Adicionar lâminas</Label>
                <div className="max-h-64 overflow-y-auto space-y-1 border rounded-lg p-2">
                  {todosModelos
                    .filter(m => m.visivel_todas && !destaquesIds.includes(m.id))
                    .map(modelo => (
                      <div
                        key={modelo.id}
                        className="flex items-center gap-2 p-2 rounded hover:bg-muted/50 cursor-pointer transition-colors"
                        onClick={() => adicionarDestaque(modelo.id)}
                      >
                        {modelo.imagem_modelo && (
                          <img src={modelo.imagem_modelo} alt="" className="w-8 h-8 rounded object-cover" />
                        )}
                        <span className="text-sm flex-1 truncate">{modelo.nome_modelo}</span>
                        <span className="text-xs text-muted-foreground">{modelo.categorias?.join(', ')}</span>
                        <Plus className="h-4 w-4 text-accent" />
                      </div>
                    ))}
                </div>
              </div>

              <Button
                onClick={salvarDestaques}
                disabled={salvandoDestaques}
                className="w-full"
              >
                {salvandoDestaques ? (
                  <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Salvando...</>
                ) : (
                  'Salvar ordem dos destaques'
                )}
              </Button>
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
