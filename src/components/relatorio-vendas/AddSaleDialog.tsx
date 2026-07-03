import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Plus, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';

interface AddSaleDialogProps {
  onSaleAdded?: () => void;
}

const CHANNELS = ['Whatsapp', 'Instagram', 'Site', 'Mel', 'Daniel', 'Outro'];
const SELLERS = ['Diogo', 'Daniel', 'Mel', 'Site'];
const PAYMENT_METHODS = ['PIX', 'Cartão de Crédito', 'Pix Parcelado', 'Boleto', 'Dinheiro'];
const STATUS_OPTIONS = ['Pago', 'Pendente', 'Cancelado'];

export function AddSaleDialog({ onSaleAdded }: AddSaleDialogProps) {
  const [open, setOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const [formData, setFormData] = useState({
    date: new Date().toISOString().split('T')[0],
    name: '',
    channel: '',
    seller: '',
    value: '',
    paymentMethod: '',
    status: 'Pago',
    item: '',
    observation: '',
    coupon: '',
  });

  const resetForm = () => {
    setFormData({
      date: new Date().toISOString().split('T')[0],
      name: '',
      channel: '',
      seller: '',
      value: '',
      paymentMethod: '',
      status: 'Pago',
      item: '',
      observation: '',
      coupon: '',
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.name || !formData.channel || !formData.seller || !formData.value || !formData.paymentMethod || !formData.item) {
      toast.error('Preencha todos os campos obrigatórios.');
      return;
    }

    setIsLoading(true);

    try {
      const valueNumber = parseFloat(formData.value.replace(',', '.'));

      if (isNaN(valueNumber) || valueNumber <= 0) {
        throw new Error('Valor inválido');
      }

      const { data, error } = await supabase.functions.invoke('add-sale', {
        body: {
          ...formData,
          value: valueNumber,
        },
      });

      if (error) throw error;
      if (!data.success) throw new Error(data.error);

      toast.success('Venda adicionada com sucesso.');

      resetForm();
      setOpen(false);
      onSaleAdded?.();
    } catch (error) {
      console.error('Error adding sale:', error);
      toast.error(error instanceof Error ? error.message : 'Erro ao adicionar venda. Tente novamente.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm" className="gap-2">
          <Plus className="h-4 w-4" />
          Nova Venda
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Adicionar Nova Venda</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="date">Data *</Label>
              <Input
                id="date"
                type="date"
                value={formData.date}
                onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="value">Valor (R$) *</Label>
              <Input
                id="value"
                type="text"
                placeholder="0,00"
                value={formData.value}
                onChange={(e) => setFormData({ ...formData, value: e.target.value })}
                required
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="name">Nome do Cliente *</Label>
            <Input
              id="name"
              type="text"
              placeholder="Nome do cliente"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="item">Item/Produto *</Label>
            <Input
              id="item"
              type="text"
              placeholder="Produto vendido"
              value={formData.item}
              onChange={(e) => setFormData({ ...formData, item: e.target.value })}
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="channel">Canal *</Label>
              <Select
                value={formData.channel}
                onValueChange={(value) => setFormData({ ...formData, channel: value })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecione" />
                </SelectTrigger>
                <SelectContent>
                  {CHANNELS.map((channel) => (
                    <SelectItem key={channel} value={channel}>
                      {channel}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="seller">Vendedor *</Label>
              <Select
                value={formData.seller}
                onValueChange={(value) => setFormData({ ...formData, seller: value })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecione" />
                </SelectTrigger>
                <SelectContent>
                  {SELLERS.map((seller) => (
                    <SelectItem key={seller} value={seller}>
                      {seller}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="paymentMethod">Forma de Pagamento *</Label>
              <Select
                value={formData.paymentMethod}
                onValueChange={(value) => setFormData({ ...formData, paymentMethod: value })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecione" />
                </SelectTrigger>
                <SelectContent>
                  {PAYMENT_METHODS.map((method) => (
                    <SelectItem key={method} value={method}>
                      {method}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="status">Status</Label>
              <Select
                value={formData.status}
                onValueChange={(value) => setFormData({ ...formData, status: value })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecione" />
                </SelectTrigger>
                <SelectContent>
                  {STATUS_OPTIONS.map((status) => (
                    <SelectItem key={status} value={status}>
                      {status}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="coupon">Cupom</Label>
            <Input
              id="coupon"
              type="text"
              placeholder="Código do cupom (opcional)"
              value={formData.coupon}
              onChange={(e) => setFormData({ ...formData, coupon: e.target.value })}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="observation">Observação</Label>
            <Textarea
              id="observation"
              placeholder="Observações adicionais (opcional)"
              value={formData.observation}
              onChange={(e) => setFormData({ ...formData, observation: e.target.value })}
              rows={2}
            />
          </div>

          <div className="flex justify-end gap-2 pt-4">
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              Cancelar
            </Button>
            <Button type="submit" disabled={isLoading}>
              {isLoading ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Salvando...
                </>
              ) : (
                'Salvar Venda'
              )}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
