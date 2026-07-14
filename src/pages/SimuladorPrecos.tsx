import { useMemo, useState, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import {
  Calculator, Plus, Minus, Trash2, Copy, MessageCircle, Search, X,
  ChevronDown, ChevronUp, CopyPlus, Send, Loader2, Check, ClipboardCheck, Eraser,
  Hammer, PackagePlus, Pencil, FilePlus2,
} from 'lucide-react';
import { toast } from 'sonner';
import { useAuth } from '@/contexts/AuthContext';
import { useSimuladorConfig } from '@/hooks/useSimuladorConfig';
import {
  BRL, TAM_DOT, newItem, precoClasse, classeDo, calcItem, calcEntry, gerarOrcamento,
  novaEntradaFaca, novaEntradaAvulso, novaEntradaCustom,
  type SimuladorData, type ItemCfg, type PedidoEntry, type Modelo, type Opcao, type CustomCfg,
} from '@/lib/simuladorData';

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

function ModeloSearch({ modelos, onSelect, currentIdx }: { modelos: Modelo[]; onSelect: (idx: number) => void; currentIdx: number | null }) {
  const [query, setQuery] = useState('');
  const [open, setOpen] = useState(currentIdx === null);
  const inputRef = useRef<HTMLInputElement>(null);
  const selected = currentIdx !== null ? modelos[currentIdx] : null;

  useEffect(() => { if (open && inputRef.current) inputRef.current.focus(); }, [open]);

  const filtered = useMemo(() => {
    const base = modelos.map((m, i) => ({ m, i }));
    if (!query.trim()) return base;
    const q = query.toLowerCase();
    return base.filter(({ m }) => m.nome.toLowerCase().includes(q));
  }, [query, modelos]);

  if (!open && selected) {
    return (
      <button type="button" onClick={() => { setOpen(true); setQuery(''); }}
        className="w-full flex items-center gap-3 p-3 rounded-xl border border-primary/30 bg-primary/5 transition hover:bg-primary/10 active:scale-[0.99]">
        <span className={`w-2.5 h-2.5 rounded-full flex-shrink-0 ${TAM_DOT[selected.tamanho]}`} />
        <span className="flex-1 text-left font-semibold text-sm">{selected.nome}</span>
        <span className="text-sm font-bold text-primary">{selected.preco > 0 ? BRL(selected.preco) : 'sob consulta'}</span>
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
              <span className="text-xs font-bold text-primary flex-shrink-0">{m.preco > 0 ? BRL(m.preco) : '—'}</span>
            </button>
          ))
        )}
      </div>
    </div>
  );
}

/* ════════════════ Card de item ════════════════ */

function ItemCard({ data, cfg, onChange, onRemove, onDuplicate, index, expanded, onToggle, removivel }: {
  data: SimuladorData; cfg: ItemCfg; onChange: (c: ItemCfg) => void; onRemove: () => void; onDuplicate: () => void;
  index: number; expanded: boolean; onToggle: () => void; removivel: boolean;
}) {
  const modelo = cfg.modeloIdx !== null ? data.modelos[cfg.modeloIdx] : null;
  const c = classeDo(modelo);
  const total = calcItem(data, cfg);

  const nomeOpt = (arr: Opcao[], idx: number, sufixo = '') =>
    arr[idx] && !arr[idx].incluso ? arr[idx].nome + sufixo : (sufixo ? arr[idx]?.nome + sufixo : null);

  const specs = modelo ? [
    nomeOpt(data.acos, cfg.acoIdx) ?? (cfg.bruteForge ? data.acos[cfg.acoIdx]?.nome : null),
    cfg.bruteForge ? 'BF' : null,
    nomeOpt(data.empunhaduras, cfg.empIdx) ?? (cfg.dragonScale ? data.empunhaduras[cfg.empIdx]?.nome : null),
    cfg.empCor,
    cfg.dragonScale ? 'DS' : null,
    nomeOpt(data.acabamentos, cfg.acabIdx),
    nomeOpt(data.bainhas, cfg.bainhaIdx),
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
            <ModeloSearch modelos={data.modelos} currentIdx={cfg.modeloIdx}
              onSelect={(i) => onChange({ ...newItem(), id: cfg.id, modeloIdx: i })} />
          </Secao>

          {modelo && (
            <>
              {/* Aço — Brute Forge é opcional do aço */}
              <Secao title="Aço">
                <div className="flex flex-wrap gap-1.5">
                  {data.acos.map((a, i) => (
                    <Chip key={i} label={a.nome} price={precoClasse(a.precos, c)}
                      selected={cfg.acoIdx === i} onClick={() => {
                        const novoAcoIdx = cfg.acoIdx === i ? 0 : i;
                        const novoAcoNome = data.acos[novoAcoIdx]?.nome ?? '';
                        let novoAcabIdx = cfg.acabIdx;
                        if (/52100/.test(novoAcoNome)) {
                          const bsw = data.acabamentos.findIndex((x) => /black stone washed/i.test(x.nome));
                          if (bsw >= 0) novoAcabIdx = bsw;
                        } else if (/52100/.test(data.acos[cfg.acoIdx]?.nome ?? '')) {
                          // saindo do 52100 — volta pro incluso
                          novoAcabIdx = 0;
                        }
                        onChange({ ...cfg, acoIdx: novoAcoIdx, acabIdx: novoAcabIdx });
                      }} />
                  ))}
                  <ToggleChip label="Brute Forge" price={precoClasse(data.bruteForge, c)} on={cfg.bruteForge}
                    onClick={() => onChange({ ...cfg, bruteForge: !cfg.bruteForge })} />
                </div>
              </Secao>

              {/* Empunhadura — Dragon Scale é opcional da empunhadura */}
              <Secao title="Empunhadura">
                <div className="flex flex-wrap gap-1.5">
                  {data.empunhaduras.map((e, i) => (
                    <Chip key={i} label={e.nome} price={precoClasse(e.precos, c)}
                      selected={cfg.empIdx === i}
                      onClick={() => onChange({ ...cfg, empIdx: cfg.empIdx === i ? 0 : i, empCor: null })} />
                  ))}
                  <ToggleChip label="Dragon Scale" price={precoClasse(data.dragonScale, c)} on={cfg.dragonScale}
                    onClick={() => onChange({ ...cfg, dragonScale: !cfg.dragonScale })} />
                </div>
                {/* Cor da empunhadura — só aparece quando a opção selecionada tem cores cadastradas */}
                {!!data.empunhaduras[cfg.empIdx]?.cores?.length && (
                  <div className="flex flex-wrap gap-1.5 pt-1">
                    <span className="w-full text-[10px] text-muted-foreground">Cor da {data.empunhaduras[cfg.empIdx].nome}:</span>
                    {data.empunhaduras[cfg.empIdx]!.cores!.map((cor) => (
                      <button key={cor} type="button"
                        onClick={() => onChange({ ...cfg, empCor: cfg.empCor === cor ? null : cor })}
                        className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-all
                          ${cfg.empCor === cor ? 'border-primary bg-primary text-primary-foreground shadow-sm' : 'border-border bg-background hover:bg-muted active:scale-95'}`}>
                        {cor}
                      </button>
                    ))}
                  </div>
                )}
              </Secao>

              {(() => {
                const acoNome = data.acos[cfg.acoIdx]?.nome ?? '';
                const is52100 = /52100/.test(acoNome);
                const bswIdx = data.acabamentos.findIndex((x) => /black stone washed/i.test(x.nome));
                const allowed = is52100
                  ? data.acabamentos
                      .map((a, i) => ({ a, i }))
                      .filter(({ a }) => /black stone washed|tactical/i.test(a.nome))
                  : data.acabamentos.map((a, i) => ({ a, i }));
                // Se 52100 estiver selecionado mas o acabIdx atual não estiver entre os permitidos,
                // força Black Stone Washed automaticamente.
                const acabIdxValido = allowed.some(({ i }) => i === cfg.acabIdx);
                if (is52100 && !acabIdxValido && bswIdx >= 0) {
                  queueMicrotask(() => onChange({ ...cfg, acabIdx: bswIdx }));
                }
                return (
                  <Secao title="Acabamento">
                    <div className="flex flex-wrap gap-1.5">
                      {allowed.map(({ a, i }) => (
                        <Chip key={i} label={a.nome} price={precoClasse(a.precos, c)}
                          selected={cfg.acabIdx === i} onClick={() => onChange({ ...cfg, acabIdx: cfg.acabIdx === i ? (is52100 ? i : 0) : i })} />
                      ))}
                    </div>
                    {is52100 && (
                      <p className="text-[10px] text-muted-foreground pt-1">Aço 52100: acabamento padrão Black Stone Washed, único variante disponível Tactical.</p>
                    )}
                  </Secao>
                );
              })()}

              <Secao title="Bainha">
                <div className="flex flex-wrap gap-1.5">
                  {data.bainhas.map((b, i) => (
                    <Chip key={i} label={b.nome} price={precoClasse(b.precos, c)}
                      selected={cfg.bainhaIdx === i} onClick={() => onChange({ ...cfg, bainhaIdx: cfg.bainhaIdx === i ? 0 : i })} />
                  ))}
                </div>
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

/* ════════════════ Item à parte (avulso) ════════════════ */

function AvulsoRow({ data, cfg, onChange, onRemove }: {
  data: SimuladorData; cfg: import('@/lib/simuladorData').AvulsoCfg;
  onChange: (c: import('@/lib/simuladorData').AvulsoCfg) => void; onRemove: () => void;
}) {
  const a = data.adicionais[cfg.adicionalIdx];
  if (!a) return null;
  const subtotal = a.preco * cfg.quantidade;
  return (
    <div className="rounded-2xl border bg-card overflow-hidden shadow-sm flex items-center gap-3 p-4">
      <span className="w-8 h-8 rounded-xl bg-accent/15 text-accent flex items-center justify-center flex-shrink-0">
        <PackagePlus className="w-4 h-4" />
      </span>
      <div className="flex-1 min-w-0">
        <p className="font-semibold text-sm truncate">{a.nome}</p>
        <p className="text-[11px] text-muted-foreground">Item à parte</p>
      </div>
      <div className="flex items-center gap-1.5 flex-shrink-0">
        <button type="button" onClick={() => onChange({ ...cfg, quantidade: Math.max(1, cfg.quantidade - 1) })}
          className="w-7 h-7 rounded-full border flex items-center justify-center hover:bg-muted active:scale-95 transition-all disabled:opacity-30"
          disabled={cfg.quantidade <= 1}>
          <Minus className="w-3 h-3" />
        </button>
        <span className="w-5 text-center text-sm font-semibold tabular-nums">{cfg.quantidade}</span>
        <button type="button" onClick={() => onChange({ ...cfg, quantidade: cfg.quantidade + 1 })}
          className="w-7 h-7 rounded-full border flex items-center justify-center hover:bg-muted active:scale-95 transition-all">
          <Plus className="w-3 h-3" />
        </button>
      </div>
      <span className="text-sm font-bold text-primary w-20 text-right flex-shrink-0" data-numeric>{BRL(subtotal)}</span>
      <button type="button" onClick={onRemove} className="text-muted-foreground hover:text-destructive transition-colors flex-shrink-0">
        <Trash2 className="w-4 h-4" />
      </button>
    </div>
  );
}

function AvulsoPickerDialog({ open, onOpenChange, data, onPick }: {
  open: boolean; onOpenChange: (v: boolean) => void; data: SimuladorData; onPick: (idx: number) => void;
}) {
  const [query, setQuery] = useState('');
  const filtered = useMemo(() => {
    const base = data.adicionais.map((a, i) => ({ a, i }));
    if (!query.trim()) return base;
    const q = query.toLowerCase();
    return base.filter(({ a }) => a.nome.toLowerCase().includes(q));
  }, [query, data.adicionais]);

  useEffect(() => { if (!open) setQuery(''); }, [open]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md max-h-[80vh] overflow-hidden flex flex-col rounded-2xl p-0">
        <DialogHeader className="p-4 pb-2">
          <DialogTitle className="flex items-center gap-2">
            <PackagePlus className="h-5 w-5 text-accent" /> Item à parte
          </DialogTitle>
          <DialogDescription>Escolha um item do catálogo de Adicionais, sem faca.</DialogDescription>
        </DialogHeader>
        <div className="px-4 pb-2">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Buscar item..." className="pl-9 h-11" />
          </div>
        </div>
        <div className="flex-1 overflow-y-auto px-4 pb-4 space-y-1.5">
          {filtered.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-8">Nenhum item encontrado</p>
          ) : (
            filtered.map(({ a, i }) => (
              <button key={i} type="button" onClick={() => { onPick(i); onOpenChange(false); }}
                className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl border text-left hover:bg-muted/50 active:scale-[0.99] transition-all">
                <span className="flex-1 text-sm font-medium truncate">{a.nome}</span>
                <span className="text-sm font-bold text-primary flex-shrink-0" data-numeric>{BRL(a.preco)}</span>
                <Plus className="w-4 h-4 text-accent flex-shrink-0" />
              </button>
            ))
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

/* ════════════════ Item não cadastrado (custom) ════════════════ */

function CustomRow({ cfg, onChange, onRemove }: {
  cfg: CustomCfg; onChange: (c: CustomCfg) => void; onRemove: () => void;
}) {
  const [editing, setEditing] = useState(false);
  const subtotal = Math.max(0, cfg.preco) * Math.max(1, cfg.quantidade);
  return (
    <>
      <div className="rounded-2xl border bg-card overflow-hidden shadow-sm flex items-center gap-3 p-4">
        <span className="w-8 h-8 rounded-xl bg-secondary text-secondary-foreground flex items-center justify-center flex-shrink-0">
          <FilePlus2 className="w-4 h-4" />
        </span>
        <div className="flex-1 min-w-0">
          <p className="font-semibold text-sm truncate">{cfg.descricao.trim() || 'Item não cadastrado'}</p>
          <p className="text-[11px] text-muted-foreground">Item não cadastrado · {BRL(Math.max(0, cfg.preco))}/un</p>
        </div>
        <div className="flex items-center gap-1.5 flex-shrink-0">
          <button type="button" onClick={() => onChange({ ...cfg, quantidade: Math.max(1, cfg.quantidade - 1) })}
            className="w-7 h-7 rounded-full border flex items-center justify-center hover:bg-muted active:scale-95 transition-all disabled:opacity-30"
            disabled={cfg.quantidade <= 1}>
            <Minus className="w-3 h-3" />
          </button>
          <span className="w-5 text-center text-sm font-semibold tabular-nums">{cfg.quantidade}</span>
          <button type="button" onClick={() => onChange({ ...cfg, quantidade: cfg.quantidade + 1 })}
            className="w-7 h-7 rounded-full border flex items-center justify-center hover:bg-muted active:scale-95 transition-all">
            <Plus className="w-3 h-3" />
          </button>
        </div>
        <span className="text-sm font-bold text-primary w-20 text-right flex-shrink-0" data-numeric>{BRL(subtotal)}</span>
        <button type="button" onClick={() => setEditing(true)} className="text-muted-foreground hover:text-primary transition-colors flex-shrink-0" title="Editar">
          <Pencil className="w-4 h-4" />
        </button>
        <button type="button" onClick={onRemove} className="text-muted-foreground hover:text-destructive transition-colors flex-shrink-0" title="Remover">
          <Trash2 className="w-4 h-4" />
        </button>
      </div>
      <CustomDialog open={editing} onOpenChange={setEditing} initial={cfg} onSave={(u) => { onChange({ ...cfg, descricao: u.descricao, preco: u.preco }); }} />
    </>
  );
}

function CustomDialog({ open, onOpenChange, initial, onSave }: {
  open: boolean; onOpenChange: (v: boolean) => void;
  initial?: { descricao: string; preco: number };
  onSave: (v: { descricao: string; preco: number }) => void;
}) {
  const [descricao, setDescricao] = useState(initial?.descricao ?? '');
  const [precoStr, setPrecoStr] = useState((initial?.preco ?? 0).toString().replace('.', ','));
  useEffect(() => {
    if (open) {
      setDescricao(initial?.descricao ?? '');
      setPrecoStr((initial?.preco ?? 0) > 0 ? (initial!.preco).toFixed(2).replace('.', ',') : '');
    }
  }, [open, initial]);

  const preco = (() => {
    const s = precoStr.replace(/[^\d.,-]/g, '');
    const lastComma = s.lastIndexOf(',');
    const lastDot = s.lastIndexOf('.');
    const str = lastComma > lastDot ? s.replace(/\./g, '').replace(',', '.') : s.replace(/,/g, '');
    const n = parseFloat(str);
    return Number.isFinite(n) ? n : 0;
  })();
  const podeSalvar = descricao.trim().length > 0 && preco > 0;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md rounded-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FilePlus2 className="h-5 w-5 text-primary" /> Item não cadastrado
          </DialogTitle>
          <DialogDescription>Descreva o item e informe o valor. Ele entra no orçamento e no formulário.</DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="cst-desc" className="text-xs">Descrição do item</Label>
            <Textarea id="cst-desc" value={descricao} onChange={(e) => setDescricao(e.target.value)}
              placeholder="Ex: Faca personalizada com detalhe X, gravação Y..." rows={3} className="text-sm resize-none" />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="cst-preco" className="text-xs">Valor do item</Label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">R$</span>
              <Input id="cst-preco" value={precoStr} inputMode="decimal"
                onChange={(e) => setPrecoStr(e.target.value)}
                placeholder="0,00" className="h-10 pl-9 tabular-nums font-semibold" />
            </div>
          </div>
          <Button className="w-full h-11 rounded-xl" disabled={!podeSalvar}
            onClick={() => { onSave({ descricao: descricao.trim(), preco }); onOpenChange(false); }}>
            Salvar item
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

/* ════════════════ Formulário "Shot Fair" (Google Forms) ════════════════ */
// Registro do pedido vendido. IDs extraídos do próprio formulário.
const FORM_ID = '1FAIpQLSfMW6dFNHZq9-dPUjK_mB9obx3iiaTTG58dT18t9a8PDd1ooQ';
const FORM_ENTRY = {
  cliente: 'entry.13851062',
  telefone: 'entry.2122172727',
  pedido: 'entry.2028587306',
  valor: 'entry.1494257691',
  pagamento: 'entry.652260350',
  status: 'entry.1421837376',
  personalizacao: 'entry.1807345374',
  observacao: 'entry.285808907',
  vendedor: 'entry.375383872',
} as const;
const FORM_VENDEDORES = ['Mel', 'Gabriel', 'Diogo', 'Daniel', 'Kariston'];
const FORM_PAGAMENTOS = ['Pix', 'Cartão', 'Dinheiro'];
const FORM_STATUS = ['Encomenda', 'Pronta Entrega'];

/** Casa o nome do vendedor logado com uma das opções do formulário. */
function matchVendedorForm(nome: string): string {
  const n = (nome || '').toLowerCase();
  return FORM_VENDEDORES.find((v) => n.includes(v.toLowerCase())) ?? '';
}

/** Converte texto de valor (R$ 1.560,00 | 1560,00 | 1560.00 | 1560) num número. */
function parseValor(s: string): number {
  const limpo = (s || '').replace(/[^\d.,-]/g, '');
  if (!limpo) return 0;
  const lastComma = limpo.lastIndexOf(',');
  const lastDot = limpo.lastIndexOf('.');
  const str = lastComma > lastDot ? limpo.replace(/\./g, '').replace(',', '.') : limpo.replace(/,/g, '');
  const n = parseFloat(str);
  return Number.isFinite(n) ? n : 0;
}

/** Número no formato que a planilha reconhece: sem R$, sem separador de milhar,
 *  vírgula decimal. Ex.: 1560 → "1560,00". */
function valorParaForm(s: string): string {
  return parseValor(s).toFixed(2).replace('.', ',');
}

/** Monta a URL do Google Form já preenchido (usp=pp_url). */
function urlFormPreenchido(campos: Partial<Record<keyof typeof FORM_ENTRY, string>>): string {
  const p = new URLSearchParams({ usp: 'pp_url' });
  (Object.keys(campos) as (keyof typeof FORM_ENTRY)[]).forEach((k) => {
    const v = campos[k];
    if (v) p.set(FORM_ENTRY[k], v);
  });
  return `https://docs.google.com/forms/d/e/${FORM_ID}/viewform?${p.toString()}`;
}

/* ════════════════ Modal de orçamento / WhatsApp ════════════════ */

function OrcamentoModal({ open, onOpenChange, texto, total, vendedorPadrao }: {
  open: boolean; onOpenChange: (v: boolean) => void; texto: string; total: number; vendedorPadrao: string;
}) {
  const [nomeCliente, setNomeCliente] = useState('');
  const [telefone, setTelefone] = useState('');
  const [vendedor, setVendedor] = useState(matchVendedorForm(vendedorPadrao));
  const [pagamento, setPagamento] = useState('');
  const [status, setStatus] = useState('');
  const [observacao, setObservacao] = useState('');
  // Valor: pré-calculado pelo total, mas editável. Segue o total até o usuário editar.
  const [valorStr, setValorStr] = useState('');
  const [valorTocado, setValorTocado] = useState(false);
  // Etapa 2: só aparece após registrar no formulário
  const [formEnviado, setFormEnviado] = useState(false);
  const [mensagemEditavel, setMensagemEditavel] = useState('');
  const [mensagemTocada, setMensagemTocada] = useState(false);

  useEffect(() => { if (vendedorPadrao && !vendedor) setVendedor(matchVendedorForm(vendedorPadrao)); }, [vendedorPadrao]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => { if (!valorTocado) setValorStr(total.toFixed(2).replace('.', ',')); }, [total, valorTocado]);
  useEffect(() => {
    if (!open) {
      setValorTocado(false);
      setFormEnviado(false);
      setMensagemTocada(false);
      setMensagemEditavel('');
    }
  }, [open]);

  const mensagemGerada = useMemo(() => {
    const partes: string[] = [];
    if (nomeCliente.trim()) partes.push(`Olá, ${nomeCliente.trim()}! Segue seu orçamento Kaowz:`, '');
    partes.push(texto);
    partes.push('', 'Qualquer dúvida estou à disposição!', '📞 Contato Kaowz: (28) 9902-5695');
    if (vendedor.trim()) partes.push(`— ${vendedor.trim()} · Kaowz`);
    return partes.join('\n');
  }, [nomeCliente, vendedor, texto]);

  // Enquanto o usuário não editar, a mensagem edit segue a versão gerada.
  useEffect(() => { if (!mensagemTocada) setMensagemEditavel(mensagemGerada); }, [mensagemGerada, mensagemTocada]);
  const mensagem = mensagemEditavel;

  const telefoneDigits = telefone.replace(/\D/g, '');
  const telefoneValido = telefoneDigits.length >= 10 && telefoneDigits.length <= 13;

  const copiar = async () => {
    try { await navigator.clipboard.writeText(mensagem); toast.success('Orçamento copiado!'); }
    catch { toast.error('Não foi possível copiar'); }
  };

  const whatsappUrl = useMemo(() => {
    const numero = telefoneDigits.length <= 11 ? `55${telefoneDigits}` : telefoneDigits;
    return `https://wa.me/${numero}?text=${encodeURIComponent(mensagem)}`;
  }, [telefoneDigits, mensagem]);

  // URL do formulário "Shot Fair" já preenchido com a montagem do pedido.
  // Renderizado como link real (<a>) — abre nativamente, sem popup-blocker.
  const formUrl = useMemo(() => {
    const telFmt = telefoneDigits
      ? (telefoneDigits.length === 11 ? `(${telefoneDigits.slice(0, 2)}) ${telefoneDigits.slice(2, 7)}-${telefoneDigits.slice(7)}` : telefone)
      : '';
    return urlFormPreenchido({
      cliente: nomeCliente.trim(),
      telefone: telFmt,
      pedido: texto,               // a montagem do pedido (Item 1, Item 2, Total)
      valor: valorParaForm(valorStr), // número p/ planilha: sem R$, sem ponto de milhar
      pagamento: FORM_PAGAMENTOS.includes(pagamento) ? pagamento : '',
      status: FORM_STATUS.includes(status) ? status : '',
      observacao: observacao.trim(),
      vendedor: FORM_VENDEDORES.includes(vendedor) ? vendedor : '',
    });
  }, [nomeCliente, telefone, telefoneDigits, texto, valorStr, pagamento, status, observacao, vendedor]);

  const podeRegistrar = !!nomeCliente.trim();

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto rounded-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <MessageCircle className="h-5 w-5 text-accent" /> Enviar orçamento
          </DialogTitle>
          <DialogDescription>
            Envie ao cliente pelo WhatsApp e/ou registre a venda no formulário.
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
                <Label className="text-xs">Vendedor</Label>
                <Select value={vendedor} onValueChange={setVendedor}>
                  <SelectTrigger className="h-10"><SelectValue placeholder="Selecione" /></SelectTrigger>
                  <SelectContent>
                    {FORM_VENDEDORES.map((v) => <SelectItem key={v} value={v}>{v}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>

          {/* ── Etapa 1: Registrar venda no formulário Shot Fair ── */}
          <div className="rounded-xl border border-dashed p-3 space-y-3">
            <div className="flex items-center gap-2">
              <ClipboardCheck className="h-4 w-4 text-primary" />
              <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">1. Registrar venda</span>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="orc-valor" className="text-xs">Valor (editável)</Label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">R$</span>
                <Input id="orc-valor" value={valorStr} inputMode="decimal"
                  onChange={(e) => { setValorTocado(true); setValorStr(e.target.value); }}
                  onBlur={() => setValorStr(parseValor(valorStr).toFixed(2).replace('.', ','))}
                  placeholder="0,00" className="h-10 pl-9 tabular-nums font-semibold" />
              </div>
              <p className="text-[10px] text-muted-foreground">
                Pré-calculado pelo total. Vai para a planilha como número (sem R$ nem ponto de milhar).
              </p>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs">Pagamento</Label>
                <Select value={pagamento} onValueChange={setPagamento}>
                  <SelectTrigger className="h-10"><SelectValue placeholder="—" /></SelectTrigger>
                  <SelectContent>
                    {FORM_PAGAMENTOS.map((v) => <SelectItem key={v} value={v}>{v}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Status</Label>
                <Select value={status} onValueChange={setStatus}>
                  <SelectTrigger className="h-10"><SelectValue placeholder="—" /></SelectTrigger>
                  <SelectContent>
                    {FORM_STATUS.map((v) => <SelectItem key={v} value={v}>{v}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="orc-obs" className="text-xs">Observação</Label>
              <Textarea id="orc-obs" value={observacao} onChange={(e) => setObservacao(e.target.value)}
                placeholder="Ex: gravação, prazo, brinde, detalhes do pedido..." rows={3} className="text-sm resize-none" />
            </div>
            {podeRegistrar ? (
              <Button asChild className="w-full h-11 rounded-xl gap-2 bg-primary hover:bg-primary/90 text-primary-foreground">
                <a href={formUrl} target="_blank" rel="noopener noreferrer"
                  onClick={() => { setFormEnviado(true); toast.success('Formulário aberto — agora envie a mensagem ao cliente.'); }}>
                  <ClipboardCheck className="h-4 w-4" /> Registrar no formulário
                </a>
              </Button>
            ) : (
              <Button className="w-full h-11 rounded-xl gap-2" disabled>
                <ClipboardCheck className="h-4 w-4" /> Registrar no formulário
              </Button>
            )}
            <p className="text-[11px] text-muted-foreground text-center">
              Abre o formulário Shot Fair já preenchido — é só conferir e enviar.
            </p>
          </div>

          {/* ── Etapa 2: Mensagem editável + WhatsApp (sempre visível, envie após registrar) ── */}
          <div className={`rounded-xl border-2 p-3 space-y-3 transition-colors ${formEnviado ? 'border-accent/40 bg-accent/5' : 'border-border bg-muted/20'}`}>
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <MessageCircle className="h-4 w-4 text-accent" />
                <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">2. Enviar ao cliente</span>
              </div>
              {mensagemTocada && (
                <button type="button" onClick={() => { setMensagemTocada(false); toast.info('Mensagem restaurada'); }}
                  className="text-[10px] text-muted-foreground hover:text-foreground underline">
                  restaurar
                </button>
              )}
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="orc-msg" className="text-xs">Mensagem (editável)</Label>
              <Textarea id="orc-msg" value={mensagemEditavel}
                onChange={(e) => { setMensagemTocada(true); setMensagemEditavel(e.target.value); }}
                rows={10} className="text-xs font-sans leading-relaxed resize-y" />
            </div>
            <div className="grid grid-cols-2 gap-2">
              <Button variant="outline" className="h-11 rounded-xl gap-2" onClick={copiar}>
                <Copy className="h-4 w-4" /> Copiar
              </Button>
              {telefoneValido ? (
                <Button asChild className="h-11 rounded-xl gap-2 bg-accent hover:bg-accent/90 text-accent-foreground">
                  <a href={whatsappUrl} target="_blank" rel="noopener noreferrer">
                    <Send className="h-4 w-4" /> WhatsApp
                  </a>
                </Button>
              ) : (
                <Button disabled className="h-11 rounded-xl gap-2 bg-accent text-accent-foreground">
                  <Send className="h-4 w-4" /> WhatsApp
                </Button>
              )}
            </div>
            {!telefoneValido ? (
              <p className="text-[11px] text-muted-foreground text-center">
                Digite o WhatsApp do cliente acima com DDD para habilitar o envio.
              </p>
            ) : !formEnviado && (
              <p className="text-[11px] text-muted-foreground text-center">
                Recomendado: registre a venda no formulário acima antes de enviar.
              </p>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

/* ════════════════ Página ════════════════ */

export default function SimuladorPrecos() {
  const { profile } = useAuth();
  const { data, isLoading } = useSimuladorConfig();
  const [entries, setEntries] = useState<PedidoEntry[]>([]);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [customOpen, setCustomOpen] = useState(false);

  const addFaca = () => { const e = novaEntradaFaca(); setEntries((p) => [...p, e]); setExpandedId(e.id); };
  const addAvulso = (adicionalIdx: number) => {
    setEntries((p) => [...p, novaEntradaAvulso(adicionalIdx)]);
    if (navigator.vibrate) navigator.vibrate(15);
    toast.success('Item adicionado!');
  };

  const duplicateItem = (id: string) => {
    setEntries((p) => {
      const src = p.find((e) => e.id === id);
      if (!src || src.kind !== 'faca') return p;
      const copia: PedidoEntry = { id: crypto.randomUUID(), kind: 'faca', faca: { ...src.faca, id: crypto.randomUUID() } };
      const idx = p.findIndex((e) => e.id === id);
      const n = [...p];
      n.splice(idx + 1, 0, copia);
      setExpandedId(copia.id);
      return n;
    });
    if (navigator.vibrate) navigator.vibrate(15);
  };
  const removeEntry = (id: string) => setEntries((p) => {
    const n = p.filter((e) => e.id !== id);
    if (expandedId === id) setExpandedId(null);
    return n;
  });
  const updateFaca = (id: string, u: ItemCfg) => setEntries((p) => p.map((e) => (e.id === id ? { ...e, faca: u } : e)));
  const updateAvulso = (id: string, u: import('@/lib/simuladorData').AvulsoCfg) =>
    setEntries((p) => p.map((e) => (e.id === id ? { ...e, avulso: u } : e)));

  const totalGeral = useMemo(() => entries.reduce((s, e) => s + calcEntry(data, e), 0), [entries, data]);
  const itensValidos = entries.filter((e) => e.kind === 'avulso' || e.kind === 'custom' || (e.kind === 'faca' && e.faca.modeloIdx !== null)).length;
  const orcamento = useMemo(() => gerarOrcamento(data, entries, totalGeral), [data, entries, totalGeral]);

  const copiarRapido = async () => {
    try { await navigator.clipboard.writeText(orcamento); toast.success('Orçamento copiado!'); }
    catch { toast.error('Erro ao copiar'); }
  };

  // Limpa tudo — reinicia sem itens
  const limparTudo = () => {
    setEntries([]);
    setExpandedId(null);
    if (navigator.vibrate) navigator.vibrate(20);
    toast.success('Limpo! Configurações resetadas.');
  };

  return (
    <div className="max-w-lg mx-auto py-4 px-1 sm:px-4 space-y-4 pb-44 md:pb-28">
      <div className="flex items-center gap-3 mb-1">
        <Calculator className="h-5 w-5 text-primary" />
        <div>
          <h1 className="text-lg font-bold leading-tight">Simulador de Preços</h1>
          <p className="text-[11px] text-muted-foreground leading-tight">Base: Aço Inox + Empunhadura Grafite inclusos</p>
        </div>
        {isLoading && <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />}
        {entries.length > 0 && (
          <button type="button" onClick={limparTudo} title="Limpar seleções"
            className="ml-auto flex items-center gap-1 h-9 px-2.5 rounded-xl border border-border bg-background hover:bg-muted active:scale-95 transition-all">
            <Eraser className="h-4 w-4 text-muted-foreground" />
            <span aria-hidden className="text-base leading-none">{"\n"}</span>
          </button>
        )}
      </div>

      {/* Dois cards de entrada — mobile first, minimalista */}
      <div className="grid grid-cols-2 gap-3">
        <button type="button" onClick={addFaca}
          className="group flex flex-col items-center justify-center gap-2 rounded-2xl border-2 border-primary/20 bg-primary/5 p-5 text-center transition-all hover:border-primary/40 hover:bg-primary/10 active:scale-[0.97]">
          <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-primary text-primary-foreground shadow-sm">
            <Hammer className="h-5 w-5" />
          </span>
          <span className="text-sm font-bold leading-tight">Montar Faca</span>
          <span className="text-[10px] text-muted-foreground leading-tight">
            {entries.some(e => e.kind === 'faca')
              ? 'Clique para adicionar mais uma faca'
              : 'Clique para adicionar uma faca'}
          </span>
        </button>
        <button type="button" onClick={() => setPickerOpen(true)}
          className="group flex flex-col items-center justify-center gap-2 rounded-2xl border-2 border-accent/20 bg-accent/5 p-5 text-center transition-all hover:border-accent/40 hover:bg-accent/10 active:scale-[0.97]">
          <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-accent text-accent-foreground shadow-sm">
            <PackagePlus className="h-5 w-5" />
          </span>
          <span className="text-sm font-bold leading-tight">Item à parte</span>
          <span className="text-[10px] text-muted-foreground leading-tight">
            {entries.some(e => e.kind === 'avulso')
              ? 'Clique para adicionar mais um item'
              : 'Clique para adicionar um item'}
          </span>
        </button>
      </div>

      {entries.length > 0 && (
        <div className="space-y-3">
          {entries.map((e, idx) => {
            if (e.kind === 'faca') return (
              <ItemCard key={e.id} data={data} cfg={e.faca} index={idx}
                onChange={(u) => updateFaca(e.id, u)}
                onRemove={() => removeEntry(e.id)}
                onDuplicate={() => duplicateItem(e.id)}
                removivel
                expanded={expandedId === e.id}
                onToggle={() => setExpandedId(expandedId === e.id ? null : e.id)} />
            );
            if (e.kind === 'avulso') return (
              <AvulsoRow key={e.id} data={data} cfg={e.avulso}
                onChange={(u) => updateAvulso(e.id, u)}
                onRemove={() => removeEntry(e.id)} />
            );
            return (
              <CustomRow key={e.id} cfg={e.custom}
                onChange={(u) => updateCustom(e.id, u)}
                onRemove={() => removeEntry(e.id)} />
            );
          })}
        </div>
      )}

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
            <ClipboardCheck className="h-4 w-4" /> Enviar formulário
          </Button>
        </div>
      </div>

      <AvulsoPickerDialog open={pickerOpen} onOpenChange={setPickerOpen} data={data} onPick={addAvulso} />

      <OrcamentoModal open={modalOpen} onOpenChange={setModalOpen} texto={orcamento} total={totalGeral}
        vendedorPadrao={profile?.nome_vendedor ?? ''} />
    </div>
  );
}
