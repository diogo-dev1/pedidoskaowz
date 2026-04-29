import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Search, MessageCircle, X, Package, Plus, Minus, ArrowLeft, Check, Filter } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { ScrollArea } from '@/components/ui/scroll-area';
import { getIconComponent } from '@/lib/icon-utils';

interface Modelo {
  id: string;
  nome_modelo: string;
  preco_base: number;
  imagem_modelo: string | null;
  categorias: string[];
  aspect_ratio: string;
  pronta_entrega: boolean;
}

interface Categoria {
  categoria: string;
  icone: string;
}

interface ItemKit {
  modelo: Modelo;
  quantidade: number;
}

export default function MontarKit({ isRevendedor = false, isInternacional = false }: { isRevendedor?: boolean; isInternacional?: boolean }) {
  const navigate = useNavigate();
  const [modelos, setModelos] = useState<Modelo[]>([]);
  const [categorias, setCategorias] = useState<Categoria[]>([]);
  const [categoriaSelecionada, setCategoriaSelecionada] = useState<string | null>(null);
  const [busca, setBusca] = useState('');
  const [loading, setLoading] = useState(true);
  const [kitItens, setKitItens] = useState<Map<string, ItemKit>>(new Map());
  const [mostrarResumo, setMostrarResumo] = useState(false);

  useEffect(() => {
    carregarModelos();
    carregarCategorias();
  }, []);

  const carregarModelos = async () => {
    try {
      const { data: midiasData } = await supabase
        .from('midias_catalogo')
        .select('modelo_id');

      const modelosComMidia = new Set((midiasData || []).map(m => m.modelo_id));

      const { data, error } = await supabase
        .from('catalogo_modelos')
        .select('id, nome_modelo, preco_base, imagem_modelo, categorias, aspect_ratio, pronta_entrega')
        .eq('visivel_catalogo', true)
        .order('nome_modelo');

      if (error) throw error;

      const filtrados = (data || []).filter(m =>
        m.imagem_modelo || modelosComMidia.has(m.id)
      );
      setModelos(filtrados as Modelo[]);
    } catch (error) {
      console.error('Erro ao carregar modelos:', error);
      toast.error('Erro ao carregar produtos');
    } finally {
      setLoading(false);
    }
  };

  const carregarCategorias = async () => {
    try {
      const { data, error } = await (supabase
        .from('categorias_catalogo_visiveis')
        .select('categoria, icone') as any)
        .eq('visivel', true)
        .eq('visivel_kit', true)
        .order('ordem');
      if (error) throw error;
      setCategorias((data || []) as Categoria[]);
    } catch (error) {
      console.error('Erro ao carregar categorias:', error);
    }
  };

  const adicionarAoKit = (modelo: Modelo) => {
    setKitItens(prev => {
      const novo = new Map(prev);
      const existente = novo.get(modelo.id);
      if (existente) {
        novo.set(modelo.id, { ...existente, quantidade: existente.quantidade + 1 });
      } else {
        novo.set(modelo.id, { modelo, quantidade: 1 });
      }
      return novo;
    });
  };

  const removerDoKit = (modeloId: string) => {
    setKitItens(prev => {
      const novo = new Map(prev);
      const existente = novo.get(modeloId);
      if (existente && existente.quantidade > 1) {
        novo.set(modeloId, { ...existente, quantidade: existente.quantidade - 1 });
      } else {
        novo.delete(modeloId);
      }
      return novo;
    });
  };

  const removerItemCompleto = (modeloId: string) => {
    setKitItens(prev => {
      const novo = new Map(prev);
      novo.delete(modeloId);
      return novo;
    });
  };

  const totalItens = Array.from(kitItens.values()).reduce((sum, item) => sum + item.quantidade, 0);

  const enviarWhatsApp = () => {
    if (kitItens.size === 0) {
      toast.error('Adicione pelo menos um item ao kit');
      return;
    }

    const itensTexto = Array.from(kitItens.values())
      .map(item => `• ${item.modelo.nome_modelo}${item.quantidade > 1 ? ` (x${item.quantidade})` : ''}`)
      .join('\n');

    const mensagem = isInternacional
      ? `Hello! I would like to build a kit with the following items:\n\n${itensTexto}\n\nTotal: ${totalItens} ${totalItens === 1 ? 'item' : 'items'}`
      : isRevendedor
      ? `Olá! Sou revendedor e gostaria de montar um kit com os seguintes itens:\n\n${itensTexto}\n\nTotal de ${totalItens} ${totalItens === 1 ? 'item' : 'itens'}`
      : `Olá! Gostaria de montar um kit com os seguintes itens:\n\n${itensTexto}\n\nTotal de ${totalItens} ${totalItens === 1 ? 'item' : 'itens'}`;
    const url = `https://wa.me/5528999025695?text=${encodeURIComponent(mensagem)}`;
    window.open(url, '_blank');
  };

  const modelosFiltrados = modelos.filter(m => {
    const matchBusca = !busca || m.nome_modelo.toLowerCase().includes(busca.toLowerCase());
    const matchCategoria = !categoriaSelecionada || (m.categorias && m.categorias.includes(categoriaSelecionada));
    return matchBusca && matchCategoria;
  });

  const getQuantidade = (modeloId: string) => {
    return kitItens.get(modeloId)?.quantidade || 0;
  };

  return (
    <div className="min-h-screen bg-zinc-950 overflow-x-hidden">
      {/* Header */}
      <header className="bg-black border-b border-white/10 sticky top-0 z-50">
        <div className="container mx-auto px-4 py-3">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => navigate(isRevendedor ? '/catalogo-revendedor' : '/catalogo')}
                className="text-white hover:bg-white/10 text-xs"
              >
                <ArrowLeft className="h-4 w-4 mr-1" />
                Voltar
              </Button>
              <h1 className="text-lg md:text-2xl font-bold text-white tracking-tight">
                <Package className="h-5 w-5 inline mr-2 text-accent" />
                {isRevendedor ? 'Monte um Kit' : 'Monte seu Kit'}
              </h1>
            </div>
            {/* Botão carrinho flutuante no header */}
            <Button
              onClick={() => setMostrarResumo(true)}
              className="relative bg-accent hover:bg-accent/90 text-white gap-1"
              size="sm"
            >
              <Package className="h-4 w-4" />
              <span className="hidden sm:inline">Meu Kit</span>
              {totalItens > 0 && (
                <Badge className="absolute -top-2 -right-2 bg-white text-accent border-0 h-5 w-5 p-0 flex items-center justify-center text-xs font-bold">
                  {totalItens}
                </Badge>
              )}
            </Button>
          </div>
          {/* Busca */}
          <div className="relative mt-3">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-white/40" />
            <Input
              placeholder="Buscar lâminas para adicionar..."
              value={busca}
              onChange={(e) => setBusca(e.target.value)}
              className="pl-10 bg-white/5 border-white/20 text-white placeholder:text-white/40 focus:border-accent h-10"
            />
          </div>
        </div>
      </header>

      {/* Categorias */}
      {categorias.length > 0 && (
        <div className="container mx-auto px-4 pt-4 pb-1">
          <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
            <button
              onClick={() => setCategoriaSelecionada(null)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition-colors border ${
                !categoriaSelecionada
                  ? 'bg-accent text-white border-accent'
                  : 'bg-zinc-900 text-zinc-400 border-zinc-800 hover:border-zinc-600'
              }`}
            >
              Todas
            </button>
            {categorias.map((cat) => {
              const IconComp = getIconComponent(cat.icone);
              const ativo = categoriaSelecionada === cat.categoria;
              return (
                <button
                  key={cat.categoria}
                  onClick={() => setCategoriaSelecionada(ativo ? null : cat.categoria)}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition-colors border ${
                    ativo
                      ? 'bg-accent text-white border-accent'
                      : 'bg-zinc-900 text-zinc-400 border-zinc-800 hover:border-zinc-600'
                  }`}
                >
                  {IconComp && <IconComp className="h-3.5 w-3.5" />}
                  {cat.categoria}
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Instrução */}
      <div className="container mx-auto px-4 pt-2 pb-2">
        <p className="text-zinc-400 text-sm text-center">
          Toque em <span className="text-accent font-semibold">+</span> para adicionar lâminas ao seu kit. Escolha quantas quiser!
        </p>
      </div>

      {/* Grid de produtos */}
      <div className="container mx-auto px-4 py-4 pb-24">
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <div className="animate-pulse text-zinc-400">Carregando produtos...</div>
          </div>
        ) : modelosFiltrados.length === 0 ? (
          <div className="text-center py-20 text-zinc-400">
            Nenhum produto encontrado
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
            {modelosFiltrados.map((modelo) => {
              const qtd = getQuantidade(modelo.id);
              const noKit = qtd > 0;
              return (
                <div
                  key={modelo.id}
                  className={`relative bg-zinc-900 border rounded-xl overflow-hidden transition-all duration-200 ${
                    noKit ? 'border-accent shadow-[0_0_15px_rgba(251,146,60,0.2)]' : 'border-zinc-800 hover:border-zinc-700'
                  }`}
                >
                  {/* Imagem */}
                  <div className="relative aspect-[3/4] bg-zinc-800">
                    {modelo.imagem_modelo ? (
                      <img
                        src={modelo.imagem_modelo}
                        alt={modelo.nome_modelo}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-zinc-600">
                        <Package className="h-8 w-8" />
                      </div>
                    )}
                    {/* Badge quantidade */}
                    {noKit && (
                      <div className="absolute top-2 right-2 bg-accent text-white rounded-full h-7 w-7 flex items-center justify-center text-xs font-bold shadow-lg">
                        {qtd}
                      </div>
                    )}
                    {/* Pronta entrega badge */}
                    {modelo.pronta_entrega && (
                      <div className="absolute top-2 left-2">
                        <Badge className="bg-emerald-600 text-white border-0 text-[10px] px-1.5 py-0.5">
                          ⚡ PE
                        </Badge>
                      </div>
                    )}
                  </div>

                  {/* Info */}
                  <div className="p-2.5">
                    <h3 className="text-white text-xs font-medium truncate mb-2">
                      {modelo.nome_modelo}
                    </h3>
                    {/* Controles */}
                    {noKit ? (
                      <div className="flex items-center justify-between gap-1">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => removerDoKit(modelo.id)}
                          className="h-8 w-8 p-0 border-zinc-700 text-zinc-400 hover:bg-zinc-800 hover:text-white"
                        >
                          <Minus className="h-3.5 w-3.5" />
                        </Button>
                        <span className="text-accent font-bold text-sm">{qtd}</span>
                        <Button
                          size="sm"
                          onClick={() => adicionarAoKit(modelo)}
                          className="h-8 w-8 p-0 bg-accent hover:bg-accent/90 text-white"
                        >
                          <Plus className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    ) : (
                      <Button
                        size="sm"
                        onClick={() => adicionarAoKit(modelo)}
                        className="w-full h-8 bg-zinc-800 hover:bg-accent text-zinc-300 hover:text-white text-xs transition-colors"
                      >
                        <Plus className="h-3.5 w-3.5 mr-1" />
                        Adicionar
                      </Button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Barra flutuante inferior */}
      {totalItens > 0 && (
        <div className="fixed bottom-0 left-0 right-0 bg-black/95 backdrop-blur-sm border-t border-accent/30 p-4 z-50">
          <div className="container mx-auto flex items-center justify-between gap-3 max-w-lg">
            <div className="text-white">
              <span className="text-accent font-bold text-lg">{totalItens}</span>
              <span className="text-zinc-400 text-sm ml-1.5">{totalItens === 1 ? 'item' : 'itens'} no kit</span>
            </div>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setMostrarResumo(true)}
                className="border-zinc-700 text-zinc-300 hover:bg-zinc-800"
              >
                Ver kit
              </Button>
              <Button
                size="sm"
                onClick={enviarWhatsApp}
                className="bg-green-600 hover:bg-green-700 text-white gap-1"
              >
                <MessageCircle className="h-4 w-4" />
                Enviar
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Resumo do Kit */}
      {mostrarResumo && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-[60] flex items-end sm:items-center justify-center" onClick={() => setMostrarResumo(false)}>
          <div
            className="bg-zinc-900 border border-zinc-800 rounded-t-2xl sm:rounded-2xl w-full sm:max-w-md max-h-[85vh] flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header do modal */}
            <div className="flex items-center justify-between p-4 border-b border-zinc-800">
              <div className="flex items-center gap-2">
                <Package className="h-5 w-5 text-accent" />
                <h2 className="text-white font-bold text-lg">Seu Kit</h2>
                <Badge className="bg-accent/20 text-accent border-0">{totalItens} {totalItens === 1 ? 'item' : 'itens'}</Badge>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setMostrarResumo(false)}
                className="text-zinc-400 hover:text-white h-8 w-8 p-0"
              >
                <X className="h-5 w-5" />
              </Button>
            </div>

            {/* Lista de itens */}
            <ScrollArea className="flex-1 overflow-y-auto">
              {kitItens.size === 0 ? (
                <div className="p-8 text-center">
                  <Package className="h-12 w-12 text-zinc-700 mx-auto mb-3" />
                  <p className="text-zinc-500 text-sm">Seu kit está vazio</p>
                  <p className="text-zinc-600 text-xs mt-1">Adicione lâminas para montar seu kit</p>
                </div>
              ) : (
                <div className="p-4 space-y-3">
                  {Array.from(kitItens.values()).map(({ modelo, quantidade }) => (
                    <div key={modelo.id} className="flex items-center gap-3 bg-zinc-800/50 rounded-lg p-3">
                      {/* Thumb */}
                      <div className="w-14 h-14 rounded-lg overflow-hidden bg-zinc-800 flex-shrink-0">
                        {modelo.imagem_modelo ? (
                          <img src={modelo.imagem_modelo} alt="" className="w-full h-full object-cover" />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-zinc-600">
                            <Package className="h-5 w-5" />
                          </div>
                        )}
                      </div>
                      {/* Info */}
                      <div className="flex-1 min-w-0">
                        <p className="text-white text-sm font-medium truncate">{modelo.nome_modelo}</p>
                        <div className="flex items-center gap-2 mt-1.5">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => removerDoKit(modelo.id)}
                            className="h-6 w-6 p-0 border-zinc-700 text-zinc-400 hover:bg-zinc-700"
                          >
                            <Minus className="h-3 w-3" />
                          </Button>
                          <span className="text-accent font-bold text-sm w-5 text-center">{quantidade}</span>
                          <Button
                            size="sm"
                            onClick={() => adicionarAoKit(modelo)}
                            className="h-6 w-6 p-0 bg-accent/20 hover:bg-accent/40 text-accent"
                          >
                            <Plus className="h-3 w-3" />
                          </Button>
                        </div>
                      </div>
                      {/* Remover */}
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => removerItemCompleto(modelo.id)}
                        className="h-7 w-7 p-0 text-zinc-500 hover:text-red-400 hover:bg-red-400/10"
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </ScrollArea>

            {/* Footer do modal */}
            {kitItens.size > 0 && (
              <div className="p-4 border-t border-zinc-800 space-y-3">
                <Button
                  onClick={enviarWhatsApp}
                  className="w-full bg-green-600 hover:bg-green-700 text-white h-12 font-bold gap-2"
                >
                  <MessageCircle className="h-5 w-5" />
                  Enviar Kit no WhatsApp
                </Button>
                <Button
                  variant="ghost"
                  onClick={() => {
                    setKitItens(new Map());
                    setMostrarResumo(false);
                  }}
                  className="w-full text-zinc-500 hover:text-red-400 text-sm"
                >
                  Limpar kit
                </Button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
