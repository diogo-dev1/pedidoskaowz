import { useMemo, useState, useEffect } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Search, Loader2, RefreshCw, TrendingUp, MessageCircle, Check, X,
  Settings2, Copy, Plus, Trash2, Repeat,
} from 'lucide-react';
import { toast } from 'sonner';

// ── Tipos ────────────────────────────────────────────────────────────────────
interface PedidoItem { titulo: string; variante: string | null; quantidade: number; preco: string }
interface Pedido {
  id: string; numero: string; nome: string; email: string | null; telefone: string | null;
  cidade: string | null; estado: string | null; total: string; moeda: string;
  criado_em: string; financeiro: string | null; entrega: string | null;
  pedidos_cliente: number; total_cliente: number;
  itens: PedidoItem[];
}
interface Contato { order_id: string; status: string; contatado_em: string | null; observacoes: string | null }
interface Template { id: string; nome: string; mensagem: string; ordem: number; ativo: boolean }

// ── Helpers ──────────────────────────────────────────────────────────────────
const brl = (v: string | number) => {
  const n = typeof v === 'string' ? parseFloat(v) : v;
  return isNaN(n) ? '—' : n.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
};

const dataHora = (iso: string) =>
  new Date(iso).toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' });

const diasAtras = (iso: string) => {
  const d = Math.floor((Date.now() - new Date(iso).getTime()) / 86400_000);
  if (d < 1) return 'hoje';
  if (d === 1) return 'ontem';
  return `há ${d}d`;
};

function normalizarTelefone(tel: string | null): string | null {
  if (!tel) return null;
  let d = tel.replace(/\D/g, '');
  if (d.startsWith('00')) d = d.slice(2);
  if (!d.startsWith('55') && (d.length === 10 || d.length === 11)) d = '55' + d;
  return d.length >= 12 ? d : null;
}

const STATUS_META: Record<string, { label: string; className: string }> = {
  pendente: { label: 'Pendente', className: 'bg-amber-500/15 text-amber-600 border-amber-500/30' },
  contatado: { label: 'Contatado', className: 'bg-blue-500/15 text-blue-600 border-blue-500/30' },
  vendeu: { label: 'Vendeu', className: 'bg-emerald-500/15 text-emerald-600 border-emerald-500/30' },
  sem_interesse: { label: 'Sem interesse', className: 'bg-muted text-muted-foreground border-border' },
};

function resumoItens(p: Pedido): string {
  return p.itens.map((i) => `${i.quantidade}x ${i.titulo}${i.variante && i.variante !== 'Default Title' ? ` (${i.variante})` : ''}`).join(', ');
}

function montarMensagem(tpl: string, p: Pedido, vendedor: string): string {
  const primeiroNome = p.nome.split(' ')[0] || 'tudo bem';
  const vars: Record<string, string> = {
    '{nome_completo}': p.nome,
    '{nome}': primeiroNome,
    '{vendedor}': vendedor,
    '{itens}': resumoItens(p) || 'seu pedido',
    '{total}': brl(p.total),
    '{pedido}': p.numero,
    '{data}': new Date(p.criado_em).toLocaleDateString('pt-BR'),
    '{cidade}': p.cidade ?? '',
  };
  let out = tpl;
  for (const [k, v] of Object.entries(vars)) out = out.split(k).join(v);
  return out;
}

// ── Página ───────────────────────────────────────────────────────────────────
export default function UpsellClientes() {
  const { profile } = useAuth();
  const vendedorNome = profile?.nome_vendedor?.split(' ')[0] ?? '';
  const qc = useQueryClient();
  const [search, setSearch] = useState('');
  const [dias, setDias] = useState('90');
  const [filtroStatus, setFiltroStatus] = useState('todos');
  const [valorMin, setValorMin] = useState('');
  const [valorMax, setValorMax] = useState('');
  const [ordem, setOrdem] = useState('recentes');
  const [soRecorrentes, setSoRecorrentes] = useState(false);

  const [selecionado, setSelecionado] = useState<Pedido | null>(null);
  const [mensagem, setMensagem] = useState('');
  const [templateId, setTemplateId] = useState<string>('');
  const [gerenciarOpen, setGerenciarOpen] = useState(false);

  const { data, isLoading, isFetching, error, refetch } = useQuery({
    queryKey: ['shopify-clientes-pedidos', dias],
    queryFn: async () => {
      const { data, error } = await supabase.functions.invoke('shopify-clientes-pedidos', { body: { dias: Number(dias) } });
      if (error) throw error;
      if (data?.error) throw new Error(typeof data.error === 'string' ? data.error : 'Erro na API Shopify');
      return data as { pedidos: Pedido[] };
    },
    staleTime: 60_000,
  });

  const { data: contatos } = useQuery({
    queryKey: ['upsell-contatos'],
    queryFn: async () => {
      const { data, error } = await supabase.from('upsell_clientes_contatos').select('*');
      if (error) throw error;
      return (data ?? []) as Contato[];
    },
  });

  const { data: templates } = useQuery({
    queryKey: ['upsell-templates'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('upsell_clientes_templates')
        .select('*')
        .order('ordem', { ascending: true });
      if (error) throw error;
      return (data ?? []) as Template[];
    },
  });

  const mapaContatos = useMemo(() => {
    const m = new Map<string, Contato>();
    (contatos ?? []).forEach((c) => m.set(c.order_id, c));
    return m;
  }, [contatos]);

  const pedidos = data?.pedidos ?? [];

  const filtrados = useMemo(() => {
    const q = search.trim().toLowerCase();
    const min = parseFloat(valorMin.replace(',', '.'));
    const max = parseFloat(valorMax.replace(',', '.'));
    const lista = pedidos.filter((p) => {
      const status = mapaContatos.get(p.id)?.status ?? 'pendente';
      if (filtroStatus !== 'todos' && status !== filtroStatus) return false;
      if (soRecorrentes && p.pedidos_cliente < 2) return false;
      const valor = parseFloat(p.total) || 0;
      if (!isNaN(min) && valor < min) return false;
      if (!isNaN(max) && valor > max) return false;
      if (!q) return true;
      return (
        p.nome.toLowerCase().includes(q) ||
        p.numero.toLowerCase().includes(q) ||
        (p.email ?? '').toLowerCase().includes(q) ||
        (p.telefone ?? '').includes(q) ||
        resumoItens(p).toLowerCase().includes(q)
      );
    });
    if (ordem === 'maior') lista.sort((a, b) => (parseFloat(b.total) || 0) - (parseFloat(a.total) || 0));
    if (ordem === 'menor') lista.sort((a, b) => (parseFloat(a.total) || 0) - (parseFloat(b.total) || 0));
    return lista;
  }, [pedidos, search, filtroStatus, mapaContatos, valorMin, valorMax, ordem, soRecorrentes]);

  const stats = useMemo(() => {
    const total = pedidos.reduce((s, p) => s + (parseFloat(p.total) || 0), 0);
    const comWpp = pedidos.filter((p) => normalizarTelefone(p.telefone)).length;
    const pendentes = pedidos.filter((p) => (mapaContatos.get(p.id)?.status ?? 'pendente') === 'pendente').length;
    const recorrentes = pedidos.filter((p) => p.pedidos_cliente >= 2).length;
    return { total, comWpp, pendentes, recorrentes };
  }, [pedidos, mapaContatos]);

  const abrirContato = (p: Pedido) => {
    setSelecionado(p);
    const ativos = (templates ?? []).filter((t) => t.ativo);
    const tpl = ativos[0];
    setTemplateId(tpl?.id ?? '');
    setMensagem(tpl ? montarMensagem(tpl.mensagem, p, vendedorNome) : '');
  };

  useEffect(() => {
    if (!selecionado || !templateId) return;
    const tpl = (templates ?? []).find((t) => t.id === templateId);
    if (tpl) setMensagem(montarMensagem(tpl.mensagem, selecionado, vendedorNome));
  }, [templateId]); // eslint-disable-line react-hooks/exhaustive-deps

  const marcarStatus = async (orderId: string, status: string) => {
    const { data: userData } = await supabase.auth.getUser();
    const { error } = await supabase.from('upsell_clientes_contatos').upsert(
      {
        order_id: orderId,
        status,
        contatado_em: status === 'pendente' ? null : new Date().toISOString(),
        contatado_por: userData?.user?.id ?? null,
      },
      { onConflict: 'order_id' },
    );
    if (error) { toast.error('Erro ao salvar status: ' + error.message); return; }
    qc.invalidateQueries({ queryKey: ['upsell-contatos'] });
  };

  const enviarWhatsApp = async () => {
    if (!selecionado) return;
    const fone = normalizarTelefone(selecionado.telefone);
    if (!fone) { toast.error('Este cliente não tem telefone válido no pedido.'); return; }
    window.open(`https://wa.me/${fone}?text=${encodeURIComponent(mensagem)}`, '_blank');
    await marcarStatus(selecionado.id, 'contatado');
    toast.success('WhatsApp aberto e cliente marcado como contatado');
    setSelecionado(null);
  };

  return (
    <div className="w-full max-w-5xl mx-auto py-4 sm:py-6 px-3 sm:px-4 space-y-4 sm:space-y-5 overflow-x-hidden">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
        <div className="flex items-center gap-2.5 min-w-0">
          <TrendingUp className="h-5 w-5 sm:h-6 sm:w-6 text-primary shrink-0" />
          <div className="min-w-0">
            <h1 className="text-lg sm:text-2xl font-bold leading-tight">Upsell — Clientes Shopify</h1>
            <p className="text-[11px] sm:text-xs text-muted-foreground">
              {isLoading
                ? 'Carregando...'
                : `${pedidos.length} pedido(s) pagos · ${stats.comWpp} com WhatsApp · ${stats.recorrentes} recorrentes · ${brl(stats.total)} já faturado`}
            </p>
          </div>
        </div>
        <div className="flex gap-2 shrink-0">
          <Button variant="outline" size="sm" className="gap-2 flex-1 sm:flex-none" onClick={() => setGerenciarOpen(true)}>
            <Settings2 className="h-4 w-4" /> Modelos
          </Button>
          <Button variant="outline" size="sm" className="gap-2 flex-1 sm:flex-none" onClick={() => refetch()} disabled={isFetching}>
            {isFetching ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
            Atualizar
          </Button>
        </div>
      </div>

      {error && (
        <div className="p-4 rounded-lg border border-destructive/30 bg-destructive/5 text-sm text-destructive">
          <p className="font-medium">Erro ao buscar pedidos da Shopify</p>
          <p className="text-xs mt-1 text-muted-foreground">{(error as Error).message}</p>
          <p className="text-xs mt-2 text-muted-foreground">
            O app Shopify precisa do escopo <code className="bg-muted px-1 rounded">read_orders</code>.
          </p>
        </div>
      )}

      {/* Filtros */}
      <div className="flex flex-col sm:flex-row gap-2">
        <div className="relative flex-1 min-w-0">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Buscar nome, pedido, e-mail, telefone ou produto..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9" />
        </div>
        <Select value={dias} onValueChange={setDias}>
          <SelectTrigger className="w-full sm:w-[150px]"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="30">Últimos 30 dias</SelectItem>
            <SelectItem value="60">Últimos 60 dias</SelectItem>
            <SelectItem value="90">Últimos 90 dias</SelectItem>
            <SelectItem value="180">Últimos 6 meses</SelectItem>
            <SelectItem value="365">Último ano</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="flex flex-col sm:flex-row gap-2">
        <div className="flex gap-2 flex-1 min-w-0">
          <Input type="number" inputMode="decimal" placeholder="Valor mín. (R$)" value={valorMin} onChange={(e) => setValorMin(e.target.value)} className="flex-1 min-w-0" />
          <Input type="number" inputMode="decimal" placeholder="Valor máx. (R$)" value={valorMax} onChange={(e) => setValorMax(e.target.value)} className="flex-1 min-w-0" />
        </div>
        <Select value={ordem} onValueChange={setOrdem}>
          <SelectTrigger className="w-full sm:w-[170px]"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="recentes">Mais recentes</SelectItem>
            <SelectItem value="maior">Maior valor</SelectItem>
            <SelectItem value="menor">Menor valor</SelectItem>
          </SelectContent>
        </Select>
        <Button
          variant={soRecorrentes ? 'secondary' : 'outline'}
          size="sm"
          className="gap-2 h-10 sm:h-10 shrink-0"
          onClick={() => setSoRecorrentes((v) => !v)}
        >
          <Repeat className="h-4 w-4" /> Recorrentes
        </Button>
      </div>

      <Tabs value={filtroStatus} onValueChange={setFiltroStatus}>
        <TabsList className="w-full grid grid-cols-3 sm:grid-cols-5 h-auto gap-1 p-1">
          <TabsTrigger value="todos" className="text-[11px] sm:text-xs px-1 py-1.5">Todos</TabsTrigger>
          <TabsTrigger value="pendente" className="text-[11px] sm:text-xs px-1 py-1.5">Pendentes ({stats.pendentes})</TabsTrigger>
          <TabsTrigger value="contatado" className="text-[11px] sm:text-xs px-1 py-1.5">Contatados</TabsTrigger>
          <TabsTrigger value="vendeu" className="text-[11px] sm:text-xs px-1 py-1.5">Vendeu</TabsTrigger>
          <TabsTrigger value="sem_interesse" className="text-[11px] sm:text-xs px-1 py-1.5">Sem interesse</TabsTrigger>
        </TabsList>
      </Tabs>

      {/* Lista */}
      {isLoading ? (
        <div className="flex items-center justify-center py-16 text-muted-foreground gap-2">
          <Loader2 className="h-5 w-5 animate-spin" /> Carregando clientes...
        </div>
      ) : !error && filtrados.length === 0 ? (
        <div className="text-center py-16 text-muted-foreground">
          <TrendingUp className="h-10 w-10 mx-auto mb-3 opacity-40" />
          <p className="font-medium">Nenhum cliente nesse filtro</p>
        </div>
      ) : (
        <div className="space-y-2.5">
          {filtrados.map((p) => {
            const contato = mapaContatos.get(p.id);
            const status = contato?.status ?? 'pendente';
            const meta = STATUS_META[status] ?? STATUS_META.pendente;
            const fone = normalizarTelefone(p.telefone);
            return (
              <div key={p.id} className="border rounded-xl p-3 sm:p-3.5 bg-card space-y-2.5">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="font-semibold text-sm truncate">{p.nome}</p>
                    <p className="text-[11px] text-muted-foreground break-words line-clamp-2">
                      {[p.numero, p.email, p.telefone, [p.cidade, p.estado].filter(Boolean).join('/')].filter(Boolean).join(' · ')}
                    </p>
                  </div>
                  <div className="text-right shrink-0">
                    <p className="font-bold text-primary text-sm">{brl(p.total)}</p>
                    <p className="text-[10px] text-muted-foreground">{diasAtras(p.criado_em)}</p>
                  </div>
                </div>

                <p className="text-xs text-muted-foreground line-clamp-2">{resumoItens(p) || 'Sem itens'}</p>

                <div className="flex flex-wrap items-center gap-1.5">
                  <Badge variant="outline" className={`text-[10px] ${meta.className}`}>{meta.label}</Badge>
                  {p.pedidos_cliente >= 2 && (
                    <Badge variant="outline" className="text-[10px] bg-primary/10 text-primary border-primary/30">
                      {p.pedidos_cliente} pedidos · {brl(p.total_cliente)}
                    </Badge>
                  )}
                  {contato?.contatado_em && (
                    <span className="text-[10px] text-muted-foreground">{dataHora(contato.contatado_em)}</span>
                  )}
                  {!fone && <Badge variant="outline" className="text-[10px]">Sem WhatsApp</Badge>}
                </div>

                <div className="flex items-center gap-1.5">
                  {status !== 'vendeu' && (
                    <Button size="sm" variant="ghost" className="h-9 px-2.5 text-emerald-600 shrink-0" title="Marcar que vendeu" onClick={() => marcarStatus(p.id, 'vendeu')}>
                      <Check className="h-4 w-4" />
                    </Button>
                  )}
                  {status !== 'sem_interesse' && (
                    <Button size="sm" variant="ghost" className="h-9 px-2.5 text-muted-foreground shrink-0" title="Sem interesse" onClick={() => marcarStatus(p.id, 'sem_interesse')}>
                      <X className="h-4 w-4" />
                    </Button>
                  )}
                  <Button size="sm" className="h-9 gap-1.5 flex-1 sm:flex-none sm:ml-auto" disabled={!fone} onClick={() => abrirContato(p)}>
                    <MessageCircle className="h-4 w-4" /> WhatsApp
                  </Button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Modal de contato */}
      <Dialog open={!!selecionado} onOpenChange={(v) => !v && setSelecionado(null)}>
        <DialogContent className="w-[calc(100vw-1.5rem)] sm:w-full max-w-lg max-h-[88vh] overflow-y-auto p-4 sm:p-6 rounded-xl">
          {selecionado && (
            <>
              <DialogHeader>
                <DialogTitle className="text-base pr-6">Upsell para {selecionado.nome}</DialogTitle>
              </DialogHeader>
              <div className="space-y-3">
                <div className="text-xs text-muted-foreground rounded-lg bg-muted/50 border p-2.5 space-y-1">
                  <p><span className="font-medium text-foreground">Pedido:</span> {selecionado.numero} · {dataHora(selecionado.criado_em)}</p>
                  <p><span className="font-medium text-foreground">Itens:</span> {resumoItens(selecionado) || '—'}</p>
                  <p><span className="font-medium text-foreground">Total:</span> {brl(selecionado.total)}</p>
                  <p><span className="font-medium text-foreground">Histórico:</span> {selecionado.pedidos_cliente} pedido(s) · {brl(selecionado.total_cliente)}</p>
                  <p><span className="font-medium text-foreground">Telefone:</span> {selecionado.telefone ?? '—'}</p>
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Modelo de mensagem</label>
                  <Select value={templateId} onValueChange={setTemplateId}>
                    <SelectTrigger><SelectValue placeholder="Selecione um modelo" /></SelectTrigger>
                    <SelectContent>
                      {(templates ?? []).filter((t) => t.ativo).map((t) => (
                        <SelectItem key={t.id} value={t.id}>{t.nome}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Mensagem (editável)</label>
                  <Textarea value={mensagem} onChange={(e) => setMensagem(e.target.value)} rows={9} className="text-sm min-h-[180px]" />
                </div>
              </div>
              <DialogFooter className="flex-col-reverse sm:flex-row gap-2">
                <Button variant="outline" className="gap-2 w-full sm:w-auto" onClick={() => { navigator.clipboard.writeText(mensagem); toast.success('Mensagem copiada'); }}>
                  <Copy className="h-4 w-4" /> Copiar
                </Button>
                <Button className="gap-2 w-full sm:w-auto" onClick={enviarWhatsApp}>
                  <MessageCircle className="h-4 w-4" /> Abrir WhatsApp
                </Button>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>

      <TemplatesDialog open={gerenciarOpen} onOpenChange={setGerenciarOpen} templates={templates ?? []} />
    </div>
  );
}

// ── Gerenciador de modelos ───────────────────────────────────────────────────
function TemplatesDialog({ open, onOpenChange, templates }: { open: boolean; onOpenChange: (v: boolean) => void; templates: Template[] }) {
  const qc = useQueryClient();
  const [rascunhos, setRascunhos] = useState<Template[]>([]);
  const [salvando, setSalvando] = useState(false);

  useEffect(() => { if (open) setRascunhos(templates); }, [open, templates]);

  const atualizar = (id: string, campo: keyof Template, valor: any) =>
    setRascunhos((r) => r.map((t) => (t.id === id ? { ...t, [campo]: valor } : t)));

  const salvar = async (t: Template) => {
    setSalvando(true);
    const { error } = await supabase
      .from('upsell_clientes_templates')
      .update({ nome: t.nome, mensagem: t.mensagem, ativo: t.ativo })
      .eq('id', t.id);
    setSalvando(false);
    if (error) { toast.error('Erro ao salvar: ' + error.message); return; }
    toast.success('Modelo salvo');
    qc.invalidateQueries({ queryKey: ['upsell-templates'] });
  };

  const criar = async () => {
    const { error } = await supabase.from('upsell_clientes_templates').insert({
      nome: 'Novo modelo',
      mensagem: 'Olá {nome}, aqui é {vendedor} da Kaowz! Vi que você levou {itens}. Posso te mostrar uma condição especial de cliente?',
      ordem: rascunhos.length + 1,
    });
    if (error) { toast.error('Erro ao criar: ' + error.message); return; }
    qc.invalidateQueries({ queryKey: ['upsell-templates'] });
  };

  const remover = async (id: string) => {
    const { error } = await supabase.from('upsell_clientes_templates').delete().eq('id', id);
    if (error) { toast.error('Erro ao remover: ' + error.message); return; }
    toast.success('Modelo removido');
    qc.invalidateQueries({ queryKey: ['upsell-templates'] });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-[calc(100vw-1.5rem)] sm:w-full max-w-lg max-h-[88vh] overflow-y-auto p-4 sm:p-6 rounded-xl">
        <DialogHeader>
          <DialogTitle className="text-base">Modelos de mensagem de upsell</DialogTitle>
        </DialogHeader>
        <p className="text-[11px] text-muted-foreground">
          Variáveis: <code className="bg-muted px-1 rounded">{'{nome}'}</code>{' '}
          <code className="bg-muted px-1 rounded">{'{nome_completo}'}</code>{' '}
          <code className="bg-muted px-1 rounded">{'{vendedor}'}</code>{' '}
          <code className="bg-muted px-1 rounded">{'{itens}'}</code>{' '}
          <code className="bg-muted px-1 rounded">{'{total}'}</code>{' '}
          <code className="bg-muted px-1 rounded">{'{pedido}'}</code>{' '}
          <code className="bg-muted px-1 rounded">{'{data}'}</code>{' '}
          <code className="bg-muted px-1 rounded">{'{cidade}'}</code>
        </p>
        <div className="space-y-3">
          {rascunhos.map((t) => (
            <div key={t.id} className="border rounded-lg p-3 space-y-2">
              <div className="flex flex-wrap gap-2">
                <Input value={t.nome} onChange={(e) => atualizar(t.id, 'nome', e.target.value)} className="h-9 text-sm flex-1 min-w-[140px]" />
                <Button size="sm" variant={t.ativo ? 'secondary' : 'outline'} className="h-9 text-xs shrink-0" onClick={() => atualizar(t.id, 'ativo', !t.ativo)}>
                  {t.ativo ? 'Ativo' : 'Inativo'}
                </Button>
                <Button size="sm" variant="ghost" className="h-9 px-2.5 text-destructive shrink-0" onClick={() => remover(t.id)}>
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
              <Textarea value={t.mensagem} onChange={(e) => atualizar(t.id, 'mensagem', e.target.value)} rows={6} className="text-sm" />
              <Button size="sm" className="h-9 w-full text-xs" disabled={salvando} onClick={() => salvar(t)}>Salvar modelo</Button>
            </div>
          ))}
        </div>
        <DialogFooter>
          <Button variant="outline" className="gap-2 w-full" onClick={criar}>
            <Plus className="h-4 w-4" /> Novo modelo
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
