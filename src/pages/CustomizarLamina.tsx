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

interface GravacaoLateral {
  ativo: boolean;
  texto: string;
  fonte: string;
}

interface GravacaoDorso {
  ativo: boolean;
  texto: string;
}

interface GravacaoLogo {
  ativo: boolean;
}

interface LaminaCustomizada {
  id: string;
  modelo: ModeloBase | null;
  aco: OpcaoComponente | null;
  acabamento: OpcaoComponente | null;
  bruteForge: boolean;
  empunhadura: OpcaoComponente | null;
  dragonScale: boolean;
  bainhas: { bainha: OpcaoComponente; corBainha: string }[];
  laser: boolean;
  gravacoes: {
    lateral: GravacaoLateral;
    dorso: GravacaoDorso;
    logo: GravacaoLogo;
  };
  embalagem: string;
  embalagemGravacao: boolean;
  embalagemTextoGravacao: string;
}

const FONTES_DISPONIVEIS = ['Arial', 'Times New Roman', 'Courier', 'Georgia', 'Verdana'] as const;

export default function CustomizarLamina() {
  const navigate = useNavigate();
  const [modelos, setModelos] = useState<ModeloBase[]>([]);
  const [componentes, setComponentes] = useState<OpcaoComponente[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Estado da lâmina atual sendo configurada
  const [modeloSelecionado, setModeloSelecionado] = useState<string>('');
  const [acoSelecionado, setAcoSelecionado] = useState<string>('');
  const [acabamentoSelecionado, setAcabamentoSelecionado] = useState<string>('');
  const [bruteForge, setBruteForge] = useState(false);
  const [empunhaduraSelecionada, setEmpunhaduraSelecionada] = useState<string>('');
  const [dragonScale, setDragonScale] = useState(false);
  const [bainhasSelecionadas, setBainhasSelecionadas] = useState<{ bainhaId: string; corBainha: string }[]>([]);
  const [laser, setLaser] = useState(false);
  const [gravacoes, setGravacoes] = useState<{
    lateral: GravacaoLateral;
    dorso: GravacaoDorso;
    logo: GravacaoLogo;
  }>({
    lateral: { ativo: false, texto: '', fonte: '' },
    dorso: { ativo: false, texto: '' },
    logo: { ativo: false },
  });
  const [embalagem, setEmbalagem] = useState('');
  const [embalagemGravacao, setEmbalagemGravacao] = useState(false);
  const [embalagemTextoGravacao, setEmbalagemTextoGravacao] = useState('');
  const [buscaModelo, setBuscaModelo] = useState('');
  const [categoriaFiltro, setCategoriaFiltro] = useState<string>('');
  
  // Lista de lâminas customizadas
  const [laminasCustomizadas, setLaminasCustomizadas] = useState<LaminaCustomizada[]>([]);
  
  // Modal para visualizar lâmina
  const [laminaModalAberta, setLaminaModalAberta] = useState<LaminaCustomizada | null>(null);
  
  // Collapsibles - accordion behavior
  const [showExtras, setShowExtras] = useState(false);
  const [secaoAberta, setSecaoAberta] = useState<string | null>(null);

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
  
  // Filtrar acabamentos baseado no aço selecionado
  const acoAtualNome = componentes.find(c => c.id === acoSelecionado)?.nome_opcao || '';
  const acabamentosFiltrados = acoAtualNome.toUpperCase().includes('SAE52100') 
    ? acabamentos.filter(a => 
        a.nome_opcao.toLowerCase().includes('black stone') || 
        a.nome_opcao.toLowerCase().includes('tactical')
      )
    : acabamentos;

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
  
  // Limpar acabamento se aço mudar para SAE52100 e acabamento não for compatível
  useEffect(() => {
    if (acoAtualNome.toUpperCase().includes('SAE52100') && acabamentoSelecionado) {
      const acabamentoAtualObj = acabamentos.find(a => a.id === acabamentoSelecionado);
      if (acabamentoAtualObj && 
          !acabamentoAtualObj.nome_opcao.toLowerCase().includes('black stone') && 
          !acabamentoAtualObj.nome_opcao.toLowerCase().includes('tactical')) {
        setAcabamentoSelecionado('');
        setBruteForge(false);
      }
    }
  }, [acoSelecionado]);

  const adicionarLamina = () => {
    if (!modeloSelecionado) {
      toast.error('Selecione um modelo');
      return;
    }

    const bainhasFinais = bainhasSelecionadas.map(bs => ({
      bainha: bainhas.find(b => b.id === bs.bainhaId)!,
      corBainha: bs.corBainha
    })).filter(bs => bs.bainha);

    const novaLamina: LaminaCustomizada = {
      id: `${Date.now()}-${Math.random()}`,
      modelo: modeloAtual || null,
      aco: acoAtual || null,
      acabamento: acabamentoAtual || null,
      bruteForge,
      empunhadura: empunhaduraAtual || null,
      dragonScale,
      bainhas: bainhasFinais,
      laser,
      gravacoes: { ...gravacoes },
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
    setBruteForge(false);
    setEmpunhaduraSelecionada('');
    setDragonScale(false);
    setBainhasSelecionadas([]);
    setLaser(false);
    setGravacoes({
      lateral: { ativo: false, texto: '', fonte: '' },
      dorso: { ativo: false, texto: '' },
      logo: { ativo: false },
    });
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
      let acabamentoInfo = lamina.acabamento?.nome_opcao || '-';
      if (lamina.bruteForge) acabamentoInfo += ' + Brute Forge';
      mensagem += `- Acabamento: ${acabamentoInfo}\n`;
      let empunhaduraInfo = lamina.empunhadura?.nome_opcao || '-';
      if (lamina.dragonScale) empunhaduraInfo += ' + Dragon Scale';
      mensagem += `- Empunhadura: ${empunhaduraInfo}\n`;
      
      if (lamina.bainhas.length > 0) {
        const bainhasInfo = lamina.bainhas.map(b => `${b.bainha.nome_opcao}${b.corBainha ? ` (${b.corBainha})` : ''}`).join(', ');
        mensagem += `- Bainha(s): ${bainhasInfo}\n`;
      } else {
        mensagem += `- Bainha: -\n`;
      }
      
      // Gravações laser
      if (lamina.laser) {
        const gravacoesAtivas: string[] = [];
        if (lamina.gravacoes.lateral.ativo && lamina.gravacoes.lateral.texto) {
          const fonteInfo = lamina.gravacoes.lateral.fonte ? ` (${lamina.gravacoes.lateral.fonte})` : '';
          gravacoesAtivas.push(`Lateral: "${lamina.gravacoes.lateral.texto}"${fonteInfo}`);
        }
        if (lamina.gravacoes.dorso.ativo && lamina.gravacoes.dorso.texto) {
          gravacoesAtivas.push(`Dorso: "${lamina.gravacoes.dorso.texto}"`);
        }
        if (lamina.gravacoes.logo.ativo) {
          gravacoesAtivas.push(`Logo: Sim`);
        }
        mensagem += `- Laser: ${gravacoesAtivas.length > 0 ? gravacoesAtivas.join('; ') : 'Sim'}\n`;
      } else {
        mensagem += `- Laser: -\n`;
      }
      
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
    const sectionId = etapaKey || label;
    const isOpen = secaoAberta === sectionId;
    const selectedOption = options.find(o => o.id === selected);

    return (
      <Collapsible open={isOpen} onOpenChange={(open) => {
        setSecaoAberta(open ? sectionId : null);
        if (open) setShowExtras(false);
      }}>
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
                  setSecaoAberta(null);
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
            <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-3 w-3 text-muted-foreground" />
            <Input
              placeholder="Buscar modelo..."
              value={buscaModelo}
              onChange={(e) => setBuscaModelo(e.target.value)}
              className="pl-7 h-7 text-xs w-full"
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

            <div className="space-y-1.5">
              <CollapsibleSelect 
                options={acabamentosFiltrados} 
                selected={acabamentoSelecionado} 
                onSelect={setAcabamentoSelecionado} 
                label={acoAtualNome.toUpperCase().includes('SAE52100') ? "Acabamento (SAE52100)" : "Acabamento"}
                etapaKey="acabamento"
              />
              {acabamentoSelecionado && (
                <div className="flex items-center gap-2 pl-3">
                  <Checkbox
                    id="bruteForge"
                    checked={bruteForge}
                    onCheckedChange={(checked) => setBruteForge(checked === true)}
                    className="h-3.5 w-3.5"
                  />
                  <Label htmlFor="bruteForge" className="text-xs cursor-pointer">Brute Forge</Label>
                </div>
              )}
            </div>

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

            {/* Bainhas - Múltiplas */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="text-xs text-muted-foreground">Bainhas</span>
                  <InfoEtapaModal etapaKey="bainha" />
                </div>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => setBainhasSelecionadas([...bainhasSelecionadas, { bainhaId: '', corBainha: '' }])}
                  className="h-6 text-xs px-2"
                >
                  <Plus className="h-3 w-3 mr-1" />
                  Adicionar
                </Button>
              </div>
              
              {bainhasSelecionadas.length === 0 && (
                <p className="text-xs text-muted-foreground pl-2">Nenhuma bainha adicionada</p>
              )}
              
              {bainhasSelecionadas.map((bs, index) => (
                <div key={index} className="flex items-center gap-2 p-2 bg-muted rounded-lg">
                  <div className="flex-1 space-y-1.5">
                    <Select 
                      value={bs.bainhaId} 
                      onValueChange={(value) => {
                        const updated = [...bainhasSelecionadas];
                        updated[index].bainhaId = value;
                        setBainhasSelecionadas(updated);
                      }}
                    >
                      <SelectTrigger className="h-7 text-xs w-full">
                        <SelectValue placeholder="Tipo de bainha" />
                      </SelectTrigger>
                      <SelectContent>
                        {bainhas.map(bainha => (
                          <SelectItem key={bainha.id} value={bainha.id} className="text-xs">
                            {bainha.nome_opcao}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    
                    {bs.bainhaId && (
                      <Select 
                        value={bs.corBainha} 
                        onValueChange={(value) => {
                          const updated = [...bainhasSelecionadas];
                          updated[index].corBainha = value;
                          setBainhasSelecionadas(updated);
                        }}
                      >
                        <SelectTrigger className="h-7 text-xs w-full">
                          <SelectValue placeholder="Cor da bainha" />
                        </SelectTrigger>
                        <SelectContent>
                          {coresBainha.map(cor => (
                            <SelectItem key={cor.id} value={cor.nome_opcao} className="text-xs">
                              {cor.nome_opcao}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    )}
                  </div>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => {
                      setBainhasSelecionadas(bainhasSelecionadas.filter((_, i) => i !== index));
                    }}
                    className="h-7 w-7 p-0 text-destructive hover:text-destructive"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </div>
              ))}
            </div>

            {/* Extras colapsável */}
            <Collapsible open={showExtras} onOpenChange={(open) => { setShowExtras(open); if (open) setSecaoAberta(null); }}>
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
                    <div className="space-y-4 pl-5">
                      {/* Lateral */}
                      <div className="space-y-2 p-3 bg-muted/50 rounded-lg">
                        <div className="flex items-center gap-2">
                          <Checkbox
                            id="lateral"
                            checked={gravacoes.lateral.ativo}
                            onCheckedChange={(checked) => setGravacoes(prev => ({
                              ...prev,
                              lateral: { ...prev.lateral, ativo: checked === true }
                            }))}
                            className="h-3.5 w-3.5"
                          />
                          <Label htmlFor="lateral" className="text-xs font-medium cursor-pointer">Lateral</Label>
                        </div>
                        {gravacoes.lateral.ativo && (
                          <div className="space-y-2">
                            <div>
                              <Input
                                placeholder="Digite sua personalização."
                                value={gravacoes.lateral.texto}
                                onChange={(e) => {
                                  if (e.target.value.length <= 20) {
                                    setGravacoes(prev => ({
                                      ...prev,
                                      lateral: { ...prev.lateral, texto: e.target.value }
                                    }));
                                  }
                                }}
                                maxLength={20}
                                className="h-7 text-xs w-full"
                              />
                              <p className="text-[10px] text-muted-foreground mt-1">
                                {gravacoes.lateral.texto.length}/20 · Emojis não suportados
                              </p>
                            </div>
                            <div>
                              <Label className="text-[10px] text-muted-foreground">Fonte</Label>
                              <Select 
                                value={gravacoes.lateral.fonte} 
                                onValueChange={(value) => setGravacoes(prev => ({
                                  ...prev,
                                  lateral: { ...prev.lateral, fonte: value }
                                }))}
                              >
                                <SelectTrigger className="h-7 text-xs w-full">
                                  <SelectValue placeholder="Escolha sua fonte" />
                                </SelectTrigger>
                                <SelectContent>
                                  {FONTES_DISPONIVEIS.map(fonte => (
                                    <SelectItem key={fonte} value={fonte} className="text-xs">
                                      {fonte}
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            </div>
                          </div>
                        )}
                      </div>
                      
                      {/* Dorso */}
                      <div className="space-y-2 p-3 bg-muted/50 rounded-lg">
                        <div className="flex items-center gap-2">
                          <Checkbox
                            id="dorso"
                            checked={gravacoes.dorso.ativo}
                            onCheckedChange={(checked) => setGravacoes(prev => ({
                              ...prev,
                              dorso: { ...prev.dorso, ativo: checked === true }
                            }))}
                            className="h-3.5 w-3.5"
                          />
                          <Label htmlFor="dorso" className="text-xs font-medium cursor-pointer">Dorso</Label>
                        </div>
                        {gravacoes.dorso.ativo && (
                          <div>
                            <Input
                              placeholder="Digite sua personalização."
                              value={gravacoes.dorso.texto}
                              onChange={(e) => {
                                if (e.target.value.length <= 50) {
                                  setGravacoes(prev => ({
                                    ...prev,
                                    dorso: { ...prev.dorso, texto: e.target.value }
                                  }));
                                }
                              }}
                              maxLength={50}
                              className="h-7 text-xs w-full"
                            />
                            <p className="text-[10px] text-muted-foreground mt-1">
                              {gravacoes.dorso.texto.length}/50 · Emojis não suportados
                            </p>
                          </div>
                        )}
                      </div>
                      
                      {/* Logo */}
                      <div className="space-y-2 p-3 bg-muted/50 rounded-lg">
                        <div className="flex items-center gap-2">
                          <Checkbox
                            id="logo"
                            checked={gravacoes.logo.ativo}
                            onCheckedChange={(checked) => setGravacoes(prev => ({
                              ...prev,
                              logo: { ...prev.logo, ativo: checked === true }
                            }))}
                            className="h-3.5 w-3.5"
                          />
                          <Label htmlFor="logo" className="text-xs font-medium cursor-pointer">Logo</Label>
                        </div>
                        {gravacoes.logo.ativo && (
                          <p className="text-[10px] text-muted-foreground pl-5">
                            Apenas logotipos e símbolos em preto e branco poderão ser gravados. Envie o arquivo pelo WhatsApp ao solicitar o orçamento.
                          </p>
                        )}
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
                      placeholder="Texto embalagem..."
                      value={embalagemTextoGravacao}
                      onChange={(e) => setEmbalagemTextoGravacao(e.target.value)}
                      className="h-7 text-xs w-full"
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
                        {[lamina.aco?.nome_opcao, lamina.acabamento?.nome_opcao, lamina.bainhas.length > 0 ? `${lamina.bainhas.length} bainha(s)` : null].filter(Boolean).join(' • ')}
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
                  <span className="text-muted-foreground">Bainha(s)</span>
                  <span className="font-medium text-right">
                    {laminaModalAberta.bainhas.length > 0 
                      ? laminaModalAberta.bainhas.map((b, i) => (
                          <span key={i} className="block">
                            {b.bainha.nome_opcao}{b.corBainha && ` (${b.corBainha})`}
                          </span>
                        ))
                      : '-'}
                  </span>
                </div>
                {laminaModalAberta.laser && (
                  <div className="py-1 border-b border-border">
                    <span className="text-muted-foreground block mb-1">Laser</span>
                    <div className="font-medium text-sm space-y-0.5">
                      {laminaModalAberta.gravacoes.lateral.ativo && (
                        <p>Lateral: "{laminaModalAberta.gravacoes.lateral.texto}"{laminaModalAberta.gravacoes.lateral.fonte && ` (${laminaModalAberta.gravacoes.lateral.fonte})`}</p>
                      )}
                      {laminaModalAberta.gravacoes.dorso.ativo && (
                        <p>Dorso: "{laminaModalAberta.gravacoes.dorso.texto}"</p>
                      )}
                      {laminaModalAberta.gravacoes.logo.ativo && (
                        <p>Logo: Sim</p>
                      )}
                    </div>
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
