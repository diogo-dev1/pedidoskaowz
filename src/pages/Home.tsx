import { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { NavLink } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useSales } from '@/hooks/useSales';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Calculator, ShoppingBag, FilePlus2, ArrowRight, User, Bookmark,
  ChevronRight, RefreshCw, Factory, Loader2, AlertCircle, TrendingUp, ShoppingCart,
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

// ── Banners de ação (estilo Bling, cores Kaowz) ──────────────────
const BANNERS = [
  {
    titulo: 'Novo Pedido',
    descricao: 'Lance um pedido completo com todas as lâminas',
    cta: 'Criar pedido',
    url: '/novo-pedido',
    icon: FilePlus2,
    classe: 'bg-gradient-to-br from-zinc-900 via-zinc-800 to-zinc-900 text-white',
    ctaClasse: 'bg-accent text-accent-foreground hover:opacity-90',
  },
  {
    titulo: 'Catálogo',
    descricao: 'Catálogo público Kaowz para enviar ao cliente',
    cta: 'Abrir catálogo',
    url: '/catalogo',
    icon: ShoppingBag,
    classe: 'bg-gradient-to-br from-accent via-accent to-orange-600 text-accent-foreground',
    ctaClasse: 'bg-white text-zinc-900 hover:bg-white/90',
  },
  {
    titulo: 'Simulador de Preços',
    descricao: 'Calcule o valor de qualquer lâmina na hora',
    cta: 'Simular preço',
    url: '/simulador-precos',
    icon: Calculator,
    classe: 'bg-gradient-to-br from-zinc-900 via-zinc-800 to-zinc-900 text-white',
    ctaClasse: 'bg-accent text-accent-foreground hover:opacity-90',
  },
];

const ATALHOS = [
  { titulo: 'Pedidos de venda', url: '/pedidos' },
  { titulo: 'Pedidos a Lançar', url: '/triagem' },
  { titulo: 'Produção', url: '/producao' },
  { titulo: 'Expedição', url: '/expedicao' },
  { titulo: 'Clientes', url: '/clientes' },
  { titulo: 'Relatório de Vendas', url: '/relatorio-vendas' },
];

function DotRow({ cor, valor, label }: { cor: string; valor: number; label: string }) {
  return (
    <div className="flex items-center gap-2.5 py-1">
      <span className={`h-2 w-2 rounded-full shrink-0 ${cor}`} />
      <span className="text-sm font-semibold tabular-nums w-8">{valor}</span>
      <span className="text-sm text-muted-foreground">{label}</span>
    </div>
  );
}

export default function Home() {
  const { profile, user } = useAuth();
  const [periodo, setPeriodo] = useState<7 | 30 | 90>(7);

  const isAdmin = profile?.cargo === 'admin' || profile?.cargo === 'vendedor';
  const hojeISO = new Date().toISOString().split('T')[0];
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

  // Contagens gerais de status (pedidos do sistema)
  const { data: statusGeral } = useQuery({
    queryKey: ['home-status-geral'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('pedidos')
        .select('status, bloqueado_expedicao');
      if (error) throw error;
      return data ?? [];
    },
    staleTime: 60_000,
  });

  // Lote aberto mais recente
  const { data: loteAberto } = useQuery({
    queryKey: ['home-lote-aberto'],
    queryFn: async () => {
      const { data } = await supabase
        .from('lotes')
        .select('numero_lote, total_pedidos, capacidade_max')
        .eq('status', 'aberto')
        .order('numero_lote', { ascending: false })
        .limit(1)
        .maybeSingle();
      return data;
    },
    staleTime: 60_000,
  });

  // Situação da expedição
  const { data: expedicoes } = useQuery({
    queryKey: ['home-expedicao'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('expedicao')
        .select('status, data_postagem, data_entrega');
      if (error) throw error;
      return data ?? [];
    },
    staleTime: 60_000,
  });

  // Vendas de hoje — direto da planilha (data no formato DD/MM/YYYY)
  const hoje = useMemo(() => {
    const chave = hojeBR();
    const doDia = sales.filter((s) => s.date === chave);
    return {
      total: doDia.length,
      valor: doDia.reduce((sum, s) => sum + s.value, 0),
    };
  }, [sales]);

  const situacao = useMemo(() => {
    const rows = statusGeral ?? [];
    return {
      novos: rows.filter((r: any) => r.status === 'aguardando_triagem').length,
      emProducao: rows.filter((r: any) => ['aprovado', 'em_producao'].includes(r.status)).length,
      bloqueados: rows.filter((r: any) => r.bloqueado_expedicao).length,
    };
  }, [statusGeral]);

  const expedicaoResumo = useMemo(() => {
    const rows = expedicoes ?? [];
    return {
      aguardando: rows.filter((r: any) => r.status === 'aguardando').length,
      postadas: rows.filter((r: any) => r.data_postagem && !r.data_entrega).length,
      entregues: rows.filter((r: any) => r.data_entrega || r.status === 'entregue').length,
    };
  }, [expedicoes]);

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

  return (
    <div className="grid grid-cols-1 gap-4 lg:grid-cols-[290px_1fr] items-start">
      {/* ── Coluna esquerda: perfil + atalhos ─────────────────── */}
      <div className="space-y-4 order-2 lg:order-1">
        {/* Perfil */}
        <div className="rounded-xl border bg-card p-4">
          <div className="flex items-center gap-3">
            <div className="h-12 w-12 rounded-full bg-accent/15 flex items-center justify-center shrink-0">
              <User className="h-6 w-6 text-accent" />
            </div>
            <div className="min-w-0">
              <p className="font-semibold truncate">{profile?.nome_vendedor ?? 'Kaowz'}</p>
              <p className="text-xs text-muted-foreground truncate">{user?.email}</p>
              <p className="text-[10px] uppercase tracking-wider text-accent font-semibold mt-0.5">
                {profile?.cargo}
              </p>
            </div>
          </div>
        </div>

        {/* Lote em aberto (aviso estilo Bling) */}
        {loteAberto && (
          <NavLink
            to="/producao"
            className="flex items-center gap-3 rounded-xl border border-accent/30 bg-accent/10 p-4 hover:bg-accent/15 transition-colors"
          >
            <div className="h-9 w-9 rounded-full bg-accent/20 flex items-center justify-center shrink-0">
              <Factory className="h-4.5 w-4.5 text-accent" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-semibold">Lote {loteAberto.numero_lote} aberto</p>
              <p className="text-xs text-muted-foreground">
                {loteAberto.total_pedidos ?? 0}/{loteAberto.capacidade_max ?? 45} pedidos · ver produção
              </p>
            </div>
            <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0" />
          </NavLink>
        )}

        {/* Sync Vendas Site — admin only */}
        {isAdmin && (
          <div className="rounded-xl border bg-card p-4 space-y-3">
            <div className="flex items-center gap-2">
              <ShoppingCart className="h-4 w-4 text-accent" />
              <h2 className="text-sm font-semibold">Vendas Site</h2>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div className="space-y-1">
                <p className="text-[10px] text-muted-foreground uppercase tracking-wide">De</p>
                <Input
                  type="date"
                  value={syncFrom}
                  onChange={(e) => setSyncFrom(e.target.value)}
                  className="h-8 text-xs px-2 w-full"
                />
              </div>
              <div className="space-y-1">
                <p className="text-[10px] text-muted-foreground uppercase tracking-wide">Até</p>
                <Input
                  type="date"
                  value={syncTo}
                  onChange={(e) => setSyncTo(e.target.value)}
                  className="h-8 text-xs px-2 w-full"
                />
              </div>
            </div>
            <Button
              onClick={handleSyncShopify}
              disabled={syncing}
              size="sm"
              className="w-full gap-2"
            >
              {syncing
                ? <Loader2 className="h-3.5 w-3.5 animate-spin" />
                : <RefreshCw className="h-3.5 w-3.5" />}
              {syncing ? 'Sincronizando...' : 'Sincronizar pedidos'}
            </Button>
            {syncMsg && (
              <p className="text-xs text-center text-muted-foreground leading-snug">{syncMsg}</p>
            )}
          </div>
        )}

        {/* Atalhos favoritos */}
        <div className="rounded-xl border bg-card overflow-hidden">
          <div className="flex items-center gap-2 px-4 pt-4 pb-2">
            <Bookmark className="h-4 w-4 text-accent" />
            <h2 className="text-sm font-semibold">Atalhos favoritos</h2>
          </div>
          <div className="pb-2">
            {ATALHOS.map((a) => (
              <NavLink
                key={a.url}
                to={a.url}
                className="flex items-center justify-between px-4 py-2.5 text-sm hover:bg-muted transition-colors"
              >
                <span className="flex items-center gap-2.5">
                  <Bookmark className="h-3.5 w-3.5 text-muted-foreground/50" />
                  {a.titulo}
                </span>
                <ChevronRight className="h-3.5 w-3.5 text-muted-foreground/50" />
              </NavLink>
            ))}
          </div>
        </div>
      </div>

      {/* ── Coluna principal ──────────────────────────────────── */}
      <div className="space-y-4 order-1 lg:order-2 min-w-0">
        {/* Banners de ação — carrossel com snap no mobile, grid no desktop */}
        <div className="flex gap-3 overflow-x-auto snap-x-carousel -mx-3 px-3 pb-1 sm:mx-0 sm:px-0 sm:pb-0 sm:grid sm:grid-cols-3 sm:overflow-visible">
          {BANNERS.map((b) => (
            <NavLink
              key={b.url}
              to={b.url}
              className={`group relative rounded-xl p-4 flex flex-col justify-between min-h-[130px] min-w-[78%] sm:min-w-0 shadow-sm hover:shadow-md transition-all overflow-hidden ${b.classe}`}
            >
              <b.icon className="absolute -right-3 -bottom-3 h-20 w-20 opacity-10 group-hover:opacity-20 group-hover:scale-110 transition-all" />
              <div>
                <p className="font-bold leading-tight">{b.titulo}</p>
                <p className="text-xs opacity-80 mt-1 leading-snug">{b.descricao}</p>
              </div>
              <span className={`inline-flex items-center gap-1.5 self-start text-xs font-semibold px-3 py-1.5 rounded-full mt-3 transition-opacity ${b.ctaClasse}`}>
                {b.cta}
                <ArrowRight className="h-3 w-3 group-hover:translate-x-0.5 transition-transform" />
              </span>
            </NavLink>
          ))}
        </div>

        {/* Resumo diário — alimentado pela planilha de Relatório de Vendas */}
        <div className="rounded-xl border bg-card p-4 sm:p-5">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2 min-w-0">
              <h2 className="font-semibold">Resumo diário</h2>
              <NavLink
                to="/relatorio-vendas"
                className="hidden sm:flex items-center gap-1 text-[11px] text-accent hover:underline"
              >
                <TrendingUp className="h-3 w-3" />
                ver relatório completo
              </NavLink>
            </div>
            <button
              onClick={() => refetch()}
              className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors shrink-0"
            >
              {isFetching
                ? <Loader2 className="h-3 w-3 animate-spin" />
                : <RefreshCw className="h-3 w-3" />}
              Hoje às {horaAtualizacao}
            </button>
          </div>

          {vendasErro && (
            <div className="flex items-center gap-2 p-3 mb-4 rounded-lg bg-destructive/10 text-destructive text-xs">
              <AlertCircle className="h-4 w-4 flex-shrink-0" />
              <span>Não foi possível carregar as vendas da planilha. Toque em atualizar para tentar de novo.</span>
            </div>
          )}

          {vendasLoading ? (
            <div className="flex items-center justify-center py-10 text-muted-foreground gap-2 text-sm">
              <Loader2 className="h-4 w-4 animate-spin" /> Carregando resumo...
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
              {/* Vendas de hoje (planilha) */}
              <div className="rounded-lg border bg-muted/30 p-4">
                <p className="text-sm font-semibold mb-2">Pedidos de venda</p>
                <DotRow cor="bg-accent" valor={hoje.total} label="Vendas hoje" />
                <DotRow cor="bg-emerald-500" valor={situacao.novos} label="Aguardando triagem" />
                <DotRow cor="bg-blue-500" valor={situacao.emProducao} label="Em produção" />
                <DotRow cor="bg-red-500" valor={situacao.bloqueados} label="Bloqueados" />
              </div>

              {/* Meta diária (planilha) */}
              <div className="rounded-lg border bg-muted/30 p-4 flex flex-col">
                <p className="text-sm font-semibold mb-2">Meta diária</p>
                <p className="text-2xl font-bold text-accent" data-numeric>{brl(hoje.valor)}</p>
                <p className="text-xs text-muted-foreground mb-3">de {brl(META_DIARIA)}</p>
                <div className="h-2 rounded-full bg-muted overflow-hidden mt-auto">
                  <div
                    className="h-full rounded-full bg-accent transition-all"
                    style={{ width: `${metaPct}%` }}
                  />
                </div>
                <p className="text-[11px] text-muted-foreground mt-1.5">
                  {metaPct >= 100
                    ? 'Meta batida! 🎉'
                    : `Faltam ${brl(META_DIARIA - hoje.valor)} (${metaPct}%)`}
                </p>
              </div>

              {/* Expedição (sistema) */}
              <div className="rounded-lg border bg-muted/30 p-4">
                <p className="text-sm font-semibold mb-2">Expedição</p>
                <DotRow cor="bg-amber-500" valor={expedicaoResumo.aguardando} label="Aguardando" />
                <DotRow cor="bg-blue-500" valor={expedicaoResumo.postadas} label="Postadas" />
                <DotRow cor="bg-emerald-500" valor={expedicaoResumo.entregues} label="Entregues" />
              </div>
            </div>
          )}
        </div>

        {/* Gráfico de vendas por dia — planilha */}
        <div className="rounded-xl border bg-card p-4 sm:p-5">
          <div className="flex items-center justify-between flex-wrap gap-2 mb-4">
            <h2 className="font-semibold">Vendas por dia</h2>
            <div className="flex rounded-lg border overflow-hidden">
              {([7, 30, 90] as const).map((p) => (
                <button
                  key={p}
                  onClick={() => setPeriodo(p)}
                  className={`px-3 py-1.5 text-xs font-medium transition-colors ${
                    periodo === p
                      ? 'bg-accent text-accent-foreground'
                      : 'bg-card text-muted-foreground hover:bg-muted'
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
                  tickFormatter={(v: number) =>
                    v >= 1000 ? `R$ ${(v / 1000).toFixed(0)}k` : `R$ ${v}`
                  }
                />
                <Tooltip
                  formatter={(v: number) => [brl(Number(v)), 'Vendas']}
                  contentStyle={{ borderRadius: 8, fontSize: 12 }}
                />
                <Bar dataKey="valor" fill="hsl(28 90% 55%)" radius={[4, 4, 0, 0]} maxBarSize={40} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    </div>
  );
}
