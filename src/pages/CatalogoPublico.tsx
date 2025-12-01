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
      titulo: 'Facas Utilitárias (EDC)',
      descricao: 'Para portar no dia-a-dia',
      categoria: 'EDC',
      icon: Sword,
      cor: 'from-orange-500 to-red-500'
    },
    {
      titulo: 'Facas Táticas e Defesa',
      descricao: 'Resistência e performance',
      categoria: 'Campo',
      icon: Shield,
      cor: 'from-slate-600 to-slate-800'
    },
    {
      titulo: 'Facas de Churrasco',
      descricao: 'Precisão no corte',
      categoria: 'Cozinha',
      icon: ChefHat,
      cor: 'from-amber-600 to-orange-700'
    },
    {
      titulo: 'Facas de Campo/Caça',
      descricao: 'Durabilidade extrema',
      categoria: 'Campo',
      icon: Trees,
      cor: 'from-green-700 to-emerald-900'
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
      <div className="min-h-screen bg-background">
        {/* Header */}
        <header className="bg-[#262626] text-white py-6">
          <div className="container mx-auto px-4 text-center">
            <h1 className="text-3xl md:text-4xl font-bold mb-2">Catálogo de Lâminas</h1>
            <p className="text-white/80">Encontre a faca perfeita para você</p>
          </div>
        </header>

        <div className="container mx-auto px-4 py-12 md:py-20">
          {/* Pergunta Principal */}
          <div className="text-center mb-12 max-w-3xl mx-auto">
            <h2 className="text-2xl md:text-3xl font-bold mb-4">
              Hoje nós produzimos facas específicas para algumas funções:
            </h2>
            <p className="text-lg text-muted-foreground mb-8">
              Qual tem mais interesse em conhecer primeiro?
            </p>
          </div>

          {/* Grid de Categorias */}
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6 max-w-6xl mx-auto mb-8">
            {categoriasVenda.map((cat, idx) => {
              const Icon = cat.icon;
              return (
                <Card
                  key={idx}
                  className="group cursor-pointer transition-all hover:shadow-2xl hover:scale-105 overflow-hidden"
                  onClick={() => selecionarCategoria(cat.categoria)}
                >
                  <div className={`bg-gradient-to-br ${cat.cor} p-8 text-white`}>
                    <Icon className="h-12 w-12 mb-4 mx-auto" />
                  </div>
                  <div className="p-6 text-center">
                    <h3 className="font-bold text-lg mb-2">{cat.titulo}</h3>
                    <p className="text-sm text-muted-foreground mb-4">{cat.descricao}</p>
                    <Button variant="ghost" size="sm" className="w-full">
                      Ver modelos
                    </Button>
                  </div>
                </Card>
              );
            })}
          </div>

          {/* Opção Ver Tudo */}
          <div className="text-center">
            <Button
              variant="outline"
              size="lg"
              onClick={verTudo}
              className="min-w-[200px]"
            >
              Ver todo o catálogo
            </Button>
          </div>

          {/* WhatsApp de Dúvidas */}
          <div className="text-center mt-12 pt-12 border-t">
            <p className="text-muted-foreground mb-4">
              Ficou com alguma dúvida? Fale conosco!
            </p>
            <Button
              variant="outline"
              onClick={() => {
                const url = `https://wa.me/5528999025695?text=${encodeURIComponent('Olá! Estou com dúvidas sobre qual categoria escolher.')}`;
                window.open(url, '_blank');
              }}
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
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="bg-[#262626] text-white sticky top-0 z-50 shadow-lg">
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
              <h1 className="text-2xl md:text-3xl font-bold">Catálogo de Lâminas</h1>
            </div>
            <div className="flex gap-2 w-full md:w-auto">
              <div className="relative flex-1 md:w-80">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Buscar lâminas..."
                  value={busca}
                  onChange={(e) => setBusca(e.target.value)}
                  className="pl-10 bg-background/10 border-white/20 text-white placeholder:text-white/60"
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
            <Card className="p-4 sticky top-24">
              <h3 className="font-semibold text-lg mb-4">Categorias</h3>
              <div className="space-y-2">
                <Button
                  variant={!categoriaAtiva ? "default" : "ghost"}
                  className="w-full justify-start"
                  onClick={() => setCategoriaAtiva(null)}
                >
                  Todas
                </Button>
                {categorias.map((cat) => (
                  <Button
                    key={cat}
                    variant={categoriaAtiva === cat ? "default" : "ghost"}
                    className="w-full justify-start"
                    onClick={() => setCategoriaAtiva(cat)}
                  >
                    {cat}
                  </Button>
                ))}
              </div>

              {/* Filtros adicionais - placeholder para expansão futura */}
              <div className="mt-6 pt-6 border-t">
                <h4 className="font-medium text-sm mb-3 text-muted-foreground">Filtros</h4>
                <p className="text-xs text-muted-foreground">Em breve mais opções</p>
              </div>
            </Card>
          </aside>

          {/* Grid de Produtos */}
          <main className="flex-1">
            {loading ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {[...Array(6)].map((_, i) => (
                  <Card key={i} className="p-4 animate-pulse">
                    <div className="aspect-square bg-muted rounded-lg mb-3" />
                    <div className="h-4 bg-muted rounded mb-2" />
                    <div className="h-6 bg-muted rounded w-1/2" />
                  </Card>
                ))}
              </div>
            ) : (
              <>
                <div className="flex items-center justify-between mb-4">
                  <p className="text-sm text-muted-foreground">
                    Mostrando {modelosFiltrados.length} {modelosFiltrados.length === 1 ? 'produto' : 'produtos'}
                  </p>
                  {modelosSelecionados.size > 0 && (
                    <Badge variant="secondary" className="text-sm">
                      {modelosSelecionados.size} selecionada(s)
                    </Badge>
                  )}
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  {modelosFiltrados.map((modelo) => {
                    const selecionado = modelosSelecionados.has(modelo.id);
                    return (
                      <Card
                        key={modelo.id}
                        className={`group cursor-pointer transition-all hover:shadow-lg ${
                          selecionado ? 'ring-2 ring-accent' : ''
                        }`}
                      >
                        <div className="relative">
                          {/* Imagem */}
                          <div
                            className="aspect-square bg-muted rounded-t-lg overflow-hidden"
                            onClick={() => navigate(`/catalogo/${modelo.id}`)}
                          >
                            {modelo.imagem_modelo ? (
                              <img
                                src={modelo.imagem_modelo}
                                alt={modelo.nome_modelo}
                                className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                              />
                            ) : (
                              <div className="w-full h-full flex items-center justify-center text-muted-foreground">
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
                            className={`absolute top-3 right-3 w-8 h-8 rounded-full flex items-center justify-center transition-all ${
                              selecionado
                                ? 'bg-accent text-accent-foreground'
                                : 'bg-background/80 hover:bg-background border border-border'
                            }`}
                          >
                            {selecionado && <Check className="h-4 w-4" />}
                          </button>

                          {/* Badge de categoria */}
                          {modelo.categoria && (
                            <Badge className="absolute bottom-3 left-3">
                              {modelo.categoria}
                            </Badge>
                          )}
                        </div>

                        {/* Info do produto */}
                        <div className="p-4">
                          <h3
                            className="font-semibold mb-2 line-clamp-2 hover:text-accent transition-colors"
                            onClick={() => navigate(`/catalogo/${modelo.id}`)}
                          >
                            {modelo.nome_modelo}
                          </h3>
                          <p className="text-2xl font-bold text-accent">
                            R$ {modelo.preco_base.toFixed(2)}
                          </p>
                          <div className="text-xs text-muted-foreground mt-1">
                            em 12x de R$ {(modelo.preco_base / 12).toFixed(2)}
                          </div>
                          <Button
                            variant="outline"
                            size="sm"
                            className="w-full mt-3"
                            onClick={() => navigate(`/catalogo/${modelo.id}`)}
                          >
                            Ver detalhes
                          </Button>
                        </div>
                      </Card>
                    );
                  })}
                </div>

                {modelosFiltrados.length === 0 && (
                  <div className="text-center py-12">
                    <p className="text-muted-foreground">Nenhuma lâmina encontrada</p>
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
            className="rounded-full shadow-2xl hover:scale-105 transition-transform"
          >
            <MessageCircle className="h-5 w-5 mr-2" />
            Consultar no WhatsApp ({modelosSelecionados.size})
          </Button>
        </div>
      )}
    </div>
  );
}
