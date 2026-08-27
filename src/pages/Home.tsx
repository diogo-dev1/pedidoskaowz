import { useMemo, useState } from 'react';
import { NavLink } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useSales } from '@/hooks/useSales';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription,
} from '@/components/ui/dialog';
import {
  Calculator, ShoppingBag, Truck, MessageSquare, TrendingUp, Repeat,
  ShoppingCart, RefreshCw, Loader2, AlertCircle,
} from 'lucide-react';
import {
  ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid,
} from 'recharts';

const META_DIARIA = 9000;

const brl = (n: number) =>
  n.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

/** Data de hoje no formato DD/MM/YYYY — mesmo formato da planilha de vendas. */
function hojeBR(): string {
  const d = new Date();
  return `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}/${d.getFullYear()}`;
}

function chaveDia(d: Date): string {
  return `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}/${d.getFullYear()}`;
}

type Card = {
  titulo: string;
  icon: typeof Calculator;
  url?: string;
  acao?: 'sync';
  adminOnly?: boolean;
  /** Gradiente colorido do cartão (estilo Bling, cores Kaowz) */
  classe: string;
};

// Grade principal de acesso rápido (8 cartões) — coloridos
const CARDS: Card[] = [
  { titulo: 'Simulador', icon: Calculator, url: '/simulador-precos', classe: 'bg-gradient-to-br from-zinc-900 via-zinc-800 to-zinc-900 text-white border-zinc-700' },
  { titulo: 'Catálogo', icon: ShoppingBag, url: '/catalogo', classe: 'bg-gradient-to-br from-accent via-accent to-orange-600 text-accent-foreground border-accent/60' },
  { titulo: 'Frete', icon: Truck, url: '/calcular-frete', classe: 'bg-gradient-to-br from-sky-600 via-sky-700 to-sky-800 text-white border-sky-500/60' },
  { titulo: 'Mensagens', icon: MessageSquare, url: '/mensagens', classe: 'bg-gradient-to-br from-emerald-600 via-emerald-700 to-emerald-800 text-white border-emerald-500/60' },
  { titulo: 'Vendas', icon: TrendingUp, url: '/relatorio-vendas', classe: 'bg-gradient-to-br from-amber-500 via-amber-600 to-orange-600 text-white border-amber-400/60' },
  { titulo: 'Upsell', icon: Repeat, url: '/upsell-clientes', classe: 'bg-gradient-to-br from-violet-600 via-violet-700 to-violet-800 text-white border-violet-500/60' },
  { titulo: 'Checkouts', icon: ShoppingCart, url: '/checkouts-abandonados', classe: 'bg-gradient-to-br from-rose-600 via-rose-700 to-rose-800 text-white border-rose-500/60' },
  { titulo: 'Sincronizar', icon: RefreshCw, acao: 'sync', adminOnly: true, classe: 'bg-gradient-to-br from-zinc-800 via-zinc-700 to-zinc-800 text-white border-zinc-600' },
];

export default function Home() {
  const { profile } = useAuth();
  const [periodo, setPeriodo] = useState<7 | 30 | 90>(7);

  const isAdmin = profile?.cargo === 'admin';
  const hojeISO = new Date().toISOString().split('T')[0];
  const [syncOpen, setSyncOpen] = useState(false);
  const [syncFrom, setSyncFrom] = useState(hojeISO);
  const [syncTo, setSyncTo] = useState(hojeISO);
  const [syncing, setSyncing] = useState(false);
  const [syncMsg, setSyncMsg] = useState<string | null>(null);

  async function handleSyncShopify() {
    setSyncing(true);
    setSyncMsg(null);
    try {
      const { data, error } = await supabase.functions.invoke('sync-shopify-orders', {
        body: { data_inicio: syncFrom, data_fim: syncTo },
      });
      if (error) throw error;
      const msg = data?.mensagem ?? 'Pedidos sincronizados!';
      setSyncMsg(msg);
      toast.success(msg);
    } catch (err: any) {
      const msg = err?.message ?? 'Erro ao sincronizar';
      setSyncMsg(msg);
      toast.error(msg);
    } finally {
      setSyncing(false);
    }
  }

  // Vendas reais da planilha de Relatório de Vendas (mesma fonte do /relatorio-vendas)
  const {
    sales,
    lastUpdated,
    isLoading: vendasLoading,
    isError: vendasErro,
    refetch,
    isFetching,
  } = useSales();

  // Vendas de hoje — direto da planilha (data no formato DD/MM/YYYY)
  const hoje = useMemo(() => {
    const chave = hojeBR();
    const doDia = sales.filter((s) => s.date === chave);
    return {
      total: doDia.length,
      valor: doDia.reduce((sum, s) => sum + s.value, 0),
    };
  }, [sales]);

  // Gráfico: soma da planilha por dia, nos últimos N dias
  const dadosGrafico = useMemo(() => {
    const mapa = new Map<string, number>();
    for (const s of sales) {
      mapa.set(s.date, (mapa.get(s.date) ?? 0) + s.value);
    }
    const dias: { dia: string; valor: number }[] = [];
    for (let i = periodo - 1; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      dias.push({
        dia: `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}`,
        valor: mapa.get(chaveDia(d)) ?? 0,
      });
    }
    return dias;
  }, [sales, periodo]);

  const metaPct = Math.min(100, Math.round((hoje.valor / META_DIARIA) * 100));
  const horaAtualizacao = lastUpdated
    ? new Date(lastUpdated).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
    : '—';

  const cardsVisiveis = CARDS.filter((c) => !c.adminOnly || isAdmin);
  const classeCard =
    'group rounded-xl aspect-square flex flex-col items-center justify-center gap-2 border shadow-md hover:shadow-lg hover:brightness-110 hover:scale-[1.02] active:scale-[0.98] transition-all';

  return (
    <div className="space-y-4">
      {/* ── Grade de acesso rápido ─────────────────────────────── */}
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4 sm:gap-3">
        {cardsVisiveis.map((c) =>
          c.url ? (
            <NavLink key={c.titulo} to={c.url} className={`${classeCard} ${c.classe}`}>
              <c.icon className="h-7 w-7 sm:h-8 sm:w-8 group-hover:scale-110 transition-transform" />
              <p className="font-semibold text-xs sm:text-sm text-center px-1 leading-tight">{c.titulo}</p>
            </NavLink>
          ) : (
            <button key={c.titulo} type="button" onClick={() => setSyncOpen(true)} className={`${classeCard} ${c.classe}`}>
              <c.icon className="h-7 w-7 sm:h-8 sm:w-8 group-hover:scale-110 transition-transform" />
              <p className="font-semibold text-xs sm:text-sm text-center px-1 leading-tight">{c.titulo}</p>
            </button>
          ),
        )}
      </div>

      {/* ── Resumo diário: apenas meta ─────────────────────────── */}
      <div className="rounded-xl border bg-card p-4 sm:p-5">
        <div className="flex items-center justify-between mb-3 gap-2">
          <h2 className="font-semibold">Meta diária</h2>
          <button
            onClick={() => refetch()}
            className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors shrink-0"
          >
            {isFetching ? <Loader2 className="h-3 w-3 animate-spin" /> : <RefreshCw className="h-3 w-3" />}
            Hoje às {horaAtualizacao}
          </button>
        </div>

        {vendasErro && (
          <div className="flex items-center gap-2 p-3 mb-3 rounded-lg bg-destructive/10 text-destructive text-xs">
            <AlertCircle className="h-4 w-4 flex-shrink-0" />
            <span>Não foi possível carregar as vendas da planilha. Toque em atualizar para tentar de novo.</span>
          </div>
        )}

        {vendasLoading ? (
          <div className="flex items-center justify-center py-8 text-muted-foreground gap-2 text-sm">
            <Loader2 className="h-4 w-4 animate-spin" /> Carregando...
          </div>
        ) : (
          <>
            <p className="text-3xl font-bold text-accent" data-numeric>{brl(hoje.valor)}</p>
            <p className="text-xs text-muted-foreground mb-3">
              de {brl(META_DIARIA)} · {hoje.total} {hoje.total === 1 ? 'venda' : 'vendas'} hoje
            </p>
            <div className="h-2 rounded-full bg-muted overflow-hidden">
              <div className="h-full rounded-full bg-accent transition-all" style={{ width: `${metaPct}%` }} />
            </div>
            <p className="text-[11px] text-muted-foreground mt-1.5">
              {metaPct >= 100 ? 'Meta batida! 🎉' : `Faltam ${brl(META_DIARIA - hoje.valor)} (${metaPct}%)`}
            </p>
          </>
        )}
      </div>

      {/* ── Gráfico de vendas por dia — planilha ───────────────── */}
      <div className="rounded-xl border bg-card p-4 sm:p-5">
        <div className="flex items-center justify-between flex-wrap gap-2 mb-4">
          <h2 className="font-semibold">Vendas por dia</h2>
          <div className="flex rounded-lg border overflow-hidden">
            {([7, 30, 90] as const).map((p) => (
              <button
                key={p}
                onClick={() => setPeriodo(p)}
                className={`px-3 py-1.5 text-xs font-medium transition-colors ${
                  periodo === p ? 'bg-accent text-accent-foreground' : 'bg-card text-muted-foreground hover:bg-muted'
                }`}
              >
                {p === 90 ? '3M' : `${p}D`}
              </button>
            ))}
          </div>
        </div>
        <div className="h-56">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={dadosGrafico} margin={{ top: 4, right: 4, left: 4, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(0 0% 90%)" />
              <XAxis
                dataKey="dia"
                tick={{ fontSize: 10 }}
                tickLine={false}
                axisLine={false}
                interval={periodo === 7 ? 0 : 'preserveStartEnd'}
              />
              <YAxis
                tick={{ fontSize: 10 }}
                tickLine={false}
                axisLine={false}
                width={70}
                tickFormatter={(v: number) => (v >= 1000 ? `R$ ${(v / 1000).toFixed(0)}k` : `R$ ${v}`)}
              />
              <Tooltip formatter={(v: number) => [brl(Number(v)), 'Vendas']} contentStyle={{ borderRadius: 8, fontSize: 12 }} />
              <Bar dataKey="valor" fill="hsl(28 90% 55%)" radius={[4, 4, 0, 0]} maxBarSize={40} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* ── Modal: sincronizar pedidos do site ─────────────────── */}
      <Dialog open={syncOpen} onOpenChange={setSyncOpen}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Sincronizar pedidos do site</DialogTitle>
            <DialogDescription>
              Importa os pedidos da loja no período escolhido para o relatório de vendas.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <span className="text-[10px] text-muted-foreground uppercase tracking-wide w-8 shrink-0">De</span>
              <Input type="date" value={syncFrom} onChange={(e) => setSyncFrom(e.target.value)} className="h-9 text-sm flex-1 min-w-0" />
            </div>
            <div className="flex items-center gap-2">
              <span className="text-[10px] text-muted-foreground uppercase tracking-wide w-8 shrink-0">Até</span>
              <Input type="date" value={syncTo} onChange={(e) => setSyncTo(e.target.value)} className="h-9 text-sm flex-1 min-w-0" />
            </div>
          </div>
          <Button onClick={handleSyncShopify} disabled={syncing} className="w-full gap-2">
            {syncing ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
            {syncing ? 'Sincronizando...' : 'Sincronizar pedidos'}
          </Button>
          {syncMsg && <p className="text-xs text-center text-muted-foreground leading-snug">{syncMsg}</p>}
        </DialogContent>
      </Dialog>
    </div>
  );
}
