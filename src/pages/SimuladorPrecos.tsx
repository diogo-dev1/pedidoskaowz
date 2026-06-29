import { useMemo, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Calculator, Plus, Trash2, Copy, MessageCircle, ChevronDown, ChevronUp } from 'lucide-react';
import { toast } from 'sonner';

// ─── Dados da planilha de preços ───

type Tamanho = 'P' | 'M' | 'G' | '-';

interface Modelo { nome: string; tamanho: Tamanho; preco: number | null; }
interface Componente { nome: string; preco: number; }

const MODELOS: Modelo[] = [
  { nome: 'Edc - Mini', tamanho: 'P', preco: 465 },
  { nome: 'Edc Mini Reverse Tanto', tamanho: 'P', preco: 465 },
  { nome: 'Edc', tamanho: 'P', preco: 575 },
  { nome: 'Edc Reverse Tanto', tamanho: 'P', preco: null },
  { nome: 'Edc Tanto', tamanho: 'P', preco: 630 },
  { nome: 'Edc Ring', tamanho: 'P', preco: 610 },
  { nome: 'Edc Ring Tanto', tamanho: 'P', preco: 685 },
  { nome: 'Edc Mini Tanto', tamanho: 'P', preco: 590 },
  { nome: 'Edc Mini Wharncliffe', tamanho: 'P', preco: 590 },
  { nome: 'Edc Wharncliffe', tamanho: 'P', preco: 655 },
  { nome: 'Ring Tanto', tamanho: 'P', preco: 780 },
  { nome: 'Wharncliffe', tamanho: 'P', preco: 750 },
  { nome: 'Adaga Edc', tamanho: 'P', preco: 685 },
  { nome: 'Push Dagger SVK G10', tamanho: 'P', preco: 935 },
  { nome: 'Adaga Full Size', tamanho: 'M', preco: 800 },
  { nome: 'Jagunço', tamanho: 'M', preco: 760 },
  { nome: 'Jagunço Tanto', tamanho: 'M', preco: null },
  { nome: 'Kzr Nimbus', tamanho: 'M', preco: 720 },
  { nome: 'Kzr Nimbus Tanto', tamanho: 'M', preco: null },
  { nome: 'Kzr Elite - Knight', tamanho: 'M', preco: 780 },
  { nome: 'Defcon 1', tamanho: 'M', preco: null },
  { nome: 'Defcon 2', tamanho: 'M', preco: null },
  { nome: 'Mini Camp', tamanho: 'M', preco: null },
  { nome: 'Kzr Full Size', tamanho: 'G', preco: 715 },
  { nome: 'Camp', tamanho: 'G', preco: 800 },
  { nome: 'Kzr Nimbowie', tamanho: 'G', preco: 1185 },
  { nome: 'Big Camp', tamanho: 'G', preco: 1575 },
  { nome: 'Big Camp 40 cm', tamanho: 'G', preco: null },
  { nome: 'Kzr Big Nimbowie', tamanho: 'G', preco: 1575 },
  { nome: 'Kzr Big Nimbowie 40cm', tamanho: 'G', preco: null },
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
  P: [{ nome: 'G10', preco: 115 }, { nome: 'Espaçador', preco: 70 }, { nome: 'Imbuia', preco: 80 }, { nome: 'Dragon Scale', preco: 70 }],
  M: [{ nome: 'G10', preco: 145 }, { nome: 'Imbuia', preco: 100 }, { nome: 'Dragon Scale', preco: 70 }],
  G: [{ nome: 'G10', preco: 145 }, { nome: 'Espaçador', preco: 90 }, { nome: 'Imbuia', preco: 100 }, { nome: 'Dragon Scale', preco: 70 }],
};

const ACABAMENTOS: Record<string, Componente[]> = {
  P: [{ nome: 'Acetinado', preco: 0 }, { nome: 'Stone Washed', preco: 25 }, { nome: 'Tactical', preco: 90 }, { nome: 'Brute Forge', preco: 125 }],
  M: [{ nome: 'Acetinado', preco: 0 }, { nome: 'Stone Washed', preco: 25 }, { nome: 'Tactical', preco: 90 }, { nome: 'Brute Forge', preco: 125 }],
  G: [{ nome: 'Acetinado', preco: 0 }, { nome: 'Stone Washed', preco: 35 }, { nome: 'Tactical', preco: 125 }, { nome: 'Brute Forge', preco: 300 }],
};

const BAINHAS: Record<string, Componente[]> = {
  P: [{ nome: 'Preta (inclusa)', preco: 0 }, { nome: 'Colorida', preco: 195 }, { nome: 'Adicional', preco: 195 }],
  M: [{ nome: 'Preta (inclusa)', preco: 0 }, { nome: 'Colorida', preco: 195 }, { nome: 'Adicional', preco: 195 }],
  G: [{ nome: 'Preta (inclusa)', preco: 0 }, { nome: 'Colorida', preco: 250 }, { nome: 'Adicional', preco: 250 }],
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
const TAMANHO_CORES: Record<Tamanho, string> = { P: 'bg-blue-500', M: 'bg-amber-500', G: 'bg-red-500', '-': 'bg-zinc-500' };
const TAMANHO_LABEL: Record<Tamanho, string> = { P: 'P', M: 'M', G: 'G', '-': '-' };

interface Config {
  id: string;
  modeloIdx: number | null;
  acoIdx: number | null;
  empunhaduraIdx: number | null;
  acabamentoIdx: number | null;
  bainhaIdx: number | null;
  adicionais: Set<number>;
}

function newConfig(): Config {
  return { id: crypto.randomUUID(), modeloIdx: null, acoIdx: null, empunhaduraIdx: null, acabamentoIdx: null, bainhaIdx: null, adicionais: new Set() };
}

function calcTotal(cfg: Config): number {
  let total = 0;
  const modelo = cfg.modeloIdx !== null ? MODELOS[cfg.modeloIdx] : null;
  if (modelo?.preco) total += modelo.preco;
  const tam = modelo?.tamanho === '-' ? 'P' : (modelo?.tamanho || 'P');
  if (cfg.acoIdx !== null) total += ACOS[tam]?.[cfg.acoIdx]?.preco ?? 0;
  if (cfg.empunhaduraIdx !== null) total += EMPUNHADURAS[tam]?.[cfg.empunhaduraIdx]?.preco ?? 0;
  if (cfg.acabamentoIdx !== null) total += ACABAMENTOS[tam]?.[cfg.acabamentoIdx]?.preco ?? 0;
  if (cfg.bainhaIdx !== null) total += BAINHAS[tam]?.[cfg.bainhaIdx]?.preco ?? 0;
  cfg.adicionais.forEach((i) => { total += ADICIONAIS[i]?.preco ?? 0; });
  return total;
}

// ─── Componente: botão de opção ───
function OptBtn({ label, price, selected, onClick, disabled }: {
  label: string; price?: number | null; selected: boolean; onClick: () => void; disabled?: boolean;
}) {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onClick}
      className={`
        text-left px-3 py-2.5 rounded-lg border transition-all w-full
        ${selected
          ? 'border-primary bg-primary/10 ring-1 ring-primary'
          : disabled
            ? 'border-border opacity-40 cursor-not-allowed'
            : 'border-border hover:border-primary/40 hover:bg-muted/50 active:scale-[0.98]'}
      `}
    >
      <div className="flex items-center justify-between gap-2">
        <span className={`text-sm font-medium ${selected ? 'text-primary' : ''}`}>{label}</span>
        {price !== undefined && price !== null && (
          <span className={`text-xs font-semibold flex-shrink-0 ${selected ? 'text-primary' : 'text-muted-foreground'}`}>
            {price === 0 ? 'incluso' : `+${BRL(price)}`}
          </span>
        )}
        {price === null && <span className="text-[10px] text-muted-foreground">indisponível</span>}
      </div>
    </button>
  );
}

// ─── Seção de opções com título ───
function Section({ title, step, children }: { title: string; step: number; children: React.ReactNode }) {
  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2">
        <span className="w-6 h-6 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-xs font-bold flex-shrink-0">{step}</span>
        <span className="text-sm font-semibold">{title}</span>
      </div>
      <div className="grid gap-1.5">{children}</div>
    </div>
  );
}

// ─── Card de configuração ───
function ConfigCard({ cfg, onChange, onRemove, index, expanded, onToggle }: {
  cfg: Config; onChange: (c: Config) => void; onRemove: () => void; index: number; expanded: boolean; onToggle: () => void;
}) {
  const modelo = cfg.modeloIdx !== null ? MODELOS[cfg.modeloIdx] : null;
  const tam = modelo?.tamanho === '-' ? 'P' : (modelo?.tamanho || 'P');
  const total = calcTotal(cfg);
  const isNT = modelo?.preco === null;

  const acos = ACOS[tam] || [];
  const emps = EMPUNHADURAS[tam] || [];
  const acabs = ACABAMENTOS[tam] || [];
  const bainhas = BAINHAS[tam] || [];

  // Resumo da config
  const resumoParts = [
    modelo?.nome,
    cfg.acoIdx !== null ? acos[cfg.acoIdx]?.nome : null,
    cfg.empunhaduraIdx !== null ? emps[cfg.empunhaduraIdx]?.nome : null,
    cfg.acabamentoIdx !== null ? acabs[cfg.acabamentoIdx]?.nome : null,
  ].filter(Boolean);

  return (
    <div className="border rounded-xl overflow-hidden bg-card">
      {/* Header (sempre visível — clicável para expandir/colapsar) */}
      <button type="button" onClick={onToggle} className="w-full p-4 flex items-center gap-3 hover:bg-muted/30 transition-colors">
        <span className="w-8 h-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-sm font-bold flex-shrink-0">
          {index + 1}
        </span>
        <div className="flex-1 text-left min-w-0">
          <p className="font-semibold text-sm truncate">
            {modelo ? modelo.nome : 'Selecione um modelo'}
          </p>
          {modelo && !isNT && (
            <p className="text-xs text-muted-foreground truncate">
              {resumoParts.slice(1).join(' · ') || 'Configure os componentes'}
            </p>
          )}
        </div>
        {modelo && !isNT && (
          <span className="text-base font-bold text-primary flex-shrink-0">{BRL(total)}</span>
        )}
        {expanded ? <ChevronUp className="h-4 w-4 text-muted-foreground flex-shrink-0" /> : <ChevronDown className="h-4 w-4 text-muted-foreground flex-shrink-0" />}
      </button>

      {/* Corpo expandido */}
      {expanded && (
        <div className="px-4 pb-4 space-y-5 border-t">
          {/* Passo 1: Modelo */}
          <div className="pt-4">
            <Section title="Escolha o modelo" step={1}>
              {/* Agrupados por tamanho */}
              {(['P', 'M', 'G', '-'] as Tamanho[]).map((t) => {
                const modelos = MODELOS.filter((m) => m.tamanho === t);
                if (modelos.length === 0) return null;
                return (
                  <div key={t}>
                    <div className="flex items-center gap-1.5 mb-1 mt-2">
                      <span className={`w-2 h-2 rounded-full ${TAMANHO_CORES[t]}`} />
                      <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">
                        {t === '-' ? 'Outros' : `Tamanho ${TAMANHO_LABEL[t]}`}
                      </span>
                    </div>
                    <div className="grid gap-1">
                      {modelos.map((m) => {
                        const idx = MODELOS.indexOf(m);
                        return (
                          <OptBtn
                            key={idx}
                            label={m.nome}
                            price={m.preco}
                            selected={cfg.modeloIdx === idx}
                            disabled={m.preco === null}
                            onClick={() => onChange({ ...cfg, modeloIdx: idx, acoIdx: null, empunhaduraIdx: null, acabamentoIdx: null, bainhaIdx: null })}
                          />
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </Section>
          </div>

          {modelo && !isNT && (
            <>
              {/* Passo 2: Aço */}
              {acos.length > 0 && (
                <Section title="Aço da lâmina" step={2}>
                  {acos.map((a, i) => (
                    <OptBtn key={i} label={a.nome} price={a.preco} selected={cfg.acoIdx === i} onClick={() => onChange({ ...cfg, acoIdx: i })} />
                  ))}
                </Section>
              )}

              {/* Passo 3: Empunhadura */}
              {emps.length > 0 && (
                <Section title="Empunhadura" step={3}>
                  {emps.map((e, i) => (
                    <OptBtn key={i} label={e.nome} price={e.preco} selected={cfg.empunhaduraIdx === i} onClick={() => onChange({ ...cfg, empunhaduraIdx: i })} />
                  ))}
                </Section>
              )}

              {/* Passo 4: Acabamento */}
              {acabs.length > 0 && (
                <Section title="Acabamento" step={4}>
                  <div className="grid grid-cols-2 gap-1.5">
                    {acabs.map((a, i) => (
                      <OptBtn key={i} label={a.nome} price={a.preco} selected={cfg.acabamentoIdx === i} onClick={() => onChange({ ...cfg, acabamentoIdx: i })} />
                    ))}
                  </div>
                </Section>
              )}

              {/* Passo 5: Bainha */}
              {bainhas.length > 0 && (
                <Section title="Bainha" step={5}>
                  {bainhas.map((b, i) => (
                    <OptBtn key={i} label={b.nome} price={b.preco} selected={cfg.bainhaIdx === i} onClick={() => onChange({ ...cfg, bainhaIdx: i })} />
                  ))}
                </Section>
              )}

              {/* Passo 6: Adicionais */}
              <Section title="Adicionais" step={6}>
                <div className="grid grid-cols-1 gap-1">
                  {ADICIONAIS.map((a, i) => {
                    const checked = cfg.adicionais.has(i);
                    return (
                      <label
                        key={i}
                        className={`flex items-center gap-3 px-3 py-2 rounded-lg border cursor-pointer transition-all ${checked ? 'border-primary bg-primary/5' : 'border-border hover:bg-muted/30'}`}
                      >
                        <Checkbox
                          checked={checked}
                          onCheckedChange={(v) => {
                            const next = new Set(cfg.adicionais);
                            if (v) next.add(i); else next.delete(i);
                            onChange({ ...cfg, adicionais: next });
                          }}
                        />
                        <span className={`flex-1 text-sm ${checked ? 'font-medium' : ''}`}>{a.nome}</span>
                        <span className={`text-xs font-semibold flex-shrink-0 ${checked ? 'text-primary' : 'text-muted-foreground'}`}>{BRL(a.preco)}</span>
                      </label>
                    );
                  })}
                </div>
              </Section>

              {/* Total da configuração */}
              <div className="flex items-center justify-between p-3 rounded-lg bg-primary/5 border border-primary/20">
                <span className="text-sm font-semibold">Total desta faca</span>
                <span className="text-xl font-bold text-primary">{BRL(total)}</span>
              </div>
            </>
          )}

          {/* Botão remover */}
          <Button variant="ghost" size="sm" className="w-full text-destructive hover:text-destructive gap-2" onClick={onRemove}>
            <Trash2 className="h-3.5 w-3.5" /> Remover esta configuração
          </Button>
        </div>
      )}
    </div>
  );
}

// ─── Página principal ───

export default function SimuladorPrecos() {
  const [configs, setConfigs] = useState<Config[]>([newConfig()]);
  const [expandedId, setExpandedId] = useState<string | null>(configs[0]?.id ?? null);

  const addConfig = () => {
    const c = newConfig();
    setConfigs((prev) => [...prev, c]);
    setExpandedId(c.id);
  };
  const removeConfig = (id: string) => {
    setConfigs((prev) => {
      if (prev.length <= 1) return prev;
      const next = prev.filter((c) => c.id !== id);
      if (expandedId === id) setExpandedId(next[0]?.id ?? null);
      return next;
    });
  };
  const updateConfig = (id: string, updated: Config) => setConfigs((prev) => prev.map((c) => c.id === id ? updated : c));

  const totalGeral = useMemo(() => configs.reduce((sum, cfg) => sum + calcTotal(cfg), 0), [configs]);

  const gerarTexto = () => {
    const lines: string[] = ['*Simulação de Preço — Kaowz Facas*', ''];
    configs.forEach((cfg, idx) => {
      const modelo = cfg.modeloIdx !== null ? MODELOS[cfg.modeloIdx] : null;
      if (!modelo || modelo.preco === null) return;
      const tam = modelo.tamanho === '-' ? 'P' : modelo.tamanho;
      const total = calcTotal(cfg);
      lines.push(`*${idx + 1}. ${modelo.nome}*`);
      if (cfg.acoIdx !== null) lines.push(`   Aço: ${ACOS[tam]?.[cfg.acoIdx]?.nome || '—'}`);
      if (cfg.empunhaduraIdx !== null) lines.push(`   Empunhadura: ${EMPUNHADURAS[tam]?.[cfg.empunhaduraIdx]?.nome || '—'}`);
      if (cfg.acabamentoIdx !== null) lines.push(`   Acabamento: ${ACABAMENTOS[tam]?.[cfg.acabamentoIdx]?.nome || '—'}`);
      if (cfg.bainhaIdx !== null) { const b = BAINHAS[tam]?.[cfg.bainhaIdx]; if (b && b.preco > 0) lines.push(`   Bainha: ${b.nome}`); }
      cfg.adicionais.forEach((i) => lines.push(`   + ${ADICIONAIS[i]?.nome}`));
      lines.push(`   *Subtotal: ${BRL(total)}*`);
      lines.push('');
    });
    if (configs.length > 1) lines.push(`*Total Geral: ${BRL(totalGeral)}*`);
    return lines.join('\n');
  };

  const copiarTexto = async () => {
    try { await navigator.clipboard.writeText(gerarTexto()); toast.success('Simulação copiada!'); }
    catch { toast.error('Não foi possível copiar'); }
  };

  const enviarWhatsApp = () => {
    window.open(`https://wa.me/?text=${encodeURIComponent(gerarTexto())}`, '_blank');
  };

  return (
    <div className="max-w-lg mx-auto py-4 px-4 space-y-4 pb-32">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Calculator className="h-6 w-6 text-primary" />
        <div>
          <h1 className="text-lg font-bold">Simulador de Preços</h1>
          <p className="text-xs text-muted-foreground">Monte a faca e veja o valor</p>
        </div>
      </div>

      {/* Lista de configurações (accordion) */}
      <div className="space-y-3">
        {configs.map((cfg, idx) => (
          <ConfigCard
            key={cfg.id}
            cfg={cfg}
            index={idx}
            onChange={(updated) => updateConfig(cfg.id, updated)}
            onRemove={() => removeConfig(cfg.id)}
            expanded={expandedId === cfg.id}
            onToggle={() => setExpandedId(expandedId === cfg.id ? null : cfg.id)}
          />
        ))}
      </div>

      {/* Adicionar */}
      <Button variant="outline" className="w-full gap-2" onClick={addConfig}>
        <Plus className="h-4 w-4" /> Adicionar outra faca
      </Button>

      {/* Footer fixo — total + ações */}
      <div className="fixed bottom-0 left-0 right-0 bg-background/95 backdrop-blur-lg border-t px-4 py-3 z-50">
        <div className="max-w-lg mx-auto flex items-center gap-3">
          <div className="flex-1">
            <p className="text-[10px] text-muted-foreground uppercase tracking-wider">
              {configs.length} {configs.length === 1 ? 'faca' : 'facas'}
            </p>
            <p className="text-xl font-bold text-primary leading-tight">{BRL(totalGeral)}</p>
          </div>
          <Button variant="outline" size="icon" className="h-10 w-10 flex-shrink-0" onClick={copiarTexto} title="Copiar">
            <Copy className="h-4 w-4" />
          </Button>
          <Button className="gap-2 h-10 flex-shrink-0" onClick={enviarWhatsApp}>
            <MessageCircle className="h-4 w-4" /> WhatsApp
          </Button>
        </div>
      </div>
    </div>
  );
}
