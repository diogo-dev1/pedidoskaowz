import { useEffect, useMemo, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Save, Plus, Trash2, Link2, Power, PowerOff, X, Check } from 'lucide-react';

interface Modelo {
  id: string;
  nome_modelo: string;
  preco_base: number;
  imagem_modelo: string | null;
  categoria: string | null;
}

interface Combo {
  id?: string;
  nome: string;
  descricao: string;
  modelo_ids: string[];
  desconto_percentual: number;
  imagem_url: string;
  ativo: boolean;
  ordem: number;
}

interface Cfg {
  whatsapp_phone: string;
  discount_by_qty: Record<string, number>;
  cupom_message: string;
  custom_kit_message: string;
  hero_eyebrow: string;
  hero_title: string;
  hero_desc: string;
  featured_kit_ids: string[];
}

const DEFAULT_CFG: Cfg = {
  whatsapp_phone: '5528999025695',
  discount_by_qty: { '2': 10, '3': 15 },
  cupom_message: 'Aproveite {pct}% de desconto montando seu Kit',
  custom_kit_message: 'Olá! Quero montar um Kit personalizado de lâminas.',
  hero_eyebrow: '— Kaowz Ferramentas de Corte —',
  hero_title: 'MONTE SEU {KIT}',
  hero_desc: 'Escolha quantas lâminas quer no seu Kit e ganhe descontos progressivos.',
  featured_kit_ids: [],
};


const BRL = (n: number) => n.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL', minimumFractionDigits: 0, maximumFractionDigits: 0 });

export default function MonteSeuKitLaminasAdmin() {
  const [cfg, setCfg] = useState<Cfg>(DEFAULT_CFG);
  const [modelos, setModelos] = useState<Modelo[]>([]);
  const [combos, setCombos] = useState<Combo[]>([]);
  const [saving, setSaving] = useState(false);
  const [pickerComboIdx, setPickerComboIdx] = useState<number | null>(null);

  useEffect(() => {
    (async () => {
      const [mRes, cRes, kRes] = await Promise.all([
        supabase.from('catalogo_modelos').select('id, nome_modelo, preco_base, imagem_modelo, categoria').eq('visivel_catalogo', true).order('nome_modelo'),
        supabase.from('kit_laminas_config').select('chave, valor'),
        supabase.from('kit_laminas_combos').select('*').order('ordem'),
      ]);
      if (mRes.data) setModelos(mRes.data as any);
      if (kRes.data) setCombos(kRes.data as any);
      if (cRes.data) {
        const map: any = { ...DEFAULT_CFG };
        for (const r of cRes.data) {
          if (r.chave === 'discount_by_qty') {
            try { map.discount_by_qty = JSON.parse(r.valor || '{}'); } catch {}
          } else if (r.chave === 'featured_kit_ids') {
            try { map.featured_kit_ids = JSON.parse(r.valor || '[]'); } catch {}
          } else { map[r.chave] = r.valor; }
        }
        setCfg(map);
      }
    })();
  }, []);


  const modeloById = useMemo(() => {
    const m: Record<string, Modelo> = {};
    modelos.forEach((x) => (m[x.id] = x));
    return m;
  }, [modelos]);

  const saveConfig = async () => {
    setSaving(true);
    const entries: { chave: string; valor: string }[] = [
      { chave: 'whatsapp_phone', valor: cfg.whatsapp_phone },
      { chave: 'discount_by_qty', valor: JSON.stringify(cfg.discount_by_qty) },
      { chave: 'cupom_message', valor: cfg.cupom_message },
      { chave: 'custom_kit_message', valor: cfg.custom_kit_message },
      { chave: 'hero_eyebrow', valor: cfg.hero_eyebrow },
      { chave: 'hero_title', valor: cfg.hero_title },
      { chave: 'hero_desc', valor: cfg.hero_desc },
      { chave: 'featured_kit_ids', valor: JSON.stringify(cfg.featured_kit_ids || []) },
    ];
    for (const e of entries) {
      await supabase.from('kit_laminas_config').upsert(e, { onConflict: 'chave' });
    }
    setSaving(false);
    toast.success('Configurações salvas');
  };

  const addCombo = () => {
    setCombos([...combos, {
      nome: 'Novo Kit',
      descricao: '',
      modelo_ids: [],
      desconto_percentual: 10,
      imagem_url: '',
      ativo: true,
      ordem: combos.length,
    }]);
  };

  const updateCombo = (i: number, patch: Partial<Combo>) => {
    setCombos(combos.map((c, idx) => idx === i ? { ...c, ...patch } : c));
  };

  const removeCombo = async (i: number) => {
    if (!confirm('Remover este Kit pronto?')) return;
    const c = combos[i];
    if (c.id) await supabase.from('kit_laminas_combos').delete().eq('id', c.id);
    setCombos(combos.filter((_, idx) => idx !== i));
    toast.success('Kit removido');
  };

  const saveCombo = async (i: number) => {
    const c = combos[i];
    if (!c.nome.trim()) return toast.error('Defina um nome');
    if (c.modelo_ids.length < 2) return toast.error('Selecione pelo menos 2 lâminas');
    const payload = { nome: c.nome, descricao: c.descricao || null, modelo_ids: c.modelo_ids, desconto_percentual: c.desconto_percentual, imagem_url: c.imagem_url || null, ativo: c.ativo, ordem: c.ordem };
    if (c.id) {
      await supabase.from('kit_laminas_combos').update(payload).eq('id', c.id);
    } else {
      const { data } = await supabase.from('kit_laminas_combos').insert(payload).select('*').single();
      if (data) updateCombo(i, { id: data.id });
    }
    toast.success('Kit salvo');
  };

  const toggleCombo = async (i: number) => {
    const c = combos[i];
    const ativo = !c.ativo;
    updateCombo(i, { ativo });
    if (c.id) await supabase.from('kit_laminas_combos').update({ ativo }).eq('id', c.id);
  };

  const copyLink = async () => {
    const url = `${window.location.origin}/monte-seu-kit`;
    await navigator.clipboard.writeText(url);
    toast.success('Link copiado', { description: url });
  };

  // Descontos por quantidade — array editável
  const qtyEntries = Object.entries(cfg.discount_by_qty).map(([q, d]) => ({ q, d })).sort((a, b) => Number(a.q) - Number(b.q));
  const setQtyEntry = (oldQ: string, newQ: string, d: number) => {
    const next = { ...cfg.discount_by_qty };
    delete next[oldQ];
    if (newQ) next[newQ] = d;
    setCfg({ ...cfg, discount_by_qty: next });
  };
  const removeQty = (q: string) => {
    const next = { ...cfg.discount_by_qty };
    delete next[q];
    setCfg({ ...cfg, discount_by_qty: next });
  };
  const addQty = () => {
    const next = { ...cfg.discount_by_qty };
    const newKey = String(Math.max(...Object.keys(next).map(Number), 1) + 1);
    next[newKey] = 5;
    setCfg({ ...cfg, discount_by_qty: next });
  };

  return (
    <div className="max-w-6xl mx-auto space-y-6 pb-12">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold">Monte seu Kit — Lâminas</h1>
          <p className="text-sm text-muted-foreground mt-1">Configure ofertas por quantidade, kits prontos e mensagens da página pública.</p>
        </div>
        <div className="flex gap-2 flex-wrap">
          <button onClick={copyLink} className="inline-flex items-center gap-2 px-3 py-2 text-sm border border-border rounded hover:bg-secondary">
            <Link2 size={14} /> Copiar link
          </button>
          <button onClick={saveConfig} disabled={saving} className="inline-flex items-center gap-2 px-4 py-2 text-sm bg-primary text-primary-foreground rounded hover:bg-primary/80 disabled:opacity-50">
            <Save size={14} /> {saving ? 'Salvando...' : 'Salvar configurações'}
          </button>
        </div>
      </div>

      {/* Textos / hero */}
      <section className="border border-border rounded-lg p-5 bg-card space-y-3">
        <h2 className="font-semibold">Textos da página</h2>
        <div className="grid sm:grid-cols-2 gap-3">
          <Field label="WhatsApp (55 + DDD + número)">
            <input value={cfg.whatsapp_phone} onChange={(e) => setCfg({ ...cfg, whatsapp_phone: e.target.value.replace(/\D/g, '') })} className="w-full h-10 px-3 rounded border border-border bg-background" />
          </Field>
          <Field label="Eyebrow (linha acima do título)">
            <input value={cfg.hero_eyebrow} onChange={(e) => setCfg({ ...cfg, hero_eyebrow: e.target.value })} className="w-full h-10 px-3 rounded border border-border bg-background" />
          </Field>
        </div>
        <Field label="Título principal (use {} para destacar em amarelo. Ex: MONTE SEU {KIT})">
          <input value={cfg.hero_title} onChange={(e) => setCfg({ ...cfg, hero_title: e.target.value })} className="w-full h-10 px-3 rounded border border-border bg-background" />
        </Field>
        <Field label="Descrição do hero">
          <textarea rows={2} value={cfg.hero_desc} onChange={(e) => setCfg({ ...cfg, hero_desc: e.target.value })} className="w-full p-3 rounded border border-border bg-background" />
        </Field>
        <Field label="Mensagem do cupom (use {pct} para o desconto)">
          <input value={cfg.cupom_message} onChange={(e) => setCfg({ ...cfg, cupom_message: e.target.value })} className="w-full h-10 px-3 rounded border border-border bg-background" />
        </Field>
        <Field label="Mensagem WhatsApp do Kit Personalizado">
          <textarea rows={2} value={cfg.custom_kit_message} onChange={(e) => setCfg({ ...cfg, custom_kit_message: e.target.value })} className="w-full p-3 rounded border border-border bg-background" />
        </Field>
      </section>

      {/* Descontos por quantidade */}
      <section className="border border-border rounded-lg p-5 bg-card">
        <div className="flex items-center justify-between mb-3">
          <div>
            <h2 className="font-semibold">Ofertas por Quantidade</h2>
            <p className="text-xs text-muted-foreground">Cards exibidos na home. Cliente monta o Kit escolhendo lâminas do catálogo.</p>
          </div>
          <button onClick={addQty} className="inline-flex items-center gap-1 text-sm px-3 py-1.5 border border-border rounded hover:bg-secondary">
            <Plus size={14} /> Adicionar
          </button>
        </div>
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {qtyEntries.map(({ q, d }) => (
            <div key={q} className="border border-border rounded-lg p-3 bg-background">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs text-muted-foreground">Quantidade</span>
                <button onClick={() => removeQty(q)} className="text-destructive hover:opacity-80"><Trash2 size={14} /></button>
              </div>
              <input type="number" min={2} value={q} onChange={(e) => setQtyEntry(q, e.target.value, d)} className="w-full h-9 px-2 rounded border border-border bg-background mb-2" />
              <span className="text-xs text-muted-foreground">Desconto (%)</span>
              <input type="number" min={0} max={100} value={d} onChange={(e) => setQtyEntry(q, q, Number(e.target.value) || 0)} className="w-full h-9 px-2 rounded border border-border bg-background mt-1" />
            </div>
          ))}
        </div>
      </section>

      {/* Combos fixos */}
      <section className="border border-border rounded-lg p-5 bg-card">
        <div className="flex items-center justify-between mb-3">
          <div>
            <h2 className="font-semibold">Kits Prontos (combos fixos)</h2>
            <p className="text-xs text-muted-foreground">Você define quais lâminas compõem cada Kit. Cliente só confirma.</p>
          </div>
          <button onClick={addCombo} className="inline-flex items-center gap-1 text-sm px-3 py-1.5 border border-border rounded hover:bg-secondary">
            <Plus size={14} /> Novo Kit
          </button>
        </div>
        <div className="space-y-3">
          {combos.map((c, i) => {
            const items = c.modelo_ids.map((id) => modeloById[id]).filter(Boolean);
            const subtotal = items.reduce((s, m) => s + m.preco_base, 0);
            const total = subtotal - Math.round(subtotal * (c.desconto_percentual / 100));
            return (
              <div key={i} className={`border rounded-lg p-4 ${c.ativo ? 'border-border bg-background' : 'border-border bg-muted/30 opacity-70'}`}>
                <div className="grid sm:grid-cols-2 gap-3 mb-3">
                  <Field label="Nome do Kit">
                    <input value={c.nome} onChange={(e) => updateCombo(i, { nome: e.target.value })} className="w-full h-10 px-3 rounded border border-border bg-background" />
                  </Field>
                  <Field label="Desconto (%)">
                    <input type="number" min={0} max={100} value={c.desconto_percentual} onChange={(e) => updateCombo(i, { desconto_percentual: Number(e.target.value) || 0 })} className="w-full h-10 px-3 rounded border border-border bg-background" />
                  </Field>
                </div>
                <Field label="Descrição (opcional)">
                  <textarea rows={2} value={c.descricao} onChange={(e) => updateCombo(i, { descricao: e.target.value })} className="w-full p-3 rounded border border-border bg-background" />
                </Field>
                <Field label="URL da imagem de capa (opcional — se vazio, mostra colagem das lâminas)">
                  <input value={c.imagem_url} onChange={(e) => updateCombo(i, { imagem_url: e.target.value })} className="w-full h-10 px-3 rounded border border-border bg-background" />
                </Field>

                <div className="mt-3">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-medium">Lâminas do Kit ({c.modelo_ids.length})</span>
                    <button onClick={() => setPickerComboIdx(i)} className="text-xs px-2 py-1 border border-border rounded hover:bg-secondary">Editar seleção</button>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {items.map((m) => (
                      <span key={m.id} className="inline-flex items-center gap-1 px-2 py-1 rounded bg-secondary text-xs">
                        {m.nome_modelo} <span className="text-muted-foreground">{BRL(m.preco_base)}</span>
                      </span>
                    ))}
                    {items.length === 0 && <span className="text-xs text-muted-foreground">Nenhuma lâmina selecionada</span>}
                  </div>
                </div>

                {items.length > 0 && (
                  <div className="mt-3 text-xs text-muted-foreground">
                    Subtotal: <span className="line-through">{BRL(subtotal)}</span> · Total final: <span className="text-foreground font-semibold">{BRL(total)}</span>
                  </div>
                )}

                <div className="flex flex-wrap gap-2 mt-4">
                  <button onClick={() => saveCombo(i)} className="inline-flex items-center gap-1 px-3 py-1.5 text-sm bg-primary text-primary-foreground rounded hover:bg-primary/80">
                    <Save size={14} /> Salvar
                  </button>
                  <button onClick={() => toggleCombo(i)} className="inline-flex items-center gap-1 px-3 py-1.5 text-sm border border-border rounded hover:bg-secondary">
                    {c.ativo ? <><PowerOff size={14} /> Desativar</> : <><Power size={14} /> Ativar</>}
                  </button>
                  <button onClick={() => removeCombo(i)} className="inline-flex items-center gap-1 px-3 py-1.5 text-sm text-destructive border border-destructive/30 rounded hover:bg-destructive/10 ml-auto">
                    <Trash2 size={14} /> Remover
                  </button>
                </div>
              </div>
            );
          })}
          {combos.length === 0 && <div className="text-sm text-muted-foreground text-center py-6">Nenhum Kit pronto criado ainda.</div>}
        </div>
      </section>

      {pickerComboIdx !== null && (
        <ModeloPickerModal
          modelos={modelos}
          selected={combos[pickerComboIdx].modelo_ids}
          onClose={() => setPickerComboIdx(null)}
          onConfirm={(ids) => { updateCombo(pickerComboIdx, { modelo_ids: ids }); setPickerComboIdx(null); }}
        />
      )}
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="text-sm font-medium block mb-1">{label}</span>
      {children}
    </label>
  );
}

function ModeloPickerModal({ modelos, selected, onClose, onConfirm }: { modelos: Modelo[]; selected: string[]; onClose: () => void; onConfirm: (ids: string[]) => void }) {
  const [sel, setSel] = useState<string[]>(selected);
  const [q, setQ] = useState('');
  const toggle = (id: string) => setSel(sel.includes(id) ? sel.filter((x) => x !== id) : [...sel, id]);
  const filtered = modelos.filter((m) => m.nome_modelo.toLowerCase().includes(q.toLowerCase()) || (m.categoria || '').toLowerCase().includes(q.toLowerCase()));
  return (
    <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur p-3 sm:p-6 flex flex-col">
      <div className="bg-card border border-border rounded-lg flex flex-col flex-1 overflow-hidden max-w-4xl mx-auto w-full">
        <div className="p-3 border-b border-border flex items-center gap-3">
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Buscar..." className="flex-1 h-10 px-3 rounded border border-border bg-background text-sm" />
          <span className="text-xs text-muted-foreground">{sel.length} selecionadas</span>
          <button onClick={onClose} className="p-2 hover:bg-secondary rounded"><X size={16} /></button>
        </div>
        <div className="flex-1 overflow-y-auto p-3">
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2">
            {filtered.map((m) => {
              const isSel = sel.includes(m.id);
              return (
                <button key={m.id} onClick={() => toggle(m.id)} className={`relative aspect-[3/4] rounded-lg overflow-hidden border-2 text-left ${isSel ? 'border-primary' : 'border-border'}`}>
                  {m.imagem_modelo && <img src={m.imagem_modelo} alt={m.nome_modelo} className="absolute inset-0 w-full h-full object-cover" />}
                  <div className="absolute inset-0 bg-gradient-to-t from-black via-black/30 to-transparent" />
                  <div className="absolute bottom-0 left-0 right-0 p-2 text-white">
                    <div className="text-[10px] uppercase opacity-70">{m.categoria}</div>
                    <div className="text-xs font-bold leading-tight">{m.nome_modelo}</div>
                    <div className="text-xs text-amber-300 mt-1">{BRL(m.preco_base)}</div>
                  </div>
                  {isSel && <div className="absolute top-2 right-2 w-6 h-6 rounded-full bg-primary text-primary-foreground grid place-items-center"><Check size={14} /></div>}
                </button>
              );
            })}
          </div>
        </div>
        <div className="p-3 border-t border-border flex justify-end gap-2">
          <button onClick={onClose} className="px-4 py-2 text-sm border border-border rounded">Cancelar</button>
          <button onClick={() => onConfirm(sel)} className="px-4 py-2 text-sm bg-primary text-primary-foreground rounded">Confirmar ({sel.length})</button>
        </div>
      </div>
    </div>
  );
}
