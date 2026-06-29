import { useMemo, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Separator } from '@/components/ui/separator';
import { Calculator, Plus, Trash2, Copy, MessageCircle } from 'lucide-react';
import { toast } from 'sonner';

// ─── Dados da planilha de preços ───

type Tamanho = 'P' | 'M' | 'G' | '-';

interface Modelo {
  nome: string;
  tamanho: Tamanho;
  preco: number | null; // null = NT (não temos)
}

interface Componente {
  nome: string;
  preco: number;
}

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
  P: [
    { nome: 'Sandvik 14C28N', preco: 165 },
    { nome: '52100', preco: 165 },
  ],
  M: [
    { nome: 'Sandvik 14C28N', preco: 245 },
    { nome: '52100', preco: 245 },
  ],
  G: [
    { nome: 'Sandvik 14C28N', preco: 350 },
    { nome: '52100', preco: 350 },
  ],
};

const EMPUNHADURAS: Record<string, Componente[]> = {
  P: [
    { nome: 'G10', preco: 115 },
    { nome: 'Espaçador', preco: 70 },
    { nome: 'Imbuia', preco: 80 },
    { nome: 'Dragon Scale', preco: 70 },
  ],
  M: [
    { nome: 'G10', preco: 145 },
    { nome: 'Imbuia', preco: 100 },
    { nome: 'Dragon Scale', preco: 70 },
  ],
  G: [
    { nome: 'G10', preco: 145 },
    { nome: 'Espaçador', preco: 90 },
    { nome: 'Imbuia', preco: 100 },
    { nome: 'Dragon Scale', preco: 70 },
  ],
};

const ACABAMENTOS: Record<string, Componente[]> = {
  P: [
    { nome: 'Acetinado', preco: 0 },
    { nome: 'Stone Washed', preco: 25 },
    { nome: 'Tactical', preco: 90 },
    { nome: 'Brute Forge', preco: 125 },
  ],
  M: [
    { nome: 'Acetinado', preco: 0 },
    { nome: 'Stone Washed', preco: 25 },
    { nome: 'Tactical', preco: 90 },
    { nome: 'Brute Forge', preco: 125 },
  ],
  G: [
    { nome: 'Acetinado', preco: 0 },
    { nome: 'Stone Washed', preco: 35 },
    { nome: 'Tactical', preco: 125 },
    { nome: 'Brute Forge', preco: 300 },
  ],
};

const BAINHAS: Record<string, Componente[]> = {
  P: [
    { nome: 'Bainha Preta (inclusa)', preco: 0 },
    { nome: 'Bainha Colorida', preco: 195 },
    { nome: 'Bainha Adicional', preco: 195 },
  ],
  M: [
    { nome: 'Bainha Preta (inclusa)', preco: 0 },
    { nome: 'Bainha Colorida', preco: 195 },
    { nome: 'Bainha Adicional', preco: 195 },
  ],
  G: [
    { nome: 'Bainha Preta (inclusa)', preco: 0 },
    { nome: 'Bainha Colorida', preco: 250 },
    { nome: 'Bainha Adicional', preco: 250 },
  ],
};

const ADICIONAIS: Componente[] = [
  { nome: 'Strop', preco: 95 },
  { nome: 'Café Médio ou Escuro', preco: 45 },
  { nome: 'Clipe Extra', preco: 25 },
  { nome: 'Clipe Lateral', preco: 75 },
  { nome: 'Patch Fluorescente', preco: 55 },
  { nome: 'Patch Cão Pastor', preco: 45 },
  { nome: 'Patch K', preco: 35 },
  { nome: 'BC Churrasco', preco: 200 },
  { nome: 'BC Churrasco Dupla', preco: 270 },
  { nome: 'BC Churrasco Tripla', preco: 370 },
  { nome: 'Passador de Couro', preco: 95 },
  { nome: 'Bainha Couro EDC', preco: 200 },
  { nome: 'Bainha Couro Camp', preco: 350 },
  { nome: 'Bainha Couro Jagunço', preco: 290 },
  { nome: 'Boné', preco: 75 },
  { nome: 'Camisa Kaowz', preco: 170 },
  { nome: 'Moletom', preco: 240 },
];

const BRL = (n: number) =>
  n.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL', minimumFractionDigits: 2 });

const TAMANHO_LABEL: Record<Tamanho, string> = { P: 'Pequeno', M: 'Médio', G: 'Grande', '-': '-' };

// ─── Tipos de configuração ───

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

function calcTotal(cfg: Config): { total: number; breakdown: string[] } {
  const parts: string[] = [];
  let total = 0;
  const modelo = cfg.modeloIdx !== null ? MODELOS[cfg.modeloIdx] : null;
  if (modelo?.preco) { total += modelo.preco; parts.push(`${modelo.nome}: ${BRL(modelo.preco)}`); }
  const tam = modelo?.tamanho === '-' ? 'P' : (modelo?.tamanho || 'P');
  if (cfg.acoIdx !== null) { const a = ACOS[tam]?.[cfg.acoIdx]; if (a) { total += a.preco; parts.push(`${a.nome}: ${BRL(a.preco)}`); } }
  if (cfg.empunhaduraIdx !== null) { const e = EMPUNHADURAS[tam]?.[cfg.empunhaduraIdx]; if (e) { total += e.preco; parts.push(`${e.nome}: ${BRL(e.preco)}`); } }
  if (cfg.acabamentoIdx !== null) { const a = ACABAMENTOS[tam]?.[cfg.acabamentoIdx]; if (a && a.preco > 0) { total += a.preco; parts.push(`${a.nome}: ${BRL(a.preco)}`); } }
  if (cfg.bainhaIdx !== null) { const b = BAINHAS[tam]?.[cfg.bainhaIdx]; if (b && b.preco > 0) { total += b.preco; parts.push(`${b.nome}: ${BRL(b.preco)}`); } }
  cfg.adicionais.forEach((i) => { const a = ADICIONAIS[i]; if (a) { total += a.preco; parts.push(`${a.nome}: ${BRL(a.preco)}`); } });
  return { total, breakdown: parts };
}

// ─── Componente de uma configuração ───

function ConfigCard({ cfg, onChange, onRemove, index }: {
  cfg: Config; onChange: (c: Config) => void; onRemove: () => void; index: number;
}) {
  const modelo = cfg.modeloIdx !== null ? MODELOS[cfg.modeloIdx] : null;
  const tam = modelo?.tamanho === '-' ? 'P' : (modelo?.tamanho || 'P');
  const acos = ACOS[tam] || [];
  const emps = EMPUNHADURAS[tam] || [];
  const acabs = ACABAMENTOS[tam] || [];
  const bainhas = BAINHAS[tam] || [];
  const { total, breakdown } = calcTotal(cfg);

  const isNT = modelo?.preco === null;

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base flex items-center gap-2">
            <span className="bg-primary text-primary-foreground w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold">{index + 1}</span>
            {modelo ? modelo.nome : 'Nova Configuração'}
            {modelo && <Badge variant="secondary" className="text-[10px]">{TAMANHO_LABEL[modelo.tamanho]}</Badge>}
          </CardTitle>
          <Button variant="ghost" size="icon" onClick={onRemove} className="h-8 w-8 text-destructive">
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Modelo */}
        <div>
          <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Modelo</label>
          <Select
            value={cfg.modeloIdx !== null ? String(cfg.modeloIdx) : ''}
            onValueChange={(v) => onChange({ ...cfg, modeloIdx: Number(v), acoIdx: null, empunhaduraIdx: null, acabamentoIdx: null, bainhaIdx: null })}
          >
            <SelectTrigger className="mt-1"><SelectValue placeholder="Selecione o modelo" /></SelectTrigger>
            <SelectContent>
              {MODELOS.map((m, i) => (
                <SelectItem key={i} value={String(i)} disabled={m.preco === null}>
                  {m.nome} ({m.tamanho}) {m.preco !== null ? BRL(m.preco) : '— NT'}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {isNT && (
          <div className="p-3 rounded-lg bg-amber-500/10 border border-amber-500/20 text-sm text-amber-600 dark:text-amber-400">
            Este modelo não está disponível no momento (NT).
          </div>
        )}

        {modelo && !isNT && (
          <>
            {/* Aço */}
            {acos.length > 0 && (
              <div>
                <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Aço</label>
                <Select value={cfg.acoIdx !== null ? String(cfg.acoIdx) : ''} onValueChange={(v) => onChange({ ...cfg, acoIdx: Number(v) })}>
                  <SelectTrigger className="mt-1"><SelectValue placeholder="Selecione o aço" /></SelectTrigger>
                  <SelectContent>
                    {acos.map((a, i) => <SelectItem key={i} value={String(i)}>{a.nome} (+{BRL(a.preco)})</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            )}

            {/* Empunhadura */}
            {emps.length > 0 && (
              <div>
                <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Empunhadura</label>
                <Select value={cfg.empunhaduraIdx !== null ? String(cfg.empunhaduraIdx) : ''} onValueChange={(v) => onChange({ ...cfg, empunhaduraIdx: Number(v) })}>
                  <SelectTrigger className="mt-1"><SelectValue placeholder="Selecione a empunhadura" /></SelectTrigger>
                  <SelectContent>
                    {emps.map((e, i) => <SelectItem key={i} value={String(i)}>{e.nome} (+{BRL(e.preco)})</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            )}

            {/* Acabamento */}
            {acabs.length > 0 && (
              <div>
                <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Acabamento</label>
                <Select value={cfg.acabamentoIdx !== null ? String(cfg.acabamentoIdx) : ''} onValueChange={(v) => onChange({ ...cfg, acabamentoIdx: Number(v) })}>
                  <SelectTrigger className="mt-1"><SelectValue placeholder="Selecione o acabamento" /></SelectTrigger>
                  <SelectContent>
                    {acabs.map((a, i) => <SelectItem key={i} value={String(i)}>{a.nome} {a.preco > 0 ? `(+${BRL(a.preco)})` : '(incluso)'}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            )}

            {/* Bainha */}
            {bainhas.length > 0 && (
              <div>
                <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Bainha</label>
                <Select value={cfg.bainhaIdx !== null ? String(cfg.bainhaIdx) : ''} onValueChange={(v) => onChange({ ...cfg, bainhaIdx: Number(v) })}>
                  <SelectTrigger className="mt-1"><SelectValue placeholder="Selecione a bainha" /></SelectTrigger>
                  <SelectContent>
                    {bainhas.map((b, i) => <SelectItem key={i} value={String(i)}>{b.nome} {b.preco > 0 ? `(+${BRL(b.preco)})` : ''}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            )}

            {/* Adicionais */}
            <div>
              <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Adicionais</label>
              <div className="grid grid-cols-2 gap-2 mt-2">
                {ADICIONAIS.map((a, i) => (
                  <label key={i} className="flex items-center gap-2 text-sm cursor-pointer">
                    <Checkbox
                      checked={cfg.adicionais.has(i)}
                      onCheckedChange={(checked) => {
                        const next = new Set(cfg.adicionais);
                        if (checked) next.add(i); else next.delete(i);
                        onChange({ ...cfg, adicionais: next });
                      }}
                    />
                    <span className="flex-1 truncate">{a.nome}</span>
                    <span className="text-xs text-muted-foreground flex-shrink-0">{BRL(a.preco)}</span>
                  </label>
                ))}
              </div>
            </div>

            <Separator />

            {/* Breakdown */}
            {breakdown.length > 0 && (
              <div className="space-y-1">
                {breakdown.map((line, i) => (
                  <div key={i} className="flex justify-between text-xs text-muted-foreground">
                    <span>{line.split(':')[0]}</span>
                    <span>{line.split(':').slice(1).join(':').trim()}</span>
                  </div>
                ))}
              </div>
            )}

            <div className="flex items-center justify-between pt-2 border-t">
              <span className="text-sm font-semibold">Total</span>
              <span className="text-lg font-bold text-primary">{BRL(total)}</span>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}

// ─── Página principal ───

export default function SimuladorPrecos() {
  const [configs, setConfigs] = useState<Config[]>([newConfig()]);

  const addConfig = () => setConfigs((prev) => [...prev, newConfig()]);
  const removeConfig = (id: string) => setConfigs((prev) => prev.length > 1 ? prev.filter((c) => c.id !== id) : prev);
  const updateConfig = (id: string, updated: Config) => setConfigs((prev) => prev.map((c) => c.id === id ? updated : c));

  const totalGeral = useMemo(() => configs.reduce((sum, cfg) => sum + calcTotal(cfg).total, 0), [configs]);

  const gerarTexto = () => {
    const lines: string[] = ['*Simulação de Preço — Kaowz Facas*', ''];
    configs.forEach((cfg, idx) => {
      const modelo = cfg.modeloIdx !== null ? MODELOS[cfg.modeloIdx] : null;
      if (!modelo || modelo.preco === null) return;
      const tam = modelo.tamanho === '-' ? 'P' : modelo.tamanho;
      const { total } = calcTotal(cfg);
      lines.push(`*${idx + 1}. ${modelo.nome}* (${TAMANHO_LABEL[modelo.tamanho]})`);
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
    const texto = gerarTexto();
    try {
      await navigator.clipboard.writeText(texto);
      toast.success('Simulação copiada!');
    } catch {
      toast.error('Não foi possível copiar');
    }
  };

  const enviarWhatsApp = () => {
    const texto = gerarTexto();
    window.open(`https://wa.me/?text=${encodeURIComponent(texto)}`, '_blank');
  };

  return (
    <div className="max-w-4xl mx-auto py-6 px-4 space-y-6">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-3">
          <Calculator className="h-6 w-6 text-primary" />
          <div>
            <h1 className="text-xl sm:text-2xl font-bold">Simulador de Preços</h1>
            <p className="text-xs text-muted-foreground">Monte configurações e calcule o valor total</p>
          </div>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" className="gap-2" onClick={copiarTexto}>
            <Copy className="h-4 w-4" /> Copiar
          </Button>
          <Button variant="outline" size="sm" className="gap-2" onClick={enviarWhatsApp}>
            <MessageCircle className="h-4 w-4" /> WhatsApp
          </Button>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        {configs.map((cfg, idx) => (
          <ConfigCard
            key={cfg.id}
            cfg={cfg}
            index={idx}
            onChange={(updated) => updateConfig(cfg.id, updated)}
            onRemove={() => removeConfig(cfg.id)}
          />
        ))}
      </div>

      <div className="flex items-center justify-between gap-4 flex-wrap">
        <Button variant="outline" className="gap-2" onClick={addConfig}>
          <Plus className="h-4 w-4" /> Adicionar Configuração
        </Button>

        <div className="flex items-center gap-4">
          <span className="text-sm text-muted-foreground">{configs.length} configuração(ões)</span>
          <div className="text-right">
            <p className="text-xs text-muted-foreground uppercase tracking-wider">Total Geral</p>
            <p className="text-2xl font-bold text-primary">{BRL(totalGeral)}</p>
          </div>
        </div>
      </div>
    </div>
  );
}
