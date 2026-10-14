import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { RefreshCw, Loader2, Plus, Maximize, Minimize, Clock, ChevronDown, Copy, MessageCircle, ExternalLink, Undo2, Columns3 } from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { Card, CardHeader } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from '@/components/ui/sheet';
import { useIsMobile } from '@/hooks/use-mobile';
import { normalizarTelefone } from '@/lib/telefone';
import { calcularPrazoLimite, prazoDoPedido, diasUteisRestantes, ymdBR, TZ_BR, type ItemPE } from '@/lib/prontaEntrega';

interface PedidoPE {
  id: string; pedido_numero: string; shopify_order_id: string | null; origem: string;
  cliente_nome: string | null; cliente_telefone: string | null; vendedor: string | null;
  data_pagamento: string | null; itens: ItemPE[]; classificacao: string; prazo_limite: string | null;
  status: string; enviado_em: string | null; enviado_por: string | null; rastreio: string | null; observacao: string | null;
}
const itensTxt = (itens: ItemPE[]) => itens.map((item) => `${item.quantidade}x ${item.titulo}`);
const hora = (data: Date) => data.toLocaleTimeString('pt-BR', { timeZone: TZ_BR, hour: '2-digit', minute: '2-digit', hour12: false });
type Grupo = 'atrasado' | 'hoje' | 'amanha' | 'proximos';
const COLUNAS = [
  { key: 'atrasado', titulo: 'Atrasado', tone: 'bg-destructive', text: 'text-destructive' },
  { key: 'hoje', titulo: 'Hoje', tone: 'bg-accent', text: 'text-accent' },
  { key: 'amanha', titulo: 'Amanhã', tone: 'bg-muted-foreground', text: 'text-muted-foreground' },
  { key: 'proximos', titulo: 'Próximos dias', tone: 'bg-muted-foreground', text: 'text-muted-foreground' },
  { key: 'enviados', titulo: 'Enviados hoje', tone: 'bg-muted-foreground', text: 'text-muted-foreground' },
] as const;
const dataHora = (data: string | null | undefined) => data ? new Date(data).toLocaleString('pt-BR', { timeZone: TZ_BR, dateStyle: 'short', timeStyle: 'short' }) : '—';
const dataDia = (data: string | null) => data ? data.split('-').reverse().join('/') : '—';
const ultimoEnvio = (p: PedidoPE) => p.itens.filter(i => i.pronta_entrega && i.enviado && i.enviado_em).map(i => i.enviado_em || '').sort().reverse()[0] || p.enviado_em;
function prazoCurto(p: PedidoPE, hoje: string, amanha: string, feriados: Set<string>, agora: Date) {
  const prazo = p.prazo_limite || hoje;
  if (prazo < hoje) { const dias = Math.max(1, -diasUteisRestantes(prazo, feriados, agora)); return `há ${dias} ${dias === 1 ? 'dia' : 'dias'}`; }
  if (prazo === hoje) return 'hoje';
  if (prazo === amanha) return 'amanhã';
  return `${new Date(`${prazo}T12:00:00-03:00`).toLocaleDateString('pt-BR', { timeZone: TZ_BR, weekday: 'short' }).replace('.', '')} ${prazo.slice(8, 10)}/${prazo.slice(5, 7)}`;
}
function ColunaKanban({ coluna, pedidos, onSelect, hoje, amanha, feriados, agora }: {
  coluna: typeof COLUNAS[number]; pedidos: PedidoPE[]; onSelect: (p: PedidoPE) => void;
  hoje: string; amanha: string; feriados: Set<string>; agora: Date;
}) {
  const mobile = useIsMobile();
  const [expanded, setExpanded] = useState(false);
  const reduced = useReducedMotion();
  const scroller = useRef<HTMLDivElement>(null);
  const pausa = useRef(0);
  const enviado = coluna.key === 'enviados';
  useEffect(() => {
    if (reduced) return;
    let frame = 0; let ultimo = 0; let direcao = 1;
    pausa.current = performance.now() + 4000;
    const mover = (tempo: number) => {
      const el = scroller.current;
      if (el && window.innerWidth >= 1280 && tempo > pausa.current && el.scrollHeight > el.clientHeight) {
        const max = el.scrollHeight - el.clientHeight;
        const delta = ultimo ? Math.min(tempo - ultimo, 50) : 0;
        el.scrollTop = Math.max(0, Math.min(max, el.scrollTop + direcao * delta * 0.018));
        if (el.scrollTop >= max - 1 || el.scrollTop <= 0) { direcao *= -1; pausa.current = tempo + 4000; }
      }
      ultimo = tempo; frame = requestAnimationFrame(mover);
    };
    frame = requestAnimationFrame(mover);
    return () => cancelAnimationFrame(frame);
  }, [reduced]);
  const header = <><span className={cn('h-2 w-2 rounded-full shrink-0', coluna.tone)} /><span className="flex-1 font-medium text-sm">{coluna.titulo}</span><Badge variant="secondary">{pedidos.length}</Badge></>;
  const content = <div ref={scroller} className="pe-column-scroll p-2 space-y-2"
    onPointerEnter={() => { pausa.current = Infinity; }} onPointerLeave={() => { pausa.current = performance.now() + 4000; }}
    onTouchStart={() => { pausa.current = Infinity; }} onTouchEnd={() => { pausa.current = performance.now() + 4000; }}
    onFocusCapture={() => { pausa.current = Infinity; }} onBlurCapture={() => { pausa.current = performance.now() + 4000; }}>
    {!pedidos.length && <p className="text-xs text-muted-foreground px-2 py-4">Nenhum pedido</p>}
    <AnimatePresence initial={false}>{pedidos.map(p => {
      const itens = p.itens.filter(i => i.pronta_entrega && (enviado ? i.enviado : !i.enviado));
      const primeiro = itens[0]; const extras = itens.slice(1).reduce((n, i) => n + i.quantidade, 0);
      return <motion.div key={p.id} initial={reduced ? false : { opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} transition={{ duration: reduced ? 0 : 0.18 }}>
        <Button variant="outline" className={cn('pe-order w-full h-auto p-3 flex flex-col items-stretch gap-1.5 bg-card border shadow-none text-left hover:bg-muted hover:text-foreground', enviado && 'opacity-60')}
          aria-label={`Ver pedido: ${p.cliente_nome || 'Sem nome'}, ${p.pedido_numero}`} onClick={() => onSelect(p)}>
          <span className="flex items-center gap-2 min-w-0"><span className="pe-row-name truncate flex-1 font-medium text-sm">{p.cliente_nome || 'Sem nome'}</span><span className="pe-row-detail shrink-0 text-xs text-muted-foreground">{p.pedido_numero}</span></span>
          <span className="flex items-center gap-2 min-w-0"><span className="pe-row-detail truncate flex-1 text-xs text-muted-foreground">{primeiro ? `${primeiro.quantidade}x ${primeiro.titulo}` : 'Itens enviados'}{extras > 0 ? ` +${extras} ${extras === 1 ? 'item' : 'itens'}` : ''}</span>
            {p.itens.some(i => !i.pronta_entrega) && <Tooltip><TooltipTrigger asChild><span tabIndex={0} aria-label="Tem item sob encomenda — não enviar" className="shrink-0 text-muted-foreground"><Clock className="h-3.5 w-3.5" /></span></TooltipTrigger><TooltipContent>Tem item sob encomenda — não enviar</TooltipContent></Tooltip>}
            <span className={cn('pe-row-detail shrink-0 text-xs', coluna.text)}>{enviado && ultimoEnvio(p) ? `enviado ${hora(new Date(ultimoEnvio(p) || ''))}` : prazoCurto(p, hoje, amanha, feriados, agora)}</span>
          </span>
        </Button>
      </motion.div>;
    })}</AnimatePresence>
  </div>;
  if (mobile && enviado) return <Collapsible open={expanded} onOpenChange={setExpanded} className="border rounded-lg bg-card"><CollapsibleTrigger asChild><Button variant="ghost" className="w-full flex gap-2 p-3 h-auto text-left">{header}<ChevronDown className={cn('h-4 w-4', expanded && 'rotate-180')} /></Button></CollapsibleTrigger><CollapsibleContent>{content}</CollapsibleContent></Collapsible>;
  return <Card className="pe-column shadow-none min-w-0 flex flex-col"><CardHeader className="pe-column-heading flex flex-row items-center gap-2 space-y-0 p-3 border-b bg-card rounded-t-lg">{header}</CardHeader>{content}</Card>;
}
function PedidoDetalhes({ pedido, onClose, onEnviar, onDone, hoje, amanha, feriados, agora }: {
  pedido: PedidoPE | null; onClose: () => void; onEnviar: (p: PedidoPE) => void; onDone: () => void;
  hoje: string; amanha: string; feriados: Set<string>; agora: Date;
}) {
  const mobile = useIsMobile(); const [desfazendo, setDesfazendo] = useState(false);
  if (!pedido) return null;
  const prontos = pedido.itens.filter(i => i.pronta_entrega && !i.enviado);
  const encomendas = pedido.itens.filter(i => !i.pronta_entrega);
  const enviados = pedido.itens.filter(i => i.enviado);
  const prazo = pedido.prazo_limite || hoje;
  const dias = diasUteisRestantes(prazo, feriados, agora);
  const telefone = normalizarTelefone(pedido.cliente_telefone);
  const shopifyId = pedido.shopify_order_id?.match(/(\d+)$/)?.[1];
  const status = !prontos.length ? 'Enviado' : prazo < hoje ? `Atrasado há ${Math.max(1, -dias)} ${-dias === 1 ? 'dia útil' : 'dias úteis'}` : prazo === hoje ? 'Vence hoje' : prazo === amanha ? 'Vence amanhã' : `Vence ${new Date(`${prazo}T12:00:00-03:00`).toLocaleDateString('pt-BR', { timeZone: TZ_BR, weekday: 'long' }).replace('-feira', '')}, ${prazo.slice(8, 10)}/${prazo.slice(5, 7)}`;
  const desfazer = async () => {
    setDesfazendo(true);
    try { const { data, error } = await supabase.functions.invoke('sincronizar-pronta-entrega', { body: { acao: 'desfazer', id: pedido.id } });
      if (error || !data?.sucesso) throw new Error(data?.erro || error?.message || 'Tente novamente');
      toast.success('Envio desfeito'); onDone(); onClose();
    } catch (e) { toast.error(e instanceof Error ? e.message : 'Não foi possível desfazer'); } finally { setDesfazendo(false); }
  };
  const title = <>{pedido.cliente_nome || 'Sem nome'}</>;
  const description = <span className="flex flex-wrap items-center gap-2">{pedido.pedido_numero}<Badge variant="outline" className={cn(prontos.length && prazo < hoje ? 'text-destructive' : prontos.length && prazo === hoje ? 'text-accent' : 'text-muted-foreground')}>{status}</Badge></span>;
  const itemList = (itens: ItemPE[], sent = false) => <ul className="space-y-2 text-sm">{itens.map((i, n) => <li key={n}><p>{i.quantidade}x {i.titulo}</p><p className="text-xs text-muted-foreground">{sent ? dataHora(i.enviado_em) : `até ${i.prazo_dias_uteis} dias úteis`}</p></li>)}</ul>;
  const body = <div className="space-y-5 py-4 text-sm">
    <section className="space-y-2"><h3 className="font-semibold">Cliente</h3><div className="flex flex-wrap items-center gap-2"><span>{pedido.cliente_telefone || 'Telefone não informado'}</span>{telefone && <Button variant="outline" size="sm" asChild><a href={`https://wa.me/${telefone}`} target="_blank" rel="noopener noreferrer"><MessageCircle className="h-4 w-4 mr-2" />WhatsApp</a></Button>}{pedido.cliente_telefone && <Button variant="ghost" size="icon" aria-label="Copiar telefone" onClick={async () => { try { await navigator.clipboard.writeText(pedido.cliente_telefone || ''); toast.success('Telefone copiado'); } catch { toast.error('Não foi possível copiar'); } }}><Copy className="h-4 w-4" /></Button>}</div></section>
    <section className="space-y-2 border-t pt-4"><h3 className="font-semibold">Pedido</h3><dl className="grid grid-cols-2 gap-x-4 gap-y-2"><dt className="text-muted-foreground">Origem</dt><dd>{({ site: 'Site', simulador: 'Simulador', manual: 'Manual' } as Record<string, string>)[pedido.origem] || pedido.origem}</dd><dt className="text-muted-foreground">Vendedor</dt><dd>{pedido.vendedor || '—'}</dd><dt className="text-muted-foreground">Pago em</dt><dd>{dataHora(pedido.data_pagamento)}</dd><dt className="text-muted-foreground">Prazo limite</dt><dd>{dataDia(pedido.prazo_limite)}</dd><dt className="text-muted-foreground">Dias úteis</dt><dd>{dias < 0 ? `${Math.abs(dias)} de atraso` : `${dias} restantes`}</dd></dl>
      {pedido.origem !== 'manual' && shopifyId && <Button variant="outline" size="sm" asChild><a href={`https://admin.shopify.com/store/5a187b-e3/orders/${shopifyId}`} target="_blank" rel="noopener noreferrer"><ExternalLink className="h-4 w-4 mr-2" />Abrir no Shopify</a></Button>}</section>
    <section className="space-y-2 border-t pt-4"><h3 className="font-semibold">Separar agora</h3>{prontos.length ? itemList(prontos) : <p className="text-muted-foreground">Nenhum item pronto pendente</p>}</section>
    {encomendas.length > 0 && <section className="space-y-2 border-t pt-4 text-muted-foreground"><h3 className="font-semibold">Sob encomenda — não enviar</h3>{itemList(encomendas)}</section>}
    {enviados.length > 0 && <section className="space-y-2 border-t pt-4"><h3 className="font-semibold">Já enviados</h3>{itemList(enviados, true)}</section>}
    {(pedido.observacao || pedido.rastreio || pedido.enviado_por) && <section className="space-y-2 border-t pt-4">{pedido.observacao && <div><h3 className="font-semibold">Observação</h3><p className="whitespace-pre-wrap break-words">{pedido.observacao}</p></div>}{pedido.rastreio && <p><span className="text-muted-foreground">Rastreio: </span>{pedido.rastreio}</p>}{pedido.enviado_por && <p><span className="text-muted-foreground">Enviado por: </span>{pedido.enviado_por}</p>}</section>}
  </div>;
  const actions = <div className="flex flex-wrap justify-end gap-2 border-t pt-4"><Button variant="outline" onClick={onClose}>Fechar</Button>{prontos.length > 0 ? <Button onClick={() => { onClose(); onEnviar(pedido); }}>Marcar como enviado</Button> : <Button variant="outline" disabled={desfazendo} onClick={desfazer}><Undo2 className="h-4 w-4 mr-2" />{desfazendo ? 'Desfazendo…' : 'Desfazer envio'}</Button>}</div>;
  if (mobile) return <Sheet open onOpenChange={open => !open && onClose()}><SheetContent side="bottom" className="max-h-[92dvh] overflow-y-auto rounded-t-lg px-4"><SheetHeader className="text-left pr-6"><SheetTitle>{title}</SheetTitle><SheetDescription asChild><div>{description}</div></SheetDescription></SheetHeader>{body}{actions}</SheetContent></Sheet>;
  return <Dialog open onOpenChange={open => !open && onClose()}><DialogContent className="max-w-xl max-h-[90dvh] overflow-y-auto"><DialogHeader className="pr-6"><DialogTitle>{title}</DialogTitle><DialogDescription asChild><div>{description}</div></DialogDescription></DialogHeader>{body}{actions}</DialogContent></Dialog>;
}

export default function ProntaEntrega() {
  const qc = useQueryClient();
  const [selecionado, setSelecionado] = useState<PedidoPE | null>(null);
  const [agora, setAgora] = useState(() => new Date());
  const [enviar, setEnviar] = useState<PedidoPE | null>(null);
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
  const hoje = ymdBR(agora);
  const amanha = new Date(`${hoje}T12:00:00Z`); amanha.setUTCDate(amanha.getUTCDate() + 1);
  const amanhaYmd = amanha.toISOString().slice(0, 10);
  const grupos = useMemo(() => {
    const resultado: Record<Grupo, PedidoPE[]> = { atrasado: [], hoje: [], amanha: [], proximos: [] };
    const abertos = pedidos.filter((p) => p.itens.some((item) => item.pronta_entrega && !item.enviado)).map((p) => ({
      ...p, prazo_limite: p.data_pagamento ? calcularPrazoLimite(new Date(p.data_pagamento), prazoDoPedido(p.itens), corte, feriados) : p.prazo_limite,
    })).sort((a, b) => (a.prazo_limite || '9999').localeCompare(b.prazo_limite || '9999') || (a.data_pagamento || '').localeCompare(b.data_pagamento || '') || a.pedido_numero.localeCompare(b.pedido_numero));
    for (const pedido of abertos) {
      const prazo = pedido.prazo_limite || hoje;
      const grupo: Grupo = prazo < hoje ? 'atrasado' : prazo === hoje ? 'hoje' : prazo === amanhaYmd ? 'amanha' : 'proximos';
      resultado[grupo].push(pedido);
    }
    return resultado;
  }, [pedidos, feriados, corte, hoje, amanhaYmd]);
  const enviadosHoje = pedidos.filter(p => p.itens.some(i => i.pronta_entrega && i.enviado && i.enviado_em && ymdBR(new Date(i.enviado_em)) === hoje)).sort((a, b) => (ultimoEnvio(b) || '').localeCompare(ultimoEnvio(a) || ''));
  return <div className={cn('pe-panel bg-background text-foreground space-y-4', telaCheia && 'pe-panel-fullscreen')}>
    <header className="flex flex-wrap items-start justify-between gap-3">
      <div className="flex gap-3"><Columns3 className="h-6 w-6 text-accent shrink-0 mt-0.5" /><div><h1 className="text-xl font-bold leading-tight">Pronta Entrega</h1><p className="text-xs text-muted-foreground mt-1">Pedidos com itens prontos para enviar</p></div></div>
      <div className="flex flex-wrap items-center gap-2"><div className="text-xs text-muted-foreground mr-1"><time className="font-medium tabular-nums text-foreground">{hora(agora)}</time><p>{ultimaSync ? `Atualizado às ${hora(new Date(ultimaSync))}` : 'Aguardando atualização'}</p></div>
        <Button variant="outline" size="sm" disabled={sincronizando} onClick={() => sincronizar(false)} className="gap-1.5"><RefreshCw className={cn('h-4 w-4', sincronizando && 'animate-spin')} />Sincronizar</Button>
        <Button variant="outline" size="sm" onClick={() => setManualOpen(true)} className="gap-1.5"><Plus className="h-4 w-4" />Adicionar manual</Button>
        <Button variant="outline" size="sm" onClick={alternarTela} className="gap-1.5">{telaCheia ? <Minimize className="h-4 w-4" /> : <Maximize className="h-4 w-4" />}{telaCheia ? 'Sair' : 'Tela cheia'}</Button>
      </div>
    </header>
    {isLoading ? <p role="status" className="text-sm text-muted-foreground">Carregando pedidos…</p> : isError ? <p role="alert" className="text-sm text-muted-foreground">Não foi possível carregar os pedidos. Tente sincronizar novamente.</p> : <div className="pe-board">{COLUNAS.map(coluna => <ColunaKanban key={coluna.key} coluna={coluna} pedidos={coluna.key === 'enviados' ? enviadosHoje : grupos[coluna.key]} onSelect={setSelecionado} hoje={hoje} amanha={amanhaYmd} feriados={feriados} agora={agora} />)}</div>}
    <PedidoDetalhes pedido={selecionado} onClose={() => setSelecionado(null)} onEnviar={setEnviar} onDone={recarregar} hoje={hoje} amanha={amanhaYmd} feriados={feriados} agora={agora} />
    <EnviarDialog pedido={enviar} onClose={() => setEnviar(null)} onDone={recarregar} />
    <ManualDialog open={manualOpen} onClose={() => setManualOpen(false)} onDone={recarregar} />
  </div>;
}

function EnviarDialog({ pedido, onClose, onDone }: { pedido: PedidoPE | null; onClose: () => void; onDone: () => void }) {
  const [quem, setQuem] = useState('');
  const [rastreio, setRastreio] = useState('');
  const [obs, setObs] = useState('');
  const [salvando, setSalvando] = useState(false);
  const { data: equipe = [] } = useQuery({
    queryKey: ['equipe-expedicao-ativos'],
    queryFn: async () => {
      const { data } = await supabase.from('equipe_expedicao').select('id, nome').eq('ativo', true).order('nome');
      return data ?? [];
    },
  });
  // Acesso compartilhado → nunca lembrar a última escolha
  useEffect(() => { if (pedido) { setQuem(''); setRastreio(''); setObs(''); } }, [pedido]);
  if (!pedido) return null;
  const itens = pedido.itens.filter((i) => !i.enviado && i.pronta_entrega);

  const confirmar = async () => {
    if (!quem) { toast.error('Escolha quem está enviando'); return; }
    setSalvando(true);
    try {
      const { data, error } = await supabase.functions.invoke('sincronizar-pronta-entrega', {
        body: { acao: 'marcar_enviado', id: pedido.id, enviado_por: quem, rastreio, observacao: obs },
      });
      if (error || !data?.sucesso) throw new Error(data?.erro ?? error?.message);
      toast.success('Itens prontos marcados como enviados!');
      onDone(); onClose();
    } catch (e: any) { toast.error(e?.message ?? 'Erro ao marcar'); } finally { setSalvando(false); }
  };

  return (
    <Dialog open onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-md rounded-lg">
        <DialogHeader>
          <DialogTitle>Marcar como enviado</DialogTitle>
          <DialogDescription>Confira se estes itens estão na caixa antes de confirmar.</DialogDescription>
        </DialogHeader>
        <div className="space-y-3">
          <div className="border-t pt-2 text-sm">
            <p className="font-semibold">{pedido.cliente_nome ?? 'Sem nome'} <span className="text-xs text-muted-foreground font-normal">· {pedido.pedido_numero}</span></p>
            <ul className="mt-1 space-y-0.5">{itensTxt(itens).map((t, i) => <li key={i}>• {t}</li>)}</ul>
          </div>
          <div className="space-y-1">
            <Label>Quem está enviando *</Label>
            <Select value={quem} onValueChange={setQuem}>
              <SelectTrigger className="h-11"><SelectValue placeholder="Selecione uma pessoa" /></SelectTrigger>
              <SelectContent>{equipe.map((e) => <SelectItem key={e.id} value={e.nome}>{e.nome}</SelectItem>)}</SelectContent>
            </Select>
            {equipe.length === 0 && <p className="text-[11px] text-muted-foreground">Cadastre uma pessoa ativa em Valores do Simulador → Expedição antes de confirmar.</p>}
          </div>
          <div className="space-y-1">
            <Label>Código de rastreio (opcional)</Label>
            <Input value={rastreio} onChange={(e) => setRastreio(e.target.value)} placeholder="Ex.: AA123456789BR" className="h-11" />
          </div>
          <div className="space-y-1">
            <Label>Observação (opcional)</Label>
            <Textarea value={obs} onChange={(e) => setObs(e.target.value)} rows={2} />
          </div>
        </div>
        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={onClose}>Cancelar</Button>
          <Button onClick={confirmar} disabled={salvando || !quem} className="gap-1.5">
            {salvando && <Loader2 className="h-4 w-4 animate-spin" />} Confirmar envio
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
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
      toast.success('Pedido manual adicionado em "A enviar".');
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
