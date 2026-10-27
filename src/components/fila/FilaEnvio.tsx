import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Loader2, MessageCircle, X, SkipForward, Undo2, ThumbsDown, ChevronRight, Plus, Trash2, ListOrdered, Pencil } from 'lucide-react';
import { toast } from 'sonner';
import {
  META_PADRAO, PAUSA_MS, aplicarVariaveis, enviosRapidos, escolherVariacao, inicioDoDiaSP, montarFila,
} from '@/lib/filaEnvio';

export interface FilaItem {
  id: string;
  telefone: string | null; // já normalizado (55DDDNUMERO)
  nome: string;
  local?: string;
  detalhes?: string;
  valor?: string;
  quando?: string;
  vars: Record<string, string>;
  ref?: unknown; // dados que a página precisa para gravar o status
}

export type AcaoFila = 'contatado' | 'negativo' | 'pendente';

interface Props {
  origem: 'checkout' | 'upsell';
  open: boolean;
  onClose: () => void;
  carregar: () => Promise<FilaItem[]>;
  templates: { id: string; nome: string; mensagem: string }[];
  variaveis: string[];
  rotuloNegativo: string;
  marcar: (item: FilaItem, acao: AcaoFila) => Promise<void>;
}

interface Historico { id: string; acao: 'enviado' | 'pulado' | 'negativo'; logId?: string }
interface Sessao {
  dia: string;
  mensagens: string[];
  itens: Record<string, FilaItem>;
  fila: string[];
  pos: number;
  editadas: Record<string, string>;
  historico: Historico[];
  envios: number[];
}

const DESTRUTIVO_OK = (e: { message: string } | null) => !e;

export default function FilaEnvio({ origem, open, onClose, carregar, templates, variaveis, rotuloNegativo, marcar }: Props) {
  const { user } = useAuth();
  const chaveSessao = `fila-envio-${origem}-${user?.id ?? 'anon'}`;
  const chaveMeta = `fila-meta-${user?.id ?? 'anon'}`;

  const [etapa, setEtapa] = useState<'carregando' | 'config' | 'fila' | 'fim'>('carregando');
  const [candidatos, setCandidatos] = useState<FilaItem[]>([]);
  const [mensagens, setMensagens] = useState<string[]>(['']);
  const [templateId, setTemplateId] = useState('livre');
  const [meta, setMeta] = useState(META_PADRAO);
  const [hoje, setHoje] = useState(0);
  const [sessao, setSessao] = useState<Sessao | null>(null);
  const [salva, setSalva] = useState<Sessao | null>(null);
  const [editando, setEditando] = useState(false);
  const [pausaAte, setPausaAte] = useState<number | null>(null);
  const [agora, setAgora] = useState(Date.now());
  const [metaAvisada, setMetaAvisada] = useState(false);
  const [animando, setAnimando] = useState(false);
  const [ocupado, setOcupado] = useState(false);
  const aguardando = useRef<number | null>(null);

  const dia = inicioDoDiaSP();

  // ── abrir: carrega candidatos e exclusões do dia ──
  useEffect(() => {
    if (!open) return;
    let vivo = true;
    (async () => {
      setEtapa('carregando');
      setMeta(Number(localStorage.getItem(chaveMeta)) || META_PADRAO);
      try {
        const raw = localStorage.getItem(chaveSessao);
        const s = raw ? (JSON.parse(raw) as Sessao) : null;
        setSalva(s && s.dia === dia && s.pos < s.fila.length ? s : null);
      } catch { setSalva(null); }
      const [lista, log, site] = await Promise.all([
        carregar(),
        supabase.from('contatos_whatsapp_log').select('telefone, enviado_por').gte('enviado_em', dia),
        supabase.from('upsell_contatos_site').select('telefone').gte('contatado_em', dia),
      ]);
      if (!vivo) return;
      const excluir = new Set<string>([
        ...((log.data ?? []).map((r) => r.telefone)),
        ...((site.data ?? []).map((r) => r.telefone)),
      ]);
      setHoje((log.data ?? []).filter((r) => r.enviado_por === user?.id).length);
      setCandidatos(montarFila(lista, excluir));
      const primeiro = templates[0];
      setTemplateId(primeiro ? primeiro.id : 'livre');
      setMensagens([primeiro?.mensagem ?? '']);
      setEtapa('config');
    })().catch((e) => { toast.error('Erro ao montar a fila: ' + e.message); onClose(); });
    return () => { vivo = false; };
  }, [open]); // eslint-disable-line react-hooks/exhaustive-deps

  // modelos podem chegar depois da abertura
  useEffect(() => {
    if (etapa !== 'config' || templateId !== 'livre' || mensagens[0].trim() || !templates[0]) return;
    setTemplateId(templates[0].id);
    setMensagens((m) => [templates[0].mensagem, ...m.slice(1)]);
  }, [templates, etapa]); // eslint-disable-line react-hooks/exhaustive-deps

  // persistir sessão
  useEffect(() => { if (sessao) localStorage.setItem(chaveSessao, JSON.stringify(sessao)); }, [sessao, chaveSessao]);

  // relógio para a pausa
  useEffect(() => {
    if (!pausaAte) return;
    const t = setInterval(() => setAgora(Date.now()), 1000);
    return () => clearInterval(t);
  }, [pausaAte]);
  useEffect(() => { if (pausaAte && agora >= pausaAte) setPausaAte(null); }, [agora, pausaAte]);

  const atual = sessao ? sessao.itens[sessao.fila[sessao.pos]] : null;
  const enviadosN = sessao?.historico.filter((h) => h.acao === 'enviado').length ?? 0;

  const mensagemAtual = useMemo(() => {
    if (!sessao || !atual) return '';
    return sessao.editadas[atual.id] ?? aplicarVariaveis(escolherVariacao(sessao.mensagens, enviadosN), atual.vars);
  }, [sessao, atual, enviadosN]);

  const avancar = useCallback(() => {
    aguardando.current = null;
    setEditando(false);
    setAnimando(true);
    setTimeout(() => setAnimando(false), 250);
    setSessao((s) => {
      if (!s) return s;
      const n = { ...s, pos: s.pos + 1 };
      if (n.pos >= n.fila.length) setEtapa('fim');
      return n;
    });
  }, []);

  // ao voltar do WhatsApp, avança sozinho
  useEffect(() => {
    if (etapa !== 'fila') return;
    const volta = () => {
      if (document.visibilityState !== 'visible' || aguardando.current === null) return;
      if (Date.now() - aguardando.current < 800) return;
      avancar();
    };
    document.addEventListener('visibilitychange', volta);
    window.addEventListener('focus', volta);
    return () => { document.removeEventListener('visibilitychange', volta); window.removeEventListener('focus', volta); };
  }, [etapa, avancar]);

  const comecar = () => {
    if (!mensagens.some((m) => m.trim())) { toast.error('Escreva ou escolha a mensagem da fila'); return; }
    localStorage.setItem(chaveMeta, String(meta));
    const s: Sessao = {
      dia, mensagens: mensagens.filter((m) => m.trim()),
      itens: Object.fromEntries(candidatos.map((c) => [c.id, c])),
      fila: candidatos.map((c) => c.id), pos: 0, editadas: {}, historico: [], envios: [],
    };
    setSessao(s); setMetaAvisada(hoje >= meta); setEtapa(s.fila.length ? 'fila' : 'fim');
  };

  const retomar = () => {
    if (!salva) return;
    setSessao(salva); setEtapa('fila');
  };

  const enviar = async () => {
    if (!sessao || !atual?.telefone || ocupado) return;
    setOcupado(true);
    const url = `https://wa.me/${atual.telefone}?text=${encodeURIComponent(mensagemAtual)}`;
    aguardando.current = Date.now();
    window.open(url, 'kaowz-whatsapp');
    try {
      const [, log] = await Promise.all([
        marcar(atual, 'contatado'),
        supabase.from('contatos_whatsapp_log').insert({ telefone: atual.telefone, origem, enviado_por: user?.id }).select('id').single(),
      ]);
      const envios = [...sessao.envios, Date.now()];
      setSessao((s) => s && { ...s, envios, historico: [...s.historico, { id: atual.id, acao: 'enviado', logId: log.data?.id }] });
      const novoHoje = hoje + 1;
      setHoje(novoHoje);
      if (enviosRapidos(envios)) setPausaAte(Date.now() + PAUSA_MS);
      if (novoHoje >= meta && !metaAvisada) { setMetaAvisada(true); toast.success('Meta do dia atingida 🎉 Pode continuar se quiser.'); }
    } finally { setOcupado(false); }
  };

  const pular = () => {
    if (!sessao || !atual) return;
    setSessao({ ...sessao, fila: [...sessao.fila, atual.id], historico: [...sessao.historico, { id: atual.id, acao: 'pulado' }] });
    avancar();
  };

  const negativo = async () => {
    if (!sessao || !atual) return;
    setOcupado(true);
    try { await marcar(atual, 'negativo'); } finally { setOcupado(false); }
    setSessao((s) => s && { ...s, historico: [...s.historico, { id: atual.id, acao: 'negativo' }] });
    avancar();
  };

  const desfazer = async () => {
    if (!sessao || !sessao.historico.length) return;
    const ult = sessao.historico[sessao.historico.length - 1];
    const item = sessao.itens[ult.id];
    // se o último ainda está na tela (enviado sem avançar), só reverte a ação
    const naTela = sessao.fila[sessao.pos] === ult.id && ult.acao === 'enviado';
    setOcupado(true);
    try {
      if (ult.acao !== 'pulado') await marcar(item, 'pendente');
      if (ult.logId) {
        const { error } = await supabase.from('contatos_whatsapp_log').delete().eq('id', ult.logId);
        if (DESTRUTIVO_OK(error)) setHoje((h) => Math.max(0, h - 1));
      }
    } finally { setOcupado(false); }
    aguardando.current = null;
    setSessao((s) => {
      if (!s) return s;
      const fila = ult.acao === 'pulado' ? s.fila.slice(0, -1) : s.fila;
      return { ...s, fila, pos: naTela ? s.pos : Math.max(0, s.pos - 1), historico: s.historico.slice(0, -1), envios: ult.acao === 'enviado' ? s.envios.slice(0, -1) : s.envios };
    });
    setEtapa('fila');
  };

  const fechar = () => { aguardando.current = null; setEditando(false); onClose(); };
  const voltarLista = () => { localStorage.removeItem(chaveSessao); setSessao(null); fechar(); };

  const resumo = useMemo(() => {
    const h = sessao?.historico ?? [];
    const pulados = new Set(h.filter((x) => x.acao === 'pulado').map((x) => x.id));
    h.filter((x) => x.acao !== 'pulado').forEach((x) => pulados.delete(x.id));
    return { enviados: enviadosN, pulados: pulados.size, negativos: h.filter((x) => x.acao === 'negativo').length };
  }, [sessao, enviadosN]);

  const previa = candidatos[0] ? aplicarVariaveis(mensagens.find((m) => m.trim()) ?? '', candidatos[0].vars) : '';
  const total = sessao?.fila.length ?? 0;
  const restante = pausaAte ? Math.max(0, Math.ceil((pausaAte - agora) / 1000)) : 0;

  if (!open) return null;

  // ── Tela de configuração (dialog) ──
  if (etapa === 'carregando' || etapa === 'config') {
    return (
      <Dialog open onOpenChange={(v) => !v && fechar()}>
        <DialogContent className="w-[calc(100vw-1.5rem)] sm:w-full max-w-lg max-h-[90vh] overflow-y-auto overflow-x-hidden p-4 sm:p-6 rounded-xl">
          <DialogHeader><DialogTitle className="text-base flex items-center gap-2"><ListOrdered className="h-4 w-4 text-primary" /> Mensagem desta fila</DialogTitle></DialogHeader>
          {etapa === 'carregando' ? (
            <div className="flex items-center justify-center gap-2 py-10 text-muted-foreground"><Loader2 className="h-5 w-5 animate-spin" /> Montando a fila...</div>
          ) : (
            <div className="space-y-4 min-w-0">
              {salva && (
                <div className="rounded-lg border border-primary/40 bg-primary/5 p-3 space-y-2">
                  <p className="text-sm">Você tem uma fila em andamento: <b>{salva.pos} de {salva.fila.length}</b>.</p>
                  <Button className="w-full" onClick={retomar}>Retomar de onde parei</Button>
                </div>
              )}
              <p className="text-xs text-muted-foreground">
                Escolha a mensagem <b>uma vez</b>. Depois o app mostra um cliente por vez, já com a mensagem pronta — é só tocar em "Enviar no WhatsApp" e voltar para o app.
              </p>
              <div className="grid grid-cols-2 gap-2">
                <div className="rounded-lg border bg-card p-2.5 min-w-0">
                  <p className="text-[10px] uppercase tracking-wider text-muted-foreground">Na fila</p>
                  <p className="text-lg font-bold">{candidatos.length}</p>
                  <p className="text-[10px] text-muted-foreground">pendentes com WhatsApp, sem contato hoje</p>
                </div>
                <label className="rounded-lg border bg-card p-2.5 block min-w-0">
                  <p className="text-[10px] uppercase tracking-wider text-muted-foreground">Meta diária</p>
                  <Input type="number" min={1} value={meta} onChange={(e) => setMeta(Math.max(1, Number(e.target.value) || 1))} className="h-8 mt-1" aria-label="Meta diária" />
                  <p className="text-[10px] text-muted-foreground mt-1">{hoje} enviados hoje</p>
                </label>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Modelo</label>
                <Select value={templateId} onValueChange={(v) => {
                  setTemplateId(v);
                  const t = templates.find((x) => x.id === v);
                  setMensagens((m) => [t?.mensagem ?? '', ...m.slice(1)]);
                }}>
                  <SelectTrigger aria-label="Modelo da fila"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {templates.map((t) => <SelectItem key={t.id} value={t.id}>{t.nome}</SelectItem>)}
                    <SelectItem value="livre">Mensagem livre</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {mensagens.map((m, i) => (
                <div key={i} className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">{i === 0 ? 'Mensagem' : `Variação ${i + 1}`}</label>
                    {i > 0 && <Button size="sm" variant="ghost" className="h-7 px-2" onClick={() => setMensagens((ms) => ms.filter((_, j) => j !== i))} aria-label="Remover variação"><Trash2 className="h-3.5 w-3.5" /></Button>}
                  </div>
                  <Textarea rows={5} value={m} onChange={(e) => setMensagens((ms) => ms.map((x, j) => (j === i ? e.target.value : x)))} className="text-sm" />
                </div>
              ))}
              {mensagens.length < 3 && (
                <Button variant="outline" size="sm" className="gap-1.5 w-full" onClick={() => setMensagens((m) => [...m, m[0] ?? ''])}>
                  <Plus className="h-3.5 w-3.5" /> Adicionar variação (o app alterna a cada envio)
                </Button>
              )}
              <div className="flex flex-wrap gap-1">
                {variaveis.map((v) => (
                  <button key={v} type="button" className="text-[10px] rounded border px-1.5 py-0.5 text-muted-foreground hover:text-foreground"
                    onClick={() => setMensagens((ms) => [ms[0] + v, ...ms.slice(1)])}>{v}</button>
                ))}
              </div>
              {candidatos[0] && (
                <div className="space-y-1">
                  <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Prévia com {candidatos[0].nome}</p>
                  <p className="text-sm whitespace-pre-wrap rounded-lg border bg-muted/40 p-2.5">{previa || '—'}</p>
                </div>
              )}
              <Button size="lg" className="w-full h-12 text-base" disabled={!candidatos.length} onClick={comecar}>
                {candidatos.length ? `Começar (${candidatos.length})` : 'Ninguém pendente nesse filtro'}
              </Button>
            </div>
          )}
        </DialogContent>
      </Dialog>
    );
  }

  // ── Tela cheia: fila e resumo ──
  return (
    <div className="fixed inset-0 z-50 bg-background flex flex-col overflow-x-hidden" role="dialog" aria-label="Fila de envio">
      <div className="border-b px-3 py-2.5 sm:px-6 space-y-2 max-w-2xl w-full mx-auto">
        <div className="flex items-center justify-between gap-2">
          <p className="text-sm font-semibold">
            {etapa === 'fim' ? 'Fila concluída' : `Fila de hoje · ${Math.min((sessao?.pos ?? 0) + 1, total)} de ${total}`}
          </p>
          <div className="flex items-center gap-2">
            <Badge variant="outline" className={hoje >= meta ? 'border-primary text-primary' : ''}>{hoje}/{meta} hoje</Badge>
            <Button size="icon" variant="ghost" className="h-9 w-9" onClick={fechar} aria-label="Sair da fila"><X className="h-5 w-5" /></Button>
          </div>
        </div>
        <Progress value={total ? ((sessao?.pos ?? 0) / total) * 100 : 100} className="h-1.5" />
      </div>

      <div className="flex-1 overflow-y-auto">
        <div className="max-w-2xl w-full mx-auto p-3 sm:p-6 space-y-3">
          {etapa === 'fim' || !atual ? (
            <div className="text-center space-y-4 py-10">
              <p className="text-2xl font-bold">Fim da fila 👏</p>
              <div className="grid grid-cols-3 gap-2">
                {[['Enviados', resumo.enviados], ['Pulados', resumo.pulados], [rotuloNegativo, resumo.negativos]].map(([l, v]) => (
                  <div key={l as string} className="rounded-xl border bg-card p-3">
                    <p className="text-2xl font-bold">{v}</p><p className="text-[11px] text-muted-foreground">{l}</p>
                  </div>
                ))}
              </div>
              {sessao?.historico.length ? <Button variant="ghost" size="sm" className="gap-1.5" onClick={desfazer} disabled={ocupado}><Undo2 className="h-4 w-4" /> Desfazer o último</Button> : null}
              <Button size="lg" className="w-full h-12" onClick={voltarLista}>Voltar à lista</Button>
            </div>
          ) : (
            <div className={`space-y-3 transition-all duration-200 ${animando ? 'opacity-0 translate-x-4' : 'opacity-100 translate-x-0'}`}>
              {hoje >= meta && <p className="text-xs text-center rounded-lg border border-primary/40 bg-primary/5 p-2">Meta do dia atingida 🎉 — continue se quiser.</p>}
              <div className="rounded-xl border bg-card p-3.5 space-y-1.5">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="font-semibold text-base truncate">{atual.nome}</p>
                    <p className="text-xs text-muted-foreground">{atual.local || '—'}</p>
                  </div>
                  <div className="text-right shrink-0">
                    {atual.valor && <p className="font-bold text-primary">{atual.valor}</p>}
                    {atual.quando && <p className="text-[11px] text-muted-foreground">{atual.quando}</p>}
                  </div>
                </div>
                {atual.detalhes && <p className="text-xs text-muted-foreground line-clamp-3">{atual.detalhes}</p>}
              </div>

              <div className="space-y-1">
                <div className="flex items-center justify-between">
                  <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Mensagem</p>
                  {!editando && <span className="text-[10px] text-muted-foreground flex items-center gap-1"><Pencil className="h-3 w-3" /> toque para editar</span>}
                </div>
                {editando ? (
                  <Textarea autoFocus rows={8} className="text-sm" value={mensagemAtual}
                    onChange={(e) => setSessao((s) => s && { ...s, editadas: { ...s.editadas, [atual.id]: e.target.value } })} />
                ) : (
                  <button type="button" onClick={() => setEditando(true)} className="w-full text-left text-sm whitespace-pre-wrap rounded-xl border bg-muted/40 p-3">
                    {mensagemAtual}
                  </button>
                )}
              </div>

              {aguardando.current !== null || sessao?.historico.at(-1)?.id === atual.id && sessao?.historico.at(-1)?.acao === 'enviado' ? (
                <Button size="lg" className="w-full h-14 text-base gap-2" onClick={avancar}>Próximo <ChevronRight className="h-5 w-5" /></Button>
              ) : (
                <Button size="lg" className="w-full h-14 text-base gap-2" onClick={enviar} disabled={ocupado}>
                  {ocupado ? <Loader2 className="h-5 w-5 animate-spin" /> : <MessageCircle className="h-5 w-5" />} Enviar no WhatsApp
                </Button>
              )}
              <div className="grid grid-cols-3 gap-2">
                <Button variant="outline" size="sm" className="gap-1.5" onClick={pular} disabled={ocupado}><SkipForward className="h-4 w-4" /> Pular</Button>
                <Button variant="outline" size="sm" className="gap-1.5" onClick={negativo} disabled={ocupado}><ThumbsDown className="h-4 w-4" /> {rotuloNegativo}</Button>
                <Button variant="outline" size="sm" className="gap-1.5" onClick={desfazer} disabled={ocupado || !sessao?.historico.length}><Undo2 className="h-4 w-4" /> Desfazer</Button>
              </div>
              <p className="text-[11px] text-center text-muted-foreground">Depois de enviar, volte para o app: o próximo cliente aparece sozinho.</p>
            </div>
          )}
        </div>
      </div>

      {pausaAte && (
        <div className="absolute inset-0 bg-background/95 flex items-center justify-center p-6">
          <div className="max-w-sm text-center space-y-3">
            <p className="text-lg font-semibold">Respire um pouco</p>
            <p className="text-sm text-muted-foreground">Envios muito rápidos podem bloquear o número do WhatsApp.</p>
            <p className="text-3xl font-bold tabular-nums">{Math.floor(restante / 60)}:{String(restante % 60).padStart(2, '0')}</p>
            <Button variant="ghost" onClick={() => setPausaAte(null)}>Ignorar e continuar</Button>
          </div>
        </div>
      )}
    </div>
  );
}
