import { useEffect, useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Textarea } from '@/components/ui/textarea';
import { AlertTriangle, Save, FileText, Loader2, User, MapPin, Package, Truck } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import type { PedidoComItens } from '@/hooks/usePedidosByLote';
import { StatusDot, type ItemStatus } from '@/components/producao/StatusDot';
import { ComentariosSection } from './ComentariosSection';
import { ClienteDataParser } from './ClienteDataParser';
import { gerarFichaExpedicao } from './FichaExpedicaoPDF';
import type { ClientData } from '@/lib/parseClientData';

interface Expedicao {
  id: string;
  pedido_id: string;
  nome_destinatario: string | null;
  cep_destino: string | null;
  endereco_completo: string | null;
  tipo_caixa: string | null;
  espuma_cortada: boolean | null;
  transportadora: string | null;
  codigo_rastreio: string | null;
  data_postagem: string | null;
  status: string | null;
  brindes: string | null;
  observacoes: string | null;
}

interface Props {
  open: boolean;
  onClose: () => void;
  pedido: PedidoComItens | null;
  loteId: string | null;
}

const CAIXA_OPTIONS = ['Patola', 'Tradicional/Comum', 'Maleta GG', 'Maleta Vinho'];
const STATUS_OPTIONS = ['aguardando', 'conferida', 'embalada', 'postada', 'entregue'];

function InfoField({ label, value }: { label: string; value: string | null | undefined }) {
  return (
    <div>
      <span className="text-[10px] text-muted-foreground uppercase tracking-wider">{label}</span>
      <p className="text-sm">{value || '—'}</p>
    </div>
  );
}

export function ExpedicaoDetalheModal({ open, onClose, pedido, loteId }: Props) {
  const qc = useQueryClient();
  const [exp, setExp] = useState<Expedicao | null>(null);
  const [loadingExp, setLoadingExp] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!pedido || !open) return;
    setLoadingExp(true);
    supabase
      .from('expedicao')
      .select('*')
      .eq('pedido_id', pedido.id)
      .maybeSingle()
      .then(({ data }) => {
        setExp((data as Expedicao | null) ?? {
          id: '',
          pedido_id: pedido.id,
          nome_destinatario: pedido.cliente_nome,
          cep_destino: pedido.cliente_cep,
          endereco_completo: [pedido.cliente_endereco, pedido.cliente_numero, pedido.cliente_bairro, pedido.cliente_cidade, pedido.cliente_estado].filter(Boolean).join(', '),
          tipo_caixa: pedido.embalagem,
          espuma_cortada: false,
          transportadora: 'Correios',
          codigo_rastreio: null,
          data_postagem: null,
          status: 'aguardando',
          brindes: pedido.brindes,
          observacoes: null,
        });
        setLoadingExp(false);
      });
  }, [pedido, open]);

  const saveExpedicao = async () => {
    if (!exp || !pedido) return;
    setSaving(true);
    try {
      if (exp.id) {
        await supabase.from('expedicao').update({
          nome_destinatario: exp.nome_destinatario,
          cep_destino: exp.cep_destino,
          endereco_completo: exp.endereco_completo,
          tipo_caixa: exp.tipo_caixa,
          espuma_cortada: exp.espuma_cortada,
          transportadora: exp.transportadora,
          codigo_rastreio: exp.codigo_rastreio,
          data_postagem: exp.data_postagem,
          status: exp.status,
          brindes: exp.brindes,
          observacoes: exp.observacoes,
        }).eq('id', exp.id);
      } else {
        const { data } = await supabase.from('expedicao').insert({
          pedido_id: pedido.id,
          nome_destinatario: exp.nome_destinatario,
          cep_destino: exp.cep_destino,
          endereco_completo: exp.endereco_completo,
          tipo_caixa: exp.tipo_caixa,
          espuma_cortada: exp.espuma_cortada,
          transportadora: exp.transportadora,
          codigo_rastreio: exp.codigo_rastreio,
          data_postagem: exp.data_postagem,
          status: exp.status,
          brindes: exp.brindes,
          observacoes: exp.observacoes,
        }).select().single();
        if (data) setExp(data as Expedicao);
      }
      toast.success('Expedição salva');
      qc.invalidateQueries({ queryKey: ['pedidos-lote', loteId] });
      qc.invalidateQueries({ queryKey: ['expedicao-lote', loteId] });
    } catch {
      toast.error('Erro ao salvar expedição');
    } finally {
      setSaving(false);
    }
  };

  const handleClientDataParsed = async (data: Partial<ClientData>) => {
    if (!pedido) return;
    const updates: Record<string, string | null> = {};
    if (data.nome) updates.cliente_nome = data.nome;
    if (data.cpf) updates.cliente_cpf = data.cpf;
    if (data.cep) updates.cliente_cep = data.cep;
    if (data.estado) updates.cliente_estado = data.estado;
    if (data.cidade) updates.cliente_cidade = data.cidade;
    if (data.bairro) updates.cliente_bairro = data.bairro;
    if (data.endereco) updates.cliente_endereco = data.endereco;
    if (data.numero) updates.cliente_numero = data.numero;
    if (data.complemento) updates.cliente_complemento = data.complemento;
    if (data.celular) updates.cliente_celular = data.celular;
    if (data.email) updates.cliente_email = data.email;
    if (data.dataNascimento) {
      // Converte DD/MM/YYYY → YYYY-MM-DD (formato que o Supabase aceita para DATE)
      const m = data.dataNascimento.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
      updates.cliente_nascimento = m
        ? `${m[3]}-${m[2].padStart(2, '0')}-${m[1].padStart(2, '0')}`
        : data.dataNascimento;
    }

    const { error } = await supabase.from('pedidos').update(updates).eq('id', pedido.id);
    if (error) {
      console.error('Erro ao salvar dados do cliente:', error);
      toast.error('Erro ao salvar dados do cliente');
      return;
    }

    // Preenche automaticamente as informações de envio com os dados do cliente
    const enderecoCompleto = [
      data.endereco,
      data.numero,
      data.bairro,
      data.cidade,
      data.estado,
    ].filter(Boolean).join(', ');

    const expUpdate = {
      nome_destinatario: data.nome || pedido.cliente_nome,
      cep_destino: data.cep || null,
      endereco_completo: enderecoCompleto || null,
    };

    if (exp?.id) {
      await supabase.from('expedicao').update(expUpdate).eq('id', exp.id);
      setExp((prev) => prev ? { ...prev, ...expUpdate } : prev);
    } else {
      const { data: novaExp } = await supabase.from('expedicao').insert({
        pedido_id: pedido.id,
        ...expUpdate,
        tipo_caixa: pedido.embalagem,
        transportadora: 'Correios',
        status: 'aguardando',
      }).select().single();
      if (novaExp) setExp(novaExp as Expedicao);
    }

    toast.success('Dados do cliente e envio atualizados');
    qc.invalidateQueries({ queryKey: ['pedidos-lote', loteId] });
    qc.invalidateQueries({ queryKey: ['expedicao-lote', loteId] });
  };

  if (!pedido) return null;

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {pedido.cliente_nome}
            {pedido.bloqueado_expedicao && (
              <Badge variant="destructive" className="text-[10px] gap-1">
                <AlertTriangle className="h-3 w-3" /> Bloqueado
              </Badge>
            )}
          </DialogTitle>
          <p className="text-xs text-muted-foreground">{pedido.numero_pedido} · {pedido.pedido_itens.length} {pedido.pedido_itens.length === 1 ? 'item' : 'itens'}</p>
        </DialogHeader>

        <div className="space-y-6">
          {/* Seção 1: Dados do Cliente */}
          <section>
            <div className="flex items-center gap-2 mb-3">
              <User className="h-4 w-4 text-muted-foreground" />
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Dados do Cliente</p>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              <InfoField label="Nome" value={pedido.cliente_nome} />
              <InfoField label="CPF" value={pedido.cliente_cpf} />
              <InfoField label="Celular" value={pedido.cliente_celular} />
              <InfoField label="E-mail" value={pedido.cliente_email} />
              <InfoField label="Nascimento" value={pedido.cliente_nascimento} />
              <InfoField label="CEP" value={pedido.cliente_cep} />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-2">
              <InfoField label="Endereço" value={[pedido.cliente_endereco, pedido.cliente_numero].filter(Boolean).join(', ')} />
              <InfoField label="Bairro / Cidade / UF" value={[pedido.cliente_bairro, pedido.cliente_cidade, pedido.cliente_estado].filter(Boolean).join(', ')} />
            </div>
            {pedido.cliente_complemento && <InfoField label="Complemento" value={pedido.cliente_complemento} />}
            <div className="mt-3">
              <ClienteDataParser onParsed={handleClientDataParsed} />
            </div>
          </section>

          <Separator />

          {/* Seção 2: Itens do Pedido */}
          <section>
            <div className="flex items-center gap-2 mb-3">
              <Package className="h-4 w-4 text-muted-foreground" />
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Itens do Pedido</p>
            </div>
            <div className="space-y-2">
              {pedido.pedido_itens.map((item, idx) => (
                <div key={item.id} className="flex items-center gap-3 p-2.5 rounded-lg bg-muted/50 border">
                  <span className="text-xs font-bold text-muted-foreground w-5">{idx + 1}</span>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{item.modelo || '—'}</p>
                    <p className="text-[10px] text-muted-foreground truncate">
                      {[item.aco, item.acabamento, item.empunhadura, item.bainha, item.cor_bainha].filter(Boolean).join(' · ')}
                    </p>
                    {item.texto_laser && <p className="text-[10px] text-blue-500 truncate">Laser: {item.texto_laser}</p>}
                  </div>
                  <div className="flex gap-1">
                    <StatusDot status={(item.status_lamina as ItemStatus) || 'pendente'} label="Lâmina" />
                    <StatusDot status={(item.status_empunhadura as ItemStatus) || 'pendente'} label="Empunhadura" />
                    <StatusDot status={(item.status_bainha as ItemStatus) || 'pendente'} label="Bainha" />
                    <StatusDot status={(item.status_laser as ItemStatus) || 'nao_aplicavel'} label="Laser" />
                  </div>
                </div>
              ))}
            </div>
            {pedido.observacao && (
              <div className="mt-3 p-2.5 rounded-lg bg-amber-500/10 border border-amber-500/20">
                <p className="text-xs font-medium text-amber-600 dark:text-amber-400">Observações do Pedido</p>
                <p className="text-sm mt-1 whitespace-pre-wrap">{pedido.observacao}</p>
              </div>
            )}
            {pedido.bloqueado_expedicao && pedido.motivo_bloqueio && (
              <div className="mt-2 p-2.5 rounded-lg bg-destructive/10 border border-destructive/20">
                <p className="text-xs font-medium text-destructive">Motivo do Bloqueio</p>
                <p className="text-sm mt-1">{pedido.motivo_bloqueio}</p>
              </div>
            )}
          </section>

          <Separator />

          {/* Seção 3: Informações de Envio */}
          <section>
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <Truck className="h-4 w-4 text-muted-foreground" />
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Informações de Envio</p>
              </div>
              <Button size="sm" variant="outline" onClick={saveExpedicao} disabled={saving} className="gap-1">
                {saving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Save className="h-3.5 w-3.5" />}
                Salvar
              </Button>
            </div>

            {loadingExp ? (
              <p className="text-xs text-muted-foreground text-center py-4">Carregando expedição...</p>
            ) : exp && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-[10px] text-muted-foreground uppercase">Destinatário</label>
                  <Input value={exp.nome_destinatario ?? ''} onChange={(e) => setExp({ ...exp, nome_destinatario: e.target.value })} className="mt-1 h-9" />
                </div>
                <div>
                  <label className="text-[10px] text-muted-foreground uppercase">CEP Destino</label>
                  <Input value={exp.cep_destino ?? ''} onChange={(e) => setExp({ ...exp, cep_destino: e.target.value })} className="mt-1 h-9" />
                </div>
                <div className="sm:col-span-2">
                  <label className="text-[10px] text-muted-foreground uppercase">Endereço Completo</label>
                  <Input value={exp.endereco_completo ?? ''} onChange={(e) => setExp({ ...exp, endereco_completo: e.target.value })} className="mt-1 h-9" />
                </div>
                <div>
                  <label className="text-[10px] text-muted-foreground uppercase">Tipo de Caixa</label>
                  <Select value={exp.tipo_caixa ?? ''} onValueChange={(v) => setExp({ ...exp, tipo_caixa: v })}>
                    <SelectTrigger className="mt-1 h-9"><SelectValue placeholder="Selecione" /></SelectTrigger>
                    <SelectContent>
                      {CAIXA_OPTIONS.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex items-center gap-3 pt-5">
                  <Checkbox
                    checked={exp.espuma_cortada ?? false}
                    onCheckedChange={(v) => setExp({ ...exp, espuma_cortada: !!v })}
                  />
                  <label className="text-sm">Espuma cortada</label>
                </div>
                <div>
                  <label className="text-[10px] text-muted-foreground uppercase">Transportadora</label>
                  <Input value={exp.transportadora ?? ''} onChange={(e) => setExp({ ...exp, transportadora: e.target.value })} className="mt-1 h-9" />
                </div>
                <div>
                  <label className="text-[10px] text-muted-foreground uppercase">Código de Rastreio</label>
                  <Input value={exp.codigo_rastreio ?? ''} onChange={(e) => setExp({ ...exp, codigo_rastreio: e.target.value })} className="mt-1 h-9" />
                </div>
                <div>
                  <label className="text-[10px] text-muted-foreground uppercase">Data de Postagem</label>
                  <Input type="date" value={exp.data_postagem ?? ''} onChange={(e) => setExp({ ...exp, data_postagem: e.target.value })} className="mt-1 h-9" />
                </div>
                <div>
                  <label className="text-[10px] text-muted-foreground uppercase">Status</label>
                  <Select value={exp.status ?? 'aguardando'} onValueChange={(v) => setExp({ ...exp, status: v })}>
                    <SelectTrigger className="mt-1 h-9"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {STATUS_OPTIONS.map((s) => <SelectItem key={s} value={s}>{s.charAt(0).toUpperCase() + s.slice(1)}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div className="sm:col-span-2">
                  <label className="text-[10px] text-muted-foreground uppercase">Observações de Envio</label>
                  <Textarea value={exp.observacoes ?? ''} onChange={(e) => setExp({ ...exp, observacoes: e.target.value })} className="mt-1" rows={2} />
                </div>
              </div>
            )}
          </section>

          <Separator />

          {/* Seção 4: Comentários */}
          <section>
            <ComentariosSection pedidoId={pedido.id} />
          </section>

          <Separator />

          {/* Seção 5: Gerar Ficha */}
          <section className="flex flex-col sm:flex-row gap-3">
            <Button
              variant="outline"
              className="gap-2 flex-1"
              onClick={() => gerarFichaExpedicao(pedido, exp)}
            >
              <FileText className="h-4 w-4" />
              Gerar Ficha de Expedição (PDF)
            </Button>
          </section>
        </div>
      </DialogContent>
    </Dialog>
  );
}
