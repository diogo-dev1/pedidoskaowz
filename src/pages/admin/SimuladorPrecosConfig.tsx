import { useEffect, useMemo, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useSimuladorConfig, SIMULADOR_CONFIG_CHAVE } from '@/hooks/useSimuladorConfig';
import {
  SEED, BRL, type SimuladorData, type Modelo, type Opcao, type Precos, type Classe, type PesosConfig, type Vendedor,
} from '@/lib/simuladorData';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Switch } from '@/components/ui/switch';
import { toast } from 'sonner';
import {
  Calculator, Save, RotateCcw, Loader2, Search, Wrench, Package, Sparkles, X, Plus, Palette, Weight, Trash2, Users,
} from 'lucide-react';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';



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

/** Editor da lista de cores cadastráveis de uma opção (ex.: Grafite, Espaçador). */
function CoresEditor({ cores, onChange }: { cores: string[]; onChange: (c: string[]) => void }) {
  const [novaCor, setNovaCor] = useState('');

  const adicionar = () => {
    const nome = novaCor.trim();
    if (!nome) return;
    if (cores.some((c) => c.toLowerCase() === nome.toLowerCase())) { setNovaCor(''); return; }
    onChange([...cores, nome]);
    setNovaCor('');
  };

  return (
    <div className="space-y-1.5 pt-1.5 border-t">
      <div className="flex items-center gap-1.5">
        <Palette className="w-3.5 h-3.5 text-muted-foreground" />
        <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">Cores (opcional)</span>
      </div>
      {cores.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {cores.map((cor, i) => (
            <span key={i} className="inline-flex items-center gap-1 pl-2.5 pr-1 py-1 rounded-full text-xs font-medium bg-muted border">
              {cor}
              <button type="button" onClick={() => onChange(cores.filter((_, j) => j !== i))}
                className="rounded-full hover:bg-destructive/15 p-0.5 text-muted-foreground hover:text-destructive">
                <X className="w-3 h-3" />
              </button>
            </span>
          ))}
        </div>
      )}
      <div className="flex items-center gap-1.5">
        <Input value={novaCor} onChange={(e) => setNovaCor(e.target.value)}
          onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); adicionar(); } }}
          placeholder="Ex: Preto, Vermelho..." className="h-8 text-xs flex-1" />
        <Button type="button" size="icon" variant="outline" className="h-8 w-8 shrink-0" onClick={adicionar}>
          <Plus className="w-3.5 h-3.5" />
        </Button>
      </div>
      <p className="text-[10px] text-muted-foreground">
        Se houver ao menos uma cor aqui, o Simulador mostra a seleção de cor quando esta opção for escolhida.
      </p>
    </div>
  );
}

/** Editor de uma opção com preços por tamanho (P/M/G). `comCores` habilita o cadastro de cores. */
function OpcaoPrecos({ op, onChange, comCores = false, comTipoAco = false }: { op: Opcao; onChange: (o: Opcao) => void; comCores?: boolean; comTipoAco?: boolean }) {
  return (
    <div className="rounded-lg border bg-card p-3 space-y-2">
      <div className="flex items-center gap-2">
        <Input value={op.nome} onChange={(e) => onChange({ ...op, nome: e.target.value })}
          className="h-9 text-sm font-medium flex-1" />
        {comTipoAco && (
          <Select value={op.tipo ?? 'carbono'} onValueChange={(v) => onChange({ ...op, tipo: v as Opcao['tipo'] })}>
            <SelectTrigger className="h-9 w-32 shrink-0"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="inox">Inox</SelectItem>
              <SelectItem value="carbono">High Carbon</SelectItem>
            </SelectContent>
          </Select>
        )}
        {op.incluso && <span className="text-[10px] font-semibold text-emerald-600 uppercase shrink-0">incluso</span>}
      </div>
      {comTipoAco && (
        <p className="text-[10px] text-muted-foreground">
          Acabamentos exclusivos de carbono (Black Stone Washed) não aparecem no Simulador para aços inox.
        </p>
      )}
      <div className="grid grid-cols-3 gap-2">
        {CLASSES.map((c) => (
          <div key={c} className="space-y-0.5">
            <span className="text-[10px] font-semibold text-muted-foreground pl-1">{c}</span>
            <PrecoInput value={op.precos[c] ?? 0}
              onChange={(n) => onChange({ ...op, precos: { ...op.precos, [c]: n } })} />
          </div>
        ))}
      </div>
      {comCores && (
        <CoresEditor cores={op.cores ?? []} onChange={(cores) => onChange({ ...op, cores })} />
      )}
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

/** Input de peso em gramas (0 = não definido). */
function PesoInput({ value, onChange, className = '' }: { value: number; onChange: (n: number) => void; className?: string }) {
  return (
    <div className={`relative ${className}`}>
      <Input
        type="number" inputMode="numeric" min={0} step="1"
        value={Number.isFinite(value) ? value : 0}
        onChange={(e) => onChange(e.target.value === '' ? 0 : Math.max(0, parseInt(e.target.value, 10) || 0))}
        className="h-9 pr-7 text-sm tabular-nums"
      />
      <span className="absolute right-2 top-1/2 -translate-y-1/2 text-[10px] text-muted-foreground">g</span>
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
  const [novoModelo, setNovoModelo] = useState<Modelo | null>(null);
  const [excluir, setExcluir] = useState<{ idx: number; nome: string } | null>(null);

  // Sincroniza o rascunho quando a config carrega (sem sobrescrever edições em andamento)
  useEffect(() => { if (!draft && !isLoading) setDraft(clone(configData)); }, [configData, isLoading, draft]);

  const set = (patch: Partial<SimuladorData>) => setDraft((d) => (d ? { ...d, ...patch } : d));
  const setPesos = (patch: Partial<PesosConfig>) =>
    setDraft((d) => (d ? { ...d, pesos: { ...d.pesos, ...patch } } : d));


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

  const abrirNovoModelo = () => setNovoModelo({ nome: '', tamanho: 'P', preco: 0 });

  const confirmarNovoModelo = () => {
    if (!novoModelo || !draft) return;
    const nome = novoModelo.nome.trim();
    if (!nome) { toast.error('Informe o nome do modelo.'); return; }
    if (!Number.isFinite(novoModelo.preco) || novoModelo.preco < 0) { toast.error('O preço não pode ser negativo.'); return; }
    if (draft.modelos.some((m) => m.nome.trim().toLowerCase() === nome.toLowerCase())) {
      toast.error(`Já existe um modelo chamado "${nome}".`); return;
    }
    set({ modelos: [...draft.modelos, { ...novoModelo, nome }] });
    setNovoModelo(null);
    toast.success('Modelo adicionado. Clique em Salvar valores para aplicar.');
  };

  const confirmarExclusao = () => {
    if (!excluir || !draft) return;
    set({ modelos: draft.modelos.filter((_, i) => i !== excluir.idx) });
    setExcluir(null);
    toast.success('Modelo removido. Clique em Salvar valores para aplicar.');
  };

  const restaurarPadrao = () => {
    // Restaura os preços da planilha, mas preserva os pesos já cadastrados.
    setDraft((d) => ({ ...clone(SEED), pesos: d?.pesos ?? clone(SEED).pesos }));
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
          <RotateCcw className="h-3.5 w-3.5" /> Restaurar padrão do código
        </Button>
      </div>

      <Tabs defaultValue="modelos" className="w-full">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="modelos" className="gap-1 text-[11px] sm:text-sm"><Package className="w-3.5 h-3.5" /> Modelos</TabsTrigger>
          <TabsTrigger value="customizacoes" className="gap-1 text-[11px] sm:text-sm"><Wrench className="w-3.5 h-3.5" /> Custom.</TabsTrigger>
          <TabsTrigger value="adicionais" className="gap-1 text-[11px] sm:text-sm"><Sparkles className="w-3.5 h-3.5" /> Adicionais</TabsTrigger>
          <TabsTrigger value="pesos" className="gap-1 text-[11px] sm:text-sm"><Weight className="w-3.5 h-3.5" /> Pesos</TabsTrigger>
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
          <div className="flex items-center justify-between gap-2 px-1">
            <span className="text-[11px] text-muted-foreground">{draft.modelos.length} modelos</span>
            <Button size="sm" className="gap-1.5 h-8" onClick={abrirNovoModelo}>
              <Plus className="w-3.5 h-3.5" /> Adicionar modelo
            </Button>
          </div>
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
              <PrecoInput value={m.preco} onChange={(n) => updateModelo(i, { ...m, preco: n })} className="w-24 shrink-0" />
              <Button type="button" size="icon" variant="ghost"
                className="h-9 w-9 shrink-0 text-muted-foreground hover:text-destructive"
                onClick={() => setExcluir({ idx: i, nome: m.nome })}>
                <Trash2 className="w-4 h-4" />
              </Button>
            </div>
          ))}

        </TabsContent>

        {/* ── Customizações ── */}
        <TabsContent value="customizacoes" className="mt-4 space-y-5">
          <section className="space-y-2">
            <h2 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Aço</h2>
            {draft.acos.map((o, i) => <OpcaoPrecos key={i} op={o} comTipoAco onChange={(x) => updateOpcao('acos', i, x)} />)}
            <PrecosTamanho label="Brute Forge (opcional do aço)" precos={draft.bruteForge} onChange={(p) => set({ bruteForge: p })} />
          </section>

          <section className="space-y-2">
            <h2 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Empunhadura</h2>
            {draft.empunhaduras.map((o, i) => <OpcaoPrecos key={i} op={o} comCores onChange={(x) => updateOpcao('empunhaduras', i, x)} />)}
            <PrecosTamanho label="Dragon Scale (opcional da empunhadura)" precos={draft.dragonScale} onChange={(p) => set({ dragonScale: p })} />
          </section>

          <section className="space-y-2">
            <h2 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Acabamento</h2>
            {draft.acabamentos.map((o, i) => <OpcaoPrecos key={i} op={o} onChange={(x) => updateOpcao('acabamentos', i, x)} />)}
          </section>

          <section className="space-y-2">
            <h2 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Bainha</h2>
            {draft.bainhas.map((o, i) => <OpcaoPrecos key={i} op={o} comCores onChange={(x) => updateOpcao('bainhas', i, x)} />)}
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

          <div className="pt-3">

            <PrecosTamanho
              label="Bainha adicional (2ª em diante)"
              precos={draft.bainhaAdicional}
              onChange={(p) => set({ bainhaAdicional: p })}
            />
            <p className="text-[10px] text-muted-foreground px-1 pt-1">
              A 1ª bainha da faca é inclusa. Da segunda em diante cobra-se este valor, conforme o tamanho da faca.
            </p>
          </div>
        </TabsContent>

        {/* ── Pesos padrão (gramas) para cotação de frete ── */}
        <TabsContent value="pesos" className="mt-4 space-y-5">
          <p className="text-[11px] text-muted-foreground px-1 leading-snug">
            Pesos em gramas usados para cotar frete de itens que não existem cadastrados na loja
            (faca sob medida, acessório avulso). Produtos reais do catálogo continuam usando o peso da loja.
            Deixe 0 para "não definido" — a cotação avisa quando faltar peso.
          </p>

          <section className="space-y-2">
            <h2 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Faca por tamanho</h2>
            <div className="rounded-lg border bg-card p-3 grid grid-cols-3 gap-2">
              {CLASSES.map((c) => (
                <div key={c} className="space-y-0.5">
                  <span className="text-[10px] font-semibold text-muted-foreground pl-1">
                    {c === 'P' ? 'Pequena (P)' : c === 'M' ? 'Média (M)' : 'Grande (G)'}
                  </span>
                  <PesoInput
                    value={draft.pesos.faca[c] ?? 0}
                    onChange={(n) => setPesos({ faca: { ...draft.pesos.faca, [c]: n } })}
                  />
                </div>
              ))}
            </div>
          </section>

          <section className="space-y-2">
            <h2 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Bainha e fallback</h2>
            <div className="rounded-lg border bg-card p-3 space-y-2">
              <div className="flex items-center gap-2">
                <span className="text-sm flex-1">Bainha (cada)</span>
                <PesoInput value={draft.pesos.bainha} onChange={(n) => setPesos({ bainha: n })} className="w-28 shrink-0" />
              </div>
              <div className="flex items-center gap-2">
                <span className="text-sm flex-1">Peso genérico (item avulso)</span>
                <PesoInput value={draft.pesos.generico} onChange={(n) => setPesos({ generico: n })} className="w-28 shrink-0" />
              </div>
            </div>
          </section>

          <section className="space-y-2">
            <h2 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Acessórios</h2>
            {draft.adicionais.map((a) => (
              <div key={a.nome} className="flex items-center gap-2 rounded-lg border bg-card p-2.5">
                <span className="text-sm flex-1 min-w-0 truncate">{a.nome}</span>
                <PesoInput
                  value={draft.pesos.adicionais[a.nome] ?? 0}
                  onChange={(n) => setPesos({ adicionais: { ...draft.pesos.adicionais, [a.nome]: n } })}
                  className="w-28 shrink-0"
                />
              </div>
            ))}
          </section>
        </TabsContent>
      </Tabs>

      {/* Novo modelo */}
      <Dialog open={!!novoModelo} onOpenChange={(o) => !o && setNovoModelo(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Adicionar modelo</DialogTitle>
            <DialogDescription>O modelo entra na lista e é salvo junto com os demais valores.</DialogDescription>
          </DialogHeader>
          {novoModelo && (
            <div className="space-y-3">
              <div className="space-y-1.5">
                <Label className="text-xs">Nome</Label>
                <Input value={novoModelo.nome} autoFocus
                  onChange={(e) => setNovoModelo({ ...novoModelo, nome: e.target.value })}
                  placeholder="Ex: Edc Tanto" />
              </div>
              <div className="flex items-end gap-3">
                <div className="space-y-1.5">
                  <Label className="text-xs">Tamanho</Label>
                  <Select value={novoModelo.tamanho}
                    onValueChange={(v) => setNovoModelo({ ...novoModelo, tamanho: v as Modelo['tamanho'] })}>
                    <SelectTrigger className="h-9 w-20"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {(['P', 'M', 'G', '-'] as const).map((t) => <SelectItem key={t} value={t}>{t}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5 flex-1">
                  <Label className="text-xs">Preço base</Label>
                  <PrecoInput value={novoModelo.preco} onChange={(n) => setNovoModelo({ ...novoModelo, preco: n })} />
                </div>
              </div>
            </div>
          )}
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setNovoModelo(null)}>Cancelar</Button>
            <Button onClick={confirmarNovoModelo}>Adicionar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Excluir modelo */}
      <Dialog open={!!excluir} onOpenChange={(o) => !o && setExcluir(null)}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Excluir modelo</DialogTitle>
            <DialogDescription>
              Remover o modelo "{excluir?.nome}" da lista? A remoção só é aplicada ao salvar.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setExcluir(null)}>Cancelar</Button>
            <Button variant="destructive" onClick={confirmarExclusao}>Excluir</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>




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
