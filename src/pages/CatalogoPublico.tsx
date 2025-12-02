import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Search, MessageCircle, Check, Sword, Shield, ChefHat, Trees, Wrench, Play } from 'lucide-react';
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
      <div className="min-h-screen bg-zinc-50 overflow-x-hidden">
        {/* Header */}
        <header className="bg-black border-b border-white/10 py-4 md:py-6">
          <div className="container mx-auto px-4 text-center">
            <h1 className="text-2xl md:text-5xl font-bold text-white mb-1 md:mb-2 tracking-tight">
              CATÁLOGO DE LÂMINAS
            </h1>
            <p className="text-white/60 text-xs md:text-base">Encontre a faca perfeita para você</p>
          </div>
        </header>

        <div className="container mx-auto px-4 py-8 md:py-20">
          {/* Pergunta Principal */}
          <div className="text-center mb-8 md:mb-12 max-w-3xl mx-auto">
            <h2 className="text-xl md:text-3xl font-bold text-zinc-900 mb-3 md:mb-4">
              Hoje nós produzimos facas específicas para algumas funções:
            </h2>
            <p className="text-base md:text-lg text-zinc-600 mb-6 md:mb-8">
              Qual tem mais interesse em conhecer primeiro?
            </p>
          </div>

          {/* Grid de Categorias */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6 max-w-6xl mx-auto mb-6 md:mb-8">
            {categoriasVenda.map((cat, idx) => {
              const Icon = cat.icon;
              return (
                <div
                  key={idx}
                  className="group cursor-pointer transition-all hover:scale-105 relative overflow-hidden rounded-lg"
                  onClick={() => selecionarCategoria(cat.categoria)}
                >
                  {/* Diagonal stripes background */}
                  <div className="absolute inset-0 bg-gradient-to-br from-accent/20 to-transparent">
                    <div className="absolute top-0 right-0 w-full h-2 bg-gradient-to-r from-transparent via-accent to-accent"></div>
                    <div className="absolute top-0 right-0 w-2 h-full bg-gradient-to-b from-accent to-transparent"></div>
                  </div>
                  
                  {/* Card content */}
                  <div className="relative bg-white border border-zinc-200 hover:border-accent hover:shadow-xl p-4 md:p-8 rounded-lg transition-all">
                    <div className="text-center">
                      <Icon className="h-12 w-12 md:h-16 md:w-16 mx-auto mb-3 md:mb-4 text-accent drop-shadow-[0_0_20px_rgba(251,146,60,0.5)]" />
                      <div className="mb-3 md:mb-4">
                        <p className="text-zinc-500 text-xs mb-0.5 md:mb-1 uppercase tracking-wider">LINHA</p>
                        <h3 className="text-accent font-bold text-xl md:text-2xl mb-0.5 md:mb-1 uppercase tracking-wide drop-shadow-[0_2px_10px_rgba(251,146,60,0.3)]">
                          {cat.subtitulo}
                        </h3>
                        <p className="text-zinc-900 text-xs md:text-sm font-medium">{cat.titulo}</p>
                      </div>
                      <p className="text-zinc-600 text-xs mb-3 md:mb-4">{cat.descricao}</p>
                      <div className="text-accent text-xs md:text-sm font-semibold group-hover:text-zinc-900 transition-colors">
                        Ver modelos →
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Opções de Ação */}
          <div className="flex flex-col sm:flex-row gap-3 md:gap-4 justify-center items-center">
            <Button
              variant="outline"
              size="lg"
              onClick={verTudo}
              className="w-full sm:w-auto sm:min-w-[200px] border-accent text-accent hover:bg-accent hover:text-white font-semibold text-sm md:text-base"
            >
              Ver todo o catálogo
            </Button>
            
            <Button
              size="lg"
              onClick={() => navigate('/customizar-lamina')}
              className="w-full sm:w-auto sm:min-w-[200px] bg-accent hover:bg-accent/90 text-white font-semibold text-sm md:text-base"
            >
              <Wrench className="h-4 w-4 md:h-5 md:w-5 mr-2" />
              Montar Minha Própria Lâmina
            </Button>
          </div>

          {/* WhatsApp de Dúvidas */}
          <div className="text-center mt-8 md:mt-12 pt-8 md:pt-12 border-t border-zinc-200">
            <p className="text-zinc-600 mb-3 md:mb-4 text-sm md:text-base">
              Ficou com alguma dúvida? Fale conosco!
            </p>
            <Button
              onClick={() => {
                const url = `https://wa.me/5528999025695?text=${encodeURIComponent('Olá! Estou com dúvidas sobre qual categoria escolher.')}`;
                window.open(url, '_blank');
              }}
              className="bg-accent hover:bg-accent/90 text-white font-semibold text-sm md:text-base w-full sm:w-auto"
            >
              <MessageCircle className="h-4 w-4 md:h-5 md:w-5 mr-2" />
              Falar no WhatsApp
            </Button>
          </div>
        </div>
      </div>
    );
  }

  // Catálogo de Produtos
  return (
    <div className="min-h-screen bg-zinc-50 overflow-x-hidden">
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
            <div className="bg-white border border-zinc-200 rounded-lg p-3 md:p-4 sticky top-24 shadow-sm">
              <h3 className="font-semibold text-base md:text-lg mb-3 md:mb-4 text-zinc-900">Categorias</h3>
              <div className="space-y-1.5 md:space-y-2">
                <Button
                  variant={!categoriaAtiva ? "default" : "ghost"}
                  size="sm"
                  className={`w-full justify-start text-xs md:text-sm h-8 md:h-10 ${
                    !categoriaAtiva 
                      ? 'bg-accent text-white hover:bg-accent/90' 
                      : 'text-zinc-700 hover:bg-zinc-100'
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
                        : 'text-zinc-700 hover:bg-zinc-100'
                    }`}
                    onClick={() => setCategoriaAtiva(cat)}
                  >
                    {cat}
                  </Button>
                ))}
              </div>

              {/* Filtros adicionais - placeholder para expansão futura */}
              <div className="mt-4 md:mt-6 pt-4 md:pt-6 border-t border-zinc-200">
                <h4 className="font-medium text-xs md:text-sm mb-2 md:mb-3 text-zinc-500">Filtros</h4>
                <p className="text-xs text-zinc-400">Em breve mais opções</p>
              </div>
            </div>
          </aside>

          {/* Grid de Produtos */}
          <main className="flex-1">
            {loading ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {[...Array(6)].map((_, i) => (
                  <div key={i} className="bg-white border border-zinc-200 rounded-lg p-4 animate-pulse">
                    <div className="aspect-square bg-zinc-100 rounded-lg mb-3" />
                    <div className="h-4 bg-zinc-100 rounded mb-2" />
                    <div className="h-6 bg-zinc-100 rounded w-1/2" />
                  </div>
                ))}
              </div>
            ) : (
              <>
                <div className="flex items-center justify-between mb-4">
                  <p className="text-sm text-zinc-600">
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
                        
                        <div className="bg-white border border-zinc-200 hover:border-accent hover:shadow-lg transition-all rounded-lg overflow-hidden">
                          <div className="relative">
                            {/* Imagem ou Vídeo */}
                            <div
                              className="aspect-square bg-zinc-100 overflow-hidden cursor-pointer"
                              onClick={() => navigate(`/catalogo/${modelo.id}`)}
                            >
                              {modelo.video_url ? (
                                <div className="relative w-full h-full">
                                  <video
                                    src={modelo.video_url}
                                    className="w-full h-full object-cover"
                                    muted
                                    loop
                                    playsInline
                                    onMouseEnter={(e) => e.currentTarget.play()}
                                    onMouseLeave={(e) => {
                                      e.currentTarget.pause();
                                      e.currentTarget.currentTime = 0;
                                    }}
                                  />
                                  <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                                    <div className="w-12 h-12 rounded-full bg-black/60 flex items-center justify-center group-hover:opacity-0 transition-opacity">
                                      <Play className="h-6 w-6 text-white ml-1" />
                                    </div>
                                  </div>
                                </div>
                              ) : modelo.imagem_modelo ? (
                                <img
                                  src={modelo.imagem_modelo}
                                  alt={modelo.nome_modelo}
                                  className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
                                />
                              ) : (
                                <div className="w-full h-full flex items-center justify-center text-zinc-400">
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
                          <div className="p-2 md:p-4">
                            <h3
                              className="font-semibold mb-1 md:mb-2 line-clamp-2 text-xs md:text-base text-zinc-900 hover:text-accent transition-colors cursor-pointer"
                              onClick={() => navigate(`/catalogo/${modelo.id}`)}
                            >
                              {modelo.nome_modelo}
                            </h3>
                            <p className="text-lg md:text-2xl font-bold text-accent drop-shadow-[0_2px_10px_rgba(251,146,60,0.3)]">
                              R$ {modelo.preco_base.toFixed(2)}
                            </p>
                            <div className="text-[10px] md:text-xs text-zinc-500 mt-0.5 md:mt-1">
                              em 12x de R$ {(modelo.preco_base / 12).toFixed(2)}
                            </div>
                            <Button
                              variant="outline"
                              size="sm"
                              className="w-full mt-2 md:mt-3 border-zinc-300 text-zinc-700 hover:bg-accent hover:text-white hover:border-accent text-[10px] md:text-sm h-7 md:h-9"
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
                    <p className="text-zinc-600">Nenhuma lâmina encontrada</p>
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
