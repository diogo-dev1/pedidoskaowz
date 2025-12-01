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
        <header className="bg-black border-b border-white/10 py-6">
          <div className="container mx-auto px-4 text-center">
            <h1 className="text-3xl md:text-5xl font-bold text-white mb-2 tracking-tight">
              CATÁLOGO DE LÂMINAS
            </h1>
            <p className="text-white/60 text-sm md:text-base">Encontre a faca perfeita para você</p>
          </div>
        </header>

        <div className="container mx-auto px-4 py-12 md:py-20">
          {/* Pergunta Principal */}
          <div className="text-center mb-12 max-w-3xl mx-auto">
            <h2 className="text-2xl md:text-3xl font-bold text-white mb-4">
              Hoje nós produzimos facas específicas para algumas funções:
            </h2>
            <p className="text-lg text-white/70 mb-8">
              Qual tem mais interesse em conhecer primeiro?
            </p>
          </div>

          {/* Grid de Categorias */}
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6 max-w-6xl mx-auto mb-12">
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
                  <div className="relative bg-gradient-to-br from-zinc-900 to-black border border-white/10 p-8 rounded-lg transition-all group-hover:border-accent/50">
                    <div className="text-center">
                      <Icon className="h-16 w-16 mx-auto mb-4 text-accent drop-shadow-[0_0_20px_rgba(251,146,60,0.5)]" />
                      <div className="mb-4">
                        <p className="text-white/60 text-sm mb-1 uppercase tracking-wider">LINHA</p>
                        <h3 className="text-accent font-bold text-2xl mb-1 uppercase tracking-wide drop-shadow-[0_2px_10px_rgba(251,146,60,0.3)]">
                          {cat.subtitulo}
                        </h3>
                        <p className="text-white text-sm">{cat.titulo}</p>
                      </div>
                      <p className="text-white/50 text-xs mb-4">{cat.descricao}</p>
                      <div className="text-accent text-sm font-semibold group-hover:text-white transition-colors">
                        Ver modelos →
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Opção Ver Tudo */}
          <div className="text-center mb-12">
            <Button
              variant="outline"
              size="lg"
              onClick={verTudo}
              className="min-w-[200px] border-accent text-accent hover:bg-accent hover:text-black font-semibold"
            >
              Ver todo o catálogo
            </Button>
          </div>

          {/* WhatsApp de Dúvidas */}
          <div className="text-center pt-12 border-t border-white/10">
            <p className="text-white/60 mb-4">
              Ficou com alguma dúvida? Fale conosco!
            </p>
            <Button
              onClick={() => {
                const url = `https://wa.me/5528999025695?text=${encodeURIComponent('Olá! Estou com dúvidas sobre qual categoria escolher.')}`;
                window.open(url, '_blank');
              }}
              className="bg-accent hover:bg-accent/90 text-black font-semibold"
            >
              <MessageCircle className="h-5 w-5 mr-2" />
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
      <header className="bg-black border-b border-white/10 sticky top-0 z-50">
        <div className="container mx-auto px-4 py-4">
          <div className="flex flex-col md:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setMostrarLanding(true)}
                className="text-white hover:bg-white/10"
              >
                ← Voltar
              </Button>
              <h1 className="text-2xl md:text-3xl font-bold text-white tracking-tight">CATÁLOGO DE LÂMINAS</h1>
            </div>
            <div className="flex gap-2 w-full md:w-auto">
              <div className="relative flex-1 md:w-80">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-white/40" />
                <Input
                  placeholder="Buscar lâminas..."
                  value={busca}
                  onChange={(e) => setBusca(e.target.value)}
                  className="pl-10 bg-white/5 border-white/20 text-white placeholder:text-white/40 focus:border-accent"
                />
              </div>
            </div>
          </div>
        </div>
      </header>

      <div className="container mx-auto px-4 py-6">
        <div className="flex flex-col lg:flex-row gap-6">
          {/* Sidebar - Categorias */}
          <aside className="lg:w-64 shrink-0">
            <div className="bg-zinc-900 border border-white/10 rounded-lg p-4 sticky top-24">
              <h3 className="font-semibold text-lg mb-4 text-white">Categorias</h3>
              <div className="space-y-2">
                <Button
                  variant={!categoriaAtiva ? "default" : "ghost"}
                  className={`w-full justify-start ${
                    !categoriaAtiva 
                      ? 'bg-accent text-black hover:bg-accent/90' 
                      : 'text-white hover:bg-white/10'
                  }`}
                  onClick={() => setCategoriaAtiva(null)}
                >
                  Todas
                </Button>
                {categorias.map((cat) => (
                  <Button
                    key={cat}
                    variant={categoriaAtiva === cat ? "default" : "ghost"}
                    className={`w-full justify-start ${
                      categoriaAtiva === cat 
                        ? 'bg-accent text-black hover:bg-accent/90' 
                        : 'text-white hover:bg-white/10'
                    }`}
                    onClick={() => setCategoriaAtiva(cat)}
                  >
                    {cat}
                  </Button>
                ))}
              </div>

              {/* Filtros adicionais - placeholder para expansão futura */}
              <div className="mt-6 pt-6 border-t border-white/10">
                <h4 className="font-medium text-sm mb-3 text-white/60">Filtros</h4>
                <p className="text-xs text-white/40">Em breve mais opções</p>
              </div>
            </div>
          </aside>

          {/* Grid de Produtos */}
          <main className="flex-1">
            {loading ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {[...Array(6)].map((_, i) => (
                  <div key={i} className="bg-zinc-900 border border-white/10 rounded-lg p-4 animate-pulse">
                    <div className="aspect-square bg-white/5 rounded-lg mb-3" />
                    <div className="h-4 bg-white/5 rounded mb-2" />
                    <div className="h-6 bg-white/5 rounded w-1/2" />
                  </div>
                ))}
              </div>
            ) : (
              <>
                <div className="flex items-center justify-between mb-4">
                  <p className="text-sm text-white/60">
                    Mostrando {modelosFiltrados.length} {modelosFiltrados.length === 1 ? 'produto' : 'produtos'}
                  </p>
                  {modelosSelecionados.size > 0 && (
                    <Badge className="bg-accent text-black">
                      {modelosSelecionados.size} selecionada(s)
                    </Badge>
                  )}
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
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
                        
                        <div className="bg-zinc-900 border border-white/10 hover:border-accent/50 transition-all rounded-lg overflow-hidden">
                          <div className="relative">
                            {/* Imagem */}
                            <div
                              className="aspect-square bg-black overflow-hidden cursor-pointer"
                              onClick={() => navigate(`/catalogo/${modelo.id}`)}
                            >
                              {modelo.imagem_modelo ? (
                                <img
                                  src={modelo.imagem_modelo}
                                  alt={modelo.nome_modelo}
                                  className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
                                />
                              ) : (
                                <div className="w-full h-full flex items-center justify-center text-white/30">
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
                                  ? 'bg-accent text-black shadow-[0_0_20px_rgba(251,146,60,0.5)]'
                                  : 'bg-black/60 hover:bg-black border border-white/20'
                              }`}
                            >
                              {selecionado && <Check className="h-4 w-4" />}
                            </button>

                            {/* Badge de categoria */}
                            {modelo.categoria && (
                              <Badge className="absolute bottom-3 left-3 bg-accent text-black border-0">
                                {modelo.categoria}
                              </Badge>
                            )}
                          </div>

                          {/* Info do produto */}
                          <div className="p-4">
                            <h3
                              className="font-semibold mb-2 line-clamp-2 text-white hover:text-accent transition-colors cursor-pointer"
                              onClick={() => navigate(`/catalogo/${modelo.id}`)}
                            >
                              {modelo.nome_modelo}
                            </h3>
                            <p className="text-2xl font-bold text-accent drop-shadow-[0_2px_10px_rgba(251,146,60,0.3)]">
                              R$ {modelo.preco_base.toFixed(2)}
                            </p>
                            <div className="text-xs text-white/40 mt-1">
                              em 12x de R$ {(modelo.preco_base / 12).toFixed(2)}
                            </div>
                            <Button
                              variant="outline"
                              size="sm"
                              className="w-full mt-3 border-white/20 text-white hover:bg-accent hover:text-black hover:border-accent"
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
                    <p className="text-white/60">Nenhuma lâmina encontrada</p>
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
            className="rounded-full bg-accent hover:bg-accent/90 text-black font-semibold shadow-[0_0_40px_rgba(251,146,60,0.5)] hover:scale-105 transition-all"
          >
            <MessageCircle className="h-5 w-5 mr-2" />
            Consultar no WhatsApp ({modelosSelecionados.size})
          </Button>
        </div>
      )}
    </div>
  );
}
