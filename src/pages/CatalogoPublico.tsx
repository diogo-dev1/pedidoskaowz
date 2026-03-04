import { useState, useEffect, useRef, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Search, MessageCircle, Check, ChevronDown, Star, ArrowRight, ChevronLeft, ChevronRight, Zap, Package, SlidersHorizontal, X } from 'lucide-react';
import { Slider } from '@/components/ui/slider';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { toast } from 'sonner';
import { getIconComponent } from '@/lib/icon-utils';

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
}

interface CategoriaVisivel {
  categoria: string;
  visivel: boolean;
  visivel_todas: boolean;
  ordem: number;
  icone: string;
}

export default function CatalogoPublico() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const [modelos, setModelos] = useState<Modelo[]>([]);
  const [categoriaAtiva, setCategoriaAtiva] = useState<string | null>(null);
  const [categoriasMultiplas, setCategoriasMultiplas] = useState<string[]>([]);
  const [busca, setBusca] = useState('');
  const [modelosSelecionados, setModelosSelecionados] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [mostrarLanding, setMostrarLanding] = useState(true);
  const [categoriasVisiveis, setCategoriasVisiveis] = useState<CategoriaVisivel[]>([]);
  const [banners, setBanners] = useState<Banner[]>([]);
  const [bannerAtual, setBannerAtual] = useState(0);
  const [exibirPrecos, setExibirPrecos] = useState(true);
  const [exibirFormasPagamento, setExibirFormasPagamento] = useState(true);
  const [descontoPix, setDescontoPix] = useState(5);
  const [textoPix, setTextoPix] = useState('no PIX');
  const [textoParcelamento, setTextoParcelamento] = useState('3x sem juros ou até 12x no cartão');
  const [filtroProntaEntrega, setFiltroProntaEntrega] = useState(false);
  const [faixaPreco, setFaixaPreco] = useState<[number, number]>([0, 10000]);
  const [faixaPrecoVisual, setFaixaPrecoVisual] = useState<[number, number]>([0, 10000]);
  const [precoMaxGlobal, setPrecoMaxGlobal] = useState(10000);
  const [secaoAberta, setSecaoAberta] = useState<string | null>(null);
  const debounceRef = useRef<NodeJS.Timeout | null>(null);
  const categorias = categoriasVisiveis.filter(c => c.visivel);

  const handleFaixaPrecoChange = useCallback((v: number[]) => {
    setFaixaPrecoVisual(v as [number, number]);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      setFaixaPreco(v as [number, number]);
    }, 200);
  }, []);

  const categoriasVenda = categorias.map(cat => ({
    subtitulo: cat.categoria,
    categoria: cat.categoria,
    icon: getIconComponent(cat.icone),
  }));

  useEffect(() => {
    carregarModelos();
    carregarCategoriasVisiveis();
    carregarBanners();
    carregarConfigPrecos();
    const catParam = searchParams.get('categoria');
    const verTudoParam = searchParams.get('ver');
    const prontaParam = searchParams.get('pronta_entrega');
    
    const catsParam = searchParams.get('categorias');
    if (catsParam) {
      const cats = catsParam.split(',').map(c => decodeURIComponent(c.trim())).filter(Boolean);
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

  // Auto-rotate banners
  useEffect(() => {
    if (banners.length <= 1) return;
    const interval = setInterval(() => {
      setBannerAtual(prev => (prev + 1) % banners.length);
    }, 5000);
    return () => clearInterval(interval);
  }, [banners.length]);

  const carregarBanners = async () => {
    const { data } = await supabase
      .from('banners_catalogo')
      .select('*')
      .eq('ativo', true)
      .order('ordem');
    if (data) setBanners(data as Banner[]);
  };

  const carregarConfigPrecos = async () => {
    const { data } = await supabase
      .from('configuracoes_catalogo')
      .select('*')
      .in('chave', ['exibir_precos', 'exibir_formas_pagamento', 'desconto_pix', 'texto_pix', 'texto_parcelamento']);
    if (data) {
      data.forEach(d => {
        if (d.chave === 'exibir_precos') setExibirPrecos(d.valor === 'true');
        if (d.chave === 'exibir_formas_pagamento') setExibirFormasPagamento(d.valor === 'true');
        if (d.chave === 'desconto_pix') setDescontoPix(parseFloat(d.valor) || 5);
        if (d.chave === 'texto_pix') setTextoPix(d.valor);
        if (d.chave === 'texto_parcelamento') setTextoParcelamento(d.valor);
      });
    }
  };

  const selecionarCategoria = (categoria: string) => {
    setCategoriaAtiva(categoria);
    setCategoriasMultiplas([]);
    setFiltroProntaEntrega(false);
    setMostrarLanding(false);
    setSearchParams({ categoria });
  };

  const toggleCategoriaFiltro = (categoria: string) => {
    setCategoriasMultiplas(prev => {
      const novas = prev.includes(categoria) 
        ? prev.filter(c => c !== categoria) 
        : [...prev, categoria];
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
  };

  const verTudo = () => {
    setMostrarLanding(false);
    setCategoriaAtiva(null);
    setCategoriasMultiplas([]);
    setFiltroProntaEntrega(false);
    setSearchParams({});
  };

  const verProntaEntrega = () => {
    setMostrarLanding(false);
    setCategoriaAtiva(null);
    setFiltroProntaEntrega(true);
    setSearchParams({ pronta_entrega: 'true' });
  };

  const carregarCategoriasVisiveis = async () => {
    const { data } = await supabase
      .from('categorias_catalogo_visiveis')
      .select('*')
      .order('ordem');
    if (data) setCategoriasVisiveis(data);
  };

  const carregarModelos = async () => {
    try {
      const { data: midiasData, error: midiasError } = await supabase
        .from('midias_catalogo')
        .select('modelo_id');

      if (midiasError) throw midiasError;

      const modelosComMidiaCatalogo = new Set((midiasData || []).map(m => m.modelo_id));

      const { data, error } = await supabase
        .from('catalogo_modelos')
        .select('*')
        .eq('visivel_catalogo', true)
        .order('nome_modelo');

      if (error) throw error;
      
      const modelosFiltrados = (data || []).filter(m => 
        m.imagem_modelo || m.video_url || modelosComMidiaCatalogo.has(m.id)
      );
      setModelos(modelosFiltrados as Modelo[]);
      
      // Calculate max price for filter
      if (modelosFiltrados.length > 0) {
        const maxP = Math.ceil(Math.max(...modelosFiltrados.map(m => m.preco_base)) / 100) * 100;
        setPrecoMaxGlobal(maxP);
        setFaixaPreco([0, maxP]);
        setFaixaPrecoVisual([0, maxP]);
      }
    } catch (error) {
      console.error('Erro ao carregar modelos:', error);
      toast.error('Erro ao carregar catálogo');
    } finally {
      setLoading(false);
    }
  };

  // Categorias permitidas na visão "Todas"
  const categoriasPermitidasTodas = new Set(
    categoriasVisiveis.filter(c => c.visivel_todas).map(c => c.categoria)
  );

  const modelosFiltrados = modelos.filter((modelo) => {
    // Filtro por faixa de preço
    if (modelo.preco_base < faixaPreco[0] || modelo.preco_base > faixaPreco[1]) return false;
    
    // Filtro pronta entrega
    if (filtroProntaEntrega && !modelo.pronta_entrega) return false;

    if (categoriasMultiplas.length > 0) {
      const matchCategoria = modelo.categorias && categoriasMultiplas.some(c => modelo.categorias.includes(c));
      const matchBusca = !busca || modelo.nome_modelo.toLowerCase().includes(busca.toLowerCase());
      return matchCategoria && matchBusca;
    }

    if (categoriaAtiva) {
      const matchCategoria = modelo.categorias && modelo.categorias.includes(categoriaAtiva);
      const matchBusca = !busca || modelo.nome_modelo.toLowerCase().includes(busca.toLowerCase());
      return matchCategoria && matchBusca;
    }
    if (!filtroProntaEntrega) {
      // "Todas" - respects both category-level and product-level visivel_todas
      const categoriaPermitida = categoriasVisiveis.length === 0 || 
        (modelo.categorias && modelo.categorias.some(c => categoriasPermitidasTodas.has(c)));
      const produtoPermitido = modelo.visivel_todas !== false;
      const matchBusca = !busca || modelo.nome_modelo.toLowerCase().includes(busca.toLowerCase());
      return categoriaPermitida && produtoPermitido && matchBusca;
    }
    const matchBusca = !busca || modelo.nome_modelo.toLowerCase().includes(busca.toLowerCase());
    return matchBusca;
  }).sort((a, b) => (a.ordem_catalogo || 999) - (b.ordem_catalogo || 999));

  const toggleSelecao = (id: string) => {
    const novaSelecao = new Set(modelosSelecionados);
    if (novaSelecao.has(id)) {
      novaSelecao.delete(id);
    } else {
      novaSelecao.add(id);
    }
    setModelosSelecionados(novaSelecao);
  };

  const enviarWhatsApp = () => {
    if (modelosSelecionados.size === 0) {
      toast.error('Selecione pelo menos uma lâmina');
      return;
    }

    const modelosTexto = Array.from(modelosSelecionados)
      .map(id => {
        const modelo = modelos.find(m => m.id === id);
        return modelo ? `${modelo.nome_modelo} - R$ ${modelo.preco_base.toFixed(2)}` : '';
      })
      .filter(Boolean)
      .join('\n');

    const mensagem = `Olá! Gostaria de saber mais sobre as seguintes lâminas:\n\n${modelosTexto}`;
    const url = `https://wa.me/5528999025695?text=${encodeURIComponent(mensagem)}`;
    window.open(url, '_blank');
  };

  // Landing Page
  if (mostrarLanding) {
    return (
      <div className="min-h-screen bg-zinc-950 overflow-x-hidden max-w-[100vw]">
        {/* Hero Header */}
        <header className="relative py-10 md:py-16 overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-b from-accent/10 via-transparent to-transparent" />
          <div className="w-full max-w-7xl mx-auto px-3 sm:px-4 text-center relative z-10">
            <div className="inline-block mb-3">
              <span className="text-accent text-xs md:text-sm font-semibold tracking-[0.3em] uppercase">Cutelaria Artesanal</span>
            </div>
            <h1 className="text-3xl md:text-5xl font-black text-white mb-3 tracking-tight leading-tight">
              CATÁLOGO <span className="text-accent">KAOWZ</span>
            </h1>
            <p className="text-zinc-400 text-sm md:text-lg max-w-md mx-auto">
              Alta performance feita à mão. Escolha sua categoria.
            </p>
          </div>
        </header>

        <div className="w-full max-w-7xl mx-auto px-3 sm:px-4 pb-16">
          {/* Banner Carousel */}
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
                    <img
                      src={banner.imagem_url}
                      alt={banner.titulo || 'Banner'}
                      className="w-full h-full object-cover"
                    />
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
                <>
                  <button
                    onClick={() => setBannerAtual(prev => (prev - 1 + banners.length) % banners.length)}
                    className="absolute left-2 top-1/2 -translate-y-1/2 bg-black/50 hover:bg-black/80 text-white rounded-full p-1.5 transition-colors z-10"
                  >
                    <ChevronLeft className="h-5 w-5" />
                  </button>
                  <button
                    onClick={() => setBannerAtual(prev => (prev + 1) % banners.length)}
                    className="absolute right-2 top-1/2 -translate-y-1/2 bg-black/50 hover:bg-black/80 text-white rounded-full p-1.5 transition-colors z-10"
                  >
                    <ChevronRight className="h-5 w-5" />
                  </button>
                  <div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex gap-1.5 z-10">
                    {banners.map((_, idx) => (
                      <button
                        key={idx}
                        onClick={() => setBannerAtual(idx)}
                        className={`w-2 h-2 rounded-full transition-all ${idx === bannerAtual ? 'bg-accent w-6' : 'bg-white/50 hover:bg-white/80'}`}
                      />
                    ))}
                  </div>
                </>
              )}
            </div>
          )}

          {/* Grid de Categorias */}
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 md:gap-4 max-w-5xl mx-auto mb-10">
            {categoriasVenda.map((cat, idx) => {
              const Icon = cat.icon;
              return (
                <div
                  key={idx}
                  className="group cursor-pointer"
                  onClick={() => selecionarCategoria(cat.categoria)}
                >
                  <div className="relative bg-zinc-900 border border-zinc-800 hover:border-accent rounded-xl p-5 md:p-6 transition-all duration-300 text-center group-hover:bg-zinc-800 group-hover:shadow-[0_0_30px_rgba(251,146,60,0.15)] group-hover:-translate-y-1">
                    <div className="w-12 h-12 md:w-14 md:h-14 mx-auto mb-3 rounded-full bg-accent/10 flex items-center justify-center group-hover:bg-accent/20 transition-colors">
                      <Icon className="h-6 w-6 md:h-7 md:w-7 text-accent" />
                    </div>
                    <h3 className="text-white font-bold text-xs md:text-sm tracking-wide">
                      {cat.subtitulo}
                    </h3>
                    <div className="mt-2 opacity-0 group-hover:opacity-100 transition-opacity">
                      <ArrowRight className="h-4 w-4 text-accent mx-auto" />
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* CTAs */}
          <div className="flex flex-col sm:flex-row gap-3 justify-center max-w-lg mx-auto">
            <Button
              onClick={verTudo}
              className="flex-1 bg-accent hover:bg-accent/90 text-white font-bold h-12 text-sm md:text-base rounded-xl shadow-[0_0_30px_rgba(251,146,60,0.3)] hover:shadow-[0_0_40px_rgba(251,146,60,0.5)] transition-all"
            >
              <Star className="h-4 w-4 mr-2" />
              Ver todo o catálogo
            </Button>
            <Button
              onClick={verProntaEntrega}
              variant="outline"
              className="flex-1 border-emerald-600/50 text-emerald-400 hover:bg-emerald-600 hover:text-white hover:border-emerald-600 font-bold h-12 text-sm md:text-base rounded-xl transition-all"
            >
              <Zap className="h-4 w-4 mr-2" />
              Pronta Entrega
            </Button>
          </div>

          {/* Monte seu Kit */}
          <div className="flex justify-center max-w-lg mx-auto mt-3">
            <Button
              onClick={() => navigate('/catalogo/montar-kit')}
              variant="outline"
              className="w-full border-accent/50 text-accent hover:bg-accent hover:text-white hover:border-accent font-bold h-12 text-sm md:text-base rounded-xl transition-all"
            >
              <Package className="h-4 w-4 mr-2" />
              Monte seu Kit
            </Button>
          </div>

          {/* WhatsApp CTA */}
          <div className="text-center mt-10 pt-8 border-t border-zinc-800/50">
            <p className="text-zinc-500 text-xs mb-3">Precisa de ajuda para escolher?</p>
            <Button
              variant="outline"
              onClick={() => {
                const url = `https://wa.me/5528999025695?text=${encodeURIComponent('Olá! Gostaria de saber mais sobre as lâminas.')}`;
                window.open(url, '_blank');
              }}
              className="border-green-600/50 text-green-400 hover:bg-green-600 hover:text-white hover:border-green-600 transition-all"
            >
              <MessageCircle className="h-4 w-4 mr-2" />
              Fale conosco no WhatsApp
            </Button>
          </div>
        </div>
      </div>
    );
  }

  // Catálogo de Produtos
  return (
    <div className="min-h-screen bg-zinc-950 overflow-x-hidden max-w-[100vw]">
      {/* Header */}
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
                  setModelosSelecionados(new Set());
                }}
                className="text-white hover:bg-white/10 text-xs md:text-sm"
              >
                ← Voltar
              </Button>
              <h1 className="text-lg md:text-3xl font-bold text-white tracking-tight">
                {filtroProntaEntrega ? 'PRONTA ENTREGA' : 'CATÁLOGO KAOWZ'}
              </h1>
            </div>
            <div className="flex gap-2 w-full md:w-auto">
              <div className="relative flex-1 md:w-80">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-3.5 w-3.5 md:h-4 md:w-4 text-white/40" />
                <Input
                  placeholder="Buscar lâminas..."
                  value={busca}
                  onChange={(e) => setBusca(e.target.value)}
                  className="pl-9 md:pl-10 text-sm md:text-base bg-white/5 border-white/20 text-white placeholder:text-white/40 focus:border-accent h-9 md:h-10"
                />
              </div>
            </div>
          </div>
        </div>
      </header>

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
            <span className="text-zinc-300">
              Selecione as lâminas e peça seu <strong className="text-green-400">orçamento pelo WhatsApp</strong>
            </span>
          </div>
        </div>
      )}

      <div className="w-full max-w-7xl mx-auto px-3 sm:px-4 py-4 md:py-6">
        <div className="flex flex-col lg:flex-row gap-4 md:gap-6 min-w-0">
          {/* Sidebar - Categorias */}
          <aside className="lg:w-64 shrink-0">
            <Collapsible open={secaoAberta === 'categorias'} onOpenChange={(open) => setSecaoAberta(open ? 'categorias' : null)} className="bg-zinc-800 border border-zinc-700 rounded-lg sticky top-24 shadow-sm">
              <CollapsibleTrigger className="w-full p-3 md:p-4 flex items-center justify-between text-white hover:bg-zinc-700/50 rounded-lg transition-colors">
                <div className="flex items-center gap-2">
                  <span className="font-semibold text-base md:text-lg">Categorias</span>
                  {categoriaAtiva && (
                    <Badge className="bg-accent text-white text-xs">{categoriaAtiva}</Badge>
                  )}
                  {categoriasMultiplas.length > 0 && (
                    <Badge className="bg-accent text-white text-xs">{categoriasMultiplas.length} selecionadas</Badge>
                  )}
                  {filtroProntaEntrega && (
                    <Badge className="bg-emerald-600 text-white text-xs">Pronta Entrega</Badge>
                  )}
                </div>
                <ChevronDown className="h-4 w-4 transition-transform duration-200 [&[data-state=open]]:rotate-180" />
              </CollapsibleTrigger>
              <CollapsibleContent className="px-3 md:px-4 pb-3 md:pb-4">
                <div className="space-y-1.5 md:space-y-2">
                  <Button
                    variant={!categoriaAtiva && categoriasMultiplas.length === 0 && !filtroProntaEntrega ? "default" : "ghost"}
                    size="sm"
                    className={`w-full justify-start text-xs md:text-sm h-8 md:h-10 ${
                      !categoriaAtiva && categoriasMultiplas.length === 0 && !filtroProntaEntrega
                        ? 'bg-accent text-white hover:bg-accent/90' 
                        : 'text-zinc-300 hover:bg-zinc-700'
                    }`}
                    onClick={() => { setCategoriaAtiva(null); setCategoriasMultiplas([]); setFiltroProntaEntrega(false); setSearchParams({}); }}
                  >
                    Todas
                  </Button>
                  <Button
                    variant={filtroProntaEntrega ? "default" : "ghost"}
                    size="sm"
                    className={`w-full justify-start text-xs md:text-sm h-8 md:h-10 gap-1.5 ${
                      filtroProntaEntrega
                        ? 'bg-emerald-600 text-white hover:bg-emerald-700' 
                        : 'text-emerald-400 hover:bg-zinc-700'
                    }`}
                    onClick={() => { setCategoriaAtiva(null); setCategoriasMultiplas([]); setFiltroProntaEntrega(true); }}
                  >
                    <Zap className="h-3.5 w-3.5" />
                    Pronta Entrega
                  </Button>
                  
                  <div className="border-t border-zinc-700 pt-2 mt-2">
                    <p className="text-[10px] text-zinc-500 uppercase tracking-wider mb-1.5 px-2">Selecione categorias</p>
                  </div>
                  {categorias.map((cat) => {
                    const isActive = categoriaAtiva === cat.categoria || categoriasMultiplas.includes(cat.categoria);
                    return (
                      <button
                        key={cat.categoria}
                        className={`w-full flex items-center gap-2 text-xs md:text-sm h-8 md:h-10 px-3 rounded-md transition-colors ${
                          isActive
                            ? 'bg-accent/20 text-accent' 
                            : 'text-zinc-300 hover:bg-zinc-700'
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

                {/* Tags de categorias selecionadas */}
                {categoriasMultiplas.length > 0 && (
                  <div className="flex flex-wrap gap-1.5 mt-3 pt-3 border-t border-zinc-700">
                    {categoriasMultiplas.map(cat => (
                      <Badge 
                        key={cat} 
                        className="bg-accent/20 text-accent border-accent/30 text-[10px] cursor-pointer hover:bg-accent/30 gap-1"
                        onClick={() => toggleCategoriaFiltro(cat)}
                      >
                        {cat}
                        <X className="h-2.5 w-2.5" />
                      </Badge>
                    ))}
                    <button 
                      className="text-[10px] text-zinc-500 hover:text-zinc-300 underline"
                      onClick={() => { setCategoriasMultiplas([]); setSearchParams({}); }}
                    >
                      Limpar
                    </button>
                  </div>
                )}
              </CollapsibleContent>
            </Collapsible>

            {/* Filtro por Valor */}
            {exibirPrecos && (
              <Collapsible open={secaoAberta === 'preco'} onOpenChange={(open) => setSecaoAberta(open ? 'preco' : null)} className="bg-zinc-800 border border-zinc-700 rounded-lg sticky top-44 shadow-sm mt-3">
                <CollapsibleTrigger className="w-full p-3 md:p-4 flex items-center justify-between text-white hover:bg-zinc-700/50 rounded-lg transition-colors">
                  <div className="flex items-center gap-2">
                    <SlidersHorizontal className="h-4 w-4 text-accent" />
                    <span className="font-semibold text-base md:text-lg">Faixa de Preço</span>
                  </div>
                  <ChevronDown className="h-4 w-4 transition-transform duration-200 [&[data-state=open]]:rotate-180" />
                </CollapsibleTrigger>
                <CollapsibleContent className="px-3 md:px-4 pb-4">
                  <div className="space-y-4 pt-2">
                    {/* Inputs de valor */}
                    <div className="flex items-center gap-2">
                      <div className="flex-1">
                        <label className="text-[10px] text-zinc-500 uppercase tracking-wider mb-1 block">Mínimo</label>
                        <div className="relative">
                          <span className="absolute left-2 top-1/2 -translate-y-1/2 text-zinc-500 text-xs">R$</span>
                          <input
                            type="number"
                            disabled
                            value={0}
                            className="w-full bg-zinc-900 border border-zinc-700 rounded-md pl-8 pr-2 py-1.5 text-sm text-zinc-500 cursor-not-allowed"
                          />
                        </div>
                      </div>
                      <span className="text-zinc-600 mt-5">—</span>
                      <div className="flex-1">
                        <label className="text-[10px] text-zinc-500 uppercase tracking-wider mb-1 block">Máximo</label>
                        <div className="relative">
                          <span className="absolute left-2 top-1/2 -translate-y-1/2 text-zinc-500 text-xs">R$</span>
                          <input
                            type="number"
                            min={0}
                            max={precoMaxGlobal}
                            step={50}
                            value={faixaPrecoVisual[1]}
                            onChange={(e) => {
                              const val = Math.min(precoMaxGlobal, Math.max(0, Number(e.target.value)));
                              handleFaixaPrecoChange([0, val]);
                            }}
                            className="w-full bg-zinc-900 border border-zinc-600 rounded-md pl-8 pr-2 py-1.5 text-sm text-white focus:border-accent focus:outline-none"
                          />
                        </div>
                      </div>
                    </div>

                    <Slider
                      min={0}
                      max={precoMaxGlobal}
                      step={50}
                      value={[faixaPrecoVisual[1]]}
                      onValueChange={(v) => handleFaixaPrecoChange([0, v[0]])}
                      className="w-full [&_[role=slider]]:h-5 [&_[role=slider]]:w-5 [&_[role=slider]]:border-accent [&_[role=slider]]:bg-zinc-900 [&_[role=slider]]:shadow-md"
                    />
                    
                    {/* Contagem de resultados */}
                    <p className="text-center text-xs text-zinc-500">
                      {modelosFiltrados.length} {modelosFiltrados.length === 1 ? 'lâmina encontrada' : 'lâminas encontradas'}
                    </p>

                    {(faixaPrecoVisual[0] > 0 || faixaPrecoVisual[1] < precoMaxGlobal) && (
                      <Button
                        variant="ghost"
                        size="sm"
                        className="w-full text-xs text-zinc-400 hover:text-white"
                        onClick={() => { setFaixaPreco([0, precoMaxGlobal]); setFaixaPrecoVisual([0, precoMaxGlobal]); }}
                      >
                        Limpar filtro
                      </Button>
                    )}
                  </div>
                </CollapsibleContent>
              </Collapsible>
            )}
          </aside>

          {/* Grid de Produtos */}
          <main className="flex-1 min-w-0">
            {loading ? (
              <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-3 gap-3 md:gap-4">
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
                  <p className="text-sm text-zinc-400">
                    Mostrando {modelosFiltrados.length} {modelosFiltrados.length === 1 ? 'produto' : 'produtos'}
                  </p>
                  {modelosSelecionados.size > 0 && (
                    <Badge className="bg-accent text-white">
                      {modelosSelecionados.size} selecionada(s)
                    </Badge>
                  )}
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-3 gap-3 md:gap-4">
                  {modelosFiltrados.map((modelo) => {
                    const selecionado = modelosSelecionados.has(modelo.id);
                    return (
                      <div
                        key={modelo.id}
                        className={`group relative overflow-hidden rounded-lg transition-all ${
                          selecionado ? 'ring-2 ring-accent' : ''
                        }`}
                      >
                        {/* Diagonal accent strip */}
                        <div className="absolute top-0 right-0 w-full h-1 bg-gradient-to-r from-transparent via-accent/50 to-accent z-10"></div>
                        
                        <div className="bg-zinc-800 border border-zinc-700 hover:border-accent hover:shadow-lg transition-all rounded-lg overflow-hidden h-full flex flex-col">
                          <div className="relative">
                            {/* Imagem ou Vídeo */}
                            <div
                              className="bg-zinc-700 overflow-hidden cursor-pointer aspect-[3/4]"
                              onClick={() => navigate(`/catalogo/${modelo.id}`)}
                            >
                              {modelo.video_url ? (
                                <video
                                  src={modelo.video_url}
                                  className="w-full h-full object-cover bg-zinc-800"
                                  muted
                                  loop
                                  autoPlay
                                  playsInline
                                />
                              ) : modelo.imagem_modelo ? (
                                <img
                                  src={modelo.imagem_modelo}
                                  alt={modelo.nome_modelo}
                                  className="w-full h-full object-cover bg-zinc-800 group-hover:scale-110 transition-transform duration-500"
                                />
                              ) : (
                                <div className="w-full h-full flex items-center justify-center text-zinc-500">
                                  Sem imagem
                                </div>
                              )}
                            </div>

                            {/* Checkbox de seleção */}
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                toggleSelecao(modelo.id);
                              }}
                              className={`absolute top-3 right-3 w-8 h-8 rounded-full flex items-center justify-center transition-all z-20 ${
                                selecionado
                                  ? 'bg-accent text-white shadow-[0_0_20px_rgba(251,146,60,0.5)]'
                                  : 'bg-black/60 hover:bg-black border border-white/20 text-white'
                              }`}
                            >
                              {selecionado && <Check className="h-4 w-4" />}
                            </button>

                            {/* Badge pronta entrega */}
                            {modelo.pronta_entrega && (
                              <Badge className="absolute top-3 left-3 bg-emerald-600 text-white border-0 text-[10px] gap-0.5 z-20">
                                <Zap className="h-3 w-3" />
                                Pronta Entrega
                              </Badge>
                            )}

                            {/* Badge de categoria */}
                            {modelo.categorias && modelo.categorias.length > 0 && (
                              <Badge className="absolute bottom-3 left-3 bg-accent text-white border-0">
                                {modelo.categorias[0]}
                              </Badge>
                            )}
                          </div>

                            {/* Info do produto */}
                          <div className="p-3 md:p-4 flex flex-col flex-1 gap-1">
                            <h3
                              className="font-bold line-clamp-1 text-sm md:text-base text-white hover:text-accent transition-colors cursor-pointer"
                              onClick={() => navigate(`/catalogo/${modelo.id}`)}
                            >
                              {modelo.nome_modelo}
                            </h3>
                            <div className="flex-1">
                              {exibirPrecos && (
                                <div className="mt-1">
                      <p className="text-base md:text-2xl font-black text-accent drop-shadow-[0_2px_10px_rgba(251,146,60,0.3)] truncate">
                                    R$ {modelo.preco_base.toFixed(2)}
                                  </p>
                                  {exibirFormasPagamento && (
                                    <>
                                      <p className="text-[10px] md:text-sm text-emerald-400 font-bold mt-0.5 truncate">
                                        R$ {(modelo.preco_base * (1 - descontoPix / 100)).toFixed(2)} <span className="font-medium text-emerald-500">{textoPix} ({descontoPix}% OFF)</span>
                                      </p>
                                      <div className="text-[10px] md:text-xs text-zinc-400 mt-0.5 truncate">
                                        {textoParcelamento}
                                      </div>
                                    </>
                                  )}
                                </div>
                              )}
                              {!exibirPrecos && modelo.apresentacao_venda ? (
                                <p className="text-[10px] md:text-xs text-zinc-400 line-clamp-3 mt-1">{modelo.apresentacao_venda}</p>
                              ) : null}
                            </div>
                            <Button
                              size="sm"
                              className="w-full mt-2 bg-accent hover:bg-accent/90 text-white font-semibold text-[10px] md:text-sm h-8 md:h-10 rounded-lg shadow-[0_4px_15px_rgba(251,146,60,0.25)]"
                              onClick={() => navigate(`/catalogo/${modelo.id}`)}
                            >
                              Ver detalhes
                              <ArrowRight className="h-3 w-3 md:h-4 md:w-4 ml-1" />
                            </Button>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>

                {modelosFiltrados.length === 0 && (
                  <div className="text-center py-12">
                    <p className="text-zinc-400">Nenhuma lâmina encontrada</p>
                  </div>
                )}
              </>
            )}
          </main>
        </div>
      </div>

      {/* Botão WhatsApp Flutuante */}
      {modelosSelecionados.size > 0 && (
        <div className="fixed bottom-6 right-6 z-50">
          <Button
            size="lg"
            onClick={enviarWhatsApp}
            className="rounded-full bg-accent hover:bg-accent/90 text-white font-semibold shadow-[0_0_40px_rgba(251,146,60,0.5)] hover:scale-105 transition-all"
          >
            <MessageCircle className="h-5 w-5 mr-2" />
            Consultar no WhatsApp ({modelosSelecionados.size})
          </Button>
        </div>
      )}

    </div>
  );
}
