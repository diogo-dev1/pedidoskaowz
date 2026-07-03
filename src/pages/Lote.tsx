import { useState, useMemo, useRef } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { Upload, Search, Plus, ChevronDown, ChevronUp, Check, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import edcKnife from '@/assets/edc-knife.svg';

type StatusType = 'nao_comecado' | 'em_andamento' | 'concluido';

interface PedidoLote {
  id: string;
  data: string;
  codigo: string;
  nome: string;
  item: string;
  aco: string;
  acabamento: string;
  empunhadura: string;
  tipoBainha: string;
  corBainha: string;
  statusLamina: StatusType;
  statusEmpunhadura: StatusType;
  statusBainha: StatusType;
  entregue: boolean;
  prazo: string;
  observacoes: string;
  statusAco: StatusType;
  statusAcabamento: StatusType;
}

const statusColors: Record<StatusType, string> = {
  nao_comecado: 'bg-red-500',
  em_andamento: 'bg-yellow-500',
  concluido: 'bg-green-500',
};

const statusLabels: Record<StatusType, string> = {
  nao_comecado: 'Não começado',
  em_andamento: 'Em andamento',
  concluido: 'Concluído',
};

const statusBorderColors: Record<StatusType, string> = {
  nao_comecado: 'border-red-500/50',
  em_andamento: 'border-yellow-500/50',
  concluido: 'border-green-500/50',
};

const parseCSVStatus = (value: string): StatusType => {
  const lower = value?.toLowerCase().trim();
  if (lower === 'concluído' || lower === 'concluido' || lower === 'pronto' || lower === 'finalizado') return 'concluido';
  if (lower === 'em andamento' || lower === 'andamento') return 'em_andamento';
  return 'nao_comecado';
};

const cycleStatus = (current: StatusType): StatusType => {
  if (current === 'nao_comecado') return 'em_andamento';
  if (current === 'em_andamento') return 'concluido';
  return 'nao_comecado';
};

export default function Lote() {
  const [pedidos, setPedidos] = useState<PedidoLote[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [pedidoModalAberto, setPedidoModalAberto] = useState<PedidoLote | null>(null);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  
  // Estado para adicionar manual (similar ao simulador)
  const [buscaModelo, setBuscaModelo] = useState('');
  const [categoriaFiltro, setCategoriaFiltro] = useState('');
  const [newPedido, setNewPedido] = useState<Partial<PedidoLote>>({
    statusLamina: 'nao_comecado',
    statusEmpunhadura: 'nao_comecado',
    statusBainha: 'nao_comecado',
    statusAco: 'nao_comecado',
    statusAcabamento: 'nao_comecado',
    entregue: false,
  });

  // Buscar modelos para obter SVGs
  const { data: modelos } = useQuery({
    queryKey: ['modelos-lote'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('modelos')
        .select('*')
        .order('nome_modelo');
      if (error) throw error;
      return data;
    },
  });

  // Buscar componentes
  const { data: componentes } = useQuery({
    queryKey: ['componentes-lote'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('opcoes_componentes')
        .select('*')
        .order('tipo_opcao');
      if (error) throw error;
      return data;
    },
  });

  const acos = componentes?.filter(c => c.tipo_opcao === 'Aço') || [];
  const acabamentos = componentes?.filter(c => c.tipo_opcao === 'Acabamento') || [];
  const empunhaduras = componentes?.filter(c => c.tipo_opcao === 'Empunhadura') || [];
  const bainhas = componentes?.filter(c => c.tipo_opcao === 'Bainha') || [];
  const coresBainha = componentes?.filter(c => c.tipo_opcao === 'Cor de Bainha') || [];
  
  const categorias = ['EDC', 'Adaga', 'Campo', 'Cozinha', 'Defesa', 'KZR', 'Upsell'];

  const modelosFiltrados = modelos?.filter(m => {
    const matchBusca = m.nome_modelo.toLowerCase().includes(buscaModelo.toLowerCase());
    const matchCategoria = !categoriaFiltro || m.categoria === categoriaFiltro;
    return matchBusca && matchCategoria;
  }) || [];

  const mostrarModelos = categoriaFiltro !== '' || buscaModelo.trim() !== '';

  const filteredPedidos = useMemo(() => {
    if (!searchTerm) return pedidos;
    const lower = searchTerm.toLowerCase();
    return pedidos.filter(
      (p) =>
        p.nome.toLowerCase().includes(lower) ||
        p.item.toLowerCase().includes(lower)
    );
  }, [pedidos, searchTerm]);

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      const text = e.target?.result as string;
      const lines = text.split('\n').filter((line) => line.trim());
      
      const dataLines = lines.slice(1);
      
      const newPedidos: PedidoLote[] = dataLines.map((line, index) => {
        const values = line.split('\t').map((v) => v.trim());
        
        return {
          id: `${Date.now()}-${index}`,
          data: values[0] || '',
          codigo: values[1] || '',
          nome: values[2] || '',
          item: values[3] || '',
          aco: values[4] || '',
          acabamento: values[5] || '',
          empunhadura: values[6] || '',
          tipoBainha: values[7] || '',
          corBainha: values[8] || '',
          statusLamina: parseCSVStatus(values[9]),
          statusEmpunhadura: parseCSVStatus(values[10]),
          statusBainha: parseCSVStatus(values[11]),
          entregue: values[12]?.toLowerCase() === 'true',
          prazo: values[13] || '',
          observacoes: values[14] || '',
          statusAco: 'nao_comecado',
          statusAcabamento: 'nao_comecado',
        };
      });

      setPedidos(newPedidos);
      toast.success(`${newPedidos.length} pedidos carregados com sucesso!`);
    };
    reader.readAsText(file);
    event.target.value = '';
  };

  const updateStatus = (pedidoId: string, field: keyof PedidoLote, value: StatusType) => {
    setPedidos((prev) =>
      prev.map((p) =>
        p.id === pedidoId ? { ...p, [field]: value } : p
      )
    );
    // Atualizar também o modal se estiver aberto
    if (pedidoModalAberto?.id === pedidoId) {
      setPedidoModalAberto(prev => prev ? { ...prev, [field]: value } : null);
    }
  };

  const getModelSvg = (itemName: string): string | null => {
    if (!modelos) return null;
    const model = modelos.find(
      (m) => itemName.toLowerCase().includes(m.nome_modelo.toLowerCase())
    );
    return model?.imagem_modelo || null;
  };

  const getModeloImagem = (itemName: string) => {
    const svg = getModelSvg(itemName);
    return svg || edcKnife;
  };

  const handleAddPedido = () => {
    if (!newPedido.nome || !newPedido.item) {
      toast.error('Nome e Item são obrigatórios');
      return;
    }

    const pedido: PedidoLote = {
      id: `manual-${Date.now()}`,
      data: newPedido.data || '',
      codigo: newPedido.codigo || '',
      nome: newPedido.nome || '',
      item: newPedido.item || '',
      aco: newPedido.aco || '',
      acabamento: newPedido.acabamento || '',
      empunhadura: newPedido.empunhadura || '',
      tipoBainha: newPedido.tipoBainha || '',
      corBainha: newPedido.corBainha || '',
      statusLamina: newPedido.statusLamina || 'nao_comecado',
      statusEmpunhadura: newPedido.statusEmpunhadura || 'nao_comecado',
      statusBainha: newPedido.statusBainha || 'nao_comecado',
      statusAco: newPedido.statusAco || 'nao_comecado',
      statusAcabamento: newPedido.statusAcabamento || 'nao_comecado',
      entregue: newPedido.entregue || false,
      prazo: newPedido.prazo || '',
      observacoes: newPedido.observacoes || '',
    };

    setPedidos((prev) => [...prev, pedido]);
    setNewPedido({
      statusLamina: 'nao_comecado',
      statusEmpunhadura: 'nao_comecado',
      statusBainha: 'nao_comecado',
      statusAco: 'nao_comecado',
      statusAcabamento: 'nao_comecado',
      entregue: false,
    });
    setBuscaModelo('');
    setCategoriaFiltro('');
    setIsAddModalOpen(false);
    toast.success('Pedido adicionado com sucesso!');
  };

  const removerPedido = (id: string) => {
    setPedidos((prev) => prev.filter((p) => p.id !== id));
    setPedidoModalAberto(null);
    toast.success('Pedido removido');
  };

  // Componente para item com status clicável
  const StatusItem = ({ 
    label, 
    value, 
    status, 
    onStatusChange 
  }: { 
    label: string; 
    value: string; 
    status: StatusType;
    onStatusChange: () => void;
  }) => (
    <div 
      className={`bg-muted p-2.5 rounded-lg cursor-pointer transition-all border-2 ${statusBorderColors[status]} hover:opacity-80`}
      onClick={onStatusChange}
    >
      <div className="flex items-center justify-between">
        <div className="flex-1 min-w-0">
          <p className="text-muted-foreground text-xs">{label}</p>
          <p className="font-medium text-sm truncate">{value || '-'}</p>
        </div>
        <div className={`w-3 h-3 rounded-full ${statusColors[status]} flex-shrink-0 ml-2`} title={statusLabels[status]} />
      </div>
    </div>
  );

  return (
    <div className="p-4 md:p-6 space-y-6 bg-background min-h-screen">
      <div className="flex flex-col gap-4">
        <h1 className="text-2xl font-bold text-foreground">Lote de Produção</h1>
        
        {/* Actions Bar */}
        <div className="flex flex-col sm:flex-row gap-3">
          {/* Upload CSV */}
          <div className="relative">
            <input
              type="file"
              accept=".csv,.txt"
              onChange={handleFileUpload}
              className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
            />
            <Button variant="outline" className="w-full sm:w-auto">
              <Upload className="w-4 h-4 mr-2" />
              Upload CSV
            </Button>
          </div>

          {/* Add Manual */}
          <Dialog open={isAddModalOpen} onOpenChange={setIsAddModalOpen}>
            <DialogTrigger asChild>
              <Button variant="outline" className="w-full sm:w-auto">
                <Plus className="w-4 h-4 mr-2" />
                Adicionar Manual
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>Adicionar Pedido ao Lote</DialogTitle>
              </DialogHeader>
              <div className="space-y-4 py-4">
                {/* Dados do Cliente */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>Data</Label>
                    <Input
                      value={newPedido.data || ''}
                      onChange={(e) => setNewPedido({ ...newPedido, data: e.target.value })}
                      placeholder="DD/MM"
                    />
                  </div>
                  <div>
                    <Label>Código</Label>
                    <Input
                      value={newPedido.codigo || ''}
                      onChange={(e) => setNewPedido({ ...newPedido, codigo: e.target.value })}
                    />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>Nome do Cliente *</Label>
                    <Input
                      value={newPedido.nome || ''}
                      onChange={(e) => setNewPedido({ ...newPedido, nome: e.target.value })}
                    />
                  </div>
                  <div>
                    <Label>Prazo</Label>
                    <Input
                      value={newPedido.prazo || ''}
                      onChange={(e) => setNewPedido({ ...newPedido, prazo: e.target.value })}
                      placeholder="DD/MM"
                    />
                  </div>
                </div>

                {/* Seleção de Modelo - Similar ao Simulador */}
                <div className="bg-card rounded-lg border border-border p-4 space-y-3">
                  <div className="flex items-center gap-2">
                    <h3 className="font-semibold text-sm">Modelo da Lâmina *</h3>
                    <Badge variant="secondary" className="text-xs">Obrigatório</Badge>
                  </div>

                  {/* Filtros de Categoria */}
                  <div className="flex flex-wrap gap-1.5">
                    {categorias.map(cat => (
                      <Button
                        key={cat}
                        size="sm"
                        variant={categoriaFiltro === cat ? "default" : "outline"}
                        onClick={() => setCategoriaFiltro(cat === categoriaFiltro ? '' : cat)}
                        className="h-7 text-xs px-2"
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

                  {!mostrarModelos ? (
                    <div className="text-center py-4 text-xs text-muted-foreground border border-border rounded-lg">
                      Use a busca ou selecione uma categoria para ver os modelos
                    </div>
                  ) : modelosFiltrados.length === 0 ? (
                    <div className="text-center py-4 text-xs text-muted-foreground border border-border rounded-lg">
                      Nenhum modelo encontrado
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 gap-1.5 max-h-40 overflow-y-auto border border-border rounded-lg p-1.5">
                      {modelosFiltrados.map(modelo => (
                        <button
                          key={modelo.id}
                          onClick={() => setNewPedido({ ...newPedido, item: modelo.nome_modelo })}
                          className={`p-2 rounded-lg text-left transition-all ${
                            newPedido.item === modelo.nome_modelo
                              ? 'bg-accent text-accent-foreground shadow-md'
                              : 'bg-muted hover:bg-muted/80'
                          }`}
                        >
                          <div className="flex items-center justify-between gap-2">
                            <div className="flex-1 min-w-0">
                              <div className="font-medium text-xs truncate">{modelo.nome_modelo}</div>
                              {modelo.categoria && (
                                <Badge variant="outline" className="text-[10px] px-1 py-0 mt-0.5">
                                  {modelo.categoria}
                                </Badge>
                              )}
                            </div>
                            {newPedido.item === modelo.nome_modelo && <Check className="h-3 w-3 flex-shrink-0" />}
                          </div>
                        </button>
                      ))}
                    </div>
                  )}

                  {newPedido.item && (
                    <div className="flex items-center gap-2 p-2 bg-accent/10 rounded-lg">
                      <Check className="h-4 w-4 text-accent" />
                      <span className="text-sm font-medium">{newPedido.item}</span>
                    </div>
                  )}
                </div>

                {/* Componentes com Acordeões */}
                <Accordion type="single" collapsible className="w-full">
                  <AccordionItem value="aco" className="border-border">
                    <AccordionTrigger className="text-sm font-medium hover:no-underline py-3">
                      <span className="flex items-center gap-2">
                        Aço {newPedido.aco && <Badge variant="outline" className="ml-1 text-[10px]">Selecionado</Badge>}
                      </span>
                    </AccordionTrigger>
                    <AccordionContent className="space-y-1.5 pt-2">
                      {acos.map(aco => (
                        <button
                          key={aco.id}
                          onClick={() => setNewPedido({ ...newPedido, aco: aco.nome_opcao })}
                          className={`w-full p-2 rounded-lg text-left transition-all ${
                            newPedido.aco === aco.nome_opcao
                              ? 'bg-accent text-accent-foreground'
                              : 'bg-muted hover:bg-muted/80'
                          }`}
                        >
                          <div className="flex items-center justify-between">
                            <span className="text-sm">{aco.nome_opcao}</span>
                            {newPedido.aco === aco.nome_opcao && <Check className="h-4 w-4" />}
                          </div>
                        </button>
                      ))}
                    </AccordionContent>
                  </AccordionItem>

                  <AccordionItem value="acabamento" className="border-border">
                    <AccordionTrigger className="text-sm font-medium hover:no-underline py-3">
                      <span className="flex items-center gap-2">
                        Acabamento {newPedido.acabamento && <Badge variant="outline" className="ml-1 text-[10px]">Selecionado</Badge>}
                      </span>
                    </AccordionTrigger>
                    <AccordionContent className="space-y-1.5 pt-2">
                      {acabamentos.map(ac => (
                        <button
                          key={ac.id}
                          onClick={() => setNewPedido({ ...newPedido, acabamento: ac.nome_opcao })}
                          className={`w-full p-2 rounded-lg text-left transition-all ${
                            newPedido.acabamento === ac.nome_opcao
                              ? 'bg-accent text-accent-foreground'
                              : 'bg-muted hover:bg-muted/80'
                          }`}
                        >
                          <div className="flex items-center justify-between">
                            <span className="text-sm">{ac.nome_opcao}</span>
                            {newPedido.acabamento === ac.nome_opcao && <Check className="h-4 w-4" />}
                          </div>
                        </button>
                      ))}
                    </AccordionContent>
                  </AccordionItem>

                  <AccordionItem value="empunhadura" className="border-border">
                    <AccordionTrigger className="text-sm font-medium hover:no-underline py-3">
                      <span className="flex items-center gap-2">
                        Empunhadura {newPedido.empunhadura && <Badge variant="outline" className="ml-1 text-[10px]">Selecionado</Badge>}
                      </span>
                    </AccordionTrigger>
                    <AccordionContent className="space-y-1.5 pt-2">
                      {empunhaduras.map(emp => (
                        <button
                          key={emp.id}
                          onClick={() => setNewPedido({ ...newPedido, empunhadura: emp.nome_opcao })}
                          className={`w-full p-2 rounded-lg text-left transition-all ${
                            newPedido.empunhadura === emp.nome_opcao
                              ? 'bg-accent text-accent-foreground'
                              : 'bg-muted hover:bg-muted/80'
                          }`}
                        >
                          <div className="flex items-center justify-between">
                            <span className="text-sm">{emp.nome_opcao}</span>
                            {newPedido.empunhadura === emp.nome_opcao && <Check className="h-4 w-4" />}
                          </div>
                        </button>
                      ))}
                    </AccordionContent>
                  </AccordionItem>

                  <AccordionItem value="bainha" className="border-border">
                    <AccordionTrigger className="text-sm font-medium hover:no-underline py-3">
                      <span className="flex items-center gap-2">
                        Bainha {newPedido.tipoBainha && <Badge variant="outline" className="ml-1 text-[10px]">Selecionado</Badge>}
                      </span>
                    </AccordionTrigger>
                    <AccordionContent className="space-y-3 pt-2">
                      <div className="space-y-1.5">
                        {bainhas.map(ba => (
                          <button
                            key={ba.id}
                            onClick={() => setNewPedido({ ...newPedido, tipoBainha: ba.nome_opcao })}
                            className={`w-full p-2 rounded-lg text-left transition-all ${
                              newPedido.tipoBainha === ba.nome_opcao
                                ? 'bg-accent text-accent-foreground'
                                : 'bg-muted hover:bg-muted/80'
                            }`}
                          >
                            <div className="flex items-center justify-between">
                              <span className="text-sm">{ba.nome_opcao}</span>
                              {newPedido.tipoBainha === ba.nome_opcao && <Check className="h-4 w-4" />}
                            </div>
                          </button>
                        ))}
                      </div>
                      
                      {newPedido.tipoBainha && (
                        <div className="space-y-2">
                          <Label className="text-xs">Cor da Bainha</Label>
                          <Select
                            value={newPedido.corBainha || ''}
                            onValueChange={(v) => setNewPedido({ ...newPedido, corBainha: v })}
                          >
                            <SelectTrigger>
                              <SelectValue placeholder="Selecione a cor" />
                            </SelectTrigger>
                            <SelectContent>
                              {coresBainha.map(cor => (
                                <SelectItem key={cor.id} value={cor.nome_opcao}>
                                  {cor.nome_opcao}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                      )}
                    </AccordionContent>
                  </AccordionItem>
                </Accordion>

                {/* Observações */}
                <div>
                  <Label>Observações</Label>
                  <Input
                    value={newPedido.observacoes || ''}
                    onChange={(e) => setNewPedido({ ...newPedido, observacoes: e.target.value })}
                    placeholder="Observações adicionais..."
                  />
                </div>

                <Button onClick={handleAddPedido} className="w-full">
                  Adicionar ao Lote
                </Button>
              </div>
            </DialogContent>
          </Dialog>

          {/* Search */}
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Buscar por nome ou lâmina..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
        </div>

        {/* Stats */}
        {pedidos.length > 0 && (
          <div className="text-sm text-muted-foreground">
            {filteredPedidos.length} de {pedidos.length} pedidos
          </div>
        )}
      </div>

      {/* Cards Grid */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
        {filteredPedidos.map((pedido) => {
          const svgUrl = getModelSvg(pedido.item);

          return (
            <Card 
              key={pedido.id} 
              className="bg-card border-border overflow-hidden cursor-pointer hover:border-accent/50 transition-colors"
              onClick={() => setPedidoModalAberto(pedido)}
            >
              <CardHeader className="p-4 pb-2">
                <div className="flex items-start gap-3">
                  {/* SVG Preview */}
                  <div className="w-16 h-16 bg-white rounded-lg flex-shrink-0 flex items-center justify-center overflow-hidden border border-border">
                    <img
                      src={svgUrl || edcKnife}
                      alt={pedido.item}
                      className="w-full h-full object-contain p-1"
                      style={{ filter: 'contrast(1.2) brightness(0.95)' }}
                    />
                  </div>

                  {/* Info */}
                  <div className="flex-1 text-left min-w-0">
                    <CardTitle className="text-base font-semibold line-clamp-1">
                      {pedido.nome}
                    </CardTitle>
                    <p className="text-sm text-muted-foreground">{pedido.item}</p>
                    <p className="text-xs text-muted-foreground mt-1">
                      Código: {pedido.codigo} | Prazo: {pedido.prazo}
                    </p>
                  </div>
                </div>
              </CardHeader>

              <CardContent className="p-4 pt-2">
                {/* Status badges */}
                <div className="flex gap-1.5 flex-wrap">
                  <div className={`w-2 h-2 rounded-full ${statusColors[pedido.statusAco]}`} title={`Aço: ${statusLabels[pedido.statusAco]}`} />
                  <div className={`w-2 h-2 rounded-full ${statusColors[pedido.statusAcabamento]}`} title={`Acabamento: ${statusLabels[pedido.statusAcabamento]}`} />
                  <div className={`w-2 h-2 rounded-full ${statusColors[pedido.statusEmpunhadura]}`} title={`Empunhadura: ${statusLabels[pedido.statusEmpunhadura]}`} />
                  <div className={`w-2 h-2 rounded-full ${statusColors[pedido.statusBainha]}`} title={`Bainha: ${statusLabels[pedido.statusBainha]}`} />
                  <div className={`w-2 h-2 rounded-full ${statusColors[pedido.statusLamina]}`} title={`Lâmina: ${statusLabels[pedido.statusLamina]}`} />
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Empty State */}
      {pedidos.length === 0 && (
        <div className="text-center py-12">
          <p className="text-muted-foreground">
            Nenhum pedido no lote. Faça upload de um CSV ou adicione manualmente.
          </p>
        </div>
      )}

      {/* Modal de Detalhes do Pedido - Design do Simulador */}
      <Dialog open={!!pedidoModalAberto} onOpenChange={() => setPedidoModalAberto(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="text-lg font-bold">
              {pedidoModalAberto?.item || 'Detalhes da Lâmina'}
            </DialogTitle>
          </DialogHeader>

          {pedidoModalAberto && (
            <div className="space-y-3 text-sm">
              {/* Título */}
              <h3 className="text-center font-bold text-lg">{pedidoModalAberto.item}</h3>
              
              {/* SVG do modelo */}
              <div className="flex justify-center mb-4">
                <div className="w-full max-w-[200px] h-24 rounded-lg overflow-hidden border border-border bg-white p-2">
                  <img
                    src={getModeloImagem(pedidoModalAberto.item)}
                    alt="Modelo"
                    className="w-full h-full object-contain"
                    style={{ filter: 'contrast(1.2) brightness(0.95)' }}
                  />
                </div>
              </div>

              {/* Info do Cliente */}
              <div className="bg-muted/50 p-3 rounded-lg space-y-1">
                <p className="font-medium">{pedidoModalAberto.nome}</p>
                <p className="text-xs text-muted-foreground">
                  Código: {pedidoModalAberto.codigo} | Data: {pedidoModalAberto.data} | Prazo: {pedidoModalAberto.prazo}
                </p>
              </div>

              {/* Grid de Atributos com Status Clicável */}
              <div className="grid grid-cols-2 gap-2">
                <StatusItem
                  label="Modelo"
                  value={pedidoModalAberto.item}
                  status={pedidoModalAberto.statusLamina}
                  onStatusChange={() => updateStatus(pedidoModalAberto.id, 'statusLamina', cycleStatus(pedidoModalAberto.statusLamina))}
                />
                <StatusItem
                  label="Aço"
                  value={pedidoModalAberto.aco}
                  status={pedidoModalAberto.statusAco}
                  onStatusChange={() => updateStatus(pedidoModalAberto.id, 'statusAco', cycleStatus(pedidoModalAberto.statusAco))}
                />
                <StatusItem
                  label="Acabamento"
                  value={pedidoModalAberto.acabamento}
                  status={pedidoModalAberto.statusAcabamento}
                  onStatusChange={() => updateStatus(pedidoModalAberto.id, 'statusAcabamento', cycleStatus(pedidoModalAberto.statusAcabamento))}
                />
                <StatusItem
                  label="Empunhadura"
                  value={pedidoModalAberto.empunhadura}
                  status={pedidoModalAberto.statusEmpunhadura}
                  onStatusChange={() => updateStatus(pedidoModalAberto.id, 'statusEmpunhadura', cycleStatus(pedidoModalAberto.statusEmpunhadura))}
                />
                <StatusItem
                  label="Bainha"
                  value={pedidoModalAberto.tipoBainha}
                  status={pedidoModalAberto.statusBainha}
                  onStatusChange={() => updateStatus(pedidoModalAberto.id, 'statusBainha', cycleStatus(pedidoModalAberto.statusBainha))}
                />
                {pedidoModalAberto.corBainha && (
                  <div className="bg-muted p-2.5 rounded-lg">
                    <p className="text-muted-foreground text-xs">Cor da Bainha</p>
                    <p className="font-medium text-sm">{pedidoModalAberto.corBainha}</p>
                  </div>
                )}
              </div>

              {/* Observações */}
              {pedidoModalAberto.observacoes && (
                <div className="bg-accent/10 p-3 rounded-lg border border-accent/20">
                  <p className="text-muted-foreground text-xs">Observações</p>
                  <p className="font-medium">{pedidoModalAberto.observacoes}</p>
                </div>
              )}

              {/* Status Entrega */}
              <div className="flex items-center justify-between p-3 bg-muted rounded-lg">
                <span className="text-sm text-muted-foreground">Entregue:</span>
                <span
                  className={`text-sm font-medium ${
                    pedidoModalAberto.entregue ? 'text-green-500' : 'text-yellow-500'
                  }`}
                >
                  {pedidoModalAberto.entregue ? 'Sim' : 'Não'}
                </span>
              </div>

              {/* Legenda */}
              <div className="flex items-center justify-center gap-4 text-xs text-muted-foreground">
                <div className="flex items-center gap-1">
                  <div className="w-2 h-2 rounded-full bg-red-500" />
                  <span>Não começado</span>
                </div>
                <div className="flex items-center gap-1">
                  <div className="w-2 h-2 rounded-full bg-yellow-500" />
                  <span>Em andamento</span>
                </div>
                <div className="flex items-center gap-1">
                  <div className="w-2 h-2 rounded-full bg-green-500" />
                  <span>Concluído</span>
                </div>
              </div>

              <p className="text-xs text-center text-muted-foreground">
                Clique em cada item para alterar o status
              </p>

              <Button
                variant="destructive"
                className="w-full"
                onClick={() => removerPedido(pedidoModalAberto.id)}
              >
                <Trash2 className="h-4 w-4 mr-2" />
                Remover do Lote
              </Button>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
