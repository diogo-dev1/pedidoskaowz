import { useEffect, useState } from 'react';
import { Save, RotateCcw, Upload, Link2, ChevronDown, ChevronUp, ExternalLink } from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import {
  DEFAULT_URBAN_EDC_CONFIG,
  UrbanEdcConfig,
  UrbanEdcTexts,
  loadUrbanEdcConfig,
  saveUrbanEdcConfig,
} from './KitUrbanEdc';
import {
  ACO_KEYS, ACO_NAMES, EMPUNHADURA_KEYS, EMPUNHADURA_NAMES,
  type AcoKey, type EmpunhaduraKey,
} from './ConfiguradorKit';

const IMAGE_BUCKET = 'modelo-imagens';

type StepId = 'whatsapp' | 'texts' | 'push' | 'canivetes' | 'multitool' | 'discount' | 'images';

interface CatalogoCanivete {
  id: string;
  nome_modelo: string;
  preco_base: number;
  imagem_modelo: string | null;
}

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
  canvas.width = w; canvas.height = h;
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
  const path = `urban-edc/${pathHint}-${Date.now()}.${ext}`;
  const { error } = await supabase.storage.from(IMAGE_BUCKET).upload(path, blob, { upsert: true, contentType: blob.type || file.type });
  if (error) throw error;
  const { data } = supabase.storage.from(IMAGE_BUCKET).getPublicUrl(path);
  return data.publicUrl;
};

const BRL = (n: number) => n.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL', minimumFractionDigits: 0, maximumFractionDigits: 0 });

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="text-xs font-medium text-muted-foreground block mb-1.5">{label}</span>
      {children}
    </label>
  );
}

function ImageUploader({ label, src, onPick }: { label: string; src: string; onPick: (file: File | null) => void }) {
  return (
    <label className="block cursor-pointer group">
      <div className="aspect-square w-full rounded border border-border bg-muted overflow-hidden relative">
        {src && <img src={src} alt={label} className="w-full h-full object-cover" />}
        {!src && (
          <div className="absolute inset-0 flex items-center justify-center text-muted-foreground text-xs">
            <Upload size={14} className="mr-1" /> Enviar
          </div>
        )}
        <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition flex items-center justify-center text-white text-xs gap-2">
          <Upload size={14} /> Trocar
        </div>
      </div>
      <div className="text-xs mt-2 font-medium">{label}</div>
      <input type="file" accept="image/*" className="hidden" onChange={(e) => onPick(e.target.files?.[0] ?? null)} />
    </label>
  );
}

function Section({ id, currentStep, title, subtitle, children }: {
  id: StepId; currentStep: StepId; title: string; subtitle?: string; children: React.ReactNode;
}) {
  const isOpen = id === currentStep;
  return (
    <div className="border border-border rounded-lg overflow-hidden bg-card transition-all">
      <div className={`p-4 sm:p-5 cursor-pointer hover:bg-muted/50 transition flex items-center justify-between ${isOpen ? 'bg-muted/20' : ''}`}>
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

export default function KitUrbanEdcConfig() {
  const [cfg, setCfg] = useState<UrbanEdcConfig>(DEFAULT_URBAN_EDC_CONFIG);
  const [loaded, setLoaded] = useState(false);
  const [saving, setSaving] = useState(false);
  const [currentStep, setCurrentStep] = useState<StepId>('whatsapp');
  const [catalogoCanivetes, setCatalogoCanivetes] = useState<CatalogoCanivete[]>([]);
  const [catalogoMultitools, setCatalogoMultitools] = useState<CatalogoCanivete[]>([]);

  useEffect(() => {
    let active = true;
    (async () => {
      const c = await loadUrbanEdcConfig();
      // canivetes + multitools disponíveis no catálogo (site)
      const [cvRes, mtRes] = await Promise.all([
        supabase
          .from('catalogo_modelos')
          .select('id, nome_modelo, preco_base, imagem_modelo')
          .or('nome_modelo.ilike.%canivete%,nome_modelo.ilike.%K-1%,nome_modelo.ilike.%K1%')
          .order('nome_modelo'),
        supabase
          .from('catalogo_modelos')
          .select('id, nome_modelo, preco_base, imagem_modelo')
          .or('nome_modelo.ilike.%multitool%,nome_modelo.ilike.%multi tool%,nome_modelo.ilike.%ferramenta%')
          .order('nome_modelo'),
      ]);
      if (!active) return;
      setCfg(c);
      setCatalogoCanivetes((cvRes.data as CatalogoCanivete[]) || []);
      setCatalogoMultitools((mtRes.data as CatalogoCanivete[]) || []);
      setLoaded(true);
    })();
    return () => { active = false; };
  }, []);

  const updateTexts = (patch: Partial<UrbanEdcTexts>) => setCfg((c) => ({ ...c, texts: { ...c.texts, ...patch } }));

  const toggleCanivete = (id: string) => {
    setCfg((c) => {
      const exists = c.caniveteIds.includes(id);
      return { ...c, caniveteIds: exists ? c.caniveteIds.filter((x) => x !== id) : [...c.caniveteIds, id] };
    });
  };

  const toggleEsgotado = (id: string) => {
    setCfg((c) => {
      const exists = c.caniveteEsgotadoIds.includes(id);
      return { ...c, caniveteEsgotadoIds: exists ? c.caniveteEsgotadoIds.filter((x) => x !== id) : [...c.caniveteEsgotadoIds, id] };
    });
  };

  const save = async () => {
    setSaving(true);
    try { await saveUrbanEdcConfig(cfg); toast.success('Configurações salvas'); }
    catch (e) { console.error(e); toast.error('Erro ao salvar (a tabela urban_edc_config existe no Supabase?)'); }
    finally { setSaving(false); }
  };

  const reset = async () => {
    if (!confirm('Restaurar configurações padrão?')) return;
    setCfg(DEFAULT_URBAN_EDC_CONFIG);
    setSaving(true);
    try { await saveUrbanEdcConfig(DEFAULT_URBAN_EDC_CONFIG); toast.success('Restaurado'); }
    catch { toast.error('Erro ao restaurar'); }
    finally { setSaving(false); }
  };

  const handleImageUpload = async (field: 'bannerImage' | 'kitImage', file: File | null) => {
    if (!file) return;
    if (file.size > 15 * 1024 * 1024) { toast.error('Imagem muito grande (máx 15MB)'); return; }
    try {
      const url = await uploadImage(file, field);
      setCfg((c) => ({ ...c, [field]: url }));
    } catch { toast.error('Falha ao enviar imagem'); }
  };

  if (!loaded) return <div className="max-w-5xl mx-auto py-12 text-center text-muted-foreground">Carregando configurações...</div>;

  const steps: { id: StepId; label: string }[] = [
    { id: 'whatsapp', label: 'WhatsApp' },
    { id: 'texts', label: 'Textos' },
    { id: 'push', label: 'Push Dagger' },
    { id: 'canivetes', label: 'Canivetes' },
    { id: 'multitool', label: 'Multitool & Case' },
    { id: 'discount', label: 'Desconto' },
    { id: 'images', label: 'Imagens' },
  ];

  return (
    <div className="max-w-5xl mx-auto pb-12 px-4 sm:px-0">
      {/* Header */}
      <div className="flex items-start justify-between gap-4 flex-col sm:flex-row mb-8 pt-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold">Kit Urban EDC</h1>
          <p className="text-xs sm:text-sm text-muted-foreground mt-1">
            Push Dagger e Canivetes vêm das fontes reais (Kit Push Dagger + Catálogo). Aqui você ajusta textos, seleção, desconto e imagens do kit.
          </p>
        </div>
        <div className="flex gap-2 flex-col sm:flex-row w-full sm:w-auto">
          <button
            onClick={async () => {
              const url = `${window.location.origin}/kit-urban-edc`;
              try { await navigator.clipboard.writeText(url); toast.success('Link copiado!', { description: url }); }
              catch { toast.error('Não foi possível copiar', { description: url }); }
            }}
            className="inline-flex items-center justify-center gap-2 px-3 py-2 text-sm border border-border rounded hover:bg-secondary w-full sm:w-auto"
          >
            <Link2 size={14} /> Copiar link
          </button>
          <button onClick={reset} disabled={saving} className="inline-flex items-center justify-center gap-2 px-3 py-2 text-sm border border-border rounded hover:bg-secondary disabled:opacity-50 w-full sm:w-auto">
            <RotateCcw size={14} /> Restaurar
          </button>
          <button onClick={save} disabled={saving} className="inline-flex items-center justify-center gap-2 px-4 py-2 text-sm bg-primary text-primary-foreground rounded hover:bg-primary/80 disabled:opacity-50 w-full sm:w-auto">
            <Save size={14} /> {saving ? 'Salvando...' : 'Salvar'}
          </button>
        </div>
      </div>

      {/* Steps nav */}
      <div className="flex flex-wrap gap-2 mb-8">
        {steps.map((s) => (
          <button key={s.id} onClick={() => setCurrentStep(s.id)}
            className={`px-4 py-2 text-sm rounded-md border transition ${currentStep === s.id ? 'bg-primary text-primary-foreground border-primary' : 'bg-background border-border hover:bg-secondary'}`}>
            {s.label}
          </button>
        ))}
      </div>

      <div className="space-y-4">
        {/* WhatsApp */}
        <Section id="whatsapp" currentStep={currentStep} title="WhatsApp da empresa">
          <input type="text" value={cfg.whatsappPhone}
            onChange={(e) => setCfg((c) => ({ ...c, whatsappPhone: e.target.value.replace(/\D/g, '') }))}
            placeholder="5528999025695"
            className="w-full sm:max-w-xs h-10 px-3 rounded border border-border bg-background" />
          <p className="text-xs text-muted-foreground mt-2">Formato: 55 + DDD + número (apenas dígitos).</p>
        </Section>

        {/* Textos */}
        <Section id="texts" currentStep={currentStep} title="Textos & Blocos" subtitle="Edite todos os textos da página pública">
          <div className="grid sm:grid-cols-2 gap-4">
            <Field label="Eyebrow (acima do título)">
              <input type="text" value={cfg.texts.eyebrow} onChange={(e) => updateTexts({ eyebrow: e.target.value })} className="w-full h-10 px-3 rounded border border-border bg-background" />
            </Field>
            <Field label="Texto do botão (CTA)">
              <input type="text" value={cfg.texts.ctaText} onChange={(e) => updateTexts({ ctaText: e.target.value })} className="w-full h-10 px-3 rounded border border-border bg-background" />
            </Field>
          </div>
          <Field label="Título principal (use {} para destacar. Ex: MONTE SEU {KIT URBAN EDC})">
            <input type="text" value={cfg.texts.heroTitle} onChange={(e) => updateTexts({ heroTitle: e.target.value })} className="w-full h-10 px-3 rounded border border-border bg-background" />
          </Field>
          <Field label="Descrição (hero)">
            <textarea rows={3} value={cfg.texts.heroDesc} onChange={(e) => updateTexts({ heroDesc: e.target.value })} className="w-full p-3 rounded border border-border bg-background" />
          </Field>
          <div className="grid sm:grid-cols-2 gap-4">
            <Field label="Eyebrow do bloco de referência">
              <input type="text" value={cfg.texts.refEyebrow} onChange={(e) => updateTexts({ refEyebrow: e.target.value })} className="w-full h-10 px-3 rounded border border-border bg-background" />
            </Field>
            <Field label="Título do bloco de referência">
              <input type="text" value={cfg.texts.refTitle} onChange={(e) => updateTexts({ refTitle: e.target.value })} className="w-full h-10 px-3 rounded border border-border bg-background" />
            </Field>
            <Field label="Legenda esquerda (ref)">
              <input type="text" value={cfg.texts.refLabel} onChange={(e) => updateTexts({ refLabel: e.target.value })} className="w-full h-10 px-3 rounded border border-border bg-background" />
            </Field>
            <Field label="Legenda direita (ref)">
              <input type="text" value={cfg.texts.refSub} onChange={(e) => updateTexts({ refSub: e.target.value })} className="w-full h-10 px-3 rounded border border-border bg-background" />
            </Field>
          </div>
          <Field label="Nota do rodapé (use Enter para nova linha)">
            <textarea rows={3} value={cfg.texts.footerNote} onChange={(e) => updateTexts({ footerNote: e.target.value })} className="w-full p-3 rounded border border-border bg-background" />
          </Field>
        </Section>

        {/* Push Dagger config */}
        <Section id="push" currentStep={currentStep} title="Push Dagger" subtitle="Preços e imagens vêm do Kit Push Dagger (versão Metálica)">
          <div className="p-3 rounded-lg border border-blue-200 bg-blue-50 dark:bg-blue-950 dark:border-blue-800 text-xs text-blue-800 dark:text-blue-300 flex items-start gap-2">
            <ExternalLink size={14} className="flex-shrink-0 mt-0.5" />
            <span>
              Os preços e fotos da Push Dagger (Compact e Micro) são puxados automaticamente da configuração do{' '}
              <a href="/admin/push-dagger-kaowz" className="underline font-medium">Kit Push Dagger</a>. Para alterá-los, edite lá.
              Aqui você define apenas o <strong>aço</strong> e a <strong>empunhadura</strong> que vêm pré-selecionados — na página o cliente pode trocar ambos (nas versões Metálicas).
            </span>
          </div>
          <div className="grid sm:grid-cols-2 gap-4">
            <Field label="Aço inicial (cliente pode trocar entre Sandvik e Inox)">
              <select value={cfg.pushAco} onChange={(e) => setCfg((c) => ({ ...c, pushAco: e.target.value as AcoKey }))}
                className="w-full h-10 px-3 rounded border border-border bg-background">
                {ACO_KEYS.map((k) => <option key={k} value={k}>{ACO_NAMES[k]}</option>)}
              </select>
            </Field>
            <Field label="Empunhadura inicial (cliente pode trocar entre G10 e Micarta)">
              <select value={cfg.pushEmpunhadura} onChange={(e) => setCfg((c) => ({ ...c, pushEmpunhadura: e.target.value as EmpunhaduraKey }))}
                className="w-full h-10 px-3 rounded border border-border bg-background">
                {EMPUNHADURA_KEYS.map((k) => <option key={k} value={k}>{EMPUNHADURA_NAMES[k]}</option>)}
              </select>
            </Field>
          </div>
          <p className="text-xs text-muted-foreground">
            Apenas <strong>Compact</strong> e <strong>Micro</strong> são oferecidas (a Standard não cabe na case). Na página o cliente escolhe tamanho, <strong>aço (Sandvik/Inox)</strong> e acabamento.
          </p>
        </Section>

        {/* Canivetes selection */}
        <Section id="canivetes" currentStep={currentStep} title="Canivetes K1" subtitle="Selecione quais canivetes do catálogo aparecem no kit">
          <div className="p-3 rounded-lg border border-blue-200 bg-blue-50 dark:bg-blue-950 dark:border-blue-800 text-xs text-blue-800 dark:text-blue-300 flex items-start gap-2">
            <ExternalLink size={14} className="flex-shrink-0 mt-0.5" />
            <span>Preços e fotos dos canivetes vêm do <a href="/admin/catalogo" className="underline font-medium">Catálogo</a> (site/Shopify). Marque os que devem aparecer como opção.</span>
          </div>
          {catalogoCanivetes.length === 0 ? (
            <p className="text-sm text-muted-foreground py-4 text-center">Nenhum canivete encontrado no catálogo.</p>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {catalogoCanivetes.map((cv) => {
                const selected = cfg.caniveteIds.includes(cv.id);
                const order = cfg.caniveteIds.indexOf(cv.id);
                const esgotado = cfg.caniveteEsgotadoIds.includes(cv.id);
                return (
                  <div key={cv.id}
                    className={`border rounded-lg overflow-hidden transition relative ${selected ? 'border-primary ring-1 ring-primary' : 'border-border'}`}>
                    <button type="button" onClick={() => toggleCanivete(cv.id)} className="block w-full text-left hover:bg-secondary transition">
                      {selected && <span className="absolute top-2 left-2 z-10 bg-primary text-primary-foreground text-xs font-bold w-6 h-6 rounded-full flex items-center justify-center">{order + 1}</span>}
                      {esgotado && <span className="absolute top-2 right-2 z-10 bg-red-500 text-white text-[10px] font-bold uppercase px-2 py-0.5 rounded">Esgotado</span>}
                      <div className="aspect-square w-full bg-muted overflow-hidden">
                        {cv.imagem_modelo ? <img src={cv.imagem_modelo} alt={cv.nome_modelo} className={`w-full h-full object-cover ${esgotado ? 'opacity-50' : ''}`} /> : <div className="w-full h-full flex items-center justify-center text-muted-foreground text-xs">sem imagem</div>}
                      </div>
                      <div className="p-2.5">
                        <div className="text-sm font-medium leading-tight">{cv.nome_modelo.trim()}</div>
                        <div className="text-xs text-primary font-semibold mt-1">{BRL(cv.preco_base)}</div>
                      </div>
                    </button>
                    {selected && (
                      <button type="button" onClick={() => toggleEsgotado(cv.id)}
                        className={`block w-full text-xs font-medium py-2 border-t transition ${esgotado ? 'bg-red-500/10 text-red-600 dark:text-red-400 border-red-500/30 hover:bg-red-500/20' : 'border-border text-muted-foreground hover:bg-secondary'}`}>
                        {esgotado ? '✓ Esgotado (clique para reativar)' : 'Marcar como esgotado'}
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
          )}
          <p className="text-xs text-muted-foreground">O número indica a ordem em que aparecem na página. Clique para marcar/desmarcar.</p>
        </Section>

        {/* Multitool & Case */}
        <Section id="multitool" currentStep={currentStep} title="Multitool & Case" subtitle="Inclusos no kit — valores embutidos no total (não exibidos ao cliente)">
          <div className="p-3 rounded-lg border border-amber-200 bg-amber-50 dark:bg-amber-950 dark:border-amber-800 text-xs text-amber-800 dark:text-amber-300 flex items-start gap-2">
            <ExternalLink size={14} className="flex-shrink-0 mt-0.5" />
            <span>Os valores do Multitool e da Case são <strong>somados ao total do kit</strong>, mas <strong>não aparecem</strong> para o cliente (só o total final).</span>
          </div>

          <div>
            <span className="text-xs font-medium text-muted-foreground block mb-2">Multitool (foto e nome vêm do catálogo/site)</span>
            {catalogoMultitools.length === 0 ? (
              <p className="text-sm text-muted-foreground py-2">Nenhum multitool encontrado no catálogo.</p>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
                {catalogoMultitools.map((mt) => {
                  const selected = cfg.multitoolId === mt.id;
                  return (
                    <button key={mt.id} type="button" onClick={() => setCfg((c) => ({ ...c, multitoolId: mt.id }))}
                      className={`text-left border rounded-lg overflow-hidden transition relative ${selected ? 'border-primary ring-1 ring-primary' : 'border-border hover:bg-secondary'}`}>
                      {selected && <span className="absolute top-2 left-2 z-10 bg-primary text-primary-foreground text-xs font-bold px-2 py-0.5 rounded-full">selecionado</span>}
                      <div className="aspect-square w-full bg-muted overflow-hidden">
                        {mt.imagem_modelo ? <img src={mt.imagem_modelo} alt={mt.nome_modelo} className="w-full h-full object-cover" /> : <div className="w-full h-full flex items-center justify-center text-muted-foreground text-xs">sem imagem</div>}
                      </div>
                      <div className="p-2.5">
                        <div className="text-sm font-medium leading-tight">{mt.nome_modelo.trim()}</div>
                      </div>
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          <div className="grid sm:grid-cols-2 gap-4 max-w-md">
            <Field label="Valor do Multitool (R$) — embutido">
              <input type="number" min={0} value={cfg.multitoolPrice}
                onChange={(e) => setCfg((c) => ({ ...c, multitoolPrice: Number(e.target.value) || 0 }))}
                className="w-full h-10 px-3 rounded border border-border bg-background" />
            </Field>
            <Field label="Valor da Case (R$) — embutido">
              <input type="number" min={0} value={cfg.casePrice}
                onChange={(e) => setCfg((c) => ({ ...c, casePrice: Number(e.target.value) || 0 }))}
                className="w-full h-10 px-3 rounded border border-border bg-background" />
            </Field>
          </div>
        </Section>

        {/* Discount */}
        <Section id="discount" currentStep={currentStep} title="Desconto do Kit" subtitle="Desconto percentual sobre o total do kit">
          <div className="max-w-xs">
            <Field label="Desconto (%)">
              <input type="number" min={0} max={100} value={cfg.kitDiscount}
                onChange={(e) => setCfg((c) => ({ ...c, kitDiscount: Math.max(0, Math.min(100, Number(e.target.value) || 0)) }))}
                className="w-full h-10 px-3 rounded border border-border bg-background" />
            </Field>
          </div>
          <p className="text-xs text-muted-foreground mt-2">0 = sem desconto. Aplicado sobre o total (Push + Canivete + Multitool + Case).</p>
        </Section>

        {/* Images */}
        <Section id="images" currentStep={currentStep} title="Imagens do Kit" subtitle="Banner e foto de referência do kit completo">
          <div className="grid grid-cols-2 gap-4 max-w-md">
            <ImageUploader label="Banner (abaixo do título)" src={cfg.bannerImage} onPick={(file) => handleImageUpload('bannerImage', file)} />
            <ImageUploader label="Kit Completo (rodapé)" src={cfg.kitImage} onPick={(file) => handleImageUpload('kitImage', file)} />
          </div>
          <p className="text-xs text-muted-foreground">O banner aparece logo abaixo de "Monte seu Kit". As fotos da Push, Canivetes e Multitool vêm das fontes reais.</p>
        </Section>
      </div>
    </div>
  );
}
