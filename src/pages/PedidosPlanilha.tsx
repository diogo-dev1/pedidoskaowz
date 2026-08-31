import { useMemo, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import {
  Loader2, RefreshCw, Copy, Check, Undo2, AlertTriangle, ClipboardList, ChevronDown, ChevronUp,
} from 'lucide-react';

/* ═════════════ tipos ═════════════ */

type Propriedade = { nome: string; valor: string };
type ItemPedido = {
  titulo: string; variante: string | null; quantidade: number; preco: string;
  propriedades: Propriedade[];
};
type PedidoShopify = {
  id: string; numero: string; nome: string; criado_em: string;
  total: string; nota: string; itens: ItemPedido[];
};

export const COLUNAS = [
  'Nome', 'Item', 'Aço', 'Acabamento', 'Empunhadura', 'Bainha',
  'Cor bainha', 'Prazo', 'Observações', 'Embalagem', 'Personalização', 'Certificado',
] as const;

/* ═════════════ helpers ═════════════ */

/** Data equivalente a N dias ÚTEIS (seg–sex) a partir de hoje, em YYYY-MM-DD. */
export function prazoDiasUteis(dias = 65, base = new Date()): string {
  const d = new Date(base.getFullYear(), base.getMonth(), base.getDate());
  let restantes = dias;
  while (restantes > 0) {
    d.setDate(d.getDate() + 1);
    const wd = d.getDay();
    if (wd !== 0 && wd !== 6) restantes--;
  }
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

const brl = (n: number) => n.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
const dataBR = (iso: string) => new Date(iso).toLocaleDateString('pt-BR');

function prop(item: ItemPedido, nome: string): string {
  return item.propriedades.find((p) => p.nome.toLowerCase() === nome.toLowerCase())?.valor?.trim() ?? '';
}
function ehFaca(item: ItemPedido): boolean {
  return !!prop(item, 'Modelo');
}

/** Separa "Velada (Preto)" em nome e cor. */
function separaCor(v: string): { nome: string; cor: string } {
  const m = v.match(/^(.*?)\s*\(([^)]*)\)\s*$/);
  return m ? { nome: m[1].trim(), cor: m[2].trim() } : { nome: v.trim(), cor: '' };
}

/** Embalagens declaradas na nota interna do pedido, na ordem em que aparecem. */
function embalagensDaNota(nota: string): string[] {
  return (nota || '')
    .split('\n')
    .map((l) => l.match(/^\s*Embalagem:\s*(.+)$/i)?.[1]?.trim())
    .filter((x): x is string => !!x);
}

export type Linha = Record<(typeof COLUNAS)[number], string>;

/** Monta uma linha por lâmina do pedido. */
export function montarLinhas(pedido: PedidoShopify, prazo: string): Linha[] {
  const facas = pedido.itens.filter(ehFaca);
  const outros = pedido.itens.filter((i) => !ehFaca(i));
  const observacoes = outros
    .map((i) => `${i.quantidade > 1 ? `${i.quantidade}x ` : ''}${i.titulo}${i.variante ? ` (${i.variante})` : ''}${Number(i.preco) === 0 ? ' (brinde)' : ''}`)
    .join('; ');
  const embalagens = embalagensDaNota(pedido.nota);

  const linhas: Linha[] = [];
  facas.forEach((item, idx) => {
    for (let q = 0; q < Math.max(1, item.quantidade); q++) {
      const bainhas = item.propriedades
        .filter((p) => /^bainha\s*\d*$/i.test(p.nome))
        .map((p) => separaCor(p.valor));

      const emp = [
        prop(item, 'Empunhadura'),
        prop(item, 'Cor da empunhadura'),
        prop(item, 'Espaçador') ? `Espaçador ${prop(item, 'Espaçador').replace(/^Sim\s*/i, '').replace(/[()]/g, '').trim()}`.trim() : '',
        prop(item, 'Dragon Scale') ? 'Dragon Scale' : '',
      ].filter(Boolean).join(' ');

      const aco = [prop(item, 'Aço'), prop(item, 'Brute Forge') ? '+ Brute Forge' : '']
        .filter(Boolean).join(' ').replace(/\s*\+\s*Brute Forge\s*\+\s*Brute Forge/i, ' + Brute Forge');

      linhas.push({
        'Nome': pedido.nome,
        'Item': prop(item, 'Modelo'),
        'Aço': aco,
        'Acabamento': prop(item, 'Acabamento'),
        'Empunhadura': emp,
        'Bainha': bainhas.map((b) => b.nome).filter(Boolean).join(' + '),
        'Cor bainha': bainhas.map((b) => b.cor).filter(Boolean).join(' + '),
        'Prazo': prazo,
        'Observações': linhas.length === 0 ? observacoes : '',
        'Embalagem': embalagens[idx] ?? '',
        'Personalização': prop(item, 'Personalização'),
        'Certificado': prop(item, 'Certificado'),
      });
    }
  });

  // Pedido só com acessórios: ainda assim mostra uma linha com as observações
  if (!linhas.length && observacoes) {
    linhas.push({
      ...(Object.fromEntries(COLUNAS.map((c) => [c, ''])) as Linha),
      'Nome': pedido.nome,
      'Prazo': prazo,
      'Observações': observacoes,
    });
  }
  return linhas;
}

function linhasParaTSV(linhas: Linha[]): string {
  return linhas.map((l) => COLUNAS.map((c) => (l[c] ?? '').replace(/\t|\n/g, ' ')).join('\t')).join('\n');
}

/* ═════════════ página ═════════════ */

export default function PedidosPlanilha() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [dias, setDias] = useState<7 | 30 | 90>(30);
  const [mostrarTodos, setMostrarTodos] = useState(false);
  const [prazo, setPrazo] = useState(() => prazoDiasUteis(65));
  const [aberto, setAberto] = useState<string | null>(null);

  const pedidosQuery = useQuery({
    queryKey: ['pedidos-planilha', dias],
    queryFn: async (): Promise<PedidoShopify[]> => {
      const { data, error } = await supabase.functions.invoke('pedidos-planilha', { body: { dias } });
      if (error) throw error;
      return data?.pedidos ?? [];
    },
  });

  const lancadosQuery = useQuery({
    queryKey: ['pedidos-lancados-planilha'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('pedidos_lancados_planilha')
        .select('shopify_order_id, created_at');
      if (error) throw error;
      return data ?? [];
    },
  });

  const lancados = useMemo(
    () => new Set((lancadosQuery.data ?? []).map((l) => l.shopify_order_id)),
    [lancadosQuery.data],
  );

  const pedidos = useMemo(() => {
    const todos = pedidosQuery.data ?? [];
    return mostrarTodos ? todos : todos.filter((p) => !lancados.has(p.id));
  }, [pedidosQuery.data, mostrarTodos, lancados]);

  async function marcar(p: PedidoShopify) {
    const { error } = await supabase.from('pedidos_lancados_planilha').insert({
      shopify_order_id: p.id, shopify_order_name: p.numero, marcado_por: user?.id ?? null,
    });
    if (error) { toast.error('Erro ao marcar: ' + error.message); return; }
    queryClient.invalidateQueries({ queryKey: ['pedidos-lancados-planilha'] });
    toast.success(`${p.numero} marcado como lançado`);
  }

  async function desmarcar(p: PedidoShopify) {
    const { error } = await supabase.from('pedidos_lancados_planilha')
      .delete().eq('shopify_order_id', p.id);
    if (error) { toast.error('Erro ao desmarcar: ' + error.message); return; }
    queryClient.invalidateQueries({ queryKey: ['pedidos-lancados-planilha'] });
    toast.success(`${p.numero} voltou para pendente`);
  }

  async function copiar(p: PedidoShopify) {
    const linhas = montarLinhas(p, prazo);
    if (!linhas.length) { toast.error('Este pedido não tem linhas para copiar.'); return; }
    try {
      await navigator.clipboard.writeText(linhasParaTSV(linhas));
      toast.success(`${linhas.length} ${linhas.length === 1 ? 'linha copiada' : 'linhas copiadas'} — cole com Ctrl+Shift+V`);
    } catch {
      toast.error('Não foi possível copiar');
    }
  }

  return (
    <div className="space-y-4 pb-10">
      <header className="flex items-start gap-3">
        <ClipboardList className="h-6 w-6 text-primary shrink-0 mt-0.5" />
        <div className="min-w-0 flex-1">
          <h1 className="text-xl font-bold leading-tight">Pedidos para a planilha</h1>
          <p className="text-xs text-muted-foreground">
            Pedidos pagos da loja, já formatados nas colunas da planilha de produção.
          </p>
        </div>
        <Button variant="outline" size="sm" className="gap-1.5 shrink-0"
          onClick={() => pedidosQuery.refetch()} disabled={pedidosQuery.isFetching}>
          {pedidosQuery.isFetching ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <RefreshCw className="h-3.5 w-3.5" />}
          Atualizar
        </Button>
      </header>

      <div className="rounded-xl border bg-card p-3 sm:p-4 grid gap-3 sm:grid-cols-3">
        <div className="space-y-1">
          <Label className="text-[11px] uppercase tracking-wide text-muted-foreground">Período</Label>
          <Select value={String(dias)} onValueChange={(v) => setDias(Number(v) as 7 | 30 | 90)}>
            <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="7">Últimos 7 dias</SelectItem>
              <SelectItem value="30">Últimos 30 dias</SelectItem>
              <SelectItem value="90">Últimos 90 dias</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1">
          <Label className="text-[11px] uppercase tracking-wide text-muted-foreground">Prazo atual (65 dias úteis)</Label>
          <Input type="date" value={prazo} onChange={(e) => setPrazo(e.target.value)} className="h-9" />
        </div>
        <div className="flex items-end gap-2">
          <div className="flex items-center gap-2 h-9">
            <Switch id="todos" checked={mostrarTodos} onCheckedChange={setMostrarTodos} />
            <Label htmlFor="todos" className="text-sm">Mostrar também os já lançados</Label>
          </div>
        </div>
      </div>

      <div className="flex items-start gap-2 rounded-lg border border-amber-300 bg-amber-50 p-3 text-xs text-amber-900">
        <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5" />
        <span>Ao colar na planilha, use <strong>Ctrl+Shift+V</strong> (colar somente valores) para não quebrar a validação dos menus suspensos.</span>
      </div>

      {pedidosQuery.isError && (
        <p className="text-sm text-destructive">Erro ao carregar os pedidos da loja.</p>
      )}

      {pedidosQuery.isLoading ? (
        <div className="flex items-center justify-center py-16 text-muted-foreground gap-2 text-sm">
          <Loader2 className="h-4 w-4 animate-spin" /> Carregando pedidos...
        </div>
      ) : !pedidos.length ? (
        <p className="py-16 text-center text-sm text-muted-foreground">
          Nenhum pedido {mostrarTodos ? '' : 'pendente '}no período selecionado.
        </p>
      ) : (
        <div className="space-y-2">
          {pedidos.map((p) => {
            const jaLancado = lancados.has(p.id);
            const expandido = aberto === p.id;
            const linhas = expandido ? montarLinhas(p, prazo) : [];
            return (
              <div key={p.id} className="rounded-xl border bg-card overflow-hidden">
                <button type="button" onClick={() => setAberto(expandido ? null : p.id)}
                  className="w-full flex items-center gap-3 p-3 text-left hover:bg-muted/50 transition-colors">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-semibold text-sm">{p.numero}</span>
                      {jaLancado ? (
                        <span className="text-[10px] font-semibold uppercase rounded-full bg-emerald-100 text-emerald-700 px-2 py-0.5">Lançado</span>
                      ) : (
                        <span className="text-[10px] font-semibold uppercase rounded-full bg-amber-100 text-amber-700 px-2 py-0.5">Pendente</span>
                      )}
                    </div>
                    <p className="text-sm truncate">{p.nome}</p>
                    <p className="text-[11px] text-muted-foreground">
                      {dataBR(p.criado_em)} · {brl(Number(p.total) || 0)} · {p.itens.length} {p.itens.length === 1 ? 'item' : 'itens'}
                    </p>
                  </div>
                  {expandido ? <ChevronUp className="h-4 w-4 text-muted-foreground" /> : <ChevronDown className="h-4 w-4 text-muted-foreground" />}
                </button>

                {expandido && (
                  <div className="border-t p-3 space-y-3">
                    <div className="overflow-x-auto">
                      <table className="w-full text-[11px] border-collapse">
                        <thead>
                          <tr className="bg-muted">
                            {COLUNAS.map((c) => (
                              <th key={c} className="border px-2 py-1 text-left font-semibold whitespace-nowrap">{c}</th>
                            ))}
                          </tr>
                        </thead>
                        <tbody>
                          {linhas.map((l, i) => (
                            <tr key={i}>
                              {COLUNAS.map((c) => (
                                <td key={c} className="border px-2 py-1 align-top whitespace-nowrap">{l[c]}</td>
                              ))}
                            </tr>
                          ))}
                          {!linhas.length && (
                            <tr><td colSpan={COLUNAS.length} className="border px-2 py-3 text-center text-muted-foreground">Sem lâminas neste pedido.</td></tr>
                          )}
                        </tbody>
                      </table>
                    </div>

                    <div className="flex flex-wrap gap-2">
                      <Button size="sm" className="gap-1.5" onClick={() => copiar(p)} disabled={!linhas.length}>
                        <Copy className="h-3.5 w-3.5" /> Copiar linhas
                      </Button>
                      {jaLancado ? (
                        <Button size="sm" variant="outline" className="gap-1.5" onClick={() => desmarcar(p)}>
                          <Undo2 className="h-3.5 w-3.5" /> Desmarcar
                        </Button>
                      ) : (
                        <Button size="sm" variant="outline" className="gap-1.5" onClick={() => marcar(p)}>
                          <Check className="h-3.5 w-3.5" /> Marcar como lançado
                        </Button>
                      )}
                    </div>
                  </div>
                )}

                {!expandido && (
                  <div className="border-t px-3 py-2 flex flex-wrap gap-2">
                    <Button size="sm" variant="ghost" className="gap-1.5 h-8" onClick={() => copiar(p)}>
                      <Copy className="h-3.5 w-3.5" /> Copiar linhas
                    </Button>
                    {jaLancado ? (
                      <Button size="sm" variant="ghost" className="gap-1.5 h-8" onClick={() => desmarcar(p)}>
                        <Undo2 className="h-3.5 w-3.5" /> Desmarcar
                      </Button>
                    ) : (
                      <Button size="sm" variant="ghost" className="gap-1.5 h-8" onClick={() => marcar(p)}>
                        <Check className="h-3.5 w-3.5" /> Marcar como lançado
                      </Button>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
