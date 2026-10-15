import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogContent, AlertDialogHeader, AlertDialogTitle, AlertDialogDescription, AlertDialogFooter, AlertDialogCancel, AlertDialogAction } from '@/components/ui/alert-dialog';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { Tooltip, TooltipTrigger, TooltipContent } from '@/components/ui/tooltip';
import { RefreshCw, Loader2, Plus, Maximize, Minimize, Truck, Search, PackageCheck, StickyNote, Copy } from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { calcularPrazoLimite, prazoDoPedido, diasUteisRestantes, TZ_BR } from '@/lib/prontaEntrega';
import { acaoPE, pendente, ultimoEnvio, certificadoDiferente, textoPrazo, corPrazo, dataHora, dataPedido, type PedidoPE } from '@/lib/pedidoPE';
import { PedidoDetalhes, copiarPE, rastrearPE } from '@/components/pronta-entrega/PedidoDetalhes';
const hora = (d: Date) => d.toLocaleTimeString('pt-BR', { timeZone: TZ_BR, hour: '2-digit', minute: '2-digit' });
type Coluna = 'novos' | 'seguir' | 'enviados';
export default function ProntaEntrega() {
  const qc = useQueryClient();
  const [selecionado, setSelecionado] = useState<string | null>(null);
  const [agora, setAgora] = useState(() => new Date());
  const [enviar, setEnviar] = useState<PedidoPE[] | null>(null);
  const [marcados, setMarcados] = useState<Set<string>>(new Set());
  const [manualOpen, setManualOpen] = useState(false);
  const [telaCheia, setTelaCheia] = useState(false);
  const [sincronizando, setSincronizando] = useState(false);
  const executando = useRef(false);
  const { data: pedidos = [], isLoading, isError } = useQuery({
    queryKey: ['pronta-entrega'], refetchInterval: 120000,
    queryFn: async () => {
      const { data, error } = await supabase.from('pedidos_pronta_entrega').select('*').order('prazo_limite');
      if (error) throw error;
      return (data ?? []) as unknown as PedidoPE[];
    },
  });
  const { data: feriados = new Set<string>() } = useQuery({ queryKey: ['feriados'], queryFn: async () => {
    const { data, error } = await supabase.from('feriados').select('data'); if (error) throw error;
    return new Set((data ?? []).map((f) => f.data));
  } });
  const { data: configData } = useQuery({ queryKey: ['pe-config-expedicao', 'rows-v1'], refetchInterval: 120000, queryFn: async () => {
    const { data, error } = await supabase.from('config_expedicao').select('chave, valor'); if (error) throw error; return data ?? [];
  } });
  // Older sessions cached only an ISO timestamp under pe-ultima-sync.
  // A distinct key isolates the new row-list contract; guard malformed cache data too.
  const config = Array.isArray(configData) ? configData : [];
  const ultimaSync = config.find((c) => c.chave === 'ultima_sincronizacao')?.valor;
  const corte = config.find((c) => c.chave === 'horario_corte')?.valor || '14:00';
  const recarregar = useCallback(() => {
    qc.invalidateQueries({ queryKey: ['pronta-entrega'] }); qc.invalidateQueries({ queryKey: ['pe-config-expedicao'] });
  }, [qc]);
  const sincronizar = useCallback(async (silencioso = true) => {
    if (executando.current) return;
    executando.current = true; setSincronizando(true);
    try {
      const { data, error } = await supabase.functions.invoke('sincronizar-pronta-entrega', { body: { acao: 'sincronizar' } });
      if (error || !data?.sucesso) throw new Error(data?.erro || error?.message || 'Tente novamente');
      if (!silencioso) toast.success('Pedidos atualizados');
      if (data.avisos?.length) toast.warning(data.avisos[0]);
    } catch (error) { toast.error(`Não foi possível sincronizar: ${error instanceof Error ? error.message : 'Tente novamente'}`); }
    finally { executando.current = false; setSincronizando(false); recarregar(); }
  }, [recarregar]);
  useEffect(() => { sincronizar(); const timer = setInterval(() => sincronizar(), 120000); return () => clearInterval(timer); }, [sincronizar]);
  useEffect(() => { const timer = setInterval(() => setAgora(new Date()), 1000); return () => clearInterval(timer); }, []);
  useEffect(() => {
    window.dispatchEvent(new CustomEvent('pe-panel-mode', { detail: telaCheia }));
    return () => { window.dispatchEvent(new CustomEvent('pe-panel-mode', { detail: false })); };
  }, [telaCheia]);
  useEffect(() => {
    const changed = () => { if (!document.fullscreenElement) setTelaCheia(false); };
    document.addEventListener('fullscreenchange', changed);
    return () => document.removeEventListener('fullscreenchange', changed);
  }, []);
  useEffect(() => {
    let lock: { release: () => Promise<void> } | undefined;
    let disposed = false;
    const manterAcordada = async () => {
      try {
        const wake = (navigator as unknown as { wakeLock?: { request: (tipo: string) => Promise<{ release: () => Promise<void> }> } }).wakeLock;
        if (!wake || document.visibilityState !== 'visible') return;
        const novo = await wake.request('screen');
        if (disposed) await novo.release(); else { await lock?.release(); lock = novo; }
      } catch { /* Wake Lock não suportado/permitido: o painel continua funcionando. */ }
    };
    manterAcordada(); document.addEventListener('visibilitychange', manterAcordada);
    return () => { disposed = true; document.removeEventListener('visibilitychange', manterAcordada); lock?.release().catch(() => {}); };
  }, []);
  const alternarTela = async () => {
    if (telaCheia) { setTelaCheia(false); if (document.fullscreenElement) await document.exitFullscreen().catch(() => {}); }
    else { setTelaCheia(true); try { await document.documentElement.requestFullscreen(); } catch { /* modo painel funciona sem suporte nativo */ } }
  };
  const abertos = useMemo(() => pedidos.filter(p => p.itens.some(i => i.pronta_entrega)).map(p => pendente(p) && p.data_pagamento
    ? { ...p, prazo_limite: calcularPrazoLimite(new Date(p.data_pagamento), prazoDoPedido(p.itens), corte, feriados) } : p), [pedidos, corte, feriados]);
  const restantes = (p: PedidoPE) => p.prazo_limite ? diasUteisRestantes(p.prazo_limite, feriados, agora) : 99;
  const [aba, setAba] = useState<Coluna>('novos');
  const escolheuAba = useRef(false); const abriuAba = useRef(false);
  const [busca, setBusca] = useState('');
  const novos = abertos.filter(p => pendente(p) && !p.visualizado).sort((a, b) => (b.data_pagamento || '').localeCompare(a.data_pagamento || ''));
  const seguir = abertos.filter(p => pendente(p) && p.visualizado).sort((a, b) => (a.prazo_limite || '9999').localeCompare(b.prazo_limite || '9999') || (a.data_pagamento || '').localeCompare(b.data_pagamento || ''));
  const enviados = abertos.filter(p => !pendente(p) && ['enviado', 'enviado_parcial'].includes(p.status) && !!ultimoEnvio(p) && new Date(ultimoEnvio(p) || '').getTime() >= agora.getTime() - 30 * 86400000).sort((a, b) => (ultimoEnvio(b) || '').localeCompare(ultimoEnvio(a) || ''));
  useEffect(() => { if (!isLoading && !abriuAba.current && !escolheuAba.current) { setAba(novos.length ? 'novos' : 'seguir'); abriuAba.current = true; } }, [isLoading, novos.length]);
  const selected = abertos.find(p => p.id === selecionado);
  const visualizado = async (p: PedidoPE, valor: boolean) => {
    await acaoPE({ acao: 'acompanhamento', id: p.id, campo: 'visualizado', valor });
    recarregar();
    if (valor) toast.success('Movido para Envios a seguir', { action: { label: 'Desfazer', onClick: () => { acaoPE({ acao: 'acompanhamento', id: p.id, campo: 'visualizado', valor: false }).then(recarregar).catch(() => toast.error('Não foi possível desfazer')); } } });
    else toast.success('Movido para Novos pedidos');
  };
  const [movendo, setMovendo] = useState<Set<string>>(new Set());
  const mover = async (p: PedidoPE) => { setMovendo(m => new Set(m).add(p.id)); try { await visualizado(p, true); } catch (e) { toast.error(e instanceof Error ? e.message : 'Não foi possível salvar'); } finally { setMovendo(m => { const n = new Set(m); n.delete(p.id); return n; }); } };
  const q = busca.trim().toLowerCase();
  const cols: { key: Coluna; title: string; rows: PedidoPE[] }[] = [{ key: 'novos', title: 'Novos pedidos', rows: novos }, { key: 'seguir', title: 'Envios a seguir', rows: seguir }, { key: 'enviados', title: 'Enviados', rows: enviados }];
  const selecionados = seguir.filter(p => marcados.has(p.id));
  const card = (p: PedidoPE, coluna: Coluna) => {
    const r = restantes(p), cor = corPrazo(r), sent = coluna === 'enviados';
    const itens = p.itens.filter(i => i.pronta_entrega && (sent ? i.enviado : !i.enviado));
    const enc = p.itens.filter(i => !i.pronta_entrega).length;
    const certificados = certificadoDiferente(p);
    return <div key={p.id} role="button" tabIndex={0} aria-label={`Ver pedido: ${p.cliente_nome || 'Sem nome'}, ${p.pedido_numero}`} onClick={() => setSelecionado(p.id)} onKeyDown={e => { if (e.target === e.currentTarget && ['Enter', ' '].includes(e.key)) { e.preventDefault(); setSelecionado(p.id); } }}
      className={cn('relative cursor-pointer overflow-hidden rounded-none border bg-card p-3 pl-4 space-y-2 hover:bg-muted/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring', sent && 'opacity-80')}>
      {!sent && <span className={cn('absolute left-0 inset-y-0 w-1', cor.faixa)} />}
      {coluna === 'seguir' && <div className="flex items-center justify-between gap-2"><p className={cn('text-sm font-semibold', cor.texto)}>{textoPrazo(r)}</p><span className="flex items-center justify-center min-h-11 min-w-11" onClick={e => e.stopPropagation()} onKeyDown={e => e.stopPropagation()}><Checkbox aria-label={`Selecionar ${p.cliente_nome || p.pedido_numero}`} checked={marcados.has(p.id)} onCheckedChange={v => setMarcados(m => { const n = new Set(m); v ? n.add(p.id) : n.delete(p.id); return n; })} /></span></div>}
      {coluna === 'novos' && <p className={cn('text-sm font-semibold', cor.texto)}>{textoPrazo(r)}</p>}
      <div className="flex items-start justify-between gap-2 min-w-0"><div className="min-w-0"><p className="font-semibold break-words">{p.cliente_nome || 'Sem nome'}</p><p className="text-xs text-muted-foreground">{p.pedido_numero}{p.vendedor ? ` · ${p.vendedor}` : ''}</p>{dataPedido(p) && <p className="text-xs text-muted-foreground">Pedido em {dataHora(dataPedido(p))}</p>}</div>{(p.observacao_pedido || p.observacao) && <Tooltip><TooltipTrigger asChild><span tabIndex={0} aria-label="Tem observação" className="text-muted-foreground"><StickyNote className="h-4 w-4" /></span></TooltipTrigger><TooltipContent>Tem observação no pedido</TooltipContent></Tooltip>}{coluna === 'novos' && <label className="flex min-h-11 shrink-0 cursor-pointer items-center gap-2 text-xs" onClick={e => e.stopPropagation()} onKeyDown={e => e.stopPropagation()}><Checkbox aria-label={`Visualizado ${p.cliente_nome || p.pedido_numero}`} checked={false} disabled={movendo.has(p.id)} onCheckedChange={() => mover(p)} />Visualizado</label>}</div>
      <ul className="text-sm space-y-1 break-words">{itens.map((i, n) => <li key={n}>{i.quantidade}x {i.titulo}</li>)}</ul>
      {!sent && enc > 0 && <p className="text-[11px] text-muted-foreground">+{enc} {enc === 1 ? 'item sob encomenda' : 'itens sob encomenda'} — não enviar</p>}
      {!sent && certificados.length > 0 && <p className="text-sm font-medium text-accent break-words">Certificado: {certificados.join(' · ')}</p>}
      {coluna === 'seguir' && <><div className="flex gap-1.5">{(['case_pronta', 'certificado_pronto'] as const).map(k => <Badge key={k} variant="outline" className={cn('text-[11px] font-normal rounded-none', p[k] ? 'text-success border-success/30' : 'text-muted-foreground')}>{k === 'case_pronta' ? 'Case' : 'Certificado'}{p[k] ? ' ✓' : ''}</Badge>)}</div><Button className="h-11 w-full gap-1.5" onClick={e => { e.stopPropagation(); setEnviar([p]); }}><PackageCheck className="h-4 w-4" />Envio concluído</Button></>}
      {sent && <><p className="text-xs text-muted-foreground">Enviado em {dataHora(ultimoEnvio(p))}</p>{p.rastreio ? <div className="flex items-center gap-1"><span className="font-mono text-xs break-all">{p.rastreio}</span><Button variant="ghost" size="icon" aria-label="Copiar rastreio" onClick={e => { e.stopPropagation(); copiarPE(p.rastreio || ''); }}><Copy className="h-3 w-3" /></Button></div> : <p className="text-xs text-muted-foreground">Aguardando rastreio do Bling</p>}</>}
    </div>;
  };
  return <div className={cn('pe-panel mx-auto py-4 px-2 sm:px-4 space-y-4', telaCheia && 'pe-panel-fullscreen')}>
    <div className="flex flex-wrap items-start justify-between gap-2 shrink-0"><div className="flex items-center gap-3"><Truck className="h-6 w-6 text-primary" /><div><h1 className="text-xl sm:text-2xl font-bold">Pronta Entrega</h1><p className="text-xs text-muted-foreground">{novos.length + seguir.length} em aberto</p></div></div><div className="flex flex-wrap items-start gap-2"><div className="flex flex-col items-end gap-0.5"><Button size="sm" onClick={() => sincronizar(false)} disabled={sincronizando} className="gap-1.5">{sincronizando ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}Sincronizar agora</Button><span className="text-[10px] text-muted-foreground">{hora(agora)} · {ultimaSync ? `Atualizado às ${hora(new Date(ultimaSync))}` : 'Aguardando atualização'}</span></div><Button variant="outline" size="sm" onClick={alternarTela} className="gap-1.5">{telaCheia ? <Minimize className="h-4 w-4" /> : <Maximize className="h-4 w-4" />}{telaCheia ? 'Sair' : 'Tela cheia'}</Button></div></div>
    <div className="flex flex-col sm:flex-row gap-2 shrink-0"><div className="relative flex-1"><Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" /><Input aria-label="Buscar pedidos" placeholder="Buscar por cliente ou número do pedido..." value={busca} onChange={e => setBusca(e.target.value)} className="pl-9" /></div><Button variant="outline" size="sm" className="gap-1.5 h-10" onClick={() => setManualOpen(true)}><Plus className="h-4 w-4" />Adicionar pedido manual</Button></div>
    <Tabs value={aba} onValueChange={v => { escolheuAba.current = true; setAba(v as Coluna); }} className="lg:hidden shrink-0"><TabsList className="w-full rounded-none"><TabsTrigger className="flex-1 text-xs rounded-none px-2" value="novos">Novos ({novos.length})</TabsTrigger><TabsTrigger className="flex-1 text-xs rounded-none px-2" value="seguir">A seguir ({seguir.length})</TabsTrigger><TabsTrigger className="flex-1 text-xs rounded-none px-2" value="enviados">Enviados</TabsTrigger></TabsList></Tabs>
    {isLoading ? <p className="text-muted-foreground py-8">Carregando pedidos...</p> : isError ? <p role="alert" className="text-muted-foreground py-8">Não foi possível carregar os pedidos. Tente sincronizar novamente.</p> : <div className="pe-columns grid grid-cols-1 lg:grid-cols-3 gap-4 min-h-0">
      {cols.map(col => { const rows = col.rows.filter(p => !q || (p.cliente_nome || '').toLowerCase().includes(q) || p.pedido_numero.toLowerCase().includes(q)); const atrasados = seguir.filter(p => restantes(p) < 0).length, hojeN = seguir.filter(p => restantes(p) === 0).length;
        return <section key={col.key} aria-label={col.title} className={cn('min-w-0 min-h-0 flex-col', aba === col.key ? 'flex' : 'hidden lg:flex')}><header className="border-b pb-3 mb-3 shrink-0"><div className="flex items-baseline gap-3"><span className="text-3xl sm:text-4xl font-semibold tabular-nums">{rows.length}</span><h2 className="text-xs font-medium uppercase text-muted-foreground">{col.title}</h2></div>{col.key === 'seguir' && (atrasados > 0 || hojeN > 0) && <p className="text-xs mt-1">{atrasados > 0 && <span className="text-destructive">{atrasados} {atrasados === 1 ? 'atrasado' : 'atrasados'}</span>}{atrasados > 0 && hojeN > 0 && ' · '}{hojeN > 0 && <span className="text-accent">{hojeN} para hoje</span>}</p>}</header><div className="pe-column-scroll space-y-2 min-h-0 lg:overflow-y-auto lg:pr-1">
          {col.key === 'seguir' && rows.length > 0 && <div className="flex flex-wrap items-center gap-2 border bg-card p-2 text-xs"><label className="flex items-center gap-2 min-h-11 cursor-pointer"><Checkbox aria-label="Selecionar todos" checked={rows.every(p => marcados.has(p.id))} onCheckedChange={v => setMarcados(v ? new Set(rows.map(p => p.id)) : new Set())} />Selecionar todos</label>{selecionados.length > 0 && <Button size="sm" onClick={() => setEnviar(selecionados)}>Concluir {selecionados.length} envios</Button>}</div>}
          {rows.length ? rows.map(p => card(p, col.key)) : <p className="text-xs text-muted-foreground border border-dashed p-4">{q ? 'Nenhum pedido encontrado com essa busca.' : col.key === 'novos' ? 'Nenhum pedido novo. As próximas vendas com itens prontos aparecem aqui.' : col.key === 'seguir' ? 'Nenhum envio pendente nesta coluna.' : 'Nenhum envio nos últimos 30 dias.'}</p>}
        </div></section>;
      })}
    </div>}
    {selected && <PedidoDetalhes key={selected.id} pedido={selected} dias={restantes(selected)} onClose={() => setSelecionado(null)} onEnviar={p => setEnviar([p])} onDone={recarregar} onVisualizado={visualizado} />}
    <EnviarDialog pedidos={enviar} onClose={() => setEnviar(null)} onDone={() => { setMarcados(new Set()); setSelecionado(null); recarregar(); }} />
    <ManualDialog open={manualOpen} onClose={() => setManualOpen(false)} onDone={recarregar} />
  </div>;
}
function EnviarDialog({ pedidos, onClose, onDone }: { pedidos: PedidoPE[] | null; onClose: () => void; onDone: () => void }) {
  const [busy, setBusy] = useState(false);
  if (!pedidos?.length) return null;
  const confirmar = async () => {
    setBusy(true); const ok: PedidoPE[] = [], falhas: string[] = [];
    for (const p of pedidos) { try { await acaoPE({ acao: 'marcar_enviado', id: p.id }); ok.push(p); } catch { falhas.push(p.cliente_nome || p.pedido_numero); } }
    setBusy(false);
    if (ok.length) { toast.success(ok.length === 1 ? 'Envio concluído' : `${ok.length} envios concluídos`); onDone(); }
    if (falhas.length) toast.error(`Não foi possível concluir: ${falhas.join(', ')}`); else onClose();
    for (const p of ok) { if (!p.shopify_order_id) continue; try { await rastrearPE(p); } catch { toast.info('O rastreio ainda não está no Bling — vamos tentar de novo automaticamente'); } finally { onDone(); } }
  };
  return <AlertDialog open onOpenChange={v => !v && !busy && onClose()}><AlertDialogContent className="max-h-[90dvh] overflow-y-auto"><AlertDialogHeader><AlertDialogTitle>{pedidos.length === 1 ? `Confirmar envio para ${pedidos[0].cliente_nome || 'Sem nome'}?` : `Confirmar ${pedidos.length} envios?`}</AlertDialogTitle><AlertDialogDescription>Confira os itens que serão marcados como enviados.</AlertDialogDescription></AlertDialogHeader><div className="space-y-3 text-sm">{pedidos.map(p => <div key={p.id}>{pedidos.length > 1 && <p className="font-medium">{p.cliente_nome} · {p.pedido_numero}</p>}<ul>{p.itens.filter(i => i.pronta_entrega && !i.enviado).map((i, n) => <li key={n}>{i.quantidade}x {i.titulo}</li>)}</ul></div>)}</div><AlertDialogFooter><AlertDialogCancel disabled={busy} onClick={onClose}>Cancelar</AlertDialogCancel><AlertDialogAction disabled={busy} onClick={e => { e.preventDefault(); confirmar(); }}>{busy && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}Envio concluído</AlertDialogAction></AlertDialogFooter></AlertDialogContent></AlertDialog>;
}

function ManualDialog({ open, onClose, onDone }: { open: boolean; onClose: () => void; onDone: () => void }) {
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
      toast.success('Pedido manual adicionado em "Envios a seguir".');
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
