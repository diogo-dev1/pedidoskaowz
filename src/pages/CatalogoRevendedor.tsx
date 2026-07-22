import { useState, useEffect, useRef, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Search, MessageCircle, Check, ChevronDown, Star, ArrowRight, ChevronLeft, ChevronRight, Zap, Package, SlidersHorizontal, X, TrendingUp, ShoppingBag, Trash2, Lock, Sparkles } from 'lucide-react';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet';

const SELECAO_REVENDEDOR_KEY = 'catalogo_revendedor_selecionados';
const KIT_MIN_LAMINAS = 10;
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

interface MargemProduto {
  modelo_id: string;
  margem_percentual: number;
}

export default function CatalogoRevendedor() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const [modelos, setModelos] = useState<Modelo[]>([]);
  const [categoriaAtiva, setCategoriaAtiva] = useState<string | null>(null);
  const [categoriasMultiplas, setCategoriasMultiplas] = useState<string[]>([]);
  const [busca, setBusca] = useState('');
  const [modelosSelecionados, setModelosSelecionados] = useState<Set<string>>(() => {
    if (typeof window === 'undefined') return new Set();
    const saved = sessionStorage.getItem(SELECAO_REVENDEDOR_KEY);
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
  const [exibirFormasPagamento, setExibirFormasPagamento] = useState(true);
  const [descontoPix, setDescontoPix] = useState(5);
  const [textoPix, setTextoPix] = useState('no PIX');
  const [textoParcelamento, setTextoParcelamento] = useState('3x sem juros ou até 12x no cartão');
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
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Persist selection to sessionStorage
  useEffect(() => {
    if (typeof window === 'undefined') return;
    if (modelosSelecionados.size === 0) {
      sessionStorage.removeItem(SELECAO_REVENDEDOR_KEY);
      return;
    }
    sessionStorage.setItem(SELECAO_REVENDEDOR_KEY, JSON.stringify(Array.from(modelosSelecionados)));
  }, [modelosSelecionados]);

  const toggleSelecao = (id: string) => {
    const novaSelecao = new Set(modelosSelecionados);
    if (novaSelecao.has(id)) {
      novaSelecao.delete(id);
    } else {
      novaSelecao.add(id);
    }
    setModelosSelecionados(novaSelecao);
  };

  const [comboAberto, setComboAberto] = useState(false);

  const laminasSelecionadasList = Array.from(modelosSelecionados)
    .map(id => modelos.find(m => m.id === id))
    .filter((m): m is Modelo => !!m);

  const totalVenda = laminasSelecionadasList.reduce((sum, m) => sum + m.preco_base, 0);
  const totalCusto = laminasSelecionadasList.reduce(
    (sum, m) => sum + m.preco_base * (1 - (margensProduto[m.id] ?? margemGlobal) / 100),
    0,
  );
  const totalLucro = totalVenda - totalCusto;
  const faltamParaKit = Math.max(0, KIT_MIN_LAMINAS - modelosSelecionados.size);
  const podeFecharCombo = modelosSelecionados.size >= KIT_MIN_LAMINAS;
  const progresso = Math.min(100, (modelosSelecionados.size / KIT_MIN_LAMINAS) * 100);

  const enviarWhatsAppCombo = () => {
    if (!podeFecharCombo) {
      toast.error(`Adicione mais ${faltamParaKit} lâmina(s) para fechar o combo`);
      return;
    }
    const linhas = laminasSelecionadasList.map((m, i) => {
      const custo = m.preco_base * (1 - (margensProduto[m.id] ?? margemGlobal) / 100);
      return `${String(i + 1).padStart(2, '0')}. ${m.nome_modelo} — Custo R$ ${custo.toFixed(2)} · Venda R$ ${m.preco_base.toFixed(2)}`;
    }).join('\n');
    const mensagem =
      `Olá! Quero fechar um *combo para revenda* com ${modelosSelecionados.size} lâminas ` +
      `e gostaria de conversar sobre *margens especiais* para este volume.\n\n` +
      `*LÂMINAS SELECIONADAS*\n${linhas}\n\n` +
      `*TOTAIS ESTIMADOS*\n` +
      `Custo base: R$ ${totalCusto.toFixed(2)}\n` +
      `Venda sugerida: R$ ${totalVenda.toFixed(2)}\n` +
      `Lucro estimado: R$ ${totalLucro.toFixed(2)}\n\n` +
      `Podemos alinhar margem/condição para este combo?`;
    const url = `https://wa.me/5528999025695?text=${encodeURIComponent(mensagem)}`;
    window.open(url, '_blank');
  };

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
    icon: getIconComponent(cat.icone)
  }));

  useEffect(() => {
    carregarModelos();
    carregarCategoriasVisiveis();
    carregarBanners();
    carregarConfigRevendedor();
    carregarMargensProduto();
    const catParam = searchParams.get('categoria');
    const verTudoParam = searchParams.get('ver');
    const prontaParam = searchParams.get('pronta_entrega');
    if (catParam) {
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
      carregarOrdemCategoria(categoriaAtiva);
    }
  }, [categoriasVisiveis]);

  useEffect(() => {
    if (banners.length <= 1) return;
    const interval = setInterval(() => {
      setBannerAtual((prev) => (prev + 1) % banners.length);
    }, 5000);
    return () => clearInterval(interval);
  }, [banners.length]);

  const carregarBanners = async () => {
    const { data } = await supabase.
    from('banners_catalogo').
    select('*').
    eq('ativo', true).
    order('ordem');
    if (data) setBanners(data as Banner[]);
  };

  const carregarConfigRevendedor = async () => {
    const { data } = await supabase.
    from('config_revendedor' as any).
    select('*').
    in('chave', ['exibir_precos', 'exibir_formas_pagamento', 'desconto_pix', 'texto_pix', 'texto_parcelamento', 'filtro_preco_ativo', 'filtro_tamanho_ativo', 'filtro_lamina_ativo', 'margem_global']);
    if (data) {
      (data as any[]).forEach((d: any) => {
        if (d.chave === 'exibir_precos') setExibirPrecos(d.valor === 'true');
        if (d.chave === 'exibir_formas_pagamento') setExibirFormasPagamento(d.valor === 'true');
        if (d.chave === 'desconto_pix') setDescontoPix(parseFloat(d.valor) || 5);
        if (d.chave === 'texto_pix') setTextoPix(d.valor);
        if (d.chave === 'texto_parcelamento') setTextoParcelamento(d.valor);
        if (d.chave === 'filtro_preco_ativo') setFiltroPrecoAtivo(d.valor === 'true');
        if (d.chave === 'filtro_tamanho_ativo') setFiltroTamanhoAtivo(d.valor === 'true');
        if (d.chave === 'filtro_lamina_ativo') setFiltroLaminaAtivo(d.valor === 'true');
        if (d.chave === 'margem_global') setMargemGlobal(parseFloat(d.valor) || 30);
      });
    }
  };

  const carregarMargensProduto = async () => {
    const { data } = await supabase.
    from('margem_revendedor_produto' as any).
    select('modelo_id, margem_percentual');
    if (data) {
      const map: Record<string, number> = {};
      (data as any[]).forEach((d: any) => {map[d.modelo_id] = Number(d.margem_percentual);});
      setMargensProduto(map);
    }
  };

  const carregarOrdemCategoria = async (categoria: string) => {
    const catObj = categoriasVisiveis.find((c) => c.categoria === categoria);
    if (!catObj) {setOrdemCategoria({});return;}
    const { data } = await supabase.
    from('ordem_categoria_revendedor' as any).
    select('modelo_id, ordem').
    eq('categoria_id', catObj.id).
    order('ordem');
    if (data && (data as any[]).length > 0) {
      const map: Record<string, number> = {};
      (data as any[]).forEach((d: any) => {map[d.modelo_id] = d.ordem;});
      setOrdemCategoria(map);
    } else {
      setOrdemCategoria({});
    }
  };

  const selecionarCategoria = (categoria: string) => {
    setCategoriaAtiva(categoria);
    setCategoriasMultiplas([]);
    setFiltroProntaEntrega(false);
    setMostrarLanding(false);
    setSearchParams({ categoria });
    carregarOrdemCategoria(categoria);
  };

  const toggleCategoriaFiltro = (categoria: string) => {
    setCategoriasMultiplas((prev) => {
      const novas = prev.includes(categoria) ?
      prev.filter((c) => c !== categoria) :
      [...prev, categoria];
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
    setOrdemCategoria({});
    setSearchParams({});
  };

  const verProntaEntrega = () => {
    setMostrarLanding(false);
    setCategoriaAtiva(null);
    setFiltroProntaEntrega(true);
    setSearchParams({ pronta_entrega: 'true' });
  };

  const carregarCategoriasVisiveis = async () => {
    const { data } = await supabase.
    from('categorias_catalogo_visiveis').
    select('*').
    order('ordem');
    if (data) setCategoriasVisiveis(data);
  };

  const carregarModelos = async () => {
    try {
      const { data: midiasData } = await supabase.
      from('midias_catalogo').
      select('modelo_id');
      const modelosComMidiaCatalogo = new Set((midiasData || []).map((m) => m.modelo_id));

      const { data, error } = await supabase.
      from('catalogo_modelos').
      select('*').
      eq('visivel_catalogo', true).
      eq('visivel_revendedor', true).
      order('nome_modelo');


      if (error) throw error;

      const modelosFiltrados = (data || []).filter((m) =>
      m.imagem_modelo || m.video_url || modelosComMidiaCatalogo.has(m.id)
      );
      setModelos(modelosFiltrados as Modelo[]);

      if (modelosFiltrados.length > 0) {
        const maxP = Math.ceil(Math.max(...modelosFiltrados.map((m) => m.preco_base)) / 100) * 100;
        setPrecoMaxGlobal(maxP);
        setFaixaPreco([0, maxP]);
        setFaixaPrecoVisual([0, maxP]);

        const tamanhos = modelosFiltrados.filter((m) => m.comprimento_total != null).map((m) => m.comprimento_total as number);
        if (tamanhos.length > 0) {
          const uniqueTamanhos = [...new Set(tamanhos.map((t) => Math.round(t * 10) / 10))].sort((a, b) => a - b);
          setTamanhosDisponiveis(uniqueTamanhos);
        }
        const laminas = modelosFiltrados.filter((m) => m.area_util_corte != null).map((m) => m.area_util_corte as number);
        if (laminas.length > 0) {
          const uniqueLaminas = [...new Set(laminas.map((l) => Math.round(l * 10) / 10))].sort((a, b) => a - b);
          setLaminasDisponiveis(uniqueLaminas);
        }
      }
    } catch (error) {
      console.error('Erro ao carregar modelos:', error);
      toast.error('Erro ao carregar catálogo');
    } finally {
      setLoading(false);
    }
  };

  const categoriasPermitidasTodas = new Set(
    categoriasVisiveis.filter((c) => c.visivel_todas).map((c) => c.categoria)
  );

  const getMargemModelo = (modeloId: string) => {
    return margensProduto[modeloId] ?? margemGlobal;
  };

  const getPrecoRevenda = (precoVenda: number, modeloId: string) => {
    const margem = getMargemModelo(modeloId);
    // Desconto direto: preço de venda ao revendedor = preço final - X%
    return precoVenda * (1 - margem / 100);
  };

  const getLucro = (precoVenda: number, modeloId: string) => {
    const precoRevenda = getPrecoRevenda(precoVenda, modeloId);
    return precoVenda - precoRevenda;
  };

  const modelosFiltrados = modelos.filter((modelo) => {
    if (modelo.preco_base < faixaPreco[0] || modelo.preco_base > faixaPreco[1]) return false;

    if (tamanhosSelecionados.length > 0) {
      if (modelo.comprimento_total == null) return false;
      const maxSelecionado = Math.max(...tamanhosSelecionados);
      const rounded = Math.round(modelo.comprimento_total * 10) / 10;
      if (rounded > maxSelecionado) return false;
    }

    if (laminasSelecionadas.length > 0) {
      if (modelo.area_util_corte == null) return false;
      const maxSelecionado = Math.max(...laminasSelecionadas);
      const rounded = Math.round(modelo.area_util_corte * 10) / 10;
      if (rounded > maxSelecionado) return false;
    }

    if (filtroProntaEntrega && !modelo.pronta_entrega) return false;

    if (categoriasMultiplas.length > 0) {
      const categoriasExpandidas = new Set<string>();
      categoriasMultiplas.forEach((c) => {
        categoriasExpandidas.add(c);
        const catObj = categoriasVisiveis.find((cv) => cv.categoria === c);
        if (catObj) {
          categoriasVisiveis.filter((cv) => cv.categoria_pai_id === catObj.id).forEach((child) => categoriasExpandidas.add(child.categoria));
        }
      });
      const matchCategoria = modelo.categorias && Array.from(categoriasExpandidas).some((c) => modelo.categorias.includes(c));
      const matchBusca = !busca || modelo.nome_modelo.toLowerCase().includes(busca.toLowerCase());
      return matchCategoria && matchBusca;
    }

    if (categoriaAtiva) {
      const categoriasExpandidas = new Set<string>([categoriaAtiva]);
      const catObj = categoriasVisiveis.find((cv) => cv.categoria === categoriaAtiva);
      if (catObj) {
        categoriasVisiveis.filter((cv) => cv.categoria_pai_id === catObj.id).forEach((child) => categoriasExpandidas.add(child.categoria));
      }
      const matchCategoria = modelo.categorias && Array.from(categoriasExpandidas).some((c) => modelo.categorias.includes(c));
      const matchBusca = !busca || modelo.nome_modelo.toLowerCase().includes(busca.toLowerCase());
      return matchCategoria && matchBusca;
    }
    if (!filtroProntaEntrega) {
      const categoriaPermitida = categoriasVisiveis.length === 0 ||
      modelo.categorias && modelo.categorias.some((c) => categoriasPermitidasTodas.has(c));
      const produtoPermitido = modelo.visivel_todas !== false;
      const matchBusca = !busca || modelo.nome_modelo.toLowerCase().includes(busca.toLowerCase());
      return categoriaPermitida && produtoPermitido && matchBusca;
    }
    const matchBusca = !busca || modelo.nome_modelo.toLowerCase().includes(busca.toLowerCase());
    return matchBusca;
  }).sort((a, b) => {
    if ((categoriaAtiva || categoriasMultiplas.length === 1) && Object.keys(ordemCategoria).length > 0) {
      const ordemA = ordemCategoria[a.id] ?? 999;
      const ordemB = ordemCategoria[b.id] ?? 999;
      return ordemA - ordemB;
    }
    return (a.ordem_catalogo || 999) - (b.ordem_catalogo || 999);
  });

  // Landing Page
  if (mostrarLanding) {
    return (
      <div className="min-h-screen bg-zinc-950 overflow-x-hidden max-w-[100vw]">
        <header className="relative py-10 md:py-16 overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-b from-accent/10 via-transparent to-transparent" />
          <div className="w-full max-w-7xl mx-auto px-3 sm:px-4 text-center relative z-10">
            <div className="inline-block mb-3">
              <span className="text-accent text-xs md:text-sm font-semibold tracking-[0.3em] uppercase"></span>
            </div>
            <h1 className="text-3xl md:text-5xl font-black text-white mb-3 tracking-tight leading-tight">
              CATÁLOGO <span className="text-accent">REVENDEDOR</span>
            </h1>
            <p className="text-zinc-400 text-sm md:text-lg max-w-md mx-auto">
              Preços exclusivos para revendedores. Confira sua margem de lucro.
            </p>

            




            
          </div>
        </header>

        <div className="w-full max-w-7xl mx-auto px-3 sm:px-4 pb-16">
          {banners.length > 0 &&
          <div className="relative max-w-5xl mx-auto mb-8 rounded-xl overflow-hidden">
              <div className="relative aspect-[21/9] md:aspect-[3/1]">
                {banners.map((banner, idx) =>
              <div
                key={banner.id}
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
              <button
                key={idx}
                onClick={() => setBannerAtual(idx)}
                className={`w-2 h-2 rounded-full transition-all ${idx === bannerAtual ? 'bg-accent w-6' : 'bg-white/50 hover:bg-white/80'}`} />

              )}
                </div>
            }
            </div>
          }

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
            <Button
              onClick={verTudo}
              className="flex-1 bg-accent hover:bg-accent/90 text-white font-bold h-12 text-sm md:text-base rounded-xl shadow-[0_0_30px_rgba(251,146,60,0.3)] hover:shadow-[0_0_40px_rgba(251,146,60,0.5)] transition-all">
              
              <Star className="h-4 w-4 mr-2" />
              Ver todo o catálogo
            </Button>
            <Button
              onClick={verProntaEntrega}
              variant="outline"
              className="flex-1 border-emerald-600/50 text-emerald-400 hover:bg-emerald-600 hover:text-white hover:border-emerald-600 font-bold h-12 text-sm md:text-base rounded-xl transition-all">
              
              <Zap className="h-4 w-4 mr-2" />
              Pronta Entrega
            </Button>
          </div>

          {/* Monte seu Combo */}
          <div className="flex justify-center max-w-lg mx-auto mt-3">
            <Button
              onClick={() => navigate('/catalogo-revendedor/montar-kit')}
              variant="outline"
              className="w-full border-accent/50 text-accent hover:bg-accent hover:text-white hover:border-accent font-bold h-12 text-sm md:text-base rounded-xl transition-all"
            >
              <Package className="h-4 w-4 mr-2" />
              Monte um Kit
            </Button>
          </div>

          <div className="text-center mt-10 pt-8 border-t border-zinc-800/50">
            <p className="text-zinc-500 text-xs mb-3">Precisa de ajuda para escolher?</p>
            <Button
              variant="outline"
              onClick={() => {
                const url = `https://wa.me/5528999025695?text=${encodeURIComponent('Olá! Sou revendedor e gostaria de saber mais.')}`;
                window.open(url, '_blank');
              }}
              className="border-green-600/50 text-green-400 hover:bg-green-600 hover:text-white hover:border-green-600 transition-all">
              
              <MessageCircle className="h-4 w-4 mr-2" />
              Fale conosco no WhatsApp
            </Button>
          </div>
        </div>
      </div>);

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
                }}
                className="text-white hover:bg-white/10 text-xs md:text-sm">
                
                ← Voltar
              </Button>
              <h1 className="text-lg md:text-3xl font-bold text-white tracking-tight">
                {filtroProntaEntrega ? 'PRONTA ENTREGA' : 'CATÁLOGO REVENDEDOR'}
              </h1>
            </div>
            <div className="flex gap-2 w-full md:w-auto">
              <div className="relative flex-1 md:w-80">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-3.5 w-3.5 md:h-4 md:w-4 text-white/40" />
                <Input
                  placeholder="Buscar lâminas..."
                  value={busca}
                  onChange={(e) => setBusca(e.target.value)}
                  className="pl-9 md:pl-10 text-sm md:text-base bg-white/5 border-white/20 text-white placeholder:text-white/40 focus:border-accent h-9 md:h-10" />
                
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Banner margem */}
      <div className="w-full bg-gradient-to-r from-emerald-950/30 via-zinc-900/50 to-emerald-950/30 border-b border-emerald-800/20">
        <div className="max-w-7xl mx-auto px-3 sm:px-4 py-2 flex items-center justify-center gap-2">
          <TrendingUp className="h-3.5 w-3.5 text-emerald-400" />
          <span className="text-zinc-400 text-xs">
            Margem de lucro base: <strong className="text-emerald-400">{margemGlobal}%</strong> · Preços exclusivos para revendedores
          </span>
        </div>
      </div>

      {/* Combo tip topo */}
      <div className="w-full bg-gradient-to-r from-accent/10 via-zinc-900/80 to-emerald-950/40 backdrop-blur-sm border-b border-accent/20">
        <div className="max-w-7xl mx-auto px-3 sm:px-4 py-2.5 flex items-center justify-center gap-2.5 text-xs sm:text-sm">
          <Sparkles className="h-3.5 w-3.5 text-accent shrink-0" />
          <span className="text-zinc-300">
            Monte um <strong className="text-accent">combo de revenda</strong> com no mínimo <strong className="text-white">{KIT_MIN_LAMINAS} lâminas</strong> e fale com a gente sobre <strong className="text-emerald-400">margens especiais</strong>.
          </span>
        </div>
      </div>


      <div className="w-full max-w-7xl mx-auto px-2 sm:px-4 py-3 md:py-6">
        <div className="flex flex-col lg:flex-row gap-2 md:gap-6 min-w-0">
          {/* Sidebar */}
          <aside className="lg:w-64 shrink-0">
            <Collapsible open={secaoAberta === 'categorias'} onOpenChange={(open) => setSecaoAberta(open ? 'categorias' : null)} className="bg-zinc-800 border border-zinc-700 rounded-lg sticky top-24 shadow-sm">
              <CollapsibleTrigger className="w-full p-3 md:p-4 flex items-center justify-between text-white hover:bg-zinc-700/50 rounded-lg transition-colors">
                <div className="flex items-center gap-2">
                  <span className="font-semibold text-base md:text-lg">Categorias</span>
                  {categoriaAtiva && <Badge className="bg-accent text-white text-xs">{categoriaAtiva}</Badge>}
                  {categoriasMultiplas.length > 0 && <Badge className="bg-accent text-white text-xs">{categoriasMultiplas.length} selecionadas</Badge>}
                  {filtroProntaEntrega && <Badge className="bg-emerald-600 text-white text-xs">Pronta Entrega</Badge>}
                </div>
                <ChevronDown className="h-4 w-4 transition-transform duration-200 [&[data-state=open]]:rotate-180" />
              </CollapsibleTrigger>
              <CollapsibleContent className="px-3 md:px-4 pb-3 md:pb-4">
                <div className="space-y-1.5 md:space-y-2">
                  <Button
                    variant={!categoriaAtiva && categoriasMultiplas.length === 0 && !filtroProntaEntrega ? "default" : "ghost"}
                    size="sm"
                    className={`w-full justify-start text-xs md:text-sm h-8 md:h-10 ${
                    !categoriaAtiva && categoriasMultiplas.length === 0 && !filtroProntaEntrega ?
                    'bg-accent text-white hover:bg-accent/90' :
                    'text-zinc-300 hover:bg-zinc-700'}`
                    }
                    onClick={() => {setCategoriaAtiva(null);setCategoriasMultiplas([]);setFiltroProntaEntrega(false);setSearchParams({});}}>
                    
                    Todas
                  </Button>
                  <Button
                    variant={filtroProntaEntrega ? "default" : "ghost"}
                    size="sm"
                    className={`w-full justify-start text-xs md:text-sm h-8 md:h-10 gap-1.5 ${
                    filtroProntaEntrega ?
                    'bg-emerald-600 text-white hover:bg-emerald-700' :
                    'text-emerald-400 hover:bg-zinc-700'}`
                    }
                    onClick={() => {setCategoriaAtiva(null);setCategoriasMultiplas([]);setFiltroProntaEntrega(true);}}>
                    
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
                        isActive ? 'bg-accent/20 text-accent' : 'text-zinc-300 hover:bg-zinc-700'}`
                        }
                        onClick={() => toggleCategoriaFiltro(cat.categoria)}>
                        
                        <div className={`w-4 h-4 rounded border flex items-center justify-center shrink-0 transition-colors ${
                        isActive ? 'bg-accent border-accent' : 'border-zinc-500'}`
                        }>
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
                      </Badge>
                  )}
                    <button className="text-[10px] text-zinc-500 hover:text-zinc-300 underline" onClick={() => {setCategoriasMultiplas([]);setSearchParams({});}}>
                      Limpar
                    </button>
                  </div>
                }
              </CollapsibleContent>
            </Collapsible>

            {/* Filtro por Valor */}
            {exibirPrecos && filtroPrecoAtivo &&
            <Collapsible open={secaoAberta === 'preco'} onOpenChange={(open) => setSecaoAberta(open ? 'preco' : null)} className="bg-zinc-800 border border-zinc-700 rounded-lg sticky top-44 shadow-sm mt-3">
                <CollapsibleTrigger className="w-full p-3 md:p-4 flex items-center justify-between text-white hover:bg-zinc-700/50 rounded-lg transition-colors">
                  <div className="flex items-center gap-2">
                    <SlidersHorizontal className="h-4 w-4 text-accent" />
                    <span className="font-semibold text-base md:text-lg">Faixa de Preço</span>
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
                    className="w-full [&_[role=slider]]:h-5 [&_[role=slider]]:w-5 [&_[role=slider]]:border-2 [&_[role=slider]]:border-accent [&_[role=slider]]:bg-zinc-950" />
                  
                    <div className="flex items-center gap-3">
                      <div className="flex-1 space-y-1">
                        <label className="text-[11px] text-zinc-500">Mínimo:</label>
                        <Input
                        type="number"
                        value={faixaPrecoVisual[0] === 0 ? '' : faixaPrecoVisual[0]}
                        placeholder="0"
                        onChange={(e) => {
                          const val = Number(e.target.value);
                          if (!isNaN(val) && val >= 0 && val <= faixaPrecoVisual[1]) handleFaixaPrecoChange([val, faixaPrecoVisual[1]]);
                        }}
                        className="h-9 text-sm bg-zinc-900 border-zinc-700 text-white" />
                      
                      </div>
                      <div className="flex-1 space-y-1">
                        <label className="text-[11px] text-zinc-500">Máximo:</label>
                        <Input
                        type="number"
                        value={faixaPrecoVisual[1] === 0 ? '' : faixaPrecoVisual[1]}
                        placeholder="0"
                        onChange={(e) => {
                          const val = Number(e.target.value);
                          if (!isNaN(val) && val >= faixaPrecoVisual[0] && val <= precoMaxGlobal) handleFaixaPrecoChange([faixaPrecoVisual[0], val]);
                        }}
                        className="h-9 text-sm bg-zinc-900 border-zinc-700 text-white" />
                      
                      </div>
                    </div>
                    <p className="text-center text-xs text-zinc-500">
                      {modelosFiltrados.length} {modelosFiltrados.length === 1 ? 'lâmina encontrada' : 'lâminas encontradas'}
                    </p>
                    {(faixaPrecoVisual[0] > 0 || faixaPrecoVisual[1] < precoMaxGlobal) &&
                  <Button variant="ghost" size="sm" className="w-full text-xs text-zinc-400 hover:text-white" onClick={() => {setFaixaPreco([0, precoMaxGlobal]);setFaixaPrecoVisual([0, precoMaxGlobal]);}}>
                        Limpar filtro
                      </Button>
                  }
                  </div>
                </CollapsibleContent>
              </Collapsible>
            }

            {/* Filtro por Tamanho */}
            {filtroTamanhoAtivo && tamanhosDisponiveis.length > 0 &&
            <Collapsible open={secaoAberta === 'tamanho'} onOpenChange={(open) => setSecaoAberta(open ? 'tamanho' : null)} className="bg-zinc-800 border border-zinc-700 rounded-lg shadow-sm mt-3">
                <CollapsibleTrigger className="w-full p-3 flex items-center justify-between text-white hover:bg-zinc-700/50 rounded-lg transition-colors">
                  <div className="flex items-center gap-2">
                    <SlidersHorizontal className="h-3.5 w-3.5 text-accent" />
                    <span className="font-semibold text-sm">Comprimento Total</span>
                    {tamanhosSelecionados.length > 0 && <Badge className="bg-accent text-white text-[10px] h-4 px-1.5">{tamanhosSelecionados.length}</Badge>}
                  </div>
                  <ChevronDown className="h-3.5 w-3.5 transition-transform duration-200 [&[data-state=open]]:rotate-180" />
                </CollapsibleTrigger>
                <CollapsibleContent className="px-3 pb-3">
                  <p className="text-[10px] text-zinc-500 mb-1.5 pt-1">Exibir lâminas até:</p>
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
                <button className="text-[10px] text-zinc-500 hover:text-zinc-300 mt-2 underline" onClick={() => setTamanhosSelecionados([])}>Limpar</button>
                }
                </CollapsibleContent>
              </Collapsible>
            }

            {/* Filtro por Fio de Corte */}
            {filtroLaminaAtivo && laminasDisponiveis.length > 0 &&
            <Collapsible open={secaoAberta === 'lamina'} onOpenChange={(open) => setSecaoAberta(open ? 'lamina' : null)} className="bg-zinc-800 border border-zinc-700 rounded-lg shadow-sm mt-3">
                <CollapsibleTrigger className="w-full p-3 flex items-center justify-between text-white hover:bg-zinc-700/50 rounded-lg transition-colors">
                  <div className="flex items-center gap-2">
                    <SlidersHorizontal className="h-3.5 w-3.5 text-accent" />
                    <span className="font-semibold text-sm">Fio de Corte</span>
                    {laminasSelecionadas.length > 0 && <Badge className="bg-accent text-white text-[10px] h-4 px-1.5">{laminasSelecionadas.length}</Badge>}
                  </div>
                  <ChevronDown className="h-3.5 w-3.5 transition-transform duration-200 [&[data-state=open]]:rotate-180" />
                </CollapsibleTrigger>
                <CollapsibleContent className="px-3 pb-3">
                  <p className="text-[10px] text-zinc-500 mb-1.5 pt-1">Exibir lâminas até:</p>
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
                <button className="text-[10px] text-zinc-500 hover:text-zinc-300 mt-2 underline" onClick={() => setLaminasSelecionadas([])}>Limpar</button>
                }
                </CollapsibleContent>
              </Collapsible>
            }
          </aside>

          {/* Grid de Produtos */}
          <main className="flex-1 min-w-0">
            {loading ?
            <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-3 gap-1.5 md:gap-4">
                {[...Array(6)].map((_, i) =>
              <div key={i} className="bg-zinc-800 border border-zinc-700 rounded-lg p-3 animate-pulse">
                    <div className="aspect-[3/4] bg-zinc-700 rounded-lg mb-2" />
                    <div className="h-3 bg-zinc-700 rounded mb-1.5" />
                    <div className="h-5 bg-zinc-700 rounded w-1/2" />
                  </div>
              )}
              </div> :

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

                <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-3 gap-1.5 md:gap-4">
                  {modelosFiltrados.map((modelo) => {
                  const margem = getMargemModelo(modelo.id);
                  const precoRevenda = getPrecoRevenda(modelo.preco_base, modelo.id);
                  const lucro = getLucro(modelo.preco_base, modelo.id);
                  const selecionado = modelosSelecionados.has(modelo.id);

                  return (
                    <div
                      key={modelo.id}
                      className={`group relative overflow-hidden rounded-lg transition-all ${
                        selecionado
                          ? 'ring-2 ring-accent ring-offset-2 ring-offset-zinc-950 shadow-[0_0_0_1px_hsl(var(--accent)/0.55)]'
                          : ''
                      }`}>
                      
                        <div className="absolute top-0 right-0 w-full h-1 bg-gradient-to-r from-transparent via-accent/50 to-accent z-10"></div>
                        
                        <div className="bg-zinc-800 border border-zinc-700 hover:border-accent hover:shadow-lg transition-all rounded-lg overflow-hidden h-full flex flex-col">
                          <div className="relative">
                            <div
                            className="bg-zinc-700 overflow-hidden cursor-pointer aspect-[3/4]"
                            onClick={() => navigate(`/catalogo-revendedor/${modelo.id}`)}>
                            
                              {modelo.video_url ?
                            <video src={modelo.video_url} className="w-full h-full object-cover bg-zinc-800" muted loop autoPlay playsInline /> :
                            modelo.imagem_modelo ?
                            <img src={modelo.imagem_modelo} alt={modelo.nome_modelo} className="w-full h-full object-cover bg-zinc-800 group-hover:scale-110 transition-transform duration-500" /> :

                            <div className="w-full h-full flex items-center justify-center text-zinc-500">Sem imagem</div>
                            }
                            </div>

                            {/* Checkbox de seleção */}
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                toggleSelecao(modelo.id);
                              }}
                              className={`absolute top-3 right-3 w-7 h-7 rounded-full transition-all z-20 ${
                                selecionado
                                  ? 'bg-emerald-500 border-[3px] border-emerald-400 shadow-[0_0_12px_rgba(16,185,129,0.6)]'
                                  : 'bg-transparent border-[3px] border-emerald-500/80 hover:border-emerald-400 shadow-[0_0_8px_rgba(16,185,129,0.3)]'
                              }`}
                            >
                              {selecionado && <Check className="h-3.5 w-3.5 text-white mx-auto" />}
                            </button>

                            {modelo.pronta_entrega &&
                          <Badge className="absolute top-3 left-3 bg-emerald-600 text-white border-0 text-[10px] gap-0.5 z-20">
                                <Zap className="h-3 w-3" />
                                Pronta Entrega
                              </Badge>
                          }

                            {modelo.categorias && modelo.categorias.length > 0 &&
                          <Badge className="absolute bottom-3 left-3 bg-accent text-white border-0">
                                {modelo.categorias[0]}
                              </Badge>
                          }
                          </div>

                          {/* Info do produto - Card Revendedor */}
                          <div className="p-2 md:p-4 flex flex-col flex-1 gap-1">
                            <h3
                            className="font-bold line-clamp-1 text-sm md:text-base text-white hover:text-accent transition-colors cursor-pointer"
                            onClick={() => navigate(`/catalogo-revendedor/${modelo.id}`)}>
                            
                              {modelo.nome_modelo}
                            </h3>
                            
                            <div className="flex-1 space-y-1 mt-1">
                              {/* Preço de Venda (laranja) */}
                              <div>
                                <p className="text-[9px] md:text-[10px] text-zinc-500 uppercase tracking-wider">VENDA FINAL

                              </p>
                                <p className="text-base md:text-xl font-black text-accent truncate">
                                  R$ {modelo.preco_base.toFixed(2)}
                                </p>
                              </div>

                              {/* Preço de Revenda (branco/cinza) */}
                              <div>
                                <p className="text-[9px] md:text-[10px] text-zinc-500 uppercase tracking-wider">CUSTO

                              </p>
                                <p className="text-sm md:text-base font-bold text-zinc-200 truncate">
                                  R$ {precoRevenda.toFixed(2)}
                                </p>
                              </div>

                              {/* Margem de Lucro (verde) */}
                              <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-md px-2 py-1.5">
                                <p className="text-[9px] md:text-[10px] text-emerald-400/70 uppercase tracking-wider">Lucro</p>
                                <div className="flex items-center justify-between gap-1">
                                  <p className="text-sm md:text-lg font-black text-emerald-400 truncate">
                                    R$ {lucro.toFixed(2)}
                                  </p>
                                  <Badge className="bg-emerald-500/20 text-emerald-400 border-emerald-500/30 text-[10px] md:text-xs font-bold shrink-0">
                                    {margem.toFixed(0)}%
                                  </Badge>
                                </div>
                              </div>
                            </div>

                            <Button size="sm" className="w-full mt-1.5 bg-accent hover:bg-accent/90 text-white font-semibold text-[10px] md:text-sm h-8 md:h-10 rounded-lg shadow-[0_4px_15px_rgba(251,146,60,0.25)]" onClick={() => navigate(`/catalogo-revendedor/${modelo.id}`)}>
                            
                              Ver detalhes
                              <ArrowRight className="h-3 w-3 md:h-4 md:w-4 ml-1" />
                            </Button>
                          </div>
                        </div>
                      </div>);
                })}
                </div>

                {modelosFiltrados.length === 0 &&
              <div className="text-center py-12">
                    <p className="text-zinc-400">Nenhuma lâmina encontrada</p>
                  </div>
              }
              </>
            }
          </main>
        </div>
      </div>

      {/* Barra fixa do Combo (Big Tech style) */}
      {modelosSelecionados.size > 0 && (
        <div className="fixed bottom-0 inset-x-0 z-50 pb-[env(safe-area-inset-bottom)]">
          <div className="mx-auto max-w-3xl m-3 sm:m-4 rounded-2xl bg-zinc-950/95 backdrop-blur-xl border border-zinc-800 shadow-2xl overflow-hidden">
            {/* Progresso */}
            <div className="h-1 bg-zinc-900">
              <div
                className={`h-full transition-all duration-500 ${podeFecharCombo ? 'bg-emerald-500' : 'bg-accent'}`}
                style={{ width: `${progresso}%` }}
              />
            </div>
            <div className="flex items-center gap-3 p-3 sm:p-4">
              <button
                onClick={() => setComboAberto(true)}
                className="relative flex items-center justify-center h-11 w-11 rounded-xl bg-zinc-900 hover:bg-zinc-800 transition"
                aria-label="Ver combo"
              >
                <ShoppingBag className="h-5 w-5 text-white" />
                <span className="absolute -top-1 -right-1 h-5 min-w-5 px-1 rounded-full bg-accent text-white text-[10px] font-bold flex items-center justify-center">
                  {modelosSelecionados.size}
                </span>
              </button>

              <div className="flex-1 min-w-0">
                {podeFecharCombo ? (
                  <>
                    <p className="text-[11px] uppercase tracking-wider text-emerald-400 font-semibold">Combo pronto</p>
                    <p className="text-sm text-white truncate">
                      {modelosSelecionados.size} lâminas · Lucro est. <strong className="text-emerald-400">R$ {totalLucro.toFixed(2)}</strong>
                    </p>
                  </>
                ) : (
                  <>
                    <p className="text-[11px] uppercase tracking-wider text-zinc-500 font-semibold">Faltam {faltamParaKit} lâmina{faltamParaKit > 1 ? 's' : ''}</p>
                    <p className="text-sm text-zinc-300 truncate">
                      Mínimo {KIT_MIN_LAMINAS} para negociar margens especiais
                    </p>
                  </>
                )}
              </div>

              <Button
                size="lg"
                disabled={!podeFecharCombo}
                onClick={enviarWhatsAppCombo}
                className={`rounded-xl font-semibold h-11 px-4 ${podeFecharCombo ? 'bg-emerald-500 hover:bg-emerald-600 text-white' : 'bg-zinc-800 text-zinc-500 cursor-not-allowed'}`}
              >
                {podeFecharCombo ? <MessageCircle className="h-4 w-4 sm:mr-2" /> : <Lock className="h-4 w-4 sm:mr-2" />}
                <span className="hidden sm:inline">{podeFecharCombo ? 'Falar de margens' : 'Bloqueado'}</span>
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Sheet com detalhes do combo */}
      <Sheet open={comboAberto} onOpenChange={setComboAberto}>
        <SheetContent side="right" className="w-full sm:max-w-md bg-zinc-950 border-zinc-800 text-white overflow-y-auto">
          <SheetHeader>
            <SheetTitle className="text-white flex items-center gap-2">
              <ShoppingBag className="h-5 w-5 text-accent" />
              Seu Combo de Revenda
            </SheetTitle>
          </SheetHeader>

          <div className="mt-4 space-y-4">
            {/* Progresso */}
            <div className="rounded-xl bg-zinc-900/60 border border-zinc-800 p-3">
              <div className="flex justify-between text-xs mb-2">
                <span className="text-zinc-400">Progresso do combo</span>
                <span className={podeFecharCombo ? 'text-emerald-400 font-semibold' : 'text-white font-semibold'}>
                  {modelosSelecionados.size} / {KIT_MIN_LAMINAS}
                </span>
              </div>
              <div className="h-2 bg-zinc-800 rounded-full overflow-hidden">
                <div
                  className={`h-full transition-all ${podeFecharCombo ? 'bg-emerald-500' : 'bg-accent'}`}
                  style={{ width: `${progresso}%` }}
                />
              </div>
              {!podeFecharCombo && (
                <p className="text-[11px] text-zinc-500 mt-2">
                  Adicione mais {faltamParaKit} lâmina{faltamParaKit > 1 ? 's' : ''} para desbloquear a negociação de margens no WhatsApp.
                </p>
              )}
            </div>

            {/* Lista */}
            <div className="space-y-2">
              {laminasSelecionadasList.map((m) => {
                const margem = margensProduto[m.id] ?? margemGlobal;
                const custo = m.preco_base * (1 - margem / 100);
                const lucro = m.preco_base - custo;
                return (
                  <div key={m.id} className="flex items-center gap-3 rounded-xl bg-zinc-900/50 border border-zinc-800 p-2.5">
                    {m.imagem_modelo && (
                      <img src={m.imagem_modelo} alt="" className="h-12 w-12 rounded-lg object-cover bg-zinc-800" />
                    )}
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{m.nome_modelo}</p>
                      <p className="text-[11px] text-zinc-500">
                        Custo R$ {custo.toFixed(2)} · <span className="text-emerald-400">+R$ {lucro.toFixed(2)}</span>
                      </p>
                    </div>
                    <button
                      onClick={() => toggleModeloSelecionado(m.id)}
                      className="h-8 w-8 rounded-lg bg-zinc-800 hover:bg-red-500/20 hover:text-red-400 text-zinc-400 flex items-center justify-center transition"
                      aria-label="Remover"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                );
              })}
            </div>

            {/* Totais */}
            <div className="rounded-xl bg-zinc-900/60 border border-zinc-800 p-3 space-y-1.5 text-sm">
              <div className="flex justify-between text-zinc-400"><span>Custo total</span><span>R$ {totalCusto.toFixed(2)}</span></div>
              <div className="flex justify-between text-zinc-400"><span>Venda sugerida</span><span>R$ {totalVenda.toFixed(2)}</span></div>
              <div className="flex justify-between text-emerald-400 font-semibold pt-1.5 border-t border-zinc-800"><span>Lucro estimado</span><span>R$ {totalLucro.toFixed(2)}</span></div>
            </div>

            <Button
              size="lg"
              disabled={!podeFecharCombo}
              onClick={enviarWhatsAppCombo}
              className={`w-full rounded-xl font-semibold ${podeFecharCombo ? 'bg-emerald-500 hover:bg-emerald-600 text-white' : 'bg-zinc-800 text-zinc-500 cursor-not-allowed'}`}
            >
              {podeFecharCombo ? <><MessageCircle className="h-4 w-4 mr-2" /> Negociar margens no WhatsApp</> : <><Lock className="h-4 w-4 mr-2" /> Faltam {faltamParaKit} lâmina{faltamParaKit > 1 ? 's' : ''}</>}
            </Button>
          </div>
        </SheetContent>
      </Sheet>


    </div>);

}