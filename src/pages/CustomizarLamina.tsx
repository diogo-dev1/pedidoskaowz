import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { Trash2, Plus, MessageCircle, Search, Check, ArrowLeft } from 'lucide-react';
import { toast } from 'sonner';
import edcKnife from '@/assets/edc-knife.svg';

interface ModeloBase {
  id: string;
  nome_modelo: string;
  preco_base: number;
  categoria: string | null;
  imagem_modelo: string | null;
}

interface OpcaoComponente {
  id: string;
  nome_opcao: string;
  tipo_opcao: 'Aço' | 'Empunhadura' | 'Acabamento' | 'Bainha';
  preco_adicional: number;
}

interface LaminaCustomizada {
  id: string;
  modelo: ModeloBase | null;
  aco: OpcaoComponente | null;
  acabamento: OpcaoComponente | null;
  empunhadura: OpcaoComponente | null;
  bainha: OpcaoComponente | null;
  corBainha: string;
  laser: boolean;
  textoLaser: string;
  subtotal: number;
}

export default function CustomizarLamina() {
  const navigate = useNavigate();
  const [modelos, setModelos] = useState<ModeloBase[]>([]);
  const [componentes, setComponentes] = useState<OpcaoComponente[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Estado da lâmina atual sendo configurada
  const [modeloSelecionado, setModeloSelecionado] = useState<string>('');
  const [acoSelecionado, setAcoSelecionado] = useState<string>('');
  const [acabamentoSelecionado, setAcabamentoSelecionado] = useState<string>('');
  const [empunhaduraSelecionada, setEmpunhaduraSelecionada] = useState<string>('');
  const [bainhaSelecionada, setBainhaSelecionada] = useState<string>('');
  const [corBainha, setCorBainha] = useState<string>('');
  const [laser, setLaser] = useState(false);
  const [textoLaser, setTextoLaser] = useState('');
  const [buscaModelo, setBuscaModelo] = useState('');
  const [categoriaFiltro, setCategoriaFiltro] = useState<string>('');
  
  // Lista de lâminas customizadas
  const [laminasCustomizadas, setLaminasCustomizadas] = useState<LaminaCustomizada[]>([]);

  useEffect(() => {
    carregarDados();
  }, []);

  const carregarDados = async () => {
    try {
      const [modelosRes, componentesRes] = await Promise.all([
        supabase.from('modelos_base').select('*').order('nome_modelo'),
        supabase.from('opcoes_componentes').select('*').order('tipo_opcao')
      ]);

      if (modelosRes.data) setModelos(modelosRes.data);
      if (componentesRes.data) setComponentes(componentesRes.data as OpcaoComponente[]);
    } catch (error) {
      console.error('Erro ao carregar dados:', error);
      toast.error('Erro ao carregar opções');
    } finally {
      setLoading(false);
    }
  };

  const acos = componentes.filter(c => c.tipo_opcao === 'Aço');
  const acabamentos = componentes.filter(c => c.tipo_opcao === 'Acabamento');
  const empunhaduras = componentes.filter(c => c.tipo_opcao === 'Empunhadura');
  const bainhas = componentes.filter(c => c.tipo_opcao === 'Bainha');

  const categorias = ['EDC', 'Campo', 'Cozinha', 'KZR', 'Upsell', 'Customização'];
  
  const modelosFiltrados = modelos.filter(m => {
    const matchBusca = m.nome_modelo.toLowerCase().includes(buscaModelo.toLowerCase());
    const matchCategoria = !categoriaFiltro || m.categoria === categoriaFiltro;
    return matchBusca && matchCategoria;
  });

  const calcularSubtotal = (): number => {
    const modelo = modelos.find(m => m.id === modeloSelecionado);
    const aco = componentes.find(c => c.id === acoSelecionado);
    const acabamento = componentes.find(c => c.id === acabamentoSelecionado);
    const empunhadura = componentes.find(c => c.id === empunhaduraSelecionada);
    const bainha = componentes.find(c => c.id === bainhaSelecionada);

    const precoBase = modelo?.preco_base || 0;
    const precoAco = aco?.preco_adicional || 0;
    const precoAcabamento = acabamento?.preco_adicional || 0;
    const precoEmpunhadura = empunhadura?.preco_adicional || 0;
    const precoBainha = bainha?.preco_adicional || 0;
    const precoLaser = laser ? 30 : 0;

    return precoBase + precoAco + precoAcabamento + precoEmpunhadura + precoBainha + precoLaser;
  };

  const adicionarLamina = () => {
    if (!modeloSelecionado) {
      toast.error('Selecione um modelo');
      return;
    }

    const modelo = modelos.find(m => m.id === modeloSelecionado);
    const aco = componentes.find(c => c.id === acoSelecionado);
    const acabamento = componentes.find(c => c.id === acabamentoSelecionado);
    const empunhadura = componentes.find(c => c.id === empunhaduraSelecionada);
    const bainha = componentes.find(c => c.id === bainhaSelecionada);

    const novaLamina: LaminaCustomizada = {
      id: `${Date.now()}-${Math.random()}`,
      modelo: modelo || null,
      aco: aco || null,
      acabamento: acabamento || null,
      empunhadura: empunhadura || null,
      bainha: bainha || null,
      corBainha,
      laser,
      textoLaser,
      subtotal: calcularSubtotal(),
    };

    setLaminasCustomizadas([...laminasCustomizadas, novaLamina]);
    limparFormulario();
    toast.success('Lâmina adicionada!');
  };

  const removerLamina = (id: string) => {
    setLaminasCustomizadas(laminasCustomizadas.filter(l => l.id !== id));
    toast.success('Lâmina removida');
  };

  const limparFormulario = () => {
    setModeloSelecionado('');
    setAcoSelecionado('');
    setAcabamentoSelecionado('');
    setEmpunhaduraSelecionada('');
    setBainhaSelecionada('');
    setCorBainha('');
    setLaser(false);
    setTextoLaser('');
    setBuscaModelo('');
    setCategoriaFiltro('');
  };

  const enviarWhatsApp = () => {
    if (laminasCustomizadas.length === 0) {
      toast.error('Adicione pelo menos uma lâmina');
      return;
    }

    let mensagem = 'Olá! Gostaria de fazer um orçamento com as seguintes lâminas personalizadas:\n\n';

    laminasCustomizadas.forEach((lamina, index) => {
      mensagem += `*Lâmina ${index + 1}:*\n`;
      mensagem += `- Modelo: ${lamina.modelo?.nome_modelo || 'Não selecionado'}\n`;
      if (lamina.aco) mensagem += `- Aço: ${lamina.aco.nome_opcao}\n`;
      if (lamina.acabamento) mensagem += `- Acabamento: ${lamina.acabamento.nome_opcao}\n`;
      if (lamina.empunhadura) mensagem += `- Empunhadura: ${lamina.empunhadura.nome_opcao}\n`;
      if (lamina.bainha) mensagem += `- Bainha: ${lamina.bainha.nome_opcao}\n`;
      if (lamina.corBainha) mensagem += `- Cor da Bainha: ${lamina.corBainha}\n`;
      if (lamina.laser) mensagem += `- Personalização à Laser: ${lamina.textoLaser || 'Sim'}\n`;
      mensagem += `- Subtotal: R$ ${lamina.subtotal.toFixed(2)}\n\n`;
    });

    const total = laminasCustomizadas.reduce((sum, l) => sum + l.subtotal, 0);
    mensagem += `*Total: R$ ${total.toFixed(2)}*`;

    const url = `https://wa.me/5528999025695?text=${encodeURIComponent(mensagem)}`;
    window.open(url, '_blank');
    
    toast.success('Redirecionando para WhatsApp...');
  };

  const subtotalAtual = calcularSubtotal();
  const totalGeral = laminasCustomizadas.reduce((sum, l) => sum + l.subtotal, 0) + subtotalAtual;

  return (
    <div className="min-h-screen bg-zinc-50 overflow-x-hidden">
      {/* Header */}
      <header className="bg-black border-b border-white/10 sticky top-0 z-50">
        <div className="container mx-auto px-4 py-3 md:py-4">
          <div className="flex items-center gap-2 md:gap-4">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => navigate('/catalogo')}
              className="text-white hover:bg-white/10 text-xs md:text-sm"
            >
              <ArrowLeft className="h-4 w-4 mr-1" />
              Voltar
            </Button>
            <h1 className="text-lg md:text-3xl font-bold text-white tracking-tight">
              Monte Sua Própria Lâmina
            </h1>
          </div>
        </div>
      </header>
 
      <div className="container mx-auto px-4 py-6">
        {/* Miniatura do modelo selecionado */}
        {!loading && modeloSelecionado && (
          <div className="mb-6 flex justify-center animate-fade-in">
            <div className="relative w-full max-w-[600px] h-40 md:h-48 rounded-lg overflow-hidden border-2 border-accent shadow-lg bg-white p-4">
              <img 
                src={modelos.find(m => m.id === modeloSelecionado)?.categoria === 'EDC' 
                  ? edcKnife 
                  : modelos.find(m => m.id === modeloSelecionado)?.imagem_modelo || edcKnife
                } 
                alt="Modelo selecionado"
                className="w-full h-full object-contain filter drop-shadow-sm"
                style={{ filter: 'contrast(1.2) brightness(0.95)' }}
              />
            </div>
          </div>
        )}

        {loading ? (
          <div className="py-8 text-center text-muted-foreground">Carregando opções...</div>
        ) : (
          <div className="max-w-4xl mx-auto">
            <div className="grid lg:grid-cols-3 gap-6">
              {/* Coluna Principal - Configuração */}
              <div className="lg:col-span-2 space-y-6">
                {/* Seleção de Modelo */}
                <div className="bg-white rounded-lg border border-zinc-200 p-4 md:p-6 space-y-4">
                  <div className="flex items-center gap-2">
                    <h3 className="font-semibold text-lg">1. Escolha o Modelo</h3>
                    <Badge variant="secondary">Obrigatório</Badge>
                  </div>

                  {/* Filtros de Categoria */}
                  <div className="flex flex-wrap gap-2">
                    <Button
                      size="sm"
                      variant={!categoriaFiltro ? "default" : "outline"}
                      onClick={() => setCategoriaFiltro('')}
                      className="h-8 text-xs"
                    >
                      Todas
                    </Button>
                    {categorias.map(cat => (
                      <Button
                        key={cat}
                        size="sm"
                        variant={categoriaFiltro === cat ? "default" : "outline"}
                        onClick={() => setCategoriaFiltro(cat)}
                        className="h-8 text-xs"
                      >
                        {cat}
                      </Button>
                    ))}
                  </div>
                  
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder="Buscar modelo..."
                      value={buscaModelo}
                      onChange={(e) => setBuscaModelo(e.target.value)}
                      className="pl-10"
                    />
                  </div>

                  {modelosFiltrados.length === 0 ? (
                    <div className="text-center py-8 text-sm text-muted-foreground border border-border rounded-lg">
                      Nenhum modelo encontrado
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 gap-2 max-h-60 overflow-y-auto border border-border rounded-lg p-2">
                      {modelosFiltrados.map(modelo => (
                        <button
                          key={modelo.id}
                          onClick={() => setModeloSelecionado(modelo.id)}
                          className={`p-3 rounded-lg text-left transition-all ${
                            modeloSelecionado === modelo.id
                              ? 'bg-accent text-accent-foreground shadow-md'
                              : 'bg-muted hover:bg-muted/80'
                          }`}
                        >
                          <div className="flex items-center justify-between gap-2">
                            <div className="flex-1 min-w-0">
                              <div className="font-medium text-sm truncate">{modelo.nome_modelo}</div>
                              <div className="flex items-center gap-2 mt-0.5">
                                <span className="text-xs font-semibold">R$ {modelo.preco_base.toFixed(2)}</span>
                                {modelo.categoria && (
                                  <Badge variant="outline" className="text-xs px-1.5 py-0">
                                    {modelo.categoria}
                                  </Badge>
                                )}
                              </div>
                            </div>
                            {modeloSelecionado === modelo.id && <Check className="h-4 w-4 flex-shrink-0" />}
                          </div>
                        </button>
                      ))}
                    </div>
                  )}
                </div>

                {/* Opções de Customização */}
                {modeloSelecionado && (
                  <div className="bg-white rounded-lg border border-zinc-200 p-4 md:p-6">
                    <Accordion type="single" collapsible className="w-full">
                      <AccordionItem value="aco" className="border-border">
                        <AccordionTrigger className="text-sm font-medium hover:no-underline">
                          2. Tipo de Aço {acoSelecionado && <Badge variant="outline" className="ml-2 text-xs">Selecionado</Badge>}
                        </AccordionTrigger>
                        <AccordionContent className="space-y-2 pt-2">
                          {acos.map(aco => (
                            <button
                              key={aco.id}
                              onClick={() => setAcoSelecionado(aco.id)}
                              className={`w-full p-2 rounded text-left text-sm transition-all ${
                                acoSelecionado === aco.id
                                  ? 'bg-accent text-accent-foreground'
                                  : 'bg-muted hover:bg-muted/80'
                              }`}
                            >
                              <div className="flex items-center justify-between">
                                <span>{aco.nome_opcao}</span>
                                <span className="text-xs">{aco.preco_adicional > 0 ? `+R$ ${aco.preco_adicional.toFixed(2)}` : 'Incluído'}</span>
                              </div>
                            </button>
                          ))}
                        </AccordionContent>
                      </AccordionItem>

                      <AccordionItem value="acabamento" className="border-border">
                        <AccordionTrigger className="text-sm font-medium hover:no-underline">
                          3. Acabamento {acabamentoSelecionado && <Badge variant="outline" className="ml-2 text-xs">Selecionado</Badge>}
                        </AccordionTrigger>
                        <AccordionContent className="space-y-2 pt-2">
                          {acabamentos.map(acabamento => (
                            <button
                              key={acabamento.id}
                              onClick={() => setAcabamentoSelecionado(acabamento.id)}
                              className={`w-full p-2 rounded text-left text-sm transition-all ${
                                acabamentoSelecionado === acabamento.id
                                  ? 'bg-accent text-accent-foreground'
                                  : 'bg-muted hover:bg-muted/80'
                              }`}
                            >
                              <div className="flex items-center justify-between">
                                <span>{acabamento.nome_opcao}</span>
                                <span className="text-xs">{acabamento.preco_adicional > 0 ? `+R$ ${acabamento.preco_adicional.toFixed(2)}` : 'Incluído'}</span>
                              </div>
                            </button>
                          ))}
                        </AccordionContent>
                      </AccordionItem>

                      <AccordionItem value="empunhadura" className="border-border">
                        <AccordionTrigger className="text-sm font-medium hover:no-underline">
                          4. Empunhadura {empunhaduraSelecionada && <Badge variant="outline" className="ml-2 text-xs">Selecionado</Badge>}
                        </AccordionTrigger>
                        <AccordionContent className="space-y-2 pt-2">
                          {empunhaduras.map(empunhadura => (
                            <button
                              key={empunhadura.id}
                              onClick={() => setEmpunhaduraSelecionada(empunhadura.id)}
                              className={`w-full p-2 rounded text-left text-sm transition-all ${
                                empunhaduraSelecionada === empunhadura.id
                                  ? 'bg-accent text-accent-foreground'
                                  : 'bg-muted hover:bg-muted/80'
                              }`}
                            >
                              <div className="flex items-center justify-between">
                                <span>{empunhadura.nome_opcao}</span>
                                <span className="text-xs">{empunhadura.preco_adicional > 0 ? `+R$ ${empunhadura.preco_adicional.toFixed(2)}` : 'Incluído'}</span>
                              </div>
                            </button>
                          ))}
                        </AccordionContent>
                      </AccordionItem>

                      <AccordionItem value="bainha" className="border-border">
                        <AccordionTrigger className="text-sm font-medium hover:no-underline">
                          5. Bainha {bainhaSelecionada && <Badge variant="outline" className="ml-2 text-xs">Selecionado</Badge>}
                        </AccordionTrigger>
                        <AccordionContent className="space-y-3 pt-2">
                          <div className="space-y-2">
                            {bainhas.map(bainha => (
                              <button
                                key={bainha.id}
                                onClick={() => setBainhaSelecionada(bainha.id)}
                                className={`w-full p-2 rounded text-left text-sm transition-all ${
                                  bainhaSelecionada === bainha.id
                                    ? 'bg-accent text-accent-foreground'
                                    : 'bg-muted hover:bg-muted/80'
                                }`}
                              >
                                <div className="flex items-center justify-between">
                                  <span>{bainha.nome_opcao}</span>
                                  <span className="text-xs">{bainha.preco_adicional > 0 ? `+R$ ${bainha.preco_adicional.toFixed(2)}` : 'Incluído'}</span>
                                </div>
                              </button>
                            ))}
                          </div>
                          {bainhaSelecionada && (
                            <div className="space-y-2 pt-2 border-t border-border">
                              <Label htmlFor="corBainha" className="text-xs">Cor da Bainha (opcional)</Label>
                              <Input
                                id="corBainha"
                                placeholder="Ex: Preta, Marrom..."
                                value={corBainha}
                                onChange={(e) => setCorBainha(e.target.value)}
                                className="text-sm"
                              />
                            </div>
                          )}
                        </AccordionContent>
                      </AccordionItem>

                      <AccordionItem value="laser" className="border-border">
                        <AccordionTrigger className="text-sm font-medium hover:no-underline">
                          6. Personalização à Laser {laser && <Badge variant="outline" className="ml-2 text-xs">+R$ 30,00</Badge>}
                        </AccordionTrigger>
                        <AccordionContent className="space-y-3 pt-2">
                          <div className="flex items-center gap-2">
                            <input
                              type="checkbox"
                              id="laser"
                              checked={laser}
                              onChange={(e) => setLaser(e.target.checked)}
                              className="h-4 w-4"
                            />
                            <Label htmlFor="laser" className="text-sm cursor-pointer">
                              Adicionar personalização à laser (+R$ 30,00)
                            </Label>
                          </div>
                          {laser && (
                            <div className="space-y-2">
                              <Label htmlFor="textoLaser" className="text-xs">Texto para gravação</Label>
                              <Input
                                id="textoLaser"
                                placeholder="Digite o texto..."
                                value={textoLaser}
                                onChange={(e) => setTextoLaser(e.target.value)}
                                className="text-sm"
                              />
                            </div>
                          )}
                        </AccordionContent>
                      </AccordionItem>
                    </Accordion>
                  </div>
                )}

                {/* Botão Adicionar */}
                {modeloSelecionado && (
                  <div className="flex gap-2">
                    <Button
                      onClick={adicionarLamina}
                      className="flex-1 bg-accent hover:bg-accent/90"
                    >
                      <Plus className="h-4 w-4 mr-2" />
                      Adicionar Lâmina (R$ {subtotalAtual.toFixed(2)})
                    </Button>
                    <Button
                      onClick={limparFormulario}
                      variant="outline"
                    >
                      Limpar
                    </Button>
                  </div>
                )}
              </div>

              {/* Coluna Lateral - Resumo */}
              <div className="lg:col-span-1">
                <div className="bg-white rounded-lg border border-zinc-200 p-4 md:p-6 sticky top-24 space-y-4">
                  <h3 className="font-semibold text-lg">Resumo do Pedido</h3>
                  
                  {laminasCustomizadas.length === 0 ? (
                    <p className="text-sm text-muted-foreground text-center py-8">
                      Nenhuma lâmina adicionada ainda
                    </p>
                  ) : (
                    <div className="space-y-3">
                      {laminasCustomizadas.map((lamina) => (
                        <div key={lamina.id} className="p-3 bg-muted rounded-lg space-y-2">
                          <div className="flex items-start justify-between gap-2">
                            <div className="flex-1 min-w-0">
                              <p className="font-medium text-sm truncate">{lamina.modelo?.nome_modelo}</p>
                              <p className="text-xs text-muted-foreground">R$ {lamina.subtotal.toFixed(2)}</p>
                            </div>
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => removerLamina(lamina.id)}
                              className="h-8 w-8 p-0"
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}

                  {laminasCustomizadas.length > 0 && (
                    <>
                      <div className="pt-4 border-t border-border">
                        <div className="flex justify-between items-center">
                          <span className="font-semibold">Total:</span>
                          <span className="text-xl font-bold text-accent">
                            R$ {laminasCustomizadas.reduce((sum, l) => sum + l.subtotal, 0).toFixed(2)}
                          </span>
                        </div>
                      </div>
                      <Button
                        onClick={enviarWhatsApp}
                        className="w-full bg-accent hover:bg-accent/90"
                        size="lg"
                      >
                        <MessageCircle className="h-5 w-5 mr-2" />
                        Solicitar Orçamento
                      </Button>
                    </>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
