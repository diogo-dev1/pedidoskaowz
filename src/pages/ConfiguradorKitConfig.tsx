import { useEffect, useState } from 'react';
import { Save, RotateCcw, Upload, Link2, ChevronDown, ChevronUp } from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { ConfigProgress, type StepId } from '@/components/ConfigProgress';
import {
  DEFAULT_CONFIG,
  KitConfig,
  VersionConfig,
  VersionKey,
  VERSION_LIST,
  loadKitConfig,
  saveKitConfig,
  WHATSAPP_PHONE_DEFAULT,
  AcoKey,
  EmpunhaduraKey,
  ACO_KEYS,
  ACO_NAMES,
  EMPUNHADURA_KEYS,
  EMPUNHADURA_NAMES,
} from './ConfiguradorKit';
import type { AcoEmpunhaduraImages } from './ConfiguradorKit';

const IMAGE_BUCKET = 'modelo-imagens';

type FinishKey = 'satin' | 'sw' | 'tac';
type SizeKey = 'standard' | 'compact' | 'micro';
type QtyKey = 1 | 2 | 3;

const FINISHES: { key: FinishKey; name: string }[] = [
  { key: 'satin', name: 'Acetinada' },
  { key: 'sw', name: 'Stone Washed' },
  { key: 'tac', name: 'Tactical' },
];
const SIZES: { key: SizeKey; name: string }[] = [
  { key: 'standard', name: 'Standard' },
  { key: 'compact', name: 'Compact' },
  { key: 'micro', name: 'Micro' },
];

const fileToDataUrl = (file: File | Blob): Promise<string> =>
  new Promise((resolve, reject) => {
    const r = new FileReader();
    r.onload = () => resolve(r.result as string);
    r.onerror = reject;
    r.readAsDataURL(file);
  });

const compressImage = async (file: File, maxDim = 1400, quality = 0.82): Promise<Blob> => {
  if (file.type === 'image/svg+xml') return file;

  const dataUrl = await fileToDataUrl(file);
  const img = await new Promise<HTMLImageElement>((resolve, reject) => {
    const i = new Image();
    i.onload = () => resolve(i);
    i.onerror = reject;
    i.src = dataUrl;
  });

  const scale = Math.min(1, maxDim / Math.max(img.width, img.height));
  const w = Math.round(img.width * scale);
  const h = Math.round(img.height * scale);

  const canvas = document.createElement('canvas');
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext('2d');
  if (!ctx) return file;
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, w, h);
  ctx.drawImage(img, 0, 0, w, h);

  const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, 'image/jpeg', quality));
  return blob ?? file;
};

const uploadImage = async (file: File, pathHint: string): Promise<string> => {
  const blob = await compressImage(file);
  const ext = blob.type === 'image/svg+xml' ? 'svg' : 'jpg';
  const path = `${pathHint}-${Date.now()}.${ext}`;
  const { error } = await supabase.storage
    .from(IMAGE_BUCKET)
    .upload(path, blob, { upsert: true, contentType: blob.type || file.type });
  if (error) throw error;
  const { data } = supabase.storage.from(IMAGE_BUCKET).getPublicUrl(path);
  return data.publicUrl;
};

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="text-xs font-medium text-muted-foreground block mb-1.5">{label}</span>
      {children}
    </label>
  );
}

function ImageUploader({
  label,
  src,
  onPick,
}: {
  label: string;
  src: string;
  onPick: (file: File | null) => void;
}) {
  return (
    <label className="block cursor-pointer group">
      <div className="aspect-square w-full rounded border border-border bg-muted overflow-hidden relative">
        {src && <img src={src} alt={label} className="w-full h-full object-cover" />}
        <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition flex items-center justify-center text-white text-xs gap-2">
          <Upload size={14} /> Trocar
        </div>
      </div>
      <div className="text-xs mt-2 font-medium">{label}</div>
      <input
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(e) => onPick(e.target.files?.[0] ?? null)}
      />
    </label>
  );
}

interface CollapsibleSectionProps {
  id: StepId;
  currentStep: StepId;
  title: string;
  subtitle?: string;
  children: React.ReactNode;
}

function CollapsibleSection({ id, currentStep, title, subtitle, children }: CollapsibleSectionProps) {
  const isOpen = id === currentStep;

  return (
    <div className="border border-border rounded-lg overflow-hidden bg-card transition-all">
      <div
        className={`p-4 sm:p-5 cursor-pointer hover:bg-muted/50 transition flex items-center justify-between ${
          isOpen ? 'bg-muted/20' : ''
        }`}
      >
        <div className="flex-1">
          <h2 className={`font-semibold ${isOpen ? 'text-primary' : ''}`}>{title}</h2>
          {subtitle && <p className="text-xs text-muted-foreground mt-0.5">{subtitle}</p>}
        </div>
        {isOpen ? <ChevronUp size={20} className="flex-shrink-0 ml-2" /> : <ChevronDown size={20} className="flex-shrink-0 ml-2" />}
      </div>
      {isOpen && <div className="px-4 sm:px-5 pb-4 sm:pb-5 pt-2 space-y-4 border-t border-border">{children}</div>}
    </div>
  );
}

export default function ConfiguradorKitConfig() {
  const [cfg, setCfg] = useState<KitConfig>(DEFAULT_CONFIG);
  const [loaded, setLoaded] = useState(false);
  const [saving, setSaving] = useState(false);
  const [versionKey, setVersionKey] = useState<VersionKey>('standard');
  const [currentStep, setCurrentStep] = useState<StepId>('whatsapp');
  const [completedSteps, setCompletedSteps] = useState<StepId[]>([]);
  const [selectedSize, setSelectedSize] = useState<SizeKey>('standard');
  const [showFullTable, setShowFullTable] = useState(true);

  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const c = await loadKitConfig();
        if (!active) return;
        setCfg(c);
      } catch (err) {
        console.error('Erro ao carregar config:', err);
        toast.error('Erro ao carregar configurações (ver console).');
        // fallback: evita ficar preso em "carregando"
      } finally {
        if (active) setLoaded(true);
      }
    })();
    return () => {
      active = false;
    };
  }, []);

  const v = cfg.versions[versionKey];

  const updateVersion = (patch: Partial<VersionConfig>) =>
    setCfg((c) => ({
      ...c,
      versions: { ...c.versions, [versionKey]: { ...c.versions[versionKey], ...patch } },
    }));

  const updateTexts = (patch: Partial<VersionConfig['texts']>) =>
    updateVersion({ texts: { ...v.texts, ...patch } });

  const setPrice = (size: SizeKey, finish: FinishKey, val: number) => {
    updateVersion({
      prices: { ...v.prices, [size]: { ...v.prices[size], [finish]: val } },
    });
  };

  const setPriceByConfig = (size: SizeKey, aco: AcoKey, emp: EmpunhaduraKey, finish: FinishKey, val: number) => {
    if (!v.pricesByConfig) return;
    updateVersion({
      pricesByConfig: {
        ...v.pricesByConfig,
        [size]: {
          ...v.pricesByConfig[size],
          [aco]: {
            ...v.pricesByConfig[size][aco],
            [emp]: { ...v.pricesByConfig[size][aco][emp], [finish]: val },
          },
        },
      },
    });
  };

  const setDiscount = (q: QtyKey, val: number) => {
    setCfg((c) => ({
      ...c,
      discountByQty: { ...c.discountByQty, [q]: Math.max(0, Math.min(100, val || 0)) },
    }));
  };

  const save = async () => {
    setSaving(true);
    try {
      await saveKitConfig(cfg);
      toast.success('Configurações salvas');
    } catch {
      toast.error('Erro ao salvar configurações');
    } finally {
      setSaving(false);
    }
  };

  const reset = async () => {
    if (!confirm('Restaurar configurações padrão de TODAS as versões?')) return;
    setCfg(DEFAULT_CONFIG);
    setSaving(true);
    try {
      await saveKitConfig(DEFAULT_CONFIG);
      toast.success('Configurações restauradas');
    } catch {
      toast.error('Erro ao restaurar configurações');
    } finally {
      setSaving(false);
    }
  };

  if (!loaded) {
    return <div className="max-w-5xl mx-auto py-12 text-center text-muted-foreground">Carregando configurações...</div>;
  }

  const steps = [
    {
      id: 'whatsapp' as StepId,
      label: 'WhatsApp',
      description: 'Configure o telefone da empresa',
      help: 'Insira o número WhatsApp da empresa para receber contatos diretos dos clientes. Formato: código do país + DDD + número.',
    },
    {
      id: 'texts' as StepId,
      label: 'Textos',
      description: 'Edite textos e blocos',
      help: 'Customize todos os textos da página de configuração. Use {chaves} para destacar em vermelho partes do título.',
    },
    {
      id: 'finishes' as StepId,
      label: 'Acabamentos',
      description: 'Configure acabamentos',
      help: 'Defina se essa versão tem diferentes acabamentos (Acetinada, Stone Washed, Tactical) ou apenas tamanhos.',
    },
    {
      id: 'prices' as StepId,
      label: 'Preços',
      description: 'Defina os valores',
      help: 'Configure os preços em reais (R$) para cada combinação de tamanho e acabamento.',
    },
    {
      id: 'discounts' as StepId,
      label: 'Descontos',
      description: 'Configure descontos por qtd',
      help: 'Defina descontos percentuais globais aplicados a pedidos com 1, 2 ou 3+ unidades.',
    },
    {
      id: 'bainha' as StepId,
      label: 'Bainha',
      description: 'Preço da bainha extra',
      help: 'Configure o valor cobrado pela bainha extra customizada nessa versão.',
    },
    {
      id: 'images' as StepId,
      label: 'Imagens',
      description: 'Envie as imagens',
      help: 'Adicione imagens de produto para cada tamanho e acabamento. As imagens serão compactadas automaticamente.',
    },
  ];

  const handleStepClick = (stepId: StepId) => {
    setCurrentStep(stepId);
    if (!completedSteps.includes(stepId)) {
      setCompletedSteps([...completedSteps, stepId]);
    }
  };

  return (
    <div className="max-w-5xl mx-auto pb-12 px-4 sm:px-0">
      {/* Cabeçalho */}
      <div className="flex items-start justify-between gap-4 flex-col sm:flex-row mb-8 pt-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold">Push Dagger Kaowz</h1>
          <p className="text-xs sm:text-sm text-muted-foreground mt-1">
            Configure as versões pública da landpage com textos, preços, imagens e auxílio passo a passo.
          </p>
        </div>
        <div className="flex gap-2 flex-col sm:flex-row w-full sm:w-auto">
          <button
            onClick={async () => {
              const url = `${window.location.origin}/push-dagger-kaowz`;
              try {
                await navigator.clipboard.writeText(url);
                toast.success('Link copiado!', { description: url });
              } catch {
                toast.error('Não foi possível copiar', { description: url });
              }
            }}
            className="inline-flex items-center justify-center gap-2 px-3 py-2 text-sm border border-border rounded hover:bg-secondary w-full sm:w-auto"
          >
            <Link2 size={14} /> Copiar link
          </button>
          <button
            onClick={reset}
            disabled={saving}
            className="inline-flex items-center justify-center gap-2 px-3 py-2 text-sm border border-border rounded hover:bg-secondary disabled:opacity-50 w-full sm:w-auto"
          >
            <RotateCcw size={14} /> Restaurar
          </button>
          <button
            onClick={save}
            disabled={saving}
            className="inline-flex items-center justify-center gap-2 px-4 py-2 text-sm bg-primary text-primary-foreground rounded hover:bg-primary/80 disabled:opacity-50 w-full sm:w-auto"
          >
            <Save size={14} /> {saving ? 'Salvando...' : 'Salvar'}
          </button>
        </div>
      </div>

      {/* Barra de progresso */}
      <div className="mb-8">
        <ConfigProgress
          steps={steps}
          currentStep={currentStep}
          onStepClick={handleStepClick}
          completedSteps={completedSteps}
        />
      </div>

      {/* Seções por etapa */}
      <div className="space-y-4">
        {/* ETAPA 1: WhatsApp (global) */}
        <CollapsibleSection
          id="whatsapp"
          currentStep={currentStep}
          title="WhatsApp da empresa"
          subtitle="Todas as versões"
        >
          <input
            type="text"
            value={cfg.whatsappPhone}
            onChange={(e) => setCfg((c) => ({ ...c, whatsappPhone: e.target.value.replace(/\D/g, '') }))}
            placeholder={WHATSAPP_PHONE_DEFAULT}
            className="w-full sm:max-w-xs h-10 px-3 rounded border border-border bg-background"
          />
          <p className="text-xs text-muted-foreground mt-2">Formato: 55 + DDD + número (apenas dígitos).</p>
        </CollapsibleSection>

        {/* Seletor de versão */}
        <div className="flex flex-wrap gap-2 p-4 border-b border-border bg-card rounded-lg">
          <div className="w-full text-xs font-semibold text-muted-foreground mb-2">Selecione a versão:</div>
          {VERSION_LIST.map((vl) => (
            <button
              key={vl.key}
              onClick={() => setVersionKey(vl.key)}
              className={`px-4 py-2 text-sm rounded-md border transition ${
                versionKey === vl.key
                  ? 'bg-primary text-primary-foreground border-primary'
                  : 'bg-background border-border hover:bg-secondary'
              }`}
            >
              {cfg.versions[vl.key].texts.tabLabel || vl.label}
            </button>
          ))}
        </div>

        {/* ETAPA 2: Textos / blocos da versão */}
        <CollapsibleSection
          id="texts"
          currentStep={currentStep}
          title="Textos & Blocos"
          subtitle={`Versão: ${v.texts.tabLabel}`}
        >
          <div className="grid sm:grid-cols-2 gap-4">
            <Field label="Nome da aba (versão)">
              <input
                type="text"
                value={v.texts.tabLabel}
                onChange={(e) => updateTexts({ tabLabel: e.target.value })}
                className="w-full h-10 px-3 rounded border border-border bg-background"
              />
            </Field>
            <Field label="Eyebrow (acima do título)">
              <input
                type="text"
                value={v.texts.eyebrow}
                onChange={(e) => updateTexts({ eyebrow: e.target.value })}
                className="w-full h-10 px-3 rounded border border-border bg-background"
              />
            </Field>
          </div>
          <Field label="Título principal (use {} para destacar em vermelho. Ex: MONTE SEU {KIT})">
            <input
              type="text"
              value={v.texts.heroTitle}
              onChange={(e) => updateTexts({ heroTitle: e.target.value })}
              className="w-full h-10 px-3 rounded border border-border bg-background"
            />
          </Field>
          <Field label="Descrição (parágrafo do hero)">
            <textarea
              rows={3}
              value={v.texts.heroDesc}
              onChange={(e) => updateTexts({ heroDesc: e.target.value })}
              className="w-full p-3 rounded border border-border bg-background"
            />
          </Field>
          <div className="grid sm:grid-cols-2 gap-4">
            <Field label="Texto do botão (CTA)">
              <input
                type="text"
                value={v.texts.ctaText}
                onChange={(e) => updateTexts({ ctaText: e.target.value })}
                className="w-full h-10 px-3 rounded border border-border bg-background"
              />
            </Field>
            <Field label="Eyebrow do bloco de referência">
              <input
                type="text"
                value={v.texts.refEyebrow}
                onChange={(e) => updateTexts({ refEyebrow: e.target.value })}
                className="w-full h-10 px-3 rounded border border-border bg-background"
              />
            </Field>
            <Field label="Título do bloco de referência">
              <input
                type="text"
                value={v.texts.refTitle}
                onChange={(e) => updateTexts({ refTitle: e.target.value })}
                className="w-full h-10 px-3 rounded border border-border bg-background"
              />
            </Field>
            <Field label="Subtítulo (legenda esquerda)">
              <input
                type="text"
                value={v.texts.refLabel}
                onChange={(e) => updateTexts({ refLabel: e.target.value })}
                className="w-full h-10 px-3 rounded border border-border bg-background"
              />
            </Field>
            <Field label="Subtítulo (legenda direita)">
              <input
                type="text"
                value={v.texts.refSub}
                onChange={(e) => updateTexts({ refSub: e.target.value })}
                className="w-full h-10 px-3 rounded border border-border bg-background"
              />
            </Field>
          </div>
          <Field label="Nota do rodapé (use Enter para nova linha)">
            <textarea
              rows={3}
              value={v.texts.footerNote}
              onChange={(e) => updateTexts({ footerNote: e.target.value })}
              className="w-full p-3 rounded border border-border bg-background"
            />
          </Field>
        </CollapsibleSection>

        {/* ETAPA 3: Acabamentos */}
        <CollapsibleSection
          id="finishes"
          currentStep={currentStep}
          title="Acabamentos"
          subtitle="Esta versão tem tipos de acabamento diferentes?"
        >
          <label className="flex items-start gap-3 cursor-pointer">
            <input
              type="checkbox"
              checked={v.hasFinishes}
              onChange={(e) => updateVersion({ hasFinishes: e.target.checked })}
              className="mt-1 w-4 h-4 accent-primary"
            />
            <span>
              <span className="font-semibold block">Ativar acabamentos</span>
              <span className="text-xs text-muted-foreground">
                Marque se houver Acetinada / Stone Washed / Tactical. Desmarque para apenas tamanhos.
              </span>
            </span>
          </label>
        </CollapsibleSection>

        {/* ETAPA 4: Preços */}
        <CollapsibleSection id="prices" currentStep={currentStep} title="Valores (R$)" subtitle={`Versão: ${v.texts.tabLabel}`}>
          <div className="flex items-center justify-between mb-4">
            <div className="flex gap-2 overflow-x-auto">
              {SIZES.map((s) => (
                <button
                  key={s.key}
                  onClick={() => { setSelectedSize(s.key); setShowFullTable(false); }}
                  className={`px-4 py-2 text-sm font-medium rounded-md transition ${
                    selectedSize === s.key ? 'bg-primary text-primary-foreground' : 'bg-background text-muted-foreground hover:bg-secondary'
                  }`}
                >
                  {s.name}
                </button>
              ))}
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setShowFullTable((s) => !s)}
                className="px-3 py-2 text-sm rounded border border-border bg-background hover:bg-secondary"
              >
                {showFullTable ? 'Esconder tabela completa' : 'Ver tabela completa'}
              </button>
            </div>
          </div>

          {/* Visualização: tabela por tamanho selecionado ou todas as tabelas */}
          {v.hasAcoEmpunhadura && v.pricesByConfig ? (
            <>
              {!showFullTable ? (
                <div className="space-y-6">
                  {EMPUNHADURA_KEYS.map((ek) => (
                    <div key={ek} className="border border-border rounded-lg overflow-hidden">
                      <div className="px-4 py-3 bg-muted/10 border-b border-border">
                        <strong className="text-sm">{EMPUNHADURA_NAMES[ek]}</strong>
                        <div className="text-xs text-muted-foreground"> — Tamanho: {SIZES.find(s => s.key === selectedSize)?.name}</div>
                      </div>
                      <div className="overflow-x-auto p-3">
                        <table className="w-full">
                          <thead>
                            <tr className="text-xs text-muted-foreground border-b border-border">
                              <th className="text-left py-2 pl-2">Aço</th>
                              {FINISHES.map((f) => (<th key={f.key} className="text-center py-2">{f.name}</th>))}
                            </tr>
                          </thead>
                          <tbody>
                            {ACO_KEYS.map((ak, idx) => (
                              <tr key={ak} className={idx % 2 === 0 ? 'bg-background' : 'bg-muted/20'}>
                                <td className="py-3 pl-2 font-medium">{ACO_NAMES[ak]}</td>
                                {FINISHES.map((f) => (
                                  <td key={f.key} className="py-3 text-center">
                                    <input
                                      type="number"
                                      min={0}
                                      value={v.pricesByConfig![selectedSize][ak][ek][f.key]}
                                      onChange={(e) => setPriceByConfig(selectedSize, ak, ek, f.key, Number(e.target.value) || 0)}
                                      className="w-24 mx-auto h-9 text-center rounded border border-border bg-background"
                                    />
                                  </td>
                                ))}
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="space-y-6">
                  {SIZES.map((size) => (
                    <div key={size.key}>
                      <div className="text-sm font-semibold mb-2">{size.name}</div>
                      {EMPUNHADURA_KEYS.map((ek) => (
                        <div key={`${size.key}-${ek}`} className="mb-4 border border-border rounded-lg overflow-hidden">
                          <div className="px-3 py-2 bg-muted/10 border-b border-border">
                            <strong className="text-sm">{EMPUNHADURA_NAMES[ek]}</strong>
                          </div>
                          <div className="overflow-x-auto p-3">
                            <table className="w-full">
                              <thead>
                                <tr className="text-xs text-muted-foreground border-b border-border">
                                  <th className="text-left py-2 pl-2">Aço</th>
                                  {FINISHES.map((f) => (<th key={f.key} className="text-center py-2">{f.name}</th>))}
                                </tr>
                              </thead>
                              <tbody>
                                {ACO_KEYS.map((ak, idx) => (
                                  <tr key={ak} className={idx % 2 === 0 ? 'bg-background' : 'bg-muted/20'}>
                                    <td className="py-3 pl-2 font-medium">{ACO_NAMES[ak]}</td>
                                    {FINISHES.map((f) => (
                                      <td key={f.key} className="py-3 text-center">
                                        <input
                                          type="number"
                                          min={0}
                                          value={v.pricesByConfig![size.key][ak][ek][f.key]}
                                          onChange={(e) => setPriceByConfig(size.key, ak, ek, f.key, Number(e.target.value) || 0)}
                                          className="w-24 mx-auto h-9 text-center rounded border border-border bg-background"
                                        />
                                      </td>
                                    ))}
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                        </div>
                      ))}
                    </div>
                  ))}
                </div>
              )}
            </>
          ) : (
            <div className="space-y-4">
              <div className="p-4 border border-border rounded-lg bg-card">
                <div className="flex items-center justify-between mb-3">
                  <div className="font-semibold">Preços — {SIZES.find(s => s.key === selectedSize)?.name}</div>
                  <div className="text-xs text-muted-foreground">{v.hasFinishes ? 'Por acabamento' : 'Tamanho único'}</div>
                </div>
                <div className={`grid gap-3 ${v.hasFinishes ? 'grid-cols-3' : 'grid-cols-1 max-w-xs'}`}>
                  {v.hasFinishes ? (
                    FINISHES.map((f) => (
                      <label key={f.key} className="flex flex-col">
                        <span className="text-xs text-muted-foreground mb-1.5 font-medium">{f.name}</span>
                        <input
                          type="number"
                          min={0}
                          value={v.prices[selectedSize][f.key]}
                          onChange={(e) => setPrice(selectedSize, f.key, Number(e.target.value) || 0)}
                          className="w-full h-10 px-2 rounded border border-border bg-background font-semibold"
                        />
                      </label>
                    ))
                  ) : (
                    <label className="flex flex-col">
                      <span className="text-xs text-muted-foreground mb-1.5 font-medium">Valor (R$)</span>
                      <input
                        type="number"
                        min={0}
                        value={v.prices[selectedSize].satin}
                        onChange={(e) => {
                          const val = Number(e.target.value) || 0;
                          updateVersion({
                            prices: {
                              ...v.prices,
                              [selectedSize]: { satin: val, sw: val, tac: val },
                            },
                          });
                        }}
                        className="w-full h-10 px-2 rounded border border-border bg-background font-semibold"
                      />
                    </label>
                  )}
                </div>
              </div>
            </div>
          )}
        </CollapsibleSection>

        {/* ETAPA 5: Descontos por quantidade — GLOBAIS */}
        <CollapsibleSection
          id="discounts"
          currentStep={currentStep}
          title="Descontos por Quantidade"
          subtitle="Descontos globais aplicáveis a todo o pedido"
        >
          <div className="grid sm:grid-cols-3 gap-4">
            {([1, 2, 3] as QtyKey[]).map((q) => (
              <label key={q} className="block">
                <span className="text-sm font-medium">
                  {q} {q === 1 ? 'Unidade' : 'Unidades'}
                </span>
                <input
                  type="number"
                  min={0}
                  max={100}
                  value={cfg.discountByQty[q]}
                  onChange={(e) => setDiscount(q, Number(e.target.value))}
                  className="mt-1 w-full h-10 px-3 rounded border border-border bg-background"
                />
              </label>
            ))}
          </div>
          <div className="mt-4">
            <label className="text-sm font-medium block mb-2">
              Mensagem do cupom (use <code className="px-1.5 py-0.5 rounded bg-secondary text-xs">{'{pct}'}</code> para inserir o % de desconto)
            </label>
            <input
              type="text"
              value={cfg.cupomMessage ?? ''}
              onChange={(e) => setCfg((c) => ({ ...c, cupomMessage: e.target.value }))}
              placeholder="Ex.: Aproveite {pct}% de desconto nas configurações Micro e Compact"
              className="w-full h-10 px-3 rounded border border-border bg-background"
            />
            <p className="text-xs text-muted-foreground mt-2">
              Exibida na página pública sempre que houver desconto aplicável.
            </p>
          </div>
        </CollapsibleSection>

        {/* ETAPA 6: Bainha extra */}
        <CollapsibleSection
          id="bainha"
          currentStep={currentStep}
          title="Bainha Extra"
          subtitle={`Versão: ${v.texts.tabLabel}`}
        >
          <label className="block">
            <span className="text-xs font-medium text-muted-foreground block mb-1.5">Valor em R$</span>
            <input
              type="number"
              min={0}
              value={v.bainhaExtraPrice}
              onChange={(e) => updateVersion({ bainhaExtraPrice: Number(e.target.value) || 0 })}
              className="w-full sm:max-w-xs h-10 px-3 rounded border border-border bg-background"
            />
          </label>
        </CollapsibleSection>

        {/* ETAPA 7: Imagens por versão × tamanho × acabamento */}
        <CollapsibleSection
          id="images"
          currentStep={currentStep}
          title="Imagens do Produto"
          subtitle="Configure imagens para cada versão, tamanho e acabamento"
        >
          {VERSION_LIST.map((vl) => {
            const ver = cfg.versions[vl.key];
            const handleImg = async (size: SizeKey | 'kit', finish: FinishKey | null, file: File | null) => {
              if (!file) return;
              if (file.size > 15 * 1024 * 1024) {
                toast.error('Imagem muito grande (máx 15MB)');
                return;
              }
              let url: string;
              try {
                const pathHint = size === 'kit' ? `${vl.key}/kit` : `${vl.key}/${size}-${finish ?? 'all'}`;
                url = await uploadImage(file, pathHint);
              } catch {
                toast.error('Não foi possível enviar a imagem');
                return;
              }
              setCfg((c) => {
                const cur = c.versions[vl.key];
                let next: VersionConfig;
                if (size === 'kit') {
                  next = { ...cur, kitImage: url };
                } else if (!cur.hasFinishes) {
                  next = {
                    ...cur,
                    imagesBySize: {
                      ...cur.imagesBySize,
                      [size]: { satin: url, sw: url, tac: url },
                    },
                  };
                } else {
                  next = {
                    ...cur,
                    imagesBySize: {
                      ...cur.imagesBySize,
                      [size]: { ...cur.imagesBySize[size], [finish!]: url },
                    },
                  };
                }
                return { ...c, versions: { ...c.versions, [vl.key]: next } };
              });
            };

            const handleImgConfig = async (size: SizeKey, aco: AcoKey, emp: EmpunhaduraKey, finish: FinishKey, file: File | null) => {
              if (!file) return;
              if (file.size > 15 * 1024 * 1024) {
                toast.error('Imagem muito grande (máx 15MB)');
                return;
              }
              let url: string;
              try {
                const pathHint = `${vl.key}/${size}-${aco}-${emp}-${finish}`;
                url = await uploadImage(file, pathHint);
              } catch {
                toast.error('Não foi possível enviar a imagem');
                return;
              }
              setCfg((c) => {
                const cur = c.versions[vl.key];
                if (!cur.imagesByConfig) return c;
                const next: VersionConfig = {
                  ...cur,
                  imagesByConfig: {
                    ...cur.imagesByConfig,
                    [size]: {
                      ...cur.imagesByConfig[size],
                      [aco]: {
                        ...cur.imagesByConfig[size][aco],
                        [emp]: { ...cur.imagesByConfig[size][aco][emp], [finish]: url },
                      },
                    },
                  } as AcoEmpunhaduraImages,
                };
                return { ...c, versions: { ...c.versions, [vl.key]: next } };
              });
            };

            return (
              <div key={vl.key} className="mb-8 p-4 border border-border rounded-lg bg-muted/20">
                <h3 className="font-semibold mb-1">{ver.texts.tabLabel}</h3>

                {ver.hasAcoEmpunhadura && ver.imagesByConfig ? (
                  <>
                    <p className="text-xs text-muted-foreground mb-4">
                      Imagens por aço × empunhadura × tamanho × acabamento (36 no total) + imagem de referência.
                    </p>
                    <div className="space-y-6">
                      {ACO_KEYS.map((ak) =>
                        EMPUNHADURA_KEYS.map((ek) => (
                          <div key={`${ak}-${ek}`}>
                            <h4 className="text-xs font-semibold mb-3 text-muted-foreground uppercase">
                              {ACO_NAMES[ak]} · {EMPUNHADURA_NAMES[ek]}
                            </h4>
                            <div className="space-y-4">
                              {SIZES.map((s) => (
                                <div key={s.key}>
                                  <div className="text-xs font-semibold mb-2 text-muted-foreground">{s.name}</div>
                                  <div className="grid grid-cols-3 gap-3">
                                    {FINISHES.map((f) => (
                                      <ImageUploader
                                        key={f.key}
                                        label={f.name}
                                        src={ver.imagesByConfig![s.key][ak][ek][f.key]}
                                        onPick={(file) => handleImgConfig(s.key, ak, ek, f.key, file)}
                                      />
                                    ))}
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>
                        ))
                      )}
                      <div>
                        <div className="text-xs font-semibold mb-2 text-muted-foreground uppercase">Referência (rodapé)</div>
                        <div className="max-w-xs">
                          <ImageUploader label="Linha completa" src={ver.kitImage} onPick={(file) => handleImg('kit', null, file)} />
                        </div>
                      </div>
                    </div>
                  </>
                ) : (
                  <>
                    <p className="text-xs text-muted-foreground mb-4">
                      {ver.hasFinishes
                        ? '9 combinações (3 tamanhos × 3 acabamentos) + imagem de referência.'
                        : '1 imagem por tamanho + imagem de referência.'}
                    </p>
                    <div className="space-y-4">
                      {SIZES.map((s) => (
                        <div key={s.key}>
                          <div className="text-xs font-semibold mb-2 text-muted-foreground">{s.name}</div>
                          <div className={`grid gap-3 ${ver.hasFinishes ? 'grid-cols-3' : 'grid-cols-1 max-w-xs'}`}>
                            {ver.hasFinishes ? (
                              FINISHES.map((f) => (
                                <ImageUploader
                                  key={f.key}
                                  label={f.name}
                                  src={ver.imagesBySize[s.key][f.key]}
                                  onPick={(file) => handleImg(s.key, f.key, file)}
                                />
                              ))
                            ) : (
                              <ImageUploader
                                label={s.name}
                                src={ver.imagesBySize[s.key].satin}
                                onPick={(file) => handleImg(s.key, 'satin', file)}
                              />
                            )}
                          </div>
                        </div>
                      ))}
                      <div>
                        <div className="text-xs font-semibold mb-2 text-muted-foreground uppercase">Referência (rodapé)</div>
                        <div className="max-w-xs">
                          <ImageUploader label="Linha completa" src={ver.kitImage} onPick={(file) => handleImg('kit', null, file)} />
                        </div>
                      </div>
                    </div>
                  </>
                )}
              </div>
            );
          })}
        </CollapsibleSection>

        <GaleriaConfiguracoes />
      </div>
    </div>
  );
}

interface GaleriaItem {
  id: string;
  titulo: string;
  descricao: string | null;
  imagem_url: string;
  ordem: number;
  ativo: boolean;
}

function GaleriaConfiguracoes() {
  const [items, setItems] = useState<GaleriaItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [novoTitulo, setNovoTitulo] = useState('');
  const [novaDescricao, setNovaDescricao] = useState('');
  const [novoArquivo, setNovoArquivo] = useState<File | null>(null);
  const [salvando, setSalvando] = useState(false);

  const carregar = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('push_dagger_galeria')
      .select('*')
      .order('ordem', { ascending: true });
    if (error) toast.error('Erro ao carregar galeria');
    setItems(data ?? []);
    setLoading(false);
  };

  useEffect(() => {
    carregar();
  }, []);

  const handleCriar = async () => {
    if (!novoTitulo.trim() || !novoArquivo) {
      toast.error('Informe um título e selecione uma imagem');
      return;
    }
    setSalvando(true);
    try {
      const url = await uploadImage(novoArquivo, `galeria/${novoTitulo.toLowerCase().replace(/\s+/g, '-')}`);
      const proximaOrdem = items.length > 0 ? Math.max(...items.map((i) => i.ordem)) + 1 : 0;
      const { error } = await supabase.from('push_dagger_galeria').insert({
        titulo: novoTitulo.trim(),
        descricao: novaDescricao.trim() || null,
        imagem_url: url,
        ordem: proximaOrdem,
        ativo: true,
      });
      if (error) throw error;
      toast.success('Configuração adicionada à galeria');
      setNovoTitulo('');
      setNovaDescricao('');
      setNovoArquivo(null);
      await carregar();
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : 'Erro';
      toast.error(`Falha ao salvar: ${msg}`);
    } finally {
      setSalvando(false);
    }
  };

  const handleUpdate = async (id: string, patch: Partial<GaleriaItem>) => {
    const { error } = await supabase.from('push_dagger_galeria').update(patch).eq('id', id);
    if (error) toast.error('Erro ao atualizar');
    else await carregar();
  };

  const handleTrocarImagem = async (item: GaleriaItem, file: File | null) => {
    if (!file) return;
    try {
      const url = await uploadImage(file, `galeria/${item.titulo.toLowerCase().replace(/\s+/g, '-')}`);
      await handleUpdate(item.id, { imagem_url: url });
      toast.success('Imagem atualizada');
    } catch {
      toast.error('Falha ao enviar imagem');
    }
  };

  const handleRemover = async (id: string) => {
    if (!confirm('Remover este item da galeria?')) return;
    const { error } = await supabase.from('push_dagger_galeria').delete().eq('id', id);
    if (error) toast.error('Erro ao remover');
    else {
      toast.success('Removido');
      await carregar();
    }
  };

  return (
    <div className="border border-border rounded-lg bg-card p-4 sm:p-5 space-y-4">
      <div>
        <h2 className="font-semibold">Galeria de Configurações</h2>
        <p className="text-xs text-muted-foreground mt-1">
          Imagens exibidas no modal "Conhecer todas as configurações" da página pública do Push Dagger.
        </p>
      </div>

      <div className="border border-dashed border-border rounded-lg p-4 space-y-3 bg-muted/20">
        <h3 className="text-sm font-semibold">Adicionar nova configuração</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <Field label="Título">
            <input
              type="text"
              value={novoTitulo}
              onChange={(e) => setNovoTitulo(e.target.value)}
              placeholder="Ex: Standard Sandvik G10 Tactical"
              className="w-full px-3 py-2 text-sm border border-border rounded bg-background"
            />
          </Field>
          <Field label="Descrição (opcional)">
            <input
              type="text"
              value={novaDescricao}
              onChange={(e) => setNovaDescricao(e.target.value)}
              placeholder="Breve descrição da configuração"
              className="w-full px-3 py-2 text-sm border border-border rounded bg-background"
            />
          </Field>
        </div>
        <div className="flex items-center gap-3 flex-wrap">
          <label className="inline-flex items-center gap-2 px-3 py-2 text-xs border border-border rounded cursor-pointer hover:bg-secondary">
            <Upload size={14} />
            {novoArquivo ? novoArquivo.name : 'Selecionar imagem'}
            <input
              type="file"
              accept="image/*"
              className="hidden"
              onChange={(e) => setNovoArquivo(e.target.files?.[0] ?? null)}
            />
          </label>
          <button
            type="button"
            onClick={handleCriar}
            disabled={salvando}
            className="px-4 py-2 text-xs font-medium rounded bg-primary text-primary-foreground hover:bg-primary/80 disabled:opacity-50"
          >
            {salvando ? 'Salvando...' : 'Adicionar à galeria'}
          </button>
        </div>
      </div>

      {loading ? (
        <div className="text-sm text-muted-foreground py-4 text-center">Carregando...</div>
      ) : items.length === 0 ? (
        <div className="text-sm text-muted-foreground py-6 text-center">Nenhuma configuração cadastrada ainda.</div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {items.map((item) => (
            <div key={item.id} className="border border-border rounded-lg overflow-hidden bg-background">
              <label className="block cursor-pointer group relative">
                <div className="aspect-square w-full bg-muted overflow-hidden">
                  <img src={item.imagem_url} alt={item.titulo} className="w-full h-full object-cover" />
                </div>
                <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition flex items-center justify-center text-white text-xs gap-2">
                  <Upload size={14} /> Trocar imagem
                </div>
                <input
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={(e) => handleTrocarImagem(item, e.target.files?.[0] ?? null)}
                />
              </label>
              <div className="p-3 space-y-2">
                <input
                  type="text"
                  value={item.titulo}
                  onChange={(e) => setItems((prev) => prev.map((i) => (i.id === item.id ? { ...i, titulo: e.target.value } : i)))}
                  onBlur={(e) => e.target.value !== '' && handleUpdate(item.id, { titulo: e.target.value })}
                  className="w-full px-2 py-1 text-sm font-medium border border-border rounded bg-background"
                />
                <textarea
                  value={item.descricao ?? ''}
                  onChange={(e) => setItems((prev) => prev.map((i) => (i.id === item.id ? { ...i, descricao: e.target.value } : i)))}
                  onBlur={(e) => handleUpdate(item.id, { descricao: e.target.value || null })}
                  placeholder="Descrição"
                  rows={2}
                  className="w-full px-2 py-1 text-xs border border-border rounded bg-background resize-none"
                />
                <div className="flex items-center justify-between gap-2">
                  <label className="flex items-center gap-1.5 text-xs">
                    <input
                      type="checkbox"
                      checked={item.ativo}
                      onChange={(e) => handleUpdate(item.id, { ativo: e.target.checked })}
                    />
                    Ativo
                  </label>
                  <input
                    type="number"
                    value={item.ordem}
                    onChange={(e) => setItems((prev) => prev.map((i) => (i.id === item.id ? { ...i, ordem: parseInt(e.target.value) || 0 } : i)))}
                    onBlur={(e) => handleUpdate(item.id, { ordem: parseInt(e.target.value) || 0 })}
                    className="w-16 px-2 py-1 text-xs border border-border rounded bg-background"
                    title="Ordem"
                  />
                  <button
                    type="button"
                    onClick={() => handleRemover(item.id)}
                    className="text-xs text-destructive hover:underline"
                  >
                    Remover
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
