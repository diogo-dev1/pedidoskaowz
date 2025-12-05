import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Trash2, Plus, MessageCircle, Search, Check, ArrowLeft, Eye } from 'lucide-react';
import { toast } from 'sonner';
import edcKnife from '@/assets/edc-knife.svg';
import { InfoEtapaModal } from '@/components/InfoEtapaModal';

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
  tipo_opcao: 'Aço' | 'Empunhadura' | 'Acabamento' | 'Bainha' | 'Cor de Bainha' | 'Embalagem';
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
  localGravacao: string[];
  embalagem: string;
  embalagemGravacao: boolean;
  embalagemTextoGravacao: string;
}

const LOCAIS_GRAVACAO = ['Dorso Superior', 'Dorso Inferior', 'Lâmina'];

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
  const [localGravacao, setLocalGravacao] = useState<string[]>([]);
  const [embalagem, setEmbalagem] = useState('');
  const [embalagemGravacao, setEmbalagemGravacao] = useState(false);
  const [embalagemTextoGravacao, setEmbalagemTextoGravacao] = useState('');
  const [buscaModelo, setBuscaModelo] = useState('');
  const [categoriaFiltro, setCategoriaFiltro] = useState<string>('');
  
  // Lista de lâminas customizadas
  const [laminasCustomizadas, setLaminasCustomizadas] = useState<LaminaCustomizada[]>([]);
  
  // Modal para visualizar lâmina
  const [laminaModalAberta, setLaminaModalAberta] = useState<LaminaCustomizada | null>(null);

  useEffect(() => {
    carregarDados();
  }, []);

  const carregarDados = async () => {
    try {
      const [modelosRes, componentesRes] = await Promise.all([
        supabase.from('modelos').select('*').order('nome_modelo'),
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
  const coresBainha = componentes.filter(c => c.tipo_opcao === 'Cor de Bainha');
  const embalagensOpcoes = componentes.filter(c => c.tipo_opcao === 'Embalagem');

  const categorias = ['EDC', 'Adaga', 'Campo', 'Cozinha', 'Defesa', 'KZR', 'Customização'];
  
  const modelosFiltrados = modelos.filter(m => {
    const matchBusca = m.nome_modelo.toLowerCase().includes(buscaModelo.toLowerCase());
    const matchCategoria = !categoriaFiltro || m.categoria === categoriaFiltro;
    return matchBusca && matchCategoria;
  });

  // Objetos selecionados para exibição no resumo em tempo real
  const modeloAtual = modelos.find(m => m.id === modeloSelecionado);
  const acoAtual = componentes.find(c => c.id === acoSelecionado);
  const acabamentoAtual = componentes.find(c => c.id === acabamentoSelecionado);
  const empunhaduraAtual = componentes.find(c => c.id === empunhaduraSelecionada);
  const bainhaAtual = componentes.find(c => c.id === bainhaSelecionada);

  const adicionarLamina = () => {
    if (!modeloSelecionado) {
      toast.error('Selecione um modelo');
      return;
    }

    const novaLamina: LaminaCustomizada = {
      id: `${Date.now()}-${Math.random()}`,
      modelo: modeloAtual || null,
      aco: acoAtual || null,
      acabamento: acabamentoAtual || null,
      empunhadura: empunhaduraAtual || null,
      bainha: bainhaAtual || null,
      corBainha,
      laser,
      textoLaser,
      localGravacao,
      embalagem,
      embalagemGravacao,
      embalagemTextoGravacao,
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
    setLocalGravacao([]);
    setEmbalagem('');
    setEmbalagemGravacao(false);
    setEmbalagemTextoGravacao('');
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
      const partes = [];
      
      partes.push(lamina.modelo?.nome_modelo || 'Modelo não selecionado');
      if (lamina.aco) partes.push(lamina.aco.nome_opcao);
      if (lamina.acabamento) partes.push(lamina.acabamento.nome_opcao);
      if (lamina.empunhadura) partes.push(`empunhadura em ${lamina.empunhadura.nome_opcao}`);
      if (lamina.bainha) partes.push(`bainha ${lamina.bainha.nome_opcao}${lamina.corBainha ? ` ${lamina.corBainha}` : ''}`);
      if (lamina.laser && lamina.textoLaser) {
        let laserText = `laser "${lamina.textoLaser}"`;
        if (lamina.localGravacao.length > 0) laserText += ` (${lamina.localGravacao.join(', ')})`;
        partes.push(laserText);
      }
      if (lamina.embalagem) {
        let embalagemText = lamina.embalagem;
        if (lamina.embalagemGravacao && lamina.embalagemTextoGravacao) {
          embalagemText += ` com gravação "${lamina.embalagemTextoGravacao}"`;
        }
        partes.push(embalagemText);
      }
      
      mensagem += `*Lâmina ${index + 1}:* ${partes.join(', ')}\n\n`;
    });

    const url = `https://wa.me/5528999025695?text=${encodeURIComponent(mensagem)}`;
    window.open(url, '_blank');
    
    toast.success('Redirecionando para WhatsApp...');
  };

  const getModeloImagem = (modelo: ModeloBase | null | undefined) => {
    if (!modelo) return edcKnife;
    return modelo.imagem_modelo || edcKnife;
  };

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
          <div className="mb-4 md:mb-6 flex justify-center animate-fade-in">
            <div className="relative w-full max-w-[300px] md:max-w-[500px] h-32 md:h-40 rounded-lg overflow-hidden border border-accent shadow-lg bg-white p-2 md:p-4">
              <img 
                src={getModeloImagem(modeloAtual)} 
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
          <div className="max-w-7xl mx-auto">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 md:gap-6">
              {/* Coluna Principal - Configuração */}
              <div className="lg:col-span-2 space-y-4 md:space-y-6">
                {/* Seleção de Modelo */}
                <div className="bg-white rounded-lg border border-zinc-200 p-3 md:p-6 space-y-3 md:space-y-4">
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <h3 className="font-semibold text-base md:text-lg">1. Escolha o Modelo</h3>
                      <Badge variant="secondary" className="text-xs">Obrigatório</Badge>
                    </div>
                    <InfoEtapaModal etapaKey="modelo" showLabel />
                  </div>

                  {/* Filtros de Categoria */}
                  <div className="flex flex-wrap gap-1.5 md:gap-2">
                    <Button
                      size="sm"
                      variant={!categoriaFiltro ? "default" : "outline"}
                      onClick={() => setCategoriaFiltro('')}
                      className="h-7 md:h-8 text-xs px-2 md:px-3"
                    >
                      Todas
                    </Button>
                    {categorias.map(cat => (
                      <Button
                        key={cat}
                        size="sm"
                        variant={categoriaFiltro === cat ? "default" : "outline"}
                        onClick={() => setCategoriaFiltro(cat)}
                        className="h-7 md:h-8 text-xs px-2 md:px-3"
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
                    <div className="text-center py-6 md:py-8 text-xs md:text-sm text-muted-foreground border border-border rounded-lg">
                      Nenhum modelo encontrado
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 gap-1.5 md:gap-2 max-h-48 md:max-h-60 overflow-y-auto border border-border rounded-lg p-1.5 md:p-2">
                      {modelosFiltrados.map(modelo => (
                        <button
                          key={modelo.id}
                          onClick={() => setModeloSelecionado(modelo.id)}
                          className={`p-2 md:p-3 rounded-lg text-left transition-all ${
                            modeloSelecionado === modelo.id
                              ? 'bg-accent text-accent-foreground shadow-md'
                              : 'bg-muted hover:bg-muted/80'
                          }`}
                        >
                          <div className="flex items-center justify-between gap-2">
                            <div className="flex-1 min-w-0">
                              <div className="font-medium text-xs md:text-sm truncate">{modelo.nome_modelo}</div>
                              {modelo.categoria && (
                                <Badge variant="outline" className="text-[10px] md:text-xs px-1 md:px-1.5 py-0 mt-0.5">
                                  {modelo.categoria}
                                </Badge>
                              )}
                            </div>
                            {modeloSelecionado === modelo.id && <Check className="h-3 w-3 md:h-4 md:w-4 flex-shrink-0" />}
                          </div>
                        </button>
                      ))}
                    </div>
                  )}
                </div>

                {/* Opções de Customização */}
                {modeloSelecionado && (
                  <div className="bg-white rounded-lg border border-zinc-200 p-3 md:p-6">
                    <Accordion type="single" collapsible className="w-full">
                      <AccordionItem value="aco" className="border-border">
                        <AccordionTrigger className="text-xs md:text-sm font-medium hover:no-underline py-3 md:py-4">
                          <span className="flex items-center gap-2">
                            2. Tipo de Aço {acoSelecionado && <Badge variant="outline" className="ml-1 text-[10px] md:text-xs">Selecionado</Badge>}
                          </span>
                        </AccordionTrigger>
                        <AccordionContent className="space-y-1.5 md:space-y-2 pt-2">
                          <div className="mb-2 flex justify-end">
                            <InfoEtapaModal etapaKey="aco" showLabel />
                          </div>
                          {acos.map(aco => (
                            <button
                              key={aco.id}
                              onClick={() => setAcoSelecionado(aco.id)}
                              className={`w-full p-2 md:p-2.5 rounded text-left text-xs md:text-sm transition-all ${
                                acoSelecionado === aco.id
                                  ? 'bg-accent text-accent-foreground'
                                  : 'bg-muted hover:bg-muted/80'
                              }`}
                            >
                              <span className="truncate">{aco.nome_opcao}</span>
                            </button>
                          ))}
                        </AccordionContent>
                      </AccordionItem>

                      <AccordionItem value="acabamento" className="border-border">
                        <AccordionTrigger className="text-xs md:text-sm font-medium hover:no-underline py-3 md:py-4">
                          <span className="flex items-center gap-2">
                            3. Acabamento {acabamentoSelecionado && <Badge variant="outline" className="ml-1 text-[10px] md:text-xs">Selecionado</Badge>}
                          </span>
                        </AccordionTrigger>
                        <AccordionContent className="space-y-1.5 md:space-y-2 pt-2">
                          <div className="mb-2 flex justify-end">
                            <InfoEtapaModal etapaKey="acabamento" showLabel />
                          </div>
                          {acabamentos.map(acabamento => (
                            <button
                              key={acabamento.id}
                              onClick={() => setAcabamentoSelecionado(acabamento.id)}
                              className={`w-full p-2 md:p-2.5 rounded text-left text-xs md:text-sm transition-all ${
                                acabamentoSelecionado === acabamento.id
                                  ? 'bg-accent text-accent-foreground'
                                  : 'bg-muted hover:bg-muted/80'
                              }`}
                            >
                              <span className="truncate">{acabamento.nome_opcao}</span>
                            </button>
                          ))}
                        </AccordionContent>
                      </AccordionItem>

                      <AccordionItem value="empunhadura" className="border-border">
                        <AccordionTrigger className="text-xs md:text-sm font-medium hover:no-underline py-3 md:py-4">
                          <span className="flex items-center gap-2">
                            4. Empunhadura {empunhaduraSelecionada && <Badge variant="outline" className="ml-1 text-[10px] md:text-xs">Selecionado</Badge>}
                          </span>
                        </AccordionTrigger>
                        <AccordionContent className="space-y-1.5 md:space-y-2 pt-2">
                          <div className="mb-2 flex justify-end">
                            <InfoEtapaModal etapaKey="empunhadura" showLabel />
                          </div>
                          {empunhaduras.map(empunhadura => (
                            <button
                              key={empunhadura.id}
                              onClick={() => setEmpunhaduraSelecionada(empunhadura.id)}
                              className={`w-full p-2 md:p-2.5 rounded text-left text-xs md:text-sm transition-all ${
                                empunhaduraSelecionada === empunhadura.id
                                  ? 'bg-accent text-accent-foreground'
                                  : 'bg-muted hover:bg-muted/80'
                              }`}
                            >
                              <span className="truncate">{empunhadura.nome_opcao}</span>
                            </button>
                          ))}
                        </AccordionContent>
                      </AccordionItem>

                      <AccordionItem value="bainha" className="border-border">
                        <AccordionTrigger className="text-xs md:text-sm font-medium hover:no-underline py-3 md:py-4">
                          <span className="flex items-center gap-2">
                            5. Bainha {bainhaSelecionada && <Badge variant="outline" className="ml-1 text-[10px] md:text-xs">Selecionado</Badge>}
                          </span>
                        </AccordionTrigger>
                        <AccordionContent className="space-y-3 pt-2">
                          <div className="mb-2 flex justify-end">
                            <InfoEtapaModal etapaKey="bainha" showLabel />
                          </div>
                          <div className="space-y-1.5 md:space-y-2">
                            {bainhas.map(bainha => (
                              <button
                                key={bainha.id}
                                onClick={() => setBainhaSelecionada(bainha.id)}
                                className={`w-full p-2 md:p-2.5 rounded text-left text-xs md:text-sm transition-all ${
                                  bainhaSelecionada === bainha.id
                                    ? 'bg-accent text-accent-foreground'
                                    : 'bg-muted hover:bg-muted/80'
                                }`}
                              >
                                <span className="truncate">{bainha.nome_opcao}</span>
                              </button>
                            ))}
                          </div>
                          {bainhaSelecionada && (
                            <div className="space-y-1.5 md:space-y-2 pt-2 border-t border-border">
                              <Label htmlFor="corBainha" className="text-xs">Cor da Bainha</Label>
                              <Select value={corBainha} onValueChange={setCorBainha}>
                                <SelectTrigger className="w-full">
                                  <SelectValue placeholder="Selecione a cor" />
                                </SelectTrigger>
                                <SelectContent>
                                  {coresBainha.map(cor => (
                                    <SelectItem key={cor.id} value={cor.nome_opcao}>{cor.nome_opcao}</SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            </div>
                          )}
                        </AccordionContent>
                      </AccordionItem>

                      <AccordionItem value="laser" className="border-border">
                        <AccordionTrigger className="text-xs md:text-sm font-medium hover:no-underline py-3 md:py-4">
                          <span className="flex items-center gap-2">
                            6. Personalização à Laser {laser && <Badge variant="outline" className="ml-1 text-[10px] md:text-xs">Ativo</Badge>}
                          </span>
                        </AccordionTrigger>
                        <AccordionContent className="space-y-3 pt-2">
                          <div className="mb-2 flex justify-end">
                            <InfoEtapaModal etapaKey="laser" showLabel />
                          </div>
                          <div className="flex items-center gap-2">
                            <Checkbox
                              id="laser"
                              checked={laser}
                              onCheckedChange={(checked) => setLaser(checked as boolean)}
                            />
                            <Label htmlFor="laser" className="text-xs md:text-sm cursor-pointer">
                              Adicionar personalização à laser
                            </Label>
                          </div>
                          {laser && (
                            <div className="space-y-3">
                              <div className="space-y-1.5 md:space-y-2">
                                <Label htmlFor="textoLaser" className="text-xs">Texto para gravação</Label>
                                <Input
                                  id="textoLaser"
                                  placeholder="Digite o texto..."
                                  value={textoLaser}
                                  onChange={(e) => setTextoLaser(e.target.value)}
                                  className="text-xs md:text-sm"
                                />
                              </div>
                              <div className="space-y-2">
                                <Label className="text-xs">Local da gravação</Label>
                                <div className="flex flex-wrap gap-2">
                                  {LOCAIS_GRAVACAO.map(local => (
                                    <div
                                      key={local}
                                      className={`flex items-center gap-2 p-2 rounded border cursor-pointer transition-colors ${
                                        localGravacao.includes(local)
                                          ? 'border-accent bg-accent/10'
                                          : 'border-border hover:border-accent/50'
                                      }`}
                                      onClick={() => {
                                        if (localGravacao.includes(local)) {
                                          setLocalGravacao(localGravacao.filter(l => l !== local));
                                        } else {
                                          setLocalGravacao([...localGravacao, local]);
                                        }
                                      }}
                                    >
                                      <Checkbox checked={localGravacao.includes(local)} />
                                      <span className="text-xs">{local}</span>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            </div>
                          )}
                        </AccordionContent>
                      </AccordionItem>

                      <AccordionItem value="embalagem" className="border-border">
                        <AccordionTrigger className="text-xs md:text-sm font-medium hover:no-underline py-3 md:py-4">
                          <span className="flex items-center gap-2">
                            7. Embalagem {embalagem && <Badge variant="outline" className="ml-1 text-[10px] md:text-xs">Selecionado</Badge>}
                          </span>
                        </AccordionTrigger>
                        <AccordionContent className="space-y-3 pt-2">
                          <div className="space-y-1.5 md:space-y-2">
                            {embalagensOpcoes.map(emb => (
                              <button
                                key={emb.id}
                                onClick={() => setEmbalagem(embalagem === emb.nome_opcao ? '' : emb.nome_opcao)}
                                className={`w-full p-2 md:p-2.5 rounded text-left text-xs md:text-sm transition-all ${
                                  embalagem === emb.nome_opcao ? 'bg-accent text-accent-foreground' : 'bg-muted hover:bg-muted/80'
                                }`}
                              >
                                <div className="flex items-center justify-between gap-2">
                                  <span>{emb.nome_opcao}</span>
                                  {embalagem === emb.nome_opcao && <Check className="h-4 w-4" />}
                                </div>
                              </button>
                            ))}
                          </div>
                          {embalagem && (
                            <div className="space-y-3 pt-2 border-t border-border">
                              <div className="flex items-center gap-2">
                                <Checkbox
                                  id="embalagemGravacao"
                                  checked={embalagemGravacao}
                                  onCheckedChange={(checked) => setEmbalagemGravacao(checked as boolean)}
                                />
                                <Label htmlFor="embalagemGravacao" className="text-xs md:text-sm cursor-pointer">
                                  Adicionar gravação na embalagem
                                </Label>
                              </div>
                              {embalagemGravacao && (
                                <div className="space-y-1.5 md:space-y-2">
                                  <Label htmlFor="embalagemTextoGravacao" className="text-xs">Texto para gravação na embalagem</Label>
                                  <Input
                                    id="embalagemTextoGravacao"
                                    placeholder="Digite o texto..."
                                    value={embalagemTextoGravacao}
                                    onChange={(e) => setEmbalagemTextoGravacao(e.target.value)}
                                    className="text-xs md:text-sm"
                                  />
                                </div>
                              )}
                            </div>
                          )}
                        </AccordionContent>
                      </AccordionItem>
                    </Accordion>
                  </div>
                )}

                {/* Botão Adicionar */}
                {modeloSelecionado && (
                  <div className="flex flex-col sm:flex-row gap-2">
                    <Button
                      onClick={adicionarLamina}
                      className="flex-1 bg-accent hover:bg-accent/90 text-xs md:text-sm"
                    >
                      <Plus className="h-3.5 w-3.5 md:h-4 md:w-4 mr-2" />
                      Adicionar Lâmina
                    </Button>
                    <Button
                      onClick={limparFormulario}
                      variant="outline"
                      className="text-xs md:text-sm"
                    >
                      Limpar
                    </Button>
                  </div>
                )}
              </div>

              {/* Coluna Lateral - Resumo */}
              <div className="lg:col-span-1 space-y-4">
                {/* Resumo em Tempo Real */}
                {modeloSelecionado && (
                  <div className="bg-white rounded-lg border border-zinc-200 p-3 md:p-6 lg:sticky lg:top-24 space-y-3 md:space-y-4">
                    <h3 className="font-semibold text-base md:text-lg flex items-center gap-2">
                      <Eye className="h-4 w-4 text-accent" />
                      Configuração Atual
                    </h3>
                    
                    <div className="space-y-2 text-xs md:text-sm">
                      <div className="flex justify-between py-1.5 border-b border-border">
                        <span className="text-muted-foreground">Modelo:</span>
                        <span className="font-medium text-right max-w-[60%] truncate">{modeloAtual?.nome_modelo || '-'}</span>
                      </div>
                      <div className="flex justify-between py-1.5 border-b border-border">
                        <span className="text-muted-foreground">Aço:</span>
                        <span className="font-medium text-right max-w-[60%] truncate">{acoAtual?.nome_opcao || '-'}</span>
                      </div>
                      <div className="flex justify-between py-1.5 border-b border-border">
                        <span className="text-muted-foreground">Acabamento:</span>
                        <span className="font-medium text-right max-w-[60%] truncate">{acabamentoAtual?.nome_opcao || '-'}</span>
                      </div>
                      <div className="flex justify-between py-1.5 border-b border-border">
                        <span className="text-muted-foreground">Empunhadura:</span>
                        <span className="font-medium text-right max-w-[60%] truncate">{empunhaduraAtual?.nome_opcao || '-'}</span>
                      </div>
                      <div className="flex justify-between py-1.5 border-b border-border">
                        <span className="text-muted-foreground">Bainha:</span>
                        <span className="font-medium text-right max-w-[60%] truncate">{bainhaAtual?.nome_opcao || '-'}</span>
                      </div>
                      {corBainha && (
                        <div className="flex justify-between py-1.5 border-b border-border">
                          <span className="text-muted-foreground">Cor da Bainha:</span>
                          <span className="font-medium text-right max-w-[60%] truncate">{corBainha}</span>
                        </div>
                      )}
                      <div className="flex justify-between py-1.5 border-b border-border">
                        <span className="text-muted-foreground">Laser:</span>
                        <span className="font-medium">{laser ? (textoLaser || 'Sim') : 'Não'}</span>
                      </div>
                      {laser && localGravacao.length > 0 && (
                        <div className="flex justify-between py-1.5 border-b border-border">
                          <span className="text-muted-foreground">Local:</span>
                          <span className="font-medium text-right max-w-[60%] truncate">{localGravacao.join(', ')}</span>
                        </div>
                      )}
                      {embalagem && (
                        <div className="flex justify-between py-1.5 border-b border-border">
                          <span className="text-muted-foreground">Embalagem:</span>
                          <span className="font-medium text-right max-w-[60%] truncate">{embalagem}</span>
                        </div>
                      )}
                      {embalagemGravacao && embalagemTextoGravacao && (
                        <div className="flex justify-between py-1.5 border-b border-border">
                          <span className="text-muted-foreground">Gravação Emb.:</span>
                          <span className="font-medium text-right max-w-[60%] truncate">{embalagemTextoGravacao}</span>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* Lâminas Adicionadas */}
                <div className="bg-white rounded-lg border border-zinc-200 p-3 md:p-6 lg:sticky lg:top-24 space-y-3 md:space-y-4" style={{ top: modeloSelecionado ? 'calc(24rem + 6rem)' : '6rem' }}>
                  <h3 className="font-semibold text-base md:text-lg">Lâminas Adicionadas ({laminasCustomizadas.length})</h3>
                  
                  {laminasCustomizadas.length === 0 ? (
                    <p className="text-xs md:text-sm text-muted-foreground text-center py-6 md:py-8">
                      Nenhuma lâmina adicionada ainda
                    </p>
                  ) : (
                    <div className="space-y-2 md:space-y-3">
                      {laminasCustomizadas.map((lamina) => (
                        <div 
                          key={lamina.id} 
                          className="p-2 md:p-3 bg-muted rounded-lg cursor-pointer hover:bg-muted/80 transition-colors"
                          onClick={() => setLaminaModalAberta(lamina)}
                        >
                          <div className="flex items-start justify-between gap-2">
                            <div className="flex-1 min-w-0">
                              <p className="font-medium text-xs md:text-sm truncate">{lamina.modelo?.nome_modelo}</p>
                              <p className="text-[10px] md:text-xs text-muted-foreground mt-0.5">
                                {[
                                  lamina.aco?.nome_opcao,
                                  lamina.acabamento?.nome_opcao,
                                  lamina.empunhadura?.nome_opcao
                                ].filter(Boolean).join(' • ') || 'Clique para ver detalhes'}
                              </p>
                            </div>
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={(e) => {
                                e.stopPropagation();
                                removerLamina(lamina.id);
                              }}
                              className="h-7 w-7 md:h-8 md:w-8 p-0"
                            >
                              <Trash2 className="h-3 w-3 md:h-4 md:w-4" />
                            </Button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}

                  {laminasCustomizadas.length > 0 && (
                    <>
                      <Button
                        onClick={enviarWhatsApp}
                        className="w-full bg-accent hover:bg-accent/90 text-xs md:text-sm"
                      >
                        <MessageCircle className="h-4 w-4 md:h-5 md:w-5 mr-2" />
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

      {/* Modal de Detalhes da Lâmina */}
      <Dialog open={!!laminaModalAberta} onOpenChange={() => setLaminaModalAberta(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="text-lg font-bold">
              {laminaModalAberta?.modelo?.nome_modelo || 'Detalhes da Lâmina'}
            </DialogTitle>
          </DialogHeader>
          
          {laminaModalAberta && (
            <div className="space-y-3 text-sm">
              {/* SVG do modelo */}
              <div className="flex justify-center mb-4">
                <div className="w-full max-w-[200px] h-24 rounded-lg overflow-hidden border border-border bg-white p-2">
                  <img
                    src={getModeloImagem(laminaModalAberta.modelo)}
                    alt="Modelo"
                    className="w-full h-full object-contain"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div className="bg-muted p-2.5 rounded-lg">
                  <p className="text-muted-foreground text-xs">Modelo</p>
                  <p className="font-medium">{laminaModalAberta.modelo?.nome_modelo || '-'}</p>
                </div>
                <div className="bg-muted p-2.5 rounded-lg">
                  <p className="text-muted-foreground text-xs">Aço</p>
                  <p className="font-medium">{laminaModalAberta.aco?.nome_opcao || '-'}</p>
                </div>
                <div className="bg-muted p-2.5 rounded-lg">
                  <p className="text-muted-foreground text-xs">Acabamento</p>
                  <p className="font-medium">{laminaModalAberta.acabamento?.nome_opcao || '-'}</p>
                </div>
                <div className="bg-muted p-2.5 rounded-lg">
                  <p className="text-muted-foreground text-xs">Empunhadura</p>
                  <p className="font-medium">{laminaModalAberta.empunhadura?.nome_opcao || '-'}</p>
                </div>
                <div className="bg-muted p-2.5 rounded-lg">
                  <p className="text-muted-foreground text-xs">Bainha</p>
                  <p className="font-medium">{laminaModalAberta.bainha?.nome_opcao || '-'}</p>
                </div>
                {laminaModalAberta.corBainha && (
                  <div className="bg-muted p-2.5 rounded-lg">
                    <p className="text-muted-foreground text-xs">Cor da Bainha</p>
                    <p className="font-medium">{laminaModalAberta.corBainha}</p>
                  </div>
                )}
                {laminaModalAberta.embalagem && (
                  <div className="bg-muted p-2.5 rounded-lg col-span-2">
                    <p className="text-muted-foreground text-xs">Embalagem</p>
                    <p className="font-medium">{laminaModalAberta.embalagem}</p>
                    {laminaModalAberta.embalagemGravacao && laminaModalAberta.embalagemTextoGravacao && (
                      <p className="text-xs text-muted-foreground mt-1">Gravação: {laminaModalAberta.embalagemTextoGravacao}</p>
                    )}
                  </div>
                )}
              </div>
              
              {laminaModalAberta.laser && (
                <div className="bg-accent/10 p-3 rounded-lg border border-accent/20">
                  <p className="text-muted-foreground text-xs">Personalização à Laser</p>
                  <p className="font-medium">{laminaModalAberta.textoLaser || 'Sim'}</p>
                  {laminaModalAberta.localGravacao.length > 0 && (
                    <p className="text-xs text-muted-foreground mt-1">Local: {laminaModalAberta.localGravacao.join(', ')}</p>
                  )}
                </div>
              )}

              <Button
                variant="destructive"
                className="w-full"
                onClick={() => {
                  removerLamina(laminaModalAberta.id);
                  setLaminaModalAberta(null);
                }}
              >
                <Trash2 className="h-4 w-4 mr-2" />
                Remover Lâmina
              </Button>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
