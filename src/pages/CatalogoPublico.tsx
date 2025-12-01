import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Search, MessageCircle, Check, Sword, Shield, ChefHat, Trees } from 'lucide-react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { toast } from 'sonner';

interface Modelo {
  id: string;
  nome_modelo: string;
  preco_base: number;
  imagem_modelo: string | null;
  categoria: string | null;
  apresentacao_venda: string | null;
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

  const categorias = ['EDC', 'Campo', 'Cozinha', 'KZR', 'Upsell'];

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
      <div className="min-h-screen bg-black">
        {/* Header */}
        <header className="bg-black py-8">
          <div className="container mx-auto px-4 text-center">
            <h1 className="text-4xl md:text-6xl font-bold text-white mb-3 tracking-tight uppercase">
              Catálogo <span className="text-accent">Kaowz</span>
            </h1>
            <p className="text-white/50 text-sm md:text-base uppercase tracking-widest">Ferramentas de Corte</p>
          </div>
        </header>

        <div className="container mx-auto px-4 py-16 md:py-24">
          {/* Pergunta Principal */}
          <div className="text-center mb-16 max-w-4xl mx-auto">
            <h2 className="text-3xl md:text-5xl font-bold text-white mb-6 leading-tight">
              Hoje nós produzimos <span className="text-accent">facas específicas</span> para algumas funções:
            </h2>
            <p className="text-xl text-white/70 mb-8">
              Qual tem mais interesse em conhecer primeiro?
            </p>
          </div>

          {/* Grid de Categorias */}
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-8 max-w-7xl mx-auto mb-20">
            {categoriasVenda.map((cat, idx) => {
              const Icon = cat.icon;
              return (
                <div
                  key={idx}
                  className="group cursor-pointer transition-all hover:-translate-y-2 duration-300"
                  onClick={() => selecionarCategoria(cat.categoria)}
                >
                  <div className="relative bg-zinc-900/50 backdrop-blur border border-white/10 hover:border-accent/50 rounded-2xl p-8 transition-all overflow-hidden">
                    {/* Top accent line */}
                    <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-transparent via-accent to-transparent opacity-0 group-hover:opacity-100 transition-opacity"></div>
                    
                    <div className="text-center">
                      <div className="mb-6">
                        <Icon className="h-20 w-20 mx-auto text-white/80 group-hover:text-accent transition-colors drop-shadow-[0_0_30px_rgba(253,181,40,0.3)]" />
                      </div>
                      <div className="mb-2">
                        <p className="text-white/40 text-xs mb-2 uppercase tracking-[0.2em]">LINHA</p>
                        <h3 className="text-accent font-black text-3xl mb-2 uppercase tracking-tight">
                          {cat.subtitulo}
                        </h3>
                        <p className="text-white/90 text-sm font-medium mb-3">{cat.titulo}</p>
                      </div>
                      <p className="text-white/50 text-xs mb-6 min-h-[2.5rem]">{cat.descricao}</p>
                      <div className="inline-flex items-center gap-2 text-accent text-sm font-bold uppercase tracking-wide group-hover:gap-3 transition-all">
                        <span>Explorar</span>
                        <span className="text-xl">→</span>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Opção Ver Tudo */}
          <div className="text-center mb-20">
            <Button
              size="lg"
              onClick={verTudo}
              className="bg-transparent border-2 border-accent text-accent hover:bg-accent hover:text-black font-bold text-lg px-12 py-6 rounded-full uppercase tracking-wide transition-all hover:scale-105 hover:shadow-[0_0_40px_rgba(253,181,40,0.4)]"
            >
              Ver Todo o Catálogo
            </Button>
          </div>

          {/* WhatsApp de Dúvidas */}
          <div className="text-center pt-16 border-t border-white/10">
            <p className="text-white/60 mb-6 text-lg">
              Ficou com alguma dúvida? Fale conosco!
            </p>
            <Button
              onClick={() => {
                const url = `https://wa.me/5528999025695?text=${encodeURIComponent('Olá! Estou com dúvidas sobre qual categoria escolher.')}`;
                window.open(url, '_blank');
              }}
              className="bg-accent hover:bg-accent/90 text-black font-bold text-lg px-10 py-6 rounded-full uppercase tracking-wide shadow-[0_0_30px_rgba(253,181,40,0.3)] hover:shadow-[0_0_50px_rgba(253,181,40,0.5)] transition-all hover:scale-105"
            >
              <MessageCircle className="h-5 w-5 mr-3" />
              Falar no WhatsApp
            </Button>
          </div>
        </div>
      </div>
    );
  }

  // Catálogo de Produtos
  return (
    <div className="min-h-screen bg-black">
      {/* Header */}
      <header className="bg-black border-b border-white/10 sticky top-0 z-50 backdrop-blur-sm bg-black/80">
        <div className="container mx-auto px-4 py-5">
          <div className="flex flex-col md:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setMostrarLanding(true)}
                className="text-white hover:bg-white/10 hover:text-accent transition-colors"
              >
                ← Voltar
              </Button>
              <h1 className="text-2xl md:text-4xl font-bold text-white tracking-tight uppercase">
                Catálogo <span className="text-accent">Kaowz</span>
              </h1>
            </div>
            <div className="flex gap-2 w-full md:w-auto">
              <div className="relative flex-1 md:w-96">
                <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 h-5 w-5 text-white/40" />
                <Input
                  placeholder="Buscar lâminas..."
                  value={busca}
                  onChange={(e) => setBusca(e.target.value)}
                  className="pl-12 bg-white/5 border-white/20 text-white placeholder:text-white/40 focus:border-accent h-12 rounded-full"
                />
              </div>
            </div>
          </div>
        </div>
      </header>

      <div className="container mx-auto px-4 py-8">
        <div className="flex flex-col lg:flex-row gap-8">
          {/* Sidebar - Categorias */}
          <aside className="lg:w-72 shrink-0">
            <div className="bg-zinc-900/50 backdrop-blur border border-white/10 rounded-2xl p-6 sticky top-28">
              <h3 className="font-bold text-xl mb-6 text-white uppercase tracking-wide">Categorias</h3>
              <div className="space-y-3">
                <Button
                  variant={!categoriaAtiva ? "default" : "ghost"}
                  className={`w-full justify-start text-base font-medium rounded-xl transition-all ${
                    !categoriaAtiva 
                      ? 'bg-accent text-black hover:bg-accent/90 shadow-[0_0_20px_rgba(253,181,40,0.3)]' 
                      : 'text-white hover:bg-white/10 hover:text-accent'
                  }`}
                  onClick={() => setCategoriaAtiva(null)}
                >
                  Todas
                </Button>
                {categorias.map((cat) => (
                  <Button
                    key={cat}
                    variant={categoriaAtiva === cat ? "default" : "ghost"}
                    className={`w-full justify-start text-base font-medium rounded-xl transition-all ${
                      categoriaAtiva === cat 
                        ? 'bg-accent text-black hover:bg-accent/90 shadow-[0_0_20px_rgba(253,181,40,0.3)]' 
                        : 'text-white hover:bg-white/10 hover:text-accent'
                    }`}
                    onClick={() => setCategoriaAtiva(cat)}
                  >
                    {cat}
                  </Button>
                ))}
              </div>

              {/* Filtros adicionais - placeholder para expansão futura */}
              <div className="mt-8 pt-6 border-t border-white/10">
                <h4 className="font-medium text-sm mb-3 text-white/50 uppercase tracking-wider">Filtros</h4>
                <p className="text-xs text-white/30">Em breve mais opções</p>
              </div>
            </div>
          </aside>

          {/* Grid de Produtos */}
          <main className="flex-1">
            {loading ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                {[...Array(6)].map((_, i) => (
                  <div key={i} className="bg-zinc-900/50 border border-white/10 rounded-2xl p-4 animate-pulse">
                    <div className="aspect-square bg-white/5 rounded-xl mb-3" />
                    <div className="h-4 bg-white/5 rounded mb-2" />
                    <div className="h-6 bg-white/5 rounded w-1/2" />
                  </div>
                ))}
              </div>
            ) : (
              <>
                <div className="flex items-center justify-between mb-6">
                  <p className="text-sm text-white/50 uppercase tracking-wider">
                    {modelosFiltrados.length} {modelosFiltrados.length === 1 ? 'Produto' : 'Produtos'}
                  </p>
                  {modelosSelecionados.size > 0 && (
                    <Badge className="bg-accent text-black font-bold px-4 py-1.5 text-sm rounded-full shadow-[0_0_20px_rgba(253,181,40,0.3)]">
                      {modelosSelecionados.size} Selecionada{modelosSelecionados.size > 1 ? 's' : ''}
                    </Badge>
                  )}
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                  {modelosFiltrados.map((modelo) => {
                    const selecionado = modelosSelecionados.has(modelo.id);
                    return (
                      <div
                        key={modelo.id}
                        className={`group relative overflow-hidden rounded-2xl transition-all hover:-translate-y-1 duration-300 ${
                          selecionado ? 'ring-2 ring-accent shadow-[0_0_30px_rgba(253,181,40,0.3)]' : ''
                        }`}
                      >
                        <div className="bg-zinc-900/50 backdrop-blur border border-white/10 hover:border-accent/50 transition-all rounded-2xl overflow-hidden">
                          <div className="relative">
                            {/* Top accent line */}
                            <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-transparent via-accent to-transparent opacity-0 group-hover:opacity-100 transition-opacity z-10"></div>
                            
                            {/* Imagem */}
                            <div
                              className="aspect-square bg-black overflow-hidden cursor-pointer"
                              onClick={() => navigate(`/catalogo/${modelo.id}`)}
                            >
                              {modelo.imagem_modelo ? (
                                <img
                                  src={modelo.imagem_modelo}
                                  alt={modelo.nome_modelo}
                                  className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700"
                                />
                              ) : (
                                <div className="w-full h-full flex items-center justify-center text-white/20">
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
                              className={`absolute top-4 right-4 w-10 h-10 rounded-full flex items-center justify-center transition-all z-20 ${
                                selecionado
                                  ? 'bg-accent text-black shadow-[0_0_30px_rgba(253,181,40,0.6)] scale-110'
                                  : 'bg-black/70 hover:bg-black text-white border-2 border-white/30 hover:border-accent'
                              }`}
                            >
                              {selecionado && <Check className="h-5 w-5 font-bold" />}
                            </button>

                            {/* Badge de categoria */}
                            {modelo.categoria && (
                              <Badge className="absolute bottom-4 left-4 bg-accent/90 text-black border-0 font-bold uppercase text-xs px-3 py-1 rounded-full">
                                {modelo.categoria}
                              </Badge>
                            )}
                          </div>

                          {/* Info do produto */}
                          <div className="p-5">
                            <h3
                              className="font-bold mb-3 line-clamp-2 text-white hover:text-accent transition-colors cursor-pointer text-lg leading-tight"
                              onClick={() => navigate(`/catalogo/${modelo.id}`)}
                            >
                              {modelo.nome_modelo}
                            </h3>
                            <p className="text-3xl font-black text-accent mb-1">
                              R$ {modelo.preco_base.toFixed(2)}
                            </p>
                            <div className="text-xs text-white/40 mb-4 uppercase tracking-wider">
                              12x de R$ {(modelo.preco_base / 12).toFixed(2)}
                            </div>
                            <Button
                              size="sm"
                              className="w-full bg-transparent border-2 border-accent text-accent hover:bg-accent hover:text-black font-bold uppercase tracking-wide rounded-full transition-all hover:shadow-[0_0_20px_rgba(253,181,40,0.4)]"
                              onClick={() => navigate(`/catalogo/${modelo.id}`)}
                            >
                              Ver Detalhes
                            </Button>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>

                {modelosFiltrados.length === 0 && (
                  <div className="text-center py-20">
                    <p className="text-white/50 text-lg">Nenhuma lâmina encontrada</p>
                  </div>
                )}
              </>
            )}
          </main>
        </div>
      </div>

      {/* Botão WhatsApp Flutuante */}
      {modelosSelecionados.size > 0 && (
        <div className="fixed bottom-8 right-8 z-50 animate-scale-in">
          <Button
            size="lg"
            onClick={enviarWhatsApp}
            className="rounded-full bg-accent hover:bg-accent text-black font-black text-lg px-8 py-7 shadow-[0_0_50px_rgba(253,181,40,0.6)] hover:shadow-[0_0_70px_rgba(253,181,40,0.8)] hover:scale-110 transition-all uppercase tracking-wide"
          >
            <MessageCircle className="h-6 w-6 mr-3" />
            WhatsApp ({modelosSelecionados.size})
          </Button>
        </div>
      )}
    </div>
  );
}
