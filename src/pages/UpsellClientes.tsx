import { useEffect, useMemo, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { normalizarTelefone } from '@/lib/telefone';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Search, Loader2, RefreshCw, TrendingUp, MessageCircle, Check, X,
  Settings2, Copy, Plus, Trash2, Bookmark, BookmarkPlus,
} from 'lucide-react';
import { toast } from 'sonner';
import {
  FiltrosUpsellSheet, FILTROS_PADRAO, contarFiltrosAtivos, type FiltrosUpsell,
} from '@/components/upsell/FiltrosUpsell';

const PAGINA = 50;

// ── Tipos ────────────────────────────────────────────────────────────────────
interface ClienteRow {
  contato_bling_id: number;
  nome: string | null;
  documento: string | null;
  tipo_pessoa: string | null;
  email: string | null;
  total_gasto: number;
  qtd_pedidos: number;
  ticket_medio: number;
  primeiro_pedido_em: string | null;
  ultimo_pedido_em: string | null;
  cidade: string | null;
  uf: string | null;
  telefone_whatsapp: string | null;
  whatsapp_valido: boolean;
  canais: string[] | null;
  produtos: string[] | null;
  status: string;
  contatado_em: string | null;
  observacoes: string | null;
}
interface Template { id: string; nome: string; mensagem: string; ordem: number; ativo: boolean }
interface Segmento { id: string; nome: string; filtros: FiltrosUpsell }

// ── Helpers ──────────────────────────────────────────────────────────────────
const brl = (v: number | null | undefined) =>
  typeof v === 'number' && !isNaN(v) ? v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }) : '—';

const dataHora = (iso: string) =>
  new Date(iso).toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' });

const diasDesde = (data: string | null): number | null => {
  if (!data) return null;
  return Math.floor((Date.now() - new Date(`${data}T00:00:00`).getTime()) / 86400_000);
};

const rotuloDias = (data: string | null) => {
  const d = diasDesde(data);
  if (d === null) return 'sem pedidos';
  if (d < 1) return 'hoje';
  if (d === 1) return 'ontem';
  return `há ${d}d`;
};

const STATUS_META: Record<string, { label: string; className: string }> = {
  pendente: { label: 'Pendente', className: 'bg-amber-500/15 text-amber-600 border-amber-500/30' },
  contatado: { label: 'Contatado', className: 'bg-blue-500/15 text-blue-600 border-blue-500/30' },
  vendeu: { label: 'Vendeu', className: 'bg-emerald-500/15 text-emerald-600 border-emerald-500/30' },
  sem_interesse: { label: 'Sem interesse', className: 'bg-muted text-muted-foreground border-border' },
};

export const VARIAVEIS_MENSAGEM = [
  '{nome}', '{nome_completo}', '{vendedor}', '{cidade}', '{total_gasto}',
  '{qtd_pedidos}', '{ultimo_produto}', '{produtos}', '{dias_sem_comprar}',
];

function montarMensagem(tpl: string, c: ClienteRow, vendedor: string): string {
  const nomeCompleto = c.nome ?? 'cliente';
  const produtos = (c.produtos ?? []).slice(0, 4).join(', ');
  const dias = diasDesde(c.ultimo_pedido_em);
  const vars: Record<string, string> = {
    '{nome_completo}': nomeCompleto,
    '{nome}': nomeCompleto.split(' ')[0] || 'tudo bem',
    '{vendedor}': vendedor,
    '{cidade}': c.cidade ?? '',
    '{total_gasto}': brl(c.total_gasto),
    '{qtd_pedidos}': String(c.qtd_pedidos ?? 0),
    '{ultimo_produto}': (c.produtos ?? [])[0] ?? 'sua última compra',
    '{produtos}': produtos || 'sua última compra',
    '{dias_sem_comprar}': dias === null ? '' : String(dias),
    // compatibilidade com modelos antigos (por pedido)
    '{itens}': produtos || 'sua última compra',
    '{total}': brl(c.total_gasto),
    '{data}': c.ultimo_pedido_em ? new Date(`${c.ultimo_pedido_em}T00:00:00`).toLocaleDateString('pt-BR') : '',
    '{pedido}': '',
  };
  let out = tpl;
  for (const [k, v] of Object.entries(vars)) out = out.split(k).join(v);
  return out;
}

const numero = (v: string) => {
  const n = parseFloat(v.replace(',', '.'));
  return isNaN(n) ? undefined : n;
};

function argsRpc(f: FiltrosUpsell, status: string) {
  return {
    p_busca: f.busca.trim() || undefined,
    p_ufs: f.ufs.length ? f.ufs : undefined,
    p_tipo_pessoa: f.tipoPessoa ?? undefined,
    p_gasto_min: numero(f.gastoMin),
    p_gasto_max: numero(f.gastoMax),
    p_comprou_ha_dias: f.comprouHaDias ?? undefined,
    p_sem_comprar_ha_dias: f.semComprarHaDias ?? undefined,
    p_min_pedidos: f.minPedidos ?? undefined,
    p_canais: f.canais.length ? f.canais : undefined,
    p_produtos_incluir: f.produtosIncluir.length ? f.produtosIncluir : undefined,
    p_produtos_excluir: f.produtosExcluir.length ? f.produtosExcluir : undefined,
    p_so_whatsapp: f.soWhatsapp || undefined,
    p_status: status,
  };
}

// ── Página ───────────────────────────────────────────────────────────────────
export default function UpsellClientes() {
  const { profile } = useAuth();
  const vendedorNome = profile?.nome_vendedor?.split(' ')[0] ?? '';
  const qc = useQueryClient();

  const [filtros, setFiltros] = useState<FiltrosUpsell>(FILTROS_PADRAO);
  const [buscaInput, setBuscaInput] = useState('');
  const [status, setStatus] = useState('todos');
  const [pagina, setPagina] = useState(0);

  const [selecionado, setSelecionado] = useState<ClienteRow | null>(null);
  const [mensagem, setMensagem] = useState('');
  const [templateId, setTemplateId] = useState('');
  const [gerenciarOpen, setGerenciarOpen] = useState(false);

  // debounce da busca
  useEffect(() => {
    const t = setTimeout(() => setFiltros((f) => ({ ...f, busca: buscaInput })), 350);
    return () => clearTimeout(t);
  }, [buscaInput]);

  useEffect(() => { setPagina(0); }, [filtros, status]);

  const { data: clientes, isLoading, isFetching, error, refetch } = useQuery({
    queryKey: ['upsell-clientes', filtros, status, pagina],
    queryFn: async () => {
      const { data, error } = await supabase.rpc('buscar_clientes_upsell', {
        ...argsRpc(filtros, status),
        p_ordem: filtros.ordem,
        p_limite: PAGINA,
        p_offset: pagina * PAGINA,
      });
      if (error) throw error;
      return (data ?? []) as unknown as ClienteRow[];
    },
    staleTime: 30_000,
  });

  const { data: resumo } = useQuery({
    queryKey: ['upsell-resumo', filtros, status],
    queryFn: async () => {
      const { data, error } = await supabase.rpc('resumo_clientes_upsell', argsRpc(filtros, status));
      if (error) throw error;
      const r = (data ?? [])[0] as any;
      return r ?? null;
    },
    staleTime: 30_000,
  });

  const { data: produtos } = useQuery({
    queryKey: ['upsell-produtos'],
    queryFn: async () => {
      const { data, error } = await supabase.rpc('listar_produtos_upsell');
      if (error) throw error;
      return (data ?? []) as unknown as { produto: string; exemplo: string | null; clientes: number }[];
    },
    staleTime: 10 * 60_000,
  });

  const { data: templates } = useQuery({
    queryKey: ['upsell-templates'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('upsell_clientes_templates').select('*').order('ordem', { ascending: true });
      if (error) throw error;
      return (data ?? []) as Template[];
    },
  });

  const { data: segmentos } = useQuery({
    queryKey: ['upsell-segmentos'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('upsell_segmentos').select('id, nome, filtros').order('created_at', { ascending: true });
      if (error) throw error;
      return (data ?? []).map((s: any) => ({ id: s.id, nome: s.nome, filtros: s.filtros as FiltrosUpsell })) as Segmento[];
    },
  });

  const lista = clientes ?? [];
  const totalSegmento = Number(resumo?.total_clientes ?? 0);
  const filtrosAtivos = contarFiltrosAtivos(filtros);

  const abrirContato = (c: ClienteRow) => {
    setSelecionado(c);
    const tpl = (templates ?? []).filter((t) => t.ativo)[0];
    setTemplateId(tpl?.id ?? '');
    setMensagem(tpl ? montarMensagem(tpl.mensagem, c, vendedorNome) : '');
  };

  useEffect(() => {
    if (!selecionado || !templateId) return;
    const tpl = (templates ?? []).find((t) => t.id === templateId);
    if (tpl) setMensagem(montarMensagem(tpl.mensagem, selecionado, vendedorNome));
  }, [templateId]); // eslint-disable-line react-hooks/exhaustive-deps

  const marcarStatus = async (contatoId: number, novo: string) => {
    const { data: userData } = await supabase.auth.getUser();
    const { error } = await supabase.from('upsell_clientes_contatos').upsert(
      {
        contato_bling_id: contatoId,
        status: novo,
        contatado_em: novo === 'pendente' ? null : new Date().toISOString(),
        contatado_por: userData?.user?.id ?? null,
      } as any,
      { onConflict: 'contato_bling_id' },
    );
    if (error) { toast.error('Erro ao salvar status: ' + error.message); return; }
    qc.invalidateQueries({ queryKey: ['upsell-clientes'] });
    qc.invalidateQueries({ queryKey: ['upsell-resumo'] });
  };

  const enviarWhatsApp = async () => {
    if (!selecionado) return;
    const fone = normalizarTelefone(selecionado.telefone_whatsapp);
    if (!fone) { toast.error('Este cliente não tem telefone válido.'); return; }
    window.open(`https://wa.me/${fone}?text=${encodeURIComponent(mensagem)}`, '_blank');
    await marcarStatus(selecionado.contato_bling_id, 'contatado');
    toast.success('WhatsApp aberto e cliente marcado como contatado');
    setSelecionado(null);
  };

  const salvarSegmento = async () => {
    const nome = window.prompt('Nome do segmento:');
    if (!nome?.trim()) return;
    const { data: userData } = await supabase.auth.getUser();
    const { error } = await supabase.from('upsell_segmentos').insert({
      nome: nome.trim(),
      filtros: filtros as any,
      user_id: userData?.user?.id,
    } as any);
    if (error) { toast.error('Erro ao salvar segmento: ' + error.message); return; }
    toast.success('Segmento salvo');
    qc.invalidateQueries({ queryKey: ['upsell-segmentos'] });
  };

  const excluirSegmento = async (id: string) => {
    const { error } = await supabase.from('upsell_segmentos').delete().eq('id', id);
    if (error) { toast.error('Erro ao excluir: ' + error.message); return; }
    qc.invalidateQueries({ queryKey: ['upsell-segmentos'] });
  };

  return (
    <div className="w-full max-w-5xl mx-auto py-4 sm:py-6 px-3 sm:px-4 space-y-4 overflow-x-hidden">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
        <div className="flex items-center gap-2.5 min-w-0">
          <TrendingUp className="h-5 w-5 sm:h-6 sm:w-6 text-primary shrink-0" />
          <div className="min-w-0">
            <h1 className="text-lg sm:text-2xl font-bold leading-tight">Upsell — Base de clientes</h1>
            <p className="text-[11px] sm:text-xs text-muted-foreground">
              Segmentação sobre a base unificada do Bling (site + manual)
            </p>
          </div>
        </div>
        <div className="flex gap-2 shrink-0">
          <Button variant="outline" size="sm" className="gap-2 flex-1 sm:flex-none" onClick={() => setGerenciarOpen(true)}>
            <Settings2 className="h-4 w-4" /> Modelos
          </Button>
          <Button variant="outline" size="sm" className="gap-2 flex-1 sm:flex-none" onClick={() => refetch()} disabled={isFetching}>
            {isFetching ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
            Atualizar
          </Button>
        </div>
      </div>

      {error && (
        <div className="p-4 rounded-lg border border-destructive/30 bg-destructive/5 text-sm text-destructive">
          <p className="font-medium">Erro ao consultar a base de clientes</p>
          <p className="text-xs mt-1 text-muted-foreground">{(error as Error).message}</p>
        </div>
      )}

      {/* Resumo do segmento */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
        {[
          { l: 'Clientes', v: totalSegmento.toLocaleString('pt-BR') },
          { l: 'Com WhatsApp', v: Number(resumo?.com_whatsapp ?? 0).toLocaleString('pt-BR') },
          { l: 'Total gasto', v: brl(Number(resumo?.soma_gasto ?? 0)) },
          { l: 'Ticket médio', v: brl(Number(resumo?.ticket_medio ?? 0)) },
        ].map((k) => (
          <div key={k.l} className="border rounded-xl p-2.5 bg-card">
            <p className="text-[10px] uppercase tracking-wider text-muted-foreground">{k.l}</p>
            <p className="text-sm font-bold truncate">{k.v}</p>
          </div>
        ))}
      </div>

      {/* Busca + filtros + ordenação */}
      <div className="flex gap-2">
        <div className="relative flex-1 min-w-0">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Nome, documento, e-mail ou telefone..."
            value={buscaInput}
            onChange={(e) => setBuscaInput(e.target.value)}
            className="pl-9 h-10"
          />
        </div>
        <FiltrosUpsellSheet filtros={filtros} onChange={setFiltros} produtos={produtos ?? []} totalNoSegmento={totalSegmento} />
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <Select value={filtros.ordem} onValueChange={(v) => setFiltros((f) => ({ ...f, ordem: v }))}>
          <SelectTrigger className="h-9 w-[168px] text-xs"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="maior_gasto">Maior total gasto</SelectItem>
            <SelectItem value="mais_pedidos">Mais pedidos</SelectItem>
            <SelectItem value="recente">Compra mais recente</SelectItem>
            <SelectItem value="antigo">Compra mais antiga</SelectItem>
          </SelectContent>
        </Select>
        <Button variant="outline" size="sm" className="h-9 gap-1.5 text-xs" onClick={salvarSegmento}>
          <BookmarkPlus className="h-3.5 w-3.5" /> Salvar filtro
        </Button>
        {filtrosAtivos > 0 && (
          <Button variant="ghost" size="sm" className="h-9 text-xs text-muted-foreground"
            onClick={() => setFiltros({ ...FILTROS_PADRAO, busca: filtros.busca, ordem: filtros.ordem })}>
            Limpar filtros ({filtrosAtivos})
          </Button>
        )}
      </div>

      {(segmentos ?? []).length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {(segmentos ?? []).map((s) => (
            <Badge key={s.id} variant="outline" className="text-[11px] gap-1.5 py-1 pl-2 pr-1">
              <button className="flex items-center gap-1" onClick={() => { setFiltros({ ...FILTROS_PADRAO, ...s.filtros }); setBuscaInput(s.filtros?.busca ?? ''); }}>
                <Bookmark className="h-3 w-3" /> {s.nome}
              </button>
              <button onClick={() => excluirSegmento(s.id)} className="text-muted-foreground hover:text-destructive">
                <X className="h-3 w-3" />
              </button>
            </Badge>
          ))}
        </div>
      )}

      {/* Abas de status */}
      <Tabs value={status} onValueChange={setStatus}>
        <TabsList className="w-full grid grid-cols-3 sm:grid-cols-5 h-auto gap-1 p-1">
          <TabsTrigger value="todos" className="text-[11px] sm:text-xs px-1 py-1.5">Todos ({Number(resumo?.qtd_todos ?? 0)})</TabsTrigger>
          <TabsTrigger value="pendente" className="text-[11px] sm:text-xs px-1 py-1.5">Pendentes ({Number(resumo?.qtd_pendente ?? 0)})</TabsTrigger>
          <TabsTrigger value="contatado" className="text-[11px] sm:text-xs px-1 py-1.5">Contatados ({Number(resumo?.qtd_contatado ?? 0)})</TabsTrigger>
          <TabsTrigger value="vendeu" className="text-[11px] sm:text-xs px-1 py-1.5">Vendeu ({Number(resumo?.qtd_vendeu ?? 0)})</TabsTrigger>
          <TabsTrigger value="sem_interesse" className="text-[11px] sm:text-xs px-1 py-1.5">Sem interesse ({Number(resumo?.qtd_sem_interesse ?? 0)})</TabsTrigger>
        </TabsList>
      </Tabs>

      {/* Lista */}
      {isLoading ? (
        <div className="flex items-center justify-center py-16 text-muted-foreground gap-2">
          <Loader2 className="h-5 w-5 animate-spin" /> Carregando clientes...
        </div>
      ) : !error && lista.length === 0 ? (
        <div className="text-center py-16 text-muted-foreground">
          <TrendingUp className="h-10 w-10 mx-auto mb-3 opacity-40" />
          <p className="font-medium">Nenhum cliente nesse filtro</p>
        </div>
      ) : (
        <div className="space-y-2.5">
          {lista.map((c) => {
            const meta = STATUS_META[c.status] ?? STATUS_META.pendente;
            const fone = normalizarTelefone(c.telefone_whatsapp);
            const prods = c.produtos ?? [];
            return (
              <div key={c.contato_bling_id} className="border rounded-xl p-3 sm:p-3.5 bg-card space-y-2.5">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="font-semibold text-sm truncate">{c.nome ?? 'Sem nome'}</p>
                    <p className="text-[11px] text-muted-foreground break-words line-clamp-2">
                      {[[c.cidade, c.uf].filter(Boolean).join('/'), c.telefone_whatsapp, c.email].filter(Boolean).join(' · ') || '—'}
                    </p>
                  </div>
                  <div className="text-right shrink-0">
                    <p className="font-bold text-primary text-sm">{brl(c.total_gasto)}</p>
                    <p className="text-[10px] text-muted-foreground">{rotuloDias(c.ultimo_pedido_em)}</p>
                  </div>
                </div>

                <div className="flex flex-wrap items-center gap-1.5 text-[10px] text-muted-foreground">
                  <span>{c.qtd_pedidos} pedido(s)</span>
                  <span>·</span>
                  <span>ticket {brl(c.ticket_medio)}</span>
                  {c.tipo_pessoa && <><span>·</span><span>{c.tipo_pessoa}</span></>}
                  {(c.canais ?? []).map((canal) => (
                    <Badge key={canal} variant="outline" className="text-[10px] capitalize">{canal}</Badge>
                  ))}
                </div>

                {prods.length > 0 && (
                  <p className="text-xs text-muted-foreground line-clamp-2">
                    {prods.slice(0, 5).join(', ')}{prods.length > 5 ? ` +${prods.length - 5}` : ''}
                  </p>
                )}

                <div className="flex flex-wrap items-center gap-1.5">
                  <Badge variant="outline" className={`text-[10px] ${meta.className}`}>{meta.label}</Badge>
                  {c.contatado_em && <span className="text-[10px] text-muted-foreground">{dataHora(c.contatado_em)}</span>}
                  {!fone && <Badge variant="outline" className="text-[10px]">Sem WhatsApp</Badge>}
                </div>

                <div className="flex items-center gap-1.5">
                  {c.status !== 'vendeu' && (
                    <Button size="sm" variant="ghost" className="h-9 px-2.5 text-emerald-600 shrink-0" title="Marcar que vendeu"
                      onClick={() => marcarStatus(c.contato_bling_id, 'vendeu')}>
                      <Check className="h-4 w-4" />
                    </Button>
                  )}
                  {c.status !== 'sem_interesse' && (
                    <Button size="sm" variant="ghost" className="h-9 px-2.5 text-muted-foreground shrink-0" title="Sem interesse"
                      onClick={() => marcarStatus(c.contato_bling_id, 'sem_interesse')}>
                      <X className="h-4 w-4" />
                    </Button>
                  )}
                  <Button size="sm" className="h-9 gap-1.5 flex-1 sm:flex-none sm:ml-auto" disabled={!fone} onClick={() => abrirContato(c)}>
                    <MessageCircle className="h-4 w-4" /> WhatsApp
                  </Button>
                </div>
              </div>
            );
          })}

          <div className="flex items-center justify-between gap-2 pt-1">
            <Button variant="outline" size="sm" disabled={pagina === 0} onClick={() => setPagina((p) => Math.max(p - 1, 0))}>
              Anterior
            </Button>
            <span className="text-[11px] text-muted-foreground">
              {pagina * PAGINA + 1}–{pagina * PAGINA + lista.length} de {totalSegmento}
            </span>
            <Button variant="outline" size="sm" disabled={lista.length < PAGINA} onClick={() => setPagina((p) => p + 1)}>
              Próxima
            </Button>
          </div>
        </div>
      )}

      {/* Modal de contato */}
      <Dialog open={!!selecionado} onOpenChange={(v) => !v && setSelecionado(null)}>
        <DialogContent className="w-[calc(100vw-1.5rem)] sm:w-full max-w-lg max-h-[88vh] overflow-y-auto p-4 sm:p-6 rounded-xl">
          {selecionado && (
            <>
              <DialogHeader>
                <DialogTitle className="text-base pr-6">Upsell para {selecionado.nome}</DialogTitle>
              </DialogHeader>
              <div className="space-y-3">
                <div className="text-xs text-muted-foreground rounded-lg bg-muted/50 border p-2.5 space-y-1">
                  <p><span className="font-medium text-foreground">Histórico:</span> {selecionado.qtd_pedidos} pedido(s) · {brl(selecionado.total_gasto)} · ticket {brl(selecionado.ticket_medio)}</p>
                  <p><span className="font-medium text-foreground">Último pedido:</span> {selecionado.ultimo_pedido_em ? `${new Date(`${selecionado.ultimo_pedido_em}T00:00:00`).toLocaleDateString('pt-BR')} (${rotuloDias(selecionado.ultimo_pedido_em)})` : '—'}</p>
                  <p><span className="font-medium text-foreground">Produtos:</span> {(selecionado.produtos ?? []).slice(0, 6).join(', ') || '—'}</p>
                  <p><span className="font-medium text-foreground">Telefone:</span> {selecionado.telefone_whatsapp ?? '—'}</p>
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
                  <Textarea value={mensagem} onChange={(e) => setMensagem(e.target.value)} rows={9} className="text-sm min-h-[180px]" />
                </div>
              </div>
              <DialogFooter className="flex-col-reverse sm:flex-row gap-2">
                <Button variant="outline" className="gap-2 w-full sm:w-auto"
                  onClick={() => { navigator.clipboard.writeText(mensagem); toast.success('Mensagem copiada'); }}>
                  <Copy className="h-4 w-4" /> Copiar
                </Button>
                <Button className="gap-2 w-full sm:w-auto" onClick={enviarWhatsApp}>
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
      .from('upsell_clientes_templates')
      .update({ nome: t.nome, mensagem: t.mensagem, ativo: t.ativo })
      .eq('id', t.id);
    setSalvando(false);
    if (error) { toast.error('Erro ao salvar: ' + error.message); return; }
    toast.success('Modelo salvo');
    qc.invalidateQueries({ queryKey: ['upsell-templates'] });
  };

  const criar = async () => {
    const { error } = await supabase.from('upsell_clientes_templates').insert({
      nome: 'Novo modelo',
      mensagem: 'Olá {nome}, aqui é {vendedor} da Kaowz! Vi que você já levou {ultimo_produto}. Posso te mostrar uma condição especial de cliente?',
      ordem: rascunhos.length + 1,
    });
    if (error) { toast.error('Erro ao criar: ' + error.message); return; }
    qc.invalidateQueries({ queryKey: ['upsell-templates'] });
  };

  const remover = async (id: string) => {
    const { error } = await supabase.from('upsell_clientes_templates').delete().eq('id', id);
    if (error) { toast.error('Erro ao remover: ' + error.message); return; }
    toast.success('Modelo removido');
    qc.invalidateQueries({ queryKey: ['upsell-templates'] });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-[calc(100vw-1.5rem)] sm:w-full max-w-lg max-h-[88vh] overflow-y-auto p-4 sm:p-6 rounded-xl">
        <DialogHeader>
          <DialogTitle className="text-base">Modelos de mensagem de upsell</DialogTitle>
        </DialogHeader>
        <div className="space-y-1">
          <p className="text-[11px] text-muted-foreground">
            Variáveis:{' '}
            {VARIAVEIS_MENSAGEM.map((v) => (
              <code key={v} className="bg-muted px-1 rounded mr-1">{v}</code>
            ))}
          </p>
          <p className="text-[10px] text-muted-foreground/80">
            As antigas variáveis por pedido foram convertidas: <code className="bg-muted px-1 rounded">{'{itens}'}</code> vira os produtos do cliente e{' '}
            <code className="bg-muted px-1 rounded">{'{total}'}</code> vira o total gasto na vida. <code className="bg-muted px-1 rounded">{'{pedido}'}</code> não existe mais.
          </p>
        </div>
        <div className="space-y-3">
          {rascunhos.map((t) => (
            <div key={t.id} className="border rounded-lg p-3 space-y-2">
              <div className="flex flex-wrap gap-2">
                <Input value={t.nome} onChange={(e) => atualizar(t.id, 'nome', e.target.value)} className="h-9 text-sm flex-1 min-w-[140px]" />
                <Button size="sm" variant={t.ativo ? 'secondary' : 'outline'} className="h-9 text-xs shrink-0" onClick={() => atualizar(t.id, 'ativo', !t.ativo)}>
                  {t.ativo ? 'Ativo' : 'Inativo'}
                </Button>
                <Button size="sm" variant="ghost" className="h-9 px-2.5 text-destructive shrink-0" onClick={() => remover(t.id)}>
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
              <Textarea value={t.mensagem} onChange={(e) => atualizar(t.id, 'mensagem', e.target.value)} rows={6} className="text-sm" />
              <Button size="sm" className="h-9 w-full text-xs" disabled={salvando} onClick={() => salvar(t)}>Salvar modelo</Button>
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
