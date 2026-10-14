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
import { RefreshCw, Loader2, Plus, Maximize, Minimize } from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { calcularPrazoLimite, prazoDoPedido, diasUteisRestantes, inicioContagem, ymdBR, TZ_BR, type ItemPE } from '@/lib/prontaEntrega';

interface PedidoPE {
  id: string; pedido_numero: string; shopify_order_id: string | null; origem: string;
  cliente_nome: string | null; cliente_telefone: string | null; vendedor: string | null;
  data_pagamento: string | null; itens: ItemPE[]; classificacao: string; prazo_limite: string | null;
  status: string; enviado_em: string | null; enviado_por: string | null; rastreio: string | null; observacao: string | null;
}
const itensTxt = (itens: ItemPE[]) => itens.map((item) => `${item.quantidade}x ${item.titulo}`);
const hora = (data: Date) => data.toLocaleTimeString('pt-BR', { timeZone: TZ_BR, hour: '2-digit', minute: '2-digit', hour12: false });
const nomeCurto = (nome: string | null) => { const partes = (nome || 'Sem nome').trim().split(/\s+/); return partes.length > 1 ? `${partes[0]} ${partes[partes.length - 1]}` : partes[0]; };
type Grupo = 'atrasado' | 'hoje' | 'amanha' | 'proximos';
function prazoTexto(prazo: string, hoje: string, amanha: string, feriados: Set<string>, agora: Date) {
  if (prazo < hoje) { const dias = Math.max(1, -diasUteisRestantes(prazo, feriados, agora)); return `atrasado há ${dias} ${dias === 1 ? 'dia' : 'dias'}`; }
  if (prazo === hoje) return 'vence hoje';
  if (prazo === amanha) return 'vence amanhã';
  const data = new Date(`${prazo}T12:00:00-03:00`);
  const semana = data.toLocaleDateString('pt-BR', { timeZone: TZ_BR, weekday: 'long' }).replace('-feira', '');
  return `vence ${semana} (${prazo.slice(8, 10)}/${prazo.slice(5, 7)})`;
}

function CartoesPainel({ pedidos, onSelect, hoje, amanha, feriados, agora, corte }: {
  pedidos: PedidoPE[]; onSelect: (p: PedidoPE) => void;
  hoje: string; amanha: string; feriados: Set<string>; agora: Date; corte: string;
}) {
  const scroller = useRef<HTMLDivElement>(null);
  const pausa = useRef(0);
  const reduced = useReducedMotion();
  useEffect(() => {
    if (reduced) return;
    let frame = 0; let ultimo = 0; let direcao = 1; let posicao = 0;
    pausa.current = performance.now() + 4000;
    const mover = (tempo: number) => {
      const element = scroller.current;
      if (element && window.innerWidth >= 1024 && tempo > pausa.current && element.scrollHeight > element.clientHeight) {
        const max = element.scrollHeight - element.clientHeight;
        const delta = ultimo ? Math.min(tempo - ultimo, 50) : 0;
        if (Math.abs(element.scrollTop - posicao) > 2) posicao = element.scrollTop;
        posicao = Math.max(0, Math.min(max, posicao + direcao * delta * 0.018));
        element.scrollTop = posicao;
        if (posicao >= max || posicao <= 0) { direcao *= -1; pausa.current = tempo + 4000; }
      }
      ultimo = tempo; frame = requestAnimationFrame(mover);
    };
    frame = requestAnimationFrame(mover);
    return () => cancelAnimationFrame(frame);
  }, [reduced]);
  return <div className="pe-card-scroll" ref={scroller} onPointerEnter={() => { pausa.current = Infinity; }}
    onPointerLeave={() => { pausa.current = performance.now() + 4000; }}
    onTouchStart={() => { pausa.current = Infinity; }} onTouchEnd={() => { pausa.current = performance.now() + 4000; }}
    onFocusCapture={() => { pausa.current = Infinity; }} onBlurCapture={() => { pausa.current = performance.now() + 4000; }}>
    <div className="pe-board"><AnimatePresence initial={false} mode="popLayout">
      {pedidos.map((pedido) => {
        const prazo = pedido.prazo_limite || hoje;
        const late = prazo < hoje; const today = prazo === hoje; const future = prazo > amanha;
        const encomenda = pedido.itens.filter((item) => !item.pronta_entrega).reduce((soma, item) => soma + item.quantidade, 0);
        const inicio = pedido.data_pagamento ? inicioContagem(new Date(pedido.data_pagamento), corte, feriados) : null;
        const total = inicio ? Math.max(0, diasUteisRestantes(prazo, feriados, new Date(`${inicio}T12:00:00-03:00`))) : 0;
        const restante = Math.max(0, diasUteisRestantes(prazo, feriados, agora));
        const fracao = late || today ? 1 : total > 0 ? Math.max(0, Math.min(1, (total - restante) / total)) : 0;
        const pago = pedido.data_pagamento ? ymdBR(new Date(pedido.data_pagamento)) : null;
        return <motion.div key={pedido.id} layout={!reduced} className={cn('pe-card-slot', late && 'pe-late', today && 'pe-today', future && 'pe-future')}
          initial={reduced ? false : { opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}
          exit={reduced ? { opacity: 0 } : { opacity: 0, scale: 0.97 }}
          transition={{ duration: reduced ? 0 : 0.4, ease: 'easeOut', layout: { duration: reduced ? 0 : 0.4 }, opacity: { duration: reduced ? 0 : 0.3 } }}>
          <Button variant="outline" className="pe-order" onClick={() => onSelect(pedido)}
            aria-label={`Marcar como enviado: ${pedido.cliente_nome || 'Sem nome'}, ${pedido.pedido_numero}`}>
            <span className="pe-order-heading"><span className="pe-order-name">{nomeCurto(pedido.cliente_nome)}</span><span className="pe-order-number">{pedido.pedido_numero}</span></span>
            <span className="pe-order-items">{pedido.itens.filter((item) => item.pronta_entrega && !item.enviado).map((item, index) => <span key={index}>{item.quantidade}x {item.titulo}</span>)}</span>
            {encomenda > 0 && <span className="pe-order-warning">+{encomenda} sob encomenda — não enviar</span>}
            <span className="pe-progress" role="progressbar" aria-label="Prazo consumido" aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.round(fracao * 100)}><span style={{ transform: `scaleX(${fracao})` }} /></span>
            <span className="pe-order-bottom"><span className="pe-order-deadline">{prazoTexto(prazo, hoje, amanha, feriados, agora)}</span>{pago && <span className="pe-order-paid">pago {pago.slice(8, 10)}/{pago.slice(5, 7)}</span>}</span>
          </Button>
        </motion.div>;
      })}
    </AnimatePresence></div>
  </div>;
}

export default function ProntaEntrega() {
  const qc = useQueryClient();
  const reduced = useReducedMotion();
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
  const enviadosHoje = pedidos.filter((pedido) => pedido.itens.some((item) => item.pronta_entrega && item.enviado && item.enviado_em && ymdBR(new Date(item.enviado_em)) === hoje)).length;
  const atrasados = grupos.atrasado.length; const paraHoje = grupos.hoje.length;
  const ordenados = [...grupos.atrasado, ...grupos.hoje, ...grupos.amanha, ...grupos.proximos];
  const urgente = atrasados + paraHoje;
  const resumo = atrasados ? [ `${atrasados} ${atrasados === 1 ? 'atrasado' : 'atrasados'}`, paraHoje ? `${paraHoje} para hoje` : '' ].filter(Boolean).join(' · ') : 'para enviar hoje';
  const hero = isLoading ? 'Carregando…' : isError ? 'Não foi possível carregar' : urgente ? String(urgente) : 'Tudo em dia';
  const proximo = ordenados[0];
  return <div className={cn('pe-panel', telaCheia && 'pe-panel-fullscreen')}>
    <header className="pe-header">
      <h1>PRONTA ENTREGA</h1>
      <div className="pe-header-right">
        <Tooltip><TooltipTrigger asChild><Button variant="ghost" size="icon" aria-label="Adicionar pedido manual" onClick={() => setManualOpen(true)}><Plus className="h-4 w-4" /></Button></TooltipTrigger><TooltipContent>Adicionar pedido manual</TooltipContent></Tooltip>
        <Tooltip><TooltipTrigger asChild><Button variant="ghost" size="icon" disabled={sincronizando} aria-label="Sincronizar agora" onClick={() => sincronizar(false)}><RefreshCw className={cn('h-4 w-4', sincronizando && 'animate-spin')} /></Button></TooltipTrigger><TooltipContent>Sincronizar agora</TooltipContent></Tooltip>
        <Button variant="ghost" size="sm" className="pe-fullscreen-control" onClick={alternarTela}>{telaCheia ? <Minimize className="h-4 w-4" /> : <Maximize className="h-4 w-4" />}<span>{telaCheia ? 'Sair' : 'Tela cheia'}</span></Button>
        <div className="pe-clock"><time>{hora(agora)}</time><span>{ultimaSync ? `Atualizado às ${hora(new Date(ultimaSync))}` : 'Aguardando atualização'}</span></div>
      </div>
    </header>
    <div role="status" className={cn('pe-hero', !isLoading && !isError && (atrasados ? 'pe-late' : paraHoje ? 'pe-today' : ''), (isLoading || isError) && 'pe-hero-muted')}>
      <AnimatePresence mode="wait" initial={false}><motion.div key={hero} className={cn('pe-hero-value', urgente > 0 && !isLoading && !isError && 'pe-hero-number')}
        initial={reduced ? false : { opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: reduced ? 0 : -8 }} transition={{ duration: reduced ? 0 : 0.18 }}>{hero}</motion.div></AnimatePresence>
      {!isLoading && !isError && <p className={urgente ? 'pe-hero-summary' : 'pe-hero-next'}>{urgente ? resumo : proximo ? `Próximo envio: ${prazoTexto(proximo.prazo_limite || hoje, hoje, amanhaYmd, feriados, agora)}` : 'Nenhum envio em aberto'}</p>}
    </div>
    {!isLoading && !isError && ordenados.length > 0 && <CartoesPainel pedidos={ordenados} onSelect={setEnviar} hoje={hoje} amanha={amanhaYmd} feriados={feriados} agora={agora} corte={corte} />}
    <footer className="pe-footer">Enviados hoje: <strong>{enviadosHoje}</strong></footer>
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
