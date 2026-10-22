import { useMemo, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Swords, Plus, Settings, Copy, Search, Trash2, ArrowUp, ArrowDown } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription,
  AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { useIsMobile } from '@/hooks/use-mobile';
import { ehDiaUtil, ymdBR } from '@/lib/prontaEntrega';

type Pedido = {
  id: string; cliente: string; item: string; aco: string | null; acabamento: string | null;
  empunhadura: string | null; bainha: string | null; cor_bainha: string | null; prazo: string | null;
  observacoes: string | null; embalagem: string | null; personalizacao: string | null;
  certificado: string | null; pedido_shopify: string | null; status: string; created_at: string | null;
};
type Opcao = { id: string; campo: string; valor: string; ordem: number | null; ativo: boolean | null };

const CAMPOS_OPCAO: { campo: string; label: string }[] = [
  { campo: 'item', label: 'Item' }, { campo: 'aco', label: 'Aço' }, { campo: 'acabamento', label: 'Acabamento' },
  { campo: 'empunhadura', label: 'Empunhadura' }, { campo: 'bainha', label: 'Bainha' },
  { campo: 'cor_bainha', label: 'Cor bainha' }, { campo: 'embalagem', label: 'Embalagem' }, { campo: 'status', label: 'Status' },
];
const COLS: { key: keyof Pedido; label: string }[] = [
  { key: 'cliente', label: 'Nome' }, { key: 'item', label: 'Item' }, { key: 'aco', label: 'Aço' },
  { key: 'acabamento', label: 'Acabamento' }, { key: 'empunhadura', label: 'Empunhadura' }, { key: 'bainha', label: 'Bainha' },
  { key: 'cor_bainha', label: 'Cor bainha' }, { key: 'prazo', label: 'Prazo' }, { key: 'observacoes', label: 'Observações' },
  { key: 'embalagem', label: 'Embalagem' }, { key: 'personalizacao', label: 'Personalização' }, { key: 'certificado', label: 'Certificado' },
];
const CHAVE_PRAZO = 'push_dagger_sls_prazo_dias_uteis';

const fmtData = (ymd: string | null) => (ymd ? ymd.split('-').reverse().join('/') : '');
function addDia(ymd: string) {
  const d = new Date(ymd + 'T12:00:00Z'); d.setUTCDate(d.getUTCDate() + 1); return d.toISOString().slice(0, 10);
}
export function somarDiasUteis(inicio: string, n: number, feriados: Set<string>) {
  let x = inicio;
  for (let i = 0; i < n; i++) { x = addDia(x); while (!ehDiaUtil(x, feriados)) x = addDia(x); }
  return x;
}

type Form = Omit<Pedido, 'id' | 'created_at'>;
const vazio = (prazo: string): Form => ({
  cliente: '', item: '', aco: null, acabamento: null, empunhadura: null, bainha: null, cor_bainha: null,
  prazo, observacoes: null, embalagem: null, personalizacao: null, certificado: null, pedido_shopify: null, status: 'Aguardando',
});

function Painel({ open, onOpenChange, title, children }: { open: boolean; onOpenChange: (v: boolean) => void; title: string; children: React.ReactNode }) {
  const mobile = useIsMobile();
  if (mobile) return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="bottom" className="max-h-[92vh] overflow-y-auto">
        <SheetHeader><SheetTitle>{title}</SheetTitle></SheetHeader>
        <div className="mt-3">{children}</div>
      </SheetContent>
    </Sheet>
  );
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader><DialogTitle>{title}</DialogTitle></DialogHeader>
        {children}
      </DialogContent>
    </Dialog>
  );
}

export default function PushDaggerSLS() {
  const qc = useQueryClient();
  const [busca, setBusca] = useState('');
  const [filtroStatus, setFiltroStatus] = useState('todos');
  const [form, setForm] = useState<Form | null>(null);
  const [editId, setEditId] = useState<string | null>(null);
  const [excluir, setExcluir] = useState<Pedido | null>(null);
  const [opcoesOpen, setOpcoesOpen] = useState(false);
  const [salvando, setSalvando] = useState(false);

  const { data: pedidos = [] } = useQuery({
    queryKey: ['push-dagger-sls'],
    queryFn: async () => {
      const { data, error } = await supabase.from('push_dagger_sls').select('*').order('created_at', { ascending: true });
      if (error) throw error; return data as Pedido[];
    },
  });
  const { data: opcoes = [] } = useQuery({
    queryKey: ['push-dagger-sls-opcoes'],
    queryFn: async () => {
      const { data, error } = await supabase.from('push_dagger_sls_opcoes').select('*').order('ordem').order('valor');
      if (error) throw error; return data as Opcao[];
    },
  });
  const { data: prazoDias = 30 } = useQuery({
    queryKey: ['push-dagger-sls-prazo'],
    queryFn: async () => {
      const { data } = await supabase.from('config_expedicao').select('valor').eq('chave', CHAVE_PRAZO).maybeSingle();
      return Number(data?.valor) || 30;
    },
  });
  const { data: feriados = new Set<string>() } = useQuery({
    queryKey: ['feriados-set'],
    queryFn: async () => {
      const { data } = await supabase.from('feriados').select('data');
      return new Set((data ?? []).map((f) => f.data as string));
    },
  });

  const ativas = (campo: string) => opcoes.filter((o) => o.campo === campo && o.ativo !== false);
  const statusList = ativas('status').map((o) => o.valor);
  const prazoPadrao = () => somarDiasUteis(ymdBR(new Date()), prazoDias, feriados);

  const visiveis = useMemo(() => {
    const q = busca.trim().toLowerCase();
    return pedidos.filter((p) =>
      (filtroStatus === 'todos' || p.status === filtroStatus) &&
      (!q || p.cliente.toLowerCase().includes(q) || (p.pedido_shopify ?? '').toLowerCase().includes(q)));
  }, [pedidos, busca, filtroStatus]);

  const porStatus = useMemo(() => {
    const m = new Map<string, number>();
    pedidos.forEach((p) => m.set(p.status, (m.get(p.status) ?? 0) + 1));
    return m;
  }, [pedidos]);
  const qtdPedidos = new Set(pedidos.map((p) => (p.pedido_shopify || p.cliente).trim().toLowerCase())).size;

  const recarregar = () => qc.invalidateQueries({ queryKey: ['push-dagger-sls'] });

  const abrirNovo = () => { setEditId(null); setForm(vazio(prazoPadrao())); };
  const abrirEdicao = (p: Pedido) => { const { id, created_at, ...rest } = p; setEditId(id); setForm(rest); };

  const salvar = async (continuar: boolean) => {
    if (!form) return;
    if (!form.cliente.trim() || !form.item.trim()) { toast.error('Informe o nome e o item'); return; }
    setSalvando(true);
    const payload = { ...form, cliente: form.cliente.trim(), certificado: form.certificado?.trim() || form.cliente.trim() };
    const { error } = editId
      ? await supabase.from('push_dagger_sls').update(payload).eq('id', editId)
      : await supabase.from('push_dagger_sls').insert(payload);
    setSalvando(false);
    if (error) { toast.error('Não foi possível salvar', { description: error.message }); return; }
    toast.success(editId ? 'Pedido atualizado' : 'Pedido lançado');
    recarregar();
    if (continuar) {
      setEditId(null);
      setForm({ ...vazio(form.prazo || prazoPadrao()), cliente: form.cliente, certificado: payload.certificado, pedido_shopify: form.pedido_shopify });
    } else setForm(null);
  };

  const trocarStatus = async (p: Pedido, status: string) => {
    const { error } = await supabase.from('push_dagger_sls').update({ status }).eq('id', p.id);
    if (error) toast.error('Não foi possível trocar o status'); else recarregar();
  };

  const confirmarExclusao = async () => {
    if (!excluir) return;
    const { error } = await supabase.from('push_dagger_sls').delete().eq('id', excluir.id);
    if (error) toast.error('Não foi possível excluir'); else { toast.success('Pedido excluído'); recarregar(); setForm(null); }
    setExcluir(null);
  };

  const copiar = async () => {
    if (!visiveis.length) { toast.error('Nenhuma linha para copiar'); return; }
    const tsv = visiveis.map((p) => COLS.map((c) => {
      const v = c.key === 'prazo' ? fmtData(p.prazo) : ((p[c.key] as string | null) ?? '');
      return v.replace(/\t|\n/g, ' ');
    }).join('\t')).join('\n');
    try {
      await navigator.clipboard.writeText(tsv);
      toast.success(`${visiveis.length} linhas copiadas`, { description: 'Cole na planilha com Ctrl+Shift+V' });
    } catch { toast.error('Não foi possível copiar'); }
  };

  const StatusSelect = ({ p }: { p: Pedido }) => (
    <div onClick={(e) => e.stopPropagation()}>
      <Select value={p.status} onValueChange={(v) => trocarStatus(p, v)}>
        <SelectTrigger className="h-8 w-[130px] text-xs"><SelectValue /></SelectTrigger>
        <SelectContent>
          {Array.from(new Set([...statusList, p.status])).map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
        </SelectContent>
      </Select>
    </div>
  );

  return (
    <div className="space-y-4 min-w-0">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <h1 className="text-xl sm:text-2xl font-semibold flex items-center gap-2"><Swords className="h-5 w-5 text-accent" /> Push Dagger SLS</h1>
          <p className="text-sm text-muted-foreground">{qtdPedidos} pedidos · {pedidos.length} unidades</p>
          <div className="flex flex-wrap gap-1.5 mt-2">
            {Array.from(porStatus.entries()).map(([s, n]) => <Badge key={s} variant="secondary">{s}: {n}</Badge>)}
          </div>
        </div>
        <div className="grid grid-cols-3 gap-2 sm:flex">
          <Button onClick={abrirNovo} size="sm"><Plus className="h-4 w-4 mr-1" />Novo<span className="hidden sm:inline">&nbsp;pedido</span></Button>
          <Button onClick={() => setOpcoesOpen(true)} size="sm" variant="outline"><Settings className="h-4 w-4 mr-1" />Opções</Button>
          <Button onClick={copiar} size="sm" variant="outline"><Copy className="h-4 w-4 mr-1" />Copiar<span className="hidden sm:inline">&nbsp;para planilha</span></Button>
        </div>
      </div>

      <div className="flex flex-col gap-2 sm:flex-row">
        <div className="relative flex-1">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input className="pl-8" placeholder="Buscar por nome ou pedido" value={busca} onChange={(e) => setBusca(e.target.value)} />
        </div>
        <Select value={filtroStatus} onValueChange={setFiltroStatus}>
          <SelectTrigger className="sm:w-48"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="todos">Todos os status</SelectItem>
            {statusList.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      {visiveis.length === 0 ? (
        <div className="rounded-lg border border-dashed p-8 text-center text-sm text-muted-foreground">
          {pedidos.length ? 'Nenhum pedido encontrado com esses filtros.' : 'Nenhum pedido lançado ainda. Clique em "Novo pedido" para começar.'}
        </div>
      ) : (
        <>
          <div className="hidden md:block rounded-lg border overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-muted/50 text-muted-foreground">
                <tr>
                  {COLS.map((c) => <th key={c.key} className="px-3 py-2 text-left font-medium whitespace-nowrap">{c.label}</th>)}
                  <th className="px-3 py-2 text-left font-medium">Status</th>
                  <th className="px-3 py-2 text-left font-medium whitespace-nowrap">Pedido Shopify</th>
                </tr>
              </thead>
              <tbody>
                {visiveis.map((p) => (
                  <tr key={p.id} onClick={() => abrirEdicao(p)} className="border-t cursor-pointer hover:bg-muted/40">
                    {COLS.map((c) => (
                      <td key={c.key} className={`px-3 py-2 whitespace-nowrap max-w-[220px] truncate ${c.key === 'cliente' ? 'font-medium' : ''}`}>
                        {c.key === 'prazo' ? fmtData(p.prazo) : (p[c.key] as string) ?? ''}
                      </td>
                    ))}
                    <td className="px-3 py-1.5"><StatusSelect p={p} /></td>
                    <td className="px-3 py-2 whitespace-nowrap text-muted-foreground">{p.pedido_shopify}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="md:hidden space-y-2">
            {visiveis.map((p) => (
              <div key={p.id} onClick={() => abrirEdicao(p)} className="rounded-lg border bg-card p-3 cursor-pointer">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <div className="font-medium truncate">{p.cliente}</div>
                    <div className="text-sm truncate">{p.item}</div>
                    {p.pedido_shopify && <div className="text-xs text-muted-foreground">{p.pedido_shopify}</div>}
                  </div>
                  <StatusSelect p={p} />
                </div>
                <dl className="mt-2 grid grid-cols-2 gap-x-3 gap-y-1 text-xs">
                  {COLS.slice(2).map((c) => {
                    const v = c.key === 'prazo' ? fmtData(p.prazo) : (p[c.key] as string | null);
                    if (!v) return null;
                    const largo = ['observacoes', 'personalizacao', 'certificado'].includes(c.key);
                    return (
                      <div key={c.key} className={`min-w-0 ${largo ? 'col-span-2' : ''}`}>
                        <dt className="text-muted-foreground">{c.label}</dt>
                        <dd className="break-words">{v}</dd>
                      </div>
                    );
                  })}
                </dl>
              </div>
            ))}
          </div>
        </>
      )}

      <Painel open={!!form} onOpenChange={(v) => !v && setForm(null)} title={editId ? 'Editar pedido' : 'Novo pedido'}>
        {form && (
          <div className="space-y-3">
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-1 sm:col-span-2">
                <Label>Nome do cliente *</Label>
                <Input value={form.cliente} onChange={(e) => {
                  const v = e.target.value;
                  setForm((f) => f && ({ ...f, cliente: v, certificado: !f.certificado || f.certificado === f.cliente ? v : f.certificado }));
                }} />
              </div>
              {(['item', 'aco', 'acabamento', 'empunhadura', 'bainha', 'cor_bainha', 'embalagem'] as const).map((campo) => {
                const lista = ativas(campo).map((o) => o.valor);
                const atual = form[campo] ?? '';
                const opts = atual && !lista.includes(atual) ? [atual, ...lista] : lista;
                return (
                  <div key={campo} className="space-y-1">
                    <Label>{CAMPOS_OPCAO.find((c) => c.campo === campo)!.label}{campo === 'item' ? ' *' : ''}</Label>
                    {opts.length ? (
                      <Select value={atual || undefined} onValueChange={(v) => setForm((f) => f && ({ ...f, [campo]: v }))}>
                        <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                        <SelectContent>{opts.map((o) => <SelectItem key={o} value={o}>{o}</SelectItem>)}</SelectContent>
                      </Select>
                    ) : (
                      <p className="text-xs text-muted-foreground border rounded-md px-3 py-2.5">Sem opções — cadastre em "Opções"</p>
                    )}
                  </div>
                );
              })}
              <div className="space-y-1">
                <Label>Prazo</Label>
                <Input type="date" value={form.prazo ?? ''} onChange={(e) => setForm((f) => f && ({ ...f, prazo: e.target.value || null }))} />
                <p className="text-xs text-muted-foreground">Padrão: hoje + {prazoDias} dias úteis</p>
              </div>
              <div className="space-y-1">
                <Label>Certificado</Label>
                <Input value={form.certificado ?? ''} onChange={(e) => setForm((f) => f && ({ ...f, certificado: e.target.value }))} />
              </div>
              <div className="space-y-1">
                <Label>Pedido Shopify</Label>
                <Input placeholder="#KWZ-2650" value={form.pedido_shopify ?? ''} onChange={(e) => setForm((f) => f && ({ ...f, pedido_shopify: e.target.value || null }))} />
              </div>
              <div className="space-y-1 sm:col-span-2">
                <Label>Personalização</Label>
                <Input placeholder="Posição e texto (ex.: Dorso Superior — NEVER STRAY FROM THE WAY)" value={form.personalizacao ?? ''} onChange={(e) => setForm((f) => f && ({ ...f, personalizacao: e.target.value || null }))} />
              </div>
              <div className="space-y-1 sm:col-span-2">
                <Label>Observações</Label>
                <Textarea rows={2} placeholder="Brindes ou itens que não são a faca" value={form.observacoes ?? ''} onChange={(e) => setForm((f) => f && ({ ...f, observacoes: e.target.value || null }))} />
              </div>
            </div>
            <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-between pt-2">
              {editId ? (
                <Button variant="ghost" className="text-destructive" onClick={() => setExcluir(pedidos.find((p) => p.id === editId) ?? null)}>
                  <Trash2 className="h-4 w-4 mr-1" />Excluir
                </Button>
              ) : <span />}
              <div className="flex flex-col gap-2 sm:flex-row">
                {!editId && <Button variant="outline" disabled={salvando} onClick={() => salvar(true)}>Salvar e adicionar outra</Button>}
                <Button disabled={salvando} onClick={() => salvar(false)}>Salvar</Button>
              </div>
            </div>
          </div>
        )}
      </Painel>

      <OpcoesDialog open={opcoesOpen} onOpenChange={setOpcoesOpen} opcoes={opcoes} prazoDias={prazoDias} />

      <AlertDialog open={!!excluir} onOpenChange={(v) => !v && setExcluir(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir este pedido?</AlertDialogTitle>
            <AlertDialogDescription>{excluir?.cliente} — {excluir?.item}. Essa ação não pode ser desfeita.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={confirmarExclusao} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">Excluir</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

function OpcoesDialog({ open, onOpenChange, opcoes, prazoDias }: { open: boolean; onOpenChange: (v: boolean) => void; opcoes: Opcao[]; prazoDias: number }) {
  const qc = useQueryClient();
  const [campo, setCampo] = useState('item');
  const [novo, setNovo] = useState('');
  const [prazo, setPrazo] = useState<string>('');
  const lista = opcoes.filter((o) => o.campo === campo);
  const refresh = () => qc.invalidateQueries({ queryKey: ['push-dagger-sls-opcoes'] });

  const adicionar = async () => {
    const valor = novo.trim(); if (!valor) return;
    const ordem = lista.reduce((m, o) => Math.max(m, o.ordem ?? 0), -1) + 1;
    const { error } = await supabase.from('push_dagger_sls_opcoes').insert({ campo, valor, ordem });
    if (error) toast.error(error.code === '23505' ? 'Essa opção já existe' : 'Não foi possível adicionar'); else { setNovo(''); refresh(); }
  };
  const mover = async (i: number, dir: -1 | 1) => {
    const j = i + dir; if (j < 0 || j >= lista.length) return;
    const nova = [...lista]; [nova[i], nova[j]] = [nova[j], nova[i]];
    await Promise.all(nova.map((o, k) => supabase.from('push_dagger_sls_opcoes').update({ ordem: k }).eq('id', o.id)));
    refresh();
  };
  const alternar = async (o: Opcao, ativo: boolean) => {
    await supabase.from('push_dagger_sls_opcoes').update({ ativo }).eq('id', o.id); refresh();
  };
  const remover = async (o: Opcao) => {
    await supabase.from('push_dagger_sls_opcoes').delete().eq('id', o.id); refresh();
  };
  const salvarPrazo = async () => {
    const n = parseInt(prazo, 10);
    if (!n || n < 1) { toast.error('Informe um número de dias úteis válido'); return; }
    const { error } = await supabase.from('config_expedicao').upsert({ chave: CHAVE_PRAZO, valor: String(n) }, { onConflict: 'chave' });
    if (error) toast.error('Não foi possível salvar o prazo');
    else { toast.success('Prazo padrão atualizado'); setPrazo(''); qc.invalidateQueries({ queryKey: ['push-dagger-sls-prazo'] }); }
  };

  return (
    <Painel open={open} onOpenChange={onOpenChange} title="Opções do Push Dagger SLS">
      <div className="space-y-4">
        <div className="rounded-lg border p-3 space-y-2">
          <Label>Prazo padrão (dias úteis)</Label>
          <div className="flex gap-2">
            <Input type="number" min={1} placeholder={String(prazoDias)} value={prazo} onChange={(e) => setPrazo(e.target.value)} />
            <Button onClick={salvarPrazo} variant="outline">Salvar</Button>
          </div>
          <p className="text-xs text-muted-foreground">Atual: {prazoDias} dias úteis a partir do dia do lançamento.</p>
        </div>
        <Tabs value={campo} onValueChange={setCampo}>
          <TabsList className="flex flex-wrap h-auto justify-start">
            {CAMPOS_OPCAO.map((c) => <TabsTrigger key={c.campo} value={c.campo} className="text-xs">{c.label}</TabsTrigger>)}
          </TabsList>
        </Tabs>
        <div className="flex gap-2">
          <Input placeholder="Nova opção" value={novo} onChange={(e) => setNovo(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && adicionar()} />
          <Button onClick={adicionar}><Plus className="h-4 w-4" /></Button>
        </div>
        {lista.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-4">Nenhuma opção cadastrada para este campo.</p>
        ) : (
          <ul className="space-y-1.5">
            {lista.map((o, i) => (
              <li key={o.id} className="flex items-center gap-2 rounded-md border px-2 py-1.5">
                <span className={`flex-1 min-w-0 truncate text-sm ${o.ativo === false ? 'text-muted-foreground line-through' : ''}`}>{o.valor}</span>
                <Button size="icon" variant="ghost" className="h-8 w-8" onClick={() => mover(i, -1)} disabled={i === 0} aria-label="Subir"><ArrowUp className="h-4 w-4" /></Button>
                <Button size="icon" variant="ghost" className="h-8 w-8" onClick={() => mover(i, 1)} disabled={i === lista.length - 1} aria-label="Descer"><ArrowDown className="h-4 w-4" /></Button>
                <Switch checked={o.ativo !== false} onCheckedChange={(v) => alternar(o, v)} aria-label="Ativa" />
                <Button size="icon" variant="ghost" className="h-8 w-8 text-destructive" onClick={() => remover(o)} aria-label="Remover"><Trash2 className="h-4 w-4" /></Button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </Painel>
  );
}
