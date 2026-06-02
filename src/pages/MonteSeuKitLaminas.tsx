import { useEffect, useMemo, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { MessageCircle, ChevronLeft, Loader2, Plus, Shield, Package, Check } from 'lucide-react';
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
  show_discount: boolean;
  qty_eyebrow: string;
  qty_unit_label: string;
  personalizado_qty_label: string;
  personalizado_sub_label: string;
  combos_eyebrow: string;
  catalogo_eyebrow: string;
  footer_text: string;
  cta_cupom_label: string;
  cta_cupom_falta_label: string;
  slot_empty_label: string;
  subtotal_label: string;
  desconto_label: string;
  total_label: string;
  total_sticky_label: string;
  qty_kit_title: string;
  qty_kit_eyebrow: string;
  combo_eyebrow: string;
  voltar_label: string;
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

const DEFAULT_CFG: ConfigMap = {
  whatsapp_phone: '5528999025695',
  discount_by_qty: { '2': 10, '3': 15, '4': 20 },
  cupom_message: 'Aproveite {pct}% de desconto montando seu Kit',
  custom_kit_message: 'Olá! Quero montar um Kit personalizado de lâminas. Pode me ajudar?',
  hero_eyebrow: '— Kaowz Ferramentas de Corte —',
  hero_title: 'MONTE SEU {KIT}',
  hero_desc: 'Escolha quantas lâminas quer no seu Kit e ganhe descontos progressivos.',
  featured_kit_ids: [],
  show_discount: true,
  qty_eyebrow: 'Escolha a quantidade',
  qty_unit_label: 'Lâminas',
  personalizado_qty_label: '5+',
  personalizado_sub_label: 'Personalizado',
  combos_eyebrow: 'Kits prontos',
  catalogo_eyebrow: 'Kits da linha oficial',
  footer_text: 'Garantia vitalícia · Afiação gratuita · Cupom confirmado pelo WhatsApp',
  cta_cupom_label: 'Resgatar cupom no WhatsApp',
  cta_cupom_falta_label: 'Faltam {n} lâmina(s)',
  slot_empty_label: 'Add lâmina',
  subtotal_label: 'Subtotal',
  desconto_label: 'Desconto',
  total_label: 'Total',
  total_sticky_label: 'Total com desconto',
  qty_kit_title: 'Monte seu Kit com {qty} lâminas',
  qty_kit_eyebrow: '— Kit personalizado —',
  combo_eyebrow: '— Kit pronto —',
  voltar_label: 'Voltar',
};

export default function MonteSeuKitLaminas() {
  const [loading, setLoading] = useState(true);
  const [modelos, setModelos] = useState<Modelo[]>([]);
  const [combos, setCombos] = useState<Combo[]>([]);
  const [kitsCatalogo, setKitsCatalogo] = useState<KitCatalogo[]>([]);
  const [cfg, setCfg] = useState<ConfigMap>(DEFAULT_CFG);
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
      const map: any = { ...DEFAULT_CFG };
      if (cRes.data) {
        for (const r of cRes.data) {
          if (r.chave === 'discount_by_qty') {
            try { map.discount_by_qty = JSON.parse(r.valor || '{}'); } catch {}
          } else if (r.chave === 'featured_kit_ids') {
            try { featuredIds = JSON.parse(r.valor || '[]'); } catch {}
            map.featured_kit_ids = featuredIds;
          } else if (r.chave === 'show_discount') {
            map.show_discount = r.valor !== 'false';
          } else {
            map[r.chave] = r.valor;
          }
        }
        setCfg(map);
      }

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
    const total = cfg.show_discount ? subtotal - desconto : subtotal;
    const allFilled = chosen.every((c) => c !== null);
    const faltam = mode.qty - chosen.filter(Boolean).length;

    const msgLines = chosen.map((m, i) => `${i + 1}. ${m?.nome_modelo} — ${BRL(m?.preco_base || 0)}`).join('\n');
    const msg = cfg.show_discount
      ? `Olá! Quero este Kit de ${mode.qty} lâminas:\n${msgLines}\n\n${cfg.subtotal_label}: ${BRL(subtotal)}\n${cfg.desconto_label} ${mode.discount}%: -${BRL(desconto)}\n${cfg.total_label}: ${BRL(total)}`
      : `Olá! Quero este Kit de ${mode.qty} lâminas:\n${msgLines}\n\n${cfg.total_label}: ${BRL(total)}`;

    const kitTitle = cfg.qty_kit_title.replace('{qty}', String(mode.qty));

    return (
      <div className="min-h-screen bg-zinc-950 text-zinc-100 pb-32">
        <Header />
        <div className="max-w-5xl mx-auto px-4 pt-6">
          <button onClick={() => setMode({ kind: 'home' })} className="flex items-center gap-1 text-sm text-zinc-400 hover:text-amber-400 mb-4">
            <ChevronLeft size={16} /> {cfg.voltar_label}
          </button>
          <div className="text-center mb-6">
            <div className="text-xs tracking-widest text-zinc-500">{cfg.qty_kit_eyebrow}</div>
            <h2 className="text-2xl sm:text-3xl font-bold mt-1">{kitTitle}</h2>
            {cfg.show_discount && (
              <div className="inline-flex mt-3 px-3 py-1 rounded-full bg-amber-400/10 border border-amber-400/30 text-amber-300 text-xs font-semibold">
                {mode.discount}% OFF
              </div>
            )}
          </div>

          <div className={`grid gap-2 sm:gap-3 ${mode.qty === 2 ? 'grid-cols-2' : mode.qty === 3 ? 'grid-cols-3' : 'grid-cols-2 sm:grid-cols-4'}`}>
            {mode.slots.map((id, idx) => {
              const m = id ? modeloById[id] : null;
              return (
                <button
                  key={idx}
                  onClick={() => setPickerIdx(idx)}
                  className="group relative aspect-[3/4] rounded-md border border-zinc-800 bg-zinc-900/60 overflow-hidden hover:border-amber-400/60 transition text-left"
                >
                  <div className="absolute top-1.5 left-1.5 z-10 px-1.5 h-5 rounded-sm bg-zinc-950/80 border border-zinc-700 grid place-items-center text-[10px] font-mono font-bold text-amber-400">
                    {String(idx + 1).padStart(2, '0')}
                  </div>
                  {m ? (
                    <>
                      {m.imagem_modelo && <img src={m.imagem_modelo} alt={m.nome_modelo} className="absolute inset-0 w-full h-full object-cover" />}
                      <div className="absolute inset-0 bg-gradient-to-t from-zinc-950 via-zinc-950/40 to-transparent" />
                      <div className="absolute bottom-0 left-0 right-0 p-2">
                        <div className="text-[9px] text-zinc-400 uppercase tracking-wider">{m.categoria}</div>
                        <div className="font-semibold text-xs leading-tight line-clamp-2">{m.nome_modelo}</div>
                        <div className="text-amber-400 font-medium text-xs mt-0.5">{BRL(m.preco_base)}</div>
                      </div>
                    </>
                  ) : (
                    <div className="absolute inset-0 grid place-items-center text-zinc-600 group-hover:text-amber-400 transition">
                      {/* tactical minimal + */}
                      <div className="flex flex-col items-center gap-1.5">
                        <div className="w-7 h-7 rounded-sm border border-dashed border-zinc-700 group-hover:border-amber-400/70 grid place-items-center">
                          <Plus size={14} strokeWidth={1.5} />
                        </div>
                        <div className="text-[9px] uppercase tracking-[0.2em] font-mono">{cfg.slot_empty_label}</div>
                      </div>
                    </div>
                  )}
                </button>
              );
            })}
          </div>

          {/* Totais */}
          <div className="mt-8 rounded-md border border-zinc-800 bg-zinc-900/40 p-4">
            {cfg.show_discount ? (
              <>
                <div className="flex items-center justify-between text-xs text-zinc-400">
                  <span>{cfg.subtotal_label} ({chosen.filter(Boolean).length}/{mode.qty})</span>
                  <span className="line-through">{BRL(subtotal)}</span>
                </div>
                <div className="flex items-center justify-between text-xs text-emerald-400 mt-1">
                  <span>{cfg.desconto_label} {mode.discount}%</span>
                  <span>-{BRL(desconto)}</span>
                </div>
                <div className="border-t border-zinc-800 mt-3 pt-3 flex items-center justify-between">
                  <span className="text-zinc-400 text-sm">{cfg.total_label}</span>
                  <span className="text-2xl font-bold text-amber-400">{BRL(total)}</span>
                </div>
              </>
            ) : (
              <div className="flex items-center justify-between">
                <span className="text-zinc-400 text-sm">{cfg.total_label} ({chosen.filter(Boolean).length}/{mode.qty})</span>
                <span className="text-2xl font-bold text-amber-400">{BRL(total)}</span>
              </div>
            )}
          </div>
        </div>

        {/* Sticky CTA */}
        <div className="fixed bottom-0 left-0 right-0 bg-zinc-950/95 backdrop-blur border-t border-zinc-800 p-3 z-40">
          <div className="max-w-5xl mx-auto flex items-center gap-3">
            <div className="flex-1 min-w-0">
              <div className="text-[10px] text-zinc-500 uppercase tracking-wider">{cfg.total_sticky_label}</div>
              <div className="text-amber-400 font-bold truncate">{BRL(total)}</div>
            </div>
            <a
              href={allFilled ? waUrl(msg) : undefined}
              onClick={(e) => { if (!allFilled) e.preventDefault(); }}
              target="_blank"
              rel="noreferrer"
              className={`flex-1 sm:flex-none inline-flex items-center justify-center gap-2 px-5 py-3 rounded-md font-bold text-sm transition ${allFilled ? 'bg-emerald-500 hover:bg-emerald-400 text-zinc-950' : 'bg-zinc-800 text-zinc-500 cursor-not-allowed'}`}
            >
              <MessageCircle size={18} />
              {allFilled ? cfg.cta_cupom_label : cfg.cta_cupom_falta_label.replace('{n}', String(faltam))}
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
    const total = cfg.show_discount ? subtotal - desconto : subtotal;
    const msgLines = items.map((m, i) => `${i + 1}. ${m.nome_modelo} — ${BRL(m.preco_base)}`).join('\n');
    const msg = cfg.show_discount
      ? `Olá! Quero o ${combo.nome}:\n${msgLines}\n\n${cfg.subtotal_label}: ${BRL(subtotal)}\n${cfg.desconto_label} ${combo.desconto_percentual}%: -${BRL(desconto)}\n${cfg.total_label}: ${BRL(total)}`
      : `Olá! Quero o ${combo.nome}:\n${msgLines}\n\n${cfg.total_label}: ${BRL(total)}`;

    return (
      <div className="min-h-screen bg-zinc-950 text-zinc-100 pb-32">
        <Header />
        <div className="max-w-5xl mx-auto px-4 pt-6">
          <button onClick={() => setMode({ kind: 'home' })} className="flex items-center gap-1 text-sm text-zinc-400 hover:text-amber-400 mb-4">
            <ChevronLeft size={16} /> {cfg.voltar_label}
          </button>
          <div className="text-center mb-6">
            <div className="text-xs tracking-widest text-zinc-500">{cfg.combo_eyebrow}</div>
            <h2 className="text-2xl sm:text-3xl font-bold mt-1">{combo.nome}</h2>
            {combo.descricao && <p className="text-zinc-400 mt-2 max-w-xl mx-auto text-sm">{combo.descricao}</p>}
            {cfg.show_discount && (
              <div className="inline-flex mt-3 px-3 py-1 rounded-full bg-amber-400/10 border border-amber-400/30 text-amber-300 text-xs font-semibold">
                {combo.desconto_percentual}% OFF
              </div>
            )}
          </div>

          <div className={`grid gap-2 sm:gap-3 ${items.length === 2 ? 'grid-cols-2' : items.length === 3 ? 'grid-cols-3' : 'grid-cols-2 sm:grid-cols-4'}`}>
            {items.map((m, idx) => (
              <div key={idx} className="relative aspect-[3/4] rounded-md border border-zinc-800 bg-zinc-900/60 overflow-hidden">
                {m.imagem_modelo && <img src={m.imagem_modelo} alt={m.nome_modelo} className="absolute inset-0 w-full h-full object-cover" />}
                <div className="absolute inset-0 bg-gradient-to-t from-zinc-950 via-zinc-950/40 to-transparent" />
                <div className="absolute bottom-0 left-0 right-0 p-2">
                  <div className="text-[9px] text-zinc-400 uppercase tracking-wider">{m.categoria}</div>
                  <div className="font-semibold text-xs leading-tight line-clamp-2">{m.nome_modelo}</div>
                  <div className="text-amber-400 font-medium text-xs mt-0.5">{BRL(m.preco_base)}</div>
                </div>
              </div>
            ))}
          </div>

          <div className="mt-8 rounded-md border border-zinc-800 bg-zinc-900/40 p-4">
            {cfg.show_discount ? (
              <>
                <div className="flex items-center justify-between text-xs text-zinc-400">
                  <span>{cfg.subtotal_label}</span>
                  <span className="line-through">{BRL(subtotal)}</span>
                </div>
                <div className="flex items-center justify-between text-xs text-emerald-400 mt-1">
                  <span>{cfg.desconto_label} {combo.desconto_percentual}%</span>
                  <span>-{BRL(desconto)}</span>
                </div>
                <div className="border-t border-zinc-800 mt-3 pt-3 flex items-center justify-between">
                  <span className="text-zinc-400 text-sm">{cfg.total_label}</span>
                  <span className="text-2xl font-bold text-amber-400">{BRL(total)}</span>
                </div>
              </>
            ) : (
              <div className="flex items-center justify-between">
                <span className="text-zinc-400 text-sm">{cfg.total_label}</span>
                <span className="text-2xl font-bold text-amber-400">{BRL(total)}</span>
              </div>
            )}
          </div>
        </div>

        <div className="fixed bottom-0 left-0 right-0 bg-zinc-950/95 backdrop-blur border-t border-zinc-800 p-3 z-40">
          <div className="max-w-5xl mx-auto flex items-center gap-3">
            <div className="flex-1 min-w-0">
              <div className="text-[10px] text-zinc-500 uppercase tracking-wider">{cfg.total_sticky_label}</div>
              <div className="text-amber-400 font-bold truncate">{BRL(total)}</div>
            </div>
            <a href={waUrl(msg)} target="_blank" rel="noreferrer" className="flex-1 sm:flex-none inline-flex items-center justify-center gap-2 px-5 py-3 rounded-md font-bold text-sm bg-emerald-500 hover:bg-emerald-400 text-zinc-950">
              <MessageCircle size={18} /> {cfg.cta_cupom_label}
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
      <section className="max-w-3xl mx-auto px-4 pt-10 pb-6 text-center">
        {cfg.hero_eyebrow && <div className="text-[10px] text-zinc-600 tracking-[0.25em] uppercase mb-3">{cfg.hero_eyebrow}</div>}
        <h1 className="text-3xl sm:text-5xl font-light tracking-tight">{renderTitle(cfg.hero_title)}</h1>
        <p className="text-zinc-500 mt-4 max-w-md mx-auto text-sm">{cfg.hero_desc}</p>
      </section>

      {/* Ofertas por quantidade — lado a lado mobile-first */}
      <section className="max-w-4xl mx-auto px-4">
        <div className="mb-3">
          <span className="text-[10px] text-zinc-600 tracking-[0.25em] uppercase">{cfg.qty_eyebrow}</span>
        </div>
        <div
          className="grid gap-2"
          style={{ gridTemplateColumns: `repeat(${Math.max(qtyOptions.length, 1)}, minmax(0, 1fr))` }}
        >
          {qtyOptions.map(({ qty, discount }) => (
            <button
              key={qty}
              onClick={() => setMode({ kind: 'qty', qty, discount, slots: Array(qty).fill(null) })}
              className="group relative rounded-md border border-zinc-800 hover:border-amber-400/60 bg-zinc-900/40 p-3 sm:p-5 text-center transition active:scale-[0.98]"
            >
              {/* tactical corner */}
              <span className="absolute top-0 left-0 w-2 h-2 border-t border-l border-amber-400/40" />
              <span className="absolute bottom-0 right-0 w-2 h-2 border-b border-r border-amber-400/40" />
              <div className="text-3xl sm:text-4xl font-light leading-none">
                {qty}<span className="text-zinc-600 text-lg sm:text-2xl">×</span>
              </div>
              <div className="text-[9px] sm:text-[11px] text-zinc-500 mt-1 uppercase tracking-wider">{cfg.qty_unit_label}</div>
              {cfg.show_discount && (
                <div className="text-[10px] sm:text-xs text-amber-400 mt-2 sm:mt-3 font-medium">−{discount}%</div>
              )}
            </button>
          ))}
        </div>

        {/* Kit personalizado — destaque separado */}
        <a
          href={waUrl(cfg.custom_kit_message)}
          target="_blank"
          rel="noreferrer"
          className="mt-2 group relative rounded-md border border-zinc-800 hover:border-emerald-400/60 bg-zinc-900/40 p-3 flex items-center gap-3 transition active:scale-[0.99]"
        >
          <span className="absolute top-0 left-0 w-2 h-2 border-t border-l border-emerald-400/40" />
          <span className="absolute bottom-0 right-0 w-2 h-2 border-b border-r border-emerald-400/40" />
          <div className="text-2xl font-light text-emerald-400 leading-none w-10 text-center">{cfg.personalizado_qty_label}</div>
          <div className="flex-1">
            <div className="text-[9px] text-zinc-500 uppercase tracking-wider">{cfg.personalizado_sub_label}</div>
            <div className="text-xs text-zinc-300">Fale com a gente no WhatsApp</div>
          </div>
          <MessageCircle size={16} className="text-emerald-400" />
        </a>
      </section>

      {/* Combos prontos */}
      {combos.length > 0 && (
        <section className="max-w-4xl mx-auto px-4 mt-12">
          <div className="mb-3">
            <span className="text-[10px] text-zinc-600 tracking-[0.25em] uppercase">{cfg.combos_eyebrow}</span>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {combos.map((c) => {
              const items = c.modelo_ids.map((id) => modeloById[id]).filter(Boolean);
              const subtotal = items.reduce((s, m) => s + m.preco_base, 0);
              const total = cfg.show_discount ? subtotal - Math.round(subtotal * (c.desconto_percentual / 100)) : subtotal;
              return (
                <button
                  key={c.id}
                  onClick={() => setMode({ kind: 'combo', comboId: c.id })}
                  className="group relative rounded-md border border-zinc-800 hover:border-amber-400/60 bg-zinc-900/40 overflow-hidden text-left transition"
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
                    {cfg.show_discount && (
                      <div className="absolute top-2 right-2 px-1.5 py-0.5 text-[10px] font-medium text-amber-400 border border-amber-400/40 bg-zinc-950/70 rounded">
                        −{c.desconto_percentual}%
                      </div>
                    )}
                  </div>
                  <div className="p-3">
                    <div className="font-medium text-sm">{c.nome}</div>
                    {c.descricao && <div className="text-xs text-zinc-500 mt-0.5 line-clamp-1">{c.descricao}</div>}
                    <div className="flex items-baseline gap-2 mt-2">
                      {cfg.show_discount && <span className="text-[11px] text-zinc-600 line-through">{BRL(subtotal)}</span>}
                      <span className="text-amber-400 text-sm font-medium">{BRL(total)}</span>
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        </section>
      )}

      {/* Kits do Catálogo */}
      {kitsCatalogo.length > 0 && (
        <section className="max-w-4xl mx-auto px-4 mt-12">
          <div className="mb-3">
            <span className="text-[10px] text-zinc-600 tracking-[0.25em] uppercase">{cfg.catalogo_eyebrow}</span>
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
                  className="group relative rounded-md border border-zinc-800 hover:border-amber-400/60 bg-zinc-900/40 overflow-hidden text-left transition"
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

      <section className="max-w-3xl mx-auto px-4 mt-12 text-center">
        <div className="inline-flex items-center gap-2 text-[11px] text-zinc-600">
          <Shield size={11} className="text-amber-400/60" strokeWidth={1.5} />
          {cfg.footer_text}
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
          placeholder="Buscar lâmina..."
          className="flex-1 h-10 bg-zinc-900 border border-zinc-800 rounded-md px-3 text-sm text-zinc-100 placeholder:text-zinc-500"
        />
      </div>
      <div className="flex-1 overflow-y-auto p-3">
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2 max-w-5xl mx-auto">
          {filtered.map((m) => (
            <button
              key={m.id}
              onClick={() => onPick(m.id)}
              className="group relative aspect-[3/4] rounded-md border border-zinc-800 hover:border-amber-400 bg-zinc-900 overflow-hidden text-left"
            >
              {m.imagem_modelo && <img src={m.imagem_modelo} alt={m.nome_modelo} className="absolute inset-0 w-full h-full object-cover" />}
              <div className="absolute inset-0 bg-gradient-to-t from-zinc-950 via-zinc-950/30 to-transparent" />
              <div className="absolute bottom-0 left-0 right-0 p-2">
                <div className="text-[9px] uppercase text-zinc-400">{m.categoria}</div>
                <div className="font-semibold text-xs leading-tight line-clamp-2">{m.nome_modelo}</div>
                <div className="text-amber-400 font-medium text-xs mt-0.5">{BRL(m.preco_base)}</div>
              </div>
              <div className="absolute top-1.5 right-1.5 w-6 h-6 rounded-sm bg-zinc-950/80 border border-zinc-700 grid place-items-center text-zinc-400 group-hover:bg-amber-400 group-hover:text-zinc-950 transition">
                <Check size={12} />
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
