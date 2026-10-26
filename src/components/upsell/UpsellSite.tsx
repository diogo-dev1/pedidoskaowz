import { useEffect, useMemo, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Search, Loader2, MessageCircle, Check, X, Copy, ShoppingBag } from 'lucide-react';
import { toast } from 'sonner';
import { brl, dataHora, rotuloDias, STATUS_META, montarMensagem, type ClienteMensagem } from '@/lib/upsellMensagem';
import { agruparPedidosSite, type ClienteSite, type PedidoSite } from '@/lib/upsellSite';

interface Template { id: string; nome: string; mensagem: string; ativo: boolean }
interface Base { contato_bling_id: number; telefone_whatsapp: string | null; email: string | null; total_gasto: number; qtd_pedidos: number; produtos: string[] | null; ultimo_pedido_em: string | null }
interface Linha extends ClienteSite { base: Base | null; status: string; contatado_em: string | null }

const DIAS = [7, 15, 30, 60];
const dataISO = (iso: string) => iso.slice(0, 10);

export default function UpsellSite({ templates, vendedorNome }: { templates: Template[]; vendedorNome: string }) {
  const qc = useQueryClient();
  const [dias, setDias] = useState(15);
  const [busca, setBusca] = useState('');
  const [sel, setSel] = useState<Linha | null>(null);
  const [templateId, setTemplateId] = useState('');
  const [mensagem, setMensagem] = useState('');

  const { data: clientes, isLoading, error } = useQuery({
    queryKey: ['upsell-site-pedidos', dias],
    queryFn: async () => {
      const { data, error } = await supabase.functions.invoke('shopify-clientes-pedidos', { body: { dias } });
      if (error) throw error;
      return agruparPedidosSite((data?.pedidos ?? []) as PedidoSite[]);
    },
    staleTime: 5 * 60_000,
  });

  const fones = useMemo(() => (clientes ?? []).map(c => c.fone).filter(Boolean) as string[], [clientes]);
  const emails = useMemo(() => (clientes ?? []).map(c => c.email).filter(Boolean) as string[], [clientes]);

  const { data: cruzamento } = useQuery({
    queryKey: ['upsell-site-cruzamento', fones, emails],
    enabled: !!clientes,
    queryFn: async () => {
      const campos = 'contato_bling_id, telefone_whatsapp, email, total_gasto, qtd_pedidos, produtos, ultimo_pedido_em';
      const [porFone, porEmail, site] = await Promise.all([
        fones.length ? supabase.from('clientes_metricas').select(campos).in('telefone_whatsapp', fones) : Promise.resolve({ data: [] }),
        emails.length ? supabase.from('clientes_metricas').select(campos).in('email', emails) : Promise.resolve({ data: [] }),
        fones.length ? supabase.from('upsell_contatos_site').select('telefone, status, contatado_em').in('telefone', fones) : Promise.resolve({ data: [] }),
      ]);
      const base = [...(porFone.data ?? []), ...(porEmail.data ?? [])] as Base[];
      const ids = [...new Set(base.map(b => b.contato_bling_id))];
      const { data: contatos } = ids.length
        ? await supabase.from('upsell_clientes_contatos').select('contato_bling_id, status, contatado_em').in('contato_bling_id', ids)
        : { data: [] };
      return { base, site: (site.data ?? []) as { telefone: string; status: string; contatado_em: string | null }[], contatos: (contatos ?? []) as { contato_bling_id: number; status: string; contatado_em: string | null }[] };
    },
  });

  const linhas: Linha[] = useMemo(() => (clientes ?? []).map(c => {
    const base = cruzamento?.base.find(b => (c.fone && b.telefone_whatsapp === c.fone) || (c.email && b.email?.toLowerCase() === c.email)) ?? null;
    const st = base
      ? cruzamento?.contatos.find(x => x.contato_bling_id === base.contato_bling_id)
      : cruzamento?.site.find(x => x.telefone === c.fone);
    return { ...c, base, status: st?.status ?? 'pendente', contatado_em: st?.contatado_em ?? null };
  }), [clientes, cruzamento]);

  const filtradas = useMemo(() => {
    const t = busca.trim().toLowerCase();
    if (!t) return linhas;
    return linhas.filter(l => l.nome.toLowerCase().includes(t) || l.produtos.some(p => p.toLowerCase().includes(t)));
  }, [linhas, busca]);

  const paraMensagem = (l: Linha): ClienteMensagem => ({
    nome: l.nome, cidade: l.cidade,
    total_gasto: l.base ? Math.max(l.base.total_gasto, l.total) : l.total,
    qtd_pedidos: l.base ? Math.max(l.base.qtd_pedidos, l.pedidos.length) : l.pedidos.length,
    produtos: l.produtos, ultimo_pedido_em: dataISO(l.ultimo),
  });

  useEffect(() => {
    if (!sel) return;
    const tpl = templates.find(t => t.id === templateId);
    if (tpl) setMensagem(montarMensagem(tpl.mensagem, paraMensagem(sel), vendedorNome));
  }, [templateId]); // eslint-disable-line react-hooks/exhaustive-deps

  const abrir = (l: Linha) => {
    const tpl = templates[0];
    setSel(l); setTemplateId(tpl?.id ?? '');
    setMensagem(tpl ? montarMensagem(tpl.mensagem, paraMensagem(l), vendedorNome) : '');
  };

  const marcar = async (l: Linha, novo: string) => {
    const { data: u } = await supabase.auth.getUser();
    const extra = { status: novo, contatado_em: novo === 'pendente' ? null : new Date().toISOString(), contatado_por: u?.user?.id ?? null };
    const { error } = l.base
      ? await supabase.from('upsell_clientes_contatos').upsert({ contato_bling_id: l.base.contato_bling_id, ...extra } as any, { onConflict: 'contato_bling_id' })
      : l.fone ? await supabase.from('upsell_contatos_site').upsert({ telefone: l.fone, ...extra }, { onConflict: 'telefone' }) : { error: { message: 'cliente sem telefone' } };
    if (error) { toast.error('Erro ao salvar status: ' + error.message); return; }
    qc.invalidateQueries({ queryKey: ['upsell-site-cruzamento'] });
    if (l.base) { qc.invalidateQueries({ queryKey: ['upsell-clientes'] }); qc.invalidateQueries({ queryKey: ['upsell-resumo'] }); }
  };

  const enviar = async () => {
    if (!sel?.fone) return;
    window.open(`https://wa.me/${sel.fone}?text=${encodeURIComponent(mensagem)}`, '_blank');
    await marcar(sel, 'contatado');
    toast.success('WhatsApp aberto e cliente marcado como contatado');
    setSel(null);
  };

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap gap-1.5">
        {DIAS.map(d => (
          <Button key={d} size="sm" variant={dias === d ? 'default' : 'outline'} className="h-8 px-3 text-xs" onClick={() => setDias(d)}>{d} dias</Button>
        ))}
      </div>
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input placeholder="Nome ou produto..." value={busca} onChange={e => setBusca(e.target.value)} className="pl-9 h-10" />
      </div>
      {!isLoading && !error && (
        <p className="text-[11px] text-muted-foreground">
          {filtradas.length} cliente(s) · {filtradas.reduce((t, l) => t + l.pedidos.length, 0)} pedido(s) pagos · {brl(filtradas.reduce((t, l) => t + l.total, 0))}
        </p>
      )}

      {error ? (
        <div className="p-4 rounded-lg border border-destructive/30 bg-destructive/5 text-sm text-destructive">Erro ao consultar os pedidos do site</div>
      ) : isLoading ? (
        <div className="flex items-center justify-center py-16 text-muted-foreground gap-2"><Loader2 className="h-5 w-5 animate-spin" /> Carregando pedidos do site...</div>
      ) : filtradas.length === 0 ? (
        <div className="text-center py-16 text-muted-foreground">
          <ShoppingBag className="h-10 w-10 mx-auto mb-3 opacity-40" />
          <p className="font-medium">Nenhuma venda paga no site nesse período</p>
        </div>
      ) : (
        <div className="space-y-2.5">
          {filtradas.map(l => {
            const meta = STATUS_META[l.status] ?? STATUS_META.pendente;
            return (
              <div key={l.chave} className="border rounded-xl p-3 sm:p-3.5 bg-card space-y-2.5">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="font-semibold text-sm truncate">{l.nome}</p>
                    <p className="text-[11px] text-muted-foreground break-words line-clamp-2">
                      {[[l.cidade, l.uf].filter(Boolean).join('/'), l.telefone, l.email].filter(Boolean).join(' · ') || '—'}
                    </p>
                  </div>
                  <div className="text-right shrink-0">
                    <p className="font-bold text-primary text-sm">{brl(l.total)}</p>
                    <p className="text-[10px] text-muted-foreground">comprou {rotuloDias(dataISO(l.ultimo))}</p>
                  </div>
                </div>
                <div className="flex flex-wrap items-center gap-1.5 text-[10px] text-muted-foreground">
                  <span>{l.pedidos.length} pedido(s) no período</span>
                  <span>·</span>
                  <span className="truncate">{l.pedidos.map(p => p.numero).join(', ')}</span>
                  <Badge variant="outline" className="text-[10px]">Site</Badge>
                  {l.base && <Badge variant="outline" className="text-[10px] border-primary/40 text-primary">Já na base</Badge>}
                </div>
                {l.base && (
                  <p className="text-[10px] text-muted-foreground">Histórico total: {l.base.qtd_pedidos} pedido(s) · {brl(l.base.total_gasto)}</p>
                )}
                {l.produtos.length > 0 && (
                  <p className="text-xs text-muted-foreground line-clamp-2">
                    {l.produtos.slice(0, 5).join(', ')}{l.produtos.length > 5 ? ` +${l.produtos.length - 5}` : ''}
                  </p>
                )}
                <div className="flex flex-wrap items-center gap-1.5">
                  <Badge variant="outline" className={`text-[10px] ${meta.className}`}>{meta.label}</Badge>
                  {l.contatado_em && <span className="text-[10px] text-muted-foreground">{dataHora(l.contatado_em)}</span>}
                  {!l.fone && <Badge variant="outline" className="text-[10px]">Sem WhatsApp</Badge>}
                </div>
                <div className="flex items-center gap-1.5">
                  {l.status !== 'vendeu' && (
                    <Button size="sm" variant="ghost" className="h-9 px-2.5 text-emerald-600 shrink-0" title="Marcar que vendeu" disabled={!l.base && !l.fone} onClick={() => marcar(l, 'vendeu')}>
                      <Check className="h-4 w-4" />
                    </Button>
                  )}
                  {l.status !== 'sem_interesse' && (
                    <Button size="sm" variant="ghost" className="h-9 px-2.5 text-muted-foreground shrink-0" title="Sem interesse" disabled={!l.base && !l.fone} onClick={() => marcar(l, 'sem_interesse')}>
                      <X className="h-4 w-4" />
                    </Button>
                  )}
                  <Button size="sm" className="h-9 gap-1.5 flex-1 sm:flex-none sm:ml-auto" disabled={!l.fone} onClick={() => abrir(l)}>
                    <MessageCircle className="h-4 w-4" /> WhatsApp
                  </Button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      <Dialog open={!!sel} onOpenChange={v => !v && setSel(null)}>
        <DialogContent className="w-[calc(100vw-1.5rem)] sm:w-full max-w-lg max-h-[88vh] overflow-y-auto p-4 sm:p-6 rounded-xl">
          {sel && (
            <>
              <DialogHeader><DialogTitle className="text-base pr-6">Upsell para {sel.nome}</DialogTitle></DialogHeader>
              <div className="space-y-3">
                <div className="text-xs text-muted-foreground rounded-lg bg-muted/50 border p-2.5 space-y-1">
                  <p><span className="font-medium text-foreground">No período:</span> {sel.pedidos.length} pedido(s) · {brl(sel.total)}</p>
                  {sel.base && <p><span className="font-medium text-foreground">Histórico total:</span> {sel.base.qtd_pedidos} pedido(s) · {brl(sel.base.total_gasto)}</p>}
                  <p><span className="font-medium text-foreground">Último pedido:</span> {new Date(sel.ultimo).toLocaleDateString('pt-BR')} ({rotuloDias(dataISO(sel.ultimo))})</p>
                  <p><span className="font-medium text-foreground">Produtos:</span> {sel.produtos.slice(0, 6).join(', ') || '—'}</p>
                  <p><span className="font-medium text-foreground">Telefone:</span> {sel.telefone ?? '—'}</p>
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Modelo de mensagem</label>
                  <Select value={templateId} onValueChange={setTemplateId}>
                    <SelectTrigger><SelectValue placeholder="Selecione um modelo" /></SelectTrigger>
                    <SelectContent>{templates.map(t => <SelectItem key={t.id} value={t.id}>{t.nome}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Mensagem (editável)</label>
                  <Textarea value={mensagem} onChange={e => setMensagem(e.target.value)} rows={9} className="text-sm min-h-[180px]" />
                </div>
              </div>
              <DialogFooter className="flex-col-reverse sm:flex-row gap-2">
                <Button variant="outline" className="gap-2 w-full sm:w-auto" onClick={() => { navigator.clipboard.writeText(mensagem); toast.success('Mensagem copiada'); }}>
                  <Copy className="h-4 w-4" /> Copiar
                </Button>
                <Button className="gap-2 w-full sm:w-auto" onClick={enviar}><MessageCircle className="h-4 w-4" /> Abrir WhatsApp</Button>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
