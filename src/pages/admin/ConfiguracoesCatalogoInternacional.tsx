import { useState, useEffect, useMemo } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';
import { Plus, Loader2, Tags, DollarSign, Star, ArrowUp, ArrowDown, X, Share2, Copy, Package, Check, Percent, TrendingUp, Globe, Languages, RefreshCw, AlertTriangle, CheckCircle2, Save, Eye } from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { getIconComponent } from '@/lib/icon-utils';
import { useExchangeRate, type ExchangeMode } from '@/hooks/useExchangeRate';
import { TranslationManager } from '@/components/admin/TranslationManager';
import { VisibilidadeLaminasTab } from '@/components/admin/VisibilidadeLaminasTab';

const ALL_CURRENCIES = ['USD', 'BRL', 'EUR', 'AED'] as const;
const ALL_LANGUAGES = [{ code: 'pt', label: 'Português' }, { code: 'en', label: 'English' }] as const;

interface CategoriaVisivel {
  id: string; categoria: string; nome_en: string | null; visivel: boolean; visivel_todas: boolean; visivel_kit: boolean;
  ordem: number; icone: string; categoria_pai_id: string | null;
}
interface ModeloCatalogo {
  id: string; nome_modelo: string; nome_modelo_en: string | null; descricao_html_en: string | null;
  imagem_modelo: string | null; preco_base: number; ordem_catalogo: number;
  visivel_todas: boolean; categorias: string[] | null; pronta_entrega: boolean;
}
interface IntlConfigRow {
  id: string; show_prices: boolean; show_stock: boolean; base_currency: string; default_currency: string;
  margin_percent: number; show_currency_selector: boolean; available_currencies: string[];
  default_language: string; show_language_selector: boolean; available_languages: string[];
  exchange_mode: ExchangeMode; manual_rates: Record<string, number>; manual_rates_updated_at: string | null;
  show_logo: boolean; show_banner: boolean; banner_content: string | null;
  contact_email: string | null; contact_whatsapp: string | null; visible_product_ids: string[];
}

export default function ConfiguracoesCatalogoInternacional() {
  const [categoriasVisiveis, setCategoriasVisiveis] = useState<CategoriaVisivel[]>([]);
  const [exibirPrecos, setExibirPrecos] = useState(true);
  const [filtroPrecoAtivo, setFiltroPrecoAtivo] = useState(true);
  const [filtroTamanhoAtivo, setFiltroTamanhoAtivo] = useState(true);
  const [filtroLaminaAtivo, setFiltroLaminaAtivo] = useState(true);
  const [todosModelos, setTodosModelos] = useState<ModeloCatalogo[]>([]);
  const [categoriaSelecionadaDestaques, setCategoriaSelecionadaDestaques] = useState<string | null>(null);
  const [destaquesCategoriaIds, setDestaquesCategoriaIds] = useState<string[]>([]);
  const [salvandoDestaquesCategoria, setSalvandoDestaquesCategoria] = useState(false);
  const [salvandoProntaEntrega, setSalvandoProntaEntrega] = useState(false);
  const [margemGlobal, setMargemGlobal] = useState('30');
  const [salvandoMargem, setSalvandoMargem] = useState(false);
  const [margensProduto, setMargensProduto] = useState<Record<string, string>>({});
  const [buscaMargem, setBuscaMargem] = useState('');
  const [categoriasParaCompartilhar, setCategoriasParaCompartilhar] = useState<Set<string>>(new Set());
  const [produtosParaCompartilhar, setProdutosParaCompartilhar] = useState<Set<string>>(new Set());
  const [buscaProdutoCompartilhar, setBuscaProdutoCompartilhar] = useState('');
  const [mensagemPadrao, setMensagemPadrao] = useState('Check out our exclusive international catalog!');
  const [salvandoMensagem, setSalvandoMensagem] = useState(false);

  // Idioma/Moeda/Cotação
  const [intl, setIntl] = useState<IntlConfigRow | null>(null);
  const [savingIntl, setSavingIntl] = useState(false);
  const [manualRatesDraft, setManualRatesDraft] = useState<Record<string, string>>({});
  const [buscaProdutoIntl, setBuscaProdutoIntl] = useState('');

  useEffect(() => {
    fetchCategoriasVisiveis();
    fetchConfigInternacional();
    fetchModelos();
    fetchMargensProduto();
    fetchIntlConfig();
  }, []);

  const fetchConfigInternacional = async () => {
    const { data } = await supabase.from('config_internacional' as any).select('*')
      .in('chave', ['exibir_precos', 'filtro_preco_ativo', 'filtro_tamanho_ativo', 'filtro_lamina_ativo', 'margem_global', 'mensagem_padrao_internacional']);
    if (data) {
      (data as any[]).forEach((d: any) => {
        if (d.chave === 'exibir_precos') setExibirPrecos(d.valor === 'true');
        if (d.chave === 'filtro_preco_ativo') setFiltroPrecoAtivo(d.valor === 'true');
        if (d.chave === 'filtro_tamanho_ativo') setFiltroTamanhoAtivo(d.valor === 'true');
        if (d.chave === 'filtro_lamina_ativo') setFiltroLaminaAtivo(d.valor === 'true');
        if (d.chave === 'margem_global') setMargemGlobal(d.valor);
        if (d.chave === 'mensagem_padrao_internacional') setMensagemPadrao(d.valor);
      });
    }
  };

  const fetchIntlConfig = async () => {
    const { data } = await supabase.from('international_catalog_config').select('*')
      .order('updated_at', { ascending: false }).limit(1).maybeSingle();
    if (data) {
      const row = data as unknown as IntlConfigRow;
      setIntl(row);
      const draft: Record<string, string> = {};
      for (const c of row.available_currencies || []) {
        if (c === row.base_currency) continue;
        const v = (row.manual_rates || {})[c];
        draft[c] = v != null ? String(v) : '';
      }
      setManualRatesDraft(draft);
    }
  };

  const updateIntl = <K extends keyof IntlConfigRow>(key: K, value: IntlConfigRow[K]) => {
    setIntl((prev) => prev ? { ...prev, [key]: value } : prev);
  };

  const toggleArrayItem = (arr: string[], item: string) =>
    arr.includes(item) ? arr.filter((i) => i !== item) : [...arr, item];

  const salvarIntl = async () => {
    if (!intl) return;
    setSavingIntl(true);
    try {
      const manual_rates: Record<string, number> = {};
      for (const code of intl.available_currencies) {
        if (code === intl.base_currency) continue;
        const raw = manualRatesDraft[code];
        const num = raw ? parseFloat(raw.replace(',', '.')) : NaN;
        if (!isNaN(num) && num > 0) manual_rates[code] = num;
      }
      const manualChanged = JSON.stringify(intl.manual_rates || {}) !== JSON.stringify(manual_rates);
      const manual_rates_updated_at = intl.exchange_mode === 'manual' && manualChanged
        ? new Date().toISOString() : intl.manual_rates_updated_at;
      const { error } = await supabase.from('international_catalog_config').update({
        show_prices: intl.show_prices, show_stock: intl.show_stock,
        base_currency: intl.base_currency, default_currency: intl.default_currency,
        margin_percent: Number(intl.margin_percent) || 0,
        show_currency_selector: intl.show_currency_selector, available_currencies: intl.available_currencies,
        default_language: intl.default_language, show_language_selector: intl.show_language_selector,
        available_languages: intl.available_languages, exchange_mode: intl.exchange_mode,
        manual_rates, manual_rates_updated_at, show_logo: intl.show_logo, show_banner: intl.show_banner,
        banner_content: intl.banner_content, contact_email: intl.contact_email,
        contact_whatsapp: intl.contact_whatsapp, visible_product_ids: intl.visible_product_ids,
      }).eq('id', intl.id);
      if (error) throw error;
      toast.success('Configurações de idioma/moeda salvas');
      await fetchIntlConfig();
    } catch (e: any) {
      toast.error('Erro: ' + e.message);
    } finally { setSavingIntl(false); }
  };

  const exchange = useExchangeRate({
    mode: intl?.exchange_mode || 'auto',
    baseCurrency: intl?.base_currency || 'BRL',
    manualRates: intl?.manual_rates || {},
    manualRatesUpdatedAt: intl?.manual_rates_updated_at || null,
  });

  const fetchMargensProduto = async () => {
    const { data } = await supabase.from('margem_internacional_produto' as any).select('modelo_id, margem_percentual');
    if (data) {
      const map: Record<string, string> = {};
      (data as any[]).forEach((d: any) => { map[d.modelo_id] = String(d.margem_percentual); });
      setMargensProduto(map);
    }
  };

  const salvarMargemGlobal = async () => {
    setSalvandoMargem(true);
    try {
      await supabase.from('config_internacional' as any).update({ valor: margemGlobal } as any).eq('chave', 'margem_global');
      toast.success('Margem global salva!');
    } catch { toast.error('Erro ao salvar'); }
    finally { setSalvandoMargem(false); }
  };

  const salvarMargemProduto = async (modeloId: string, valor: string) => {
    const num = parseFloat(valor);
    if (isNaN(num) || num <= 0) {
      await supabase.from('margem_internacional_produto' as any).delete().eq('modelo_id', modeloId);
      setMargensProduto(prev => { const n = { ...prev }; delete n[modeloId]; return n; });
      toast.success('Margem individual removida');
      return;
    }
    const { data: existing } = await supabase.from('margem_internacional_produto' as any).select('id').eq('modelo_id', modeloId).maybeSingle();
    if (existing) await supabase.from('margem_internacional_produto' as any).update({ margem_percentual: num } as any).eq('modelo_id', modeloId);
    else await supabase.from('margem_internacional_produto' as any).insert({ modelo_id: modeloId, margem_percentual: num } as any);
    setMargensProduto(prev => ({ ...prev, [modeloId]: valor }));
    toast.success('Margem salva!');
  };

  const copiarLinkCategoria = (categoria: string) => {
    const url = `${window.location.origin}/catalogo-internacional?categoria=${encodeURIComponent(categoria)}`;
    navigator.clipboard.writeText(url);
    toast.success(`Link "${categoria}" copiado!`);
  };

  const toggleCategoriaCompartilhar = (categoria: string) => {
    setCategoriasParaCompartilhar(prev => { const n = new Set(prev); if (n.has(categoria)) n.delete(categoria); else n.add(categoria); return n; });
  };

  const copiarLinkMultiCategorias = () => {
    if (categoriasParaCompartilhar.size === 0) { toast.error('Selecione pelo menos uma categoria'); return; }
    const cats = Array.from(categoriasParaCompartilhar).map(c => encodeURIComponent(c)).join(',');
    navigator.clipboard.writeText(`${window.location.origin}/catalogo-internacional?categorias=${cats}`);
    toast.success(`Link com ${categoriasParaCompartilhar.size} categorias copiado!`);
  };

  const toggleProdutoCompartilhar = (id: string) => {
    setProdutosParaCompartilhar(prev => { const n = new Set(prev); if (n.has(id)) n.delete(id); else n.add(id); return n; });
  };

  const copiarLinkProdutos = () => {
    if (produtosParaCompartilhar.size === 0) { toast.error('Selecione pelo menos uma lâmina'); return; }
    const ids = Array.from(produtosParaCompartilhar).join(',');
    navigator.clipboard.writeText(`${window.location.origin}/catalogo-internacional?produtos=${ids}`);
    toast.success(`Link com ${produtosParaCompartilhar.size} lâminas copiado!`);
  };

  const copiarMensagemPadrao = () => {
    const url = `${window.location.origin}/catalogo-internacional`;
    navigator.clipboard.writeText(`${mensagemPadrao}\n\n${url}`);
    toast.success('Mensagem copiada!');
  };

  const salvarMensagemPadrao = async () => {
    setSalvandoMensagem(true);
    try {
      const { data: existing } = await supabase.from('config_internacional' as any).select('id').eq('chave', 'mensagem_padrao_internacional').maybeSingle();
      if (existing) await supabase.from('config_internacional' as any).update({ valor: mensagemPadrao } as any).eq('chave', 'mensagem_padrao_internacional');
      else await supabase.from('config_internacional' as any).insert({ chave: 'mensagem_padrao_internacional', valor: mensagemPadrao } as any);
      toast.success('Mensagem salva!');
    } catch { toast.error('Erro ao salvar'); }
    finally { setSalvandoMensagem(false); }
  };

  const updateConfig = async (chave: string, valor: string) => {
    const { data: existing } = await supabase.from('config_internacional' as any).select('id').eq('chave', chave).maybeSingle();
    if (existing) await supabase.from('config_internacional' as any).update({ valor } as any).eq('chave', chave);
    else await supabase.from('config_internacional' as any).insert({ chave, valor } as any);
  };

  const toggleExibirPrecos = async () => {
    const v = !exibirPrecos; await updateConfig('exibir_precos', v.toString()); setExibirPrecos(v);
    toast.success(v ? 'Preços visíveis' : 'Preços ocultos');
  };

  const fetchModelos = async () => {
    const { data } = await supabase.from('catalogo_modelos').select('id, nome_modelo, nome_modelo_en, descricao_html_en, imagem_modelo, preco_base, ordem_catalogo, visivel_todas, categorias, pronta_entrega')
      .eq('visivel_catalogo', true).order('ordem_catalogo');
    if (data) setTodosModelos(data as ModeloCatalogo[]);
  };

  const carregarDestaquesCategoria = async (categoriaId: string) => {
    const { data } = await supabase.from('ordem_categoria_internacional' as any).select('modelo_id, ordem').eq('categoria_id', categoriaId).order('ordem');
    setDestaquesCategoriaIds(data ? (data as any[]).map((d: any) => d.modelo_id) : []);
  };

  const selecionarCategoriaDestaques = (catId: string) => { setCategoriaSelecionadaDestaques(catId); carregarDestaquesCategoria(catId); };
  const adicionarDestaqueCategoria = (id: string) => {
    if (destaquesCategoriaIds.length >= 10) { toast.error('Máximo de 10'); return; }
    if (destaquesCategoriaIds.includes(id)) return;
    setDestaquesCategoriaIds(prev => [...prev, id]);
  };
  const removerDestaqueCategoria = (id: string) => setDestaquesCategoriaIds(prev => prev.filter(d => d !== id));
  const moverDestaqueCategoria = (index: number, dir: 'up' | 'down') => {
    const newList = [...destaquesCategoriaIds];
    const t = dir === 'up' ? index - 1 : index + 1;
    if (t < 0 || t >= newList.length) return;
    [newList[index], newList[t]] = [newList[t], newList[index]];
    setDestaquesCategoriaIds(newList);
  };

  const salvarDestaquesCategoria = async () => {
    if (!categoriaSelecionadaDestaques) return;
    setSalvandoDestaquesCategoria(true);
    try {
      await supabase.from('ordem_categoria_internacional' as any).delete().eq('categoria_id', categoriaSelecionadaDestaques);
      if (destaquesCategoriaIds.length > 0) {
        const inserts = destaquesCategoriaIds.map((modeloId, i) => ({ categoria_id: categoriaSelecionadaDestaques, modelo_id: modeloId, ordem: i + 1 }));
        await supabase.from('ordem_categoria_internacional' as any).insert(inserts as any);
      }
      toast.success('Ordem salva!');
    } catch { toast.error('Erro ao salvar'); }
    finally { setSalvandoDestaquesCategoria(false); }
  };

  const modelosDaCategoria = categoriaSelecionadaDestaques
    ? todosModelos.filter(m => { const cat = categoriasVisiveis.find(c => c.id === categoriaSelecionadaDestaques); return cat && m.categorias?.includes(cat.categoria); }) : [];

  const fetchCategoriasVisiveis = async () => {
    const { data } = await supabase.from('categorias_catalogo_visiveis').select('*').order('ordem');
    if (data) setCategoriasVisiveis(data);
  };

  const toggleProntaEntrega = async (modelo: ModeloCatalogo) => {
    setSalvandoProntaEntrega(true);
    const { error } = await supabase.from('catalogo_modelos').update({ pronta_entrega: !modelo.pronta_entrega }).eq('id', modelo.id);
    if (error) toast.error('Erro');
    else { setTodosModelos(prev => prev.map(m => m.id === modelo.id ? { ...m, pronta_entrega: !m.pronta_entrega } : m));
      toast.success(modelo.pronta_entrega ? 'Removido' : 'Marcado'); }
    setSalvandoProntaEntrega(false);
  };

  const produtosFiltradosIntl = useMemo(() => {
    const q = buscaProdutoIntl.trim().toLowerCase();
    if (!q) return todosModelos;
    return todosModelos.filter(p => p.nome_modelo.toLowerCase().includes(q) || (p.nome_modelo_en || '').toLowerCase().includes(q));
  }, [todosModelos, buscaProdutoIntl]);

  return (
    <div className="space-y-4 px-1">
      <div className="min-w-0">
        <h1 className="text-lg sm:text-2xl font-bold flex items-center gap-2"><Globe className="h-5 w-5" /> Config. Catálogo Internacional</h1>
        <p className="text-muted-foreground text-xs sm:text-sm">Idioma, moeda, câmbio, margens e exibição.</p>
      </div>

      <Tabs defaultValue="idioma-moeda" className="w-full">
        <TabsList className="grid grid-cols-3 sm:grid-cols-7 w-full h-auto gap-1">
          <TabsTrigger value="idioma-moeda" className="gap-1 text-xs sm:text-sm px-2 py-1.5"><Languages className="h-3.5 w-3.5 hidden sm:block" />Idioma/Moeda</TabsTrigger>
          <TabsTrigger value="margens" className="gap-1 text-xs sm:text-sm px-2 py-1.5"><TrendingUp className="h-3.5 w-3.5 hidden sm:block" />Margens</TabsTrigger>
          <TabsTrigger value="visibilidade" className="gap-1 text-xs sm:text-sm px-2 py-1.5"><Eye className="h-3.5 w-3.5 hidden sm:block" />Visibilidade</TabsTrigger>
          <TabsTrigger value="geral" className="gap-1 text-xs sm:text-sm px-2 py-1.5"><DollarSign className="h-3.5 w-3.5 hidden sm:block" />Geral</TabsTrigger>
          <TabsTrigger value="destaques" className="gap-1 text-xs sm:text-sm px-2 py-1.5"><Star className="h-3.5 w-3.5 hidden sm:block" />Destaques</TabsTrigger>
          <TabsTrigger value="categorias" className="gap-1 text-xs sm:text-sm px-2 py-1.5"><Tags className="h-3.5 w-3.5 hidden sm:block" />Categorias</TabsTrigger>
          <TabsTrigger value="pronta-entrega" className="gap-1 text-xs sm:text-sm px-2 py-1.5"><Package className="h-3.5 w-3.5 hidden sm:block" />Pronta Entrega</TabsTrigger>
        </TabsList>

        <TabsContent value="visibilidade" className="space-y-3 mt-4">
          <VisibilidadeLaminasTab field="visivel_internacional" catalogoLabel="Catálogo Internacional" />
        </TabsContent>


        {/* Aba Idioma/Moeda/Câmbio */}
        <TabsContent value="idioma-moeda" className="space-y-4 mt-4">
          {!intl ? <div className="flex justify-center py-10"><Loader2 className="h-6 w-6 animate-spin" /></div> : (<>
            <Card>
              <CardHeader className="pb-3"><CardTitle className="text-base flex items-center gap-2"><Languages className="h-4 w-4" /> Idioma</CardTitle></CardHeader>
              <CardContent className="space-y-3">
                <div><Label>Idioma padrão</Label>
                  <Select value={intl.default_language} onValueChange={(v) => updateIntl('default_language', v)}>
                    <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                    <SelectContent>{ALL_LANGUAGES.map(l => <SelectItem key={l.code} value={l.code}>{l.label}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                <div className="flex items-center justify-between"><Label>Mostrar seletor de idioma</Label>
                  <Switch checked={intl.show_language_selector} onCheckedChange={(v) => updateIntl('show_language_selector', v)} /></div>
                {intl.show_language_selector && (
                  <div className="pl-2 border-l-2 border-muted">
                    <Label className="text-xs text-muted-foreground">Idiomas disponíveis</Label>
                    <div className="flex gap-3 mt-1">
                      {ALL_LANGUAGES.map(l => (
                        <label key={l.code} className="flex items-center gap-2 cursor-pointer">
                          <Checkbox checked={intl.available_languages.includes(l.code)} onCheckedChange={() => updateIntl('available_languages', toggleArrayItem(intl.available_languages, l.code))} />
                          <span className="text-sm">{l.label}</span>
                        </label>
                      ))}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-3"><CardTitle className="text-base flex items-center gap-2"><DollarSign className="h-4 w-4" /> Moeda</CardTitle></CardHeader>
              <CardContent className="space-y-3">
                <div className="grid grid-cols-2 gap-3">
                  <div><Label>Moeda base</Label>
                    <Select value={intl.base_currency} onValueChange={(v) => updateIntl('base_currency', v)}>
                      <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                      <SelectContent>{ALL_CURRENCIES.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
                    </Select>
                  </div>
                  <div><Label>Moeda padrão exibida</Label>
                    <Select value={intl.default_currency} onValueChange={(v) => updateIntl('default_currency', v)}>
                      <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                      <SelectContent>{ALL_CURRENCIES.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="flex items-center justify-between"><Label>Mostrar seletor de moeda</Label>
                  <Switch checked={intl.show_currency_selector} onCheckedChange={(v) => updateIntl('show_currency_selector', v)} /></div>
                {intl.show_currency_selector && (
                  <div className="pl-2 border-l-2 border-muted">
                    <Label className="text-xs text-muted-foreground">Moedas disponíveis</Label>
                    <div className="flex flex-wrap gap-3 mt-1">
                      {ALL_CURRENCIES.map(c => (
                        <label key={c} className="flex items-center gap-2 cursor-pointer">
                          <Checkbox checked={intl.available_currencies.includes(c)} onCheckedChange={() => updateIntl('available_currencies', toggleArrayItem(intl.available_currencies, c))} />
                          <span className="text-sm">{c}</span>
                        </label>
                      ))}
                    </div>
                  </div>
                )}
                <div><Label>Margem cambial (%)</Label>
                  <Input type="number" step="0.1" value={intl.margin_percent}
                    onChange={(e) => updateIntl('margin_percent', parseFloat(e.target.value) || 0)} className="mt-1" />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-3"><CardTitle className="text-base flex items-center gap-2"><RefreshCw className="h-4 w-4" /> Cotação</CardTitle></CardHeader>
              <CardContent className="space-y-3">
                <div className="grid grid-cols-2 gap-3">
                  {(['auto', 'manual'] as const).map(mode => {
                    const active = intl.exchange_mode === mode;
                    return (
                      <button key={mode} type="button" onClick={() => updateIntl('exchange_mode', mode)}
                        className={`text-left rounded-lg border p-3 transition ${active ? 'border-primary bg-primary/5 ring-2 ring-primary/30' : 'border-border hover:border-primary/50'}`}>
                        <div className="font-semibold text-sm">{mode === 'auto' ? 'Automático' : 'Manual'}</div>
                        <div className="text-xs text-muted-foreground mt-1">{mode === 'auto' ? 'Cotação do dia automática.' : 'Você define os valores.'}</div>
                      </button>
                    );
                  })}
                </div>
                {intl.exchange_mode === 'auto' && (
                  <div className="space-y-2 rounded-md border p-3 bg-muted/30">
                    <div className="flex items-center justify-between"><p className="text-xs text-muted-foreground">Atualizada 1x/dia</p>
                      <Button size="sm" variant="outline" onClick={() => exchange.refresh()} disabled={exchange.loading}>
                        {exchange.loading ? <Loader2 className="h-3 w-3 animate-spin mr-1" /> : <RefreshCw className="h-3 w-3 mr-1" />} Atualizar
                      </Button>
                    </div>
                    {intl.available_currencies.filter(c => c !== intl.base_currency).map(c => (
                      <div key={c} className="text-xs font-mono">1 {intl.base_currency} = {exchange.getRate(c)?.toFixed(4) || '—'} {c}</div>
                    ))}
                  </div>
                )}
                {intl.exchange_mode === 'manual' && (
                  <div className="space-y-2 rounded-md border p-3 bg-yellow-50 dark:bg-yellow-950/30 border-yellow-300">
                    <div className="flex items-start gap-2"><AlertTriangle className="h-4 w-4 text-yellow-700 mt-0.5" />
                      <p className="text-xs text-yellow-900 dark:text-yellow-200">Os preços não atualizam sozinhos.</p></div>
                    {intl.available_currencies.filter(c => c !== intl.base_currency).map(c => (
                      <div key={c} className="flex items-center gap-2">
                        <Label className="w-12 font-mono text-xs">{c}</Label>
                        <Input type="number" step="0.0001" placeholder={`1 ${c} = X ${intl.base_currency}`}
                          value={manualRatesDraft[c] ?? ''} onChange={(e) => setManualRatesDraft(p => ({ ...p, [c]: e.target.value }))} className="h-8 text-xs" />
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-3"><CardTitle className="text-base">Aparência e contato</CardTitle></CardHeader>
              <CardContent className="space-y-3">
                <div className="flex items-center justify-between"><Label>Exibir banner</Label><Switch checked={intl.show_banner} onCheckedChange={(v) => updateIntl('show_banner', v)} /></div>
                <div><Label>Conteúdo do banner</Label><Textarea value={intl.banner_content || ''} onChange={(e) => updateIntl('banner_content', e.target.value)} className="mt-1" /></div>
                <div className="grid grid-cols-2 gap-3">
                  <div><Label>E-mail</Label><Input type="email" value={intl.contact_email || ''} onChange={(e) => updateIntl('contact_email', e.target.value)} className="mt-1 h-9" /></div>
                  <div><Label>WhatsApp</Label><Input value={intl.contact_whatsapp || ''} onChange={(e) => updateIntl('contact_whatsapp', e.target.value)} placeholder="+5528999025695" className="mt-1 h-9" /></div>
                </div>
              </CardContent>
            </Card>

            <Button onClick={salvarIntl} disabled={savingIntl} className="w-full" size="lg">
              {savingIntl ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Save className="h-4 w-4 mr-2" />} Salvar idioma/moeda
            </Button>

            <TranslationManager
              produtos={produtosFiltradosIntl}
              busca={buscaProdutoIntl}
              setBusca={setBuscaProdutoIntl}
              onRefresh={fetchModelos}
            />

            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2"><Languages className="h-4 w-4" /> Tradução de Categorias</CardTitle>
                <CardDescription className="text-xs">Defina o nome em inglês de cada categoria (ex: Cozinha → Kitchen).</CardDescription>
              </CardHeader>
              <CardContent className="space-y-2">
                {categoriasVisiveis.map((cat) => (
                  <div key={cat.id} className="grid grid-cols-2 gap-2 items-center">
                    <div className="text-xs text-muted-foreground truncate">{cat.categoria}</div>
                    <Input
                      value={cat.nome_en || ''}
                      placeholder="Name in English"
                      className="h-8 text-xs"
                      onChange={(e) => setCategoriasVisiveis(prev => prev.map(c => c.id === cat.id ? { ...c, nome_en: e.target.value } : c))}
                      onBlur={async (e) => {
                        const { error } = await supabase.from('categorias_catalogo_visiveis')
                          .update({ nome_en: e.target.value || null } as any).eq('id', cat.id);
                        if (error) toast.error('Erro ao salvar'); else toast.success('Salvo', { duration: 1200 });
                      }}
                    />
                  </div>
                ))}
                {categoriasVisiveis.length === 0 && <p className="text-xs text-muted-foreground">Nenhuma categoria.</p>}
              </CardContent>
            </Card>
          </>)}
        </TabsContent>

        {/* Aba Margens */}
        <TabsContent value="margens" className="space-y-4 mt-4">
          <Card>
            <CardHeader className="pb-3"><CardTitle className="text-base flex items-center gap-2"><Percent className="h-4 w-4" />Margem Global</CardTitle>
              <CardDescription className="text-xs">Margem aplicada a todos os produtos sobre a cotação base.</CardDescription></CardHeader>
            <CardContent className="space-y-3">
              <div className="flex items-end gap-3">
                <div className="flex-1 space-y-1"><Label className="text-xs">Margem (%)</Label>
                  <Input type="number" value={margemGlobal} onChange={e => setMargemGlobal(e.target.value)} placeholder="30" className="h-9" /></div>
                <Button size="sm" onClick={salvarMargemGlobal} disabled={salvandoMargem} className="h-9">
                  {salvandoMargem ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Salvar'}</Button>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3"><CardTitle className="text-base flex items-center gap-2"><Percent className="h-4 w-4" />Margem por Produto</CardTitle></CardHeader>
            <CardContent className="space-y-3">
              <Input placeholder="Buscar..." value={buscaMargem} onChange={e => setBuscaMargem(e.target.value)} className="h-8 text-sm" />
              <div className="max-h-[50vh] overflow-y-auto space-y-1.5">
                {todosModelos.filter(m => !buscaMargem || m.nome_modelo.toLowerCase().includes(buscaMargem.toLowerCase())).map(modelo => {
                  const mi = margensProduto[modelo.id] || '';
                  return (
                    <div key={modelo.id} className="flex items-center gap-2 p-2 rounded-lg border">
                      {modelo.imagem_modelo && <img src={modelo.imagem_modelo} alt="" className="w-8 h-8 rounded object-cover flex-shrink-0" />}
                      <div className="flex-1 min-w-0"><p className="text-xs font-medium truncate">{modelo.nome_modelo}</p></div>
                      <div className="flex items-center gap-1 shrink-0">
                        <Input type="number" value={mi} onChange={e => setMargensProduto(prev => ({ ...prev, [modelo.id]: e.target.value }))} placeholder={margemGlobal} className="h-7 w-16 text-xs text-center" />
                        <span className="text-xs text-muted-foreground">%</span>
                        <Button variant="ghost" size="sm" className="h-7 w-7 p-0" onClick={() => salvarMargemProduto(modelo.id, mi)}><Check className="h-3 w-3" /></Button>
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
            <CardHeader className="pb-3"><CardTitle className="text-base">Exibição de Preços</CardTitle></CardHeader>
            <CardContent>
              <div className="flex items-center justify-between"><p className="text-sm font-medium">{exibirPrecos ? 'Visíveis' : 'Ocultos'}</p>
                <Switch checked={exibirPrecos} onCheckedChange={toggleExibirPrecos} /></div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-3"><CardTitle className="text-base">Filtros</CardTitle></CardHeader>
            <CardContent className="space-y-3">
              <div className="flex items-center justify-between"><p className="text-sm">Filtro de Preço</p>
                <Switch checked={filtroPrecoAtivo} onCheckedChange={async () => { const v = !filtroPrecoAtivo; await updateConfig('filtro_preco_ativo', v.toString()); setFiltroPrecoAtivo(v); }} /></div>
              <div className="flex items-center justify-between"><p className="text-sm">Filtro de Comprimento</p>
                <Switch checked={filtroTamanhoAtivo} onCheckedChange={async () => { const v = !filtroTamanhoAtivo; await updateConfig('filtro_tamanho_ativo', v.toString()); setFiltroTamanhoAtivo(v); }} /></div>
              <div className="flex items-center justify-between"><p className="text-sm">Filtro de Fio de Corte</p>
                <Switch checked={filtroLaminaAtivo} onCheckedChange={async () => { const v = !filtroLaminaAtivo; await updateConfig('filtro_lamina_ativo', v.toString()); setFiltroLaminaAtivo(v); }} /></div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Aba Destaques */}
        <TabsContent value="destaques" className="space-y-4 mt-4">
          <Card>
            <CardHeader className="pb-3"><CardTitle className="text-base">Primeiras 10 por Categoria</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              <div className="flex flex-wrap gap-1.5">
                {categoriasVisiveis.filter(c => c.visivel).map(cat => (
                  <button key={cat.id} onClick={() => selecionarCategoriaDestaques(cat.id)}
                    className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-colors ${categoriaSelecionadaDestaques === cat.id ? 'bg-accent text-white border-accent' : 'bg-muted/30 text-muted-foreground border-border hover:border-accent/50'}`}>
                    {cat.categoria}
                  </button>
                ))}
              </div>
              {categoriaSelecionadaDestaques ? (<>
                <div className="space-y-1.5">
                  <Label className="text-sm font-semibold">Selecionadas ({destaquesCategoriaIds.length}/10)</Label>
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
                  <Label className="text-sm font-semibold">Adicionar</Label>
                  <div className="max-h-52 overflow-y-auto space-y-0.5 border rounded-lg p-1.5">
                    {modelosDaCategoria.filter(m => !destaquesCategoriaIds.includes(m.id)).map(modelo => (
                      <div key={modelo.id} className="flex items-center gap-2 p-1.5 rounded hover:bg-muted/50 cursor-pointer" onClick={() => adicionarDestaqueCategoria(modelo.id)}>
                        {modelo.imagem_modelo && <img src={modelo.imagem_modelo} alt="" className="w-7 h-7 rounded object-cover" />}
                        <span className="text-xs flex-1 truncate">{modelo.nome_modelo}</span>
                        <Plus className="h-3.5 w-3.5 text-accent" />
                      </div>
                    ))}
                  </div>
                </div>
                <Button onClick={salvarDestaquesCategoria} disabled={salvandoDestaquesCategoria} className="w-full" size="sm">
                  {salvandoDestaquesCategoria ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Salvando...</> : 'Salvar ordem'}
                </Button>
              </>) : <p className="text-xs text-muted-foreground text-center py-4">Selecione uma categoria</p>}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Aba Categorias */}
        <TabsContent value="categorias" className="space-y-3 mt-4">
          <Card>
            <CardHeader className="pb-3"><CardTitle className="text-base flex items-center gap-2"><Copy className="h-4 w-4" />Mensagem Padrão</CardTitle></CardHeader>
            <CardContent className="space-y-3">
              <textarea value={mensagemPadrao} onChange={e => setMensagemPadrao(e.target.value)}
                className="w-full h-20 rounded-md border border-input bg-background px-3 py-2 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-ring" />
              <p className="text-[10px] text-muted-foreground">Link: {window.location.origin}/catalogo-internacional</p>
              <div className="flex gap-2">
                <Button size="sm" variant="outline" onClick={copiarMensagemPadrao} className="flex-1 gap-2"><Copy className="h-3.5 w-3.5" />Copiar mensagem + link</Button>
                <Button size="sm" onClick={salvarMensagemPadrao} disabled={salvandoMensagem} className="gap-2">
                  {salvandoMensagem ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : 'Salvar'}</Button>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3"><CardTitle className="text-base flex items-center gap-2"><Share2 className="h-4 w-4" />Compartilhar Categorias</CardTitle></CardHeader>
            <CardContent className="space-y-3">
              <div className="flex flex-wrap gap-2">
                {categoriasVisiveis.filter(c => c.visivel).map(cat => {
                  const sel = categoriasParaCompartilhar.has(cat.categoria);
                  return (
                    <button key={cat.id} onClick={() => toggleCategoriaCompartilhar(cat.categoria)}
                      className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-colors ${sel ? 'bg-accent text-accent-foreground border-accent' : 'bg-muted/30 text-muted-foreground border-border hover:border-accent/50'}`}>
                      {cat.categoria}
                    </button>
                  );
                })}
              </div>
              <Button size="sm" onClick={copiarLinkMultiCategorias} disabled={categoriasParaCompartilhar.size === 0} className="w-full gap-2">
                <Copy className="h-3.5 w-3.5" />Copiar link ({categoriasParaCompartilhar.size})
              </Button>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3"><CardTitle className="text-base flex items-center gap-2"><Share2 className="h-4 w-4" />Compartilhar Lâminas</CardTitle></CardHeader>
            <CardContent className="space-y-3">
              <Input placeholder="Buscar..." value={buscaProdutoCompartilhar} onChange={e => setBuscaProdutoCompartilhar(e.target.value)} className="h-8 text-sm" />
              {produtosParaCompartilhar.size > 0 && (
                <div className="flex flex-wrap gap-1.5">
                  {Array.from(produtosParaCompartilhar).map(id => {
                    const m = todosModelos.find(x => x.id === id); if (!m) return null;
                    return <Badge key={id} className="bg-accent/20 text-accent border-accent/30 text-[10px] cursor-pointer gap-1" onClick={() => toggleProdutoCompartilhar(id)}>{m.nome_modelo}<X className="h-2.5 w-2.5" /></Badge>;
                  })}
                </div>
              )}
              <div className="max-h-48 overflow-y-auto space-y-0.5 border rounded-lg p-1.5">
                {todosModelos.filter(m => !buscaProdutoCompartilhar || m.nome_modelo.toLowerCase().includes(buscaProdutoCompartilhar.toLowerCase())).map(modelo => {
                  const sel = produtosParaCompartilhar.has(modelo.id);
                  return (
                    <div key={modelo.id} className={`flex items-center gap-2 p-1.5 rounded cursor-pointer ${sel ? 'bg-accent/10' : 'hover:bg-muted/50'}`} onClick={() => toggleProdutoCompartilhar(modelo.id)}>
                      <div className={`w-4 h-4 rounded border flex items-center justify-center shrink-0 ${sel ? 'bg-accent border-accent' : 'border-border'}`}>
                        {sel && <Check className="h-3 w-3 text-accent-foreground" />}
                      </div>
                      {modelo.imagem_modelo && <img src={modelo.imagem_modelo} alt="" className="w-7 h-7 rounded object-cover" />}
                      <span className="text-xs flex-1 truncate">{modelo.nome_modelo}</span>
                    </div>
                  );
                })}
              </div>
              <Button size="sm" onClick={copiarLinkProdutos} disabled={produtosParaCompartilhar.size === 0} className="w-full gap-2">
                <Copy className="h-3.5 w-3.5" />Copiar link ({produtosParaCompartilhar.size})
              </Button>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3"><CardTitle className="text-base">Categorias do Catálogo</CardTitle></CardHeader>
            <CardContent className="space-y-2">
              {categoriasVisiveis.map(cat => {
                const Icon = getIconComponent(cat.icone);
                return (
                  <div key={cat.id} className="flex items-center gap-3 py-2 px-3 rounded-lg border">
                    <Icon className="h-4 w-4 text-accent shrink-0" />
                    <span className="text-sm font-medium flex-1">{cat.categoria}</span>
                    <Button variant="ghost" size="sm" className="h-7 px-2 gap-1 text-xs" onClick={() => copiarLinkCategoria(cat.categoria)}>
                      <Copy className="h-3 w-3" />Link
                    </Button>
                    <Badge variant={cat.visivel ? 'default' : 'secondary'} className="text-[10px]">{cat.visivel ? 'Visível' : 'Oculta'}</Badge>
                  </div>
                );
              })}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Aba Pronta Entrega */}
        <TabsContent value="pronta-entrega" className="space-y-3 mt-4">
          <Card>
            <CardHeader className="pb-3"><CardTitle className="text-base">Pronta Entrega</CardTitle></CardHeader>
            <CardContent>
              <div className="space-y-1.5 max-h-[60vh] overflow-y-auto">
                {todosModelos.map(modelo => (
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
