import { useState, useEffect, useRef, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Search,
  MessageCircle,
  Check,
  ChevronDown,
  Star,
  ArrowRight,
  Zap,
  SlidersHorizontal,
  X,
  Share2,
  Mail,
} from 'lucide-react';
import { Slider } from '@/components/ui/slider';
import { useSearchParams } from 'react-router-dom';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { toast } from 'sonner';
import { getIconComponent } from '@/lib/icon-utils';
import { useExchangeRate, type ExchangeMode } from '@/hooks/useExchangeRate';

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
  descricao_html: string | null;
  descricao_html_en: string | null;
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
  show_prices: boolean;
  base_currency: string;
  default_currency: string;
  margin_percent: number;
  show_currency_selector: boolean;
  available_currencies: string[];
  default_language: string;
  show_language_selector: boolean;
  available_languages: string[];
  exchange_mode: ExchangeMode;
  manual_rates: Record<string, number>;
  manual_rates_updated_at: string | null;
  show_logo: boolean;
  show_banner: boolean;
  banner_content: string | null;
  contact_email: string | null;
  contact_whatsapp: string | null;
  visible_product_ids: string[];
}

const SELECAO_INTL_KEY = 'catalogo_intl_selecionados';

const T = {
  pt: {
    catalog: 'CATÁLOGO',
    catalogBrand: 'INTERNACIONAL',
    tagline: 'Cutelaria Artesanal',
    subtitle: 'Alta performance feita à mão. Escolha sua categoria.',
    warranty: 'Garantia Vitalícia de qualidade e manutenção de afiação em todas as nossas lâminas',
    seeAll: 'Ver todo o catálogo',
    readyDelivery: 'Pronta Entrega',
    readyDeliveryUpper: 'PRONTA ENTREGA',
    needHelp: 'Precisa de ajuda para escolher?',
    contactWa: 'Fale conosco no WhatsApp',
    back: '← Voltar',
    search: 'Buscar lâminas...',
    selectAndAsk: 'Selecione as lâminas e peça seu',
    quote: 'orçamento pelo WhatsApp',
    categories: 'Categorias',
    selected: 'selecionadas',
    all: 'Todas',
    selectCats: 'Selecione categorias',
    clear: 'Limpar',
    priceRange: 'Faixa de Preço',
    min: 'Mínimo',
    max: 'Máximo',
    found1: 'lâmina encontrada',
    foundN: 'lâminas encontradas',
    clearFilter: 'Limpar filtro',
    totalLength: 'Comprimento Total',
    showUpTo: 'Exibir lâminas até:',
    cuttingEdge: 'Fio de Corte',
    showingN: (n: number) => `Mostrando ${n} ${n === 1 ? 'produto' : 'produtos'}`,
    selectedCount: (n: number) => `${n} selecionada(s)`,
    noBlade: 'Nenhuma lâmina encontrada',
    consultWa: (n: number) => `Consultar no WhatsApp (${n})`,
    selectAtLeast: 'Selecione pelo menos uma lâmina',
    helloWa: 'Olá! Gostaria de saber mais sobre as seguintes lâminas:',
    rateAuto: 'Cotação atualizada diariamente · Última atualização',
    rateManual: 'Cotação definida manualmente · Última atualização',
    copyLink: 'Copiar link',
    copied: 'Copiado!',
    missingTrans: 'Tradução pendente',
  },
  en: {
    catalog: 'CATALOG',
    catalogBrand: 'INTERNATIONAL',
    tagline: 'Handcrafted Cutlery',
    subtitle: 'High performance, handmade. Choose your category.',
    warranty: 'Lifetime warranty on quality and sharpening maintenance for all our blades',
    seeAll: 'View full catalog',
    readyDelivery: 'In Stock',
    readyDeliveryUpper: 'IN STOCK',
    needHelp: 'Need help choosing?',
    contactWa: 'Chat with us on WhatsApp',
    back: '← Back',
    search: 'Search blades...',
    selectAndAsk: 'Select blades and request your',
    quote: 'quote on WhatsApp',
    categories: 'Categories',
    selected: 'selected',
    all: 'All',
    selectCats: 'Select categories',
    clear: 'Clear',
    priceRange: 'Price Range',
    min: 'Min',
    max: 'Max',
    found1: 'blade found',
    foundN: 'blades found',
    clearFilter: 'Clear filter',
    totalLength: 'Total Length',
    showUpTo: 'Show blades up to:',
    cuttingEdge: 'Cutting Edge',
    showingN: (n: number) => `Showing ${n} ${n === 1 ? 'product' : 'products'}`,
    selectedCount: (n: number) => `${n} selected`,
    noBlade: 'No blade found',
    consultWa: (n: number) => `Inquire on WhatsApp (${n})`,
    selectAtLeast: 'Select at least one blade',
    helloWa: 'Hello! I would like to know more about the following blades:',
    rateAuto: 'Exchange rate updated daily · Last rate',
    rateManual: 'Exchange rate set manually · Last update',
    copyLink: 'Copy link',
    copied: 'Copied!',
    missingTrans: 'Translation pending',
  },
};

const LANG_FLAGS: Record<string, string> = { pt: '🇧🇷', en: '🇺🇸' };
const CURRENCY_SYMBOLS: Record<string, string> = {
  USD: '$', BRL: 'R$', EUR: '€', AED: 'د.إ', GBP: '£',
};

export default function CatalogoInternacional() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [config, setConfig] = useState<IntlConfig | null>(null);
  const [modelos, setModelos] = useState<Modelo[]>([]);
  const [categoriaAtiva, setCategoriaAtiva] = useState<string | null>(null);
  const [categoriasMultiplas, setCategoriasMultiplas] = useState<string[]>([]);
  const [busca, setBusca] = useState('');
  const [modelosSelecionados, setModelosSelecionados] = useState<Set<string>>(() => {
    if (typeof window === 'undefined') return new Set();
    const saved = sessionStorage.getItem(SELECAO_INTL_KEY);
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
  const [filtroProntaEntrega, setFiltroProntaEntrega] = useState(false);
  const [faixaPreco, setFaixaPreco] = useState<[number, number]>([0, 10000]);
  const [faixaPrecoVisual, setFaixaPrecoVisual] = useState<[number, number]>([0, 10000]);
  const [precoMaxGlobal, setPrecoMaxGlobal] = useState(10000);
  const [tamanhosSelecionados, setTamanhosSelecionados] = useState<number[]>([]);
  const [laminasSelecionadas, setLaminasSelecionadas] = useState<number[]>([]);
  const [tamanhosDisponiveis, setTamanhosDisponiveis] = useState<number[]>([]);
  const [laminasDisponiveis, setLaminasDisponiveis] = useState<number[]>([]);
  const [secaoAberta, setSecaoAberta] = useState<string | null>(null);
  const [ordemCategoria, setOrdemCategoria] = useState<Record<string, number>>({});
  const [language, setLanguage] = useState<string>('en');
  const [currency, setCurrency] = useState<string>('USD');
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const t = T[(language as 'pt' | 'en')] || T.en;

  const exchange = useExchangeRate({
    mode: config?.exchange_mode || 'auto',
    baseCurrency: config?.base_currency || 'BRL',
    manualRates: config?.manual_rates || {},
    manualRatesUpdatedAt: config?.manual_rates_updated_at || null,
  });

  const handleFaixaPrecoChange = useCallback((v: number[]) => {
    setFaixaPrecoVisual(v as [number, number]);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      setFaixaPreco(v as [number, number]);
    }, 200);
  }, []);

  const categorias = categoriasVisiveis.filter((c) => c.visivel);
  const categoriasVenda = categorias.map((cat) => ({
    subtitulo: cat.categoria,
    categoria: cat.categoria,
    icon: getIconComponent(cat.icone),
  }));

  useEffect(() => {
    void carregarTudo();
    const catParam = searchParams.get('categoria');
    const verTudoParam = searchParams.get('ver');
    const prontaParam = searchParams.get('pronta_entrega');
    const catsParam = searchParams.get('categorias');
    if (catsParam) {
      const cats = catsParam.split(',').map((c) => decodeURIComponent(c.trim())).filter(Boolean);
      if (cats.length > 0) {
        setCategoriasMultiplas(cats);
        setMostrarLanding(false);
      }
    } else if (catParam) {
      setCategoriaAtiva(catParam);
      setMostrarLanding(false);
    } else if (verTudoParam === 'tudo') {
      setMostrarLanding(false);
    } else if (prontaParam === 'true') {
      setFiltroProntaEntrega(true);
      setMostrarLanding(false);
    }
  }, []);

  useEffect(() => {
    if (categoriaAtiva && categoriasVisiveis.length > 0) {
      void carregarOrdemCategoria(categoriaAtiva);
    }
  }, [categoriasVisiveis]);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    if (modelosSelecionados.size === 0) {
      sessionStorage.removeItem(SELECAO_INTL_KEY);
      return;
    }
    sessionStorage.setItem(SELECAO_INTL_KEY, JSON.stringify(Array.from(modelosSelecionados)));
  }, [modelosSelecionados]);

  useEffect(() => {
    if (banners.length <= 1) return;
    const interval = setInterval(() => {
      setBannerAtual((prev) => (prev + 1) % banners.length);
    }, 5000);
    return () => clearInterval(interval);
  }, [banners.length]);

  async function carregarTudo() {
    setLoading(true);
    try {
      const [{ data: cfg }, { data: cats }, { data: bnrs }, { data: midiasData }, { data: prods }] =
        await Promise.all([
          supabase
            .from('international_catalog_config')
            .select('*')
            .order('updated_at', { ascending: false })
            .limit(1)
            .maybeSingle(),
          supabase.from('categorias_catalogo_visiveis').select('*').order('ordem'),
          supabase.from('banners_catalogo').select('*').eq('ativo', true).order('ordem'),
          supabase.from('midias_catalogo').select('modelo_id'),
          supabase
            .from('catalogo_modelos')
            .select('*')
            .eq('visivel_catalogo', true)
            .order('nome_modelo'),
        ]);

      const cfgRow = cfg as unknown as IntlConfig | null;
      if (cfgRow) {
        setConfig(cfgRow);
        setLanguage(cfgRow.default_language || 'en');
        setCurrency(cfgRow.default_currency || 'USD');
      }
      if (cats) setCategoriasVisiveis(cats as any);
      if (bnrs) setBanners(bnrs as Banner[]);

      const modelosComMidia = new Set((midiasData || []).map((m: any) => m.modelo_id));
      // Mesma regra do Catálogo Revendedor: visivel_catalogo=true + presença de mídia.
      // A visibilidade por categoria/produto (visivel_todas) é aplicada no filtro abaixo.
      const modelosFiltrados = ((prods as any[]) || []).filter(
        (m) => m.imagem_modelo || m.video_url || modelosComMidia.has(m.id),
      );

      setModelos(modelosFiltrados as Modelo[]);

      if (modelosFiltrados.length > 0) {
        const maxP = Math.ceil(Math.max(...modelosFiltrados.map((m) => m.preco_base)) / 100) * 100;
        setPrecoMaxGlobal(maxP);
        setFaixaPreco([0, maxP]);
        setFaixaPrecoVisual([0, maxP]);

        const tamanhos = modelosFiltrados.filter((m) => m.comprimento_total != null).map((m) => m.comprimento_total as number);
        if (tamanhos.length > 0) {
          const u = [...new Set(tamanhos.map((x) => Math.round(x * 10) / 10))].sort((a, b) => a - b);
          setTamanhosDisponiveis(u);
        }
        const laminas = modelosFiltrados.filter((m) => m.area_util_corte != null).map((m) => m.area_util_corte as number);
        if (laminas.length > 0) {
          const u = [...new Set(laminas.map((x) => Math.round(x * 10) / 10))].sort((a, b) => a - b);
          setLaminasDisponiveis(u);
        }
      }
    } catch (e) {
      console.error(e);
      toast.error('Error loading catalog');
    } finally {
      setLoading(false);
    }
  }

  async function carregarOrdemCategoria(categoria: string) {
    const catObj = categoriasVisiveis.find((c) => c.categoria === categoria);
    if (!catObj) { setOrdemCategoria({}); return; }
    const { data } = await supabase
      .from('ordem_categoria_modelos')
      .select('modelo_id, ordem')
      .eq('categoria_id', catObj.id)
      .order('ordem');
    if (data && data.length > 0) {
      const map: Record<string, number> = {};
      data.forEach((d: any) => { map[d.modelo_id] = d.ordem; });
      setOrdemCategoria(map);
    } else {
      setOrdemCategoria({});
    }
  }

  function selecionarCategoria(categoria: string) {
    setCategoriaAtiva(categoria);
    setCategoriasMultiplas([]);
    setFiltroProntaEntrega(false);
    setMostrarLanding(false);
    setSearchParams({ categoria });
    void carregarOrdemCategoria(categoria);
  }

  function toggleCategoriaFiltro(categoria: string) {
    setCategoriasMultiplas((prev) => {
      const novas = prev.includes(categoria) ? prev.filter((c) => c !== categoria) : [...prev, categoria];
      if (novas.length === 0) {
        setCategoriaAtiva(null);
        setSearchParams({});
      } else {
        setCategoriaAtiva(null);
        setSearchParams({ categorias: novas.join(',') });
      }
      return novas;
    });
    setFiltroProntaEntrega(false);
  }

  function verTudo() {
    setMostrarLanding(false);
    setCategoriaAtiva(null);
    setCategoriasMultiplas([]);
    setFiltroProntaEntrega(false);
    setOrdemCategoria({});
    setSearchParams({});
  }

  function verProntaEntrega() {
    setMostrarLanding(false);
    setCategoriaAtiva(null);
    setFiltroProntaEntrega(true);
    setSearchParams({ pronta_entrega: 'true' });
  }

  function getNome(m: Modelo) {
    if (language === 'en') return m.nome_modelo_en || m.nome_modelo;
    return m.nome_modelo;
  }

  function getPrecoConvertido(precoBase: number) {
    const margin = 1 + (Number(config?.margin_percent) || 0) / 100;
    return exchange.convert(precoBase, currency) * margin;
  }

  function formatPrice(precoBase: number) {
    return exchange.format(getPrecoConvertido(precoBase), currency);
  }

  const categoriasPermitidasTodas = new Set(
    categoriasVisiveis.filter((c) => c.visivel_todas).map((c) => c.categoria),
  );

  const modelosFiltrados = modelos.filter((modelo) => {
    if (modelo.preco_base < faixaPreco[0] || modelo.preco_base > faixaPreco[1]) return false;
    if (tamanhosSelecionados.length > 0) {
      if (modelo.comprimento_total == null) return false;
      const maxSel = Math.max(...tamanhosSelecionados);
      if (Math.round(modelo.comprimento_total * 10) / 10 > maxSel) return false;
    }
    if (laminasSelecionadas.length > 0) {
      if (modelo.area_util_corte == null) return false;
      const maxSel = Math.max(...laminasSelecionadas);
      if (Math.round(modelo.area_util_corte * 10) / 10 > maxSel) return false;
    }
    if (filtroProntaEntrega && !modelo.pronta_entrega) return false;

    const matchBuscaName = !busca || getNome(modelo).toLowerCase().includes(busca.toLowerCase()) || modelo.nome_modelo.toLowerCase().includes(busca.toLowerCase());

    if (categoriasMultiplas.length > 0) {
      const expanded = new Set<string>();
      categoriasMultiplas.forEach((c) => {
        expanded.add(c);
        const obj = categoriasVisiveis.find((cv) => cv.categoria === c);
        if (obj) categoriasVisiveis.filter((cv) => cv.categoria_pai_id === obj.id).forEach((ch) => expanded.add(ch.categoria));
      });
      const matchCat = modelo.categorias && Array.from(expanded).some((c) => modelo.categorias.includes(c));
      return matchCat && matchBuscaName;
    }
    if (categoriaAtiva) {
      const expanded = new Set<string>([categoriaAtiva]);
      const obj = categoriasVisiveis.find((cv) => cv.categoria === categoriaAtiva);
      if (obj) categoriasVisiveis.filter((cv) => cv.categoria_pai_id === obj.id).forEach((ch) => expanded.add(ch.categoria));
      const matchCat = modelo.categorias && Array.from(expanded).some((c) => modelo.categorias.includes(c));
      return matchCat && matchBuscaName;
    }
    if (!filtroProntaEntrega) {
      const catPermitida = categoriasVisiveis.length === 0 ||
        (modelo.categorias && modelo.categorias.some((c) => categoriasPermitidasTodas.has(c)));
      const prodPermitido = modelo.visivel_todas !== false;
      return catPermitida && prodPermitido && matchBuscaName;
    }
    return matchBuscaName;
  }).sort((a, b) => {
    if ((categoriaAtiva || categoriasMultiplas.length === 1) && Object.keys(ordemCategoria).length > 0) {
      return (ordemCategoria[a.id] ?? 999) - (ordemCategoria[b.id] ?? 999);
    }
    return (a.ordem_catalogo || 999) - (b.ordem_catalogo || 999);
  });

  function toggleSelecao(id: string) {
    const nova = new Set(modelosSelecionados);
    if (nova.has(id)) nova.delete(id); else nova.add(id);
    setModelosSelecionados(nova);
  }

  function enviarWhatsApp() {
    if (modelosSelecionados.size === 0) {
      toast.error(t.selectAtLeast);
      return;
    }
    const lines = Array.from(modelosSelecionados).map((id) => {
      const m = modelos.find((x) => x.id === id);
      if (!m) return '';
      return `${getNome(m)} - ${formatPrice(Number(m.preco_base) || 0)}`;
    }).filter(Boolean).join('\n');
    const mensagem = `${t.helloWa}\n\n${lines}`;
    const phone = (config?.contact_whatsapp || '5528999025695').replace(/\D/g, '');
    window.open(`https://wa.me/${phone}?text=${encodeURIComponent(mensagem)}`, '_blank');
  }

  async function handleShare() {
    const url = `${window.location.origin}/catalogo-internacional`;
    try {
      if (navigator.share) {
        try { await navigator.share({ title: 'Kaowz', url }); return; } catch { /* fallback */ }
      }
      await navigator.clipboard.writeText(url);
      toast.success(t.copied, { description: url });
    } catch {
      toast.error('Error');
    }
  }

  const lastUpdatedLabel = exchange.lastUpdatedAt
    ? new Date(exchange.lastUpdatedAt).toLocaleString(language === 'en' ? 'en-US' : 'pt-BR')
    : '—';

  // Seletores reutilizáveis
  const Selectors = (
    <div className="flex items-center gap-2 flex-wrap justify-center">
      <Button
        variant="ghost"
        size="sm"
        onClick={handleShare}
        className="text-white hover:bg-white/10 text-xs h-8 px-2"
        aria-label={t.copyLink}
      >
        <Share2 className="h-3.5 w-3.5 mr-1" />
        <span className="hidden sm:inline">{t.copyLink}</span>
      </Button>
      {config?.show_language_selector && (config?.available_languages?.length || 0) > 0 && (
        <div className="flex items-center gap-1 bg-zinc-900 rounded-md p-0.5">
          {config!.available_languages.map((l) => (
            <button
              key={l}
              onClick={() => setLanguage(l)}
              className={`px-2 py-1 text-xs rounded transition ${
                language === l ? 'bg-zinc-700 text-white' : 'text-zinc-400 hover:text-white'
              }`}
              aria-label={l}
            >
              <span className="mr-1">{LANG_FLAGS[l] || '🌐'}</span>
              {l.toUpperCase()}
            </button>
          ))}
        </div>
      )}
      {config?.show_currency_selector && (config?.available_currencies?.length || 0) > 0 && (
        <div className="flex items-center gap-1 bg-zinc-900 rounded-md p-0.5">
          {config!.available_currencies.map((c) => (
            <button
              key={c}
              onClick={() => setCurrency(c)}
              className={`px-2 py-1 text-xs font-mono rounded transition ${
                currency === c ? 'bg-zinc-700 text-white' : 'text-zinc-400 hover:text-white'
              }`}
            >
              <span className="mr-1">{CURRENCY_SYMBOLS[c] || ''}</span>
              {c}
            </button>
          ))}
        </div>
      )}
    </div>
  );

  // Landing
  if (mostrarLanding) {
    return (
      <div className="min-h-screen bg-zinc-950 overflow-x-hidden max-w-[100vw]">
        <header className="relative py-10 md:py-16 overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-b from-accent/10 via-transparent to-transparent" />
          <div className="w-full max-w-7xl mx-auto px-3 sm:px-4 text-center relative z-10">
            <div className="flex justify-end mb-4">{Selectors}</div>
            <div className="inline-block mb-3">
              <span className="text-accent text-xs md:text-sm font-semibold tracking-[0.3em] uppercase">{t.tagline}</span>
            </div>
            <h1 className="text-3xl md:text-5xl font-black text-white mb-3 tracking-tight leading-tight">
              {t.catalog} <span className="text-accent">{t.catalogBrand}</span>
            </h1>
            <p className="text-zinc-400 text-sm md:text-lg max-w-md mx-auto">{t.subtitle}</p>

            <div className="mt-6 inline-flex items-center gap-2 bg-emerald-500/10 border border-emerald-500/30 rounded-full px-4 py-2">
              <span className="text-emerald-400 text-lg">🛡️</span>
              <span className="text-emerald-400 text-xs md:text-sm font-medium tracking-wide">{t.warranty}</span>
            </div>

            {config?.show_banner && config?.banner_content && (
              <div className="mt-6 max-w-2xl mx-auto">
                <p className="text-zinc-300 text-sm md:text-base whitespace-pre-line">{config.banner_content}</p>
              </div>
            )}
          </div>
        </header>

        <div className="w-full max-w-7xl mx-auto px-3 sm:px-4 pb-16">
          {banners.length > 0 && (
            <div className="relative max-w-5xl mx-auto mb-8 rounded-xl overflow-hidden">
              <div className="relative aspect-[21/9] md:aspect-[3/1]">
                {banners.map((banner, idx) => (
                  <div
                    key={banner.id}
                    className={`absolute inset-0 transition-opacity duration-700 ${idx === bannerAtual ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}
                    onClick={() => banner.link && window.open(banner.link, '_blank')}
                    style={{ cursor: banner.link ? 'pointer' : 'default' }}
                  >
                    <img src={banner.imagem_url} alt={banner.titulo || 'Banner'} className="w-full h-full object-contain" />
                    {(banner.titulo || banner.subtitulo) && (
                      <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-transparent flex items-end p-4 md:p-8">
                        <div>
                          {banner.titulo && <h2 className="text-white text-lg md:text-3xl font-black">{banner.titulo}</h2>}
                          {banner.subtitulo && <p className="text-zinc-300 text-xs md:text-base mt-1">{banner.subtitulo}</p>}
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
              {banners.length > 1 && (
                <div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex gap-1.5 z-10">
                  {banners.map((_, idx) => (
                    <button
                      key={idx}
                      onClick={() => setBannerAtual(idx)}
                      className={`w-2 h-2 rounded-full transition-all ${idx === bannerAtual ? 'bg-accent w-6' : 'bg-white/50 hover:bg-white/80'}`}
                    />
                  ))}
                </div>
              )}
            </div>
          )}

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
                </div>
              );
            })}
          </div>

          <div className="flex flex-col sm:flex-row gap-3 justify-center max-w-lg mx-auto">
            <Button onClick={verTudo} className="flex-1 bg-accent hover:bg-accent/90 text-white font-bold h-12 text-sm md:text-base rounded-xl shadow-[0_0_30px_rgba(251,146,60,0.3)] hover:shadow-[0_0_40px_rgba(251,146,60,0.5)] transition-all">
              <Star className="h-4 w-4 mr-2" />
              {t.seeAll}
            </Button>
            <Button onClick={verProntaEntrega} variant="outline" className="flex-1 border-emerald-600/50 text-emerald-400 hover:bg-emerald-600 hover:text-white hover:border-emerald-600 font-bold h-12 text-sm md:text-base rounded-xl transition-all">
              <Zap className="h-4 w-4 mr-2" />
              {t.readyDelivery}
            </Button>
          </div>

          {(config?.contact_whatsapp || config?.contact_email) && (
            <div className="text-center mt-10 pt-8 border-t border-zinc-800/50 space-y-3">
              <p className="text-zinc-500 text-xs">{t.needHelp}</p>
              <div className="flex items-center justify-center gap-3 flex-wrap">
                {config?.contact_whatsapp && (
                  <Button
                    variant="outline"
                    onClick={() => {
                      const phone = config.contact_whatsapp!.replace(/\D/g, '');
                      window.open(`https://wa.me/${phone}?text=${encodeURIComponent(t.helloWa)}`, '_blank');
                    }}
                    className="border-green-600/50 text-green-400 hover:bg-green-600 hover:text-white hover:border-green-600 transition-all"
                  >
                    <MessageCircle className="h-4 w-4 mr-2" />
                    {t.contactWa}
                  </Button>
                )}
                {config?.contact_email && (
                  <a
                    href={`mailto:${config.contact_email}`}
                    className="inline-flex items-center gap-2 px-3 py-2 rounded-md border border-zinc-700 text-zinc-300 hover:bg-zinc-800 hover:text-white transition text-sm"
                  >
                    <Mail className="h-4 w-4" />
                    {config.contact_email}
                  </a>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    );
  }

  // Catálogo
  return (
    <div className="min-h-screen bg-zinc-950 overflow-x-hidden max-w-[100vw]">
      <header className="bg-black border-b border-white/10 sticky top-0 z-50">
        <div className="w-full max-w-7xl mx-auto px-3 sm:px-4 py-3 md:py-4">
          <div className="flex flex-col md:flex-row items-center justify-between gap-3 md:gap-4">
            <div className="flex items-center gap-2 md:gap-4 w-full md:w-auto">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  setMostrarLanding(true);
                  setCategoriaAtiva(null);
                  setFiltroProntaEntrega(false);
                  setBusca('');
                }}
                className="text-white hover:bg-white/10 text-xs md:text-sm"
              >
                {t.back}
              </Button>
              <h1 className="text-lg md:text-3xl font-bold text-white tracking-tight">
                {filtroProntaEntrega ? t.readyDeliveryUpper : `${t.catalog} ${t.catalogBrand}`}
              </h1>
            </div>
            <div className="flex gap-2 w-full md:w-auto items-center flex-wrap justify-end">
              <div className="relative flex-1 md:w-72">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-3.5 w-3.5 md:h-4 md:w-4 text-white/40" />
                <Input
                  placeholder={t.search}
                  value={busca}
                  onChange={(e) => setBusca(e.target.value)}
                  className="pl-9 md:pl-10 text-sm md:text-base bg-white/5 border-white/20 text-white placeholder:text-white/40 focus:border-accent h-9 md:h-10"
                />
              </div>
              {Selectors}
            </div>
          </div>
        </div>
      </header>

      <div className="w-full bg-gradient-to-r from-emerald-950/30 via-zinc-900/50 to-emerald-950/30 border-b border-emerald-800/20">
        <div className="max-w-7xl mx-auto px-3 sm:px-4 py-2 flex items-center justify-center gap-2">
          <span className="text-emerald-400 text-sm">🛡️</span>
          <span className="text-zinc-400 text-xs text-center">{t.warranty}</span>
        </div>
      </div>

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
            <span className="text-zinc-300">
              {t.selectAndAsk} <strong className="text-green-400">{t.quote}</strong>
            </span>
          </div>
        </div>
      )}

      <div className="w-full max-w-7xl mx-auto px-2 sm:px-4 py-3 md:py-6">
        <div className="flex flex-col lg:flex-row gap-2 md:gap-6 min-w-0">
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
                  <Button
                    variant={!categoriaAtiva && categoriasMultiplas.length === 0 && !filtroProntaEntrega ? 'default' : 'ghost'}
                    size="sm"
                    className={`w-full justify-start text-xs md:text-sm h-8 md:h-10 ${
                      !categoriaAtiva && categoriasMultiplas.length === 0 && !filtroProntaEntrega
                        ? 'bg-accent text-white hover:bg-accent/90'
                        : 'text-zinc-300 hover:bg-zinc-700'
                    }`}
                    onClick={() => { setCategoriaAtiva(null); setCategoriasMultiplas([]); setFiltroProntaEntrega(false); setSearchParams({}); }}
                  >
                    {t.all}
                  </Button>
                  <Button
                    variant={filtroProntaEntrega ? 'default' : 'ghost'}
                    size="sm"
                    className={`w-full justify-start text-xs md:text-sm h-8 md:h-10 gap-1.5 ${
                      filtroProntaEntrega ? 'bg-emerald-600 text-white hover:bg-emerald-700' : 'text-emerald-400 hover:bg-zinc-700'
                    }`}
                    onClick={() => { setCategoriaAtiva(null); setCategoriasMultiplas([]); setFiltroProntaEntrega(true); }}
                  >
                    <Zap className="h-3.5 w-3.5" />
                    {t.readyDelivery}
                  </Button>

                  <div className="border-t border-zinc-700 pt-2 mt-2">
                    <p className="text-[10px] text-zinc-500 uppercase tracking-wider mb-1.5 px-2">{t.selectCats}</p>
                  </div>
                  {categorias.map((cat) => {
                    const isActive = categoriaAtiva === cat.categoria || categoriasMultiplas.includes(cat.categoria);
                    return (
                      <button
                        key={cat.categoria}
                        className={`w-full flex items-center gap-2 text-xs md:text-sm h-8 md:h-10 px-3 rounded-md transition-colors ${
                          isActive ? 'bg-accent/20 text-accent' : 'text-zinc-300 hover:bg-zinc-700'
                        }`}
                        onClick={() => toggleCategoriaFiltro(cat.categoria)}
                      >
                        <div className={`w-4 h-4 rounded border flex items-center justify-center shrink-0 transition-colors ${
                          isActive ? 'bg-accent border-accent' : 'border-zinc-500'
                        }`}>
                          {isActive && <Check className="h-3 w-3 text-white" />}
                        </div>
                        {cat.categoria}
                      </button>
                    );
                  })}
                </div>

                {categoriasMultiplas.length > 0 && (
                  <div className="flex flex-wrap gap-1.5 mt-3 pt-3 border-t border-zinc-700">
                    {categoriasMultiplas.map((cat) => (
                      <Badge
                        key={cat}
                        className="bg-accent/20 text-accent border-accent/30 text-[10px] cursor-pointer hover:bg-accent/30 gap-1"
                        onClick={() => toggleCategoriaFiltro(cat)}
                      >
                        {cat}
                        <X className="h-2.5 w-2.5" />
                      </Badge>
                    ))}
                    <button className="text-[10px] text-zinc-500 hover:text-zinc-300 underline" onClick={() => { setCategoriasMultiplas([]); setSearchParams({}); }}>
                      {t.clear}
                    </button>
                  </div>
                )}
              </CollapsibleContent>
            </Collapsible>

            {config?.show_prices && (
              <Collapsible open={secaoAberta === 'preco'} onOpenChange={(open) => setSecaoAberta(open ? 'preco' : null)} className="bg-zinc-800 border border-zinc-700 rounded-lg shadow-sm mt-3">
                <CollapsibleTrigger className="w-full p-3 md:p-4 flex items-center justify-between text-white hover:bg-zinc-700/50 rounded-lg transition-colors">
                  <div className="flex items-center gap-2">
                    <SlidersHorizontal className="h-4 w-4 text-accent" />
                    <span className="font-semibold text-base md:text-lg">{t.priceRange}</span>
                  </div>
                  <ChevronDown className="h-4 w-4 transition-transform duration-200 [&[data-state=open]]:rotate-180" />
                </CollapsibleTrigger>
                <CollapsibleContent className="px-3 md:px-4 pb-4">
                  <div className="space-y-4 pt-3">
                    <Slider
                      min={0}
                      max={precoMaxGlobal}
                      step={50}
                      minStepsBetweenThumbs={1}
                      value={[faixaPrecoVisual[0], faixaPrecoVisual[1]]}
                      onValueChange={(v) => handleFaixaPrecoChange([v[0], v[1]])}
                      className="w-full [&_[role=slider]]:h-5 [&_[role=slider]]:w-5 [&_[role=slider]]:border-2 [&_[role=slider]]:border-accent [&_[role=slider]]:bg-zinc-950"
                    />
                    <div className="flex items-center gap-3">
                      <div className="flex-1 space-y-1">
                        <label className="text-[11px] text-zinc-500">{t.min} ({CURRENCY_SYMBOLS[currency] || ''})</label>
                        <Input
                          type="number"
                          value={faixaPrecoVisual[0] === 0 ? '' : Math.round(getPrecoConvertido(faixaPrecoVisual[0]))}
                          placeholder="0"
                          readOnly
                          className="h-9 text-sm bg-zinc-900 border-zinc-700 text-white"
                        />
                      </div>
                      <div className="flex-1 space-y-1">
                        <label className="text-[11px] text-zinc-500">{t.max} ({CURRENCY_SYMBOLS[currency] || ''})</label>
                        <Input
                          type="number"
                          value={faixaPrecoVisual[1] === 0 ? '' : Math.round(getPrecoConvertido(faixaPrecoVisual[1]))}
                          placeholder="0"
                          readOnly
                          className="h-9 text-sm bg-zinc-900 border-zinc-700 text-white"
                        />
                      </div>
                    </div>
                    <p className="text-center text-xs text-zinc-500">
                      {modelosFiltrados.length} {modelosFiltrados.length === 1 ? t.found1 : t.foundN}
                    </p>
                    {(faixaPrecoVisual[0] > 0 || faixaPrecoVisual[1] < precoMaxGlobal) && (
                      <Button
                        variant="ghost"
                        size="sm"
                        className="w-full text-xs text-zinc-400 hover:text-white"
                        onClick={() => { setFaixaPreco([0, precoMaxGlobal]); setFaixaPrecoVisual([0, precoMaxGlobal]); }}
                      >
                        {t.clearFilter}
                      </Button>
                    )}
                  </div>
                </CollapsibleContent>
              </Collapsible>
            )}

            {tamanhosDisponiveis.length > 0 && (
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
                      const isSel = tamanhosSelecionados.includes(tam);
                      return (
                        <button
                          key={tam}
                          className={`px-2.5 py-1 rounded-full text-[11px] font-medium transition-colors ${
                            isSel ? 'bg-accent text-white' : 'bg-zinc-700 text-zinc-300 hover:bg-zinc-600'
                          }`}
                          onClick={() => setTamanhosSelecionados(isSel ? [] : [tam])}
                        >
                          {tam}cm
                        </button>
                      );
                    })}
                  </div>
                  {tamanhosSelecionados.length > 0 && (
                    <button className="text-[10px] text-zinc-500 hover:text-zinc-300 mt-2 underline" onClick={() => setTamanhosSelecionados([])}>
                      {t.clear}
                    </button>
                  )}
                </CollapsibleContent>
              </Collapsible>
            )}

            {laminasDisponiveis.length > 0 && (
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
                      const isSel = laminasSelecionadas.includes(lam);
                      return (
                        <button
                          key={lam}
                          className={`px-2.5 py-1 rounded-full text-[11px] font-medium transition-colors ${
                            isSel ? 'bg-accent text-white' : 'bg-zinc-700 text-zinc-300 hover:bg-zinc-600'
                          }`}
                          onClick={() => setLaminasSelecionadas(isSel ? [] : [lam])}
                        >
                          {lam}cm
                        </button>
                      );
                    })}
                  </div>
                  {laminasSelecionadas.length > 0 && (
                    <button className="text-[10px] text-zinc-500 hover:text-zinc-300 mt-2 underline" onClick={() => setLaminasSelecionadas([])}>
                      {t.clear}
                    </button>
                  )}
                </CollapsibleContent>
              </Collapsible>
            )}
          </aside>

          <main className="flex-1 min-w-0">
            {loading ? (
              <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-3 gap-1.5 md:gap-4">
                {[...Array(6)].map((_, i) => (
                  <div key={i} className="bg-zinc-800 border border-zinc-700 rounded-lg p-3 animate-pulse">
                    <div className="aspect-[3/4] bg-zinc-700 rounded-lg mb-2" />
                    <div className="h-3 bg-zinc-700 rounded mb-1.5" />
                    <div className="h-5 bg-zinc-700 rounded w-1/2" />
                  </div>
                ))}
              </div>
            ) : (
              <>
                <div className="flex items-center justify-between mb-4">
                  <p className="text-sm text-zinc-400">{t.showingN(modelosFiltrados.length)}</p>
                  {modelosSelecionados.size > 0 && (
                    <Badge className="bg-accent text-white">{t.selectedCount(modelosSelecionados.size)}</Badge>
                  )}
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-3 gap-1.5 md:gap-4">
                  {modelosFiltrados.map((modelo) => {
                    const selecionado = modelosSelecionados.has(modelo.id);
                    const nome = getNome(modelo);
                    const missingTrans = language === 'en' && !modelo.nome_modelo_en;
                    return (
                      <div
                        key={modelo.id}
                        className={`group relative overflow-hidden rounded-lg transition-all ${
                          selecionado
                            ? 'ring-2 ring-accent ring-offset-2 ring-offset-zinc-950 shadow-[0_0_0_1px_hsl(var(--accent)/0.55)]'
                            : ''
                        }`}
                      >
                        <div className="absolute top-0 right-0 w-full h-1 bg-gradient-to-r from-transparent via-accent/50 to-accent z-10"></div>

                        <div className="bg-zinc-800 border border-zinc-700 hover:border-accent hover:shadow-lg transition-all rounded-lg overflow-hidden h-full flex flex-col">
                          <div className="relative">
                            <div className="bg-zinc-700 overflow-hidden aspect-[3/4]">
                              {modelo.video_url ? (
                                <video src={modelo.video_url} className="w-full h-full object-cover bg-zinc-800" muted loop autoPlay playsInline />
                              ) : modelo.imagem_modelo ? (
                                <img src={modelo.imagem_modelo} alt={nome} className="w-full h-full object-cover bg-zinc-800 group-hover:scale-110 transition-transform duration-500" />
                              ) : (
                                <div className="w-full h-full flex items-center justify-center text-zinc-500">No image</div>
                              )}
                            </div>

                            <button
                              onClick={(e) => { e.stopPropagation(); toggleSelecao(modelo.id); }}
                              className={`absolute top-3 right-3 w-7 h-7 rounded-full transition-all z-20 ${
                                selecionado
                                  ? 'bg-emerald-500 border-[3px] border-emerald-400 shadow-[0_0_12px_rgba(16,185,129,0.6)]'
                                  : 'bg-transparent border-[3px] border-emerald-500/80 hover:border-emerald-400 shadow-[0_0_8px_rgba(16,185,129,0.3)]'
                              }`}
                            >
                              {selecionado && <Check className="h-3.5 w-3.5 text-white mx-auto" />}
                            </button>

                            {modelo.pronta_entrega && (
                              <Badge className="absolute top-3 left-3 bg-emerald-600 text-white border-0 text-[10px] gap-0.5 z-20">
                                <Zap className="h-3 w-3" />
                                {t.readyDelivery}
                              </Badge>
                            )}

                            {modelo.categorias && modelo.categorias.length > 0 && (
                              <Badge className="absolute bottom-3 left-3 bg-accent text-white border-0">{modelo.categorias[0]}</Badge>
                            )}
                          </div>

                          <div className="p-2 md:p-4 flex flex-col flex-1 gap-0.5">
                            <h3 className="font-bold line-clamp-1 text-sm md:text-base text-white flex items-center gap-1">
                              <span className="truncate">{nome}</span>
                              {missingTrans && (
                                <span title={t.missingTrans} className="text-[10px] text-yellow-500 flex-shrink-0">⚠</span>
                              )}
                            </h3>
                            <div className="flex-1">
                              {config?.show_prices && (
                                <div className="mt-1">
                                  <p className="text-base md:text-2xl font-black text-accent drop-shadow-[0_2px_10px_rgba(251,146,60,0.3)] truncate">
                                    {formatPrice(Number(modelo.preco_base) || 0)}
                                  </p>
                                </div>
                              )}
                              {!config?.show_prices && modelo.apresentacao_venda ? (
                                <p className="text-[10px] md:text-xs text-zinc-400 line-clamp-3 mt-1">{modelo.apresentacao_venda}</p>
                              ) : null}
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>

                {modelosFiltrados.length === 0 && (
                  <div className="text-center py-12">
                    <p className="text-zinc-400">{t.noBlade}</p>
                  </div>
                )}
              </>
            )}
          </main>
        </div>
      </div>

      {/* Footer */}
      <footer className="border-t border-zinc-800 bg-zinc-950 mt-6">
        <div className="max-w-7xl mx-auto px-3 sm:px-4 py-6 space-y-3 text-xs text-zinc-500">
          <div className="text-center">
            {(config?.exchange_mode === 'auto' ? t.rateAuto : t.rateManual)}: {lastUpdatedLabel}
          </div>
          {(config?.contact_email || config?.contact_whatsapp) && (
            <div className="flex items-center justify-center gap-4 flex-wrap">
              {config?.contact_email && (
                <a href={`mailto:${config.contact_email}`} className="flex items-center gap-1.5 hover:text-zinc-200 transition">
                  <Mail className="h-3.5 w-3.5" />
                  {config.contact_email}
                </a>
              )}
              {config?.contact_whatsapp && (
                <a
                  href={`https://wa.me/${config.contact_whatsapp.replace(/\D/g, '')}`}
                  target="_blank"
                  rel="noreferrer"
                  className="flex items-center gap-1.5 hover:text-zinc-200 transition"
                >
                  <MessageCircle className="h-3.5 w-3.5" />
                  {config.contact_whatsapp}
                </a>
              )}
            </div>
          )}
        </div>
      </footer>

      {modelosSelecionados.size > 0 && (
        <div className="fixed bottom-6 right-6 z-50">
          <Button
            size="lg"
            onClick={enviarWhatsApp}
            className="rounded-full bg-accent hover:bg-accent/90 text-white font-semibold shadow-[0_0_40px_rgba(251,146,60,0.5)] hover:scale-105 transition-all"
          >
            <MessageCircle className="h-5 w-5 mr-2" />
            {t.consultWa(modelosSelecionados.size)}
          </Button>
        </div>
      )}
    </div>
  );
}
