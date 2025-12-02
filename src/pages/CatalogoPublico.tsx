import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Search, MessageCircle, Check, Sword, Shield, ChefHat, Trees, Wrench } from 'lucide-react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { toast } from 'sonner';

interface Modelo {
  id: string;
  nome_modelo: string;
  preco_base: number;
  imagem_modelo: string | null;
  categoria: string | null;
  apresentacao_venda: string | null;
  video_url: string | null;
}

export default function CatalogoPublico() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const [modelos, setModelos] = useState<Modelo[]>([]);
  const [categoriaAtiva, setCategoriaAtiva] = useState<string | null>(null);
  const [busca, setBusca] = useState('');
  const [modelosSelecionados, setModelosSelecionados] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [mostrarLanding, setMostrarLanding] = useState(true);

  const categorias = ['EDC', 'Adaga', 'Campo', 'Cozinha', 'Defesa', 'KZR', 'Upsell'];

  const categoriasVenda = [
    {
      titulo: 'Facas Utilitárias',
      subtitulo: "EDC's",
      descricao: 'Para portar no dia-a-dia',
      categoria: 'EDC',
      icon: Sword,
    },
    {
      titulo: 'Facas Táticas',
      subtitulo: 'DEFESA',
      descricao: 'Resistência e performance',
      categoria: 'Campo',
      icon: Shield,
    },
    {
      titulo: 'Facas de Churrasco',
      subtitulo: 'COZINHA',
      descricao: 'Precisão no corte',
      categoria: 'Cozinha',
      icon: ChefHat,
    },
    {
      titulo: 'Facas de Campo',
      subtitulo: 'CAÇA',
      descricao: 'Durabilidade extrema',
      categoria: 'Campo',
      icon: Trees,
    }
  ];

  useEffect(() => {
    carregarModelos();
    
    // Verifica se há categoria nos parâmetros da URL
    const catParam = searchParams.get('categoria');
    if (catParam) {
      setCategoriaAtiva(catParam);
      setMostrarLanding(false);
    }
  }, []);

  const selecionarCategoria = (categoria: string) => {
    setCategoriaAtiva(categoria);
    setMostrarLanding(false);
    setSearchParams({ categoria });
  };

  const verTudo = () => {
    setMostrarLanding(false);
    setCategoriaAtiva(null);
    setSearchParams({});
  };

  const carregarModelos = async () => {
    try {
      const { data, error } = await supabase
        .from('catalogo_modelos')
        .select('*')
        .order('nome_modelo');

      if (error) throw error;
      setModelos(data || []);
    } catch (error) {
      console.error('Erro ao carregar modelos:', error);
      toast.error('Erro ao carregar catálogo');
    } finally {
      setLoading(false);
    }
  };

  const modelosFiltrados = modelos.filter((modelo) => {
    const matchCategoria = !categoriaAtiva || modelo.categoria === categoriaAtiva;
    const matchBusca = !busca || 
      modelo.nome_modelo.toLowerCase().includes(busca.toLowerCase());
    return matchCategoria && matchBusca;
  });

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

  // Landing Page - Qualificação do Cliente
  if (mostrarLanding) {
    return (
      <div className="min-h-screen bg-zinc-900 overflow-x-hidden">
        {/* Header */}
        <header className="py-8 md:py-12">
          <div className="container mx-auto px-4 text-center">
            <h1 className="text-2xl md:text-4xl font-bold text-white mb-2 tracking-tight">
              CATÁLOGO DE LÂMINAS
            </h1>
            <p className="text-zinc-400 text-sm md:text-base">Escolha uma categoria</p>
          </div>
        </header>

        <div className="container mx-auto px-4 pb-12">
          {/* Grid de Categorias */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4 max-w-4xl mx-auto mb-8">
            {categoriasVenda.map((cat, idx) => {
              const Icon = cat.icon;
              return (
                <div
                  key={idx}
                  className="group cursor-pointer"
                  onClick={() => selecionarCategoria(cat.categoria)}
                >
                  <div className="bg-zinc-800 border border-zinc-700 hover:border-accent rounded-lg p-4 md:p-6 transition-all text-center">
                    <Icon className="h-8 w-8 md:h-10 md:w-10 mx-auto mb-2 md:mb-3 text-accent" />
                    <h3 className="text-white font-semibold text-sm md:text-base">
                      {cat.subtitulo}
                    </h3>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Opções de Ação */}
          <div className="flex flex-col sm:flex-row gap-3 justify-center items-center max-w-md mx-auto">
            <Button
              variant="outline"
              onClick={verTudo}
              className="w-full border-zinc-600 text-zinc-300 hover:bg-accent hover:text-white hover:border-accent"
            >
              Ver todo o catálogo
            </Button>
            
            <Button
              onClick={() => navigate('/customizar-lamina')}
              className="w-full bg-accent hover:bg-accent/90 text-white"
            >
              <Wrench className="h-4 w-4 mr-2" />
              Montar Lâmina
            </Button>
          </div>

          {/* WhatsApp */}
          <div className="text-center mt-8 pt-8 border-t border-zinc-800">
            <Button
              variant="ghost"
              onClick={() => {
                const url = `https://wa.me/5528999025695?text=${encodeURIComponent('Olá! Gostaria de saber mais sobre as lâminas.')}`;
                window.open(url, '_blank');
              }}
              className="text-zinc-400 hover:text-accent"
            >
              <MessageCircle className="h-4 w-4 mr-2" />
              Dúvidas? Fale conosco
            </Button>
          </div>
        </div>
      </div>
    );
  }

  // Catálogo de Produtos
  return (
    <div className="min-h-screen bg-zinc-900 overflow-x-hidden">
      {/* Header */}
      <header className="bg-black border-b border-white/10 sticky top-0 z-50">
        <div className="container mx-auto px-4 py-3 md:py-4">
          <div className="flex flex-col md:flex-row items-center justify-between gap-3 md:gap-4">
            <div className="flex items-center gap-2 md:gap-4 w-full md:w-auto">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  setMostrarLanding(true);
                  setCategoriaAtiva(null);
                  setBusca('');
                  setModelosSelecionados(new Set());
                }}
                className="text-white hover:bg-white/10 text-xs md:text-sm"
              >
                ← Voltar
              </Button>
              <h1 className="text-lg md:text-3xl font-bold text-white tracking-tight">CATÁLOGO</h1>
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

      <div className="container mx-auto px-4 py-4 md:py-6">
        <div className="flex flex-col lg:flex-row gap-4 md:gap-6">
          {/* Sidebar - Categorias */}
          <aside className="lg:w-64 shrink-0">
            <div className="bg-zinc-800 border border-zinc-700 rounded-lg p-3 md:p-4 sticky top-24 shadow-sm">
              <h3 className="font-semibold text-base md:text-lg mb-3 md:mb-4 text-white">Categorias</h3>
              <div className="space-y-1.5 md:space-y-2">
                <Button
                  variant={!categoriaAtiva ? "default" : "ghost"}
                  size="sm"
                  className={`w-full justify-start text-xs md:text-sm h-8 md:h-10 ${
                    !categoriaAtiva 
                      ? 'bg-accent text-white hover:bg-accent/90' 
                      : 'text-zinc-300 hover:bg-zinc-700'
                  }`}
                  onClick={() => setCategoriaAtiva(null)}
                >
                  Todas
                </Button>
                {categorias.map((cat) => (
                  <Button
                    key={cat}
                    variant={categoriaAtiva === cat ? "default" : "ghost"}
                    size="sm"
                    className={`w-full justify-start text-xs md:text-sm h-8 md:h-10 ${
                      categoriaAtiva === cat 
                        ? 'bg-accent text-white hover:bg-accent/90' 
                        : 'text-zinc-300 hover:bg-zinc-700'
                    }`}
                    onClick={() => setCategoriaAtiva(cat)}
                  >
                    {cat}
                  </Button>
                ))}
              </div>

              {/* Filtros adicionais - placeholder para expansão futura */}
              <div className="mt-4 md:mt-6 pt-4 md:pt-6 border-t border-zinc-700">
                <h4 className="font-medium text-xs md:text-sm mb-2 md:mb-3 text-zinc-400">Filtros</h4>
                <p className="text-xs text-zinc-500">Em breve mais opções</p>
              </div>
            </div>
          </aside>

          {/* Grid de Produtos */}
          <main className="flex-1">
            {loading ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {[...Array(6)].map((_, i) => (
                  <div key={i} className="bg-zinc-800 border border-zinc-700 rounded-lg p-4 animate-pulse">
                    <div className="aspect-square bg-zinc-700 rounded-lg mb-3" />
                    <div className="h-4 bg-zinc-700 rounded mb-2" />
                    <div className="h-6 bg-zinc-700 rounded w-1/2" />
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
                        
                        <div className="bg-zinc-800 border border-zinc-700 hover:border-accent hover:shadow-lg transition-all rounded-lg overflow-hidden">
                          <div className="relative">
                            {/* Imagem ou Vídeo */}
                            <div
                              className="aspect-[9/16] bg-zinc-700 overflow-hidden cursor-pointer"
                              onClick={() => navigate(`/catalogo/${modelo.id}`)}
                            >
                              {modelo.video_url ? (
                                <video
                                  src={modelo.video_url}
                                  className="w-full h-full object-cover"
                                  muted
                                  loop
                                  autoPlay
                                  playsInline
                                />
                              ) : modelo.imagem_modelo ? (
                                <img
                                  src={modelo.imagem_modelo}
                                  alt={modelo.nome_modelo}
                                  className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
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

                            {/* Badge de categoria */}
                            {modelo.categoria && (
                              <Badge className="absolute bottom-3 left-3 bg-accent text-white border-0">
                                {modelo.categoria}
                              </Badge>
                            )}
                          </div>

                          {/* Info do produto */}
                          <div className="p-2 md:p-4 h-[120px] md:h-[140px] flex flex-col">
                            <h3
                              className="font-semibold mb-1 md:mb-2 line-clamp-1 text-xs md:text-base text-white hover:text-accent transition-colors cursor-pointer"
                              onClick={() => navigate(`/catalogo/${modelo.id}`)}
                            >
                              {modelo.nome_modelo}
                            </h3>
                            <p className="text-lg md:text-2xl font-bold text-accent drop-shadow-[0_2px_10px_rgba(251,146,60,0.3)]">
                              R$ {modelo.preco_base.toFixed(2)}
                            </p>
                            <div className="text-[10px] md:text-xs text-zinc-400 mt-0.5 md:mt-1">
                              em 12x de R$ {(modelo.preco_base / 12).toFixed(2)}
                            </div>
                            <Button
                              variant="outline"
                              size="sm"
                              className="w-full mt-auto border-zinc-600 text-zinc-300 hover:bg-accent hover:text-white hover:border-accent text-[10px] md:text-sm h-7 md:h-9"
                              onClick={() => navigate(`/catalogo/${modelo.id}`)}
                            >
                              Ver detalhes
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
