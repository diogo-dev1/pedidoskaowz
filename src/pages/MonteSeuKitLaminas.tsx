import { useEffect, useMemo, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Check, MessageCircle, ChevronLeft, Loader2, Plus, Shield, Package } from 'lucide-react';
import kaowzLogo from '@/assets/kaowz-logo.png';

interface KitCatalogo {
  id: string;
  nome_modelo: string;
  preco_base: number;
  imagem_modelo: string | null;
  categoria: string | null;
  apresentacao_venda: string | null;
}

interface Modelo {
  id: string;
  nome_modelo: string;
  preco_base: number;
  imagem_modelo: string | null;
  categoria: string | null;
}

interface Combo {
  id: string;
  nome: string;
  descricao: string | null;
  modelo_ids: string[];
  desconto_percentual: number;
  imagem_url: string | null;
  ativo: boolean;
  ordem: number;
}

interface ConfigMap {
  whatsapp_phone: string;
  discount_by_qty: Record<string, number>;
  cupom_message: string;
  custom_kit_message: string;
  hero_eyebrow: string;
  hero_title: string;
  hero_desc: string;
  featured_kit_ids: string[];
}

const BRL = (n: number) =>
  n.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL', minimumFractionDigits: 0, maximumFractionDigits: 0 });

const renderTitle = (t: string) => {
  const parts = t.split(/\{([^}]+)\}/g);
  return parts.map((p, i) =>
    i % 2 === 1
      ? <span key={i} className="text-amber-400 italic">{p}</span>
      : <span key={i}>{p}</span>
  );
};

type Mode =
  | { kind: 'home' }
  | { kind: 'qty'; qty: number; discount: number; slots: (string | null)[] }
  | { kind: 'combo'; comboId: string };

export default function MonteSeuKitLaminas() {
  const [loading, setLoading] = useState(true);
  const [modelos, setModelos] = useState<Modelo[]>([]);
  const [combos, setCombos] = useState<Combo[]>([]);
  const [kitsCatalogo, setKitsCatalogo] = useState<KitCatalogo[]>([]);
  const [cfg, setCfg] = useState<ConfigMap>({
    whatsapp_phone: '5528999025695',
    discount_by_qty: { '2': 10, '3': 15 },
    cupom_message: 'Aproveite {pct}% de desconto montando seu Kit',
    custom_kit_message: 'Olá! Quero montar um Kit personalizado de lâminas. Pode me ajudar?',
    hero_eyebrow: '— Kaowz Ferramentas de Corte —',
    hero_title: 'MONTE SEU {KIT}',
    hero_desc: 'Escolha quantas lâminas quer no seu Kit e ganhe descontos progressivos.',
    featured_kit_ids: [],
  });
  const [mode, setMode] = useState<Mode>({ kind: 'home' });
  const [pickerIdx, setPickerIdx] = useState<number | null>(null);

  useEffect(() => {
    (async () => {
      const [mRes, cRes, kRes] = await Promise.all([
        supabase.from('catalogo_modelos').select('id, nome_modelo, preco_base, imagem_modelo, categoria').eq('visivel_catalogo', true).order('ordem_catalogo'),
        supabase.from('kit_laminas_config').select('chave, valor'),
        supabase.from('kit_laminas_combos').select('*').eq('ativo', true).order('ordem'),
      ]);
      if (mRes.data) setModelos(mRes.data as any);
      if (kRes.data) setCombos(kRes.data as any);

      let featuredIds: string[] = [];
      const map: any = { ...cfg };
      if (cRes.data) {
        for (const r of cRes.data) {
          if (r.chave === 'discount_by_qty') {
            try { map.discount_by_qty = JSON.parse(r.valor || '{}'); } catch {}
          } else if (r.chave === 'featured_kit_ids') {
            try { featuredIds = JSON.parse(r.valor || '[]'); } catch {}
            map.featured_kit_ids = featuredIds;
          } else {
            map[r.chave] = r.valor;
          }
        }
        setCfg(map);
      }

      // Featured kits: usar lista explícita; fallback para categoria 'Kits'
      let kitsQuery = supabase.from('catalogo_modelos')
        .select('id, nome_modelo, preco_base, imagem_modelo, categoria, apresentacao_venda')
        .eq('visivel_catalogo', true);
      if (featuredIds.length > 0) {
        kitsQuery = kitsQuery.in('id', featuredIds);
      } else {
        kitsQuery = kitsQuery.contains('categorias', ['Kits']);
      }
      const kcRes = await kitsQuery.order('ordem_catalogo');
      if (kcRes.data) {
        if (featuredIds.length > 0) {
          // preservar ordem definida pelo admin
          const order: Record<string, number> = {};
          featuredIds.forEach((id, i) => (order[id] = i));
          setKitsCatalogo([...kcRes.data].sort((a, b) => (order[a.id] ?? 999) - (order[b.id] ?? 999)) as any);
        } else {
          setKitsCatalogo(kcRes.data as any);
        }
      }
      setLoading(false);
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);


  const modeloById = useMemo(() => {
    const m: Record<string, Modelo> = {};
    modelos.forEach((x) => (m[x.id] = x));
    return m;
  }, [modelos]);

  const qtyOptions = useMemo(() => {
    return Object.entries(cfg.discount_by_qty)
      .map(([q, d]) => ({ qty: parseInt(q, 10), discount: Number(d) || 0 }))
      .filter((x) => x.qty >= 2)
      .sort((a, b) => a.qty - b.qty);
  }, [cfg]);

  const waUrl = (text: string) =>
    `https://wa.me/${cfg.whatsapp_phone}?text=${encodeURIComponent(text)}`;

  // ===== HOME =====
  if (loading) {
    return (
      <div className="min-h-screen bg-zinc-950 text-zinc-100 grid place-items-center">
        <Loader2 className="animate-spin" />
      </div>
    );
  }

  // ===== QTY FLOW =====
  if (mode.kind === 'qty') {
    const chosen = mode.slots.map((id) => (id ? modeloById[id] : null));
    const subtotal = chosen.reduce((s, m) => s + (m?.preco_base || 0), 0);
    const desconto = Math.round(subtotal * (mode.discount / 100));
    const total = subtotal - desconto;
    const allFilled = chosen.every((c) => c !== null);

    const msg = `Olá! Quero este Kit de ${mode.qty} lâminas:\n` +
      chosen.map((m, i) => `${i + 1}. ${m?.nome_modelo} — ${BRL(m?.preco_base || 0)}`).join('\n') +
      `\n\nSubtotal: ${BRL(subtotal)}\nDesconto ${mode.discount}%: -${BRL(desconto)}\nTotal: ${BRL(total)}`;

    return (
      <div className="min-h-screen bg-zinc-950 text-zinc-100 pb-32">
        <Header />
        <div className="max-w-5xl mx-auto px-4 pt-6">
          <button onClick={() => setMode({ kind: 'home' })} className="flex items-center gap-1 text-sm text-zinc-400 hover:text-amber-400 mb-4">
            <ChevronLeft size={16} /> Voltar
          </button>
          <div className="text-center mb-6">
            <div className="text-xs tracking-widest text-zinc-500">— Kit personalizado —</div>
            <h2 className="text-2xl sm:text-3xl font-bold mt-1">
              Monte seu Kit com <span className="text-amber-400">{mode.qty} lâminas</span>
            </h2>
            <div className="inline-flex mt-3 px-3 py-1 rounded-full bg-amber-400/10 border border-amber-400/30 text-amber-300 text-xs font-semibold">
              Desconto exclusivo: {mode.discount}% OFF
            </div>
          </div>

          <div className={`grid gap-3 ${mode.qty === 2 ? 'sm:grid-cols-2' : mode.qty === 3 ? 'sm:grid-cols-3' : 'sm:grid-cols-2 lg:grid-cols-3'}`}>
            {mode.slots.map((id, idx) => {
              const m = id ? modeloById[id] : null;
              return (
                <button
                  key={idx}
                  onClick={() => setPickerIdx(idx)}
                  className="group relative aspect-[3/4] rounded-2xl border border-zinc-800 bg-zinc-900 overflow-hidden hover:border-amber-400/60 transition text-left"
                >
                  <div className="absolute top-2 left-2 z-10 w-7 h-7 rounded-full bg-zinc-950/80 border border-zinc-700 grid place-items-center text-xs font-bold text-amber-400">
                    {idx + 1}
                  </div>
                  {m ? (
                    <>
                      {m.imagem_modelo && <img src={m.imagem_modelo} alt={m.nome_modelo} className="absolute inset-0 w-full h-full object-cover" />}
                      <div className="absolute inset-0 bg-gradient-to-t from-zinc-950 via-zinc-950/30 to-transparent" />
                      <div className="absolute bottom-0 left-0 right-0 p-3">
                        <div className="text-xs text-zinc-400 uppercase">{m.categoria}</div>
                        <div className="font-bold text-sm">{m.nome_modelo}</div>
                        <div className="text-amber-400 font-semibold text-sm mt-1">{BRL(m.preco_base)}</div>
                        <div className="text-[10px] text-zinc-500 mt-1 group-hover:text-amber-400">Tocar para trocar</div>
                      </div>
                    </>
                  ) : (
                    <div className="absolute inset-0 grid place-items-center text-zinc-500 group-hover:text-amber-400">
                      <div className="text-center">
                        <Plus className="mx-auto" />
                        <div className="text-sm mt-2 font-medium">Escolher lâmina {idx + 1}</div>
                      </div>
                    </div>
                  )}
                </button>
              );
            })}
          </div>

          {/* Totais */}
          <div className="mt-8 rounded-2xl border border-zinc-800 bg-zinc-900/70 p-5">
            <div className="flex items-center justify-between text-sm text-zinc-400">
              <span>Subtotal ({chosen.filter(Boolean).length}/{mode.qty} lâminas)</span>
              <span className="line-through">{BRL(subtotal)}</span>
            </div>
            <div className="flex items-center justify-between text-sm text-emerald-400 mt-1">
              <span>Desconto {mode.discount}%</span>
              <span>-{BRL(desconto)}</span>
            </div>
            <div className="border-t border-zinc-800 mt-3 pt-3 flex items-center justify-between">
              <span className="text-zinc-400 text-sm">Total</span>
              <span className="text-2xl font-bold text-amber-400">{BRL(total)}</span>
            </div>
          </div>
        </div>

        {/* Sticky CTA */}
        <div className="fixed bottom-0 left-0 right-0 bg-zinc-950/95 backdrop-blur border-t border-zinc-800 p-3 z-40">
          <div className="max-w-5xl mx-auto flex items-center gap-3">
            <div className="flex-1 min-w-0">
              <div className="text-[10px] text-zinc-500">Total com desconto</div>
              <div className="text-amber-400 font-bold truncate">{BRL(total)}</div>
            </div>
            <a
              href={allFilled ? waUrl(msg) : undefined}
              onClick={(e) => { if (!allFilled) e.preventDefault(); }}
              target="_blank"
              rel="noreferrer"
              className={`flex-1 sm:flex-none inline-flex items-center justify-center gap-2 px-5 py-3 rounded-xl font-bold text-sm transition ${allFilled ? 'bg-emerald-500 hover:bg-emerald-400 text-zinc-950' : 'bg-zinc-800 text-zinc-500 cursor-not-allowed'}`}
            >
              <MessageCircle size={18} />
              {allFilled ? 'Resgatar cupom no WhatsApp' : `Faltam ${mode.qty - chosen.filter(Boolean).length} lâmina(s)`}
            </a>
          </div>
        </div>

        {pickerIdx !== null && (
          <BladePicker
            modelos={modelos}
            onClose={() => setPickerIdx(null)}
            onPick={(id) => {
              const next = [...mode.slots];
              next[pickerIdx] = id;
              setMode({ ...mode, slots: next });
              setPickerIdx(null);
            }}
          />
        )}
      </div>
    );
  }

  // ===== COMBO FIXO =====
  if (mode.kind === 'combo') {
    const combo = combos.find((c) => c.id === mode.comboId);
    if (!combo) {
      setMode({ kind: 'home' });
      return null;
    }
    const items = combo.modelo_ids.map((id) => modeloById[id]).filter(Boolean);
    const subtotal = items.reduce((s, m) => s + m.preco_base, 0);
    const desconto = Math.round(subtotal * (combo.desconto_percentual / 100));
    const total = subtotal - desconto;
    const msg = `Olá! Quero o ${combo.nome}:\n` +
      items.map((m, i) => `${i + 1}. ${m.nome_modelo} — ${BRL(m.preco_base)}`).join('\n') +
      `\n\nSubtotal: ${BRL(subtotal)}\nDesconto ${combo.desconto_percentual}%: -${BRL(desconto)}\nTotal: ${BRL(total)}`;

    return (
      <div className="min-h-screen bg-zinc-950 text-zinc-100 pb-32">
        <Header />
        <div className="max-w-5xl mx-auto px-4 pt-6">
          <button onClick={() => setMode({ kind: 'home' })} className="flex items-center gap-1 text-sm text-zinc-400 hover:text-amber-400 mb-4">
            <ChevronLeft size={16} /> Voltar
          </button>
          <div className="text-center mb-6">
            <div className="text-xs tracking-widest text-zinc-500">— Kit pronto —</div>
            <h2 className="text-2xl sm:text-3xl font-bold mt-1">{combo.nome}</h2>
            {combo.descricao && <p className="text-zinc-400 mt-2 max-w-xl mx-auto text-sm">{combo.descricao}</p>}
            <div className="inline-flex mt-3 px-3 py-1 rounded-full bg-amber-400/10 border border-amber-400/30 text-amber-300 text-xs font-semibold">
              {combo.desconto_percentual}% OFF
            </div>
          </div>

          <div className={`grid gap-3 ${items.length === 2 ? 'sm:grid-cols-2' : 'sm:grid-cols-3'}`}>
            {items.map((m, idx) => (
              <div key={idx} className="relative aspect-[3/4] rounded-2xl border border-zinc-800 bg-zinc-900 overflow-hidden">
                {m.imagem_modelo && <img src={m.imagem_modelo} alt={m.nome_modelo} className="absolute inset-0 w-full h-full object-cover" />}
                <div className="absolute inset-0 bg-gradient-to-t from-zinc-950 via-zinc-950/30 to-transparent" />
                <div className="absolute bottom-0 left-0 right-0 p-3">
                  <div className="text-xs text-zinc-400 uppercase">{m.categoria}</div>
                  <div className="font-bold text-sm">{m.nome_modelo}</div>
                  <div className="text-amber-400 font-semibold text-sm mt-1">{BRL(m.preco_base)}</div>
                </div>
              </div>
            ))}
          </div>

          <div className="mt-8 rounded-2xl border border-zinc-800 bg-zinc-900/70 p-5">
            <div className="flex items-center justify-between text-sm text-zinc-400">
              <span>Subtotal</span>
              <span className="line-through">{BRL(subtotal)}</span>
            </div>
            <div className="flex items-center justify-between text-sm text-emerald-400 mt-1">
              <span>Desconto {combo.desconto_percentual}%</span>
              <span>-{BRL(desconto)}</span>
            </div>
            <div className="border-t border-zinc-800 mt-3 pt-3 flex items-center justify-between">
              <span className="text-zinc-400 text-sm">Total</span>
              <span className="text-2xl font-bold text-amber-400">{BRL(total)}</span>
            </div>
          </div>
        </div>

        <div className="fixed bottom-0 left-0 right-0 bg-zinc-950/95 backdrop-blur border-t border-zinc-800 p-3 z-40">
          <div className="max-w-5xl mx-auto flex items-center gap-3">
            <div className="flex-1 min-w-0">
              <div className="text-[10px] text-zinc-500">Total com desconto</div>
              <div className="text-amber-400 font-bold truncate">{BRL(total)}</div>
            </div>
            <a href={waUrl(msg)} target="_blank" rel="noreferrer" className="flex-1 sm:flex-none inline-flex items-center justify-center gap-2 px-5 py-3 rounded-xl font-bold text-sm bg-emerald-500 hover:bg-emerald-400 text-zinc-950">
              <MessageCircle size={18} /> Resgatar cupom no WhatsApp
            </a>
          </div>
        </div>
      </div>
    );
  }

  // ===== HOME =====
  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100 pb-16">
      <Header />
      <section className="max-w-3xl mx-auto px-4 pt-12 pb-8 text-center">
        <h1 className="text-3xl sm:text-5xl font-light tracking-tight">{renderTitle(cfg.hero_title)}</h1>
        <p className="text-zinc-500 mt-4 max-w-md mx-auto text-sm">{cfg.hero_desc}</p>
      </section>

      {/* Ofertas por quantidade */}
      <section className="max-w-4xl mx-auto px-4">
        <div className="mb-4">
          <span className="text-[10px] text-zinc-600 tracking-[0.25em] uppercase">Escolha a quantidade</span>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2">
          {qtyOptions.map(({ qty, discount }) => (
            <button
              key={qty}
              onClick={() => setMode({ kind: 'qty', qty, discount, slots: Array(qty).fill(null) })}
              className="group relative rounded-lg border border-zinc-800 hover:border-amber-400/60 bg-zinc-900/40 p-5 text-left transition"
            >
              <div className="text-4xl font-light">{qty}<span className="text-zinc-600 text-2xl">×</span></div>
              <div className="text-[11px] text-zinc-500 mt-1 uppercase tracking-wider">Lâminas</div>
              <div className="text-xs text-amber-400 mt-3 font-medium">−{discount}% OFF</div>
            </button>
          ))}

          {/* Custom kit */}
          <a
            href={waUrl(cfg.custom_kit_message)}
            target="_blank"
            rel="noreferrer"
            className="group relative rounded-lg border border-zinc-800 hover:border-emerald-400/60 bg-zinc-900/40 p-5 text-left transition"
          >
            <div className="text-4xl font-light text-emerald-400">4<span className="text-zinc-600 text-2xl">+</span></div>
            <div className="text-[11px] text-zinc-500 mt-1 uppercase tracking-wider">Personalizado</div>
            <div className="text-xs text-emerald-400 mt-3 font-medium inline-flex items-center gap-1">
              <MessageCircle size={11} /> WhatsApp
            </div>
          </a>
        </div>
      </section>

      {/* Combos prontos */}
      {combos.length > 0 && (
        <section className="max-w-4xl mx-auto px-4 mt-14">
          <div className="mb-4">
            <span className="text-[10px] text-zinc-600 tracking-[0.25em] uppercase">Kits prontos</span>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {combos.map((c) => {
              const items = c.modelo_ids.map((id) => modeloById[id]).filter(Boolean);
              const subtotal = items.reduce((s, m) => s + m.preco_base, 0);
              const total = subtotal - Math.round(subtotal * (c.desconto_percentual / 100));
              return (
                <button
                  key={c.id}
                  onClick={() => setMode({ kind: 'combo', comboId: c.id })}
                  className="group relative rounded-lg border border-zinc-800 hover:border-amber-400/60 bg-zinc-900/40 overflow-hidden text-left transition"
                >
                  <div className="relative aspect-[16/10] bg-zinc-950">
                    {c.imagem_url ? (
                      <img src={c.imagem_url} alt={c.nome} className="absolute inset-0 w-full h-full object-cover" />
                    ) : (
                      <div className="absolute inset-0 grid grid-cols-3 gap-0.5 p-1.5">
                        {items.slice(0, 3).map((m, i) => (
                          <div key={i} className="bg-zinc-900 overflow-hidden rounded-sm">
                            {m.imagem_modelo && <img src={m.imagem_modelo} alt="" className="w-full h-full object-cover" />}
                          </div>
                        ))}
                      </div>
                    )}
                    <div className="absolute top-2 right-2 px-1.5 py-0.5 text-[10px] font-medium text-amber-400 border border-amber-400/40 bg-zinc-950/70 rounded">
                      −{c.desconto_percentual}%
                    </div>
                  </div>
                  <div className="p-3">
                    <div className="font-medium text-sm">{c.nome}</div>
                    {c.descricao && <div className="text-xs text-zinc-500 mt-0.5 line-clamp-1">{c.descricao}</div>}
                    <div className="flex items-baseline gap-2 mt-2">
                      <span className="text-[11px] text-zinc-600 line-through">{BRL(subtotal)}</span>
                      <span className="text-amber-400 text-sm font-medium">{BRL(total)}</span>
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        </section>
      )}

      {/* Kits do Catálogo (selecionados na admin) */}
      {kitsCatalogo.length > 0 && (
        <section className="max-w-4xl mx-auto px-4 mt-14">
          <div className="mb-4">
            <span className="text-[10px] text-zinc-600 tracking-[0.25em] uppercase">Kits da linha oficial</span>
          </div>
          <div className="grid grid-cols-2 lg:grid-cols-3 gap-2 sm:gap-3">
            {kitsCatalogo.map((k) => {
              const msg = `Olá! Tenho interesse no *${k.nome_modelo}* (${BRL(k.preco_base)}). Pode me passar mais detalhes?`;
              return (
                <a
                  key={k.id}
                  href={`https://wa.me/${cfg.whatsapp_phone}?text=${encodeURIComponent(msg)}`}
                  target="_blank"
                  rel="noreferrer"
                  className="group relative rounded-lg border border-zinc-800 hover:border-amber-400/60 bg-zinc-900/40 overflow-hidden text-left transition"
                >
                  <div className="relative aspect-square bg-zinc-950">
                    {k.imagem_modelo ? (
                      <img src={k.imagem_modelo} alt={k.nome_modelo} className="absolute inset-0 w-full h-full object-cover" />
                    ) : (
                      <div className="absolute inset-0 grid place-items-center text-zinc-700">
                        <Package size={36} strokeWidth={1} />
                      </div>
                    )}
                  </div>
                  <div className="p-2.5 sm:p-3">
                    <div className="font-medium text-xs sm:text-sm leading-tight line-clamp-2 min-h-[2.4em]">{k.nome_modelo}</div>
                    <div className="flex items-center justify-between mt-2">
                      <span className="text-amber-400 text-sm font-medium">{BRL(k.preco_base)}</span>
                      <MessageCircle size={12} className="text-zinc-500 group-hover:text-emerald-400 transition" />
                    </div>
                  </div>
                </a>
              );
            })}
          </div>
        </section>
      )}

      <section className="max-w-3xl mx-auto px-4 mt-14 text-center">
        <div className="inline-flex items-center gap-2 text-[11px] text-zinc-600">
          <Shield size={11} className="text-amber-400/60" strokeWidth={1.5} />
          Garantia vitalícia · Afiação gratuita · Cupom confirmado pelo WhatsApp
        </div>
      </section>
    </div>
  );
}


function Header() {
  return (
    <header className="border-b border-zinc-900">
      <div className="max-w-5xl mx-auto px-4 py-3 flex items-center justify-center">
        <img src={kaowzLogo} alt="Kaowz" className="h-9" />
      </div>
    </header>
  );
}

function BladePicker({ modelos, onPick, onClose }: { modelos: Modelo[]; onPick: (id: string) => void; onClose: () => void }) {
  const [q, setQ] = useState('');
  const filtered = modelos.filter((m) => m.nome_modelo.toLowerCase().includes(q.toLowerCase()) || (m.categoria || '').toLowerCase().includes(q.toLowerCase()));
  return (
    <div className="fixed inset-0 z-50 bg-zinc-950/95 backdrop-blur flex flex-col">
      <div className="border-b border-zinc-800 p-3 flex items-center gap-3">
        <button onClick={onClose} className="p-2 text-zinc-400 hover:text-amber-400"><ChevronLeft /></button>
        <input
          autoFocus
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Buscar lâmina por nome ou categoria..."
          className="flex-1 h-10 bg-zinc-900 border border-zinc-800 rounded-lg px-3 text-sm text-zinc-100 placeholder:text-zinc-500"
        />
      </div>
      <div className="flex-1 overflow-y-auto p-3">
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 max-w-5xl mx-auto">
          {filtered.map((m) => (
            <button
              key={m.id}
              onClick={() => onPick(m.id)}
              className="group relative aspect-[3/4] rounded-2xl border border-zinc-800 hover:border-amber-400 bg-zinc-900 overflow-hidden text-left"
            >
              {m.imagem_modelo && <img src={m.imagem_modelo} alt={m.nome_modelo} className="absolute inset-0 w-full h-full object-cover" />}
              <div className="absolute inset-0 bg-gradient-to-t from-zinc-950 via-zinc-950/30 to-transparent" />
              <div className="absolute bottom-0 left-0 right-0 p-3">
                <div className="text-[10px] uppercase text-zinc-400">{m.categoria}</div>
                <div className="font-bold text-sm leading-tight">{m.nome_modelo}</div>
                <div className="text-amber-400 font-semibold text-sm mt-1">{BRL(m.preco_base)}</div>
              </div>
              <div className="absolute top-2 right-2 w-7 h-7 rounded-full bg-zinc-950/80 border border-zinc-700 grid place-items-center text-zinc-400 group-hover:bg-amber-400 group-hover:text-zinc-950 transition">
                <Check size={14} />
              </div>
            </button>
          ))}
          {filtered.length === 0 && (
            <div className="col-span-full text-center text-zinc-500 py-12">Nenhuma lâmina encontrada</div>
          )}
        </div>
      </div>
    </div>
  );
}
