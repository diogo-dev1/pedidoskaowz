import { useEffect, useMemo, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useSimuladorConfig, SIMULADOR_CONFIG_CHAVE } from '@/hooks/useSimuladorConfig';
import {
  SEED, BRL, type SimuladorData, type Modelo, type Opcao, type Precos, type Classe,
} from '@/lib/simuladorData';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { toast } from 'sonner';
import {
  Calculator, Save, RotateCcw, Loader2, Search, Wrench, Package, Sparkles,
} from 'lucide-react';

// Clona profundo (dados são simples: objetos/arrays/números/strings)
const clone = (d: SimuladorData): SimuladorData => JSON.parse(JSON.stringify(d));

const CLASSES: Classe[] = ['P', 'M', 'G'];

/** Input de preço compacto (aceita vazio = 0). */
function PrecoInput({ value, onChange, className = '' }: { value: number; onChange: (n: number) => void; className?: string }) {
  return (
    <div className={`relative ${className}`}>
      <span className="absolute left-2 top-1/2 -translate-y-1/2 text-[10px] text-muted-foreground">R$</span>
      <Input
        type="number" inputMode="decimal" min={0} step="0.01"
        value={Number.isFinite(value) ? value : 0}
        onChange={(e) => onChange(e.target.value === '' ? 0 : Math.max(0, parseFloat(e.target.value) || 0))}
        className="h-9 pl-7 text-sm tabular-nums"
      />
    </div>
  );
}

/** Editor de uma opção com preços por tamanho (P/M/G). */
function OpcaoPrecos({ op, onChange }: { op: Opcao; onChange: (o: Opcao) => void }) {
  return (
    <div className="rounded-lg border bg-card p-3 space-y-2">
      <div className="flex items-center gap-2">
        <Input value={op.nome} onChange={(e) => onChange({ ...op, nome: e.target.value })}
          className="h-9 text-sm font-medium flex-1" />
        {op.incluso && <span className="text-[10px] font-semibold text-emerald-600 uppercase shrink-0">incluso</span>}
      </div>
      <div className="grid grid-cols-3 gap-2">
        {CLASSES.map((c) => (
          <div key={c} className="space-y-0.5">
            <span className="text-[10px] font-semibold text-muted-foreground pl-1">{c}</span>
            <PrecoInput value={op.precos[c] ?? 0}
              onChange={(n) => onChange({ ...op, precos: { ...op.precos, [c]: n } })} />
          </div>
        ))}
      </div>
    </div>
  );
}

function PrecosTamanho({ label, precos, onChange }: { label: string; precos: Precos; onChange: (p: Precos) => void }) {
  return (
    <div className="rounded-lg border bg-card p-3 space-y-2">
      <p className="text-sm font-medium">{label}</p>
      <div className="grid grid-cols-3 gap-2">
        {CLASSES.map((c) => (
          <div key={c} className="space-y-0.5">
            <span className="text-[10px] font-semibold text-muted-foreground pl-1">{c}</span>
            <PrecoInput value={precos[c] ?? 0} onChange={(n) => onChange({ ...precos, [c]: n })} />
          </div>
        ))}
      </div>
    </div>
  );
}

export default function SimuladorPrecosConfig() {
  const { data: configData, isLoading } = useSimuladorConfig();
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const [draft, setDraft] = useState<SimuladorData | null>(null);
  const [saving, setSaving] = useState(false);
  const [busca, setBusca] = useState('');

  // Sincroniza o rascunho quando a config carrega (sem sobrescrever edições em andamento)
  useEffect(() => { if (!draft && !isLoading) setDraft(clone(configData)); }, [configData, isLoading, draft]);

  const set = (patch: Partial<SimuladorData>) => setDraft((d) => (d ? { ...d, ...patch } : d));

  const modelosFiltrados = useMemo(() => {
    if (!draft) return [];
    const q = busca.trim().toLowerCase();
    return draft.modelos
      .map((m, i) => ({ m, i }))
      .filter(({ m }) => !q || m.nome.toLowerCase().includes(q));
  }, [draft, busca]);

  const salvar = async () => {
    if (!draft) return;
    setSaving(true);
    try {
      const { error } = await supabase
        .from('simulador_precos_config')
        .upsert(
          { chave: SIMULADOR_CONFIG_CHAVE, dados: draft as any, updated_at: new Date().toISOString(), updated_by: user?.id ?? null } as any,
          { onConflict: 'chave' },
        );
      if (error) throw error;
      queryClient.invalidateQueries({ queryKey: ['simulador-precos-config'] });
      toast.success('Valores salvos! O Simulador já usa os novos preços.');
    } catch (e: any) {
      toast.error('Erro ao salvar: ' + (e.message || e));
    } finally {
      setSaving(false);
    }
  };

  const restaurarPadrao = () => {
    setDraft(clone(SEED));
    toast.info('Valores da planilha restaurados no formulário. Clique em Salvar para aplicar.');
  };

  if (isLoading || !draft) {
    return (
      <div className="flex items-center justify-center py-20 text-muted-foreground gap-2">
        <Loader2 className="h-5 w-5 animate-spin" /> Carregando valores...
      </div>
    );
  }

  const updateModelo = (idx: number, m: Modelo) =>
    set({ modelos: draft.modelos.map((x, i) => (i === idx ? m : x)) });
  const updateOpcao = (key: 'acos' | 'empunhaduras' | 'acabamentos' | 'bainhas', idx: number, o: Opcao) =>
    set({ [key]: draft[key].map((x, i) => (i === idx ? o : x)) } as Partial<SimuladorData>);

  return (
    <div className="max-w-2xl mx-auto py-4 px-3 sm:px-4 space-y-4 pb-28">
      <div className="flex items-center gap-3">
        <Calculator className="h-6 w-6 text-primary" />
        <div className="min-w-0 flex-1">
          <h1 className="text-xl font-bold leading-tight">Valores do Simulador</h1>
          <p className="text-xs text-muted-foreground">Edite os preços por tamanho. Vale para todos os vendedores.</p>
        </div>
        <Button variant="outline" size="sm" className="gap-1.5" onClick={restaurarPadrao}>
          <RotateCcw className="h-3.5 w-3.5" /> Planilha
        </Button>
      </div>

      <Tabs defaultValue="modelos" className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="modelos" className="gap-1.5 text-xs sm:text-sm"><Package className="w-3.5 h-3.5" /> Modelos</TabsTrigger>
          <TabsTrigger value="customizacoes" className="gap-1.5 text-xs sm:text-sm"><Wrench className="w-3.5 h-3.5" /> Customizações</TabsTrigger>
          <TabsTrigger value="adicionais" className="gap-1.5 text-xs sm:text-sm"><Sparkles className="w-3.5 h-3.5" /> Adicionais</TabsTrigger>
        </TabsList>

        {/* ── Modelos base ── */}
        <TabsContent value="modelos" className="mt-4 space-y-2">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input placeholder="Buscar modelo..." value={busca} onChange={(e) => setBusca(e.target.value)} className="pl-9" />
          </div>
          <p className="text-[11px] text-muted-foreground px-1">
            Valor base = Aço Inox + Empunhadura Grafite inclusos. Tamanho define o preço das customizações.
          </p>
          {modelosFiltrados.map(({ m, i }) => (
            <div key={i} className="flex items-center gap-2 rounded-lg border bg-card p-2.5">
              <Input value={m.nome} onChange={(e) => updateModelo(i, { ...m, nome: e.target.value })}
                className="h-9 text-sm font-medium flex-1 min-w-0" />
              <Select value={m.tamanho} onValueChange={(v) => updateModelo(i, { ...m, tamanho: v as Modelo['tamanho'] })}>
                <SelectTrigger className="h-9 w-16 shrink-0"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {(['P', 'M', 'G', '-'] as const).map((t) => <SelectItem key={t} value={t}>{t}</SelectItem>)}
                </SelectContent>
              </Select>
              <PrecoInput value={m.preco} onChange={(n) => updateModelo(i, { ...m, preco: n })} className="w-28 shrink-0" />
            </div>
          ))}
        </TabsContent>

        {/* ── Customizações ── */}
        <TabsContent value="customizacoes" className="mt-4 space-y-5">
          <section className="space-y-2">
            <h2 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Aço</h2>
            {draft.acos.map((o, i) => <OpcaoPrecos key={i} op={o} onChange={(x) => updateOpcao('acos', i, x)} />)}
            <PrecosTamanho label="Brute Forge (opcional do aço)" precos={draft.bruteForge} onChange={(p) => set({ bruteForge: p })} />
          </section>

          <section className="space-y-2">
            <h2 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Empunhadura</h2>
            {draft.empunhaduras.map((o, i) => <OpcaoPrecos key={i} op={o} onChange={(x) => updateOpcao('empunhaduras', i, x)} />)}
            <PrecosTamanho label="Dragon Scale (opcional da empunhadura)" precos={draft.dragonScale} onChange={(p) => set({ dragonScale: p })} />
          </section>

          <section className="space-y-2">
            <h2 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Acabamento</h2>
            {draft.acabamentos.map((o, i) => <OpcaoPrecos key={i} op={o} onChange={(x) => updateOpcao('acabamentos', i, x)} />)}
          </section>

          <section className="space-y-2">
            <h2 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Bainha</h2>
            {draft.bainhas.map((o, i) => <OpcaoPrecos key={i} op={o} onChange={(x) => updateOpcao('bainhas', i, x)} />)}
          </section>
        </TabsContent>

        {/* ── Adicionais (preço único) ── */}
        <TabsContent value="adicionais" className="mt-4 space-y-2">
          {draft.adicionais.map((a, i) => (
            <div key={i} className="flex items-center gap-2 rounded-lg border bg-card p-2.5">
              <Input value={a.nome}
                onChange={(e) => set({ adicionais: draft.adicionais.map((x, j) => (j === i ? { ...x, nome: e.target.value } : x)) })}
                className="h-9 text-sm font-medium flex-1 min-w-0" />
              <PrecoInput value={a.preco}
                onChange={(n) => set({ adicionais: draft.adicionais.map((x, j) => (j === i ? { ...x, preco: n } : x)) })}
                className="w-28 shrink-0" />
            </div>
          ))}
        </TabsContent>
      </Tabs>

      {/* Barra de salvar fixa */}
      <div className="fixed left-0 right-0 bottom-[calc(4rem+env(safe-area-inset-bottom))] md:bottom-0 bg-background/95 backdrop-blur-lg border-t z-40">
        <div className="max-w-2xl mx-auto flex items-center gap-3 px-4 py-3">
          <p className="text-xs text-muted-foreground flex-1">
            {draft.modelos.length} modelos · exemplo Edc Ring: <span className="font-semibold text-foreground">{BRL(draft.modelos.find((m) => m.nome === 'Edc Ring')?.preco ?? 0)}</span>
          </p>
          <Button className="gap-2 h-11 rounded-xl bg-accent hover:bg-accent/90 text-accent-foreground" onClick={salvar} disabled={saving}>
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
            Salvar valores
          </Button>
        </div>
      </div>
    </div>
  );
}
