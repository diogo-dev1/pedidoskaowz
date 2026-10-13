import { useCallback, useEffect, useMemo, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription,
  AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Truck, RefreshCw, Search, Loader2, Plus, PackageCheck, Undo2, AlertTriangle, Info } from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { diasUteisRestantes, ymdBR, type ItemPE } from '@/lib/prontaEntrega';

interface PedidoPE {
  id: string;
  pedido_numero: string;
  shopify_order_id: string | null;
  origem: string;
  cliente_nome: string | null;
  cliente_telefone: string | null;
  vendedor: string | null;
  data_pagamento: string | null;
  itens: ItemPE[];
  classificacao: string;
  modo_envio: string | null;
  prazo_limite: string | null;
  status: string;
  enviado_em: string | null;
  enviado_por: string | null;
  rastreio: string | null;
  observacao: string | null;
}

type Aba = 'todos' | 'enviar' | 'definir' | 'producao' | 'enviados';
type Filtro = null | 'atrasados' | 'hoje' | 'amanha' | 'semana';

const diaMes = (ymd?: string | null) => (ymd ? ymd.slice(8, 10) + '/' + ymd.slice(5, 7) : '—');
const dataHora = (iso?: string | null) =>
  iso ? new Date(iso).toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo', day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : '—';

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
function inicioSemana(): string {
  const h = ymdBR(new Date());
  const [y, m, d] = h.split('-').map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d));
  const dow = (dt.getUTCDay() + 6) % 7; // segunda = 0
  dt.setUTCDate(dt.getUTCDate() - dow);
  return dt.toISOString().slice(0, 10);
}
function haQuanto(iso: string | null) {
  if (!iso) return 'nunca';
  const min = Math.max(0, Math.round((Date.now() - new Date(iso).getTime()) / 60000));
  if (min < 1) return 'agora mesmo';
  if (min < 60) return `há ${min} min`;
  const h = Math.round(min / 60);
  return h < 24 ? `há ${h} h` : `há ${Math.round(h / 24)} dias`;
}
const itensTxt = (it: ItemPE[]) => it.map((i) => `${i.quantidade}x ${i.titulo}`);

export default function ProntaEntrega() {
  const qc = useQueryClient();
  const [aba, setAba] = useState<Aba>('todos');
  const [filtro, setFiltro] = useState<Filtro>(null);
  const [busca, setBusca] = useState('');
  const [sincronizando, setSincronizando] = useState(false);
  const [tick, setTick] = useState(0);
  const [enviar, setEnviar] = useState<PedidoPE | null>(null);
  const [desfazer, setDesfazer] = useState<PedidoPE | null>(null);
  const [manualOpen, setManualOpen] = useState(false);
  const [acaoId, setAcaoId] = useState<string | null>(null);

  const { data: pedidos = [], isLoading } = useQuery({
    queryKey: ['pronta-entrega'],
    queryFn: async () => {
      const { data, error } = await supabase.from('pedidos_pronta_entrega').select('*').order('prazo_limite', { ascending: true });
      if (error) throw error;
      return ((data ?? []) as unknown as PedidoPE[]).map((p) =>
        p.origem !== 'simulador' && p.modo_envio === 'a_definir' ? { ...p, modo_envio: 'junto' } : p
      );
    },
  });
  const { data: feriados = new Set<string>() } = useQuery({
    queryKey: ['feriados'],
    queryFn: async () => {
      const { data } = await supabase.from('feriados').select('data');
      return new Set<string>((data ?? []).map((f) => f.data));
    },
  });
  const { data: ultimaSync = null } = useQuery({
    queryKey: ['pe-ultima-sync'],
    queryFn: async () => {
      const { data } = await supabase.from('config_expedicao').select('valor').eq('chave', 'ultima_sincronizacao').maybeSingle();
      return data?.valor ?? null;
    },
  });

  const recarregar = useCallback(() => {
    qc.invalidateQueries({ queryKey: ['pronta-entrega'] });
    qc.invalidateQueries({ queryKey: ['pe-ultima-sync'] });
  }, [qc]);

  const sincronizar = useCallback(async (silencioso = false) => {
    setSincronizando(true);
    try {
      const { data, error } = await supabase.functions.invoke('sincronizar-pronta-entrega', { body: { acao: 'sincronizar' } });
      if (error) throw error;
      if (!data?.sucesso) throw new Error(data?.erro ?? 'Falha na sincronização');
      if (!silencioso || data.novos || data.manuais_importados) {
        toast.success(`Sincronizado: ${data.novos} novos, ${data.atualizados} atualizados, ${data.tags_aplicadas} tags aplicadas, ${data.manuais_importados} manuais importados`);
      }
      if (data.avisos?.length) toast.warning(data.avisos[0]);
    } catch (e: any) {
      toast.error(`Não foi possível sincronizar: ${e?.message ?? 'erro'}`);
    } finally {
      setSincronizando(false);
      recarregar();
    }
  }, [recarregar]);

  useEffect(() => { sincronizar(true); }, []); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => { const t = setInterval(() => setTick((x) => x + 1), 60000); return () => clearInterval(t); }, []);

  const restantes = useCallback((p: PedidoPE) => (p.prazo_limite ? diasUteisRestantes(p.prazo_limite, feriados) : 99), [feriados]);

  const grupos = useMemo(() => {
    const enviar = pedidos.filter((p) => p.status === 'pendente' && (p.modo_envio === null || p.modo_envio === 'parcial'));
    const definir = pedidos.filter((p) => p.origem === 'simulador' && p.status === 'pendente' && p.modo_envio === 'a_definir');
    const producao = pedidos.filter((p) => (p.status === 'pendente' && p.modo_envio === 'junto') || p.status === 'enviado_parcial');
    const enviados = pedidos.filter((p) => p.status === 'enviado').sort((a, b) => (b.enviado_em ?? '').localeCompare(a.enviado_em ?? ''));
    return { enviar, definir, producao, enviados };
  }, [pedidos]);

  const semana = inicioSemana();
  const cont = {
    atrasados: grupos.enviar.filter((p) => restantes(p) < 0).length,
    hoje: grupos.enviar.filter((p) => restantes(p) === 0).length,
    amanha: grupos.enviar.filter((p) => restantes(p) === 1).length,
    semana: pedidos.filter((p) => p.status !== 'pendente' && p.enviado_em && ymdBR(new Date(p.enviado_em)) >= semana).length,
  };

  const lista = useMemo(() => {
    let l: PedidoPE[];
    if (filtro === 'semana') l = pedidos.filter((p) => p.status !== 'pendente' && p.enviado_em && ymdBR(new Date(p.enviado_em)) >= semana);
    else if (filtro) l = grupos.enviar.filter((p) => {
      const r = restantes(p);
      return filtro === 'atrasados' ? r < 0 : filtro === 'hoje' ? r === 0 : r === 1;
    });
    else l = aba === 'todos' ? pedidos : grupos[aba];
    l = [...l].sort((a, b) => {
      const enviados = Number(a.status === 'enviado') - Number(b.status === 'enviado');
      if (enviados) return enviados;
      if (a.status === 'enviado' && b.status === 'enviado') return (b.enviado_em ?? '').localeCompare(a.enviado_em ?? '');
      return (a.prazo_limite ?? '9999-12-31').localeCompare(b.prazo_limite ?? '9999-12-31')
        || (a.data_pagamento ?? '').localeCompare(b.data_pagamento ?? '')
        || a.pedido_numero.localeCompare(b.pedido_numero, 'pt-BR', { numeric: true });
    });
    const q = busca.trim().toLowerCase();
    if (q) l = l.filter((p) => (p.cliente_nome ?? '').toLowerCase().includes(q) || p.pedido_numero.toLowerCase().includes(q));
    return l;
  }, [pedidos, grupos, aba, filtro, busca, restantes, semana, tick]);

  const definirModo = async (p: PedidoPE, modo: 'junto' | 'parcial') => {
    setAcaoId(p.id);
    try {
      const { data, error } = await supabase.functions.invoke('sincronizar-pronta-entrega', { body: { acao: 'definir_modo', id: p.id, modo } });
      if (error || !data?.sucesso) throw new Error(data?.erro ?? error?.message);
      toast.success(modo === 'junto' ? 'Definido: tudo junto. O pedido foi para "Aguardando produção".' : 'Definido: pronta entrega primeiro. O pedido foi para "A enviar".');
      recarregar();
    } catch (e: any) { toast.error(e?.message ?? 'Erro ao salvar'); } finally { setAcaoId(null); }
  };

  const cartoes: { k: Exclude<Filtro, null>; titulo: string; n: number; cls: string }[] = [
    { k: 'atrasados', titulo: 'Atrasados', n: cont.atrasados, cls: 'text-destructive' },
    { k: 'hoje', titulo: 'Enviar hoje', n: cont.hoje, cls: 'text-primary' },
    { k: 'amanha', titulo: 'Vencem amanhã', n: cont.amanha, cls: 'text-warning' },
    { k: 'semana', titulo: 'Enviados na semana', n: cont.semana, cls: 'text-muted-foreground' },
  ];

  const vazio: Record<Aba, string> = {
    todos: 'Nenhum pedido de pronta entrega encontrado.',
    enviar: 'Nenhum pedido para separar agora. Quando entrar uma venda com item pronta entrega, ela aparece aqui automaticamente.',
    definir: 'Nenhum pedido esperando decisão. Aqui aparecem somente pedidos de rascunho com envio ainda não definido.',
    producao: 'Nada aguardando produção. Aqui ficam pedidos que vão "tudo junto" e os que já tiveram a parte pronta enviada.',
    enviados: 'Nenhum pedido enviado ainda. Depois de clicar em "Marcar como enviado", o pedido aparece aqui.',
  };

  return (
    <div className="max-w-5xl mx-auto py-4 px-2 sm:px-4 space-y-4">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div className="flex items-center gap-3">
          <Truck className="h-6 w-6 text-primary" />
          <div>
            <h1 className="text-xl sm:text-2xl font-bold">Pronta Entrega</h1>
            <p className="text-xs text-muted-foreground">{pedidos.length} pedidos · {pedidos.filter((p) => p.status !== 'enviado').length} em aberto</p>
          </div>
        </div>
        <div className="flex flex-col items-end gap-0.5">
          <Button size="sm" onClick={() => sincronizar(false)} disabled={sincronizando} className="gap-1.5">
            {sincronizando ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />} Sincronizar agora
          </Button>
          <span className="text-[10px] text-muted-foreground">Última sincronização: {haQuanto(ultimaSync)}</span>
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
            <TabsTrigger value="todos" className="rounded-none text-xs px-3 py-2">Todos ({pedidos.length})</TabsTrigger>
            <TabsTrigger value="enviar" className="rounded-none text-xs px-3 py-2">A enviar ({grupos.enviar.length})</TabsTrigger>
            <TabsTrigger value="definir" className="rounded-none text-xs px-3 py-2">Envio a definir ({grupos.definir.length})</TabsTrigger>
            <TabsTrigger value="producao" className="rounded-none text-xs px-3 py-2">Aguardando produção ({grupos.producao.length})</TabsTrigger>
            <TabsTrigger value="enviados" className="rounded-none text-xs px-3 py-2">Enviados ({grupos.enviados.length})</TabsTrigger>
          </TabsList>
        </Tabs>
        <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-muted-foreground">
          <span>{lista.length} {lista.length === 1 ? 'pedido' : 'pedidos'}{filtro ? ` · ${cartoes.find((c) => c.k === filtro)?.titulo}` : ''} · Mais urgentes primeiro</span>
          {(filtro || aba !== 'todos' || busca) && <Button variant="ghost" size="sm" className="h-7 text-xs" onClick={() => { setFiltro(null); setAba('todos'); setBusca(''); }}>Limpar filtros</Button>}
        </div>
      </div>

      {isLoading ? (
        <p className="text-center text-muted-foreground py-8">Carregando pedidos...</p>
      ) : lista.length === 0 ? (
        <div className="rounded-none border border-dashed p-6 text-center text-sm text-muted-foreground space-y-1">
          <Info className="h-5 w-5 mx-auto" />
          <p>{busca ? 'Nenhum pedido encontrado com essa busca.' : filtro ? 'Nenhum pedido nesta situação. 👍' : vazio[aba]}</p>
        </div>
      ) : (
        <div className="space-y-2">
          {lista.map((p) => {
            const prontos = p.itens.filter((i) => i.pronta_entrega);
            const encomenda = p.itens.filter((i) => !i.pronta_entrega);
            const naoEnviados = p.itens.filter((i) => !i.enviado);
            const r = restantes(p);

            if (p.status === 'enviado') {
              return (
                <div key={p.id} className="rounded-none border bg-muted/30 p-3 text-muted-foreground space-y-1">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="font-semibold text-foreground/80 truncate">{p.cliente_nome ?? 'Sem nome'}</p>
                      <p className="text-xs">{p.pedido_numero}{p.vendedor ? ` · ${p.vendedor}` : ''}</p>
                    </div>
                    <Button size="sm" variant="ghost" className="gap-1 shrink-0" onClick={() => setDesfazer(p)}><Undo2 className="h-4 w-4" /> Desfazer</Button>
                  </div>
                  <p className="text-xs">Enviado em {dataHora(p.enviado_em)}{p.enviado_por ? <> por <b>{p.enviado_por}</b></> : ''}</p>
                  <p className="text-xs">Rastreio: {p.rastreio || 'não informado'}</p>
                  <ul className="text-xs list-disc pl-4">{itensTxt(p.itens).map((t, i) => <li key={i}>{t}</li>)}</ul>
                </div>
              );
            }

            if (p.origem === 'simulador' && p.modo_envio === 'a_definir' && p.status === 'pendente') {
              return (
                <div key={p.id} className="rounded-none border border-warning/40 bg-card p-3 space-y-2">
                  <div>
                    <p className="font-semibold">{p.cliente_nome ?? 'Sem nome'}</p>
                    <p className="text-xs text-muted-foreground">{p.pedido_numero}{p.vendedor ? ` · ${p.vendedor}` : ''}{p.cliente_telefone ? ` · ${p.cliente_telefone}` : ''}</p>
                  </div>
                  <p className="text-xs flex gap-1.5"><AlertTriangle className="h-4 w-4 text-warning shrink-0" />O vendedor precisa confirmar com o cliente se envia tudo junto ou a pronta entrega antes. A expedição não deve enviar ainda.</p>
                  <div className="text-xs grid sm:grid-cols-2 gap-1">
                    <div><b>Prontos:</b> {itensTxt(prontos).join(', ')}</div>
                    <div><b>Sob encomenda:</b> {itensTxt(encomenda).join(', ')}</div>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    <Button variant="outline" className="h-11" disabled={acaoId === p.id} onClick={() => definirModo(p, 'junto')}>Tudo junto</Button>
                    <Button className="h-11" disabled={acaoId === p.id} onClick={() => definirModo(p, 'parcial')}>Pronta entrega primeiro</Button>
                  </div>
                </div>
              );
            }

            const aguardando = p.status === 'enviado_parcial' || p.modo_envio === 'junto';
            if (aguardando) {
              return (
                <div key={p.id} className="rounded-none border bg-card p-3 space-y-1.5">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="font-semibold truncate">{p.cliente_nome ?? 'Sem nome'}</p>
                      <p className="text-xs text-muted-foreground">{p.pedido_numero}{p.vendedor ? ` · ${p.vendedor}` : ''}</p>
                    </div>
                    <span className="text-[11px] rounded-full bg-muted px-2 py-0.5 shrink-0">
                      {p.status === 'enviado_parcial' ? 'Parte pronta já enviada' : 'Vai tudo junto'}
                    </span>
                  </div>
                  <p className="text-xs"><b>Falta enviar:</b> {itensTxt(naoEnviados).join(', ')}</p>
                  <p className="text-xs text-muted-foreground">Prazo da lâmina: {diaMes(p.prazo_limite)} · {textoPrazo(r)}</p>
                  {p.status === 'enviado_parcial' && <p className="text-[11px] text-muted-foreground">Parte pronta enviada em {dataHora(p.enviado_em)}{p.enviado_por ? ` por ${p.enviado_por}` : ''} {p.rastreio ? `· rastreio ${p.rastreio}` : ''}</p>}
                  <div className="flex flex-wrap gap-2 pt-1">
                    <Button size="sm" variant="outline" className="gap-1.5" onClick={() => setEnviar(p)}><PackageCheck className="h-4 w-4" /> Marcar restante como enviado</Button>
                    {p.status === 'enviado_parcial' && <Button size="sm" variant="ghost" className="gap-1" onClick={() => setDesfazer(p)}><Undo2 className="h-4 w-4" /> Desfazer envio parcial</Button>}
                  </div>
                </div>
              );
            }

            const cor = corPrazo(r);
            const separar = p.modo_envio === 'parcial' ? prontos : p.itens;
            return (
              <div key={p.id} className="relative overflow-hidden rounded-none border bg-card p-3 pl-4 space-y-1.5">
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
                {p.modo_envio === 'parcial' && encomenda.length > 0 && (
                  <p className="text-[11px] text-muted-foreground">
                    Também neste pedido: {encomenda.length} {encomenda.length === 1 ? 'item sob encomenda' : 'itens sob encomenda'} (sai depois)
                  </p>
                )}
                {p.observacao && <p className="text-[11px] text-muted-foreground">Obs.: {p.observacao}</p>}
                <Button className="w-full sm:w-auto h-11 gap-1.5 mt-1" onClick={() => setEnviar(p)}><PackageCheck className="h-4 w-4" /> Marcar como enviado</Button>
              </div>
            );
          })}
        </div>
      )}

      <EnviarDialog pedido={enviar} onClose={() => setEnviar(null)} onDone={recarregar} />
      <DesfazerDialog pedido={desfazer} onClose={() => setDesfazer(null)} onDone={recarregar} />
      <ManualDialog open={manualOpen} onClose={() => setManualOpen(false)} onDone={recarregar} />
    </div>
  );
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
  const soProntos = pedido.status === 'pendente' && pedido.modo_envio !== 'junto';
  const itens = pedido.itens.filter((i) => !i.enviado && (!soProntos || i.pronta_entrega));

  const confirmar = async () => {
    setSalvando(true);
    try {
      const { data, error } = await supabase.functions.invoke('sincronizar-pronta-entrega', {
        body: { acao: 'marcar_enviado', id: pedido.id, enviado_por: quem, rastreio, observacao: obs },
      });
      if (error || !data?.sucesso) throw new Error(data?.erro ?? error?.message);
      toast.success(data.status === 'enviado_parcial' ? 'Parte pronta marcada como enviada. A lâmina segue em "Aguardando produção".' : 'Pedido marcado como enviado!');
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
            <Label>Quem está enviando (opcional)</Label>
            <Select value={quem} onValueChange={setQuem}>
              <SelectTrigger className="h-11"><SelectValue placeholder="Não é obrigatório informar" /></SelectTrigger>
              <SelectContent>{equipe.map((e) => <SelectItem key={e.id} value={e.nome}>{e.nome}</SelectItem>)}</SelectContent>
            </Select>
            {equipe.length === 0 && <p className="text-[11px] text-muted-foreground">Nenhuma pessoa cadastrada — não precisa informar nada, é só confirmar o envio.</p>}
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
          <Button onClick={confirmar} disabled={salvando} className="gap-1.5">
            {salvando && <Loader2 className="h-4 w-4 animate-spin" />} Confirmar envio
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function DesfazerDialog({ pedido, onClose, onDone }: { pedido: PedidoPE | null; onClose: () => void; onDone: () => void }) {
  const [salvando, setSalvando] = useState(false);
  const confirmar = async () => {
    if (!pedido) return;
    setSalvando(true);
    try {
      const { data, error } = await supabase.functions.invoke('sincronizar-pronta-entrega', { body: { acao: 'desfazer', id: pedido.id } });
      if (error || !data?.sucesso) throw new Error(data?.erro ?? error?.message);
      toast.success('Envio desfeito. O pedido voltou para a lista anterior.');
      onDone(); onClose();
    } catch (e: any) { toast.error(e?.message ?? 'Erro ao desfazer'); } finally { setSalvando(false); }
  };
  return (
    <AlertDialog open={!!pedido} onOpenChange={(v) => !v && onClose()}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Desfazer o envio?</AlertDialogTitle>
          <AlertDialogDescription>
            O pedido {pedido?.pedido_numero} de {pedido?.cliente_nome} volta a aparecer como não enviado. Use só se marcou por engano.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancelar</AlertDialogCancel>
          <AlertDialogAction onClick={(e) => { e.preventDefault(); confirmar(); }} disabled={salvando}>Desfazer</AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
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
