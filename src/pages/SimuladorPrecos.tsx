import { useMemo, useState, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import { Calculator, Plus, Trash2, Copy, MessageCircle, Search, X, ChevronDown, ChevronUp, Check } from 'lucide-react';
import { toast } from 'sonner';

type Tamanho = 'P' | 'M' | 'G' | '-';
interface Modelo { nome: string; tamanho: Tamanho; preco: number | null; }
interface Componente { nome: string; preco: number; }

const MODELOS: Modelo[] = [
  { nome: 'Edc - Mini', tamanho: 'P', preco: 590 },
  { nome: 'Edc', tamanho: 'P', preco: 655 },
  { nome: 'Edc Ring', tamanho: 'P', preco: 685 },
  { nome: 'Edc Ring Tanto', tamanho: 'P', preco: 685 },
  { nome: 'Edc Mini Tanto', tamanho: 'P', preco: 590 },
  { nome: 'Edc Mini Wharncliffe', tamanho: 'P', preco: 590 },
  { nome: 'Edc Wharncliffe', tamanho: 'P', preco: 655 },
  { nome: 'Adaga Edc', tamanho: 'P', preco: 685 },
  { nome: 'Push Dagger SVK G10', tamanho: 'P', preco: 935 },
  { nome: 'Adaga Full Size', tamanho: 'M', preco: 800 },
  { nome: 'Jagunço', tamanho: 'M', preco: 760 },
  { nome: 'Kzr Nimbus', tamanho: 'M', preco: 720 },
  { nome: 'Kzr Elite - Knight', tamanho: 'M', preco: 780 },
  { nome: 'Kzr Full Size', tamanho: 'G', preco: 715 },
  { nome: 'Camp', tamanho: 'G', preco: 800 },
  { nome: 'Kzr Nimbowie', tamanho: 'G', preco: 1185 },
  { nome: 'Kzr Big Nimbowie', tamanho: 'G', preco: 1575 },
  { nome: 'Picanheira 9"', tamanho: 'G', preco: 525 },
  { nome: 'Picanheira 10"', tamanho: 'G', preco: 685 },
  { nome: 'Garfo 10"', tamanho: 'G', preco: 370 },
  { nome: 'Garfo 8"', tamanho: 'G', preco: 325 },
  { nome: 'Butcher', tamanho: 'G', preco: 660 },
  { nome: 'Chef Royal', tamanho: 'G', preco: 660 },
  { nome: 'Kiritsuke 8,5"', tamanho: 'G', preco: 575 },
  { nome: 'Kiritsuke 10"', tamanho: 'G', preco: 710 },
  { nome: 'Chaira 10"', tamanho: '-', preco: 350 },
  { nome: 'Chaira 8"', tamanho: '-', preco: 300 },
  { nome: 'Shank', tamanho: 'P', preco: null },
  { nome: 'Shiv', tamanho: 'P', preco: null },
  { nome: 'Karambit', tamanho: 'P', preco: null },
];

const ACOS: Record<string, Componente[]> = {
  P: [{ nome: 'Sandvik 14C28N', preco: 165 }, { nome: '52100', preco: 165 }],
  M: [{ nome: 'Sandvik 14C28N', preco: 245 }, { nome: '52100', preco: 245 }],
  G: [{ nome: 'Sandvik 14C28N', preco: 350 }, { nome: '52100', preco: 350 }],
};
const EMPUNHADURAS: Record<string, Componente[]> = {
  P: [{ nome: 'G10', preco: 115 }, { nome: 'Espaçador', preco: 70 }, { nome: 'Imbuia', preco: 80 }],
  M: [{ nome: 'G10', preco: 145 }, { nome: 'Imbuia', preco: 100 }],
  G: [{ nome: 'G10', preco: 145 }, { nome: 'Espaçador', preco: 90 }, { nome: 'Imbuia', preco: 100 }],
};
const ACABAMENTOS: Record<string, Componente[]> = {
  P: [{ nome: 'Acetinado', preco: 0 }, { nome: 'Stone Washed', preco: 25 }, { nome: 'Tactical', preco: 90 }],
  M: [{ nome: 'Acetinado', preco: 0 }, { nome: 'Stone Washed', preco: 25 }, { nome: 'Tactical', preco: 90 }],
  G: [{ nome: 'Acetinado', preco: 0 }, { nome: 'Stone Washed', preco: 35 }, { nome: 'Tactical', preco: 125 }],
};
const BAINHAS: Record<string, Componente[]> = {
  P: [{ nome: 'Preta (inclusa)', preco: 0 }, { nome: 'Colorida', preco: 195 }, { nome: 'Adicional', preco: 195 }],
  M: [{ nome: 'Preta (inclusa)', preco: 0 }, { nome: 'Colorida', preco: 195 }, { nome: 'Adicional', preco: 195 }],
  G: [{ nome: 'Preta (inclusa)', preco: 0 }, { nome: 'Colorida', preco: 250 }, { nome: 'Adicional', preco: 250 }],
};
const OPCIONAIS: Record<string, { nome: string; preco: number }[]> = {
  P: [{ nome: 'Dragon Scale', preco: 70 }, { nome: 'Brute Forge', preco: 125 }],
  M: [{ nome: 'Dragon Scale', preco: 70 }, { nome: 'Brute Forge', preco: 125 }],
  G: [{ nome: 'Dragon Scale', preco: 70 }, { nome: 'Brute Forge', preco: 300 }],
};

const ADICIONAIS: Componente[] = [
  { nome: 'Strop', preco: 95 }, { nome: 'Café', preco: 45 }, { nome: 'Clipe Extra', preco: 25 },
  { nome: 'Clipe Lateral', preco: 75 }, { nome: 'Patch Fluorescente', preco: 55 }, { nome: 'Patch Cão Pastor', preco: 45 },
  { nome: 'Patch K', preco: 35 }, { nome: 'BC Churrasco', preco: 200 }, { nome: 'BC Churrasco Dupla', preco: 270 },
  { nome: 'BC Churrasco Tripla', preco: 370 }, { nome: 'Passador de Couro', preco: 95 }, { nome: 'Bainha Couro EDC', preco: 200 },
  { nome: 'Bainha Couro Camp', preco: 350 }, { nome: 'Bainha Couro Jagunço', preco: 290 },
  { nome: 'Boné', preco: 75 }, { nome: 'Camisa Kaowz', preco: 170 }, { nome: 'Moletom', preco: 240 },
];

const BRL = (n: number) => n.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL', minimumFractionDigits: 2 });
const TAM_DOT: Record<Tamanho, string> = { P: 'bg-sky-500', M: 'bg-amber-500', G: 'bg-rose-500', '-': 'bg-zinc-400' };

interface Config {
  id: string;
  modeloIdx: number | null;
  acoIdx: number | null;
  empunhaduraIdx: number | null;
  acabamentoIdx: number | null;
  bainhaIdx: number | null;
  opcionais: Set<number>;
  adicionais: Set<number>;
}

function newConfig(): Config {
  return { id: crypto.randomUUID(), modeloIdx: null, acoIdx: null, empunhaduraIdx: null, acabamentoIdx: null, bainhaIdx: null, opcionais: new Set(), adicionais: new Set() };
}

function calcTotal(cfg: Config): number {
  let t = 0;
  const m = cfg.modeloIdx !== null ? MODELOS[cfg.modeloIdx] : null;
  if (m?.preco) t += m.preco;
  const s = m?.tamanho === '-' ? 'P' : (m?.tamanho || 'P');
  if (cfg.acoIdx !== null) t += ACOS[s]?.[cfg.acoIdx]?.preco ?? 0;
  if (cfg.empunhaduraIdx !== null) t += EMPUNHADURAS[s]?.[cfg.empunhaduraIdx]?.preco ?? 0;
  if (cfg.acabamentoIdx !== null) t += ACABAMENTOS[s]?.[cfg.acabamentoIdx]?.preco ?? 0;
  if (cfg.bainhaIdx !== null) t += BAINHAS[s]?.[cfg.bainhaIdx]?.preco ?? 0;
  cfg.opcionais.forEach((i) => { t += OPCIONAIS[s]?.[i]?.preco ?? 0; });
  cfg.adicionais.forEach((i) => { t += ADICIONAIS[i]?.preco ?? 0; });
  return t;
}

/* ── Chip de opção (inline, toque único) ── */
function Chip({ label, price, selected, onClick }: { label: string; price: number; selected: boolean; onClick: () => void }) {
  return (
    <button type="button" onClick={onClick}
      className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium border transition-all whitespace-nowrap
        ${selected ? 'border-primary bg-primary text-primary-foreground shadow-sm' : 'border-border bg-background hover:bg-muted active:scale-95'}`}>
      {label}
      <span className={`${selected ? 'text-primary-foreground/80' : 'text-muted-foreground'}`}>
        {price === 0 ? '✓' : `+${BRL(price)}`}
      </span>
    </button>
  );
}

/* ── Seção colapsável com contagem ── */
function OptSection({ title, step, done, children }: { title: string; step: number; done: boolean; children: React.ReactNode }) {
  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2">
        <span className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold flex-shrink-0 ${done ? 'bg-green-500 text-white' : 'bg-muted text-muted-foreground'}`}>
          {done ? <Check className="w-3 h-3" /> : step}
        </span>
        <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">{title}</span>
      </div>
      {children}
    </div>
  );
}

/* ── Search de modelos ── */
function ModeloSearch({ onSelect, currentIdx }: { onSelect: (idx: number) => void; currentIdx: number | null }) {
  const [query, setQuery] = useState('');
  const [open, setOpen] = useState(currentIdx === null);
  const inputRef = useRef<HTMLInputElement>(null);
  const selected = currentIdx !== null ? MODELOS[currentIdx] : null;

  useEffect(() => {
    if (open && inputRef.current) inputRef.current.focus();
  }, [open]);

  const filtered = useMemo(() => {
    if (!query.trim()) return MODELOS.map((m, i) => ({ m, i })).filter(({ m }) => m.preco !== null);
    const q = query.toLowerCase();
    return MODELOS.map((m, i) => ({ m, i })).filter(({ m }) => m.preco !== null && m.nome.toLowerCase().includes(q));
  }, [query]);

  if (!open && selected) {
    return (
      <button type="button" onClick={() => { setOpen(true); setQuery(''); }}
        className="w-full flex items-center gap-3 p-3 rounded-xl border border-primary/30 bg-primary/5 transition hover:bg-primary/10 active:scale-[0.99]">
        <span className={`w-2.5 h-2.5 rounded-full flex-shrink-0 ${TAM_DOT[selected.tamanho]}`} />
        <span className="flex-1 text-left font-semibold text-sm">{selected.nome}</span>
        <span className="text-sm font-bold text-primary">{BRL(selected.preco!)}</span>
        <ChevronDown className="w-4 h-4 text-muted-foreground" />
      </button>
    );
  }

  return (
    <div className="space-y-2">
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          ref={inputRef}
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Buscar modelo..."
          className="pl-9 pr-9 h-11"
        />
        {(query || selected) && (
          <button type="button" onClick={() => { setQuery(''); if (selected) setOpen(false); }}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
            <X className="w-4 h-4" />
          </button>
        )}
      </div>
      <div className="max-h-60 overflow-y-auto rounded-lg border divide-y">
        {filtered.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-6">Nenhum modelo encontrado</p>
        ) : (
          filtered.map(({ m, i }) => (
            <button key={i} type="button"
              onClick={() => { onSelect(i); setOpen(false); setQuery(''); }}
              className={`w-full flex items-center gap-3 px-3 py-2.5 text-left transition hover:bg-muted/60 active:bg-muted
                ${currentIdx === i ? 'bg-primary/5' : ''}`}>
              <span className={`w-2 h-2 rounded-full flex-shrink-0 ${TAM_DOT[m.tamanho]}`} />
              <span className="flex-1 text-sm font-medium truncate">{m.nome}</span>
              <span className="text-xs text-muted-foreground font-semibold flex-shrink-0">{m.tamanho}</span>
              <span className="text-xs font-bold text-primary flex-shrink-0">{BRL(m.preco!)}</span>
            </button>
          ))
        )}
      </div>
    </div>
  );
}

/* ── Card de configuração ── */
function ConfigCard({ cfg, onChange, onRemove, index, expanded, onToggle }: {
  cfg: Config; onChange: (c: Config) => void; onRemove: () => void; index: number; expanded: boolean; onToggle: () => void;
}) {
  const modelo = cfg.modeloIdx !== null ? MODELOS[cfg.modeloIdx] : null;
  const tam = modelo?.tamanho === '-' ? 'P' : (modelo?.tamanho || 'P');
  const total = calcTotal(cfg);
  const acos = ACOS[tam] || [];
  const emps = EMPUNHADURAS[tam] || [];
  const acabs = ACABAMENTOS[tam] || [];
  const bainhas = BAINHAS[tam] || [];

  const opcionais = OPCIONAIS[tam] || [];
  const specs = [
    cfg.acoIdx !== null ? acos[cfg.acoIdx]?.nome : null,
    cfg.empunhaduraIdx !== null ? emps[cfg.empunhaduraIdx]?.nome : null,
    cfg.acabamentoIdx !== null ? acabs[cfg.acabamentoIdx]?.nome : null,
    ...[...cfg.opcionais].map((i) => opcionais[i]?.nome).filter(Boolean),
  ].filter(Boolean);

  const [showAdicionais, setShowAdicionais] = useState(false);

  return (
    <div className="rounded-2xl border bg-card overflow-hidden shadow-sm">
      {/* Header */}
      <button type="button" onClick={onToggle}
        className="w-full flex items-center gap-3 p-4 hover:bg-muted/30 transition-colors active:bg-muted/50">
        <span className="w-8 h-8 rounded-xl bg-primary text-primary-foreground flex items-center justify-center text-sm font-bold flex-shrink-0">
          {index + 1}
        </span>
        <div className="flex-1 text-left min-w-0">
          <p className="font-semibold text-sm truncate">{modelo ? modelo.nome : 'Nova faca'}</p>
          {specs.length > 0 && <p className="text-[11px] text-muted-foreground truncate">{specs.join(' · ')}</p>}
        </div>
        {modelo && modelo.preco !== null && <span className="text-base font-bold text-primary flex-shrink-0">{BRL(total)}</span>}
        {expanded ? <ChevronUp className="w-4 h-4 text-muted-foreground" /> : <ChevronDown className="w-4 h-4 text-muted-foreground" />}
      </button>

      {expanded && (
        <div className="px-4 pb-4 space-y-5 border-t pt-4">
          {/* 1. Modelo (search) */}
          <OptSection title="Modelo" step={1} done={cfg.modeloIdx !== null}>
            <ModeloSearch
              currentIdx={cfg.modeloIdx}
              onSelect={(i) => onChange({ ...cfg, modeloIdx: i, acoIdx: null, empunhaduraIdx: null, acabamentoIdx: null, bainhaIdx: null, opcionais: new Set() })}
            />
          </OptSection>

          {modelo && modelo.preco !== null && (
            <>
              {/* 2. Aço */}
              {acos.length > 0 && (
                <OptSection title="Aço" step={2} done={cfg.acoIdx !== null}>
                  <div className="flex flex-wrap gap-1.5">
                    {acos.map((a, i) => <Chip key={i} label={a.nome} price={a.preco} selected={cfg.acoIdx === i} onClick={() => onChange({ ...cfg, acoIdx: i })} />)}
                  </div>
                </OptSection>
              )}

              {/* 3. Empunhadura */}
              {emps.length > 0 && (
                <OptSection title="Empunhadura" step={3} done={cfg.empunhaduraIdx !== null}>
                  <div className="flex flex-wrap gap-1.5">
                    {emps.map((e, i) => <Chip key={i} label={e.nome} price={e.preco} selected={cfg.empunhaduraIdx === i} onClick={() => onChange({ ...cfg, empunhaduraIdx: i })} />)}
                  </div>
                </OptSection>
              )}

              {/* 4. Acabamento */}
              {acabs.length > 0 && (
                <OptSection title="Acabamento" step={4} done={cfg.acabamentoIdx !== null}>
                  <div className="flex flex-wrap gap-1.5">
                    {acabs.map((a, i) => <Chip key={i} label={a.nome} price={a.preco} selected={cfg.acabamentoIdx === i} onClick={() => onChange({ ...cfg, acabamentoIdx: i })} />)}
                  </div>
                </OptSection>
              )}

              {/* 5. Opcionais (Dragon Scale / Brute Forge) */}
              {(OPCIONAIS[tam] || []).length > 0 && (
                <OptSection title="Opcionais" step={5} done={cfg.opcionais.size > 0}>
                  <div className="flex flex-wrap gap-1.5">
                    {(OPCIONAIS[tam] || []).map((o, i) => {
                      const on = cfg.opcionais.has(i);
                      return (
                        <button key={i} type="button"
                          onClick={() => { const s = new Set(cfg.opcionais); if (on) s.delete(i); else s.add(i); onChange({ ...cfg, opcionais: s }); }}
                          className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium border transition-all whitespace-nowrap
                            ${on ? 'border-primary bg-primary text-primary-foreground shadow-sm' : 'border-border bg-background hover:bg-muted active:scale-95'}`}>
                          {o.nome}
                          <span className={on ? 'text-primary-foreground/80' : 'text-muted-foreground'}>+{BRL(o.preco)}</span>
                        </button>
                      );
                    })}
                  </div>
                </OptSection>
              )}

              {/* 6. Bainha */}
              {bainhas.length > 0 && (
                <OptSection title="Bainha" step={6} done={cfg.bainhaIdx !== null}>
                  <div className="flex flex-wrap gap-1.5">
                    {bainhas.map((b, i) => <Chip key={i} label={b.nome} price={b.preco} selected={cfg.bainhaIdx === i} onClick={() => onChange({ ...cfg, bainhaIdx: i })} />)}
                  </div>
                </OptSection>
              )}

              {/* 7. Adicionais (colapsável) */}
              <OptSection title="Adicionais" step={7} done={cfg.adicionais.size > 0}>
                <button type="button" onClick={() => setShowAdicionais(!showAdicionais)}
                  className="flex items-center gap-2 text-xs text-primary font-medium hover:underline">
                  {showAdicionais ? 'Ocultar' : `Ver ${ADICIONAIS.length} opções`}
                  {cfg.adicionais.size > 0 && <span className="bg-primary text-primary-foreground text-[10px] font-bold px-1.5 py-0.5 rounded-full">{cfg.adicionais.size}</span>}
                  {showAdicionais ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                </button>
                {showAdicionais && (
                  <div className="space-y-1 mt-1">
                    {ADICIONAIS.map((a, i) => {
                      const on = cfg.adicionais.has(i);
                      return (
                        <label key={i} className={`flex items-center gap-3 px-3 py-2 rounded-lg border cursor-pointer transition-all ${on ? 'border-primary bg-primary/5' : 'border-transparent hover:bg-muted/40'}`}>
                          <Checkbox checked={on} onCheckedChange={(v) => { const s = new Set(cfg.adicionais); if (v) s.add(i); else s.delete(i); onChange({ ...cfg, adicionais: s }); }} />
                          <span className={`flex-1 text-sm ${on ? 'font-medium' : ''}`}>{a.nome}</span>
                          <span className={`text-xs font-semibold ${on ? 'text-primary' : 'text-muted-foreground'}`}>{BRL(a.preco)}</span>
                        </label>
                      );
                    })}
                  </div>
                )}
              </OptSection>

              {/* Subtotal */}
              <div className="flex items-center justify-between p-3 rounded-xl bg-primary/5 border border-primary/15">
                <span className="text-sm font-medium">Subtotal</span>
                <span className="text-lg font-bold text-primary">{BRL(total)}</span>
              </div>
            </>
          )}

          <button type="button" onClick={onRemove}
            className="flex items-center justify-center gap-2 w-full py-2 text-xs text-muted-foreground hover:text-destructive transition-colors">
            <Trash2 className="w-3.5 h-3.5" /> Remover
          </button>
        </div>
      )}
    </div>
  );
}

/* ── Página ── */
export default function SimuladorPrecos() {
  const [configs, setConfigs] = useState<Config[]>([newConfig()]);
  const [expandedId, setExpandedId] = useState<string | null>(configs[0]?.id ?? null);

  const addConfig = () => { const c = newConfig(); setConfigs((p) => [...p, c]); setExpandedId(c.id); };
  const removeConfig = (id: string) => setConfigs((p) => { if (p.length <= 1) return p; const n = p.filter((c) => c.id !== id); if (expandedId === id) setExpandedId(n[0]?.id ?? null); return n; });
  const updateConfig = (id: string, u: Config) => setConfigs((p) => p.map((c) => c.id === id ? u : c));
  const totalGeral = useMemo(() => configs.reduce((s, c) => s + calcTotal(c), 0), [configs]);

  const gerarTexto = () => {
    const l: string[] = ['*Simulação — Kaowz Facas*', ''];
    configs.forEach((cfg, idx) => {
      const m = cfg.modeloIdx !== null ? MODELOS[cfg.modeloIdx] : null;
      if (!m || m.preco === null) return;
      const t = m.tamanho === '-' ? 'P' : m.tamanho;
      l.push(`*${idx + 1}. ${m.nome}*`);
      if (cfg.acoIdx !== null) l.push(`   Aço: ${ACOS[t]?.[cfg.acoIdx]?.nome}`);
      if (cfg.empunhaduraIdx !== null) l.push(`   Empunhadura: ${EMPUNHADURAS[t]?.[cfg.empunhaduraIdx]?.nome}`);
      if (cfg.acabamentoIdx !== null) l.push(`   Acabamento: ${ACABAMENTOS[t]?.[cfg.acabamentoIdx]?.nome}`);
      cfg.opcionais.forEach((i) => { const o = OPCIONAIS[t]?.[i]; if (o) l.push(`   + ${o.nome}`); });
      if (cfg.bainhaIdx !== null) { const b = BAINHAS[t]?.[cfg.bainhaIdx]; if (b?.preco) l.push(`   Bainha: ${b.nome}`); }
      cfg.adicionais.forEach((i) => l.push(`   + ${ADICIONAIS[i]?.nome}`));
      l.push(`   *${BRL(calcTotal(cfg))}*`);
      l.push('');
    });
    if (configs.length > 1) l.push(`*Total: ${BRL(totalGeral)}*`);
    return l.join('\n');
  };

  return (
    <div className="max-w-lg mx-auto py-4 px-4 space-y-3 pb-28">
      <div className="flex items-center gap-3 mb-1">
        <Calculator className="h-5 w-5 text-primary" />
        <h1 className="text-lg font-bold">Simulador de Preços</h1>
      </div>

      <div className="space-y-3">
        {configs.map((cfg, idx) => (
          <ConfigCard key={cfg.id} cfg={cfg} index={idx}
            onChange={(u) => updateConfig(cfg.id, u)}
            onRemove={() => removeConfig(cfg.id)}
            expanded={expandedId === cfg.id}
            onToggle={() => setExpandedId(expandedId === cfg.id ? null : cfg.id)} />
        ))}
      </div>

      <Button variant="outline" className="w-full gap-2 rounded-xl h-11" onClick={addConfig}>
        <Plus className="h-4 w-4" /> Adicionar outra faca
      </Button>

      {/* Footer fixo */}
      <div className="fixed bottom-0 left-0 right-0 bg-background/95 backdrop-blur-lg border-t z-50">
        <div className="max-w-lg mx-auto flex items-center gap-3 px-4 py-3">
          <div className="flex-1 min-w-0">
            <p className="text-[10px] text-muted-foreground uppercase tracking-wider leading-tight">
              {configs.length} {configs.length === 1 ? 'faca' : 'facas'}
            </p>
            <p className="text-xl font-bold text-primary leading-tight">{BRL(totalGeral)}</p>
          </div>
          <Button variant="outline" size="icon" className="h-10 w-10 rounded-xl flex-shrink-0"
            onClick={async () => { try { await navigator.clipboard.writeText(gerarTexto()); toast.success('Copiado!'); } catch { toast.error('Erro ao copiar'); } }}>
            <Copy className="h-4 w-4" />
          </Button>
          <Button className="gap-2 h-10 rounded-xl flex-shrink-0"
            onClick={() => window.open(`https://wa.me/?text=${encodeURIComponent(gerarTexto())}`, '_blank')}>
            <MessageCircle className="h-4 w-4" /> WhatsApp
          </Button>
        </div>
      </div>
    </div>
  );
}
