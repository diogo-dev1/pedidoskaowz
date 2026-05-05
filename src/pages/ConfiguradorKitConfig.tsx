import { useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, Save, RotateCcw, Upload } from 'lucide-react';
import { toast } from 'sonner';
import {
  CONFIG_STORAGE_KEY,
  DEFAULT_CONFIG,
  KitConfig,
  loadKitConfig,
} from './ConfiguradorKit';

type FinishKey = 'satin' | 'sw' | 'tac';
type SizeKey = 'standard' | 'compact' | 'micro';

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

  const setPrice = (size: SizeKey, finish: FinishKey, val: number) => {
    setCfg((c) => ({
      ...c,
      prices: { ...c.prices, [size]: { ...c.prices[size], [finish]: val } },
    }));
  };

  const handleImage = async (finish: FinishKey | 'kit', file: File | null) => {
    if (!file) return;
    if (file.size > 4 * 1024 * 1024) {
      toast.error('Imagem muito grande (máx 4MB)');
      return;
    }
    const dataUrl = await fileToDataUrl(file);
    setCfg((c) =>
      finish === 'kit'
        ? { ...c, kitImage: dataUrl }
        : { ...c, images: { ...c.images, [finish]: dataUrl } },
    );
  };

  const save = () => {
    try {
      localStorage.setItem(CONFIG_STORAGE_KEY, JSON.stringify(cfg));
      toast.success('Configurações salvas');
    } catch (e) {
      toast.error('Erro ao salvar (talvez imagens muito grandes)');
    }
  };

  const reset = () => {
    if (!confirm('Restaurar configurações padrão?')) return;
    localStorage.removeItem(CONFIG_STORAGE_KEY);
    setCfg(DEFAULT_CONFIG);
    toast.success('Configurações restauradas');
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6 pb-12">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <Link
          to="/configurador-kit"
          className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft size={16} /> Voltar ao Configurador
        </Link>
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

      <div>
        <h1 className="text-2xl font-bold">Configurações do Kit</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Edite valores, desconto e imagens do Configurador de Kit Push Dagger.
        </p>
      </div>

      {/* Preços */}
      <section className="border border-border rounded-lg p-5 bg-card">
        <h2 className="font-semibold mb-4">Valores por Tamanho × Acabamento (R$)</h2>
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
                        value={cfg.prices[s.key][f.key]}
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

      {/* Desconto + bainha extra */}
      <section className="grid sm:grid-cols-2 gap-4">
        <div className="border border-border rounded-lg p-5 bg-card">
          <label className="font-semibold block mb-2">Desconto do Kit (%)</label>
          <input
            type="number"
            min={0}
            max={100}
            value={cfg.discountPercent}
            onChange={(e) =>
              setCfg((c) => ({ ...c, discountPercent: Math.max(0, Math.min(100, Number(e.target.value) || 0)) }))
            }
            className="w-full h-10 px-3 rounded border border-border bg-background"
          />
          <p className="text-xs text-muted-foreground mt-2">
            Aplicado sobre o subtotal (acabamentos + bainha extra).
          </p>
        </div>
        <div className="border border-border rounded-lg p-5 bg-card">
          <label className="font-semibold block mb-2">Valor da Bainha Extra (R$)</label>
          <input
            type="number"
            min={0}
            value={cfg.bainhaExtraPrice}
            onChange={(e) => setCfg((c) => ({ ...c, bainhaExtraPrice: Number(e.target.value) || 0 }))}
            className="w-full h-10 px-3 rounded border border-border bg-background"
          />
        </div>
      </section>

      {/* Imagens */}
      <section className="border border-border rounded-lg p-5 bg-card">
        <h2 className="font-semibold mb-4">Imagens</h2>
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {FINISHES.map((f) => (
            <ImageUploader
              key={f.key}
              label={f.name}
              src={cfg.images[f.key]}
              onPick={(file) => handleImage(f.key, file)}
            />
          ))}
          <ImageUploader
            label="Kit Completo"
            src={cfg.kitImage}
            onPick={(file) => handleImage('kit', file)}
          />
        </div>
        <p className="text-xs text-muted-foreground mt-3">
          Imagens são salvas localmente neste navegador (máx ~4MB cada).
        </p>
      </section>
    </div>
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
