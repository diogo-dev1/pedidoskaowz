import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { Trash2, Plus, MessageCircle } from 'lucide-react';
import { toast } from 'sonner';

interface ModeloBase {
  id: string;
  nome_modelo: string;
  preco_base: number;
  categoria: string | null;
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

interface CustomizarLaminaModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export default function CustomizarLaminaModal({ open, onOpenChange }: CustomizarLaminaModalProps) {
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
  
  // Lista de lâminas customizadas
  const [laminasCustomizadas, setLaminasCustomizadas] = useState<LaminaCustomizada[]>([]);

  useEffect(() => {
    if (open) {
      carregarDados();
    }
  }, [open]);

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
    
    // Limpar e fechar
    setLaminasCustomizadas([]);
    limparFormulario();
    onOpenChange(false);
    toast.success('Redirecionando para WhatsApp...');
  };

  const subtotalAtual = calcularSubtotal();
  const totalGeral = laminasCustomizadas.reduce((sum, l) => sum + l.subtotal, 0) + subtotalAtual;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-2xl">Monte Sua Própria Lâmina</DialogTitle>
        </DialogHeader>

        {loading ? (
          <div className="py-8 text-center text-zinc-500">Carregando opções...</div>
        ) : (
          <div className="space-y-6">
            {/* Formulário de configuração */}
            <div className="space-y-4 p-4 border border-zinc-200 rounded-lg bg-zinc-50">
              <h3 className="font-semibold text-lg text-zinc-900">Configurar Lâmina</h3>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Modelo *</Label>
                  <Select value={modeloSelecionado} onValueChange={setModeloSelecionado}>
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione o modelo" />
                    </SelectTrigger>
                    <SelectContent>
                      {modelos.map(modelo => (
                        <SelectItem key={modelo.id} value={modelo.id}>
                          {modelo.nome_modelo} - R$ {modelo.preco_base.toFixed(2)}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>Tipo de Aço</Label>
                  <Select value={acoSelecionado} onValueChange={setAcoSelecionado}>
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione o aço" />
                    </SelectTrigger>
                    <SelectContent>
                      {acos.map(aco => (
                        <SelectItem key={aco.id} value={aco.id}>
                          {aco.nome_opcao} {aco.preco_adicional > 0 && `(+R$ ${aco.preco_adicional.toFixed(2)})`}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>Acabamento</Label>
                  <Select value={acabamentoSelecionado} onValueChange={setAcabamentoSelecionado}>
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione o acabamento" />
                    </SelectTrigger>
                    <SelectContent>
                      {acabamentos.map(acabamento => (
                        <SelectItem key={acabamento.id} value={acabamento.id}>
                          {acabamento.nome_opcao} {acabamento.preco_adicional > 0 && `(+R$ ${acabamento.preco_adicional.toFixed(2)})`}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>Empunhadura</Label>
                  <Select value={empunhaduraSelecionada} onValueChange={setEmpunhaduraSelecionada}>
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione a empunhadura" />
                    </SelectTrigger>
                    <SelectContent>
                      {empunhaduras.map(empunhadura => (
                        <SelectItem key={empunhadura.id} value={empunhadura.id}>
                          {empunhadura.nome_opcao} {empunhadura.preco_adicional > 0 && `(+R$ ${empunhadura.preco_adicional.toFixed(2)})`}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>Tipo de Bainha</Label>
                  <Select value={bainhaSelecionada} onValueChange={setBainhaSelecionada}>
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione a bainha" />
                    </SelectTrigger>
                    <SelectContent>
                      {bainhas.map(bainha => (
                        <SelectItem key={bainha.id} value={bainha.id}>
                          {bainha.nome_opcao} {bainha.preco_adicional > 0 && `(+R$ ${bainha.preco_adicional.toFixed(2)})`}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>Cor da Bainha</Label>
                  <Input
                    placeholder="Ex: Preta, Marrom..."
                    value={corBainha}
                    onChange={(e) => setCorBainha(e.target.value)}
                  />
                </div>
              </div>

              <div className="space-y-3">
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="laser"
                    checked={laser}
                    onCheckedChange={(checked) => setLaser(checked as boolean)}
                  />
                  <Label htmlFor="laser" className="cursor-pointer">
                    Personalização à Laser (+R$ 30,00)
                  </Label>
                </div>

                {laser && (
                  <Input
                    placeholder="Digite o texto para gravação"
                    value={textoLaser}
                    onChange={(e) => setTextoLaser(e.target.value)}
                  />
                )}
              </div>

              <div className="flex items-center justify-between pt-4 border-t border-zinc-200">
                <div className="text-lg font-semibold text-zinc-900">
                  Subtotal: <span className="text-accent">R$ {subtotalAtual.toFixed(2)}</span>
                </div>
                <Button onClick={adicionarLamina} className="bg-accent hover:bg-accent/90">
                  <Plus className="h-4 w-4 mr-2" />
                  Adicionar Lâmina
                </Button>
              </div>
            </div>

            {/* Lista de lâminas adicionadas */}
            {laminasCustomizadas.length > 0 && (
              <div className="space-y-3">
                <h3 className="font-semibold text-lg text-zinc-900">
                  Lâminas Adicionadas ({laminasCustomizadas.length})
                </h3>
                
                <div className="space-y-2 max-h-64 overflow-y-auto">
                  {laminasCustomizadas.map((lamina, index) => (
                    <div key={lamina.id} className="p-3 bg-white border border-zinc-200 rounded-lg flex items-start justify-between gap-3">
                      <div className="flex-1 text-sm">
                        <div className="font-semibold text-zinc-900 mb-1">
                          {index + 1}. {lamina.modelo?.nome_modelo}
                        </div>
                        <div className="text-zinc-600 space-y-0.5">
                          {lamina.aco && <div>Aço: {lamina.aco.nome_opcao}</div>}
                          {lamina.acabamento && <div>Acabamento: {lamina.acabamento.nome_opcao}</div>}
                          {lamina.empunhadura && <div>Empunhadura: {lamina.empunhadura.nome_opcao}</div>}
                          {lamina.bainha && <div>Bainha: {lamina.bainha.nome_opcao}</div>}
                          {lamina.corBainha && <div>Cor: {lamina.corBainha}</div>}
                          {lamina.laser && <div>Laser: {lamina.textoLaser || 'Sim'}</div>}
                        </div>
                        <Badge className="mt-2 bg-accent text-white">
                          R$ {lamina.subtotal.toFixed(2)}
                        </Badge>
                      </div>
                      <Button
                        size="icon"
                        variant="ghost"
                        onClick={() => removerLamina(lamina.id)}
                        className="text-destructive hover:bg-destructive/10"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Ações finais */}
            <div className="flex flex-col gap-3 pt-4 border-t border-zinc-200">
              <div className="text-xl font-bold text-zinc-900">
                Total Geral: <span className="text-accent">R$ {laminasCustomizadas.reduce((sum, l) => sum + l.subtotal, 0).toFixed(2)}</span>
              </div>
              
              <Button
                onClick={enviarWhatsApp}
                disabled={laminasCustomizadas.length === 0}
                className="w-full bg-accent hover:bg-accent/90 text-white font-semibold h-12"
              >
                <MessageCircle className="h-5 w-5 mr-2" />
                Enviar Orçamento via WhatsApp
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
