import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { RefreshCw, Loader2, Plus, Maximize, Minimize, Copy, MessageCircle, ExternalLink, Undo2, Truck, Search, Info, PackageCheck } from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';
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
type Filtro = null | 'atrasados' | 'hoje' | 'amanha' | 'semana';
type Aba = 'todos' | 'enviar' | 'enviados';
const dataHora = (data: string | null | undefined) => data ? new Date(data).toLocaleString('pt-BR', { timeZone: TZ_BR, dateStyle: 'short', timeStyle: 'short' }) : '—';
const dataDia = (data: string | null) => data ? data.split('-').reverse().join('/') : '—';
const diaMes = (ymd?: string | null) => (ymd ? ymd.slice(8, 10) + '/' + ymd.slice(5, 7) : '—');
const ultimoEnvio = (p: PedidoPE) => p.itens.filter(i => i.pronta_entrega && i.enviado && i.enviado_em).map(i => i.enviado_em || '').sort().reverse()[0] || p.enviado_em;
const pendente = (p: PedidoPE) => p.itens.some(i => i.pronta_entrega && !i.enviado);
function textoPrazo(r: number) {
  if (r < 0) return `Atrasado há ${-r} ${-r === 1 ? 'dia útil' : 'dias úteis'}`;
  if (r === 0) return 'Enviar hoje';
  if (r === 1) return 'Vence amanhã';
  return `Faltam ${r} dias úteis`;
}
function corPrazo(r: number) {
  if (r < 0) return { faixa: 'bg-destructive', texto: 'text-destructive' };
  if (r === 0) return { faixa: 'bg-primary', texto: 'text-primary' };
  if (r === 1) return { faixa: 'bg-warning', texto: 'text-warning' };
  return { faixa: 'bg-success', texto: 'text-success' };
}
function inicioSemana(hoje: string): string {
  const [y, m, d] = hoje.split('-').map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d));
  dt.setUTCDate(dt.getUTCDate() - ((dt.getUTCDay() + 6) % 7));
  return dt.toISOString().slice(0, 10);
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
  const abertos = useMemo(() => pedidos.map((p) => pendente(p) && p.data_pagamento
    ? { ...p, prazo_limite: calcularPrazoLimite(new Date(p.data_pagamento), prazoDoPedido(p.itens), corte, feriados) } : p), [pedidos, corte, feriados]);
  const restantes = (p: PedidoPE) => (p.prazo_limite ? diasUteisRestantes(p.prazo_limite, feriados, agora) : 99);
  const [aba, setAba] = useState<Aba>('todos');
  const [filtro, setFiltro] = useState<Filtro>(null);
  const [busca, setBusca] = useState('');
  const semana = inicioSemana(hoje);
  const aEnviar = abertos.filter(pendente);
  const enviados = abertos.filter((p) => !pendente(p));
  const naSemana = (p: PedidoPE) => { const u = ultimoEnvio(p); return !!u && ymdBR(new Date(u)) >= semana; };
  const cont = {
    atrasados: aEnviar.filter((p) => restantes(p) < 0).length,
    hoje: aEnviar.filter((p) => restantes(p) === 0).length,
    amanha: aEnviar.filter((p) => restantes(p) === 1).length,
    semana: abertos.filter(naSemana).length,
  };
  let lista: PedidoPE[];
  if (filtro === 'semana') lista = abertos.filter(naSemana);
  else if (filtro) lista = aEnviar.filter((p) => { const r = restantes(p); return filtro === 'atrasados' ? r < 0 : filtro === 'hoje' ? r === 0 : r === 1; });
  else lista = aba === 'todos' ? abertos : aba === 'enviar' ? aEnviar : enviados;
  lista = [...lista].sort((a, b) => {
    const e = Number(!pendente(a)) - Number(!pendente(b));
    if (e) return e;
    if (!pendente(a)) return (ultimoEnvio(b) || '').localeCompare(ultimoEnvio(a) || '');
    return (a.prazo_limite ?? '9999').localeCompare(b.prazo_limite ?? '9999') || (a.data_pagamento ?? '').localeCompare(b.data_pagamento ?? '') || a.pedido_numero.localeCompare(b.pedido_numero, 'pt-BR', { numeric: true });
  });
  const q = busca.trim().toLowerCase();
  if (q) lista = lista.filter((p) => (p.cliente_nome ?? '').toLowerCase().includes(q) || p.pedido_numero.toLowerCase().includes(q));
  const cartoes: { k: Exclude<Filtro, null>; titulo: string; n: number; cls: string }[] = [
    { k: 'atrasados', titulo: 'Atrasados', n: cont.atrasados, cls: 'text-destructive' },
    { k: 'hoje', titulo: 'Enviar hoje', n: cont.hoje, cls: 'text-primary' },
    { k: 'amanha', titulo: 'Vencem amanhã', n: cont.amanha, cls: 'text-warning' },
    { k: 'semana', titulo: 'Enviados na semana', n: cont.semana, cls: 'text-muted-foreground' },
  ];
  const vazio: Record<Aba, string> = {
    todos: 'Nenhum pedido de pronta entrega encontrado.',
    enviar: 'Nenhum pedido para separar agora. Quando entrar uma venda com item pronta entrega, ela aparece aqui automaticamente.',
    enviados: 'Nenhum pedido enviado ainda. Depois de clicar em "Marcar como enviado", o pedido aparece aqui.',
  };
  const abrir = (p: PedidoPE) => setSelecionado(p);
  return <div className={cn('pe-panel max-w-5xl mx-auto py-4 px-2 sm:px-4 space-y-4', telaCheia && 'pe-panel-fullscreen')}>
    <div className="flex flex-wrap items-start justify-between gap-2">
      <div className="flex items-center gap-3">
        <Truck className="h-6 w-6 text-primary" />
        <div>
          <h1 className="text-xl sm:text-2xl font-bold">Pronta Entrega</h1>
          <p className="text-xs text-muted-foreground">{abertos.length} pedidos · {aEnviar.length} em aberto</p>
        </div>
      </div>
      <div className="flex flex-wrap items-start gap-2">
        <div className="flex flex-col items-end gap-0.5">
          <Button size="sm" onClick={() => sincronizar(false)} disabled={sincronizando} className="gap-1.5">
            {sincronizando ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />} Sincronizar agora
          </Button>
          <span className="text-[10px] text-muted-foreground">{hora(agora)} · {ultimaSync ? `Atualizado às ${hora(new Date(ultimaSync))}` : 'Aguardando atualização'}</span>
        </div>
        <Button variant="outline" size="sm" onClick={alternarTela} className="gap-1.5">{telaCheia ? <Minimize className="h-4 w-4" /> : <Maximize className="h-4 w-4" />}{telaCheia ? 'Sair' : 'Tela cheia'}</Button>
      </div>
    </div>

    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 max-w-2xl">
      {cartoes.map((c) => (
        <Button key={c.k} type="button" variant="outline" aria-pressed={filtro === c.k}
          onClick={() => { setAba('todos'); setFiltro(filtro === c.k ? null : c.k); }}
          className={cn('aspect-square h-auto min-w-0 rounded-none p-3 sm:p-4 flex flex-col items-start justify-between whitespace-normal text-left bg-card shadow-none', filtro === c.k && 'border-primary ring-1 ring-primary')}>
          <span className={cn('text-3xl sm:text-4xl font-semibold tabular-nums', c.cls)}>{c.n}</span>
          <span className="text-xs font-medium text-muted-foreground">{c.titulo}</span>
        </Button>
      ))}
    </div>
    <div className="flex flex-col sm:flex-row gap-2">
      <div className="relative flex-1">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input placeholder="Buscar por cliente ou número do pedido..." value={busca} onChange={(e) => setBusca(e.target.value)} className="pl-9" />
      </div>
      <div className="flex flex-col items-start sm:items-end">
        <Button variant="outline" size="sm" className="gap-1.5 h-10" onClick={() => setManualOpen(true)}>
          <Plus className="h-4 w-4" /> Adicionar pedido manual
        </Button>
        <span className="text-[10px] text-muted-foreground">Use só para exceções — o normal é lançar pelo Simulador</span>
      </div>
    </div>

    <div className="space-y-2 border-b pb-3">
      <Tabs value={aba} onValueChange={(v) => { setAba(v as Aba); setFiltro(null); }}>
        <TabsList className="flex flex-wrap justify-start w-full h-auto gap-1 rounded-none bg-transparent p-0">
          <TabsTrigger value="todos" className="rounded-none text-xs px-3 py-2">Todos ({abertos.length})</TabsTrigger>
          <TabsTrigger value="enviar" className="rounded-none text-xs px-3 py-2">A enviar ({aEnviar.length})</TabsTrigger>
          <TabsTrigger value="enviados" className="rounded-none text-xs px-3 py-2">Enviados ({enviados.length})</TabsTrigger>
        </TabsList>
      </Tabs>
      <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-muted-foreground">
        <span>{lista.length} {lista.length === 1 ? 'pedido' : 'pedidos'}{filtro ? ` · ${cartoes.find((c) => c.k === filtro)?.titulo}` : ''} · Mais urgentes primeiro</span>
        {(filtro || aba !== 'todos' || busca) && <Button variant="ghost" size="sm" className="h-7 text-xs" onClick={() => { setFiltro(null); setAba('todos'); setBusca(''); }}>Limpar filtros</Button>}
      </div>
    </div>

    {isLoading ? <p className="text-center text-muted-foreground py-8">Carregando pedidos...</p>
    : isError ? <p role="alert" className="text-center text-muted-foreground py-8">Não foi possível carregar os pedidos. Tente sincronizar novamente.</p>
    : lista.length === 0 ? (
      <div className="rounded-none border border-dashed p-6 text-center text-sm text-muted-foreground space-y-1">
        <Info className="h-5 w-5 mx-auto" />
        <p>{busca ? 'Nenhum pedido encontrado com essa busca.' : filtro ? 'Nenhum pedido nesta situação. 👍' : vazio[aba]}</p>
      </div>
    ) : (
      <div className="space-y-2">
        {lista.map((p) => {
          const label = `Ver pedido: ${p.cliente_nome || 'Sem nome'}, ${p.pedido_numero}`;
          const tecla = (e: React.KeyboardEvent) => { if (e.target === e.currentTarget && (e.key === 'Enter' || e.key === ' ')) { e.preventDefault(); abrir(p); } };
          if (!pendente(p)) {
            const enviadosItens = p.itens.filter((i) => i.enviado);
            return (
              <div key={p.id} role="button" tabIndex={0} aria-label={label} onClick={() => abrir(p)} onKeyDown={tecla}
                className="cursor-pointer rounded-none border bg-muted/30 p-3 text-muted-foreground space-y-1 hover:bg-muted/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="font-semibold text-foreground/80 truncate">{p.cliente_nome ?? 'Sem nome'}</p>
                    <p className="text-xs">{p.pedido_numero}{p.vendedor ? ` · ${p.vendedor}` : ''}</p>
                  </div>
                  <Button size="sm" variant="ghost" className="gap-1 shrink-0" onClick={(e) => { e.stopPropagation(); abrir(p); }}><Undo2 className="h-4 w-4" /> Desfazer</Button>
                </div>
                <p className="text-xs">Enviado em {dataHora(ultimoEnvio(p))}{p.enviado_por ? <> por <b>{p.enviado_por}</b></> : ''}</p>
                <p className="text-xs">Rastreio: {p.rastreio || 'não informado'}</p>
                <ul className="text-xs list-disc pl-4">{itensTxt(enviadosItens).map((t, i) => <li key={i}>{t}</li>)}</ul>
              </div>
            );
          }
          const r = restantes(p);
          const cor = corPrazo(r);
          const separar = p.itens.filter((i) => i.pronta_entrega && !i.enviado);
          const encomenda = p.itens.filter((i) => !i.pronta_entrega);
          return (
            <div key={p.id} role="button" tabIndex={0} aria-label={label} onClick={() => abrir(p)} onKeyDown={tecla}
              className="cursor-pointer relative overflow-hidden rounded-none border bg-card p-3 pl-4 space-y-1.5 hover:bg-muted/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
              <span className={cn('absolute left-0 top-0 bottom-0 w-1', cor.faixa)} />
              <p className={cn('text-sm font-semibold leading-tight', cor.texto)}>{textoPrazo(r)}</p>
              <div className="flex flex-wrap items-baseline justify-between gap-x-3">
                <p className="font-semibold">{p.cliente_nome ?? 'Sem nome'}</p>
                <p className="text-xs text-muted-foreground">Prazo limite: <b>{diaMes(p.prazo_limite)}</b></p>
              </div>
              <p className="text-xs text-muted-foreground">{p.pedido_numero}{p.vendedor ? ` · Vendedor: ${p.vendedor}` : ''}{p.origem === 'manual' ? ' · Manual' : ''}</p>
              <div className="border-t pt-2">
                <p className="text-[11px] font-semibold uppercase tracking-normal text-muted-foreground mb-0.5">Separar agora</p>
                <ul className="text-sm space-y-0.5">{itensTxt(separar).map((t, i) => <li key={i}>• {t}</li>)}</ul>
              </div>
              {encomenda.length > 0 && (
                <p className="text-[11px] text-muted-foreground">
                  Também neste pedido: {encomenda.length} {encomenda.length === 1 ? 'item sob encomenda' : 'itens sob encomenda'} — não enviar
                </p>
              )}
              {p.observacao && <p className="text-[11px] text-muted-foreground">Obs.: {p.observacao}</p>}
              <Button className="w-full sm:w-auto h-11 gap-1.5 mt-1" onClick={(e) => { e.stopPropagation(); setEnviar(p); }}><PackageCheck className="h-4 w-4" /> Marcar como enviado</Button>
            </div>
          );
        })}
      </div>
    )}
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
