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
  Search, Loader2, RefreshCw, ShoppingCart, MessageCircle, Check, X,
  Settings2, Copy, Plus, Trash2, ExternalLink,
} from 'lucide-react';
import { toast } from 'sonner';

// ── Tipos ────────────────────────────────────────────────────────────────────
interface CheckoutItem { titulo: string; variante: string | null; quantidade: number; preco: string }
interface Checkout {
  id: string; token: string; nome: string; email: string | null; telefone: string | null;
  cidade: string | null; estado: string | null; total: string; moeda: string;
  criado_em: string; atualizado_em: string; abandoned_checkout_url: string | null;
  itens: CheckoutItem[];
}
interface Contato { checkout_id: string; status: string; contatado_em: string | null; observacoes: string | null }
interface Template { id: string; nome: string; mensagem: string; ordem: number; ativo: boolean }

// ── Helpers ──────────────────────────────────────────────────────────────────
const brl = (v: string | number) => {
  const n = typeof v === 'string' ? parseFloat(v) : v;
  return isNaN(n) ? '—' : n.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
};

const dataHora = (iso: string) =>
  new Date(iso).toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' });

const horasAtras = (iso: string) => {
  const h = Math.floor((Date.now() - new Date(iso).getTime()) / 3600_000);
  if (h < 1) return 'agora há pouco';
  if (h < 24) return `há ${h}h`;
  return `há ${Math.floor(h / 24)}d`;
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
  recuperado: { label: 'Recuperado', className: 'bg-emerald-500/15 text-emerald-600 border-emerald-500/30' },
  perdido: { label: 'Perdido', className: 'bg-muted text-muted-foreground border-border' },
};

function resumoItens(c: Checkout): string {
  return c.itens.map((i) => `${i.quantidade}x ${i.titulo}${i.variante && i.variante !== 'Default Title' ? ` (${i.variante})` : ''}`).join(', ');
}

function montarMensagem(tpl: string, c: Checkout, vendedor: string): string {
  const primeiroNome = c.nome.split(' ')[0] || 'tudo bem';
  const vars: Record<string, string> = {
    '{nome_completo}': c.nome,
    '{nome}': primeiroNome,
    '{vendedor}': vendedor,
    '{itens}': resumoItens(c) || 'seu pedido',
    '{total}': brl(c.total),
    '{link}': c.abandoned_checkout_url ?? '',
    '{cidade}': c.cidade ?? '',
  };
  let out = tpl;
  for (const [k, v] of Object.entries(vars)) out = out.split(k).join(v);
  return out;
}


// ── Página ───────────────────────────────────────────────────────────────────
export default function CheckoutsAbandonados() {
  const qc = useQueryClient();
  const [search, setSearch] = useState('');
  const [dias, setDias] = useState('30');
  const [filtroStatus, setFiltroStatus] = useState('todos');
  const [selecionado, setSelecionado] = useState<Checkout | null>(null);
  const [mensagem, setMensagem] = useState('');
  const [templateId, setTemplateId] = useState<string>('');
  const [gerenciarOpen, setGerenciarOpen] = useState(false);

  const { data, isLoading, isFetching, error, refetch } = useQuery({
    queryKey: ['shopify-checkouts', dias],
    queryFn: async () => {
      const { data, error } = await supabase.functions.invoke('shopify-checkouts', { body: { dias: Number(dias) } });
      if (error) throw error;
      if (data?.error) throw new Error(typeof data.error === 'string' ? data.error : 'Erro na API Shopify');
      return data as { checkouts: Checkout[] };
    },
    staleTime: 60_000,
  });

  const { data: contatos } = useQuery({
    queryKey: ['checkout-contatos'],
    queryFn: async () => {
      const { data, error } = await supabase.from('checkouts_abandonados_contatos').select('*');
      if (error) throw error;
      return (data ?? []) as Contato[];
    },
  });

  const { data: templates } = useQuery({
    queryKey: ['checkout-templates'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('checkouts_abandonados_templates')
        .select('*')
        .order('ordem', { ascending: true });
      if (error) throw error;
      return (data ?? []) as Template[];
    },
  });

  const mapaContatos = useMemo(() => {
    const m = new Map<string, Contato>();
    (contatos ?? []).forEach((c) => m.set(c.checkout_id, c));
    return m;
  }, [contatos]);

  const checkouts = data?.checkouts ?? [];

  const filtrados = useMemo(() => {
    const q = search.trim().toLowerCase();
    return checkouts.filter((c) => {
      const status = mapaContatos.get(c.id)?.status ?? 'pendente';
      if (filtroStatus !== 'todos' && status !== filtroStatus) return false;
      if (!q) return true;
      return (
        c.nome.toLowerCase().includes(q) ||
        (c.email ?? '').toLowerCase().includes(q) ||
        (c.telefone ?? '').includes(q) ||
        resumoItens(c).toLowerCase().includes(q)
      );
    });
  }, [checkouts, search, filtroStatus, mapaContatos]);

  const stats = useMemo(() => {
    const total = checkouts.reduce((s, c) => s + (parseFloat(c.total) || 0), 0);
    const comWpp = checkouts.filter((c) => normalizarTelefone(c.telefone)).length;
    const pendentes = checkouts.filter((c) => (mapaContatos.get(c.id)?.status ?? 'pendente') === 'pendente').length;
    return { total, comWpp, pendentes };
  }, [checkouts, mapaContatos]);

  // Abre o modal de contato
  const abrirContato = (c: Checkout) => {
    setSelecionado(c);
    const ativos = (templates ?? []).filter((t) => t.ativo);
    const tpl = ativos[0];
    setTemplateId(tpl?.id ?? '');
    setMensagem(tpl ? montarMensagem(tpl.mensagem, c) : '');
  };

  useEffect(() => {
    if (!selecionado || !templateId) return;
    const tpl = (templates ?? []).find((t) => t.id === templateId);
    if (tpl) setMensagem(montarMensagem(tpl.mensagem, selecionado));
  }, [templateId]); // eslint-disable-line react-hooks/exhaustive-deps

  const marcarStatus = async (checkoutId: string, status: string) => {
    const { data: userData } = await supabase.auth.getUser();
    const { error } = await supabase.from('checkouts_abandonados_contatos').upsert(
      {
        checkout_id: checkoutId,
        status,
        contatado_em: status === 'pendente' ? null : new Date().toISOString(),
        contatado_por: userData?.user?.id ?? null,
      },
      { onConflict: 'checkout_id' },
    );
    if (error) { toast.error('Erro ao salvar status: ' + error.message); return; }
    qc.invalidateQueries({ queryKey: ['checkout-contatos'] });
  };

  const enviarWhatsApp = async () => {
    if (!selecionado) return;
    const fone = normalizarTelefone(selecionado.telefone);
    if (!fone) { toast.error('Este cliente não tem telefone válido no checkout.'); return; }
    window.open(`https://wa.me/${fone}?text=${encodeURIComponent(mensagem)}`, '_blank');
    await marcarStatus(selecionado.id, 'contatado');
    toast.success('WhatsApp aberto e checkout marcado como contatado');
    setSelecionado(null);
  };

  return (
    <div className="max-w-5xl mx-auto py-6 px-4 space-y-5">
      {/* Header */}
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-3">
          <ShoppingCart className="h-6 w-6 text-primary" />
          <div>
            <h1 className="text-xl sm:text-2xl font-bold">Checkouts Abandonados</h1>
            <p className="text-xs text-muted-foreground">
              {isLoading ? 'Carregando...' : `${checkouts.length} carrinho(s) · ${stats.comWpp} com WhatsApp · ${brl(stats.total)} em jogo`}
            </p>
          </div>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" className="gap-2" onClick={() => setGerenciarOpen(true)}>
            <Settings2 className="h-4 w-4" /> Modelos
          </Button>
          <Button variant="outline" size="sm" className="gap-2" onClick={() => refetch()} disabled={isFetching}>
            {isFetching ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
            Atualizar
          </Button>
        </div>
      </div>

      {error && (
        <div className="p-4 rounded-lg border border-destructive/30 bg-destructive/5 text-sm text-destructive">
          <p className="font-medium">Erro ao buscar checkouts da Shopify</p>
          <p className="text-xs mt-1 text-muted-foreground">{(error as Error).message}</p>
          <p className="text-xs mt-2 text-muted-foreground">
            O app Shopify precisa do escopo <code className="bg-muted px-1 rounded">read_checkouts</code>.
          </p>
        </div>
      )}

      {/* Filtros */}
      <div className="flex gap-2 flex-wrap">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Buscar por nome, e-mail, telefone ou produto..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9" />
        </div>
        <Select value={dias} onValueChange={setDias}>
          <SelectTrigger className="w-[140px]"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="7">Últimos 7 dias</SelectItem>
            <SelectItem value="15">Últimos 15 dias</SelectItem>
            <SelectItem value="30">Últimos 30 dias</SelectItem>
            <SelectItem value="60">Últimos 60 dias</SelectItem>
            <SelectItem value="90">Últimos 90 dias</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <Tabs value={filtroStatus} onValueChange={setFiltroStatus}>
        <TabsList className="w-full grid grid-cols-5 h-auto">
          <TabsTrigger value="todos" className="text-xs">Todos</TabsTrigger>
          <TabsTrigger value="pendente" className="text-xs">Pendentes ({stats.pendentes})</TabsTrigger>
          <TabsTrigger value="contatado" className="text-xs">Contatados</TabsTrigger>
          <TabsTrigger value="recuperado" className="text-xs">Recuperados</TabsTrigger>
          <TabsTrigger value="perdido" className="text-xs">Perdidos</TabsTrigger>
        </TabsList>
      </Tabs>

      {/* Lista */}
      {isLoading ? (
        <div className="flex items-center justify-center py-16 text-muted-foreground gap-2">
          <Loader2 className="h-5 w-5 animate-spin" /> Carregando checkouts...
        </div>
      ) : !error && filtrados.length === 0 ? (
        <div className="text-center py-16 text-muted-foreground">
          <ShoppingCart className="h-10 w-10 mx-auto mb-3 opacity-40" />
          <p className="font-medium">Nenhum checkout abandonado nesse filtro</p>
        </div>
      ) : (
        <div className="space-y-2.5">
          {filtrados.map((c) => {
            const contato = mapaContatos.get(c.id);
            const status = contato?.status ?? 'pendente';
            const meta = STATUS_META[status] ?? STATUS_META.pendente;
            const fone = normalizarTelefone(c.telefone);
            return (
              <div key={c.id} className="border rounded-xl p-3.5 bg-card space-y-2.5">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="font-semibold text-sm truncate">{c.nome}</p>
                    <p className="text-[11px] text-muted-foreground truncate">
                      {[c.email, c.telefone, [c.cidade, c.estado].filter(Boolean).join('/')].filter(Boolean).join(' · ') || 'Sem contato informado'}
                    </p>
                  </div>
                  <div className="text-right flex-shrink-0">
                    <p className="font-bold text-primary text-sm">{brl(c.total)}</p>
                    <p className="text-[10px] text-muted-foreground">{horasAtras(c.criado_em)}</p>
                  </div>
                </div>

                <p className="text-xs text-muted-foreground line-clamp-2">{resumoItens(c) || 'Sem itens'}</p>

                <div className="flex items-center justify-between gap-2 flex-wrap">
                  <div className="flex items-center gap-1.5">
                    <Badge variant="outline" className={`text-[10px] ${meta.className}`}>{meta.label}</Badge>
                    {contato?.contatado_em && (
                      <span className="text-[10px] text-muted-foreground">{dataHora(contato.contatado_em)}</span>
                    )}
                    {!fone && <Badge variant="outline" className="text-[10px]">Sem WhatsApp</Badge>}
                  </div>
                  <div className="flex gap-1.5">
                    {c.abandoned_checkout_url && (
                      <Button size="sm" variant="ghost" className="h-8 px-2" asChild>
                        <a href={c.abandoned_checkout_url} target="_blank" rel="noreferrer" title="Abrir carrinho">
                          <ExternalLink className="h-3.5 w-3.5" />
                        </a>
                      </Button>
                    )}
                    {status !== 'recuperado' && (
                      <Button size="sm" variant="ghost" className="h-8 px-2 text-emerald-600" title="Marcar como recuperado" onClick={() => marcarStatus(c.id, 'recuperado')}>
                        <Check className="h-3.5 w-3.5" />
                      </Button>
                    )}
                    {status !== 'perdido' && (
                      <Button size="sm" variant="ghost" className="h-8 px-2 text-muted-foreground" title="Marcar como perdido" onClick={() => marcarStatus(c.id, 'perdido')}>
                        <X className="h-3.5 w-3.5" />
                      </Button>
                    )}
                    <Button size="sm" className="h-8 gap-1.5" disabled={!fone} onClick={() => abrirContato(c)}>
                      <MessageCircle className="h-3.5 w-3.5" /> WhatsApp
                    </Button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Modal de contato */}
      <Dialog open={!!selecionado} onOpenChange={(v) => !v && setSelecionado(null)}>
        <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
          {selecionado && (
            <>
              <DialogHeader>
                <DialogTitle className="text-base pr-6">Contatar {selecionado.nome}</DialogTitle>
              </DialogHeader>
              <div className="space-y-3">
                <div className="text-xs text-muted-foreground rounded-lg bg-muted/50 border p-2.5 space-y-1">
                  <p><span className="font-medium text-foreground">Itens:</span> {resumoItens(selecionado) || '—'}</p>
                  <p><span className="font-medium text-foreground">Total:</span> {brl(selecionado.total)}</p>
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
                  <Textarea value={mensagem} onChange={(e) => setMensagem(e.target.value)} rows={9} className="text-sm" />
                </div>
              </div>
              <DialogFooter className="gap-2 sm:gap-2">
                <Button variant="outline" className="gap-2" onClick={() => { navigator.clipboard.writeText(mensagem); toast.success('Mensagem copiada'); }}>
                  <Copy className="h-4 w-4" /> Copiar
                </Button>
                <Button className="gap-2" onClick={enviarWhatsApp}>
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
      .from('checkouts_abandonados_templates')
      .update({ nome: t.nome, mensagem: t.mensagem, ativo: t.ativo })
      .eq('id', t.id);
    setSalvando(false);
    if (error) { toast.error('Erro ao salvar: ' + error.message); return; }
    toast.success('Modelo salvo');
    qc.invalidateQueries({ queryKey: ['checkout-templates'] });
  };

  const criar = async () => {
    const { error } = await supabase.from('checkouts_abandonados_templates').insert({
      nome: 'Novo modelo',
      mensagem: 'Olá {nome}, vi que você deixou {itens} no carrinho. Posso te ajudar? {link}',
      ordem: rascunhos.length + 1,
    });
    if (error) { toast.error('Erro ao criar: ' + error.message); return; }
    qc.invalidateQueries({ queryKey: ['checkout-templates'] });
  };

  const remover = async (id: string) => {
    const { error } = await supabase.from('checkouts_abandonados_templates').delete().eq('id', id);
    if (error) { toast.error('Erro ao remover: ' + error.message); return; }
    toast.success('Modelo removido');
    qc.invalidateQueries({ queryKey: ['checkout-templates'] });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-base">Modelos de mensagem</DialogTitle>
        </DialogHeader>
        <p className="text-[11px] text-muted-foreground">
          Variáveis: <code className="bg-muted px-1 rounded">{'{nome}'}</code>{' '}
          <code className="bg-muted px-1 rounded">{'{nome_completo}'}</code>{' '}
          <code className="bg-muted px-1 rounded">{'{itens}'}</code>{' '}
          <code className="bg-muted px-1 rounded">{'{total}'}</code>{' '}
          <code className="bg-muted px-1 rounded">{'{link}'}</code>{' '}
          <code className="bg-muted px-1 rounded">{'{cidade}'}</code>
        </p>
        <div className="space-y-3">
          {rascunhos.map((t) => (
            <div key={t.id} className="border rounded-lg p-3 space-y-2">
              <div className="flex gap-2">
                <Input value={t.nome} onChange={(e) => atualizar(t.id, 'nome', e.target.value)} className="h-8 text-sm" />
                <Button size="sm" variant={t.ativo ? 'secondary' : 'outline'} className="h-8 text-xs shrink-0" onClick={() => atualizar(t.id, 'ativo', !t.ativo)}>
                  {t.ativo ? 'Ativo' : 'Inativo'}
                </Button>
                <Button size="sm" variant="ghost" className="h-8 px-2 text-destructive shrink-0" onClick={() => remover(t.id)}>
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              </div>
              <Textarea value={t.mensagem} onChange={(e) => atualizar(t.id, 'mensagem', e.target.value)} rows={5} className="text-sm" />
              <Button size="sm" className="h-8 w-full text-xs" disabled={salvando} onClick={() => salvar(t)}>Salvar modelo</Button>
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
