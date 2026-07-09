import { useMemo, useState, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import {
  Calculator, Plus, Trash2, Copy, MessageCircle, Search, X,
  ChevronDown, ChevronUp, CopyPlus, Send, Loader2, Check,
} from 'lucide-react';
import { toast } from 'sonner';
import { useAuth } from '@/contexts/AuthContext';
import { useSimuladorConfig } from '@/hooks/useSimuladorConfig';
import {
  BRL, TAM_DOT, newItem, precoClasse, classeDo, calcItem, gerarOrcamento,
  type SimuladorData, type ItemCfg, type Modelo, type Opcao,
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
  const [showAdicionais, setShowAdicionais] = useState(false);

  const nomeOpt = (arr: Opcao[], idx: number, sufixo = '') =>
    arr[idx] && !arr[idx].incluso ? arr[idx].nome + sufixo : (sufixo ? arr[idx]?.nome + sufixo : null);

  const specs = modelo ? [
    nomeOpt(data.acos, cfg.acoIdx) ?? (cfg.bruteForge ? data.acos[cfg.acoIdx]?.nome : null),
    cfg.bruteForge ? 'BF' : null,
    nomeOpt(data.empunhaduras, cfg.empIdx) ?? (cfg.dragonScale ? data.empunhaduras[cfg.empIdx]?.nome : null),
    cfg.dragonScale ? 'DS' : null,
    nomeOpt(data.acabamentos, cfg.acabIdx),
    nomeOpt(data.bainhas, cfg.bainhaIdx),
    cfg.adicionais.size > 0 ? `${cfg.adicionais.size} adic.` : null,
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
              onSelect={(i) => onChange({ ...newItem(), id: cfg.id, modeloIdx: i, adicionais: cfg.adicionais })} />
          </Secao>

          {modelo && (
            <>
              {/* Aço — Brute Forge é opcional do aço */}
              <Secao title="Aço">
                <div className="flex flex-wrap gap-1.5">
                  {data.acos.map((a, i) => (
                    <Chip key={i} label={a.nome} price={precoClasse(a.precos, c)}
                      selected={cfg.acoIdx === i} onClick={() => onChange({ ...cfg, acoIdx: i })} />
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
                      selected={cfg.empIdx === i} onClick={() => onChange({ ...cfg, empIdx: i })} />
                  ))}
                  <ToggleChip label="Dragon Scale" price={precoClasse(data.dragonScale, c)} on={cfg.dragonScale}
                    onClick={() => onChange({ ...cfg, dragonScale: !cfg.dragonScale })} />
                </div>
              </Secao>

              <Secao title="Acabamento">
                <div className="flex flex-wrap gap-1.5">
                  {data.acabamentos.map((a, i) => (
                    <Chip key={i} label={a.nome} price={precoClasse(a.precos, c)}
                      selected={cfg.acabIdx === i} onClick={() => onChange({ ...cfg, acabIdx: i })} />
                  ))}
                </div>
              </Secao>

              <Secao title="Bainha">
                <div className="flex flex-wrap gap-1.5">
                  {data.bainhas.map((b, i) => (
                    <Chip key={i} label={b.nome} price={precoClasse(b.precos, c)}
                      selected={cfg.bainhaIdx === i} onClick={() => onChange({ ...cfg, bainhaIdx: i })} />
                  ))}
                </div>
              </Secao>

              <Secao title="Adicionais">
                <button type="button" onClick={() => setShowAdicionais(!showAdicionais)}
                  className="flex items-center gap-2 text-xs text-primary font-medium hover:underline">
                  {showAdicionais ? 'Ocultar' : `Ver ${data.adicionais.length} opções`}
                  {cfg.adicionais.size > 0 && <span className="bg-accent text-accent-foreground text-[10px] font-bold px-1.5 py-0.5 rounded-full">{cfg.adicionais.size}</span>}
                  {showAdicionais ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                </button>
                {showAdicionais && (
                  <div className="space-y-1 mt-1">
                    {data.adicionais.map((a, i) => {
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
    if (vendedor.trim()) partes.push('', 'Qualquer dúvida estou à disposição!', `— ${vendedor.trim()} · Kaowz`);
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
  const { data, isLoading } = useSimuladorConfig();
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

  const totalGeral = useMemo(() => itens.reduce((s, c) => s + calcItem(data, c), 0), [itens, data]);
  const itensValidos = itens.filter((c) => c.modeloIdx !== null).length;
  const orcamento = useMemo(() => gerarOrcamento(data, itens, totalGeral), [data, itens, totalGeral]);

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
        {isLoading && <Loader2 className="h-4 w-4 animate-spin text-muted-foreground ml-auto" />}
      </div>

      <div className="space-y-3">
        {itens.map((cfg, idx) => (
          <ItemCard key={cfg.id} data={data} cfg={cfg} index={idx}
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
