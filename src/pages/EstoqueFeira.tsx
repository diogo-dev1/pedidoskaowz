import { useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Search,
  Loader2,
  RefreshCw,
  Package,
  CheckCircle2,
  Circle,
  Boxes,
} from 'lucide-react';
import { toast } from 'sonner';

const TAB = 'Folha1';

interface Lamina {
  row: number; // 1-indexed na planilha
  vendido: boolean;
  numero: string;
  item: string;
  aco: string;
  acabamento: string;
  empunhadura: string;
  bainha: string;
  corBainha: string;
  adicional: string;
  obs: string;
}

interface Acessorio {
  grupo: string;
  nome: string;
  qtd: number;
}

interface Parsed {
  laminas: Lamina[];
  acessorios: Acessorio[];
}

const cell = (r: string[] | undefined, i: number) => (r?.[i] ?? '').toString().trim();

function parse(values: string[][]): Parsed {
  const headerIdx = values.findIndex(
    (r) => r.some((c) => (c ?? '').toString().trim().toLowerCase() === 'vendido'),
  );

  const laminas: Lamina[] = [];
  if (headerIdx >= 0) {
    for (let i = headerIdx + 1; i < values.length; i++) {
      const r = values[i];
      const item = cell(r, 3);
      if (!item) continue;
      laminas.push({
        row: i + 1,
        vendido: cell(r, 1).toUpperCase() === 'TRUE',
        numero: cell(r, 2),
        item,
        aco: cell(r, 4),
        acabamento: cell(r, 5),
        empunhadura: cell(r, 6),
        bainha: cell(r, 7),
        corBainha: cell(r, 8),
        adicional: cell(r, 9),
        obs: cell(r, 10),
      });
    }
  }

  // Bloco de acessórios (acima do cabeçalho das lâminas):
  // colunas com um rótulo de grupo e, abaixo, pares nome/quantidade.
  const acessorios: Acessorio[] = [];
  const limit = headerIdx >= 0 ? headerIdx : values.length;
  const grupos = new Map<number, string>();
  for (let i = 0; i < limit; i++) {
    const r = values[i] ?? [];
    for (let c = 0; c < r.length; c++) {
      const nome = cell(r, c);
      const qtdRaw = cell(r, c + 1).replace(',', '.');
      const qtd = Number(qtdRaw);
      if (!nome) continue;
      if (qtdRaw !== '' && !isNaN(qtd)) {
        acessorios.push({ grupo: grupos.get(c) ?? 'Acessórios', nome, qtd });
      } else if (qtdRaw === '') {
        grupos.set(c, nome);
      }
    }
  }

  return { laminas, acessorios };
}

export default function EstoqueFeira() {
  const qc = useQueryClient();
  const [search, setSearch] = useState('');
  const [filtro, setFiltro] = useState<'todos' | 'disponivel' | 'vendido'>('disponivel');
  const [selected, setSelected] = useState<Lamina | null>(null);

  const { data, isLoading, isFetching, error, refetch } = useQuery({
    queryKey: ['estoque-feira'],
    queryFn: async () => {
      const { data, error } = await supabase.functions.invoke('estoque-sheet', {
        body: { action: 'read', tab: TAB },
      });
      if (error) throw error;
      if (data?.error) throw new Error(typeof data.error === 'string' ? data.error : 'Erro na planilha');
      return parse((data?.values ?? []) as string[][]);
    },
    refetchInterval: 60_000,
  });

  const toggleVendido = useMutation({
    mutationFn: async (l: Lamina) => {
      const { data, error } = await supabase.functions.invoke('estoque-sheet', {
        body: {
          action: 'update',
          tab: TAB,
          range: `B${l.row}`,
          value: l.vendido ? 'FALSE' : 'TRUE',
        },
      });
      if (error) throw error;
      if (data?.error) throw new Error(String(data.error));
    },
    onSuccess: (_d, l) => {
      toast.success(l.vendido ? 'Marcado como disponível' : 'Marcado como vendido');
      setSelected(null);
      qc.invalidateQueries({ queryKey: ['estoque-feira'] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const laminas = data?.laminas ?? [];
  const acessorios = data?.acessorios ?? [];

  const disponiveis = laminas.filter((l) => !l.vendido).length;
  const vendidos = laminas.length - disponiveis;

  const filtradas = useMemo(() => {
    const q = search.trim().toLowerCase();
    return laminas.filter((l) => {
      if (filtro === 'disponivel' && l.vendido) return false;
      if (filtro === 'vendido' && !l.vendido) return false;
      if (!q) return true;
      return [l.numero, l.item, l.aco, l.acabamento, l.empunhadura, l.bainha, l.corBainha, l.adicional, l.obs]
        .join(' ')
        .toLowerCase()
        .includes(q);
    });
  }, [laminas, search, filtro]);

  return (
    <div className="max-w-3xl mx-auto py-4 px-3 sm:px-4 space-y-4 pb-24">
      <header className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-2 min-w-0">
          <Boxes className="h-6 w-6 text-primary shrink-0" />
          <div className="min-w-0">
            <h1 className="text-lg sm:text-2xl font-bold truncate">Estoque Feira</h1>
            <p className="text-[11px] text-muted-foreground">
              {isLoading ? 'Carregando planilha...' : `${laminas.length} lâmina(s) na planilha`}
            </p>
          </div>
        </div>
        <Button variant="outline" size="sm" className="gap-2 shrink-0" onClick={() => refetch()} disabled={isFetching}>
          {isFetching ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
          <span className="hidden sm:inline">Atualizar</span>
        </Button>
      </header>

      {error && (
        <div className="p-3 rounded-lg border border-destructive/30 bg-destructive/5 text-sm text-destructive">
          <p className="font-medium">Erro ao ler a planilha</p>
          <p className="text-xs mt-1 text-muted-foreground break-words">{(error as Error).message}</p>
        </div>
      )}

      {/* Resumo */}
      <div className="grid grid-cols-3 gap-2">
        <div className="rounded-xl border bg-card p-3 text-center">
          <p className="text-[10px] uppercase tracking-wide text-muted-foreground">Total</p>
          <p className="text-xl font-bold">{laminas.length}</p>
        </div>
        <div className="rounded-xl border bg-card p-3 text-center">
          <p className="text-[10px] uppercase tracking-wide text-muted-foreground">Disponíveis</p>
          <p className="text-xl font-bold text-primary">{disponiveis}</p>
        </div>
        <div className="rounded-xl border bg-card p-3 text-center">
          <p className="text-[10px] uppercase tracking-wide text-muted-foreground">Vendidas</p>
          <p className="text-xl font-bold text-muted-foreground">{vendidos}</p>
        </div>
      </div>

      {/* Busca + filtros */}
      <div className="space-y-2 sticky top-0 z-10 bg-background/95 backdrop-blur py-2">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar modelo, aço, empunhadura..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9 h-11"
          />
        </div>
        <div className="grid grid-cols-3 gap-2">
          {([
            ['disponivel', 'Disponíveis'],
            ['vendido', 'Vendidas'],
            ['todos', 'Todas'],
          ] as const).map(([v, label]) => (
            <Button
              key={v}
              size="sm"
              variant={filtro === v ? 'default' : 'outline'}
              className="h-9 text-xs"
              onClick={() => setFiltro(v)}
            >
              {label}
            </Button>
          ))}
        </div>
      </div>

      {/* Lista */}
      {isLoading ? (
        <div className="flex items-center justify-center py-16 text-muted-foreground gap-2">
          <Loader2 className="h-5 w-5 animate-spin" /> Carregando estoque...
        </div>
      ) : filtradas.length === 0 ? (
        <div className="text-center py-16 text-muted-foreground">
          <Package className="h-10 w-10 mx-auto mb-3 opacity-40" />
          <p className="font-medium text-sm">Nenhuma lâmina encontrada</p>
        </div>
      ) : (
        <div className="space-y-2">
          {filtradas.map((l) => (
            <button
              key={l.row}
              onClick={() => setSelected(l)}
              className={`w-full text-left rounded-xl border p-3 bg-card transition-colors active:scale-[0.99] ${
                l.vendido ? 'opacity-60' : 'hover:border-primary/40'
              }`}
            >
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <p className="text-sm font-semibold leading-tight truncate">
                    <span className="text-muted-foreground mr-1.5">#{l.numero}</span>
                    {l.item}
                  </p>
                  <p className="text-[11px] text-muted-foreground mt-0.5 truncate">
                    {[l.aco, l.acabamento, l.empunhadura].filter(Boolean).join(' · ')}
                  </p>
                  <p className="text-[11px] text-muted-foreground truncate">
                    {[l.bainha, l.corBainha, l.adicional].filter(Boolean).join(' · ')}
                  </p>
                </div>
                <Badge variant={l.vendido ? 'secondary' : 'default'} className="text-[10px] shrink-0">
                  {l.vendido ? 'Vendida' : 'Disponível'}
                </Badge>
              </div>
            </button>
          ))}
        </div>
      )}

      {/* Acessórios */}
      {acessorios.length > 0 && (
        <section className="space-y-2 pt-2">
          <h2 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            Acessórios
          </h2>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
            {acessorios.map((a, i) => (
              <div key={`${a.grupo}-${a.nome}-${i}`} className="rounded-xl border bg-card p-3">
                <p className="text-[10px] uppercase tracking-wide text-muted-foreground truncate">{a.grupo}</p>
                <p className="text-sm font-medium truncate">{a.nome}</p>
                <p className={`text-lg font-bold ${a.qtd <= 2 ? 'text-destructive' : 'text-primary'}`}>{a.qtd}</p>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Detalhe */}
      <Dialog open={!!selected} onOpenChange={(v) => !v && setSelected(null)}>
        <DialogContent className="max-w-md">
          {selected && (
            <>
              <DialogHeader>
                <DialogTitle className="text-base pr-6">
                  #{selected.numero} · {selected.item}
                </DialogTitle>
              </DialogHeader>
              <div className="space-y-1.5 text-sm">
                {[
                  ['Aço', selected.aco],
                  ['Acabamento', selected.acabamento],
                  ['Empunhadura', selected.empunhadura],
                  ['Bainha', selected.bainha],
                  ['Cor da bainha', selected.corBainha],
                  ['Adicional', selected.adicional],
                  ['Obs.', selected.obs],
                ]
                  .filter(([, v]) => v)
                  .map(([k, v]) => (
                    <div key={k} className="flex justify-between gap-3 border-b py-1.5 last:border-0">
                      <span className="text-muted-foreground text-xs">{k}</span>
                      <span className="font-medium text-right">{v}</span>
                    </div>
                  ))}
              </div>
              <Button
                className="w-full h-11 gap-2"
                variant={selected.vendido ? 'outline' : 'default'}
                disabled={toggleVendido.isPending}
                onClick={() => toggleVendido.mutate(selected)}
              >
                {toggleVendido.isPending ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : selected.vendido ? (
                  <Circle className="h-4 w-4" />
                ) : (
                  <CheckCircle2 className="h-4 w-4" />
                )}
                {selected.vendido ? 'Marcar como disponível' : 'Marcar como vendida'}
              </Button>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
