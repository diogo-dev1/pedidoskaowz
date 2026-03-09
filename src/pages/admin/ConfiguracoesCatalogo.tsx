import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { toast } from 'sonner';
import { Plus, Pencil, Trash2, Upload, Loader2, Eye, EyeOff, Megaphone, Tags, DollarSign, Star, ArrowUp, ArrowDown, X, Share2, Copy, Package } from 'lucide-react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { IconPicker } from '@/components/IconPicker';
import { getIconComponent } from '@/lib/icon-utils';

interface CategoriaVisivel {
  id: string;
  categoria: string;
  visivel: boolean;
  visivel_todas: boolean;
  visivel_kit: boolean;
  ordem: number;
  icone: string;
  categoria_pai_id: string | null;
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
  pronta_entrega: boolean;
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

  // Filtros
  const [filtroPrecoAtivo, setFiltroPrecoAtivo] = useState(true);
  const [filtroTamanhoAtivo, setFiltroTamanhoAtivo] = useState(true);
  const [filtroLaminaAtivo, setFiltroLaminaAtivo] = useState(true);

  // Destaques "Todas"
  const [todosModelos, setTodosModelos] = useState<ModeloCatalogo[]>([]);
  const [destaquesIds, setDestaquesIds] = useState<string[]>([]);
  const [salvandoDestaques, setSalvandoDestaques] = useState(false);

  // Pronta Entrega
  const [salvandoProntaEntrega, setSalvandoProntaEntrega] = useState(false);

  // Nova categoria
  const [novaCategoriaNome, setNovaCategoriaNome] = useState('');
  const [novaCategoriaIcone, setNovaCategoriaIcone] = useState('Sword');

  // Multi-category share
  const [categoriasParaCompartilhar, setCategoriasParaCompartilhar] = useState<Set<string>>(new Set());

  // Edição de nome de categoria
  const [categoriaEditandoId, setCategoriaEditandoId] = useState<string | null>(null);
  const [categoriaEditandoNome, setCategoriaEditandoNome] = useState('');

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
      .in('chave', ['exibir_formas_pagamento', 'desconto_pix', 'texto_pix', 'texto_parcelamento', 'filtro_preco_ativo', 'filtro_tamanho_ativo', 'filtro_lamina_ativo']);
    if (data) {
      data.forEach(d => {
        if (d.chave === 'exibir_formas_pagamento') setExibirFormasPagamento(d.valor === 'true');
        if (d.chave === 'desconto_pix') setDescontoPix(d.valor);
        if (d.chave === 'texto_pix') setTextoPix(d.valor);
        if (d.chave === 'texto_parcelamento') setTextoParcelamento(d.valor);
        if (d.chave === 'filtro_preco_ativo') setFiltroPrecoAtivo(d.valor === 'true');
        if (d.chave === 'filtro_tamanho_ativo') setFiltroTamanhoAtivo(d.valor === 'true');
        if (d.chave === 'filtro_lamina_ativo') setFiltroLaminaAtivo(d.valor === 'true');
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
      .select('id, nome_modelo, imagem_modelo, preco_base, ordem_catalogo, visivel_todas, categorias, pronta_entrega')
      .eq('visivel_catalogo', true)
      .order('ordem_catalogo');
    if (data) {
      setTodosModelos(data as ModeloCatalogo[]);
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
      const { error: resetError } = await supabase
        .from('catalogo_modelos')
        .update({ ordem_catalogo: 999 })
        .neq('id', '00000000-0000-0000-0000-000000000000');

      if (resetError) throw resetError;

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

  const toggleVisivelKit = async (cat: CategoriaVisivel) => {
    const { error } = await supabase
      .from('categorias_catalogo_visiveis')
      .update({ visivel_kit: !cat.visivel_kit } as any)
      .eq('id', cat.id);
    if (error) { toast.error('Erro ao alterar configuração'); return; }
    setCategoriasVisiveis(prev => prev.map(c => c.id === cat.id ? { ...c, visivel_kit: !c.visivel_kit } : c));
    toast.success(!cat.visivel_kit ? `${cat.categoria} aparecerá no Kit` : `${cat.categoria} removida do Kit`);
  };

  const copiarLinkCategoria = (categoria: string) => {
    const url = `${window.location.origin}/catalogo?categoria=${encodeURIComponent(categoria)}`;
    navigator.clipboard.writeText(url);
    toast.success(`Link da categoria "${categoria}" copiado!`);
  };

  const toggleCategoriaCompartilhar = (categoria: string) => {
    setCategoriasParaCompartilhar(prev => {
      const next = new Set(prev);
      if (next.has(categoria)) next.delete(categoria);
      else next.add(categoria);
      return next;
    });
  };

  const copiarLinkMultiCategorias = () => {
    if (categoriasParaCompartilhar.size === 0) {
      toast.error('Selecione pelo menos uma categoria');
      return;
    }
    const cats = Array.from(categoriasParaCompartilhar).map(c => encodeURIComponent(c)).join(',');
    const url = `${window.location.origin}/catalogo?categorias=${cats}`;
    navigator.clipboard.writeText(url);
    toast.success(`Link com ${categoriasParaCompartilhar.size} categorias copiado!`);
  };

  const atualizarIconeCategoria = async (cat: CategoriaVisivel, icone: string) => {
    const { error } = await supabase
      .from('categorias_catalogo_visiveis')
      .update({ icone })
      .eq('id', cat.id);
    if (error) { toast.error('Erro ao alterar ícone'); return; }
    setCategoriasVisiveis(prev => prev.map(c => c.id === cat.id ? { ...c, icone } : c));
    toast.success('Ícone atualizado');
  };

  const criarCategoria = async () => {
    if (!novaCategoriaNome.trim()) { toast.error('Digite o nome da categoria'); return; }
    const existe = categoriasVisiveis.some(c => c.categoria.toLowerCase() === novaCategoriaNome.trim().toLowerCase());
    if (existe) { toast.error('Categoria já existe'); return; }
    const maxOrdem = categoriasVisiveis.reduce((max, c) => Math.max(max, c.ordem), 0);
    const { error } = await supabase.from('categorias_catalogo_visiveis').insert({
      categoria: novaCategoriaNome.trim(),
      icone: novaCategoriaIcone,
      visivel: true,
      visivel_todas: true,
      ordem: maxOrdem + 1,
    });
    if (error) { toast.error('Erro ao criar categoria'); return; }
    toast.success('Categoria criada!');
    setNovaCategoriaNome('');
    setNovaCategoriaIcone('Sword');
    fetchCategoriasVisiveis();
  };

  const deletarCategoria = async (cat: CategoriaVisivel) => {
    if (!confirm(`Excluir a categoria "${cat.categoria}"?`)) return;
    const { error } = await supabase.from('categorias_catalogo_visiveis').delete().eq('id', cat.id);
    if (error) { toast.error('Erro ao excluir'); return; }
    setCategoriasVisiveis(prev => prev.filter(c => c.id !== cat.id));
    toast.success('Categoria excluída');
  };

  const iniciarEdicaoCategoria = (cat: CategoriaVisivel) => {
    setCategoriaEditandoId(cat.id);
    setCategoriaEditandoNome(cat.categoria);
  };

  const salvarNomeCategoria = async (cat: CategoriaVisivel) => {
    const novoNome = categoriaEditandoNome.trim();
    if (!novoNome) { toast.error('Nome não pode ser vazio'); return; }
    if (novoNome === cat.categoria) { setCategoriaEditandoId(null); return; }
    const existe = categoriasVisiveis.some(c => c.id !== cat.id && c.categoria.toLowerCase() === novoNome.toLowerCase());
    if (existe) { toast.error('Já existe uma categoria com esse nome'); return; }
    const { error } = await supabase
      .from('categorias_catalogo_visiveis')
      .update({ categoria: novoNome })
      .eq('id', cat.id);
    if (error) { toast.error('Erro ao renomear categoria'); return; }
    setCategoriasVisiveis(prev => prev.map(c => c.id === cat.id ? { ...c, categoria: novoNome } : c));
    setCategoriaEditandoId(null);
    toast.success('Categoria renomeada!');
  };
  const toggleProntaEntrega = async (modelo: ModeloCatalogo) => {
    setSalvandoProntaEntrega(true);
    const { error } = await supabase
      .from('catalogo_modelos')
      .update({ pronta_entrega: !modelo.pronta_entrega })
      .eq('id', modelo.id);
    if (error) {
      toast.error('Erro ao alterar');
    } else {
      setTodosModelos(prev => prev.map(m => m.id === modelo.id ? { ...m, pronta_entrega: !m.pronta_entrega } : m));
      toast.success(modelo.pronta_entrega ? 'Removido de pronta entrega' : 'Marcado como pronta entrega');
    }
    setSalvandoProntaEntrega(false);
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
        <TabsList className="grid grid-cols-3 sm:grid-cols-5 w-full h-auto gap-1">
          <TabsTrigger value="geral" className="gap-1 text-xs sm:text-sm px-2 py-1.5">
            <DollarSign className="h-3.5 w-3.5 hidden sm:block" />
            Geral
          </TabsTrigger>
          <TabsTrigger value="destaques" className="gap-1 text-xs sm:text-sm px-2 py-1.5">
            <Star className="h-3.5 w-3.5 hidden sm:block" />
            Destaques
          </TabsTrigger>
          <TabsTrigger value="categorias" className="gap-1 text-xs sm:text-sm px-2 py-1.5">
            <Tags className="h-3.5 w-3.5 hidden sm:block" />
            Categorias
          </TabsTrigger>
          <TabsTrigger value="pronta-entrega" className="gap-1 text-xs sm:text-sm px-2 py-1.5">
            <Package className="h-3.5 w-3.5 hidden sm:block" />
            Pronta Entrega
          </TabsTrigger>
          <TabsTrigger value="banners" className="gap-1 text-xs sm:text-sm px-2 py-1.5">
            <Megaphone className="h-3.5 w-3.5 hidden sm:block" />
            Banners
          </TabsTrigger>
        </TabsList>

        {/* Aba Geral */}
        <TabsContent value="geral" className="space-y-4 mt-4">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Exibição de Preços</CardTitle>
              <CardDescription className="text-xs">
                Quando desativado, os valores são removidos dos cards e detalhes.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium">
                    {exibirPrecos ? 'Preços visíveis' : 'Preços ocultos'}
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
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Formas de Pagamento</CardTitle>
              <CardDescription className="text-xs">
                Edite PIX e parcelamento exibidos no catálogo.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <p className="text-sm font-medium">
                  {exibirFormasPagamento ? 'Visíveis' : 'Ocultas'}
                </p>
                <Switch
                  checked={exibirFormasPagamento}
                  onCheckedChange={toggleFormasPagamento}
                  disabled={loadingPagamento}
                />
              </div>

              {exibirFormasPagamento && (
                <div className="space-y-3 pt-2 border-t">
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <Label className="text-xs">Desconto PIX (%)</Label>
                      <Input
                        type="number"
                        value={descontoPix}
                        onChange={e => setDescontoPix(e.target.value)}
                        placeholder="5"
                        className="h-8"
                      />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs">Texto do PIX</Label>
                      <Input
                        value={textoPix}
                        onChange={e => setTextoPix(e.target.value)}
                        placeholder="no PIX"
                        className="h-8"
                      />
                    </div>
                  </div>
                  <div className="space-y-1">
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
                    {salvandoPagamento ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Salvando...</> : 'Salvar pagamento'}
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Filtros do Catálogo</CardTitle>
              <CardDescription className="text-xs">
                Ative ou desative filtros individuais na vitrine pública.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex items-center justify-between">
                <p className="text-sm">Filtro de Preço</p>
                <Switch checked={filtroPrecoAtivo} onCheckedChange={async () => {
                  const newVal = !filtroPrecoAtivo;
                  await supabase.from('configuracoes_catalogo').update({ valor: newVal.toString() }).eq('chave', 'filtro_preco_ativo');
                  setFiltroPrecoAtivo(newVal);
                  toast.success(newVal ? 'Filtro de preço ativado' : 'Filtro de preço desativado');
                }} />
              </div>
              <div className="flex items-center justify-between">
                <p className="text-sm">Filtro de Comprimento Total</p>
                <Switch checked={filtroTamanhoAtivo} onCheckedChange={async () => {
                  const newVal = !filtroTamanhoAtivo;
                  await supabase.from('configuracoes_catalogo').update({ valor: newVal.toString() }).eq('chave', 'filtro_tamanho_ativo');
                  setFiltroTamanhoAtivo(newVal);
                  toast.success(newVal ? 'Filtro de tamanho ativado' : 'Filtro de tamanho desativado');
                }} />
              </div>
              <div className="flex items-center justify-between">
                <p className="text-sm">Filtro de Fio de Corte</p>
                <Switch checked={filtroLaminaAtivo} onCheckedChange={async () => {
                  const newVal = !filtroLaminaAtivo;
                  await supabase.from('configuracoes_catalogo').update({ valor: newVal.toString() }).eq('chave', 'filtro_lamina_ativo');
                  setFiltroLaminaAtivo(newVal);
                  toast.success(newVal ? 'Filtro de lâmina ativado' : 'Filtro de lâmina desativado');
                }} />
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Aba Destaques */}
        <TabsContent value="destaques" className="space-y-4 mt-4">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Primeiras 10 Lâminas em "Todas"</CardTitle>
              <CardDescription className="text-xs">
                Selecione e ordene as 10 primeiras lâminas da visão geral.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Lista de destaques selecionados */}
              <div className="space-y-1.5">
                <Label className="text-sm font-semibold">Selecionadas ({destaquesIds.length}/10)</Label>
                {destaquesIds.length === 0 && (
                  <p className="text-xs text-muted-foreground py-4 text-center">Nenhuma lâmina selecionada.</p>
                )}
                {destaquesIds.map((id, index) => {
                  const modelo = todosModelos.find(m => m.id === id);
                  if (!modelo) return null;
                  return (
                    <div key={id} className="flex items-center gap-2 p-1.5 rounded-lg border bg-muted/30">
                      <span className="text-xs font-bold text-accent w-5 text-center">{index + 1}º</span>
                      {modelo.imagem_modelo && (
                        <img src={modelo.imagem_modelo} alt="" className="w-7 h-7 rounded object-cover" />
                      )}
                      <span className="text-xs flex-1 truncate">{modelo.nome_modelo}</span>
                      <div className="flex items-center gap-0.5">
                        <Button variant="ghost" size="sm" className="h-6 w-6 p-0" disabled={index === 0} onClick={() => moverDestaque(index, 'up')}>
                          <ArrowUp className="h-3 w-3" />
                        </Button>
                        <Button variant="ghost" size="sm" className="h-6 w-6 p-0" disabled={index === destaquesIds.length - 1} onClick={() => moverDestaque(index, 'down')}>
                          <ArrowDown className="h-3 w-3" />
                        </Button>
                        <Button variant="ghost" size="sm" className="h-6 w-6 p-0 text-destructive hover:text-destructive" onClick={() => removerDestaque(id)}>
                          <X className="h-3 w-3" />
                        </Button>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Lista de todos os modelos para adicionar */}
              <div className="space-y-1.5">
                <Label className="text-sm font-semibold">Adicionar lâminas</Label>
                <div className="max-h-52 overflow-y-auto space-y-0.5 border rounded-lg p-1.5">
                  {todosModelos
                    .filter(m => m.visivel_todas && !destaquesIds.includes(m.id))
                    .map(modelo => (
                      <div
                        key={modelo.id}
                        className="flex items-center gap-2 p-1.5 rounded hover:bg-muted/50 cursor-pointer transition-colors"
                        onClick={() => adicionarDestaque(modelo.id)}
                      >
                        {modelo.imagem_modelo && (
                          <img src={modelo.imagem_modelo} alt="" className="w-7 h-7 rounded object-cover" />
                        )}
                        <span className="text-xs flex-1 truncate">{modelo.nome_modelo}</span>
                        <Plus className="h-3.5 w-3.5 text-accent" />
                      </div>
                    ))}
                </div>
              </div>

              <Button
                onClick={salvarDestaques}
                disabled={salvandoDestaques}
                className="w-full"
                size="sm"
              >
                {salvandoDestaques ? (
                  <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Salvando...</>
                ) : (
                  'Salvar destaques'
                )}
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Aba Categorias */}
        <TabsContent value="categorias" className="space-y-3 mt-4">
          {/* Criar nova categoria */}
          {/* Compartilhar múltiplas categorias */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <Share2 className="h-4 w-4" />
                Compartilhar Categorias
              </CardTitle>
              <CardDescription className="text-xs">
                Selecione as categorias e copie um link que mostra somente elas.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex flex-wrap gap-2">
                {categoriasVisiveis.filter(c => c.visivel).map((cat) => {
                  const selecionada = categoriasParaCompartilhar.has(cat.categoria);
                  return (
                    <button
                      key={cat.id}
                      onClick={() => toggleCategoriaCompartilhar(cat.categoria)}
                      className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-colors ${
                        selecionada
                          ? 'bg-accent text-white border-accent'
                          : 'bg-muted/30 text-muted-foreground border-border hover:border-accent/50'
                      }`}
                    >
                      {cat.categoria}
                    </button>
                  );
                })}
              </div>
              {categoriasParaCompartilhar.size > 0 && (
                <p className="text-[10px] text-muted-foreground">
                  {Array.from(categoriasParaCompartilhar).join(', ')}
                </p>
              )}
              <Button
                size="sm"
                onClick={copiarLinkMultiCategorias}
                disabled={categoriasParaCompartilhar.size === 0}
                className="w-full gap-2"
              >
                <Copy className="h-3.5 w-3.5" />
                Copiar link ({categoriasParaCompartilhar.size} {categoriasParaCompartilhar.size === 1 ? 'categoria' : 'categorias'})
              </Button>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Nova Categoria</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-end gap-2">
                <div className="flex-1 space-y-1">
                  <Label className="text-xs">Nome</Label>
                  <Input
                    value={novaCategoriaNome}
                    onChange={e => setNovaCategoriaNome(e.target.value)}
                    placeholder="Nome da categoria"
                    className="h-8"
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Ícone</Label>
                  <IconPicker value={novaCategoriaIcone} onChange={setNovaCategoriaIcone} />
                </div>
                <Button size="sm" onClick={criarCategoria} className="h-10">
                  <Plus className="h-4 w-4 mr-1" />
                  Criar
                </Button>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Categorias do Catálogo</CardTitle>
              <CardDescription className="text-xs">
                Visibilidade, ícone e links de compartilhamento.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-2">
              {categoriasVisiveis.map((cat) => {
                const CatIcon = getIconComponent(cat.icone);
                return (
                  <div key={cat.id} className="flex flex-col gap-2 py-2 px-3 rounded-lg border">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <IconPicker
                          value={cat.icone}
                          onChange={(icone) => atualizarIconeCategoria(cat, icone)}
                        />
                        {categoriaEditandoId === cat.id ? (
                          <Input
                            value={categoriaEditandoNome}
                            onChange={e => setCategoriaEditandoNome(e.target.value)}
                            onBlur={() => salvarNomeCategoria(cat)}
                            onKeyDown={e => { if (e.key === 'Enter') salvarNomeCategoria(cat); if (e.key === 'Escape') setCategoriaEditandoId(null); }}
                            className="h-7 text-sm w-32"
                            autoFocus
                          />
                        ) : (
                          <span
                            className="text-sm font-medium cursor-pointer hover:underline"
                            onClick={() => iniciarEdicaoCategoria(cat)}
                            title="Clique para editar"
                          >
                            {cat.categoria}
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-1.5">
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-7 w-7 p-0"
                          onClick={() => copiarLinkCategoria(cat.categoria)}
                          title="Copiar link"
                        >
                          <Copy className="h-3.5 w-3.5" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-7 w-7 p-0 text-destructive hover:text-destructive"
                          onClick={() => deletarCategoria(cat)}
                          title="Excluir categoria"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                        <Switch
                          checked={cat.visivel}
                          onCheckedChange={() => toggleCategoriaVisivel(cat)}
                        />
                      </div>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-muted-foreground">Exibir em "Todas"</span>
                      <Switch
                        checked={cat.visivel_todas}
                        onCheckedChange={() => toggleVisivelTodas(cat)}
                      />
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-muted-foreground">Exibir no Kit</span>
                      <Switch
                        checked={cat.visivel_kit}
                        onCheckedChange={() => toggleVisivelKit(cat)}
                      />
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-muted-foreground">Subcategoria de</span>
                      <select
                        value={cat.categoria_pai_id || ''}
                        onChange={async (e) => {
                          const newPaiId = e.target.value || null;
                          const { error } = await supabase
                            .from('categorias_catalogo_visiveis')
                            .update({ categoria_pai_id: newPaiId } as any)
                            .eq('id', cat.id);
                          if (error) { toast.error('Erro ao alterar'); return; }
                          setCategoriasVisiveis(prev => prev.map(c => c.id === cat.id ? { ...c, categoria_pai_id: newPaiId } : c));
                          const paiNome = newPaiId ? categoriasVisiveis.find(c => c.id === newPaiId)?.categoria : null;
                          toast.success(paiNome ? `${cat.categoria} agora é subcategoria de ${paiNome}` : `${cat.categoria} não é mais subcategoria`);
                        }}
                        className="h-7 text-xs bg-muted/30 border border-border rounded px-2"
                      >
                        <option value="">Nenhuma (raiz)</option>
                        {categoriasVisiveis
                          .filter(c => c.id !== cat.id && c.categoria_pai_id !== cat.id)
                          .map(c => (
                            <option key={c.id} value={c.id}>{c.categoria}</option>
                          ))}
                      </select>
                    </div>
                  </div>
                );
              })}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Aba Pronta Entrega */}
        <TabsContent value="pronta-entrega" className="space-y-3 mt-4">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Produtos à Pronta Entrega</CardTitle>
              <CardDescription className="text-xs">
                Marque quais produtos estão disponíveis para entrega imediata. Um selo será exibido no catálogo.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-1.5 max-h-[60vh] overflow-y-auto">
                {todosModelos.map((modelo) => (
                  <div key={modelo.id} className="flex items-center gap-2 p-2 rounded-lg border">
                    {modelo.imagem_modelo && (
                      <img src={modelo.imagem_modelo} alt="" className="w-8 h-8 rounded object-cover flex-shrink-0" />
                    )}
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-medium truncate">{modelo.nome_modelo}</p>
                      <p className="text-[10px] text-muted-foreground">{modelo.categorias?.join(', ')}</p>
                    </div>
                    <Switch
                      checked={modelo.pronta_entrega}
                      onCheckedChange={() => toggleProntaEntrega(modelo)}
                    />
                  </div>
                ))}
                {todosModelos.length === 0 && (
                  <p className="text-xs text-muted-foreground text-center py-4">Nenhum produto encontrado</p>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Aba Banners */}
        <TabsContent value="banners" className="space-y-3 mt-4">
          {!bannerFormOpen ? (
            <>
              <Button onClick={() => setBannerFormOpen(true)} className="w-full" size="sm">
                <Plus className="mr-2 h-4 w-4" />
                Novo Banner
              </Button>

              {banners.length === 0 ? (
                <Card>
                  <CardContent className="py-6 text-center text-muted-foreground text-xs">
                    Nenhum banner cadastrado
                  </CardContent>
                </Card>
              ) : (
                <div className="space-y-2">
                  {banners.map((banner) => (
                    <Card key={banner.id} className={!banner.ativo ? 'opacity-50' : ''}>
                      <CardContent className="p-2.5">
                        <div className="flex items-center gap-2.5">
                          <div className="w-24 h-14 rounded overflow-hidden bg-muted flex-shrink-0">
                            <img src={banner.imagem_url} alt={banner.titulo || 'Banner'} className="w-full h-full object-cover" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-xs font-medium truncate">{banner.titulo || 'Sem título'}</p>
                            <span className="text-[10px] text-muted-foreground">Ordem: {banner.ordem}</span>
                          </div>
                          <div className="flex items-center gap-1 flex-shrink-0">
                            <Switch checked={banner.ativo} onCheckedChange={() => toggleBannerAtivo(banner)} />
                            <Button variant="outline" size="sm" className="h-6 px-1.5" onClick={() => editarBanner(banner)}>
                              <Pencil className="h-3 w-3" />
                            </Button>
                            <Button variant="destructive" size="sm" className="h-6 px-1.5" onClick={() => deletarBanner(banner.id)}>
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
              <CardHeader className="pb-3">
                <CardTitle className="text-base">{bannerEditando ? 'Editar Banner' : 'Novo Banner'}</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <Label className="text-xs">Título (opcional)</Label>
                    <Input value={bannerTitulo} onChange={(e) => setBannerTitulo(e.target.value)} placeholder="Ex: Promoção" className="h-8" />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">Subtítulo (opcional)</Label>
                    <Input value={bannerSubtitulo} onChange={(e) => setBannerSubtitulo(e.target.value)} placeholder="Ex: 20% OFF" className="h-8" />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <Label className="text-xs">Link (opcional)</Label>
                    <Input value={bannerLink} onChange={(e) => setBannerLink(e.target.value)} placeholder="https://..." className="h-8" />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">Ordem</Label>
                    <Input type="number" value={bannerOrdem} onChange={(e) => setBannerOrdem(e.target.value)} className="h-8" />
                  </div>
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Imagem do Banner</Label>
                  <Input type="file" accept="image/*" onChange={(e) => setBannerImagemFile(e.target.files?.[0] || null)} className="h-8" />
                  {bannerEditando?.imagem_url && !bannerImagemFile && (
                    <div className="w-full h-20 rounded overflow-hidden bg-muted">
                      <img src={bannerEditando.imagem_url} alt="Preview" className="w-full h-full object-cover" />
                    </div>
                  )}
                </div>
                <div className="flex gap-2">
                  <Button variant="outline" onClick={resetBannerForm} className="flex-1" size="sm">Cancelar</Button>
                  <Button onClick={handleSalvarBanner} disabled={bannerSalvando} className="flex-1" size="sm">
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
