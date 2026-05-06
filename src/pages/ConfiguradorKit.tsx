import { useEffect, useMemo, useState } from 'react';
import kaowzLogo from '@/assets/kaowz-logo.png';
import kitCard from '@/assets/push-dagger-kit-card.jpeg';
import imgAcetinada from '@/assets/push-dagger-acetinada.jpeg';
import imgStoneWashed from '@/assets/push-dagger-stone-washed.jpeg';
import imgTactical from '@/assets/push-dagger-tactical.jpeg';

type FinishKey = 'satin' | 'sw' | 'tac';
type SizeKey = 'standard' | 'compact' | 'micro';
type BainhaKey = 'velada' | 'multi';
type QtyKey = 1 | 2 | 3;
export type VersionKey = 'standard' | 'nonmetallic' | 'blue';

const FINISH_NAMES: Record<FinishKey, string> = {
  satin: 'Acetinada',
  sw: 'Stone Washed',
  tac: 'Tactical',
};
const FINISH_KEYS: FinishKey[] = ['satin', 'sw', 'tac'];

const SIZE_LIST: { key: SizeKey; name: string; bladeMm: number; gripMm: number }[] = [
  { key: 'standard', name: 'STANDARD', bladeMm: 62.49, gripMm: 87.97 },
  { key: 'compact',  name: 'COMPACT',  bladeMm: 52.74, gripMm: 73.84 },
  { key: 'micro',    name: 'MICRO',    bladeMm: 37.16, gripMm: 68.51 },
];

export const WHATSAPP_PHONE_DEFAULT = '5528999025695';
export const VERSION_LIST: { key: VersionKey; label: string }[] = [
  { key: 'standard', label: 'Aço Sandvik 14C28N' },
  { key: 'nonmetallic', label: 'Non Metallic' },
  { key: 'blue', label: 'Blue (Treino)' },
];

export interface VersionTexts {
  /** Nome curto exibido na aba de versão */
  tabLabel: string;
  /** Linha pequena acima do título */
  eyebrow: string;
  /** Título principal (use {KIT} para destacar em amarelo) */
  heroTitle: string;
  /** Descrição abaixo do título */
  heroDesc: string;
  /** Texto do botão CTA */
  ctaText: string;
  /** Bloco de referência (rodapé) */
  refEyebrow: string;
  refTitle: string;
  refLabel: string;
  refSub: string;
  /** Nota final */
  footerNote: string;
}

export interface VersionConfig {
  texts: VersionTexts;
  /** Se true, mostra os 3 acabamentos (Acetinada/SW/Tactical). Se false, apenas tamanho. */
  hasFinishes: boolean;
  prices: Record<SizeKey, Record<FinishKey, number>>;
  imagesBySize: Record<SizeKey, Record<FinishKey, string>>;
  kitImage: string;
  discountByQty: Record<QtyKey, number>;
  bainhaExtraPrice: number;
}

export interface KitConfig {
  whatsappPhone: string;
  /** Descontos globais (%) aplicados a todo o pedido por quantidade total de unidades */
  discountByQty: Record<QtyKey, number>;
  versions: Record<VersionKey, VersionConfig>;
}

const defaultImgsForSize = (): Record<FinishKey, string> => ({
  satin: imgAcetinada,
  sw: imgStoneWashed,
  tac: imgTactical,
});

const baseTexts = (over: Partial<VersionTexts>): VersionTexts => ({
  tabLabel: 'Original',
  eyebrow: '— Push Dagger Series —',
  heroTitle: 'MONTE SEU {KIT}',
  heroDesc:
    'A evolução de um ícone da defesa pessoal. Escolha quantas unidades quer e configure cada uma.',
  ctaText: 'Quero Comprar Agora',
  refEyebrow: '— Referência Visual —',
  refTitle: 'Linha Push Dagger',
  refLabel: 'Standard · Compact · Micro',
  refSub: 'Acetinada · Stone Washed · Tactical',
  footerNote:
    'Garantia vitalícia · Afiação vitalícia gratuita · Certificado oficial · Cartão premium gravado a laser\nVenda exclusiva para maiores de 18 anos.',
  ...over,
});

const buildVersion = (over: Partial<VersionConfig> & { texts: VersionTexts }): VersionConfig => ({
  hasFinishes: true,
  prices: {
    standard: { satin: 935, sw: 985, tac: 1090 },
    compact:  { satin: 645, sw: 665, tac: 755 },
    micro:    { satin: 515, sw: 535, tac: 625 },
  },
  imagesBySize: {
    standard: defaultImgsForSize(),
    compact: defaultImgsForSize(),
    micro: defaultImgsForSize(),
  },
  kitImage: kitCard,
  discountByQty: { 1: 0, 2: 5, 3: 10 },
  bainhaExtraPrice: 180,
  ...over,
});

export const DEFAULT_CONFIG: KitConfig = {
  whatsappPhone: WHATSAPP_PHONE_DEFAULT,
  discountByQty: { 1: 0, 2: 5, 3: 10 },
  versions: {
    standard: buildVersion({ texts: baseTexts({ tabLabel: 'Aço Sandvik 14C28N' }) }),
    nonmetallic: buildVersion({
      hasFinishes: false,
      prices: {
        standard: { satin: 290, sw: 290, tac: 290 },
        compact:  { satin: 240, sw: 240, tac: 240 },
        micro:    { satin: 200, sw: 200, tac: 200 },
      },
      texts: baseTexts({
        tabLabel: 'Non Metallic',
        eyebrow: '— Push Dagger Non Metallic —',
        heroTitle: 'PUSH DAGGER {NON METALLIC}',
        heroDesc:
          'Versão totalmente não metálica — leve, discreta e indetectável a sensores. Perfeita para o porte diário.',
        refTitle: 'Linha Non Metallic',
        refLabel: 'Standard · Compact · Micro',
        refSub: 'Polímero técnico de alta resistência',
      }),
    }),
    blue: buildVersion({
      hasFinishes: false,
      prices: {
        standard: { satin: 180, sw: 180, tac: 180 },
        compact:  { satin: 150, sw: 150, tac: 150 },
        micro:    { satin: 130, sw: 130, tac: 130 },
      },
      texts: baseTexts({
        tabLabel: 'Blue (Treino)',
        eyebrow: '— Push Dagger Blue —',
        heroTitle: 'PUSH DAGGER {BLUE TREINO}',
        heroDesc:
          'Lâmina de treino em polímero azul — segura, resistente e fiel à ergonomia da Push Dagger original.',
        refTitle: 'Linha Blue · Treino',
        refLabel: 'Standard · Compact · Micro',
        refSub: 'Polímero azul de treinamento',
      }),
    }),
  },
};

export const CONFIG_STORAGE_KEY = 'configurador-kit-config-v4';
const LEGACY_V3 = 'configurador-kit-config-v3';
const LEGACY_V2 = 'configurador-kit-config-v2';
const LEGACY_V1 = 'configurador-kit-config-v1';

export function loadKitConfig(): KitConfig {
  try {
    const raw = localStorage.getItem(CONFIG_STORAGE_KEY);
    if (raw) return mergeConfig(JSON.parse(raw));
    // Migra v3 → v4 (apenas relê)
    const v3 = localStorage.getItem(LEGACY_V3);
    if (v3) return mergeConfig(JSON.parse(v3));
    // Migra v2 (versão única) → standard
    const v2 = localStorage.getItem(LEGACY_V2);
    if (v2) {
      const p = JSON.parse(v2);
      const std: VersionConfig = {
        ...DEFAULT_CONFIG.versions.standard,
        prices: { ...DEFAULT_CONFIG.versions.standard.prices, ...(p?.prices || {}) },
        imagesBySize: {
          standard: { ...defaultImgsForSize(), ...(p?.imagesBySize?.standard || {}) },
          compact: { ...defaultImgsForSize(), ...(p?.imagesBySize?.compact || {}) },
          micro: { ...defaultImgsForSize(), ...(p?.imagesBySize?.micro || {}) },
        },
        kitImage: p?.kitImage || kitCard,
        discountByQty: { ...DEFAULT_CONFIG.versions.standard.discountByQty, ...(p?.discountByQty || {}) },
        bainhaExtraPrice: p?.bainhaExtraPrice ?? 180,
      };
      return {
        whatsappPhone: p?.whatsappPhone || WHATSAPP_PHONE_DEFAULT,
        discountByQty: { ...DEFAULT_CONFIG.discountByQty, ...(p?.discountByQty || {}) },
        versions: { ...DEFAULT_CONFIG.versions, standard: std },
      };
    }
    // v1 fica como default (raro)
    if (localStorage.getItem(LEGACY_V1)) return DEFAULT_CONFIG;
  } catch {}
  return DEFAULT_CONFIG;
}

function mergeVersion(base: VersionConfig, p: any): VersionConfig {
  if (!p) return base;
  return {
    ...base,
    ...p,
    texts: { ...base.texts, ...(p.texts || {}) },
    prices: {
      standard: { ...base.prices.standard, ...(p?.prices?.standard || {}) },
      compact: { ...base.prices.compact, ...(p?.prices?.compact || {}) },
      micro: { ...base.prices.micro, ...(p?.prices?.micro || {}) },
    },
    imagesBySize: {
      standard: { ...base.imagesBySize.standard, ...(p?.imagesBySize?.standard || {}) },
      compact: { ...base.imagesBySize.compact, ...(p?.imagesBySize?.compact || {}) },
      micro: { ...base.imagesBySize.micro, ...(p?.imagesBySize?.micro || {}) },
    },
    discountByQty: { ...base.discountByQty, ...(p?.discountByQty || {}) },
  };
}

function mergeConfig(p: any): KitConfig {
  // Migra desconto antigo (que estava por versão) para o global, usando o do "standard" se existir
  const legacyDisc = p?.versions?.standard?.discountByQty;
  return {
    whatsappPhone: p?.whatsappPhone || WHATSAPP_PHONE_DEFAULT,
    discountByQty: {
      ...DEFAULT_CONFIG.discountByQty,
      ...(legacyDisc || {}),
      ...(p?.discountByQty || {}),
    },
    versions: {
      standard: mergeVersion(DEFAULT_CONFIG.versions.standard, p?.versions?.standard),
      nonmetallic: mergeVersion(DEFAULT_CONFIG.versions.nonmetallic, p?.versions?.nonmetallic),
      blue: mergeVersion(DEFAULT_CONFIG.versions.blue, p?.versions?.blue),
    },
  };
}

const BRL = (n: number) =>
  n.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL', minimumFractionDigits: 0, maximumFractionDigits: 0 });

interface UnitConfig {
  version: VersionKey;
  size: SizeKey;
  finish: FinishKey;
  bainha: BainhaKey;
  bainhaExtra: boolean;
  bainhaExtraTipo: BainhaKey;
}

const newUnit = (): UnitConfig => ({
  version: 'standard',
  size: 'standard',
  finish: 'sw',
  bainha: 'velada',
  bainhaExtra: false,
  bainhaExtraTipo: 'multi',
});

/** Renderiza heroTitle: trecho entre {chaves} fica destacado em amarelo itálico */
function renderHeroTitle(t: string) {
  const parts = t.split(/\{([^}]+)\}/g);
  return parts.map((p, i) =>
    i % 2 === 1 ? <span key={i}>{p}</span> : <span key={i}>{p}</span>,
  );
}

export default function ConfiguradorKit() {
  const [cfg, setCfg] = useState<KitConfig>(() => loadKitConfig());
  const [qty, setQty] = useState<QtyKey>(1);
  const [units, setUnits] = useState<UnitConfig[]>([newUnit(), newUnit(), newUnit()]);

  useEffect(() => {
    const onStorage = () => setCfg(loadKitConfig());
    window.addEventListener('storage', onStorage);
    return () => window.removeEventListener('storage', onStorage);
  }, []);

  // Pré-carrega todas as imagens das versões/tamanhos/acabamentos para troca instantânea
  useEffect(() => {
    const urls = new Set<string>();
    Object.values(cfg.versions).forEach((ver) => {
      (['standard', 'compact', 'micro'] as SizeKey[]).forEach((sk) => {
        Object.values(ver.imagesBySize[sk] || {}).forEach((u) => {
          if (u) urls.add(u);
        });
      });
    });
    urls.forEach((src) => {
      const im = new Image();
      im.decoding = 'async';
      im.src = src;
    });
  }, [cfg]);

  // Versão usada para textos gerais (hero/cta/ref/footer) e tabela de desconto por qty
  const baseV = cfg.versions.standard;
  const activeUnits = units.slice(0, qty);

  const unitPrice = (u: UnitConfig) => cfg.versions[u.version].prices[u.size][u.finish];
  const unitExtraPrice = (u: UnitConfig) => cfg.versions[u.version].bainhaExtraPrice;

  const subtotal = useMemo(
    () => activeUnits.reduce((s, u) => s + unitPrice(u), 0),
    [activeUnits, cfg],
  );
  const extra = useMemo(
    () => activeUnits.reduce((s, u) => s + (u.bainhaExtra ? unitExtraPrice(u) : 0), 0),
    [activeUnits, cfg],
  );
  const beforeDiscount = subtotal + extra;
  const discountPct = cfg.discountByQty[qty] || 0;
  const discountValue = Math.round(beforeDiscount * (discountPct / 100));
  const total = beforeDiscount - discountValue;

  const updateUnit = (idx: number, patch: Partial<UnitConfig>) => {
    setUnits((arr) => arr.map((u, i) => (i === idx ? { ...u, ...patch } : u)));
  };

  const waMessage = useMemo(() => {
    const header = qty === 1
      ? `Quero esta Push Dagger:`
      : `Quero montar este Kit Push Dagger (${qty} unidades):`;
    const lines = activeUnits.map((u, i) => {
      const ver = cfg.versions[u.version];
      const bn = u.bainha === 'velada' ? 'Velada' : 'Multifuncional';
      const ex = u.bainhaExtra
        ? ` + Bainha Extra ${u.bainhaExtraTipo === 'velada' ? 'Velada' : 'Multifuncional'} (${BRL(ver.bainhaExtraPrice)})`
        : '';
      const sizeName = SIZE_LIST.find((s) => s.key === u.size)!.name;
      const finishPart = ver.hasFinishes ? ` — ${FINISH_NAMES[u.finish]}` : '';
      return `• Unidade ${i + 1}: ${ver.texts.tabLabel} — ${sizeName}${finishPart} (${BRL(ver.prices[u.size][u.finish])})\n   Bainha: ${bn}${ex}`;
    });
    const desc = discountPct > 0 ? `\nDesconto: ${discountPct}% (-${BRL(discountValue)})` : '';
    return encodeURIComponent(`${header}\n${lines.join('\n')}${desc}\n\nTotal: ${BRL(total)}`);
  }, [activeUnits, qty, cfg, discountPct, discountValue, total]);

  const waUrl = `https://wa.me/${cfg.whatsappPhone}?text=${waMessage}`;

  return (
    <div className="ck-root">
      <style>{css}</style>

      <header className="ck-header">
        <a href="/push-dagger-kaowz" className="logo" aria-label="Kaowz">
          <img src={kaowzLogo} alt="Kaowz - Ferramentas de Corte" className="logo-img" />
        </a>
      </header>

      {/* Versão é selecionada por unidade abaixo */}

      <section className="hero">
        <div className="eyebrow">{baseV.texts.eyebrow}</div>
        <h1 className="hero-title">{renderHeroTitle(baseV.texts.heroTitle)}</h1>
        <p className="hero-desc">{baseV.texts.heroDesc}</p>
      </section>

      <div className="qty-tabs" role="tablist" aria-label="Quantidade">
        {([1, 2, 3] as QtyKey[]).map((q) => {
          const d = cfg.discountByQty[q] || 0;
          return (
            <button
              key={q}
              role="tab"
              aria-selected={qty === q}
              className={`qty-tab ${qty === q ? 'active' : ''}`}
              onClick={() => setQty(q)}
            >
              <span className="qty-num">{q}</span>
              <span className="qty-label">{q === 1 ? 'Unidade' : 'Unidades'}</span>
              {d > 0 && <span className="qty-disc">-{d}%</span>}
            </button>
          );
        })}
      </div>

      <div className={`config-grid grid-${qty}`}>
        {activeUnits.map((u, idx) => {
          const ver = cfg.versions[u.version];
          const sizeMeta = SIZE_LIST.find((s) => s.key === u.size)!;
          const totalMm = sizeMeta.bladeMm + sizeMeta.gripMm;
          const img = ver.imagesBySize[u.size][u.finish];
          return (
            <article className="col" key={idx}>
              <div className="col-head">
                <div className="col-index">0{idx + 1}</div>
                <div className="col-head-text">
                  <div className="col-model">{sizeMeta.name}</div>
                  <div className="col-dims">Total {totalMm.toFixed(1).replace('.', ',')} mm</div>
                </div>
              </div>

              <div className="product-stage">
                <div className="product-card">
                  <img src={img} alt={`${sizeMeta.name} ${FINISH_NAMES[u.finish]}`} className="product-img is-active" loading="eager" decoding="sync" fetchPriority="high" />
                  <div className="product-card-overlay" />
                  {ver.hasFinishes && <div className="product-card-tag">{FINISH_NAMES[u.finish]}</div>}
                  <div className="product-card-price">{BRL(ver.prices[u.size][u.finish])}</div>
                </div>
              </div>

              <div className="opt-section">
                <div className="opt-label">Versão</div>
                <div className="finish-options version-options">
                  {VERSION_LIST.map((vl) => (
                    <button
                      key={vl.key}
                      type="button"
                      className={`finish-btn ${u.version === vl.key ? 'active' : ''}`}
                      onClick={() => updateUnit(idx, { version: vl.key })}
                    >
                      <span className="finish-name">{cfg.versions[vl.key].texts.tabLabel || vl.label}</span>
                    </button>
                  ))}
                </div>
              </div>

              <div className="opt-section">
                <div className="opt-label">Tamanho</div>
                <div className="finish-options">
                  {SIZE_LIST.map((s) => (
                    <button
                      key={s.key}
                      type="button"
                      className={`finish-btn ${u.size === s.key ? 'active' : ''}`}
                      onClick={() => updateUnit(idx, { size: s.key })}
                    >
                      <span className="finish-name">{s.name}</span>
                    </button>
                  ))}
                </div>
              </div>

              {ver.hasFinishes && (
                <div className="opt-section">
                  <div className="opt-label">Acabamento</div>
                  <div className="finish-options">
                    {FINISH_KEYS.map((fk) => (
                      <button
                        key={fk}
                        type="button"
                        className={`finish-btn ${u.finish === fk ? 'active' : ''}`}
                        onClick={() => updateUnit(idx, { finish: fk })}
                      >
                        <span className="finish-name">{FINISH_NAMES[fk]}</span>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              <div className="opt-section">
                <div className="opt-label">Bainha</div>
                <div className="finish-options bainha-options">
                  {(['velada', 'multi'] as BainhaKey[]).map((b) => (
                    <button
                      key={b}
                      type="button"
                      className={`finish-btn ${u.bainha === b ? 'active' : ''}`}
                      onClick={() => updateUnit(idx, { bainha: b })}
                    >
                      <span className="finish-name">{b === 'velada' ? 'Velada' : 'Multifuncional'}</span>
                    </button>
                  ))}
                </div>
                <label className={`bainha-extra ${u.bainhaExtra ? 'active' : ''}`}>
                  <input
                    type="checkbox"
                    checked={u.bainhaExtra}
                    onChange={(e) => updateUnit(idx, { bainhaExtra: e.target.checked })}
                  />
                  <span className="bainha-extra-title">Bainha Extra</span>
                  <span className="bainha-extra-price">+ {BRL(ver.bainhaExtraPrice)}</span>
                </label>
                {u.bainhaExtra && (
                  <div className="finish-options bainha-options bainha-extra-tipo">
                    {(['velada', 'multi'] as BainhaKey[]).map((b) => (
                      <button
                        key={b}
                        type="button"
                        className={`finish-btn ${u.bainhaExtraTipo === b ? 'active' : ''}`}
                        onClick={() => updateUnit(idx, { bainhaExtraTipo: b })}
                      >
                        <span className="finish-name">{b === 'velada' ? 'Velada' : 'Multifuncional'}</span>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </article>
          );
        })}
      </div>

      <div className="cta-block">
        <div className="total-row">
          <span className="total-label">{qty === 1 ? 'Total' : `Total do Kit (${qty} un.)`}</span>
          {discountPct > 0 && (
            <div className="total-de">
              <span className="total-de-label">De</span>
              <span className="total-old">{BRL(beforeDiscount)}</span>
            </div>
          )}
          <div className="total-por">
            {discountPct > 0 && <span className="total-por-label">Por</span>}
            <span className="total-val">{BRL(total)}</span>
          </div>
        </div>
        {discountPct > 0 && (
          <div className="cupom-msg">Resgate seu cupom de <strong>{discountPct}%</strong> de desconto</div>
        )}
        <a className="btn-cta" href={waUrl} target="_blank" rel="noopener noreferrer">
          {baseV.texts.ctaText}
        </a>
        <div className="cta-note">Atendimento via WhatsApp</div>
      </div>

      <section className="ref-section">
        <div className="ref-section-head">
          <div className="eyebrow">{baseV.texts.refEyebrow}</div>
          <h2>{baseV.texts.refTitle}</h2>
        </div>
        <figure className="ref-card">
          <div className="ref-img-wrap">
            <img src={baseV.kitImage} alt={baseV.texts.refTitle} />
          </div>
          <figcaption>
            <span className="ref-label">{baseV.texts.refLabel}</span>
            <span className="ref-sub">{baseV.texts.refSub}</span>
          </figcaption>
        </figure>
        {(cfg.discountByQty[3] || 0) > 0 && (
          <button
            type="button"
            className="btn-cta ref-cta"
            onClick={() => {
              setUnits([
                { version: 'standard', size: 'standard', finish: 'sw', bainha: 'velada', bainhaExtra: false, bainhaExtraTipo: 'multi' },
                { version: 'standard', size: 'compact', finish: 'sw', bainha: 'velada', bainhaExtra: false, bainhaExtraTipo: 'multi' },
                { version: 'standard', size: 'micro', finish: 'sw', bainha: 'velada', bainhaExtra: false, bainhaExtraTipo: 'multi' },
              ]);
              setQty(3);
              window.scrollTo({ top: 0, behavior: 'smooth' });
            }}
          >
            Monte o Kit Completo com {cfg.discountByQty[3]}% de desconto
          </button>
        )}
      </section>

      <div className="footer-note">
        {baseV.texts.footerNote.split('\n').map((l, i) => (
          <span key={i}>{l}<br /></span>
        ))}
      </div>
    </div>
  );
}

const css = `
.ck-root {
  --bg: #050505;
  --s1: #0C0C0C;
  --s2: #161616;
  --border: rgba(255,255,255,0.06);
  --border-m: rgba(255,255,255,0.14);
  --yellow: #C4A44A;
  --yellow-l: #D4B86A;
  --olive: #556B2F;
  --olive-glow: #6B8E23;
  --text: #FFFFFF;
  --muted: #8A8A88;
  --dim: #4A4A48;
  background: var(--bg);
  color: var(--text);
  font-family: 'Barlow', sans-serif;
  min-height: 100vh;
  background-image:
    radial-gradient(ellipse at top, rgba(107,142,35,0.05), transparent 55%),
    repeating-linear-gradient(0deg, transparent 0 40px, rgba(255,255,255,0.015) 40px 41px),
    repeating-linear-gradient(90deg, transparent 0 40px, rgba(255,255,255,0.015) 40px 41px),
    repeating-linear-gradient(45deg, transparent 0 12px, rgba(255,255,255,0.012) 12px 13px);
}
.ck-root * { box-sizing: border-box; }

/* Tactical corner accents */
.ck-root .col,
.ck-root .ref-card,
.ck-root .qty-tab,
.ck-root .product-card,
.ck-root .btn-cta,
.ck-root .finish-btn { position: relative; }

.ck-root .col::before,
.ck-root .ref-card::before {
  content: '';
  position: absolute;
  top: -1px; left: -1px;
  width: 14px; height: 14px;
  border-top: 2px solid var(--olive);
  border-left: 2px solid var(--olive);
  border-top-left-radius: 2px;
  pointer-events: none;
  z-index: 2;
  opacity: 0.7;
}
.ck-root .col::after,
.ck-root .ref-card::after {
  content: '';
  position: absolute;
  bottom: -1px; right: -1px;
  width: 14px; height: 14px;
  border-bottom: 2px solid var(--olive);
  border-right: 2px solid var(--olive);
  border-bottom-right-radius: 2px;
  pointer-events: none;
  z-index: 2;
  opacity: 0.7;
}

.ck-root .ck-header {
  display: flex; align-items: center; justify-content: center;
  padding: 1rem 1.75rem; border-bottom: 1px solid var(--border);
  background: rgba(5,5,5,0.9); backdrop-filter: blur(12px);
  position: sticky; top: 0; z-index: 40;
}
.ck-root .logo { display: inline-flex; align-items: center; }
.ck-root .logo-img { height: 38px; width: auto; display: block; }

.ck-root .version-tabs { display: flex; flex-wrap: wrap; justify-content: center; gap: 6px; padding: 1.25rem 1rem 0; max-width: 760px; margin: 0 auto; }
.ck-root .version-tab { padding: 8px 16px; font-family: 'Barlow Condensed', sans-serif; font-size: 12px; letter-spacing: 2px; text-transform: uppercase; background: var(--s1); border: 1px solid var(--border); border-radius: 999px; color: var(--muted); cursor: pointer; transition: all .25s ease; }
.ck-root .version-tab:hover { color: var(--text); border-color: var(--border-m); transform: translateY(-1px); }
.ck-root .version-tab.active { background: var(--olive); color: #fff; border-color: var(--olive); font-weight: 700; box-shadow: 0 0 12px rgba(107,142,35,0.25); }

.ck-root .hero { padding: 2.5rem 1.5rem 2rem; text-align: center; max-width: 760px; margin: 0 auto; animation: fadeInUp 0.6s ease-out both; }
.ck-root .eyebrow { font-family: 'Barlow Condensed', sans-serif; font-size: 11px; letter-spacing: 4px; color: var(--olive); text-transform: uppercase; margin-bottom: 18px; }
.ck-root .hero-title { font-family: 'Bebas Neue', sans-serif; font-size: clamp(48px, 8vw, 80px); letter-spacing: 6px; line-height: 0.95; margin-bottom: 22px; font-weight: 700; }
.ck-root .hero-title span:nth-child(even) { color: var(--yellow); font-style: italic; }
.ck-root .hero-desc { font-size: 14px; color: #B5B5B3; line-height: 1.7; max-width: 520px; margin: 0 auto; letter-spacing: 0.3px; }

.ck-root .qty-tabs { display: grid; grid-template-columns: repeat(3, 1fr); gap: 10px; max-width: 720px; margin: 0 auto 1.75rem; padding: 0 1.5rem; animation: fadeInUp 0.6s 0.15s ease-out both; }
.ck-root .qty-tab { position: relative; display: flex; flex-direction: column; align-items: center; gap: 4px; padding: 16px 12px; background: var(--s1); border: 1px solid var(--border); border-radius: 6px; color: var(--muted); cursor: pointer; transition: all .25s ease; }
.ck-root .qty-tab:hover { border-color: var(--border-m); color: var(--text); transform: translateY(-2px); box-shadow: 0 4px 16px rgba(0,0,0,0.3); }
.ck-root .qty-tab.active { border-color: var(--olive); background: rgba(107,142,35,0.07); color: var(--text); box-shadow: 0 0 16px rgba(107,142,35,0.12); }
.ck-root .qty-num { font-family: 'Bebas Neue', sans-serif; font-size: 36px; line-height: 1; color: var(--yellow); }
.ck-root .qty-label { font-family: 'Barlow Condensed', sans-serif; font-size: 11px; letter-spacing: 2px; text-transform: uppercase; }
.ck-root .qty-disc { position: absolute; top: 6px; right: 6px; background: var(--olive); color: #fff; font-family: 'Bebas Neue', sans-serif; font-size: 12px; padding: 2px 6px; border-radius: 3px; letter-spacing: 1px; }

.ck-root .config-grid { display: grid; max-width: 1100px; margin: 0 auto; gap: 18px; padding: 0 1.75rem; }
.ck-root .config-grid.grid-1 { grid-template-columns: minmax(0, 480px); justify-content: center; }
.ck-root .config-grid.grid-2 { grid-template-columns: repeat(2, 1fr); }
.ck-root .config-grid.grid-3 { grid-template-columns: repeat(3, 1fr); }
.ck-root .col { background: linear-gradient(180deg, var(--s1) 0%, #070707 100%); border: 1px solid var(--border); border-radius: 6px; padding: 1.25rem; display: flex; flex-direction: column; gap: 1rem; transition: all .3s ease; animation: fadeInUp 0.5s ease-out both; }
.ck-root .col:nth-child(1) { animation-delay: 0.1s; }
.ck-root .col:nth-child(2) { animation-delay: 0.2s; }
.ck-root .col:nth-child(3) { animation-delay: 0.3s; }
.ck-root .col:hover { border-color: rgba(107,142,35,0.35); transform: translateY(-3px); box-shadow: 0 8px 32px rgba(0,0,0,0.4); }
.ck-root .col-head { display: grid; grid-template-columns: auto 1fr; align-items: center; gap: 12px; padding-bottom: 0.75rem; border-bottom: 1px solid var(--border); }
.ck-root .col-index { font-family: 'Bebas Neue', sans-serif; font-size: 28px; color: var(--olive); line-height: 1; opacity: 0.85; }
.ck-root .col-model { font-family: 'Bebas Neue', sans-serif; font-size: 22px; letter-spacing: 4px; line-height: 1; }
.ck-root .col-dims { font-family: 'Barlow Condensed', sans-serif; font-size: 10px; color: var(--muted); letter-spacing: 1.2px; margin-top: 4px; text-transform: uppercase; }

.ck-root .product-stage { position: relative; width: 100%; }
.ck-root .product-card { position: relative; width: 100%; aspect-ratio: 1 / 1; background: var(--s2); border: 1px solid var(--border); border-radius: 6px; overflow: hidden; transition: all .3s ease; }
.ck-root .product-card:hover { border-color: var(--border-m); }
.ck-root .product-img { position: absolute; inset: 0; width: 100%; height: 100%; object-fit: cover; transition: transform .4s ease, opacity .25s ease; }
.ck-root .product-card:hover .product-img { transform: scale(1.04); }
.ck-root .product-card-overlay { position: absolute; inset: 0; background: linear-gradient(180deg, transparent 50%, rgba(0,0,0,0.7) 100%); pointer-events: none; }
.ck-root .product-card-tag { position: absolute; left: 8px; bottom: 8px; background: rgba(0,0,0,0.65); backdrop-filter: blur(8px); border: 1px solid var(--border-m); color: #fff; font-family: 'Barlow Condensed', sans-serif; font-size: 10px; letter-spacing: 1.5px; text-transform: uppercase; padding: 4px 10px; border-radius: 3px; font-weight: 500; }
.ck-root .product-card-price { position: absolute; right: 8px; top: 8px; background: var(--olive); color: #fff; font-family: 'Bebas Neue', sans-serif; font-size: 14px; letter-spacing: 1.5px; padding: 3px 8px; border-radius: 3px; box-shadow: 0 2px 8px rgba(0,0,0,0.3); }

.ck-root .finish-options { display: grid; grid-template-columns: repeat(3, 1fr); gap: 4px; }
.ck-root .finish-btn { padding: 11px 4px; border: 1px solid var(--border); border-radius: 4px; background: transparent; cursor: pointer; transition: all .2s ease; color: inherit; font-family: inherit; }
.ck-root .finish-btn:hover { border-color: var(--border-m); background: rgba(255,255,255,0.03); transform: translateY(-1px); }
.ck-root .finish-btn.active { border-color: var(--olive); background: rgba(107,142,35,0.08); box-shadow: 0 0 10px rgba(107,142,35,0.1); }
.ck-root .finish-name { font-family: 'Barlow Condensed', sans-serif; font-size: 11px; color: var(--muted); letter-spacing: 1.4px; text-transform: uppercase; line-height: 1; display: block; transition: color .2s ease; }
.ck-root .finish-btn.active .finish-name { color: var(--olive-glow); font-weight: 600; }

.ck-root .opt-section { display: flex; flex-direction: column; gap: 6px; }
.ck-root .opt-label { font-family: 'Barlow Condensed', sans-serif; font-size: 10px; letter-spacing: 2px; color: var(--muted); text-transform: uppercase; }
.ck-root .bainha-options { grid-template-columns: 1fr 1fr; }

.ck-root .bainha-extra { display: flex; align-items: center; gap: 10px; padding: 9px 11px; background: transparent; border: 1px dashed var(--border-m); border-radius: 4px; cursor: pointer; transition: all .2s ease; margin-top: 2px; }
.ck-root .bainha-extra:hover { border-color: rgba(107,142,35,0.4); }
.ck-root .bainha-extra.active { border-style: solid; border-color: var(--olive); background: rgba(107,142,35,0.06); }
.ck-root .bainha-extra input { width: 14px; height: 14px; accent-color: var(--olive); cursor: pointer; flex-shrink: 0; }
.ck-root .bainha-extra-title { flex: 1; font-family: 'Barlow Condensed', sans-serif; font-size: 11px; letter-spacing: 1.4px; text-transform: uppercase; color: var(--muted); transition: color .2s ease; }
.ck-root .bainha-extra.active .bainha-extra-title { color: var(--text); font-weight: 600; }
.ck-root .bainha-extra-price { font-family: 'Bebas Neue', sans-serif; font-size: 13px; color: var(--yellow); letter-spacing: 1px; }

.ck-root .cta-block { max-width: 560px; margin: 3rem auto 0; padding: 2rem 1.5rem; text-align: center; border-top: 1px solid var(--border); border-bottom: 1px solid var(--border); position: relative; animation: fadeInUp 0.6s 0.2s ease-out both; }
.ck-root .cta-block::before, .ck-root .cta-block::after { content: ''; position: absolute; left: 50%; transform: translateX(-50%); width: 40px; height: 1px; background: var(--olive); }
.ck-root .cta-block::before { top: -1px; }
.ck-root .cta-block::after { bottom: -1px; }
.ck-root .total-row { display: flex; flex-direction: column; align-items: center; gap: 8px; margin-bottom: 18px; }
.ck-root .total-label { font-family: 'Barlow Condensed', sans-serif; font-size: 11px; letter-spacing: 3px; color: var(--muted); text-transform: uppercase; }
.ck-root .total-de { display: inline-flex; align-items: baseline; gap: 8px; opacity: 0.85; }
.ck-root .total-de-label { font-family: 'Barlow Condensed', sans-serif; font-size: 11px; letter-spacing: 2px; color: var(--muted); text-transform: uppercase; }
.ck-root .total-old { font-family: 'Barlow', sans-serif; font-size: 28px; color: var(--dim); text-decoration: line-through; }
.ck-root .total-por { display: inline-flex; align-items: baseline; gap: 10px; }
.ck-root .total-por-label { font-family: 'Barlow Condensed', sans-serif; font-size: 13px; letter-spacing: 3px; color: var(--yellow); text-transform: uppercase; }
.ck-root .total-val { font-family: 'Bebas Neue', sans-serif; font-size: 84px; letter-spacing: 3px; color: var(--yellow); line-height: 1; text-shadow: 0 2px 24px rgba(196,164,74,0.25); transition: all .3s ease; }
.ck-root .total-discount { display: inline-block; margin-top: 4px; font-family: 'Barlow Condensed', sans-serif; font-size: 11px; letter-spacing: 2px; background: var(--olive); color: #fff; padding: 4px 12px; border-radius: 3px; font-weight: 700; }
.ck-root .btn-cta { display: inline-block; background: var(--olive); color: #fff; border: none; border-radius: 6px; padding: 16px 48px; font-family: 'Barlow Condensed', sans-serif; font-size: 18px; font-weight: 700; letter-spacing: 3px; cursor: pointer; text-decoration: none; text-transform: uppercase; transition: all .25s ease; box-shadow: 0 4px 0 #3A4A1E, 0 8px 24px rgba(107,142,35,0.25); }
.ck-root .btn-cta:hover { background: var(--olive-glow); transform: translateY(-2px); box-shadow: 0 6px 0 #3A4A1E, 0 12px 28px rgba(107,142,35,0.35); }
.ck-root .btn-cta:active { transform: translateY(2px); box-shadow: 0 2px 0 #3A4A1E; }
.ck-root .cta-note { margin-top: 14px; font-family: 'Barlow Condensed', sans-serif; font-size: 11px; letter-spacing: 1.5px; color: var(--dim); text-transform: uppercase; }
.ck-root .cupom-msg { margin: 1.25rem auto 1rem; padding: 10px 18px; display: inline-block; background: rgba(107,142,35,0.1); border: 1px dashed var(--olive); color: var(--olive-glow); font-family: 'Barlow Condensed', sans-serif; font-size: 14px; letter-spacing: 1.5px; text-transform: uppercase; border-radius: 4px; }
.ck-root .cupom-msg strong { color: #fff; font-weight: 700; }

.ck-root .ref-section { max-width: 900px; margin: 4rem auto 0; padding: 0 1.75rem; animation: fadeInUp 0.6s 0.25s ease-out both; }
.ck-root .ref-section-head { text-align: center; margin-bottom: 1.75rem; }
.ck-root .ref-section-head h2 { font-family: 'Bebas Neue', sans-serif; font-size: clamp(28px, 4vw, 38px); letter-spacing: 5px; margin: 6px 0 0; }
.ck-root .ref-card { margin: 0; background: var(--s1); border: 1px solid var(--border); border-radius: 6px; overflow: hidden; transition: all .3s ease; }
.ck-root .ref-card:hover { border-color: rgba(107,142,35,0.3); box-shadow: 0 8px 32px rgba(0,0,0,0.35); }
.ck-root .ref-img-wrap { position: relative; width: 100%; background: #000; aspect-ratio: 16/9; }
.ck-root .ref-img-wrap img { position: absolute; inset: 0; width: 100%; height: 100%; object-fit: cover; transition: transform .5s ease; }
.ck-root .ref-card:hover .ref-img-wrap img { transform: scale(1.03); }
.ck-root .ref-card figcaption { display: flex; align-items: center; justify-content: space-between; padding: 12px 16px; border-top: 1px solid var(--border); }
.ck-root .ref-label { font-family: 'Bebas Neue', sans-serif; font-size: 16px; letter-spacing: 3px; color: var(--text); }
.ck-root .ref-sub { font-family: 'Barlow Condensed', sans-serif; font-size: 10px; letter-spacing: 1.5px; color: var(--muted); text-transform: uppercase; }
.ck-root .ref-cta { display: block; width: 100%; max-width: 560px; margin: 1.75rem auto 0; text-align: center; }

.ck-root .footer-note { text-align: center; padding: 2rem 1.5rem 4rem; font-size: 11px; color: var(--dim); line-height: 1.9; letter-spacing: 0.5px; animation: fadeInUp 0.5s 0.35s ease-out both; }

@keyframes fadeInUp {
  from { opacity: 0; transform: translateY(18px); }
  to { opacity: 1; transform: translateY(0); }
}

@media (max-width: 760px) {
  .ck-root .ck-header { padding: 0.85rem 1rem; }
  .ck-root .hero { padding: 2rem 1rem 1.5rem; }
  .ck-root .qty-tabs { padding: 0 1rem; gap: 6px; }
  .ck-root .qty-num { font-size: 28px; }
  .ck-root .config-grid { grid-template-columns: 1fr !important; padding: 0 1rem; gap: 14px; }
  .ck-root .cta-block { padding: 1.5rem 1rem; }
  .ck-root .btn-cta { padding: 14px 32px; font-size: 15px; width: 100%; }
  .ck-root .total-val { font-size: 68px; }
  .ck-root .total-old { font-size: 22px; }
  .ck-root .ref-section { padding: 0 1rem; margin-top: 2.5rem; }
}
`;
