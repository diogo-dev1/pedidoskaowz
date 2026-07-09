import { useMemo, useState, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import {
  Calculator, Plus, Trash2, Copy, MessageCircle, Search, X,
  ChevronDown, ChevronUp, Check, CopyPlus, Send,
} from 'lucide-react';
import { toast } from 'sonner';
import { useAuth } from '@/contexts/AuthContext';

/* ════════════════════════════════════════════════════════════════
   DADOS — espelham a planilha "Lista de Valores" (Página1).
   Valor base do modelo = Aço Inox + Empunhadura Grafite inclusos.
   Regra de classe: M usa os valores de P quando não há preço M
   explícito; G cai para M e depois P quando não há preço G.
   ════════════════════════════════════════════════════════════════ */

type Tamanho = 'P' | 'M' | 'G' | '-';
type Classe = 'P' | 'M' | 'G';
interface Precos { P?: number; M?: number; G?: number }
// Campos sem valor na planilha entram como R$ 0,00 (regra do negócio)
interface Modelo { nome: string; tamanho: Tamanho; preco: number }
interface Opcao { nome: string; precos: Precos; incluso?: boolean }

/** Regra da planilha: classe M usa P quando não definida; G cai para M→P. */
function precoClasse(p: Precos, c: Classe): number {
  if (c === 'P') return p.P ?? 0;
  if (c === 'M') return p.M ?? p.P ?? 0;
  return p.G ?? p.M ?? p.P ?? 0;
}

const MODELOS: Modelo[] = [
  // ── P ──
  { nome: 'Edc - Mini', tamanho: 'P', preco: 0 },
  { nome: 'Edc Mini Reverse Tanto', tamanho: 'P', preco: 0 },
  { nome: 'Edc', tamanho: 'P', preco: 0 },
  { nome: 'Edc Reverse Tanto', tamanho: 'P', preco: 0 },
  { nome: 'Edc Tanto', tamanho: 'P', preco: 0 },
  { nome: 'Edc Ring', tamanho: 'P', preco: 610 },
  { nome: 'Edc Ring Tanto', tamanho: 'P', preco: 685 },
  { nome: 'Edc Mini Tanto', tamanho: 'P', preco: 595 },
  { nome: 'Edc Mini Wharncliffe', tamanho: 'P', preco: 590 },
  { nome: 'Edc Wharncliffe', tamanho: 'P', preco: 655 },
  { nome: 'Ring Tanto', tamanho: 'P', preco: 590 },
  { nome: 'Wharncliffe', tamanho: 'P', preco: 585 },
  { nome: 'Adaga Edc', tamanho: 'P', preco: 795 },
  { nome: 'Push Dagger Standard', tamanho: 'P', preco: 610 },
  { nome: 'Push Dagger Compact', tamanho: 'P', preco: 470 },
  { nome: 'Push Dagger Micro', tamanho: 'P', preco: 340 },
  { nome: 'Shank', tamanho: 'P', preco: 0 },
  { nome: 'Shiv', tamanho: 'P', preco: 0 },
  { nome: 'Karambit', tamanho: 'P', preco: 0 },
  // ── M ──
  { nome: 'Adaga Full Size', tamanho: 'M', preco: 795 },
  { nome: 'Jagunço', tamanho: 'M', preco: 760 },
  { nome: 'Jagunço Tanto', tamanho: 'M', preco: 830 },
  { nome: 'Kzr Nimbus', tamanho: 'M', preco: 720 },
  { nome: 'Kzr Nimbus Tanto', tamanho: 'M', preco: 785 },
  { nome: 'Kzr Elite Knight', tamanho: 'M', preco: 780 },
  { nome: 'Defcon 1', tamanho: 'M', preco: 985 },
  { nome: 'Defcon 2', tamanho: 'M', preco: 995 },
  { nome: 'Mini Camp', tamanho: 'M', preco: 0 },
  // ── G ──
  { nome: 'Kzr Full Size', tamanho: 'G', preco: 715 },
  { nome: 'Camp', tamanho: 'G', preco: 800 },
  { nome: 'Kzr Nimbowie', tamanho: 'G', preco: 1185 },
  { nome: 'Big Camp', tamanho: 'G', preco: 0 },
  { nome: 'Big Camp 40 cm', tamanho: 'G', preco: 0 },
  { nome: 'Kzr Big Nimbowie', tamanho: 'G', preco: 1575 },
  { nome: 'Kzr Big Nimbowie 40 cm', tamanho: 'G', preco: 0 },
  { nome: 'Picanheira 9"', tamanho: 'G', preco: 525 },
  { nome: 'Picanheira 10"', tamanho: 'G', preco: 685 },
  { nome: 'Garfo 10"', tamanho: 'G', preco: 370 },
  { nome: 'Garfo 8"', tamanho: 'G', preco: 325 },
  { nome: 'Butcher', tamanho: 'G', preco: 660 },
  { nome: 'Chef Royal', tamanho: 'G', preco: 660 },
  { nome: 'Kiritsuke 8,5"', tamanho: 'G', preco: 575 },
  { nome: 'Kiritsuke 10"', tamanho: 'G', preco: 710 },
  // ── Sem classe ──
  { nome: 'Chaira 10"', tamanho: '-', preco: 350 },
  { nome: 'Chaira 8"', tamanho: '-', preco: 300 },
];

// Aço — Inox incluso no valor base; Brute Forge é opcional de aço
const ACOS: Opcao[] = [
  { nome: 'Inox', precos: { P: 0, M: 0, G: 0 }, incluso: true },
  { nome: 'Sandvik 14C28N', precos: { P: 165, M: 195, G: 350 } },
  { nome: '52100', precos: {} }, // sem valor na planilha → R$ 0,00
];
const BRUTE_FORGE: Precos = { P: 125, G: 300 }; // M usa P (125)

// Empunhadura — Grafite inclusa; Dragon Scale é opcional de empunhadura
const EMPUNHADURAS: Opcao[] = [
  { nome: 'Grafite', precos: { P: 0, M: 0, G: 0 }, incluso: true },
  { nome: 'G10', precos: { P: 115, M: 145 } },
  { nome: 'Espaçador', precos: { P: 70, G: 90 } },
  { nome: 'Imbuia', precos: { P: 80, G: 100 } },
];
const DRAGON_SCALE: Precos = { P: 70 }; // preço único na planilha

const ACABAMENTOS: Opcao[] = [
  { nome: 'Acetinado', precos: { P: 0, M: 0, G: 0 }, incluso: true },
  { nome: 'Stone Washed', precos: { P: 25, M: 25, G: 35 } },
  { nome: 'Tactical', precos: { P: 90, M: 90, G: 125 } },
];

const BAINHAS: Opcao[] = [
  { nome: 'Preta', precos: { P: 0, M: 0, G: 0 }, incluso: true },
  { nome: 'Colorida', precos: { P: 195, G: 250 } },
  { nome: 'Bainha adicional', precos: { P: 195, G: 250 } },
];

// Itens sem valor na planilha entram como R$ 0,00 (regra do negócio)
const ADICIONAIS: { nome: string; preco: number }[] = [
  { nome: 'Strop', preco: 0 }, { nome: 'Café Médio ou Escuro', preco: 0 }, { nome: 'Clipe Extra', preco: 0 },
  { nome: 'Clipe Lateral', preco: 0 }, { nome: 'Patch Fluorescente', preco: 0 }, { nome: 'Patch Cão Pastor', preco: 0 },
  { nome: 'Patch K', preco: 0 }, { nome: 'BC Churrasco', preco: 0 }, { nome: 'BC Churrasco Dupla', preco: 0 },
  { nome: 'BC Churrasco Tripla', preco: 0 }, { nome: 'Passador de Couro', preco: 0 }, { nome: 'Bainha Couro EDC', preco: 200 },
  { nome: 'Bainha Couro Camp', preco: 350 }, { nome: 'Bainha Couro Jagunço', preco: 290 },
  { nome: 'Boné', preco: 75 }, { nome: 'Camisa Kaowz', preco: 170 }, { nome: 'Moletom', preco: 240 },
];

const BRL = (n: number) => n.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL', minimumFractionDigits: 2 });
const TAM_DOT: Record<Tamanho, string> = { P: 'bg-sky-500', M: 'bg-amber-500', G: 'bg-rose-500', '-': 'bg-zinc-400' };

/* ════════════════ Estado de um item ════════════════ */

interface ItemCfg {
  id: string;
  modeloIdx: number | null;
  acoIdx: number;          // default 0 (Inox incluso)
  bruteForge: boolean;     // opcional do aço
  empIdx: number;          // default 0 (Grafite inclusa)
  dragonScale: boolean;    // opcional da empunhadura
  acabIdx: number;         // default 0 (Acetinado incluso)
  bainhaIdx: number;       // default 0 (Preta inclusa)
  adicionais: Set<number>;
}

function newItem(): ItemCfg {
  return {
    id: crypto.randomUUID(), modeloIdx: null,
    acoIdx: 0, bruteForge: false, empIdx: 0, dragonScale: false,
    acabIdx: 0, bainhaIdx: 0, adicionais: new Set(),
  };
}

function classeDo(m: Modelo | null): Classe {
  return !m || m.tamanho === '-' ? 'P' : m.tamanho;
}

function calcItem(cfg: ItemCfg): number {
  const m = cfg.modeloIdx !== null ? MODELOS[cfg.modeloIdx] : null;
  if (!m) return 0;
  const c = classeDo(m);
  let t = m.preco;
  t += precoClasse(ACOS[cfg.acoIdx].precos, c);
  if (cfg.bruteForge) t += precoClasse(BRUTE_FORGE, c);
  t += precoClasse(EMPUNHADURAS[cfg.empIdx].precos, c);
  if (cfg.dragonScale) t += precoClasse(DRAGON_SCALE, c);
  t += precoClasse(ACABAMENTOS[cfg.acabIdx].precos, c);
  t += precoClasse(BAINHAS[cfg.bainhaIdx].precos, c);
  cfg.adicionais.forEach((i) => { t += ADICIONAIS[i]?.preco ?? 0; });
  return t;
}

/* ════════════════ Orçamento (texto) ════════════════ */

function textoItem(cfg: ItemCfg, n: number): string[] {
  const m = cfg.modeloIdx !== null ? MODELOS[cfg.modeloIdx] : null;
  if (!m) return [];
  const c = classeDo(m);
  const aco = ACOS[cfg.acoIdx].nome + (cfg.bruteForge ? ' + Brute Forge' : '');
  const emp = EMPUNHADURAS[cfg.empIdx].nome + (cfg.dragonScale ? ' + Dragon Scale' : '');
  const l = [
    `Item ${n}:`,
    m.nome,
    `Aço: ${aco}`,
    `Empunhadura: ${emp}`,
    `Acabamento: ${ACABAMENTOS[cfg.acabIdx].nome}`,
    `Bainha: ${BAINHAS[cfg.bainhaIdx].nome}`,
  ];
  const ads = [...cfg.adicionais].map((i) => ADICIONAIS[i]?.nome).filter(Boolean);
  if (ads.length) l.push(`Adicionais: ${ads.join(', ')}`);
  l.push(`Valor: ${BRL(calcItem(cfg))}`);
  void c;
  return l;
}

function gerarOrcamento(itens: ItemCfg[], total: number): string {
  const l: string[] = ['Pedido:', ''];
  let n = 0;
  itens.forEach((cfg) => {
    const bloco = textoItem(cfg, n + 1);
    if (bloco.length === 0) return;
    n++;
    l.push(...bloco, '');
  });
  l.push(`Total: ${BRL(total)}`);
  return l.join('\n');
}

/* ════════════════ UI: átomos ════════════════ */

function Chip({ label, price, selected, onClick }: { label: string; price: number; selected: boolean; onClick: () => void }) {
  return (
    <button type="button" onClick={onClick}
      className={`inline-flex items-center gap-1.5 px-3 py-2 rounded-full text-xs font-medium border transition-all whitespace-nowrap
        ${selected ? 'border-primary bg-primary text-primary-foreground shadow-sm' : 'border-border bg-background hover:bg-muted active:scale-95'}`}>
      {label}
      <span className={selected ? 'text-primary-foreground/80' : 'text-muted-foreground'}>
        {price === 0 ? 'incluso' : `+${BRL(price)}`}
      </span>
    </button>
  );
}

function ToggleChip({ label, price, on, onClick }: { label: string; price: number; on: boolean; onClick: () => void }) {
  return (
    <button type="button" onClick={onClick}
      className={`inline-flex items-center gap-1.5 px-3 py-2 rounded-full text-xs font-semibold border transition-all whitespace-nowrap
        ${on ? 'border-accent bg-accent text-accent-foreground shadow-sm' : 'border-dashed border-accent/50 text-accent bg-accent/5 hover:bg-accent/10 active:scale-95'}`}>
      {on ? <Check className="w-3 h-3" /> : <Plus className="w-3 h-3" />}
      {label}
      <span className={on ? 'text-accent-foreground/85' : 'text-accent/80'}>+{BRL(price)}</span>
    </button>
  );
}

function Secao({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="space-y-2">
      <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">{title}</span>
      {children}
    </div>
  );
}

/* ════════════════ Busca de modelo ════════════════ */

function ModeloSearch({ onSelect, currentIdx }: { onSelect: (idx: number) => void; currentIdx: number | null }) {
  const [query, setQuery] = useState('');
  const [open, setOpen] = useState(currentIdx === null);
  const inputRef = useRef<HTMLInputElement>(null);
  const selected = currentIdx !== null ? MODELOS[currentIdx] : null;

  useEffect(() => { if (open && inputRef.current) inputRef.current.focus(); }, [open]);

  const filtered = useMemo(() => {
    const base = MODELOS.map((m, i) => ({ m, i }));
    if (!query.trim()) return base;
    const q = query.toLowerCase();
    return base.filter(({ m }) => m.nome.toLowerCase().includes(q));
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
        <Input ref={inputRef} value={query} onChange={(e) => setQuery(e.target.value)}
          placeholder="Buscar modelo..." className="pl-9 pr-9 h-11" />
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
            <button key={i} type="button" onClick={() => { onSelect(i); setOpen(false); setQuery(''); }}
              className={`w-full flex items-center gap-3 px-3 py-2.5 text-left transition hover:bg-muted/60 active:bg-muted ${currentIdx === i ? 'bg-primary/5' : ''}`}>
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

/* ════════════════ Card de item ════════════════ */

function ItemCard({ cfg, onChange, onRemove, onDuplicate, index, expanded, onToggle, removivel }: {
  cfg: ItemCfg; onChange: (c: ItemCfg) => void; onRemove: () => void; onDuplicate: () => void;
  index: number; expanded: boolean; onToggle: () => void; removivel: boolean;
}) {
  const modelo = cfg.modeloIdx !== null ? MODELOS[cfg.modeloIdx] : null;
  const c = classeDo(modelo);
  const total = calcItem(cfg);
  const [showAdicionais, setShowAdicionais] = useState(false);

  const specs = modelo ? [
    ACOS[cfg.acoIdx].incluso && !cfg.bruteForge ? null : ACOS[cfg.acoIdx].nome + (cfg.bruteForge ? ' + BF' : ''),
    EMPUNHADURAS[cfg.empIdx].incluso && !cfg.dragonScale ? null : EMPUNHADURAS[cfg.empIdx].nome + (cfg.dragonScale ? ' + DS' : ''),
    ACABAMENTOS[cfg.acabIdx].incluso ? null : ACABAMENTOS[cfg.acabIdx].nome,
    BAINHAS[cfg.bainhaIdx].incluso ? null : BAINHAS[cfg.bainhaIdx].nome,
    cfg.adicionais.size > 0 ? `${cfg.adicionais.size} adicional(is)` : null,
  ].filter(Boolean) : [];

  return (
    <div className="rounded-2xl border bg-card overflow-hidden shadow-sm">
      <button type="button" onClick={onToggle}
        className="w-full flex items-center gap-3 p-4 hover:bg-muted/30 transition-colors active:bg-muted/50">
        <span className="w-8 h-8 rounded-xl bg-primary text-primary-foreground flex items-center justify-center text-sm font-bold flex-shrink-0">
          {index + 1}
        </span>
        <div className="flex-1 text-left min-w-0">
          <p className="font-semibold text-sm truncate">{modelo ? modelo.nome : 'Novo item'}</p>
          <p className="text-[11px] text-muted-foreground truncate">
            {modelo ? (specs.length > 0 ? specs.join(' · ') : 'Configuração base') : 'Escolha o modelo'}
          </p>
        </div>
        {modelo && <span className="text-base font-bold text-primary flex-shrink-0" data-numeric>{BRL(total)}</span>}
        {expanded ? <ChevronUp className="w-4 h-4 text-muted-foreground" /> : <ChevronDown className="w-4 h-4 text-muted-foreground" />}
      </button>

      {expanded && (
        <div className="px-4 pb-4 space-y-5 border-t pt-4">
          <Secao title="Modelo">
            <ModeloSearch currentIdx={cfg.modeloIdx}
              onSelect={(i) => onChange({ ...newItem(), id: cfg.id, modeloIdx: i, adicionais: cfg.adicionais })} />
          </Secao>

          {modelo && (
            <>
              {/* Aço — Brute Forge é opcional do aço */}
              <Secao title="Aço">
                <div className="flex flex-wrap gap-1.5">
                  {ACOS.map((a, i) => (
                    <Chip key={i} label={a.nome} price={precoClasse(a.precos, c)}
                      selected={cfg.acoIdx === i} onClick={() => onChange({ ...cfg, acoIdx: i })} />
                  ))}
                  <ToggleChip label="Brute Forge" price={precoClasse(BRUTE_FORGE, c)} on={cfg.bruteForge}
                    onClick={() => onChange({ ...cfg, bruteForge: !cfg.bruteForge })} />
                </div>
              </Secao>

              {/* Empunhadura — Dragon Scale é opcional da empunhadura */}
              <Secao title="Empunhadura">
                <div className="flex flex-wrap gap-1.5">
                  {EMPUNHADURAS.map((e, i) => (
                    <Chip key={i} label={e.nome} price={precoClasse(e.precos, c)}
                      selected={cfg.empIdx === i} onClick={() => onChange({ ...cfg, empIdx: i })} />
                  ))}
                  <ToggleChip label="Dragon Scale" price={precoClasse(DRAGON_SCALE, c)} on={cfg.dragonScale}
                    onClick={() => onChange({ ...cfg, dragonScale: !cfg.dragonScale })} />
                </div>
              </Secao>

              <Secao title="Acabamento">
                <div className="flex flex-wrap gap-1.5">
                  {ACABAMENTOS.map((a, i) => (
                    <Chip key={i} label={a.nome} price={precoClasse(a.precos, c)}
                      selected={cfg.acabIdx === i} onClick={() => onChange({ ...cfg, acabIdx: i })} />
                  ))}
                </div>
              </Secao>

              <Secao title="Bainha">
                <div className="flex flex-wrap gap-1.5">
                  {BAINHAS.map((b, i) => (
                    <Chip key={i} label={b.nome} price={precoClasse(b.precos, c)}
                      selected={cfg.bainhaIdx === i} onClick={() => onChange({ ...cfg, bainhaIdx: i })} />
                  ))}
                </div>
              </Secao>

              <Secao title="Adicionais">
                <button type="button" onClick={() => setShowAdicionais(!showAdicionais)}
                  className="flex items-center gap-2 text-xs text-primary font-medium hover:underline">
                  {showAdicionais ? 'Ocultar' : `Ver ${ADICIONAIS.length} opções`}
                  {cfg.adicionais.size > 0 && <span className="bg-accent text-accent-foreground text-[10px] font-bold px-1.5 py-0.5 rounded-full">{cfg.adicionais.size}</span>}
                  {showAdicionais ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                </button>
                {showAdicionais && (
                  <div className="space-y-1 mt-1">
                    {ADICIONAIS.map((a, i) => {
                      const on = cfg.adicionais.has(i);
                      return (
                        <label key={i} className={`flex items-center gap-3 px-3 py-2 rounded-lg border cursor-pointer transition-all ${on ? 'border-accent bg-accent/5' : 'border-transparent hover:bg-muted/40'}`}>
                          <Checkbox checked={on} onCheckedChange={(v) => { const s = new Set(cfg.adicionais); if (v) s.add(i); else s.delete(i); onChange({ ...cfg, adicionais: s }); }} />
                          <span className={`flex-1 text-sm ${on ? 'font-medium' : ''}`}>{a.nome}</span>
                          <span className={`text-xs font-semibold ${on ? 'text-accent' : 'text-muted-foreground'}`} data-numeric>{BRL(a.preco)}</span>
                        </label>
                      );
                    })}
                  </div>
                )}
              </Secao>

              <div className="flex items-center justify-between p-3 rounded-xl bg-primary/5 border border-primary/15">
                <span className="text-sm font-medium">Subtotal</span>
                <span className="text-lg font-bold text-primary" data-numeric>{BRL(total)}</span>
              </div>
            </>
          )}

          <div className="flex gap-2">
            {modelo && (
              <button type="button" onClick={onDuplicate}
                className="flex-1 flex items-center justify-center gap-2 py-2 text-xs text-muted-foreground hover:text-primary transition-colors rounded-lg hover:bg-muted/50">
                <CopyPlus className="w-3.5 h-3.5" /> Duplicar
              </button>
            )}
            {removivel && (
              <button type="button" onClick={onRemove}
                className="flex-1 flex items-center justify-center gap-2 py-2 text-xs text-muted-foreground hover:text-destructive transition-colors rounded-lg hover:bg-muted/50">
                <Trash2 className="w-3.5 h-3.5" /> Remover
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

/* ════════════════ Modal de orçamento / WhatsApp ════════════════ */

function OrcamentoModal({ open, onOpenChange, texto, vendedorPadrao }: {
  open: boolean; onOpenChange: (v: boolean) => void; texto: string; vendedorPadrao: string;
}) {
  const [nomeCliente, setNomeCliente] = useState('');
  const [telefone, setTelefone] = useState('');
  const [vendedor, setVendedor] = useState(vendedorPadrao);

  useEffect(() => { if (vendedorPadrao && !vendedor) setVendedor(vendedorPadrao); }, [vendedorPadrao]); // eslint-disable-line react-hooks/exhaustive-deps

  const mensagem = useMemo(() => {
    const partes: string[] = [];
    if (nomeCliente.trim()) partes.push(`Olá, ${nomeCliente.trim()}! Segue seu orçamento Kaowz:`, '');
    partes.push(texto);
    if (vendedor.trim()) partes.push('', `Qualquer dúvida estou à disposição!`, `— ${vendedor.trim()} · Kaowz`);
    return partes.join('\n');
  }, [nomeCliente, vendedor, texto]);

  const telefoneDigits = telefone.replace(/\D/g, '');
  const telefoneValido = telefoneDigits.length >= 10 && telefoneDigits.length <= 13;

  const copiar = async () => {
    try { await navigator.clipboard.writeText(mensagem); toast.success('Orçamento copiado!'); }
    catch { toast.error('Não foi possível copiar'); }
  };

  const enviarWhatsApp = () => {
    if (!telefoneValido) { toast.error('Informe o WhatsApp do cliente com DDD'); return; }
    const numero = telefoneDigits.length <= 11 ? `55${telefoneDigits}` : telefoneDigits;
    window.open(`https://wa.me/${numero}?text=${encodeURIComponent(mensagem)}`, '_blank');
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto rounded-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <MessageCircle className="h-5 w-5 text-accent" /> Enviar orçamento
          </DialogTitle>
          <DialogDescription>
            Copie o orçamento ou envie direto para o WhatsApp do cliente.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="grid grid-cols-1 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="orc-nome" className="text-xs">Nome do cliente</Label>
              <Input id="orc-nome" value={nomeCliente} onChange={(e) => setNomeCliente(e.target.value)}
                placeholder="Ex: João" className="h-10" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="orc-tel" className="text-xs">WhatsApp do cliente</Label>
                <Input id="orc-tel" value={telefone} onChange={(e) => setTelefone(e.target.value)}
                  placeholder="(11) 99999-9999" inputMode="tel" className="h-10" />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="orc-vend" className="text-xs">Vendedor</Label>
                <Input id="orc-vend" value={vendedor} onChange={(e) => setVendedor(e.target.value)}
                  placeholder="Seu nome" className="h-10" />
              </div>
            </div>
          </div>

          <div className="rounded-xl border bg-muted/40 p-3 max-h-52 overflow-y-auto">
            <pre className="text-xs whitespace-pre-wrap font-sans leading-relaxed">{mensagem}</pre>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <Button variant="outline" className="h-11 rounded-xl gap-2" onClick={copiar}>
              <Copy className="h-4 w-4" /> Copiar
            </Button>
            <Button className="h-11 rounded-xl gap-2 bg-accent hover:bg-accent/90 text-accent-foreground"
              onClick={enviarWhatsApp} disabled={!telefoneValido}>
              <Send className="h-4 w-4" /> WhatsApp
            </Button>
          </div>
          {!telefoneValido && telefone.length > 0 && (
            <p className="text-[11px] text-muted-foreground text-center -mt-2">Digite o número com DDD para habilitar o envio</p>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

/* ════════════════ Página ════════════════ */

export default function SimuladorPrecos() {
  const { profile } = useAuth();
  const [itens, setItens] = useState<ItemCfg[]>([newItem()]);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [modalOpen, setModalOpen] = useState(false);

  useEffect(() => { setExpandedId((e) => e ?? itens[0]?.id ?? null); }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const addItem = () => { const c = newItem(); setItens((p) => [...p, c]); setExpandedId(c.id); };
  const duplicateItem = (id: string) => {
    setItens((p) => {
      const src = p.find((c) => c.id === id);
      if (!src) return p;
      const copia: ItemCfg = { ...src, id: crypto.randomUUID(), adicionais: new Set(src.adicionais) };
      const idx = p.findIndex((c) => c.id === id);
      const n = [...p];
      n.splice(idx + 1, 0, copia);
      setExpandedId(copia.id);
      return n;
    });
    if (navigator.vibrate) navigator.vibrate(15);
  };
  const removeItem = (id: string) => setItens((p) => {
    if (p.length <= 1) return p;
    const n = p.filter((c) => c.id !== id);
    if (expandedId === id) setExpandedId(n[0]?.id ?? null);
    return n;
  });
  const updateItem = (id: string, u: ItemCfg) => setItens((p) => p.map((c) => (c.id === id ? u : c)));

  const totalGeral = useMemo(() => itens.reduce((s, c) => s + calcItem(c), 0), [itens]);
  const itensValidos = itens.filter((c) => c.modeloIdx !== null).length;
  const orcamento = useMemo(() => gerarOrcamento(itens, totalGeral), [itens, totalGeral]);

  const copiarRapido = async () => {
    try { await navigator.clipboard.writeText(orcamento); toast.success('Orçamento copiado!'); }
    catch { toast.error('Erro ao copiar'); }
  };

  return (
    <div className="max-w-lg mx-auto py-4 px-1 sm:px-4 space-y-3 pb-44 md:pb-28">
      <div className="flex items-center gap-3 mb-1">
        <Calculator className="h-5 w-5 text-primary" />
        <div>
          <h1 className="text-lg font-bold leading-tight">Simulador de Preços</h1>
          <p className="text-[11px] text-muted-foreground leading-tight">Base: Aço Inox + Empunhadura Grafite inclusos</p>
        </div>
      </div>

      <div className="space-y-3">
        {itens.map((cfg, idx) => (
          <ItemCard key={cfg.id} cfg={cfg} index={idx}
            onChange={(u) => updateItem(cfg.id, u)}
            onRemove={() => removeItem(cfg.id)}
            onDuplicate={() => duplicateItem(cfg.id)}
            removivel={itens.length > 1}
            expanded={expandedId === cfg.id}
            onToggle={() => setExpandedId(expandedId === cfg.id ? null : cfg.id)} />
        ))}
      </div>

      <Button variant="outline" className="w-full gap-2 rounded-xl h-11" onClick={addItem}>
        <Plus className="h-4 w-4" /> Adicionar item
      </Button>

      {/* Footer fixo — acima da bottom nav no mobile */}
      <div className="fixed left-0 right-0 bg-background/95 backdrop-blur-lg border-t z-40 bottom-[calc(4rem+env(safe-area-inset-bottom))] md:bottom-0">
        <div className="max-w-lg mx-auto flex items-center gap-3 px-4 py-3">
          <div className="flex-1 min-w-0">
            <p className="text-[10px] text-muted-foreground uppercase tracking-wider leading-tight">
              {itensValidos} {itensValidos === 1 ? 'item' : 'itens'}
            </p>
            <p className="text-xl font-bold text-accent leading-tight" data-numeric>{BRL(totalGeral)}</p>
          </div>
          <Button variant="outline" size="icon" className="h-11 w-11 rounded-xl flex-shrink-0" onClick={copiarRapido} title="Copiar orçamento">
            <Copy className="h-4 w-4" />
          </Button>
          <Button className="gap-2 h-11 rounded-xl flex-shrink-0 bg-accent hover:bg-accent/90 text-accent-foreground"
            onClick={() => setModalOpen(true)} disabled={itensValidos === 0}>
            <MessageCircle className="h-4 w-4" /> WhatsApp
          </Button>
        </div>
      </div>

      <OrcamentoModal open={modalOpen} onOpenChange={setModalOpen} texto={orcamento}
        vendedorPadrao={profile?.nome_vendedor ?? ''} />
    </div>
  );
}
