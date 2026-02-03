import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Trash2, Plus, MessageCircle, Search, Check, ArrowLeft, Eye, ChevronDown, ChevronUp, X } from 'lucide-react';
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
  dragonScale: boolean;
  bainha: OpcaoComponente | null;
  corBainha: string;
  corBainhaPersonalizada: string;
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
  const [dragonScale, setDragonScale] = useState(false);
  const [bainhaSelecionada, setBainhaSelecionada] = useState<string>('');
  const [corBainha, setCorBainha] = useState<string>('');
  const [corBainhaPersonalizada, setCorBainhaPersonalizada] = useState<string>('');
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
  
  // Collapsibles
  const [showExtras, setShowExtras] = useState(false);

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

  const mostrarModelos = categoriaFiltro !== '' || buscaModelo.trim() !== '';

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

    const corBainhaFinal = corBainha === 'OUTRA' ? corBainhaPersonalizada : corBainha;

    const novaLamina: LaminaCustomizada = {
      id: `${Date.now()}-${Math.random()}`,
      modelo: modeloAtual || null,
      aco: acoAtual || null,
      acabamento: acabamentoAtual || null,
      empunhadura: empunhaduraAtual || null,
      dragonScale,
      bainha: bainhaAtual || null,
      corBainha: corBainhaFinal,
      corBainhaPersonalizada,
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
    setDragonScale(false);
    setBainhaSelecionada('');
    setCorBainha('');
    setCorBainhaPersonalizada('');
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
      mensagem += `*Lâmina ${index + 1}:*\n`;
      mensagem += `- Modelo: ${lamina.modelo?.nome_modelo || '-'}\n`;
      mensagem += `- Aço: ${lamina.aco?.nome_opcao || '-'}\n`;
      mensagem += `- Acabamento: ${lamina.acabamento?.nome_opcao || '-'}\n`;
      let empunhaduraInfo = lamina.empunhadura?.nome_opcao || '-';
      if (lamina.dragonScale) empunhaduraInfo += ' + Dragon Scale';
      mensagem += `- Empunhadura: ${empunhaduraInfo}\n`;
      mensagem += `- Bainha: ${lamina.bainha?.nome_opcao || '-'}${lamina.corBainha ? ` (${lamina.corBainha})` : ''}\n`;
      
      let laserInfo = '-';
      if (lamina.laser) {
        laserInfo = lamina.textoLaser || 'Sim';
        if (lamina.localGravacao.length > 0) {
          laserInfo += ` (${lamina.localGravacao.join(', ')})`;
        }
      }
      mensagem += `- Laser: ${laserInfo}\n`;
      
      let embalagemInfo = '-';
      if (lamina.embalagem) {
        embalagemInfo = lamina.embalagem;
        if (lamina.embalagemGravacao && lamina.embalagemTextoGravacao) {
          embalagemInfo += ` - Gravação: "${lamina.embalagemTextoGravacao}"`;
        }
      }
      mensagem += `- Embalagem: ${embalagemInfo}\n`;
      mensagem += '\n';
    });

    const url = `https://wa.me/5528999025695?text=${encodeURIComponent(mensagem)}`;
    window.open(url, '_blank');
    
    toast.success('Redirecionando para WhatsApp...');
  };

  const getModeloImagem = (modelo: ModeloBase | null | undefined) => {
    if (!modelo) return edcKnife;
    return modelo.imagem_modelo || edcKnife;
  };

  // Componente colapsável para seleção limpa (igual ao Simulador)
  const CollapsibleSelect = ({ 
    options, 
    selected, 
    onSelect, 
    label,
    etapaKey 
  }: { 
    options: OpcaoComponente[], 
    selected: string, 
    onSelect: (id: string) => void, 
    label: string,
    etapaKey?: string 
  }) => {
    const [isOpen, setIsOpen] = useState(false);
    const selectedOption = options.find(o => o.id === selected);

    return (
      <Collapsible open={isOpen} onOpenChange={setIsOpen}>
        <CollapsibleTrigger asChild>
          <button className="w-full flex items-center justify-between p-2.5 rounded-lg bg-muted hover:bg-muted/80 transition-all">
            <div className="flex items-center gap-2">
              <span className="text-xs text-muted-foreground">{label}</span>
              {selectedOption && (
                <Badge variant="secondary" className="text-xs font-medium">
                  {selectedOption.nome_opcao}
                </Badge>
              )}
            </div>
            <div className="flex items-center gap-1.5">
              {etapaKey && (
                <span onClick={(e) => e.stopPropagation()}>
                  <InfoEtapaModal etapaKey={etapaKey} />
                </span>
              )}
              {isOpen ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
            </div>
          </button>
        </CollapsibleTrigger>
        <CollapsibleContent className="pt-2">
          <div className="flex flex-wrap gap-1.5">
            {options.map(opt => (
              <button
                key={opt.id}
                onClick={() => {
                  onSelect(opt.id);
                  setIsOpen(false);
                }}
                className={`px-2.5 py-1.5 rounded-md text-xs transition-all ${
                  selected === opt.id
                    ? 'bg-accent text-accent-foreground font-medium'
                    : 'bg-background border border-border hover:border-accent/50'
                }`}
              >
                {opt.nome_opcao}
              </button>
            ))}
          </div>
        </CollapsibleContent>
      </Collapsible>
    );
  };

  if (loading) {
    return <div className="py-8 text-center text-muted-foreground">Carregando opções...</div>;
  }

  return (
    <div className="min-h-screen bg-background pb-28">
      {/* Header */}
      <header className="bg-black border-b border-white/10 sticky top-0 z-50">
        <div className="container mx-auto px-3 py-3">
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => navigate('/catalogo')}
              className="text-white hover:bg-white/10 text-xs"
            >
              <ArrowLeft className="h-4 w-4 mr-1" />
              Voltar
            </Button>
            <h1 className="text-lg font-bold text-white tracking-tight">
              Monte Sua Lâmina
            </h1>
            {laminasCustomizadas.length > 0 && (
              <Badge variant="secondary" className="text-xs ml-auto">
                {laminasCustomizadas.length} lâmina{laminasCustomizadas.length > 1 ? 's' : ''}
              </Badge>
            )}
          </div>
        </div>
      </header>

      <div className="container mx-auto px-3 py-4 max-w-5xl">
        {/* Imagem do modelo selecionado - Acima do card */}
        {modeloSelecionado && modeloAtual && (
          <div className="bg-muted rounded-lg p-4 mb-3">
            <div className="w-full h-32 bg-white rounded overflow-hidden mb-3">
              <img
                src={getModeloImagem(modeloAtual)}
                alt={modeloAtual.nome_modelo}
                className="w-full h-full object-contain"
              />
            </div>
            <div className="flex items-center justify-between">
              <p className="font-medium text-sm">{modeloAtual.nome_modelo}</p>
              <Button size="sm" variant="ghost" onClick={() => setModeloSelecionado('')} className="h-7 w-7 p-0">
                <X className="h-3.5 w-3.5" />
              </Button>
            </div>
          </div>
        )}

        {/* Seleção de Modelo - Compacta */}
        <div className="bg-card rounded-lg border border-border p-3 mb-3">
          <div className="flex items-center gap-2 mb-3">
            <h3 className="font-semibold text-sm">Modelo</h3>
            <InfoEtapaModal etapaKey="modelo" />
          </div>

          {/* Filtros inline */}
          <div className="flex flex-wrap gap-1 mb-2">
            {categorias.map(cat => (
              <button
                key={cat}
                onClick={() => setCategoriaFiltro(cat === categoriaFiltro ? '' : cat)}
                className={`px-2 py-1 rounded text-xs transition-all ${
                  categoriaFiltro === cat 
                    ? 'bg-accent text-accent-foreground' 
                    : 'bg-muted hover:bg-muted/80'
                }`}
              >
                {cat}
              </button>
            ))}
          </div>

          <div className="relative mb-2">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
            <Input
              placeholder="Buscar..."
              value={buscaModelo}
              onChange={(e) => setBuscaModelo(e.target.value)}
              className="pl-8 h-8 text-xs"
            />
          </div>

          {mostrarModelos && modelosFiltrados.length > 0 && (
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-1.5 max-h-32 overflow-y-auto">
              {modelosFiltrados.map(modelo => (
                <button
                  key={modelo.id}
                  onClick={() => setModeloSelecionado(modelo.id)}
                  className={`p-2 rounded text-left text-xs transition-all flex items-center justify-between ${
                    modeloSelecionado === modelo.id
                      ? 'bg-accent text-accent-foreground'
                      : 'bg-muted hover:bg-muted/80'
                  }`}
                >
                  <span className="truncate">{modelo.nome_modelo}</span>
                  {modeloSelecionado === modelo.id && <Check className="h-3 w-3 flex-shrink-0" />}
                </button>
              ))}
            </div>
          )}

          {mostrarModelos && modelosFiltrados.length === 0 && (
            <div className="text-center py-4 text-xs text-muted-foreground">
              Nenhum modelo encontrado
            </div>
          )}
        </div>

        {/* Customização - Collapsibles */}
        {modeloSelecionado && (
          <div className="bg-card rounded-lg border border-border p-3 mb-3 space-y-2">
            <CollapsibleSelect 
              options={acos} 
              selected={acoSelecionado} 
              onSelect={setAcoSelecionado} 
              label="Aço"
              etapaKey="aco"
            />

            <CollapsibleSelect 
              options={acabamentos} 
              selected={acabamentoSelecionado} 
              onSelect={setAcabamentoSelecionado} 
              label="Acabamento"
              etapaKey="acabamento"
            />

            <div className="space-y-1.5">
              <CollapsibleSelect 
                options={empunhaduras} 
                selected={empunhaduraSelecionada} 
                onSelect={setEmpunhaduraSelecionada} 
                label="Empunhadura"
                etapaKey="empunhadura"
              />
              {empunhaduraSelecionada && (
                <div className="flex items-center gap-2 pl-3">
                  <Checkbox
                    id="dragonScale"
                    checked={dragonScale}
                    onCheckedChange={(checked) => setDragonScale(checked === true)}
                    className="h-3.5 w-3.5"
                  />
                  <Label htmlFor="dragonScale" className="text-xs cursor-pointer">Dragon Scale</Label>
                </div>
              )}
            </div>

            <div className="space-y-1.5">
              <CollapsibleSelect 
                options={bainhas} 
                selected={bainhaSelecionada} 
                onSelect={setBainhaSelecionada} 
                label="Bainha"
                etapaKey="bainha"
              />
              {bainhaSelecionada && (
                <div className="space-y-2 ml-3">
                  <Select value={corBainha} onValueChange={(value) => {
                    setCorBainha(value);
                    if (value !== 'OUTRA') setCorBainhaPersonalizada('');
                  }}>
                    <SelectTrigger className="h-8 text-xs">
                      <SelectValue placeholder="Cor da bainha" />
                    </SelectTrigger>
                    <SelectContent>
                      {coresBainha.map(cor => (
                        <SelectItem key={cor.id} value={cor.nome_opcao} className="text-xs">
                          {cor.nome_opcao}
                        </SelectItem>
                      ))}
                      <SelectItem value="OUTRA" className="text-xs">
                        Outra (digitar)
                      </SelectItem>
                    </SelectContent>
                  </Select>
                  {corBainha === 'OUTRA' && (
                    <Input
                      placeholder="Digite a cor desejada..."
                      value={corBainhaPersonalizada}
                      onChange={(e) => setCorBainhaPersonalizada(e.target.value)}
                      className="h-8 text-xs"
                    />
                  )}
                </div>
              )}
            </div>

            {/* Extras colapsável */}
            <Collapsible open={showExtras} onOpenChange={setShowExtras}>
              <CollapsibleTrigger asChild>
                <button className="flex items-center justify-between w-full py-2 text-xs text-muted-foreground hover:text-foreground transition-colors">
                  <span className="flex items-center gap-1.5">
                    Laser & Embalagem
                    {(laser || embalagem) && <Badge variant="outline" className="text-[10px] px-1 py-0">Ativo</Badge>}
                  </span>
                  {showExtras ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
                </button>
              </CollapsibleTrigger>
              <CollapsibleContent className="space-y-3 pt-2">
                {/* Laser */}
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <Checkbox
                      id="laser"
                      checked={laser}
                      onCheckedChange={(checked) => setLaser(checked as boolean)}
                      className="h-3.5 w-3.5"
                    />
                    <Label htmlFor="laser" className="text-xs cursor-pointer">Personalização à Laser</Label>
                    <InfoEtapaModal etapaKey="laser" />
                  </div>
                  {laser && (
                    <div className="space-y-2 pl-5">
                      <Input
                        placeholder="Texto para gravação..."
                        value={textoLaser}
                        onChange={(e) => setTextoLaser(e.target.value)}
                        className="h-8 text-xs"
                      />
                      <div className="flex flex-wrap gap-1.5">
                        {LOCAIS_GRAVACAO.map(local => (
                          <button
                            key={local}
                            onClick={() => {
                              if (localGravacao.includes(local)) {
                                setLocalGravacao(localGravacao.filter(l => l !== local));
                              } else {
                                setLocalGravacao([...localGravacao, local]);
                              }
                            }}
                            className={`px-2 py-1 rounded text-xs transition-all ${
                              localGravacao.includes(local)
                                ? 'bg-accent text-accent-foreground'
                                : 'bg-muted hover:bg-muted/80'
                            }`}
                          >
                            {local}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                {/* Embalagem */}
                <div className="space-y-2">
                  <Label className="text-xs text-muted-foreground">Embalagem</Label>
                  <div className="flex flex-wrap gap-1.5">
                    {embalagensOpcoes.map(emb => (
                      <button
                        key={emb.id}
                        onClick={() => setEmbalagem(embalagem === emb.nome_opcao ? '' : emb.nome_opcao)}
                        className={`px-2.5 py-1.5 rounded-md text-xs transition-all ${
                          embalagem === emb.nome_opcao
                            ? 'bg-accent text-accent-foreground'
                            : 'bg-muted hover:bg-muted/80'
                        }`}
                      >
                        {emb.nome_opcao}
                      </button>
                    ))}
                  </div>
                  {embalagem && (
                    <div className="flex items-center gap-2">
                      <Checkbox
                        id="embalagemGravacao"
                        checked={embalagemGravacao}
                        onCheckedChange={(checked) => setEmbalagemGravacao(checked as boolean)}
                        className="h-3.5 w-3.5"
                      />
                      <Label htmlFor="embalagemGravacao" className="text-xs cursor-pointer">Gravação na embalagem</Label>
                    </div>
                  )}
                  {embalagemGravacao && (
                    <Input
                      placeholder="Texto para embalagem..."
                      value={embalagemTextoGravacao}
                      onChange={(e) => setEmbalagemTextoGravacao(e.target.value)}
                      className="h-8 text-xs"
                    />
                  )}
                </div>
              </CollapsibleContent>
            </Collapsible>
          </div>
        )}

        {/* Lâminas Adicionadas */}
        {laminasCustomizadas.length > 0 && (
          <div className="bg-card rounded-lg border border-border p-3 mb-3">
            <h3 className="font-semibold text-sm mb-2">
              Lâminas ({laminasCustomizadas.length})
            </h3>
            <div className="space-y-1.5">
              {laminasCustomizadas.map((lamina, index) => (
                <div
                  key={lamina.id}
                  className="flex items-center justify-between p-2 bg-muted rounded-lg"
                >
                  <button
                    onClick={() => setLaminaModalAberta(lamina)}
                    className="flex items-center gap-2 flex-1 min-w-0 text-left"
                  >
                    <div className="w-8 h-8 bg-white rounded overflow-hidden flex-shrink-0">
                      <img
                        src={getModeloImagem(lamina.modelo)}
                        alt={lamina.modelo?.nome_modelo || 'Modelo'}
                        className="w-full h-full object-contain"
                      />
                    </div>
                    <div className="min-w-0">
                      <p className="text-xs font-medium truncate">{lamina.modelo?.nome_modelo}</p>
                      <p className="text-[10px] text-muted-foreground truncate">
                        {[lamina.aco?.nome_opcao, lamina.acabamento?.nome_opcao].filter(Boolean).join(' • ')}
                      </p>
                    </div>
                  </button>
                  <div className="flex items-center gap-1">
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => setLaminaModalAberta(lamina)}
                      className="h-7 w-7 p-0"
                    >
                      <Eye className="h-3.5 w-3.5" />
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => removerLamina(lamina.id)}
                      className="h-7 w-7 p-0 text-destructive hover:text-destructive"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Barra de Ações Fixa */}
      <div className="fixed bottom-0 left-0 right-0 bg-background border-t border-border p-3 shadow-lg z-50">
        <div className="container mx-auto max-w-5xl flex items-center gap-2">
          {modeloSelecionado && (
            <Button
              onClick={adicionarLamina}
              variant="outline"
              className="flex-1 text-xs"
            >
              <Plus className="h-4 w-4 mr-1" />
              Adicionar Lâmina
            </Button>
          )}
          
          {laminasCustomizadas.length > 0 && (
            <Button
              onClick={enviarWhatsApp}
              className="flex-1 bg-accent hover:bg-accent/90 text-sm"
            >
              <MessageCircle className="h-4 w-4 mr-2" />
              Solicitar Orçamento
            </Button>
          )}
        </div>
      </div>

      {/* Modal de Detalhes da Lâmina */}
      <Dialog open={!!laminaModalAberta} onOpenChange={() => setLaminaModalAberta(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="text-lg">Detalhes da Lâmina</DialogTitle>
          </DialogHeader>
          {laminaModalAberta && (
            <div className="space-y-4">
              {/* Imagem do modelo */}
              <div className="w-full h-24 bg-muted rounded-lg overflow-hidden">
                <img
                  src={getModeloImagem(laminaModalAberta.modelo)}
                  alt={laminaModalAberta.modelo?.nome_modelo || 'Modelo'}
                  className="w-full h-full object-contain"
                />
              </div>
              
              {/* Especificações */}
              <div className="space-y-2 text-sm">
                <div className="flex justify-between py-1 border-b border-border">
                  <span className="text-muted-foreground">Modelo</span>
                  <span className="font-medium">{laminaModalAberta.modelo?.nome_modelo || '-'}</span>
                </div>
                <div className="flex justify-between py-1 border-b border-border">
                  <span className="text-muted-foreground">Aço</span>
                  <span className="font-medium">{laminaModalAberta.aco?.nome_opcao || '-'}</span>
                </div>
                <div className="flex justify-between py-1 border-b border-border">
                  <span className="text-muted-foreground">Acabamento</span>
                  <span className="font-medium">{laminaModalAberta.acabamento?.nome_opcao || '-'}</span>
                </div>
                <div className="flex justify-between py-1 border-b border-border">
                  <span className="text-muted-foreground">Empunhadura</span>
                  <span className="font-medium">
                    {laminaModalAberta.empunhadura?.nome_opcao || '-'}
                    {laminaModalAberta.dragonScale && ' + Dragon Scale'}
                  </span>
                </div>
                <div className="flex justify-between py-1 border-b border-border">
                  <span className="text-muted-foreground">Bainha</span>
                  <span className="font-medium">
                    {laminaModalAberta.bainha?.nome_opcao || '-'}
                    {laminaModalAberta.corBainha && ` (${laminaModalAberta.corBainha})`}
                  </span>
                </div>
                {laminaModalAberta.laser && (
                  <div className="flex justify-between py-1 border-b border-border">
                    <span className="text-muted-foreground">Laser</span>
                    <span className="font-medium">
                      {laminaModalAberta.textoLaser || 'Sim'}
                      {laminaModalAberta.localGravacao.length > 0 && ` (${laminaModalAberta.localGravacao.join(', ')})`}
                    </span>
                  </div>
                )}
                {laminaModalAberta.embalagem && (
                  <div className="flex justify-between py-1 border-b border-border">
                    <span className="text-muted-foreground">Embalagem</span>
                    <span className="font-medium">
                      {laminaModalAberta.embalagem}
                      {laminaModalAberta.embalagemGravacao && laminaModalAberta.embalagemTextoGravacao && 
                        ` - Gravação: "${laminaModalAberta.embalagemTextoGravacao}"`}
                    </span>
                  </div>
                )}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
