import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Search, MessageCircle, Check } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
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
  const [modelos, setModelos] = useState<Modelo[]>([]);
  const [categoriaAtiva, setCategoriaAtiva] = useState<string | null>(null);
  const [busca, setBusca] = useState('');
  const [modelosSelecionados, setModelosSelecionados] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);

  const categorias = ['EDC', 'Campo', 'Cozinha', 'KZR', 'Upsell'];

  useEffect(() => {
    carregarModelos();
  }, []);

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

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="bg-[#262626] text-white sticky top-0 z-50 shadow-lg">
        <div className="container mx-auto px-4 py-4">
          <div className="flex flex-col md:flex-row items-center justify-between gap-4">
            <h1 className="text-2xl md:text-3xl font-bold">Catálogo de Lâminas</h1>
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
