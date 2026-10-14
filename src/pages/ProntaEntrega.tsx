import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
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
import { calcularPrazoLimite, prazoDoPedido, diasUteisRestantes, ymdBR, TZ_BR, type ItemPE } from '@/lib/prontaEntrega';

interface PedidoPE {
  id: string; pedido_numero: string; shopify_order_id: string | null; origem: string;
  cliente_nome: string | null; cliente_telefone: string | null; vendedor: string | null;
  data_pagamento: string | null; itens: ItemPE[]; classificacao: string; prazo_limite: string | null;
  status: string; enviado_em: string | null; enviado_por: string | null; rastreio: string | null; observacao: string | null;
}
const itensTxt = (itens: ItemPE[]) => itens.map((item) => `${item.quantidade}x ${item.titulo}`);
const hora = (data: Date) => data.toLocaleTimeString('pt-BR', { timeZone: TZ_BR, hour: '2-digit', minute: '2-digit', hour12: false });
const nomeCurto = (nome: string | null) => { const partes = (nome || 'Sem nome').trim().split(/\s+/); return partes.length > 1 ? `${partes[0]} ${partes.at(-1)}` : partes[0]; };
type Grupo = 'atrasado' | 'hoje' | 'amanha' | 'proximos';
const COLUNAS: { key: Grupo; titulo: string; cor: string }[] = [
  { key: 'atrasado', titulo: 'ATRASADO', cor: 'pe-late' },
  { key: 'hoje', titulo: 'HOJE', cor: 'pe-today' },
  { key: 'amanha', titulo: 'AMANHÃ', cor: 'pe-tomorrow' },
  { key: 'proximos', titulo: 'PRÓXIMOS DIAS', cor: 'pe-next' },
];
function prazoTexto(prazo: string, hoje: string, amanha: string, feriados: Set<string>, agora: Date) {
  if (prazo < hoje) { const dias = Math.max(1, -diasUteisRestantes(prazo, feriados, agora)); return `atrasado há ${dias} ${dias === 1 ? 'dia' : 'dias'}`; }
  if (prazo === hoje) return 'vence hoje';
  if (prazo === amanha) return 'vence amanhã';
  const data = new Date(`${prazo}T12:00:00-03:00`);
  const semana = data.toLocaleDateString('pt-BR', { timeZone: TZ_BR, weekday: 'long' }).replace('-feira', '');
  return `vence ${semana} (${prazo.slice(8, 10)}/${prazo.slice(5, 7)})`;
}

function ColunaPainel({ titulo, cor, pedidos, onSelect, hoje, amanha, feriados, agora }: {
  titulo: string; cor: string; pedidos: PedidoPE[]; onSelect: (p: PedidoPE) => void;
  hoje: string; amanha: string; feriados: Set<string>; agora: Date;
}) {
  const scroller = useRef<HTMLDivElement>(null);
  const pausa = useRef(0);
  useEffect(() => {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    let frame = 0; let ultimo = 0; let posicao = 0;
    const mover = (tempo: number) => {
      const element = scroller.current;
      if (element && window.innerWidth >= 1024 && tempo > pausa.current && element.scrollHeight > element.clientHeight) {
        const delta = ultimo ? Math.min(tempo - ultimo, 50) : 0;
        posicao = Math.max(posicao, element.scrollTop) + delta * 0.018;
        if (posicao >= element.scrollHeight - element.clientHeight) {
          element.scrollTop = 0; posicao = 0; pausa.current = tempo + 3500;
        } else element.scrollTop = posicao;
      }
      ultimo = tempo; frame = requestAnimationFrame(mover);
    };
    frame = requestAnimationFrame(mover);
    return () => cancelAnimationFrame(frame);
  }, [pedidos]);
  return <section className={cn('pe-column', cor)} aria-label={titulo}>
    <header className="pe-column-heading"><h2>{titulo}</h2><span>{pedidos.length}</span></header>
    <div className="pe-column-scroll" ref={scroller} onPointerEnter={() => { pausa.current = Infinity; }}
      onPointerLeave={() => { pausa.current = performance.now() + 2000; }} onTouchStart={() => { pausa.current = performance.now() + 10000; }}>
      {!pedidos.length ? <div className="pe-empty"><span>—</span><p>Nada aqui</p></div> : pedidos.map((pedido) => {
        const encomenda = pedido.itens.filter((item) => !item.pronta_entrega).reduce((soma, item) => soma + item.quantidade, 0);
        return <Button key={pedido.id} variant="outline" className="pe-order" onClick={() => onSelect(pedido)}
          aria-label={`Marcar como enviado: ${pedido.cliente_nome || 'Sem nome'}, ${pedido.pedido_numero}`}>
          <span className="pe-order-name">{nomeCurto(pedido.cliente_nome)}</span>
          <span className="pe-order-number">{pedido.pedido_numero}</span>
          <span className="pe-order-items">{pedido.itens.filter((item) => item.pronta_entrega && !item.enviado).map((item, index) => <span key={index}>{item.quantidade}x {item.titulo}</span>)}</span>
          {encomenda > 0 && <span className="pe-order-warning">+{encomenda} {encomenda === 1 ? 'item' : 'itens'} sob encomenda — não enviar</span>}
          <span className="pe-order-deadline">{prazoTexto(pedido.prazo_limite || hoje, hoje, amanha, feriados, agora)}</span>
        </Button>;
      })}
    </div>
  </section>;
}

export default function ProntaEntrega() {
  const qc = useQueryClient();
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
  const { data: config = [] } = useQuery({ queryKey: ['pe-ultima-sync'], refetchInterval: 120000, queryFn: async () => {
    const { data, error } = await supabase.from('config_expedicao').select('chave, valor'); if (error) throw error; return data ?? [];
  } });
  const ultimaSync = config.find((c) => c.chave === 'ultima_sincronizacao')?.valor;
  const corte = config.find((c) => c.chave === 'horario_corte')?.valor || '14:00';
  const recarregar = useCallback(() => {
    qc.invalidateQueries({ queryKey: ['pronta-entrega'] }); qc.invalidateQueries({ queryKey: ['pe-ultima-sync'] });
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
  const status = atrasados ? `${atrasados} ${atrasados === 1 ? 'ENVIO ATRASADO' : 'ENVIOS ATRASADOS'}` : paraHoje ? `${paraHoje} PARA ENVIAR HOJE` : 'TUDO EM DIA';
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
    <div role="status" className={cn('pe-status', atrasados ? 'pe-late' : paraHoje ? 'pe-today' : 'pe-next')}>
      {isLoading ? 'CARREGANDO PEDIDOS' : isError ? 'NÃO FOI POSSÍVEL CARREGAR' : status}
    </div>
    <div className="pe-board">{COLUNAS.map((coluna) => <ColunaPainel key={coluna.key} {...coluna} pedidos={grupos[coluna.key]} onSelect={setEnviar} hoje={hoje} amanha={amanhaYmd} feriados={feriados} agora={agora} />)}</div>
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
