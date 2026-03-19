import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { Plus, Pencil, Trash2, Upload, Loader2, Eye, EyeOff, Megaphone, Tags, DollarSign, Star, ArrowUp, ArrowDown, X, Share2, Copy, Package, Check, Percent, TrendingUp } from 'lucide-react';
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

export default function ConfiguracoesCatalogoRevendedor() {
  const [categoriasVisiveis, setCategoriasVisiveis] = useState<CategoriaVisivel[]>([]);
  const [exibirPrecos, setExibirPrecos] = useState(true);
  const [loadingPrecos, setLoadingPrecos] = useState(true);
  const [exibirFormasPagamento, setExibirFormasPagamento] = useState(true);
  const [descontoPix, setDescontoPix] = useState('5');
  const [textoPix, setTextoPix] = useState('no PIX');
  const [textoParcelamento, setTextoParcelamento] = useState('3x sem juros ou até 12x no cartão');
  const [loadingPagamento, setLoadingPagamento] = useState(true);
  const [salvandoPagamento, setSalvandoPagamento] = useState(false);
  const [filtroPrecoAtivo, setFiltroPrecoAtivo] = useState(true);
  const [filtroTamanhoAtivo, setFiltroTamanhoAtivo] = useState(true);
  const [filtroLaminaAtivo, setFiltroLaminaAtivo] = useState(true);
  const [todosModelos, setTodosModelos] = useState<ModeloCatalogo[]>([]);
  const [destaquesIds, setDestaquesIds] = useState<string[]>([]);
  const [salvandoDestaques, setSalvandoDestaques] = useState(false);
  const [categoriaSelecionadaDestaques, setCategoriaSelecionadaDestaques] = useState<string | null>(null);
  const [destaquesCategoriaIds, setDestaquesCategoriaIds] = useState<string[]>([]);
  const [salvandoDestaquesCategoria, setSalvandoDestaquesCategoria] = useState(false);
  const [salvandoProntaEntrega, setSalvandoProntaEntrega] = useState(false);

  // Margem settings
  const [margemGlobal, setMargemGlobal] = useState('30');
  const [salvandoMargem, setSalvandoMargem] = useState(false);
  const [margensProduto, setMargensProduto] = useState<Record<string, string>>({});
  const [buscaMargem, setBuscaMargem] = useState('');

  useEffect(() => {
    fetchCategoriasVisiveis();
    fetchConfigRevendedor();
    fetchModelosParaDestaques();
    fetchMargensProduto();
  }, []);

  const fetchConfigRevendedor = async () => {
    const { data } = await supabase
      .from('config_revendedor' as any)
      .select('*')
      .in('chave', ['exibir_precos', 'exibir_formas_pagamento', 'desconto_pix', 'texto_pix', 'texto_parcelamento', 'filtro_preco_ativo', 'filtro_tamanho_ativo', 'filtro_lamina_ativo', 'margem_global']);
    if (data) {
      (data as any[]).forEach((d: any) => {
        if (d.chave === 'exibir_precos') setExibirPrecos(d.valor === 'true');
        if (d.chave === 'exibir_formas_pagamento') setExibirFormasPagamento(d.valor === 'true');
        if (d.chave === 'desconto_pix') setDescontoPix(d.valor);
        if (d.chave === 'texto_pix') setTextoPix(d.valor);
        if (d.chave === 'texto_parcelamento') setTextoParcelamento(d.valor);
        if (d.chave === 'filtro_preco_ativo') setFiltroPrecoAtivo(d.valor === 'true');
        if (d.chave === 'filtro_tamanho_ativo') setFiltroTamanhoAtivo(d.valor === 'true');
        if (d.chave === 'filtro_lamina_ativo') setFiltroLaminaAtivo(d.valor === 'true');
        if (d.chave === 'margem_global') setMargemGlobal(d.valor);
      });
    }
    setLoadingPrecos(false);
    setLoadingPagamento(false);
  };

  const fetchMargensProduto = async () => {
    const { data } = await supabase
      .from('margem_revendedor_produto' as any)
      .select('modelo_id, margem_percentual');
    if (data) {
      const map: Record<string, string> = {};
      (data as any[]).forEach((d: any) => { map[d.modelo_id] = String(d.margem_percentual); });
      setMargensProduto(map);
    }
  };

  const salvarMargemGlobal = async () => {
    setSalvandoMargem(true);
    try {
      await supabase
        .from('config_revendedor' as any)
        .update({ valor: margemGlobal } as any)
        .eq('chave', 'margem_global');
      toast.success('Margem global salva!');
    } catch {
      toast.error('Erro ao salvar');
    } finally {
      setSalvandoMargem(false);
    }
  };

  const salvarMargemProduto = async (modeloId: string, valor: string) => {
    const num = parseFloat(valor);
    if (isNaN(num) || num <= 0) {
      // Remove individual margin
      await supabase.from('margem_revendedor_produto' as any).delete().eq('modelo_id', modeloId);
      setMargensProduto(prev => { const n = { ...prev }; delete n[modeloId]; return n; });
      toast.success('Margem individual removida, usando global');
      return;
    }
    const { data: existing } = await supabase
      .from('margem_revendedor_produto' as any)
      .select('id')
      .eq('modelo_id', modeloId)
      .maybeSingle();
    if (existing) {
      await supabase.from('margem_revendedor_produto' as any).update({ margem_percentual: num } as any).eq('modelo_id', modeloId);
    } else {
      await supabase.from('margem_revendedor_produto' as any).insert({ modelo_id: modeloId, margem_percentual: num } as any);
    }
    setMargensProduto(prev => ({ ...prev, [modeloId]: valor }));
    toast.success('Margem individual salva!');
  };

  const updateConfig = async (chave: string, valor: string) => {
    await supabase.from('config_revendedor' as any).update({ valor } as any).eq('chave', chave);
  };

  const toggleExibirPrecos = async () => {
    const newVal = !exibirPrecos;
    await updateConfig('exibir_precos', newVal.toString());
    setExibirPrecos(newVal);
    toast.success(newVal ? 'Preços visíveis' : 'Preços ocultos');
  };

  const toggleFormasPagamento = async () => {
    const newVal = !exibirFormasPagamento;
    await updateConfig('exibir_formas_pagamento', newVal.toString());
    setExibirFormasPagamento(newVal);
    toast.success(newVal ? 'Formas de pagamento visíveis' : 'Formas de pagamento ocultas');
  };

  const salvarConfigPagamento = async () => {
    setSalvandoPagamento(true);
    try {
      await Promise.all([
        updateConfig('desconto_pix', descontoPix),
        updateConfig('texto_pix', textoPix),
        updateConfig('texto_parcelamento', textoParcelamento),
      ]);
      toast.success('Configurações de pagamento salvas!');
    } catch {
      toast.error('Erro ao salvar');
    } finally {
      setSalvandoPagamento(false);
    }
  };

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
    if (destaquesIds.length >= 10) { toast.error('Máximo de 10 destaques'); return; }
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
      // For revendedor, we reuse the same catalogo_modelos ordem_catalogo for now
      // since the models are the same
      toast.success('Destaques salvos!');
    } finally {
      setSalvandoDestaques(false);
    }
  };

  // --- Destaques por Categoria ---
  const carregarDestaquesCategoria = async (categoriaId: string) => {
    const { data } = await supabase
      .from('ordem_categoria_revendedor' as any)
      .select('modelo_id, ordem')
      .eq('categoria_id', categoriaId)
      .order('ordem');
    if (data) {
      setDestaquesCategoriaIds((data as any[]).map((d: any) => d.modelo_id));
    } else {
      setDestaquesCategoriaIds([]);
    }
  };

  const selecionarCategoriaDestaques = (catId: string) => {
    setCategoriaSelecionadaDestaques(catId);
    carregarDestaquesCategoria(catId);
  };

  const adicionarDestaqueCategoria = (id: string) => {
    if (destaquesCategoriaIds.length >= 10) { toast.error('Máximo de 10 por categoria'); return; }
    if (destaquesCategoriaIds.includes(id)) return;
    setDestaquesCategoriaIds(prev => [...prev, id]);
  };

  const removerDestaqueCategoria = (id: string) => {
    setDestaquesCategoriaIds(prev => prev.filter(d => d !== id));
  };

  const moverDestaqueCategoria = (index: number, direction: 'up' | 'down') => {
    const newList = [...destaquesCategoriaIds];
    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= newList.length) return;
    [newList[index], newList[targetIndex]] = [newList[targetIndex], newList[index]];
    setDestaquesCategoriaIds(newList);
  };

  const salvarDestaquesCategoria = async () => {
    if (!categoriaSelecionadaDestaques) return;
    setSalvandoDestaquesCategoria(true);
    try {
      await supabase.from('ordem_categoria_revendedor' as any).delete().eq('categoria_id', categoriaSelecionadaDestaques);
      if (destaquesCategoriaIds.length > 0) {
        const inserts = destaquesCategoriaIds.map((modeloId, i) => ({
          categoria_id: categoriaSelecionadaDestaques,
          modelo_id: modeloId,
          ordem: i + 1,
        }));
        await supabase.from('ordem_categoria_revendedor' as any).insert(inserts as any);
      }
      toast.success('Ordem da categoria salva!');
    } catch {
      toast.error('Erro ao salvar');
    } finally {
      setSalvandoDestaquesCategoria(false);
    }
  };

  const modelosDaCategoria = categoriaSelecionadaDestaques
    ? todosModelos.filter(m => {
        const cat = categoriasVisiveis.find(c => c.id === categoriaSelecionadaDestaques);
        return cat && m.categorias?.includes(cat.categoria);
      })
    : [];

  const fetchCategoriasVisiveis = async () => {
    const { data } = await supabase
      .from('categorias_catalogo_visiveis')
      .select('*')
      .order('ordem');
    if (data) setCategoriasVisiveis(data);
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

  return (
    <div className="space-y-4 px-1">
      <div className="min-w-0">
        <h1 className="text-lg sm:text-2xl font-bold">Config. Catálogo Revendedor</h1>
        <p className="text-muted-foreground text-xs sm:text-sm">
          Gerencie margens de lucro, preços e exibição do catálogo de revendedores
        </p>
      </div>

      <Tabs defaultValue="margens" className="w-full">
        <TabsList className="grid grid-cols-3 sm:grid-cols-5 w-full h-auto gap-1">
          <TabsTrigger value="margens" className="gap-1 text-xs sm:text-sm px-2 py-1.5">
            <TrendingUp className="h-3.5 w-3.5 hidden sm:block" />
            Margens
          </TabsTrigger>
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
        </TabsList>

        {/* Aba Margens */}
        <TabsContent value="margens" className="space-y-4 mt-4">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <Percent className="h-4 w-4" />
                Margem de Lucro Global
              </CardTitle>
              <CardDescription className="text-xs">
                Porcentagem de lucro aplicada a todos os produtos. A margem define quanto o preço de venda é maior que o custo do revendedor.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex items-end gap-3">
                <div className="flex-1 space-y-1">
                  <Label className="text-xs">Margem Global (%)</Label>
                  <Input
                    type="number"
                    value={margemGlobal}
                    onChange={e => setMargemGlobal(e.target.value)}
                    placeholder="30"
                    className="h-9"
                  />
                </div>
                <Button size="sm" onClick={salvarMargemGlobal} disabled={salvandoMargem} className="h-9">
                  {salvandoMargem ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Salvar'}
                </Button>
              </div>
              <div className="bg-muted/30 rounded-lg p-3 text-xs text-muted-foreground">
                <p><strong>Exemplo:</strong> Com margem de {margemGlobal || 30}%, uma lâmina vendida por R$ 1.000 terá custo revendedor de R$ {(1000 / (1 + (parseFloat(margemGlobal) || 30) / 100)).toFixed(2)} e lucro de R$ {(1000 - 1000 / (1 + (parseFloat(margemGlobal) || 30) / 100)).toFixed(2)}</p>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <Percent className="h-4 w-4" />
                Margem Individual por Produto
              </CardTitle>
              <CardDescription className="text-xs">
                Defina uma margem específica para sobrescrever a global. Deixe vazio para usar a margem global.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <Input
                placeholder="Buscar lâmina..."
                value={buscaMargem}
                onChange={e => setBuscaMargem(e.target.value)}
                className="h-8 text-sm"
              />
              <div className="max-h-[50vh] overflow-y-auto space-y-1.5">
                {todosModelos
                  .filter(m => !buscaMargem || m.nome_modelo.toLowerCase().includes(buscaMargem.toLowerCase()))
                  .map(modelo => {
                    const margemIndividual = margensProduto[modelo.id] || '';
                    const margemEfetiva = margemIndividual ? parseFloat(margemIndividual) : parseFloat(margemGlobal) || 30;
                    const precoRevenda = modelo.preco_base / (1 + margemEfetiva / 100);
                    const lucro = modelo.preco_base - precoRevenda;
                    
                    return (
                      <div key={modelo.id} className="flex items-center gap-2 p-2 rounded-lg border">
                        {modelo.imagem_modelo && (
                          <img src={modelo.imagem_modelo} alt="" className="w-8 h-8 rounded object-cover flex-shrink-0" />
                        )}
                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-medium truncate">{modelo.nome_modelo}</p>
                          <div className="flex items-center gap-2 text-[10px]">
                            <span className="text-accent">Venda: R$ {modelo.preco_base.toFixed(2)}</span>
                            <span className="text-muted-foreground">Custo: R$ {precoRevenda.toFixed(2)}</span>
                            <span className="text-emerald-500 font-bold">Lucro: R$ {lucro.toFixed(2)}</span>
                          </div>
                        </div>
                        <div className="flex items-center gap-1 shrink-0">
                          <Input
                            type="number"
                            value={margemIndividual}
                            onChange={e => setMargensProduto(prev => ({ ...prev, [modelo.id]: e.target.value }))}
                            placeholder={margemGlobal}
                            className="h-7 w-16 text-xs text-center"
                          />
                          <span className="text-xs text-muted-foreground">%</span>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-7 w-7 p-0"
                            onClick={() => salvarMargemProduto(modelo.id, margemIndividual)}
                          >
                            <Check className="h-3 w-3" />
                          </Button>
                        </div>
                      </div>
                    );
                  })}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Aba Geral */}
        <TabsContent value="geral" className="space-y-4 mt-4">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Exibição de Preços</CardTitle>
              <CardDescription className="text-xs">Quando desativado, os valores são removidos dos cards.</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between">
                <p className="text-sm font-medium">{exibirPrecos ? 'Preços visíveis' : 'Preços ocultos'}</p>
                <Switch checked={exibirPrecos} onCheckedChange={toggleExibirPrecos} disabled={loadingPrecos} />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Formas de Pagamento</CardTitle>
              <CardDescription className="text-xs">Edite PIX e parcelamento exibidos.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <p className="text-sm font-medium">{exibirFormasPagamento ? 'Visíveis' : 'Ocultas'}</p>
                <Switch checked={exibirFormasPagamento} onCheckedChange={toggleFormasPagamento} disabled={loadingPagamento} />
              </div>
              {exibirFormasPagamento && (
                <div className="space-y-3 pt-2 border-t">
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <Label className="text-xs">Desconto PIX (%)</Label>
                      <Input type="number" value={descontoPix} onChange={e => setDescontoPix(e.target.value)} placeholder="5" className="h-8" />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs">Texto do PIX</Label>
                      <Input value={textoPix} onChange={e => setTextoPix(e.target.value)} placeholder="no PIX" className="h-8" />
                    </div>
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">Texto do Parcelamento</Label>
                    <Input value={textoParcelamento} onChange={e => setTextoParcelamento(e.target.value)} className="h-8" />
                  </div>
                  <Button size="sm" onClick={salvarConfigPagamento} disabled={salvandoPagamento} className="w-full">
                    {salvandoPagamento ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Salvando...</> : 'Salvar pagamento'}
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Filtros do Catálogo</CardTitle>
              <CardDescription className="text-xs">Ative ou desative filtros na vitrine do revendedor.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex items-center justify-between">
                <p className="text-sm">Filtro de Preço</p>
                <Switch checked={filtroPrecoAtivo} onCheckedChange={async () => {
                  const newVal = !filtroPrecoAtivo;
                  await updateConfig('filtro_preco_ativo', newVal.toString());
                  setFiltroPrecoAtivo(newVal);
                  toast.success(newVal ? 'Filtro ativado' : 'Filtro desativado');
                }} />
              </div>
              <div className="flex items-center justify-between">
                <p className="text-sm">Filtro de Comprimento Total</p>
                <Switch checked={filtroTamanhoAtivo} onCheckedChange={async () => {
                  const newVal = !filtroTamanhoAtivo;
                  await updateConfig('filtro_tamanho_ativo', newVal.toString());
                  setFiltroTamanhoAtivo(newVal);
                  toast.success(newVal ? 'Filtro ativado' : 'Filtro desativado');
                }} />
              </div>
              <div className="flex items-center justify-between">
                <p className="text-sm">Filtro de Fio de Corte</p>
                <Switch checked={filtroLaminaAtivo} onCheckedChange={async () => {
                  const newVal = !filtroLaminaAtivo;
                  await updateConfig('filtro_lamina_ativo', newVal.toString());
                  setFiltroLaminaAtivo(newVal);
                  toast.success(newVal ? 'Filtro ativado' : 'Filtro desativado');
                }} />
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Aba Destaques */}
        <TabsContent value="destaques" className="space-y-4 mt-4">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Primeiras 10 por Categoria</CardTitle>
              <CardDescription className="text-xs">Ordene as primeiras lâminas por categoria no catálogo revendedor.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex flex-wrap gap-1.5">
                {categoriasVisiveis.filter(c => c.visivel).map(cat => (
                  <button
                    key={cat.id}
                    onClick={() => selecionarCategoriaDestaques(cat.id)}
                    className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-colors ${
                      categoriaSelecionadaDestaques === cat.id
                        ? 'bg-accent text-white border-accent'
                        : 'bg-muted/30 text-muted-foreground border-border hover:border-accent/50'
                    }`}
                  >
                    {cat.categoria}
                  </button>
                ))}
              </div>

              {categoriaSelecionadaDestaques ? (
                <>
                  <div className="space-y-1.5">
                    <Label className="text-sm font-semibold">Selecionadas ({destaquesCategoriaIds.length}/10)</Label>
                    {destaquesCategoriaIds.length === 0 && (
                      <p className="text-xs text-muted-foreground py-4 text-center">Nenhuma lâmina selecionada.</p>
                    )}
                    {destaquesCategoriaIds.map((id, index) => {
                      const modelo = todosModelos.find(m => m.id === id);
                      if (!modelo) return null;
                      return (
                        <div key={id} className="flex items-center gap-2 p-1.5 rounded-lg border bg-muted/30">
                          <span className="text-xs font-bold text-accent w-5 text-center">{index + 1}º</span>
                          {modelo.imagem_modelo && <img src={modelo.imagem_modelo} alt="" className="w-7 h-7 rounded object-cover" />}
                          <span className="text-xs flex-1 truncate">{modelo.nome_modelo}</span>
                          <div className="flex items-center gap-0.5">
                            <Button variant="ghost" size="sm" className="h-6 w-6 p-0" disabled={index === 0} onClick={() => moverDestaqueCategoria(index, 'up')}><ArrowUp className="h-3 w-3" /></Button>
                            <Button variant="ghost" size="sm" className="h-6 w-6 p-0" disabled={index === destaquesCategoriaIds.length - 1} onClick={() => moverDestaqueCategoria(index, 'down')}><ArrowDown className="h-3 w-3" /></Button>
                            <Button variant="ghost" size="sm" className="h-6 w-6 p-0 text-destructive" onClick={() => removerDestaqueCategoria(id)}><X className="h-3 w-3" /></Button>
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  <div className="space-y-1.5">
                    <Label className="text-sm font-semibold">Adicionar lâminas</Label>
                    <div className="max-h-52 overflow-y-auto space-y-0.5 border rounded-lg p-1.5">
                      {modelosDaCategoria
                        .filter(m => !destaquesCategoriaIds.includes(m.id))
                        .map(modelo => (
                          <div key={modelo.id} className="flex items-center gap-2 p-1.5 rounded hover:bg-muted/50 cursor-pointer" onClick={() => adicionarDestaqueCategoria(modelo.id)}>
                            {modelo.imagem_modelo && <img src={modelo.imagem_modelo} alt="" className="w-7 h-7 rounded object-cover" />}
                            <span className="text-xs flex-1 truncate">{modelo.nome_modelo}</span>
                            <Plus className="h-3.5 w-3.5 text-accent" />
                          </div>
                        ))}
                    </div>
                  </div>

                  <Button onClick={salvarDestaquesCategoria} disabled={salvandoDestaquesCategoria} className="w-full" size="sm">
                    {salvandoDestaquesCategoria ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Salvando...</> : 'Salvar ordem da categoria'}
                  </Button>
                </>
              ) : (
                <p className="text-xs text-muted-foreground text-center py-4">Selecione uma categoria acima</p>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Aba Categorias - read-only view */}
        <TabsContent value="categorias" className="space-y-3 mt-4">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Categorias do Catálogo</CardTitle>
              <CardDescription className="text-xs">
                As categorias são compartilhadas com o catálogo de clientes. Gerencie-as em Config. Catálogo.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-2">
              {categoriasVisiveis.map((cat) => {
                const CatIcon = getIconComponent(cat.icone);
                return (
                  <div key={cat.id} className="flex items-center gap-3 py-2 px-3 rounded-lg border">
                    <CatIcon className="h-4 w-4 text-accent shrink-0" />
                    <span className="text-sm font-medium flex-1">{cat.categoria}</span>
                    <Badge variant={cat.visivel ? 'default' : 'secondary'} className="text-[10px]">
                      {cat.visivel ? 'Visível' : 'Oculta'}
                    </Badge>
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
              <CardDescription className="text-xs">Marque quais produtos estão disponíveis para entrega imediata.</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-1.5 max-h-[60vh] overflow-y-auto">
                {todosModelos.map((modelo) => (
                  <div key={modelo.id} className="flex items-center gap-2 p-2 rounded-lg border">
                    {modelo.imagem_modelo && <img src={modelo.imagem_modelo} alt="" className="w-8 h-8 rounded object-cover flex-shrink-0" />}
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-medium truncate">{modelo.nome_modelo}</p>
                      <p className="text-[10px] text-muted-foreground">{modelo.categorias?.join(', ')}</p>
                    </div>
                    <Switch checked={modelo.pronta_entrega} onCheckedChange={() => toggleProntaEntrega(modelo)} />
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
