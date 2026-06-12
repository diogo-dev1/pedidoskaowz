import { useEffect, useMemo, useRef, useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

// ───────────────────────────────────────────────────────────────────────────
// Tipos
// ───────────────────────────────────────────────────────────────────────────
interface ShopifyVariant {
  id: number;
  title: string;
  sku: string | null;
  price: string | null;
  inventory_quantity: number;
  inventory_item_id: number;
}
interface ShopifyProduct {
  id: number;
  title: string;
  status: string;
  image: { src: string } | null;
  variants: ShopifyVariant[];
}
interface ShopifyLocation {
  id: number;
  name: string;
}
interface InventoryData {
  products: ShopifyProduct[];
  locations: ShopifyLocation[];
}

type StockStatus = 'OK' | 'BAIXO' | 'CRÍTICO' | 'ESGOTADO';

const REFRESH_MS = 30_000;

const STATUS_COLOR: Record<StockStatus, string> = {
  OK: '#16a34a',
  BAIXO: '#ca8a04',
  'CRÍTICO': '#ea580c',
  ESGOTADO: '#dc2626',
};

function getStockStatus(q: number): StockStatus {
  if (q <= 0) return 'ESGOTADO';
  if (q <= 3) return 'CRÍTICO';
  if (q <= 10) return 'BAIXO';
  return 'OK';
}

const SEVERITY: Record<StockStatus, number> = { ESGOTADO: 3, 'CRÍTICO': 2, BAIXO: 1, OK: 0 };

const brl = (v: string | number | null) => {
  const n = typeof v === 'string' ? parseFloat(v) : v;
  if (n == null || isNaN(n)) return '—';
  return n.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
};

function variantTitle(t: string) {
  return t === 'Default Title' ? 'Unidade padrão' : t;
}

// Estatísticas agregadas de um produto
function productStats(p: ShopifyProduct) {
  let total = 0;
  let esgotadas = 0;
  let criticas = 0;
  let worst: StockStatus = 'OK';
  for (const v of p.variants) {
    const q = v.inventory_quantity ?? 0;
    total += q;
    const s = getStockStatus(q);
    if (s === 'ESGOTADO') esgotadas++;
    if (s === 'CRÍTICO') criticas++;
    if (SEVERITY[s] > SEVERITY[worst]) worst = s;
  }
  return { total, esgotadas, criticas, worst };
}

type FilterKey = 'todos' | 'critico' | 'esgotado';
type SortKey = 'problemas' | 'menor' | 'maior' | 'nome';

// ───────────────────────────────────────────────────────────────────────────
// Componente
// ───────────────────────────────────────────────────────────────────────────
export default function Inventory() {
  const queryClient = useQueryClient();

  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<FilterKey>('todos');
  const [sort, setSort] = useState<SortKey>('problemas');
  const [expanded, setExpanded] = useState<Set<number>>(new Set());
  const [editingVariant, setEditingVariant] = useState<number | null>(null);
  const [editValue, setEditValue] = useState('');
  const [now, setNow] = useState(Date.now());
  const autoExpandedRef = useRef(false);

  // Carrega as fontes do Google uma única vez
  useEffect(() => {
    const id = 'inv-google-fonts';
    if (document.getElementById(id)) return;
    const link = document.createElement('link');
    link.id = id;
    link.rel = 'stylesheet';
    link.href =
      'https://fonts.googleapis.com/css2?family=Bebas+Neue&family=Barlow+Condensed:wght@500;600;700&family=Inter:wght@400;500;600;700&display=swap';
    document.head.appendChild(link);
  }, []);

  const { data, isLoading, isFetching, error, refetch, dataUpdatedAt } = useQuery<InventoryData>({
    queryKey: ['shopify-inventory'],
    queryFn: async () => {
      const { data, error } = await supabase.functions.invoke('shopify-inventory', {
        body: { action: 'list' },
      });
      if (error) throw error;
      if (data?.error) throw new Error(typeof data.error === 'string' ? data.error : 'Erro na API');
      return data as InventoryData;
    },
    refetchInterval: REFRESH_MS,
    refetchIntervalInBackground: false,
  });

  // Tick de 1s para o anel de contagem regressiva
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, []);

  const secondsLeft = Math.max(
    0,
    Math.ceil((REFRESH_MS - (now - (dataUpdatedAt || now))) / 1000),
  );

  const locationId = data?.locations?.[0]?.id ?? null;

  // Mutation: ajustar estoque (com atualização otimista para resposta instantânea)
  const setInventory = useMutation({
    mutationFn: async (params: { inventory_item_id: number; available: number }) => {
      if (locationId == null) throw new Error('Nenhuma localização disponível');
      const { data, error } = await supabase.functions.invoke('shopify-inventory', {
        body: { action: 'set', location_id: locationId, ...params },
      });
      if (error) throw error;
      if (data?.error) throw new Error(typeof data.error === 'string' ? data.error : 'Erro ao salvar');
      return data;
    },
    onMutate: async (params) => {
      await queryClient.cancelQueries({ queryKey: ['shopify-inventory'] });
      const prev = queryClient.getQueryData<InventoryData>(['shopify-inventory']);
      if (prev) {
        queryClient.setQueryData<InventoryData>(['shopify-inventory'], {
          ...prev,
          products: prev.products.map((p) => ({
            ...p,
            variants: p.variants.map((v) =>
              v.inventory_item_id === params.inventory_item_id
                ? { ...v, inventory_quantity: params.available }
                : v,
            ),
          })),
        });
      }
      return { prev };
    },
    onError: (err: Error, _params, ctx) => {
      if (ctx?.prev) queryClient.setQueryData(['shopify-inventory'], ctx.prev);
      toast.error(`Erro ao atualizar estoque: ${err.message}`);
    },
    onSuccess: () => {
      toast.success('Estoque atualizado');
    },
  });

  const adjustBy = (v: ShopifyVariant, delta: number) => {
    const next = Math.max(0, (v.inventory_quantity ?? 0) + delta);
    setInventory.mutate({ inventory_item_id: v.inventory_item_id, available: next });
  };

  const startEdit = (v: ShopifyVariant) => {
    setEditingVariant(v.id);
    setEditValue(String(Math.max(0, v.inventory_quantity ?? 0)));
  };

  const commitEdit = (v: ShopifyVariant) => {
    const q = parseInt(editValue, 10);
    if (isNaN(q) || q < 0) {
      toast.error('Informe uma quantidade válida');
      return;
    }
    setInventory.mutate({ inventory_item_id: v.inventory_item_id, available: q });
    setEditingVariant(null);
  };

  // Auto-expandir, na primeira carga, produtos com alguma variante ≤3
  useEffect(() => {
    if (!data?.products || autoExpandedRef.current) return;
    autoExpandedRef.current = true;
    const toExpand = new Set<number>();
    for (const p of data.products) {
      if (p.variants.some((v) => (v.inventory_quantity ?? 0) <= 3)) toExpand.add(p.id);
    }
    setExpanded(toExpand);
  }, [data?.products]);

  // KPIs e saúde do estoque
  const kpis = useMemo(() => {
    const products = data?.products ?? [];
    let totalStock = 0;
    let ativos = 0;
    const counts = { OK: 0, BAIXO: 0, 'CRÍTICO': 0, ESGOTADO: 0 } as Record<StockStatus, number>;
    for (const p of products) {
      if (p.status === 'active') ativos++;
      for (const v of p.variants) {
        const q = v.inventory_quantity ?? 0;
        totalStock += q;
        counts[getStockStatus(q)]++;
      }
    }
    const totalVariants = counts.OK + counts.BAIXO + counts['CRÍTICO'] + counts.ESGOTADO;
    return { totalStock, ativos, counts, totalVariants };
  }, [data?.products]);

  // Contadores por filtro (sobre produtos)
  const filterCounts = useMemo(() => {
    const products = data?.products ?? [];
    let critico = 0;
    let esgotado = 0;
    for (const p of products) {
      const s = productStats(p);
      if (s.criticas > 0) critico++;
      if (s.esgotadas > 0) esgotado++;
    }
    return { todos: products.length, critico, esgotado };
  }, [data?.products]);

  // Lista filtrada + ordenada
  const visibleProducts = useMemo(() => {
    let products = data?.products ?? [];
    const term = search.trim().toLowerCase();
    if (term) {
      products = products.filter(
        (p) =>
          p.title.toLowerCase().includes(term) ||
          p.variants.some(
            (v) =>
              v.title.toLowerCase().includes(term) || (v.sku ?? '').toLowerCase().includes(term),
          ),
      );
    }
    if (filter === 'critico') products = products.filter((p) => productStats(p).criticas > 0);
    if (filter === 'esgotado') products = products.filter((p) => productStats(p).esgotadas > 0);

    const withStats = products.map((p) => ({ p, s: productStats(p) }));
    withStats.sort((a, b) => {
      switch (sort) {
        case 'menor':
          return a.s.total - b.s.total;
        case 'maior':
          return b.s.total - a.s.total;
        case 'nome':
          return a.p.title.localeCompare(b.p.title, 'pt-BR');
        case 'problemas':
        default: {
          const scoreA = a.s.esgotadas * 1000 + a.s.criticas * 10 + SEVERITY[a.s.worst];
          const scoreB = b.s.esgotadas * 1000 + b.s.criticas * 10 + SEVERITY[b.s.worst];
          if (scoreB !== scoreA) return scoreB - scoreA;
          return a.s.total - b.s.total;
        }
      }
    });
    return withStats;
  }, [data?.products, search, filter, sort]);

  const maxTotal = useMemo(
    () => Math.max(1, ...visibleProducts.map((x) => x.s.total)),
    [visibleProducts],
  );

  const toggleCard = (id: number) => {
    setExpanded((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };
  const expandAll = () => setExpanded(new Set(visibleProducts.map((x) => x.p.id)));
  const collapseAll = () => setExpanded(new Set());

  // Anel de contagem regressiva (SVG)
  const ringR = 13;
  const ringC = 2 * Math.PI * ringR;
  const ringProgress = secondsLeft / (REFRESH_MS / 1000);

  return (
    <div className="inv-app">
      <style>{INV_CSS}</style>

      {/* Header escuro fixo */}
      <header className="inv-header">
        <div className="inv-logo">KAOWZ</div>
        <div className="inv-header-right">
          <span className="inv-live">
            <span className="inv-dot" /> Ao vivo
          </span>
          <div className="inv-ring" title={`Atualiza em ${secondsLeft}s`}>
            <svg width="34" height="34" viewBox="0 0 34 34">
              <circle cx="17" cy="17" r={ringR} className="inv-ring-bg" />
              <circle
                cx="17"
                cy="17"
                r={ringR}
                className="inv-ring-fg"
                strokeDasharray={ringC}
                strokeDashoffset={ringC * (1 - ringProgress)}
                transform="rotate(-90 17 17)"
              />
            </svg>
            <span className="inv-ring-num">{secondsLeft}</span>
          </div>
          <button className="inv-btn-orange" onClick={() => refetch()} disabled={isFetching}>
            {isFetching ? 'Atualizando…' : 'Atualizar'}
          </button>
        </div>
      </header>

      <div className="inv-body">
        {error && (
          <div className="inv-error">
            Falha ao carregar o inventário: {(error as Error).message}
          </div>
        )}

        {/* KPIs */}
        <section className="inv-kpis">
          <Kpi label="Total em estoque" value={kpis.totalStock} tip="Soma das quantidades de todas as variantes." />
          <Kpi label="Produtos ativos" value={kpis.ativos} tip="Produtos com status 'active' na Shopify." />
          <Kpi
            label="Variantes esgotadas"
            value={kpis.counts.ESGOTADO}
            tone="#dc2626"
            tip="Variantes com 0 unidades."
          />
          <Kpi
            label="Variantes críticas"
            value={kpis.counts['CRÍTICO']}
            tone="#ea580c"
            tip="Variantes com 1 a 3 unidades."
          />
        </section>

        {/* Saúde do estoque */}
        <section className="inv-card inv-health">
          <div className="inv-label">Saúde do estoque</div>
          <div className="inv-health-bar">
            {(['OK', 'BAIXO', 'CRÍTICO', 'ESGOTADO'] as StockStatus[]).map((s) => {
              const pct = kpis.totalVariants ? (kpis.counts[s] / kpis.totalVariants) * 100 : 0;
              return pct > 0 ? (
                <div
                  key={s}
                  style={{ width: `${pct}%`, background: STATUS_COLOR[s] }}
                  title={`${s}: ${kpis.counts[s]}`}
                />
              ) : null;
            })}
          </div>
          <div className="inv-legend">
            {(['OK', 'BAIXO', 'CRÍTICO', 'ESGOTADO'] as StockStatus[]).map((s) => (
              <span key={s}>
                <i style={{ background: STATUS_COLOR[s] }} /> {s} ({kpis.counts[s]})
              </span>
            ))}
          </div>
        </section>

        {/* Toolbar */}
        <section className="inv-toolbar">
          <input
            className="inv-search"
            placeholder="Buscar por nome ou SKU…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          <div className="inv-filters">
            {([
              ['todos', 'Todos', filterCounts.todos],
              ['critico', 'Crítico', filterCounts.critico],
              ['esgotado', 'Esgotado', filterCounts.esgotado],
            ] as [FilterKey, string, number][]).map(([key, lbl, count]) => (
              <button
                key={key}
                className={`inv-chip ${filter === key ? 'is-active' : ''}`}
                onClick={() => setFilter(key)}
              >
                {lbl} <b>{count}</b>
              </button>
            ))}
          </div>
          <select className="inv-select" value={sort} onChange={(e) => setSort(e.target.value as SortKey)}>
            <option value="problemas">Problemas primeiro</option>
            <option value="menor">Menor estoque</option>
            <option value="maior">Maior estoque</option>
            <option value="nome">Nome A–Z</option>
          </select>
          <div className="inv-expand-btns">
            <button className="inv-chip" onClick={expandAll}>Expandir todos</button>
            <button className="inv-chip" onClick={collapseAll}>Recolher todos</button>
          </div>
        </section>

        {/* Grid de cards */}
        {isLoading ? (
          <div className="inv-grid">
            {Array.from({ length: 8 }).map((_, i) => (
              <div key={i} className="inv-card inv-skeleton" />
            ))}
          </div>
        ) : visibleProducts.length === 0 ? (
          <div className="inv-empty">Nenhum produto encontrado</div>
        ) : (
          <div className="inv-grid">
            {visibleProducts.map(({ p, s }) => {
              const isOpen = expanded.has(p.id);
              const cardClass =
                s.esgotadas > 0 ? 'is-esgotado' : s.criticas > 0 ? 'is-critico' : '';
              return (
                <article key={p.id} className={`inv-pcard ${cardClass}`}>
                  {/* Imagem + badges */}
                  <div className="inv-pimg">
                    {p.image?.src ? (
                      <img src={p.image.src} alt={p.title} loading="lazy" />
                    ) : (
                      <div className="inv-noimg">sem foto</div>
                    )}
                    <span className="inv-status-badge" style={{ background: STATUS_COLOR[s.worst] }}>
                      {s.worst}
                    </span>
                    <span className="inv-stock-seal">{s.total} un</span>
                  </div>

                  {/* Corpo */}
                  <div className="inv-pbody">
                    <h3 className="inv-ptitle">{p.title}</h3>
                    <div className="inv-pmeta">
                      {p.variants.length} variante{p.variants.length !== 1 && 's'}
                    </div>
                    {(s.esgotadas > 0 || s.criticas > 0) && (
                      <div className="inv-palerts">
                        {s.esgotadas > 0 && (
                          <span style={{ color: STATUS_COLOR.ESGOTADO }}>{s.esgotadas} esgotada(s)</span>
                        )}
                        {s.criticas > 0 && (
                          <span style={{ color: STATUS_COLOR['CRÍTICO'] }}>{s.criticas} crítica(s)</span>
                        )}
                      </div>
                    )}
                    {/* Barra de volume relativa */}
                    <div className="inv-volume">
                      <div
                        style={{
                          width: `${(s.total / maxTotal) * 100}%`,
                          background: STATUS_COLOR[s.worst],
                        }}
                      />
                    </div>
                  </div>

                  {/* Variantes expansíveis */}
                  {isOpen && (
                    <div className="inv-variants">
                      {p.variants.length > 3 && (
                        <div className="inv-variants-hint">
                          {p.variants.length} variantes · role para ver todas
                        </div>
                      )}
                      {p.variants.map((v) => {
                        const vs = getStockStatus(v.inventory_quantity ?? 0);
                        const editing = editingVariant === v.id;
                        return (
                          <div key={v.id} className="inv-variant">
                            <span className="inv-vstripe" style={{ background: STATUS_COLOR[vs] }} />
                            <div className="inv-vinfo">
                              <div className="inv-vtitle">{variantTitle(v.title)}</div>
                              <div className="inv-vsub">
                                {v.sku ? `SKU ${v.sku}` : 'sem SKU'} · {brl(v.price)}
                              </div>
                            </div>
                            <span className="inv-vqty">{v.inventory_quantity ?? 0}</span>
                            <span className="inv-vbadge" style={{ color: STATUS_COLOR[vs], borderColor: STATUS_COLOR[vs] }}>
                              {vs}
                            </span>
                            {editing ? (
                              <input
                                className="inv-vedit"
                                type="number"
                                min={0}
                                autoFocus
                                value={editValue}
                                onChange={(e) => setEditValue(e.target.value)}
                                onKeyDown={(e) => {
                                  if (e.key === 'Enter') commitEdit(v);
                                  if (e.key === 'Escape') setEditingVariant(null);
                                }}
                                onBlur={() => setEditingVariant(null)}
                              />
                            ) : (
                              <div className="inv-vctrls">
                                <button
                                  className="inv-step"
                                  onClick={() => adjustBy(v, -1)}
                                  disabled={setInventory.isPending || (v.inventory_quantity ?? 0) <= 0}
                                  aria-label="Diminuir 1"
                                >
                                  −
                                </button>
                                <button
                                  className="inv-step"
                                  onClick={() => adjustBy(v, 1)}
                                  disabled={setInventory.isPending}
                                  aria-label="Aumentar 1"
                                >
                                  +
                                </button>
                                <button className="inv-adjust" onClick={() => startEdit(v)}>
                                  Ajustar
                                </button>
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  )}

                  {/* Rodapé */}
                  <button className="inv-pfooter" onClick={() => toggleCard(p.id)}>
                    Ver variantes
                    <span className={`inv-chevron ${isOpen ? 'is-open' : ''}`}>⌄</span>
                  </button>
                </article>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

// KPI card
function Kpi({
  label,
  value,
  tip,
  tone,
}: {
  label: string;
  value: number;
  tip: string;
  tone?: string;
}) {
  return (
    <div className="inv-card inv-kpi" title={tip}>
      <div className="inv-label">{label}</div>
      <div className="inv-kpi-value" style={tone ? { color: tone } : undefined}>
        {value.toLocaleString('pt-BR')}
      </div>
    </div>
  );
}

// ───────────────────────────────────────────────────────────────────────────
// Estilos (escopados sob .inv-app)
// ───────────────────────────────────────────────────────────────────────────
const INV_CSS = `
.inv-app { --bg:hsl(0 0% 96%); --card:#fff; --orange:hsl(28 90% 55%); --orange-h:hsl(28 90% 47%);
  --header:hsl(0 0% 15%); --radius:6px; --shadow:0 1px 3px rgba(0,0,0,.08),0 1px 2px rgba(0,0,0,.04);
  background:var(--bg); min-height:100vh; font-family:'Inter',system-ui,sans-serif; color:#1f2937; }
.inv-app * { box-sizing:border-box; }

.inv-header { position:sticky; top:0; z-index:20; background:var(--header); color:#fff;
  display:flex; align-items:center; justify-content:space-between; padding:10px 16px; box-shadow:var(--shadow); }
.inv-logo { font-family:'Bebas Neue',sans-serif; font-size:30px; letter-spacing:2px; color:var(--orange); line-height:1; }
.inv-header-right { display:flex; align-items:center; gap:12px; }
.inv-live { font-family:'Barlow Condensed',sans-serif; font-weight:600; font-size:14px; text-transform:uppercase;
  letter-spacing:.5px; display:flex; align-items:center; gap:6px; color:#e5e7eb; }
.inv-dot { width:9px; height:9px; border-radius:50%; background:#22c55e; box-shadow:0 0 0 0 rgba(34,197,94,.7);
  animation:inv-pulse 1.6s infinite; }
@keyframes inv-pulse { 0%{box-shadow:0 0 0 0 rgba(34,197,94,.6);} 70%{box-shadow:0 0 0 8px rgba(34,197,94,0);} 100%{box-shadow:0 0 0 0 rgba(34,197,94,0);} }
.inv-ring { position:relative; width:34px; height:34px; }
.inv-ring-bg { fill:none; stroke:rgba(255,255,255,.18); stroke-width:3; }
.inv-ring-fg { fill:none; stroke:var(--orange); stroke-width:3; stroke-linecap:round; transition:stroke-dashoffset 1s linear; }
.inv-ring-num { position:absolute; inset:0; display:flex; align-items:center; justify-content:center;
  font-family:'Barlow Condensed',sans-serif; font-size:13px; font-weight:700; color:#fff; }
.inv-btn-orange { background:var(--orange); color:#fff; border:none; border-radius:var(--radius); padding:8px 14px;
  font-family:'Barlow Condensed',sans-serif; font-weight:700; text-transform:uppercase; letter-spacing:.5px;
  font-size:14px; cursor:pointer; transition:background .15s; }
.inv-btn-orange:hover:not(:disabled) { background:var(--orange-h); }
.inv-btn-orange:disabled { opacity:.6; cursor:default; }

.inv-body { max-width:1200px; margin:0 auto; padding:16px; display:flex; flex-direction:column; gap:16px; }
.inv-error { background:#fef2f2; border:1px solid #fecaca; color:#b91c1c; padding:12px 14px; border-radius:var(--radius); font-size:14px; }
.inv-card { background:var(--card); border-radius:var(--radius); box-shadow:var(--shadow); }
.inv-label { font-family:'Barlow Condensed',sans-serif; font-weight:600; text-transform:uppercase; letter-spacing:.5px;
  font-size:13px; color:#6b7280; }

.inv-kpis { display:grid; grid-template-columns:1fr 1fr; gap:12px; }
.inv-kpi { padding:14px; }
.inv-kpi-value { font-family:'Bebas Neue',sans-serif; font-size:38px; line-height:1; margin-top:4px; color:#111827; }

.inv-health { padding:14px; }
.inv-health-bar { display:flex; height:14px; border-radius:99px; overflow:hidden; margin:10px 0; background:#e5e7eb; }
.inv-health-bar > div { transition:width .3s; }
.inv-legend { display:flex; flex-wrap:wrap; gap:14px; font-size:12px; color:#4b5563; }
.inv-legend span { display:flex; align-items:center; gap:5px; }
.inv-legend i { width:10px; height:10px; border-radius:3px; display:inline-block; }

.inv-toolbar { display:flex; flex-wrap:wrap; gap:10px; align-items:center; }
.inv-search { flex:1 1 220px; min-width:180px; padding:9px 12px; border:1px solid #d1d5db; border-radius:var(--radius);
  font-size:14px; font-family:'Inter',sans-serif; background:#fff; }
.inv-search:focus { outline:2px solid var(--orange); outline-offset:-1px; }
.inv-filters, .inv-expand-btns { display:flex; gap:6px; }
.inv-chip { background:#fff; border:1px solid #d1d5db; border-radius:var(--radius); padding:7px 11px; font-size:13px;
  font-family:'Barlow Condensed',sans-serif; font-weight:600; text-transform:uppercase; letter-spacing:.4px;
  cursor:pointer; color:#374151; transition:all .15s; }
.inv-chip b { color:var(--orange); margin-left:3px; }
.inv-chip:hover { border-color:var(--orange); }
.inv-chip.is-active { background:var(--header); color:#fff; border-color:var(--header); }
.inv-chip.is-active b { color:var(--orange); }
.inv-select { padding:8px 10px; border:1px solid #d1d5db; border-radius:var(--radius); font-size:13px;
  font-family:'Inter',sans-serif; background:#fff; cursor:pointer; }

.inv-grid { display:grid; grid-template-columns:1fr 1fr; gap:12px; }
@media (min-width:640px){ .inv-grid { grid-template-columns:repeat(auto-fill,minmax(195px,1fr)); gap:14px; } }

.inv-skeleton { height:260px; background:linear-gradient(90deg,#eee,#f5f5f5,#eee); background-size:200% 100%;
  animation:inv-shimmer 1.4s infinite; }
@keyframes inv-shimmer { 0%{background-position:200% 0;} 100%{background-position:-200% 0;} }

.inv-pcard { background:var(--card); border-radius:var(--radius); box-shadow:var(--shadow); overflow:hidden;
  display:flex; flex-direction:column; border:1px solid transparent; }
.inv-pcard.is-critico { border-color:#fdba74; }
.inv-pcard.is-esgotado { border-color:#fca5a5; }
.inv-pimg { position:relative; aspect-ratio:1/1; overflow:hidden; background:#f3f4f6; }
.inv-pimg img { width:100%; height:100%; object-fit:cover; transition:transform .3s; }
.inv-pcard:hover .inv-pimg img { transform:scale(1.06); }
.inv-noimg { width:100%; height:100%; display:flex; align-items:center; justify-content:center; color:#9ca3af; font-size:12px; }
.inv-status-badge { position:absolute; top:6px; left:6px; color:#fff; font-family:'Barlow Condensed',sans-serif;
  font-weight:700; font-size:11px; text-transform:uppercase; letter-spacing:.4px; padding:2px 7px; border-radius:99px; }
.inv-stock-seal { position:absolute; bottom:6px; right:6px; background:rgba(0,0,0,.78); color:#fff;
  font-family:'Bebas Neue',sans-serif; font-size:15px; letter-spacing:.5px; padding:2px 8px; border-radius:var(--radius); }
.inv-pbody { padding:10px; }
.inv-ptitle { font-size:13px; font-weight:600; margin:0 0 4px; line-height:1.25; display:-webkit-box;
  -webkit-line-clamp:2; -webkit-box-orient:vertical; overflow:hidden; min-height:32px; }
.inv-pmeta { font-size:11px; color:#6b7280; }
.inv-palerts { display:flex; flex-wrap:wrap; gap:8px; font-size:11px; font-weight:600; margin-top:4px; }
.inv-volume { height:4px; background:#e5e7eb; border-radius:99px; overflow:hidden; margin-top:8px; }
.inv-volume > div { height:100%; transition:width .3s; }

.inv-variants { max-height:264px; overflow-y:auto; border-top:1px solid #f0f0f0; padding:4px 8px; display:flex; flex-direction:column; gap:6px; }
.inv-variants-hint { font-size:11px; color:#9ca3af; padding:4px 2px 0; font-style:italic; }
.inv-variant { position:relative; display:flex; align-items:center; gap:8px; padding:7px 8px 7px 12px;
  border:1px solid #f0f0f0; border-radius:var(--radius); background:#fafafa; }
.inv-vstripe { position:absolute; left:0; top:0; bottom:0; width:4px; border-radius:var(--radius) 0 0 var(--radius); }
.inv-vinfo { min-width:0; flex:1; }
.inv-vtitle { font-size:12px; font-weight:600; white-space:nowrap; overflow:hidden; text-overflow:ellipsis; }
.inv-vsub { font-size:10px; color:#6b7280; white-space:nowrap; overflow:hidden; text-overflow:ellipsis; }
.inv-vqty { font-family:'Bebas Neue',sans-serif; font-size:18px; color:#111827; min-width:22px; text-align:right; }
.inv-vbadge { font-family:'Barlow Condensed',sans-serif; font-weight:700; font-size:10px; text-transform:uppercase;
  border:1px solid; border-radius:99px; padding:1px 6px; }
.inv-vctrls { display:flex; align-items:center; gap:4px; }
.inv-step { width:30px; height:30px; min-width:30px; border:1px solid #d1d5db; background:#fff; border-radius:var(--radius);
  font-size:18px; line-height:1; cursor:pointer; color:#374151; display:flex; align-items:center; justify-content:center; }
.inv-step:hover:not(:disabled){ border-color:var(--orange); color:var(--orange); }
.inv-step:disabled { opacity:.4; cursor:default; }
.inv-adjust { height:30px; padding:0 9px; border:1px solid #d1d5db; background:#fff; border-radius:var(--radius);
  font-family:'Barlow Condensed',sans-serif; font-weight:600; font-size:12px; text-transform:uppercase; cursor:pointer; color:#374151; }
.inv-adjust:hover { border-color:var(--orange); color:var(--orange); }
.inv-vedit { width:66px; height:30px; border:1px solid var(--orange); border-radius:var(--radius); padding:0 6px; font-size:13px; }
@media (max-width:639px){ .inv-step { width:36px; height:36px; min-width:36px; } .inv-adjust { height:36px; } .inv-vedit { height:36px; } }

.inv-pfooter { margin-top:auto; border:none; border-top:1px solid #f0f0f0; background:#fff; width:100%; padding:8px;
  font-family:'Barlow Condensed',sans-serif; font-weight:600; font-size:12px; text-transform:uppercase; letter-spacing:.4px;
  color:#374151; cursor:pointer; display:flex; align-items:center; justify-content:center; gap:6px; }
.inv-pfooter:hover { color:var(--orange); }
.inv-chevron { transition:transform .2s; }
.inv-chevron.is-open { transform:rotate(180deg); }

.inv-empty { text-align:center; color:#9ca3af; padding:48px 0; }
`;
