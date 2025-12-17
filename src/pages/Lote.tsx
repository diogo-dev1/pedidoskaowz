import { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Upload, Search, Plus, ChevronDown, ChevronUp, Circle } from 'lucide-react';
import { toast } from 'sonner';

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
  // Status individual para cada atributo
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

const parseCSVStatus = (value: string): StatusType => {
  const lower = value?.toLowerCase().trim();
  if (lower === 'concluído' || lower === 'concluido' || lower === 'pronto' || lower === 'finalizado') return 'concluido';
  if (lower === 'em andamento' || lower === 'andamento') return 'em_andamento';
  return 'nao_comecado';
};

export default function Lote() {
  const [pedidos, setPedidos] = useState<PedidoLote[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [expandedCards, setExpandedCards] = useState<Set<string>>(new Set());
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
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
        .select('*');
      if (error) throw error;
      return data;
    },
  });

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
      
      // Skip header row
      const dataLines = lines.slice(1);
      
      const newPedidos: PedidoLote[] = dataLines.map((line, index) => {
        // Handle tab-separated values
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

  const toggleCard = (id: string) => {
    setExpandedCards((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(id)) {
        newSet.delete(id);
      } else {
        newSet.add(id);
      }
      return newSet;
    });
  };

  const updateStatus = (pedidoId: string, field: keyof PedidoLote, value: StatusType) => {
    setPedidos((prev) =>
      prev.map((p) =>
        p.id === pedidoId ? { ...p, [field]: value } : p
      )
    );
  };

  const getModelSvg = (itemName: string): string | null => {
    if (!modelos) return null;
    const model = modelos.find(
      (m) => itemName.toLowerCase().includes(m.nome_modelo.toLowerCase())
    );
    return model?.imagem_modelo || null;
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
    setIsAddModalOpen(false);
    toast.success('Pedido adicionado com sucesso!');
  };

  const StatusSelector = ({ 
    value, 
    onChange 
  }: { 
    value: StatusType; 
    onChange: (value: StatusType) => void;
  }) => (
    <div className="flex gap-1">
      {(['nao_comecado', 'em_andamento', 'concluido'] as StatusType[]).map((status) => (
        <button
          key={status}
          onClick={() => onChange(status)}
          className={`w-4 h-4 rounded-full transition-all ${statusColors[status]} ${
            value === status ? 'ring-2 ring-offset-1 ring-foreground' : 'opacity-40 hover:opacity-70'
          }`}
          title={statusLabels[status]}
        />
      ))}
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
            <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>Adicionar Pedido</DialogTitle>
              </DialogHeader>
              <div className="grid gap-4 py-4">
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
                <div>
                  <Label>Nome do Cliente *</Label>
                  <Input
                    value={newPedido.nome || ''}
                    onChange={(e) => setNewPedido({ ...newPedido, nome: e.target.value })}
                  />
                </div>
                <div>
                  <Label>Item (Modelo) *</Label>
                  <Input
                    value={newPedido.item || ''}
                    onChange={(e) => setNewPedido({ ...newPedido, item: e.target.value })}
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>Aço</Label>
                    <Input
                      value={newPedido.aco || ''}
                      onChange={(e) => setNewPedido({ ...newPedido, aco: e.target.value })}
                    />
                  </div>
                  <div>
                    <Label>Acabamento</Label>
                    <Input
                      value={newPedido.acabamento || ''}
                      onChange={(e) => setNewPedido({ ...newPedido, acabamento: e.target.value })}
                    />
                  </div>
                </div>
                <div>
                  <Label>Empunhadura</Label>
                  <Input
                    value={newPedido.empunhadura || ''}
                    onChange={(e) => setNewPedido({ ...newPedido, empunhadura: e.target.value })}
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>Tipo Bainha</Label>
                    <Input
                      value={newPedido.tipoBainha || ''}
                      onChange={(e) => setNewPedido({ ...newPedido, tipoBainha: e.target.value })}
                    />
                  </div>
                  <div>
                    <Label>Cor Bainha</Label>
                    <Input
                      value={newPedido.corBainha || ''}
                      onChange={(e) => setNewPedido({ ...newPedido, corBainha: e.target.value })}
                    />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>Prazo</Label>
                    <Input
                      value={newPedido.prazo || ''}
                      onChange={(e) => setNewPedido({ ...newPedido, prazo: e.target.value })}
                      placeholder="DD/MM"
                    />
                  </div>
                  <div>
                    <Label>Entregue</Label>
                    <Select
                      value={newPedido.entregue ? 'true' : 'false'}
                      onValueChange={(v) => setNewPedido({ ...newPedido, entregue: v === 'true' })}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="false">Não</SelectItem>
                        <SelectItem value="true">Sim</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div>
                  <Label>Observações</Label>
                  <Input
                    value={newPedido.observacoes || ''}
                    onChange={(e) => setNewPedido({ ...newPedido, observacoes: e.target.value })}
                  />
                </div>
                <Button onClick={handleAddPedido} className="w-full">
                  Adicionar
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
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {filteredPedidos.map((pedido) => {
          const isExpanded = expandedCards.has(pedido.id);
          const svgUrl = getModelSvg(pedido.item);

          return (
            <Collapsible key={pedido.id} open={isExpanded} onOpenChange={() => toggleCard(pedido.id)}>
              <Card className="bg-card border-border overflow-hidden">
                <CollapsibleTrigger className="w-full">
                  <CardHeader className="p-4 pb-2">
                    <div className="flex items-start gap-3">
                      {/* SVG Preview */}
                      <div className="w-16 h-16 bg-zinc-800 rounded-lg flex-shrink-0 flex items-center justify-center overflow-hidden">
                        {svgUrl ? (
                          <img
                            src={svgUrl}
                            alt={pedido.item}
                            className="w-full h-full object-contain p-1 brightness-0 invert"
                          />
                        ) : (
                          <span className="text-xs text-muted-foreground text-center px-1">
                            {pedido.item.substring(0, 3)}
                          </span>
                        )}
                      </div>

                      {/* Info */}
                      <div className="flex-1 text-left">
                        <CardTitle className="text-base font-semibold line-clamp-1">
                          {pedido.nome}
                        </CardTitle>
                        <p className="text-sm text-muted-foreground">{pedido.item}</p>
                        <p className="text-xs text-muted-foreground mt-1">
                          Código: {pedido.codigo} | Prazo: {pedido.prazo}
                        </p>
                      </div>

                      {/* Expand Icon */}
                      <div className="text-muted-foreground">
                        {isExpanded ? (
                          <ChevronUp className="w-5 h-5" />
                        ) : (
                          <ChevronDown className="w-5 h-5" />
                        )}
                      </div>
                    </div>
                  </CardHeader>
                </CollapsibleTrigger>

                <CollapsibleContent>
                  <CardContent className="p-4 pt-2 space-y-3">
                    {/* Atributos com Status */}
                    <div className="space-y-2 text-sm">
                      <div className="flex items-center justify-between">
                        <span className="text-muted-foreground">Aço:</span>
                        <div className="flex items-center gap-2">
                          <span className="font-medium">{pedido.aco || '-'}</span>
                          <StatusSelector
                            value={pedido.statusAco}
                            onChange={(v) => updateStatus(pedido.id, 'statusAco', v)}
                          />
                        </div>
                      </div>

                      <div className="flex items-center justify-between">
                        <span className="text-muted-foreground">Acabamento:</span>
                        <div className="flex items-center gap-2">
                          <span className="font-medium">{pedido.acabamento || '-'}</span>
                          <StatusSelector
                            value={pedido.statusAcabamento}
                            onChange={(v) => updateStatus(pedido.id, 'statusAcabamento', v)}
                          />
                        </div>
                      </div>

                      <div className="flex items-center justify-between">
                        <span className="text-muted-foreground">Empunhadura:</span>
                        <div className="flex items-center gap-2">
                          <span className="font-medium">{pedido.empunhadura || '-'}</span>
                          <StatusSelector
                            value={pedido.statusEmpunhadura}
                            onChange={(v) => updateStatus(pedido.id, 'statusEmpunhadura', v)}
                          />
                        </div>
                      </div>

                      <div className="flex items-center justify-between">
                        <span className="text-muted-foreground">Bainha:</span>
                        <div className="flex items-center gap-2">
                          <span className="font-medium">
                            {pedido.tipoBainha} {pedido.corBainha && `(${pedido.corBainha})`}
                          </span>
                          <StatusSelector
                            value={pedido.statusBainha}
                            onChange={(v) => updateStatus(pedido.id, 'statusBainha', v)}
                          />
                        </div>
                      </div>

                      <div className="flex items-center justify-between">
                        <span className="text-muted-foreground">Lâmina:</span>
                        <div className="flex items-center gap-2">
                          <span className="font-medium">{pedido.item}</span>
                          <StatusSelector
                            value={pedido.statusLamina}
                            onChange={(v) => updateStatus(pedido.id, 'statusLamina', v)}
                          />
                        </div>
                      </div>
                    </div>

                    {/* Observações */}
                    {pedido.observacoes && (
                      <div className="pt-2 border-t border-border">
                        <p className="text-xs text-muted-foreground">
                          <span className="font-medium">Obs:</span> {pedido.observacoes}
                        </p>
                      </div>
                    )}

                    {/* Status Entrega */}
                    <div className="pt-2 border-t border-border flex items-center justify-between">
                      <span className="text-sm text-muted-foreground">Entregue:</span>
                      <span
                        className={`text-sm font-medium ${
                          pedido.entregue ? 'text-green-500' : 'text-yellow-500'
                        }`}
                      >
                        {pedido.entregue ? 'Sim' : 'Não'}
                      </span>
                    </div>
                  </CardContent>
                </CollapsibleContent>
              </Card>
            </Collapsible>
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
    </div>
  );
}
