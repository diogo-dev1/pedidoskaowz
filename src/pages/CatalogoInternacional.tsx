import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Search, MessageCircle, Check, ChevronDown, Star, ArrowRight, Zap, Package, SlidersHorizontal, X, TrendingUp, Globe, Languages, DollarSign } from 'lucide-react';
import { Slider } from '@/components/ui/slider';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';
import { getIconComponent } from '@/lib/icon-utils';
import { useExchangeRate, type ExchangeMode } from '@/hooks/useExchangeRate';

const SELECAO_INTERNACIONAL_KEY = 'catalogo_internacional_selecionados';
const PREF_LANG_KEY = 'catalogo_internacional_lang';
const PREF_CURRENCY_KEY = 'catalogo_internacional_currency';

// ===== i18n =====
const T = {
  pt: {
    title: 'CATÁLOGO',
    titleAccent: 'INTERNACIONAL',
    subtitle: 'Preços convertidos em tempo real para a sua moeda.',
    seeAll: 'Ver todo o catálogo',
    readyDelivery: 'Pronta Entrega',
    buildKit: 'Monte um Kit',
    helpQuestion: 'Precisa de ajuda?',
    talkWhatsapp: 'Fale conosco no WhatsApp',
    back: '← Voltar',
    catalogTitle: 'CATÁLOGO INTERNACIONAL',
    search: 'Buscar lâminas...',
    categories: 'Categorias',
    selected: 'selecionadas',
    all: 'Todas',
    selectCategories: 'Selecione categorias',
    clear: 'Limpar',
    priceRange: 'Faixa de Preço',
    min: 'Mínimo:',
    max: 'Máximo:',
    bladeFound: 'lâmina encontrada',
    bladesFound: 'lâminas encontradas',
    clearFilter: 'Limpar filtro',
    totalLength: 'Comprimento Total',
    cuttingEdge: 'Fio de Corte',
    showUpTo: 'Exibir lâminas até:',
    showing: 'Mostrando',
    product: 'produto',
    products: 'produtos',
    seeDetails: 'Ver detalhes',
    noBlades: 'Nenhuma lâmina encontrada',
    selectAtLeast: 'Selecione pelo menos uma lâmina',
    requestQuote: 'Solicitar Cotação',
    quoteMsgIntro: 'Olá! Tenho interesse no catálogo internacional e gostaria de cotação para:',
    selectAndQuote: 'Selecione as lâminas e solicite uma',
    quoteAction: 'cotação internacional',
    sku: 'SKU',
    base: 'Preço',
    language: 'Idioma',
    currency: 'Moeda',
    exchangeNote: 'Cotação',
    salePrice: 'Preço Final',
    cost: 'Base',
    profit: 'Margem',
    marginNote: 'Margem aplicada',
    worldwide: 'Envio Internacional',
  },
  en: {
    title: 'INTERNATIONAL',
    titleAccent: 'CATALOG',
    subtitle: 'Live currency conversion at checkout.',
    seeAll: 'View entire catalog',
    readyDelivery: 'In Stock',
    buildKit: 'Build a Kit',
    helpQuestion: 'Need help?',
    talkWhatsapp: 'Talk to us on WhatsApp',
    back: '← Back',
    catalogTitle: 'INTERNATIONAL CATALOG',
    search: 'Search blades...',
    categories: 'Categories',
    selected: 'selected',
    all: 'All',
    selectCategories: 'Select categories',
    clear: 'Clear',
    priceRange: 'Price Range',
    min: 'Min:',
    max: 'Max:',
    bladeFound: 'blade found',
    bladesFound: 'blades found',
    clearFilter: 'Clear filter',
    totalLength: 'Total Length',
    cuttingEdge: 'Cutting Edge',
    showUpTo: 'Show blades up to:',
    showing: 'Showing',
    product: 'product',
    products: 'products',
    seeDetails: 'View details',
    noBlades: 'No blades found',
    selectAtLeast: 'Select at least one blade',
    requestQuote: 'Request Quote',
    quoteMsgIntro: 'Hello! I am interested in the international catalog and would like a quote for:',
    selectAndQuote: 'Select blades and request',
    quoteAction: 'an international quote',
    sku: 'SKU',
    base: 'Price',
    language: 'Language',
    currency: 'Currency',
    exchangeNote: 'Exchange',
    salePrice: 'Final Price',
    cost: 'Base',
    profit: 'Markup',
    marginNote: 'Applied markup',
    worldwide: 'Worldwide Shipping',
  },
} as const;

// Categorias PT → EN
const CATEGORY_I18N: Record<string, string> = {
  'Defesa': 'Defense',
  'EDCs': 'EDC',
  'EDC Mini': 'Mini EDC',
  'Campo': 'Outdoor',
  'Cozinha': 'Kitchen',
  'Churrasco': 'BBQ',
  'Kits': 'Kits',
  'Utensílios': 'Accessories',
  'Vestuário': 'Apparel',
  'Cafés': 'Coffee',
  'Novidades': 'New Arrivals',
  'Porte velado': 'Concealed Carry',
};

const translateCategoria = (cat: string, lang: 'pt' | 'en') =>
  lang === 'en' ? (CATEGORY_I18N[cat] || cat) : cat;

type Lang = keyof typeof T;

interface Banner {
  id: string;
  titulo: string | null;
  subtitulo: string | null;
  imagem_url: string;
  link: string | null;
  ordem: number;
  ativo: boolean;
}

interface Modelo {
  id: string;
  nome_modelo: string;
  nome_modelo_en: string | null;
  preco_base: number;
  imagem_modelo: string | null;
  categorias: string[];
  apresentacao_venda: string | null;
  video_url: string | null;
  aspect_ratio: string;
  visivel_catalogo: boolean;
  visivel_todas: boolean;
  ordem_catalogo: number;
  pronta_entrega: boolean;
  comprimento_total: number | null;
  area_util_corte: number | null;
}

interface CategoriaVisivel {
  id: string;
  categoria: string;
  visivel: boolean;
  visivel_todas: boolean;
  ordem: number;
  icone: string;
  categoria_pai_id: string | null;
}

interface IntlConfig {
  id: string;
  base_currency: string;
  default_currency: string;
  default_language: string;
  available_currencies: string[];
  available_languages: string[];
  show_currency_selector: boolean;
  show_language_selector: boolean;
  margin_percent: number;
  exchange_mode: ExchangeMode;
  manual_rates: Record<string, number>;
  manual_rates_updated_at: string | null;
  contact_whatsapp: string | null;
}

export default function CatalogoInternacional() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const [modelos, setModelos] = useState<Modelo[]>([]);
  const [categoriaAtiva, setCategoriaAtiva] = useState<string | null>(null);
  const [categoriasMultiplas, setCategoriasMultiplas] = useState<string[]>([]);
  const [busca, setBusca] = useState('');
  const [modelosSelecionados, setModelosSelecionados] = useState<Set<string>>(() => {
    if (typeof window === 'undefined') return new Set();
    const saved = sessionStorage.getItem(SELECAO_INTERNACIONAL_KEY);
    if (!saved) return new Set();
    try {
      const ids = JSON.parse(saved);
      return Array.isArray(ids) ? new Set(ids) : new Set();
    } catch { return new Set(); }
  });
  const [loading, setLoading] = useState(true);
  const [mostrarLanding, setMostrarLanding] = useState(true);
  const [categoriasVisiveis, setCategoriasVisiveis] = useState<CategoriaVisivel[]>([]);
  const [banners, setBanners] = useState<Banner[]>([]);
  const [bannerAtual, setBannerAtual] = useState(0);
  const [exibirPrecos, setExibirPrecos] = useState(true);
  const [filtroProntaEntrega, setFiltroProntaEntrega] = useState(false);
  const [faixaPreco, setFaixaPreco] = useState<[number, number]>([0, 10000]);
  const [faixaPrecoVisual, setFaixaPrecoVisual] = useState<[number, number]>([0, 10000]);
  const [precoMaxGlobal, setPrecoMaxGlobal] = useState(10000);
  const [tamanhosSelecionados, setTamanhosSelecionados] = useState<number[]>([]);
  const [laminasSelecionadas, setLaminasSelecionadas] = useState<number[]>([]);
  const [tamanhosDisponiveis, setTamanhosDisponiveis] = useState<number[]>([]);
  const [laminasDisponiveis, setLaminasDisponiveis] = useState<number[]>([]);
  const [secaoAberta, setSecaoAberta] = useState<string | null>(null);
  const [filtroPrecoAtivo, setFiltroPrecoAtivo] = useState(true);
  const [filtroTamanhoAtivo, setFiltroTamanhoAtivo] = useState(true);
  const [filtroLaminaAtivo, setFiltroLaminaAtivo] = useState(true);
  const [ordemCategoria, setOrdemCategoria] = useState<Record<string, number>>({});
  const [margemGlobal, setMargemGlobal] = useState(30);
  const [margensProduto, setMargensProduto] = useState<Record<string, number>>({});
  const [intlConfig, setIntlConfig] = useState<IntlConfig | null>(null);
  const [lang, setLang] = useState<Lang>(() => {
    if (typeof window === 'undefined') return 'en';
    return (sessionStorage.getItem(PREF_LANG_KEY) as Lang) || 'en';
  });
  const [currency, setCurrency] = useState<string>(() => {
    if (typeof window === 'undefined') return 'USD';
    return sessionStorage.getItem(PREF_CURRENCY_KEY) || 'USD';
  });
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const t = T[lang];

  // Hook de câmbio
  const exchange = useExchangeRate({
    mode: intlConfig?.exchange_mode || 'auto',
    baseCurrency: intlConfig?.base_currency || 'BRL',
    manualRates: intlConfig?.manual_rates || {},
    manualRatesUpdatedAt: intlConfig?.manual_rates_updated_at || null,
  });

  // Persist lang/currency
  useEffect(() => { if (typeof window !== 'undefined') sessionStorage.setItem(PREF_LANG_KEY, lang); }, [lang]);
  useEffect(() => { if (typeof window !== 'undefined') sessionStorage.setItem(PREF_CURRENCY_KEY, currency); }, [currency]);

  // Persist selection
  useEffect(() => {
    if (typeof window === 'undefined') return;
    if (modelosSelecionados.size === 0) {
      sessionStorage.removeItem(SELECAO_INTERNACIONAL_KEY);
      return;
    }
    sessionStorage.setItem(SELECAO_INTERNACIONAL_KEY, JSON.stringify(Array.from(modelosSelecionados)));
  }, [modelosSelecionados]);

  const toggleSelecao = (id: string) => {
    const novaSelecao = new Set(modelosSelecionados);
    if (novaSelecao.has(id)) novaSelecao.delete(id);
    else novaSelecao.add(id);
    setModelosSelecionados(novaSelecao);
  };

  const getMargemModelo = (modeloId: string) => margensProduto[modeloId] ?? margemGlobal;

  const formatPrice = (basePrice: number, modeloId?: string) => {
    const cambialMargin = 1 + (Number(intlConfig?.margin_percent) || 0) / 100;
    const productMargin = 1 + (modeloId ? getMargemModelo(modeloId) : margemGlobal) / 100;
    const converted = exchange.convert(basePrice, currency) * cambialMargin * productMargin;
    return exchange.format(converted, currency);
  };

  const getBaseConverted = (basePrice: number) => {
    const cambialMargin = 1 + (Number(intlConfig?.margin_percent) || 0) / 100;
    return exchange.convert(basePrice, currency) * cambialMargin;
  };

  const getProfitConverted = (basePrice: number, modeloId: string) => {
    const base = getBaseConverted(basePrice);
    const productMargin = getMargemModelo(modeloId) / 100;
    return base * productMargin;
  };

  const enviarWhatsAppCombo = () => {
    if (modelosSelecionados.size === 0) {
      toast.error(t.selectAtLeast);
      return;
    }
    const modelosTexto = Array.from(modelosSelecionados)
      .map(id => {
        const m = modelos.find(x => x.id === id);
        if (!m) return '';
        const name = lang === 'en' ? (m.nome_modelo_en || m.nome_modelo) : m.nome_modelo;
        return `• ${name} — ${formatPrice(m.preco_base, m.id)}`;
      })
      .filter(Boolean).join('\n');
    const mensagem = `${t.quoteMsgIntro}\n\n${modelosTexto}`;
    const phone = (intlConfig?.contact_whatsapp || '5528999025695').replace(/\D/g, '');
    window.open(`https://wa.me/${phone}?text=${encodeURIComponent(mensagem)}`, '_blank');
  };

  const handleFaixaPrecoChange = useCallback((v: number[]) => {
    setFaixaPrecoVisual(v as [number, number]);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => setFaixaPreco(v as [number, number]), 200);
  }, []);

  const categorias = categoriasVisiveis.filter((c) => c.visivel);
  const categoriasVenda = categorias.map((cat) => ({
    subtitulo: cat.categoria, categoria: cat.categoria, icon: getIconComponent(cat.icone),
  }));

  useEffect(() => {
    carregarModelos();
    carregarCategoriasVisiveis();
    carregarBanners();
    carregarConfigInternacional();
    carregarConfigExterna();
    carregarMargensProduto();
    const catParam = searchParams.get('categoria');
    const verTudoParam = searchParams.get('ver');
    const prontaParam = searchParams.get('pronta_entrega');
    if (catParam) { setCategoriaAtiva(catParam); setMostrarLanding(false); }
    else if (verTudoParam === 'tudo') setMostrarLanding(false);
    else if (prontaParam === 'true') { setFiltroProntaEntrega(true); setMostrarLanding(false); }
  }, []);

  useEffect(() => {
    if (categoriaAtiva && categoriasVisiveis.length > 0) carregarOrdemCategoria(categoriaAtiva);
  }, [categoriasVisiveis]);

  useEffect(() => {
    if (banners.length <= 1) return;
    const interval = setInterval(() => setBannerAtual((p) => (p + 1) % banners.length), 5000);
    return () => clearInterval(interval);
  }, [banners.length]);

  const carregarBanners = async () => {
    const { data } = await supabase.from('banners_catalogo').select('*').eq('ativo', true).order('ordem');
    if (data) setBanners(data as Banner[]);
  };

  const carregarConfigInternacional = async () => {
    const { data } = await supabase
      .from('config_internacional' as any)
      .select('*')
      .in('chave', ['exibir_precos', 'filtro_preco_ativo', 'filtro_tamanho_ativo', 'filtro_lamina_ativo', 'margem_global']);
    if (data) {
      (data as any[]).forEach((d: any) => {
        if (d.chave === 'exibir_precos') setExibirPrecos(d.valor === 'true');
        if (d.chave === 'filtro_preco_ativo') setFiltroPrecoAtivo(d.valor === 'true');
        if (d.chave === 'filtro_tamanho_ativo') setFiltroTamanhoAtivo(d.valor === 'true');
        if (d.chave === 'filtro_lamina_ativo') setFiltroLaminaAtivo(d.valor === 'true');
        if (d.chave === 'margem_global') setMargemGlobal(parseFloat(d.valor) || 30);
      });
    }
  };

  const carregarConfigExterna = async () => {
    const { data } = await supabase
      .from('international_catalog_config')
      .select('*')
      .order('updated_at', { ascending: false }).limit(1).maybeSingle();
    if (data) {
      const c = data as unknown as IntlConfig;
      setIntlConfig(c);
      // Aplica preferências padrão se ainda não houver no sessionStorage
      if (typeof window !== 'undefined') {
        if (!sessionStorage.getItem(PREF_LANG_KEY) && c.default_language) {
          setLang((c.default_language as Lang) === 'pt' ? 'pt' : 'en');
        }
        if (!sessionStorage.getItem(PREF_CURRENCY_KEY) && c.default_currency) {
          setCurrency(c.default_currency);
        }
      }
    }
  };

  const carregarMargensProduto = async () => {
    const { data } = await supabase.from('margem_internacional_produto' as any)
      .select('modelo_id, margem_percentual');
    if (data) {
      const map: Record<string, number> = {};
      (data as any[]).forEach((d: any) => { map[d.modelo_id] = Number(d.margem_percentual); });
      setMargensProduto(map);
    }
  };

  const carregarOrdemCategoria = async (categoria: string) => {
    const catObj = categoriasVisiveis.find((c) => c.categoria === categoria);
    if (!catObj) { setOrdemCategoria({}); return; }
    const { data } = await supabase.from('ordem_categoria_internacional' as any)
      .select('modelo_id, ordem').eq('categoria_id', catObj.id).order('ordem');
    if (data && (data as any[]).length > 0) {
      const map: Record<string, number> = {};
      (data as any[]).forEach((d: any) => { map[d.modelo_id] = d.ordem; });
      setOrdemCategoria(map);
    } else setOrdemCategoria({});
  };

  const selecionarCategoria = (categoria: string) => {
    setCategoriaAtiva(categoria); setCategoriasMultiplas([]);
    setFiltroProntaEntrega(false); setMostrarLanding(false);
    setSearchParams({ categoria }); carregarOrdemCategoria(categoria);
  };

  const toggleCategoriaFiltro = (categoria: string) => {
    setCategoriasMultiplas((prev) => {
      const novas = prev.includes(categoria) ? prev.filter((c) => c !== categoria) : [...prev, categoria];
      if (novas.length === 0) { setCategoriaAtiva(null); setSearchParams({}); }
      else { setCategoriaAtiva(null); setSearchParams({ categorias: novas.join(',') }); }
      return novas;
    });
    setFiltroProntaEntrega(false);
  };

  const verTudo = () => {
    setMostrarLanding(false); setCategoriaAtiva(null); setCategoriasMultiplas([]);
    setFiltroProntaEntrega(false); setOrdemCategoria({}); setSearchParams({});
  };

  const verProntaEntrega = () => {
    setMostrarLanding(false); setCategoriaAtiva(null);
    setFiltroProntaEntrega(true); setSearchParams({ pronta_entrega: 'true' });
  };

  const carregarCategoriasVisiveis = async () => {
    const { data } = await supabase.from('categorias_catalogo_visiveis').select('*').order('ordem');
    if (data) setCategoriasVisiveis(data);
  };

  const carregarModelos = async () => {
    try {
      const { data: midiasData } = await supabase.from('midias_catalogo').select('modelo_id');
      const modelosComMidia = new Set((midiasData || []).map((m) => m.modelo_id));
      const { data, error } = await supabase.from('catalogo_modelos').select('*')
        .eq('visivel_catalogo', true).order('nome_modelo');
      if (error) throw error;
      const filtrados = (data || []).filter((m: any) => m.imagem_modelo || m.video_url || modelosComMidia.has(m.id));
      setModelos(filtrados as Modelo[]);
      if (filtrados.length > 0) {
        const maxP = Math.ceil(Math.max(...filtrados.map((m: any) => m.preco_base)) / 100) * 100;
        setPrecoMaxGlobal(maxP); setFaixaPreco([0, maxP]); setFaixaPrecoVisual([0, maxP]);
        const tamanhos = filtrados.filter((m: any) => m.comprimento_total != null).map((m: any) => m.comprimento_total);
        if (tamanhos.length > 0) setTamanhosDisponiveis([...new Set(tamanhos.map((t: number) => Math.round(t * 10) / 10))].sort((a: number, b: number) => a - b));
        const laminas = filtrados.filter((m: any) => m.area_util_corte != null).map((m: any) => m.area_util_corte);
        if (laminas.length > 0) setLaminasDisponiveis([...new Set(laminas.map((l: number) => Math.round(l * 10) / 10))].sort((a: number, b: number) => a - b));
      }
    } catch (e) {
      console.error(e); toast.error('Error loading catalog');
    } finally { setLoading(false); }
  };

  const categoriasPermitidasTodas = new Set(categoriasVisiveis.filter((c) => c.visivel_todas).map((c) => c.categoria));

  const getNomeModelo = (m: Modelo) => lang === 'en' ? (m.nome_modelo_en || m.nome_modelo) : m.nome_modelo;

  const modelosFiltrados = modelos.filter((modelo) => {
    if (modelo.preco_base < faixaPreco[0] || modelo.preco_base > faixaPreco[1]) return false;
    if (tamanhosSelecionados.length > 0) {
      if (modelo.comprimento_total == null) return false;
      const max = Math.max(...tamanhosSelecionados);
      if (Math.round(modelo.comprimento_total * 10) / 10 > max) return false;
    }
    if (laminasSelecionadas.length > 0) {
      if (modelo.area_util_corte == null) return false;
      const max = Math.max(...laminasSelecionadas);
      if (Math.round(modelo.area_util_corte * 10) / 10 > max) return false;
    }
    if (filtroProntaEntrega && !modelo.pronta_entrega) return false;
    if (categoriasMultiplas.length > 0) {
      const exp = new Set<string>();
      categoriasMultiplas.forEach((c) => {
        exp.add(c);
        const co = categoriasVisiveis.find((cv) => cv.categoria === c);
        if (co) categoriasVisiveis.filter((cv) => cv.categoria_pai_id === co.id).forEach((ch) => exp.add(ch.categoria));
      });
      const matchCat = modelo.categorias && Array.from(exp).some((c) => modelo.categorias.includes(c));
      const matchBusca = !busca || getNomeModelo(modelo).toLowerCase().includes(busca.toLowerCase());
      return matchCat && matchBusca;
    }
    if (categoriaAtiva) {
      const exp = new Set<string>([categoriaAtiva]);
      const co = categoriasVisiveis.find((cv) => cv.categoria === categoriaAtiva);
      if (co) categoriasVisiveis.filter((cv) => cv.categoria_pai_id === co.id).forEach((ch) => exp.add(ch.categoria));
      const matchCat = modelo.categorias && Array.from(exp).some((c) => modelo.categorias.includes(c));
      const matchBusca = !busca || getNomeModelo(modelo).toLowerCase().includes(busca.toLowerCase());
      return matchCat && matchBusca;
    }
    if (!filtroProntaEntrega) {
      const catPerm = categoriasVisiveis.length === 0 ||
        modelo.categorias && modelo.categorias.some((c) => categoriasPermitidasTodas.has(c));
      const prodPerm = modelo.visivel_todas !== false;
      const matchBusca = !busca || getNomeModelo(modelo).toLowerCase().includes(busca.toLowerCase());
      return catPerm && prodPerm && matchBusca;
    }
    const matchBusca = !busca || getNomeModelo(modelo).toLowerCase().includes(busca.toLowerCase());
    return matchBusca;
  }).sort((a, b) => {
    if ((categoriaAtiva || categoriasMultiplas.length === 1) && Object.keys(ordemCategoria).length > 0) {
      return (ordemCategoria[a.id] ?? 999) - (ordemCategoria[b.id] ?? 999);
    }
    return (a.ordem_catalogo || 999) - (b.ordem_catalogo || 999);
  });

  const showLangSelector = intlConfig?.show_language_selector !== false && (intlConfig?.available_languages?.length || 0) > 1;
  const showCurrencySelector = intlConfig?.show_currency_selector !== false && (intlConfig?.available_currencies?.length || 0) > 1;

  // Landing Page
  if (mostrarLanding) {
    return (
      <div className="min-h-screen bg-zinc-950 overflow-x-hidden max-w-[100vw]">
        <header className="relative py-10 md:py-16 overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-b from-accent/10 via-transparent to-transparent" />
          <div className="w-full max-w-7xl mx-auto px-3 sm:px-4 text-center relative z-10">
            {/* Seletor idioma/moeda */}
            <div className="absolute top-0 right-3 sm:right-4 flex gap-2 z-20">
              {showLangSelector && (
                <Select value={lang} onValueChange={(v) => setLang(v as Lang)}>
                  <SelectTrigger className="h-8 w-[88px] bg-zinc-900 border-zinc-700 text-white text-xs">
                    <Languages className="h-3 w-3 mr-1" /><SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {(intlConfig?.available_languages || ['en', 'pt']).map((l) => (
                      <SelectItem key={l} value={l}>{l === 'pt' ? 'PT-BR' : 'EN'}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
              {showCurrencySelector && (
                <Select value={currency} onValueChange={setCurrency}>
                  <SelectTrigger className="h-8 w-[80px] bg-zinc-900 border-zinc-700 text-white text-xs">
                    <DollarSign className="h-3 w-3 mr-1" /><SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {(intlConfig?.available_currencies || ['USD']).map((c) => (
                      <SelectItem key={c} value={c}>{c}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            </div>

            <div className="inline-block mb-3 mt-10 sm:mt-0">
              <span className="text-accent text-xs md:text-sm font-semibold tracking-[0.3em] uppercase"><Globe className="h-3 w-3 inline mr-1" /> Worldwide Shipping</span>
            </div>
            <h1 className="text-3xl md:text-5xl font-black text-white mb-3 tracking-tight leading-tight">
              {t.title} <span className="text-accent">{t.titleAccent}</span>
            </h1>
            <p className="text-zinc-400 text-sm md:text-lg max-w-md mx-auto">{t.subtitle}</p>
          </div>
        </header>

        <div className="w-full max-w-7xl mx-auto px-3 sm:px-4 pb-16">
          {banners.length > 0 &&
            <div className="relative max-w-5xl mx-auto mb-8 rounded-xl overflow-hidden">
              <div className="relative aspect-[21/9] md:aspect-[3/1]">
                {banners.map((banner, idx) =>
                  <div key={banner.id}
                    className={`absolute inset-0 transition-opacity duration-700 ${idx === bannerAtual ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}
                    onClick={() => banner.link && window.open(banner.link, '_blank')}
                    style={{ cursor: banner.link ? 'pointer' : 'default' }}>
                    <img src={banner.imagem_url} alt={banner.titulo || 'Banner'} className="w-full h-full object-contain" />
                  </div>
                )}
              </div>
              {banners.length > 1 &&
                <div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex gap-1.5 z-10">
                  {banners.map((_, idx) =>
                    <button key={idx} onClick={() => setBannerAtual(idx)}
                      className={`w-2 h-2 rounded-full transition-all ${idx === bannerAtual ? 'bg-accent w-6' : 'bg-white/50 hover:bg-white/80'}`} />
                  )}
                </div>}
            </div>}

          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 md:gap-4 max-w-5xl mx-auto mb-10">
            {categoriasVenda.map((cat, idx) => {
              const Icon = cat.icon;
              return (
                <div key={idx} className="group cursor-pointer" onClick={() => selecionarCategoria(cat.categoria)}>
                  <div className="relative bg-zinc-900 border border-zinc-800 hover:border-accent rounded-xl p-5 md:p-6 transition-all duration-300 text-center group-hover:bg-zinc-800 group-hover:shadow-[0_0_30px_rgba(251,146,60,0.15)] group-hover:-translate-y-1">
                    <div className="w-12 h-12 md:w-14 md:h-14 mx-auto mb-3 rounded-full bg-accent/10 flex items-center justify-center group-hover:bg-accent/20 transition-colors">
                      <Icon className="h-6 w-6 md:h-7 md:w-7 text-accent" />
                    </div>
                    <h3 className="text-white font-bold text-xs md:text-sm tracking-wide">{cat.subtitulo}</h3>
                    <div className="mt-2 opacity-0 group-hover:opacity-100 transition-opacity">
                      <ArrowRight className="h-4 w-4 text-accent mx-auto" />
                    </div>
                  </div>
                </div>);
            })}
          </div>

          <div className="flex flex-col sm:flex-row gap-3 justify-center max-w-lg mx-auto">
            <Button onClick={verTudo}
              className="flex-1 bg-accent hover:bg-accent/90 text-white font-bold h-12 text-sm md:text-base rounded-xl shadow-[0_0_30px_rgba(251,146,60,0.3)] hover:shadow-[0_0_40px_rgba(251,146,60,0.5)] transition-all">
              <Star className="h-4 w-4 mr-2" />{t.seeAll}
            </Button>
            <Button onClick={verProntaEntrega} variant="outline"
              className="flex-1 border-emerald-600/50 text-emerald-400 hover:bg-emerald-600 hover:text-white hover:border-emerald-600 font-bold h-12 text-sm md:text-base rounded-xl transition-all">
              <Zap className="h-4 w-4 mr-2" />{t.readyDelivery}
            </Button>
          </div>

          {/* Monte um Kit */}
          <div className="flex justify-center max-w-lg mx-auto mt-3">
            <Button
              onClick={() => navigate('/catalogo-internacional/montar-kit')}
              variant="outline"
              className="w-full border-accent/50 text-accent hover:bg-accent hover:text-white hover:border-accent font-bold h-12 text-sm md:text-base rounded-xl transition-all"
            >
              <Package className="h-4 w-4 mr-2" />
              {t.buildKit}
            </Button>
          </div>

          <div className="text-center mt-10 pt-8 border-t border-zinc-800/50">
            <p className="text-zinc-500 text-xs mb-3">{t.helpQuestion}</p>
            <Button variant="outline"
              onClick={() => {
                const phone = (intlConfig?.contact_whatsapp || '5528999025695').replace(/\D/g, '');
                window.open(`https://wa.me/${phone}?text=${encodeURIComponent(t.quoteMsgIntro)}`, '_blank');
              }}
              className="border-green-600/50 text-green-400 hover:bg-green-600 hover:text-white hover:border-green-600 transition-all">
              <MessageCircle className="h-4 w-4 mr-2" />{t.talkWhatsapp}
            </Button>
          </div>
        </div>
      </div>);
  }

  // Catálogo
  return (
    <div className="min-h-screen bg-zinc-950 overflow-x-hidden max-w-[100vw]">
      <header className="bg-black border-b border-white/10 sticky top-0 z-50">
        <div className="w-full max-w-7xl mx-auto px-3 sm:px-4 py-3 md:py-4">
          <div className="flex flex-col md:flex-row items-center justify-between gap-3 md:gap-4">
            <div className="flex items-center gap-2 md:gap-4 w-full md:w-auto">
              <Button variant="ghost" size="sm"
                onClick={() => { setMostrarLanding(true); setCategoriaAtiva(null); setFiltroProntaEntrega(false); setBusca(''); }}
                className="text-white hover:bg-white/10 text-xs md:text-sm">
                {t.back}
              </Button>
              <h1 className="text-lg md:text-3xl font-bold text-white tracking-tight">
                {filtroProntaEntrega ? t.readyDelivery.toUpperCase() : t.catalogTitle}
              </h1>
            </div>
            <div className="flex gap-2 w-full md:w-auto items-center">
              {showLangSelector && (
                <Select value={lang} onValueChange={(v) => setLang(v as Lang)}>
                  <SelectTrigger className="h-9 w-[80px] bg-white/5 border-white/20 text-white text-xs">
                    <Languages className="h-3 w-3 mr-1" /><SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {(intlConfig?.available_languages || ['en', 'pt']).map((l) => (
                      <SelectItem key={l} value={l}>{l === 'pt' ? 'PT' : 'EN'}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
              {showCurrencySelector && (
                <Select value={currency} onValueChange={setCurrency}>
                  <SelectTrigger className="h-9 w-[80px] bg-white/5 border-white/20 text-white text-xs">
                    <DollarSign className="h-3 w-3 mr-1" /><SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {(intlConfig?.available_currencies || ['USD']).map((c) => (
                      <SelectItem key={c} value={c}>{c}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
              <div className="relative flex-1 md:w-72">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-3.5 w-3.5 md:h-4 md:w-4 text-white/40" />
                <Input placeholder={t.search} value={busca} onChange={(e) => setBusca(e.target.value)}
                  className="pl-9 md:pl-10 text-sm md:text-base bg-white/5 border-white/20 text-white placeholder:text-white/40 focus:border-accent h-9 md:h-10" />
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Banner de cotação */}
      {exibirPrecos && intlConfig && (
        <div className="w-full bg-gradient-to-r from-blue-950/30 via-zinc-900/50 to-blue-950/30 border-b border-blue-800/20">
          <div className="max-w-7xl mx-auto px-3 sm:px-4 py-2 flex items-center justify-center gap-2 flex-wrap">
            <Globe className="h-3.5 w-3.5 text-blue-400" />
            <span className="text-zinc-400 text-xs">
              {t.exchangeNote}: <strong className="text-blue-400">1 {intlConfig.base_currency} = {exchange.getRate(currency)?.toFixed(4) || '—'} {currency}</strong>
              {(Number(intlConfig.margin_percent) || 0) > 0 && (
                <> · <strong className="text-emerald-400">+{intlConfig.margin_percent}%</strong></>
              )}
            </span>
          </div>
        </div>
      )}

      {/* Floating tip */}
      {modelosSelecionados.size === 0 && (
        <div className="w-full bg-gradient-to-r from-green-950/60 via-zinc-900/80 to-green-950/60 backdrop-blur-sm border-b border-green-800/30">
          <div className="max-w-7xl mx-auto px-3 sm:px-4 py-2.5 flex items-center justify-center gap-2.5 text-xs sm:text-sm">
            <span className="flex items-center gap-1.5 text-green-400 shrink-0">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500"></span>
              </span>
              <MessageCircle className="h-3.5 w-3.5" />
            </span>
            <span className="text-zinc-300">{t.selectAndQuote} <strong className="text-green-400">{t.quoteAction}</strong></span>
          </div>
        </div>
      )}

      <div className="w-full max-w-7xl mx-auto px-2 sm:px-4 py-3 md:py-6">
        <div className="flex flex-col lg:flex-row gap-2 md:gap-6 min-w-0">
          {/* Sidebar */}
          <aside className="lg:w-64 shrink-0">
            <Collapsible open={secaoAberta === 'categorias'} onOpenChange={(open) => setSecaoAberta(open ? 'categorias' : null)} className="bg-zinc-800 border border-zinc-700 rounded-lg sticky top-24 shadow-sm">
              <CollapsibleTrigger className="w-full p-3 md:p-4 flex items-center justify-between text-white hover:bg-zinc-700/50 rounded-lg transition-colors">
                <div className="flex items-center gap-2">
                  <span className="font-semibold text-base md:text-lg">{t.categories}</span>
                  {categoriaAtiva && <Badge className="bg-accent text-white text-xs">{categoriaAtiva}</Badge>}
                  {categoriasMultiplas.length > 0 && <Badge className="bg-accent text-white text-xs">{categoriasMultiplas.length} {t.selected}</Badge>}
                  {filtroProntaEntrega && <Badge className="bg-emerald-600 text-white text-xs">{t.readyDelivery}</Badge>}
                </div>
                <ChevronDown className="h-4 w-4 transition-transform duration-200 [&[data-state=open]]:rotate-180" />
              </CollapsibleTrigger>
              <CollapsibleContent className="px-3 md:px-4 pb-3 md:pb-4">
                <div className="space-y-1.5 md:space-y-2">
                  <Button variant={!categoriaAtiva && categoriasMultiplas.length === 0 && !filtroProntaEntrega ? "default" : "ghost"} size="sm"
                    className={`w-full justify-start text-xs md:text-sm h-8 md:h-10 ${!categoriaAtiva && categoriasMultiplas.length === 0 && !filtroProntaEntrega ? 'bg-accent text-white hover:bg-accent/90' : 'text-zinc-300 hover:bg-zinc-700'}`}
                    onClick={() => { setCategoriaAtiva(null); setCategoriasMultiplas([]); setFiltroProntaEntrega(false); setSearchParams({}); }}>{t.all}</Button>
                  <Button variant={filtroProntaEntrega ? "default" : "ghost"} size="sm"
                    className={`w-full justify-start text-xs md:text-sm h-8 md:h-10 gap-1.5 ${filtroProntaEntrega ? 'bg-emerald-600 text-white hover:bg-emerald-700' : 'text-emerald-400 hover:bg-zinc-700'}`}
                    onClick={() => { setCategoriaAtiva(null); setCategoriasMultiplas([]); setFiltroProntaEntrega(true); }}>
                    <Zap className="h-3.5 w-3.5" />{t.readyDelivery}
                  </Button>
                  <div className="border-t border-zinc-700 pt-2 mt-2">
                    <p className="text-[10px] text-zinc-500 uppercase tracking-wider mb-1.5 px-2">{t.selectCategories}</p>
                  </div>
                  {categorias.map((cat) => {
                    const isActive = categoriaAtiva === cat.categoria || categoriasMultiplas.includes(cat.categoria);
                    return (
                      <button key={cat.categoria}
                        className={`w-full flex items-center gap-2 text-xs md:text-sm h-8 md:h-10 px-3 rounded-md transition-colors ${isActive ? 'bg-accent/20 text-accent' : 'text-zinc-300 hover:bg-zinc-700'}`}
                        onClick={() => toggleCategoriaFiltro(cat.categoria)}>
                        <div className={`w-4 h-4 rounded border flex items-center justify-center shrink-0 transition-colors ${isActive ? 'bg-accent border-accent' : 'border-zinc-500'}`}>
                          {isActive && <Check className="h-3 w-3 text-white" />}
                        </div>
                        {cat.categoria}
                      </button>);
                  })}
                </div>
                {categoriasMultiplas.length > 0 &&
                  <div className="flex flex-wrap gap-1.5 mt-3 pt-3 border-t border-zinc-700">
                    {categoriasMultiplas.map((cat) =>
                      <Badge key={cat} className="bg-accent/20 text-accent border-accent/30 text-[10px] cursor-pointer hover:bg-accent/30 gap-1" onClick={() => toggleCategoriaFiltro(cat)}>
                        {cat}<X className="h-2.5 w-2.5" />
                      </Badge>)}
                    <button className="text-[10px] text-zinc-500 hover:text-zinc-300 underline" onClick={() => { setCategoriasMultiplas([]); setSearchParams({}); }}>{t.clear}</button>
                  </div>}
              </CollapsibleContent>
            </Collapsible>

            {exibirPrecos && filtroPrecoAtivo &&
              <Collapsible open={secaoAberta === 'preco'} onOpenChange={(open) => setSecaoAberta(open ? 'preco' : null)} className="bg-zinc-800 border border-zinc-700 rounded-lg sticky top-44 shadow-sm mt-3">
                <CollapsibleTrigger className="w-full p-3 md:p-4 flex items-center justify-between text-white hover:bg-zinc-700/50 rounded-lg transition-colors">
                  <div className="flex items-center gap-2">
                    <SlidersHorizontal className="h-4 w-4 text-accent" />
                    <span className="font-semibold text-base md:text-lg">{t.priceRange}</span>
                  </div>
                  <ChevronDown className="h-4 w-4 transition-transform duration-200 [&[data-state=open]]:rotate-180" />
                </CollapsibleTrigger>
                <CollapsibleContent className="px-3 md:px-4 pb-4">
                  <div className="space-y-4 pt-3">
                    <Slider min={0} max={precoMaxGlobal} step={50} minStepsBetweenThumbs={1}
                      value={[faixaPrecoVisual[0], faixaPrecoVisual[1]]}
                      onValueChange={(v) => handleFaixaPrecoChange([v[0], v[1]])}
                      className="w-full [&_[role=slider]]:h-5 [&_[role=slider]]:w-5 [&_[role=slider]]:border-2 [&_[role=slider]]:border-accent [&_[role=slider]]:bg-zinc-950" />
                    <div className="flex items-center gap-3">
                      <div className="flex-1 space-y-1">
                        <label className="text-[11px] text-zinc-500">{t.min}</label>
                        <Input type="number" value={faixaPrecoVisual[0] === 0 ? '' : faixaPrecoVisual[0]} placeholder="0"
                          onChange={(e) => { const val = Number(e.target.value); if (!isNaN(val) && val >= 0 && val <= faixaPrecoVisual[1]) handleFaixaPrecoChange([val, faixaPrecoVisual[1]]); }}
                          className="h-9 text-sm bg-zinc-900 border-zinc-700 text-white" />
                      </div>
                      <div className="flex-1 space-y-1">
                        <label className="text-[11px] text-zinc-500">{t.max}</label>
                        <Input type="number" value={faixaPrecoVisual[1] === 0 ? '' : faixaPrecoVisual[1]} placeholder="0"
                          onChange={(e) => { const val = Number(e.target.value); if (!isNaN(val) && val >= faixaPrecoVisual[0] && val <= precoMaxGlobal) handleFaixaPrecoChange([faixaPrecoVisual[0], val]); }}
                          className="h-9 text-sm bg-zinc-900 border-zinc-700 text-white" />
                      </div>
                    </div>
                    <p className="text-center text-xs text-zinc-500">
                      {modelosFiltrados.length} {modelosFiltrados.length === 1 ? t.bladeFound : t.bladesFound}
                    </p>
                    {(faixaPrecoVisual[0] > 0 || faixaPrecoVisual[1] < precoMaxGlobal) &&
                      <Button variant="ghost" size="sm" className="w-full text-xs text-zinc-400 hover:text-white" onClick={() => { setFaixaPreco([0, precoMaxGlobal]); setFaixaPrecoVisual([0, precoMaxGlobal]); }}>{t.clearFilter}</Button>}
                  </div>
                </CollapsibleContent>
              </Collapsible>}

            {filtroTamanhoAtivo && tamanhosDisponiveis.length > 0 &&
              <Collapsible open={secaoAberta === 'tamanho'} onOpenChange={(open) => setSecaoAberta(open ? 'tamanho' : null)} className="bg-zinc-800 border border-zinc-700 rounded-lg shadow-sm mt-3">
                <CollapsibleTrigger className="w-full p-3 flex items-center justify-between text-white hover:bg-zinc-700/50 rounded-lg transition-colors">
                  <div className="flex items-center gap-2">
                    <SlidersHorizontal className="h-3.5 w-3.5 text-accent" />
                    <span className="font-semibold text-sm">{t.totalLength}</span>
                    {tamanhosSelecionados.length > 0 && <Badge className="bg-accent text-white text-[10px] h-4 px-1.5">{tamanhosSelecionados.length}</Badge>}
                  </div>
                  <ChevronDown className="h-3.5 w-3.5 transition-transform duration-200 [&[data-state=open]]:rotate-180" />
                </CollapsibleTrigger>
                <CollapsibleContent className="px-3 pb-3">
                  <p className="text-[10px] text-zinc-500 mb-1.5 pt-1">{t.showUpTo}</p>
                  <div className="flex flex-wrap gap-1.5">
                    {tamanhosDisponiveis.map((tam) => {
                      const isSelected = tamanhosSelecionados.includes(tam);
                      return (
                        <button key={tam} className={`px-2.5 py-1 rounded-full text-[11px] font-medium transition-colors ${isSelected ? 'bg-accent text-white' : 'bg-zinc-700 text-zinc-300 hover:bg-zinc-600'}`} onClick={() => setTamanhosSelecionados(isSelected ? [] : [tam])}>
                          {tam}cm
                        </button>);
                    })}
                  </div>
                  {tamanhosSelecionados.length > 0 &&
                    <button className="text-[10px] text-zinc-500 hover:text-zinc-300 mt-2 underline" onClick={() => setTamanhosSelecionados([])}>{t.clear}</button>}
                </CollapsibleContent>
              </Collapsible>}

            {filtroLaminaAtivo && laminasDisponiveis.length > 0 &&
              <Collapsible open={secaoAberta === 'lamina'} onOpenChange={(open) => setSecaoAberta(open ? 'lamina' : null)} className="bg-zinc-800 border border-zinc-700 rounded-lg shadow-sm mt-3">
                <CollapsibleTrigger className="w-full p-3 flex items-center justify-between text-white hover:bg-zinc-700/50 rounded-lg transition-colors">
                  <div className="flex items-center gap-2">
                    <SlidersHorizontal className="h-3.5 w-3.5 text-accent" />
                    <span className="font-semibold text-sm">{t.cuttingEdge}</span>
                    {laminasSelecionadas.length > 0 && <Badge className="bg-accent text-white text-[10px] h-4 px-1.5">{laminasSelecionadas.length}</Badge>}
                  </div>
                  <ChevronDown className="h-3.5 w-3.5 transition-transform duration-200 [&[data-state=open]]:rotate-180" />
                </CollapsibleTrigger>
                <CollapsibleContent className="px-3 pb-3">
                  <p className="text-[10px] text-zinc-500 mb-1.5 pt-1">{t.showUpTo}</p>
                  <div className="flex flex-wrap gap-1.5">
                    {laminasDisponiveis.map((lam) => {
                      const isSelected = laminasSelecionadas.includes(lam);
                      return (
                        <button key={lam} className={`px-2.5 py-1 rounded-full text-[11px] font-medium transition-colors ${isSelected ? 'bg-accent text-white' : 'bg-zinc-700 text-zinc-300 hover:bg-zinc-600'}`} onClick={() => setLaminasSelecionadas(isSelected ? [] : [lam])}>
                          {lam}cm
                        </button>);
                    })}
                  </div>
                  {laminasSelecionadas.length > 0 &&
                    <button className="text-[10px] text-zinc-500 hover:text-zinc-300 mt-2 underline" onClick={() => setLaminasSelecionadas([])}>{t.clear}</button>}
                </CollapsibleContent>
              </Collapsible>}
          </aside>

          {/* Grid */}
          <main className="flex-1 min-w-0">
            {loading ?
              <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-3 gap-1.5 md:gap-4">
                {[...Array(6)].map((_, i) =>
                  <div key={i} className="bg-zinc-800 border border-zinc-700 rounded-lg p-3 animate-pulse">
                    <div className="aspect-[3/4] bg-zinc-700 rounded-lg mb-2" />
                    <div className="h-3 bg-zinc-700 rounded mb-1.5" />
                    <div className="h-5 bg-zinc-700 rounded w-1/2" />
                  </div>)}
              </div> :
              <>
                <div className="flex items-center justify-between mb-4">
                  <p className="text-sm text-zinc-400">
                    {t.showing} {modelosFiltrados.length} {modelosFiltrados.length === 1 ? t.product : t.products}
                  </p>
                  {modelosSelecionados.size > 0 && (
                    <Badge className="bg-accent text-white">{modelosSelecionados.size} {t.selected}</Badge>
                  )}
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-3 gap-1.5 md:gap-4">
                  {modelosFiltrados.map((modelo) => {
                    const selecionado = modelosSelecionados.has(modelo.id);
                    const nome = getNomeModelo(modelo);
                    return (
                      <div key={modelo.id}
                        className={`group relative overflow-hidden rounded-lg transition-all ${selecionado ? 'ring-2 ring-accent ring-offset-2 ring-offset-zinc-950 shadow-[0_0_0_1px_hsl(var(--accent)/0.55)]' : ''}`}>
                        <div className="absolute top-0 right-0 w-full h-1 bg-gradient-to-r from-transparent via-accent/50 to-accent z-10"></div>
                        <div className="bg-zinc-800 border border-zinc-700 hover:border-accent hover:shadow-lg transition-all rounded-lg overflow-hidden h-full flex flex-col">
                          <div className="relative">
                            <div className="bg-zinc-700 overflow-hidden cursor-pointer aspect-[3/4]"
                              onClick={() => navigate(`/catalogo-internacional/${modelo.id}`)}>
                              {modelo.video_url ?
                                <video src={modelo.video_url} className="w-full h-full object-cover bg-zinc-800" muted loop autoPlay playsInline /> :
                                modelo.imagem_modelo ?
                                  <img src={modelo.imagem_modelo} alt={nome} className="w-full h-full object-cover bg-zinc-800 group-hover:scale-110 transition-transform duration-500" /> :
                                  <div className="w-full h-full flex items-center justify-center text-zinc-500">—</div>}
                            </div>
                            <button onClick={(e) => { e.stopPropagation(); toggleSelecao(modelo.id); }}
                              className={`absolute top-3 right-3 w-7 h-7 rounded-full transition-all z-20 ${selecionado ? 'bg-emerald-500 border-[3px] border-emerald-400 shadow-[0_0_12px_rgba(16,185,129,0.6)]' : 'bg-transparent border-[3px] border-emerald-500/80 hover:border-emerald-400 shadow-[0_0_8px_rgba(16,185,129,0.3)]'}`}>
                              {selecionado && <Check className="h-3.5 w-3.5 text-white mx-auto" />}
                            </button>
                            {modelo.pronta_entrega &&
                              <Badge className="absolute top-3 left-3 bg-emerald-600 text-white border-0 text-[10px] gap-0.5 z-20">
                                <Zap className="h-3 w-3" />{t.readyDelivery}
                              </Badge>}
                            {modelo.categorias && modelo.categorias.length > 0 &&
                              <Badge className="absolute bottom-3 left-3 bg-accent text-white border-0">{modelo.categorias[0]}</Badge>}
                          </div>

                          <div className="p-2 md:p-4 flex flex-col flex-1 gap-1">
                            <h3 className="font-bold line-clamp-1 text-sm md:text-base text-white hover:text-accent transition-colors cursor-pointer"
                              onClick={() => navigate(`/catalogo-internacional/${modelo.id}`)}>
                              {nome}
                            </h3>

                            {exibirPrecos && (
                              <div className="flex-1 space-y-1 mt-1">
                                <div>
                                  <p className="text-[9px] md:text-[10px] text-zinc-500 uppercase tracking-wider">{t.base}</p>
                                  <p className="text-base md:text-xl font-black text-accent truncate">
                                    {formatPrice(modelo.preco_base)}
                                  </p>
                                </div>
                              </div>
                            )}

                            <Button size="sm" className="w-full mt-1.5 bg-accent hover:bg-accent/90 text-white font-semibold text-[10px] md:text-sm h-8 md:h-10 rounded-lg shadow-[0_4px_15px_rgba(251,146,60,0.25)]" onClick={() => navigate(`/catalogo-internacional/${modelo.id}`)}>
                              {t.seeDetails}
                              <ArrowRight className="h-3 w-3 md:h-4 md:w-4 ml-1" />
                            </Button>
                          </div>
                        </div>
                      </div>);
                  })}
                </div>

                {modelosFiltrados.length === 0 &&
                  <div className="text-center py-12">
                    <p className="text-zinc-400">{t.noBlades}</p>
                  </div>}
              </>}
          </main>
        </div>
      </div>

      {/* WhatsApp flutuante */}
      {modelosSelecionados.size > 0 && (
        <div className="fixed bottom-6 right-6 z-50">
          <Button size="lg" onClick={enviarWhatsAppCombo}
            className="rounded-full bg-accent hover:bg-accent/90 text-white font-semibold shadow-[0_0_40px_rgba(251,146,60,0.5)] hover:scale-105 transition-all">
            <MessageCircle className="h-5 w-5 mr-2" />
            {t.requestQuote} ({modelosSelecionados.size})
          </Button>
        </div>
      )}
    </div>);
}
