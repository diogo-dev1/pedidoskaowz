import { useState } from 'react';
import { Save, RotateCcw, Upload } from 'lucide-react';
import { toast } from 'sonner';
import {
  CONFIG_STORAGE_KEY,
  DEFAULT_CONFIG,
  KitConfig,
  VersionConfig,
  VersionKey,
  VERSION_LIST,
  loadKitConfig,
  WHATSAPP_PHONE_DEFAULT,
} from './ConfiguradorKit';

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

const fileToDataUrl = (file: File): Promise<string> =>
  new Promise((resolve, reject) => {
    const r = new FileReader();
    r.onload = () => resolve(r.result as string);
    r.onerror = reject;
    r.readAsDataURL(file);
  });

export default function ConfiguradorKitConfig() {
  const [cfg, setCfg] = useState<KitConfig>(() => loadKitConfig());
  const [versionKey, setVersionKey] = useState<VersionKey>('standard');

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

  const handleImage = async (size: SizeKey | 'kit', finish: FinishKey | null, file: File | null) => {
    if (!file) return;
    if (file.size > 4 * 1024 * 1024) {
      toast.error('Imagem muito grande (máx 4MB)');
      return;
    }
    const dataUrl = await fileToDataUrl(file);
    if (size === 'kit') {
      updateVersion({ kitImage: dataUrl });
    } else {
      updateVersion({
        imagesBySize: {
          ...v.imagesBySize,
          [size]: { ...v.imagesBySize[size], [finish!]: dataUrl },
        },
      });
    }
  };

  const setDiscount = (q: QtyKey, val: number) => {
    updateVersion({
      discountByQty: { ...v.discountByQty, [q]: Math.max(0, Math.min(100, val || 0)) },
    });
  };

  const save = () => {
    try {
      localStorage.setItem(CONFIG_STORAGE_KEY, JSON.stringify(cfg));
      toast.success('Configurações salvas');
    } catch {
      toast.error('Erro ao salvar (talvez imagens muito grandes)');
    }
  };

  const reset = () => {
    if (!confirm('Restaurar configurações padrão de TODAS as versões?')) return;
    localStorage.removeItem(CONFIG_STORAGE_KEY);
    setCfg(DEFAULT_CONFIG);
    toast.success('Configurações restauradas');
  };

  return (
    <div className="max-w-5xl mx-auto space-y-6 pb-12">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold">Push Dagger Kaowz</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Edite textos, blocos, valores, descontos e imagens de cada versão da landpage pública.
          </p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={reset}
            className="inline-flex items-center gap-2 px-3 py-2 text-sm border border-border rounded hover:bg-secondary"
          >
            <RotateCcw size={14} /> Restaurar
          </button>
          <button
            onClick={save}
            className="inline-flex items-center gap-2 px-4 py-2 text-sm bg-primary text-primary-foreground rounded hover:bg-primary/80"
          >
            <Save size={14} /> Salvar
          </button>
        </div>
      </div>

      {/* WhatsApp (global) */}
      <section className="border border-border rounded-lg p-5 bg-card">
        <label className="font-semibold block mb-2">WhatsApp da empresa (todas as versões)</label>
        <input
          type="text"
          value={cfg.whatsappPhone}
          onChange={(e) => setCfg((c) => ({ ...c, whatsappPhone: e.target.value.replace(/\D/g, '') }))}
          placeholder={WHATSAPP_PHONE_DEFAULT}
          className="w-full sm:max-w-xs h-10 px-3 rounded border border-border bg-background"
        />
        <p className="text-xs text-muted-foreground mt-2">Formato: 55 + DDD + número (apenas dígitos).</p>
      </section>

      {/* Seletor de versão */}
      <div className="flex flex-wrap gap-2 border-b border-border pb-3">
        {VERSION_LIST.map((vl) => (
          <button
            key={vl.key}
            onClick={() => setVersionKey(vl.key)}
            className={`px-4 py-2 text-sm rounded-md border transition ${
              versionKey === vl.key
                ? 'bg-primary text-primary-foreground border-primary'
                : 'bg-card border-border hover:bg-secondary'
            }`}
          >
            {cfg.versions[vl.key].texts.tabLabel || vl.label}
          </button>
        ))}
      </div>

      {/* Textos / blocos da versão */}
      <section className="border border-border rounded-lg p-5 bg-card space-y-4">
        <h2 className="font-semibold">Textos & Blocos — {v.texts.tabLabel}</h2>
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
        <Field label="Título principal (use {} para destacar em amarelo. Ex: MONTE SEU {KIT})">
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
      </section>

      {/* Preços */}
      <section className="border border-border rounded-lg p-5 bg-card">
        <h2 className="font-semibold mb-4">Valores (R$) — {v.texts.tabLabel}</h2>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-muted-foreground">
                <th className="py-2 pr-3 font-medium">Tamanho</th>
                {FINISHES.map((f) => (
                  <th key={f.key} className="py-2 px-2 font-medium">{f.name}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {SIZES.map((s) => (
                <tr key={s.key} className="border-t border-border">
                  <td className="py-2 pr-3 font-medium">{s.name}</td>
                  {FINISHES.map((f) => (
                    <td key={f.key} className="py-2 px-2">
                      <input
                        type="number"
                        min={0}
                        value={v.prices[s.key][f.key]}
                        onChange={(e) => setPrice(s.key, f.key, Number(e.target.value) || 0)}
                        className="w-28 h-9 px-2 rounded border border-border bg-background"
                      />
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {/* Descontos por quantidade */}
      <section className="border border-border rounded-lg p-5 bg-card">
        <h2 className="font-semibold mb-4">Descontos por Quantidade (%) — {v.texts.tabLabel}</h2>
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
                value={v.discountByQty[q]}
                onChange={(e) => setDiscount(q, Number(e.target.value))}
                className="mt-1 w-full h-10 px-3 rounded border border-border bg-background"
              />
            </label>
          ))}
        </div>
      </section>

      {/* Bainha extra */}
      <section className="border border-border rounded-lg p-5 bg-card">
        <label className="font-semibold block mb-2">Valor da Bainha Extra (R$) — {v.texts.tabLabel}</label>
        <input
          type="number"
          min={0}
          value={v.bainhaExtraPrice}
          onChange={(e) => updateVersion({ bainhaExtraPrice: Number(e.target.value) || 0 })}
          className="w-full sm:max-w-xs h-10 px-3 rounded border border-border bg-background"
        />
      </section>

      {/* Imagens por tamanho × acabamento */}
      <section className="border border-border rounded-lg p-5 bg-card">
        <h2 className="font-semibold mb-1">Imagens — {v.texts.tabLabel}</h2>
        <p className="text-xs text-muted-foreground mb-4">
          Faça upload de uma imagem para cada combinação (9 no total). Salvas localmente neste navegador (máx ~4MB cada).
        </p>
        <div className="space-y-6">
          {SIZES.map((s) => (
            <div key={s.key}>
              <h3 className="text-sm font-semibold mb-2 uppercase tracking-wider text-muted-foreground">{s.name}</h3>
              <div className="grid grid-cols-3 gap-3">
                {FINISHES.map((f) => (
                  <ImageUploader
                    key={f.key}
                    label={f.name}
                    src={v.imagesBySize[s.key][f.key]}
                    onPick={(file) => handleImage(s.key, f.key, file)}
                  />
                ))}
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Imagem de referência */}
      <section className="border border-border rounded-lg p-5 bg-card">
        <h2 className="font-semibold mb-3">Imagem de Referência (rodapé) — {v.texts.tabLabel}</h2>
        <div className="max-w-xs">
          <ImageUploader
            label="Linha completa"
            src={v.kitImage}
            onPick={(file) => handleImage('kit', null, file)}
          />
        </div>
      </section>
    </div>
  );
}

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
