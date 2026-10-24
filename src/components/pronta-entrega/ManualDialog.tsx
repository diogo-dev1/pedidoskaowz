import { useEffect, useState } from 'react';
import { Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';

interface Props {
  open: boolean;
  onClose: () => void;
  onDone: () => void;
}

export function ManualDialog({ open, onClose, onDone }: Props) {
  const [cliente, setCliente] = useState('');
  const [tel, setTel] = useState('');
  const [itens, setItens] = useState('');
  const [pago, setPago] = useState('');
  const [prazo, setPrazo] = useState(5);
  const [obs, setObs] = useState('');
  const [salvando, setSalvando] = useState(false);

  useEffect(() => {
    if (open) {
      setCliente(''); setTel(''); setItens(''); setObs(''); setPrazo(5);
      const d = new Date(); d.setMinutes(d.getMinutes() - d.getTimezoneOffset());
      setPago(d.toISOString().slice(0, 16));
    }
  }, [open]);

  const salvar = async () => {
    if (!cliente.trim() || !itens.trim()) { toast.error('Preencha o cliente e os itens'); return; }
    setSalvando(true);
    try {
      const { data, error } = await supabase.functions.invoke('sincronizar-pronta-entrega', {
        body: { acao: 'adicionar_manual', cliente_nome: cliente, cliente_telefone: tel, itens, data_pagamento: pago ? new Date(pago).toISOString() : undefined, prazo_dias_uteis: prazo, observacao: obs },
      });
      if (error || !data?.sucesso) throw new Error(data?.erro ?? error?.message);
      // Pedido manual já nasce visualizado no servidor.
      toast.success('Pedido manual adicionado em "Em preparo".');
      onDone(); onClose();
    } catch (e: any) { toast.error(e?.message ?? 'Erro ao salvar'); } finally { setSalvando(false); }
  };

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-md rounded-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Adicionar pedido manual</DialogTitle>
          <DialogDescription>Só para exceções que não passaram pelo Simulador nem pelo site.</DialogDescription>
        </DialogHeader>
        <div className="space-y-3">
          <div className="space-y-1"><Label>Cliente *</Label><Input value={cliente} onChange={(e) => setCliente(e.target.value)} className="h-11" /></div>
          <div className="space-y-1"><Label>Telefone</Label><Input value={tel} onChange={(e) => setTel(e.target.value)} inputMode="tel" className="h-11" /></div>
          <div className="space-y-1">
            <Label>Itens *</Label>
            <Textarea value={itens} onChange={(e) => setItens(e.target.value)} rows={3} placeholder={'Um por linha. Ex.:\n2x Push Dagger Compact\n1x Strop'} />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            <div className="space-y-1"><Label>Pago em</Label><Input type="datetime-local" value={pago} onChange={(e) => setPago(e.target.value)} className="h-11" /></div>
            <div className="space-y-1"><Label>Prazo (dias úteis)</Label><Input type="number" min={1} value={prazo} onChange={(e) => setPrazo(Math.max(1, Number(e.target.value) || 1))} className="h-11" /></div>
          </div>
          <div className="space-y-1"><Label>Observação</Label><Textarea value={obs} onChange={(e) => setObs(e.target.value)} rows={2} /></div>
        </div>
        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={onClose}>Cancelar</Button>
          <Button onClick={salvar} disabled={salvando} className="gap-1.5">{salvando && <Loader2 className="h-4 w-4 animate-spin" />} Adicionar</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
