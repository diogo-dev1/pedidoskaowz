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
  /** Mensagem do cupom exibida quando há desconto. Use {pct} como placeholder. */
  cupomMessage: string;
  versions: Record<VersionKey, VersionConfig>;
}

export const DEFAULT_CUPOM_MESSAGE = 'LANÇAMENTO 11/06 · 10% OFF + 10× sem juros nas configurações Micro e Compact (Sandvik 14C28N · G10 Black)';

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
    // Preços de LANÇAMENTO (Sandvik 14C28N + G10 Black) — 11/06 18h, grupo exclusivo
    compact:  { satin: 580, sw: 600, tac: 680 },
    micro:    { satin: 465, sw: 480, tac: 560 },
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
  cupomMessage: DEFAULT_CUPOM_MESSAGE,
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

export const CONFIG_STORAGE_KEY = 'configurador-kit-config-v5';
const LEGACY_V4 = 'configurador-kit-config-v4';
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
        cupomMessage: p?.cupomMessage || DEFAULT_CUPOM_MESSAGE,
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
    cupomMessage: p?.cupomMessage || DEFAULT_CUPOM_MESSAGE,
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
  const [showTable, setShowTable] = useState(false);

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
  // Desconto aplica somente em Compact e Micro. Standard mantém preço cheio.
  const discountableBase = useMemo(
    () => activeUnits.reduce((s, u) => {
      if (u.size === 'standard') return s;
      return s + unitPrice(u) + (u.bainhaExtra ? unitExtraPrice(u) : 0);
    }, 0),
    [activeUnits, cfg],
  );
  const discountValue = Math.round(discountableBase * (discountPct / 100));
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
        <button type="button" className="see-prices-btn" onClick={() => setShowTable(true)}>
          Ver tabela completa de preços
        </button>
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

      {qty > 1 && (
        <div className="qty-hint" role="status" aria-live="polite">
          <span className="qty-hint-line" />
          <span className="qty-hint-text">
            Monte seu Kit com <strong>{qty}</strong> Configurações da Push Dagger
          </span>
          <span className="qty-hint-line" />
        </div>
      )}

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
          <div
            className="cupom-msg"
            dangerouslySetInnerHTML={{
              __html: (cfg.cupomMessage || '').replace(/\{pct\}/g, `<strong>${discountPct}%</strong>`),
            }}
          />
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

      {showTable && (
        <div className="price-modal" role="dialog" aria-modal="true" onClick={() => setShowTable(false)}>
          <div className="price-modal-card" onClick={(e) => e.stopPropagation()}>
            <button type="button" className="price-modal-close" onClick={() => setShowTable(false)} aria-label="Fechar">×</button>
            <div className="price-modal-head">
              <div className="eyebrow">— Tabela de Preços —</div>
              <h2>Push Dagger · Todas as Configurações</h2>
              <p className="price-modal-sub">Valores por unidade. Bainha Velada inclusa.</p>
            </div>

            {VERSION_LIST.map((vl) => {
              const ver = cfg.versions[vl.key];
              return (
                <div key={vl.key} className="price-version">
                  <div className="price-version-title">
                    <span className="price-version-name">{ver.texts.tabLabel || vl.label}</span>
                    {!ver.hasFinishes && <span className="price-version-tag">Único acabamento</span>}
                  </div>
                  <div className="price-table-wrap">
                    <table className="price-table">
                      <thead>
                        <tr>
                          <th>Tamanho</th>
                          {ver.hasFinishes
                            ? FINISH_KEYS.map((fk) => <th key={fk}>{FINISH_NAMES[fk]}</th>)
                            : <th>Preço</th>}
                        </tr>
                      </thead>
                      <tbody>
                        {SIZE_LIST.map((s) => (
                          <tr key={s.key}>
                            <td>
                              <div className="price-size-name">{s.name}</div>
                              <div className="price-size-dim">
                                <span>Lâmina <strong>{s.bladeMm.toFixed(2).replace('.', ',')} mm</strong></span>
                                <span>Empunhadura <strong>{s.gripMm.toFixed(2).replace('.', ',')} mm</strong></span>
                                <span className="price-size-total">Total {(s.bladeMm + s.gripMm).toFixed(2).replace('.', ',')} mm</span>
                              </div>
                            </td>
                            {ver.hasFinishes
                              ? FINISH_KEYS.map((fk) => (
                                  <td key={fk} className="price-cell">{BRL(ver.prices[s.key][fk])}</td>
                                ))
                              : <td className="price-cell">{BRL(ver.prices[s.key].satin)}</td>}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                  <div className="price-extra">
                    <span>Bainha Extra</span>
                    <strong>+ {BRL(ver.bainhaExtraPrice)}</strong>
                  </div>
                </div>
              );
            })}

            <div className="price-discounts">
              <div className="price-discounts-title">Descontos por quantidade</div>
              <div className="price-discounts-grid">
                {([1, 2, 3] as QtyKey[]).map((q) => {
                  const d = cfg.discountByQty[q] || 0;
                  return (
                    <div key={q} className={`price-disc-item ${d > 0 ? 'on' : ''}`}>
                      <span className="price-disc-qty">{q} un.</span>
                      <span className="price-disc-val">{d > 0 ? `-${d}%` : '—'}</span>
                    </div>
                  );
                })}
              </div>
              <p className="price-disc-note">Desconto aplicado apenas em Compact e Micro.</p>
            </div>

            <button type="button" className="btn-cta price-modal-cta" onClick={() => setShowTable(false)}>
              Fechar e configurar
            </button>
          </div>
        </div>
      )}
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
  --yellow: #FFC107;
  --yellow-l: #FFD54A;
  --yellow-dim: #b58800;
  --text: #FFFFFF;
  --muted: #8A8A88;
  --dim: #4A4A48;
  background: var(--bg);
  color: var(--text);
  font-family: 'Barlow', sans-serif;
  min-height: 100vh;
  background-image:
    radial-gradient(ellipse at top, rgba(255,193,7,0.04), transparent 55%),
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
  border-top: 2px solid var(--yellow);
  border-left: 2px solid var(--yellow);
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
  border-bottom: 2px solid var(--yellow);
  border-right: 2px solid var(--yellow);
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
.ck-root .version-tab.active { background: var(--yellow); color: #000; border-color: var(--yellow); font-weight: 700; box-shadow: 0 0 12px rgba(255,193,7,0.25); }

.ck-root .hero { padding: 2.5rem 1.5rem 2rem; text-align: center; max-width: 760px; margin: 0 auto; animation: fadeInUp 0.6s ease-out both; }
.ck-root .eyebrow { font-family: 'Barlow Condensed', sans-serif; font-size: 11px; letter-spacing: 4px; color: var(--yellow); text-transform: uppercase; margin-bottom: 18px; }
.ck-root .hero-title { font-family: 'Bebas Neue', sans-serif; font-size: clamp(48px, 8vw, 80px); letter-spacing: 6px; line-height: 0.95; margin-bottom: 22px; font-weight: 700; }
.ck-root .hero-title span:nth-child(even) { color: var(--yellow); font-style: italic; }
.ck-root .hero-desc { font-size: 14px; color: #B5B5B3; line-height: 1.7; max-width: 520px; margin: 0 auto; letter-spacing: 0.3px; }

.ck-root .qty-tabs { display: grid; grid-template-columns: repeat(3, 1fr); gap: 10px; max-width: 720px; margin: 0 auto 1.75rem; padding: 0 1.5rem; animation: fadeInUp 0.6s 0.15s ease-out both; }
.ck-root .qty-tab { position: relative; display: flex; flex-direction: column; align-items: center; gap: 4px; padding: 16px 12px; background: var(--s1); border: 1px solid var(--border); border-radius: 6px; color: var(--muted); cursor: pointer; transition: all .25s ease; }
.ck-root .qty-tab:hover { border-color: var(--border-m); color: var(--text); transform: translateY(-2px); box-shadow: 0 4px 16px rgba(0,0,0,0.3); }
.ck-root .qty-tab.active { border-color: var(--yellow); background: rgba(255,193,7,0.07); color: var(--text); box-shadow: 0 0 16px rgba(255,193,7,0.12); }
.ck-root .qty-num { font-family: 'Bebas Neue', sans-serif; font-size: 36px; line-height: 1; color: var(--yellow); }
.ck-root .qty-label { font-family: 'Barlow Condensed', sans-serif; font-size: 11px; letter-spacing: 2px; text-transform: uppercase; }
.ck-root .qty-disc { position: absolute; top: 6px; right: 6px; background: var(--yellow); color: #000; font-family: 'Bebas Neue', sans-serif; font-size: 12px; padding: 2px 6px; border-radius: 3px; letter-spacing: 1px; }
.ck-root .qty-hint { display: flex; align-items: center; gap: 12px; max-width: 720px; margin: -0.5rem auto 1.75rem; padding: 0 1.5rem; animation: fadeInUp 0.4s ease-out both; }
.ck-root .qty-hint-line { flex: 1; height: 1px; background: linear-gradient(90deg, transparent, var(--border-m), transparent); }
.ck-root .qty-hint-text { font-family: 'Barlow Condensed', sans-serif; font-size: 12px; letter-spacing: 2px; text-transform: uppercase; color: var(--muted); white-space: nowrap; }
.ck-root .qty-hint-text strong { color: var(--yellow); font-weight: 600; }
@media (max-width: 640px) { .ck-root .qty-hint { padding: 0 1rem; gap: 8px; } .ck-root .qty-hint-text { font-size: 10px; letter-spacing: 1.5px; white-space: normal; text-align: center; } }

.ck-root .config-grid { display: grid; max-width: 1100px; margin: 0 auto; gap: 18px; padding: 0 1.75rem; }
.ck-root .config-grid.grid-1 { grid-template-columns: minmax(0, 480px); justify-content: center; }
.ck-root .config-grid.grid-2 { grid-template-columns: repeat(2, 1fr); }
.ck-root .config-grid.grid-3 { grid-template-columns: repeat(3, 1fr); }
.ck-root .col { background: linear-gradient(180deg, var(--s1) 0%, #070707 100%); border: 1px solid var(--border); border-radius: 6px; padding: 1.25rem; display: flex; flex-direction: column; gap: 1rem; transition: all .3s ease; animation: fadeInUp 0.5s ease-out both; }
.ck-root .col:nth-child(1) { animation-delay: 0.1s; }
.ck-root .col:nth-child(2) { animation-delay: 0.2s; }
.ck-root .col:nth-child(3) { animation-delay: 0.3s; }
.ck-root .col:hover { border-color: rgba(255,193,7,0.3); transform: translateY(-3px); box-shadow: 0 8px 32px rgba(0,0,0,0.4); }
.ck-root .col-head { display: grid; grid-template-columns: auto 1fr; align-items: center; gap: 12px; padding-bottom: 0.75rem; border-bottom: 1px solid var(--border); }
.ck-root .col-index { font-family: 'Bebas Neue', sans-serif; font-size: 28px; color: var(--yellow); line-height: 1; opacity: 0.85; }
.ck-root .col-model { font-family: 'Bebas Neue', sans-serif; font-size: 22px; letter-spacing: 4px; line-height: 1; }
.ck-root .col-dims { font-family: 'Barlow Condensed', sans-serif; font-size: 10px; color: var(--muted); letter-spacing: 1.2px; margin-top: 4px; text-transform: uppercase; }

.ck-root .product-stage { position: relative; width: 100%; }
.ck-root .product-card { position: relative; width: 100%; aspect-ratio: 1 / 1; background: var(--s2); border: 1px solid var(--border); border-radius: 6px; overflow: hidden; transition: all .3s ease; }
.ck-root .product-card:hover { border-color: var(--border-m); }
.ck-root .product-img { position: absolute; inset: 0; width: 100%; height: 100%; object-fit: cover; transition: transform .35s ease; }
.ck-root .product-card:hover .product-img { transform: scale(1.04); }
.ck-root .product-card-overlay { position: absolute; inset: 0; background: linear-gradient(180deg, transparent 50%, rgba(0,0,0,0.7) 100%); pointer-events: none; }
.ck-root .product-card-tag { position: absolute; left: 8px; bottom: 8px; background: rgba(0,0,0,0.65); backdrop-filter: blur(8px); border: 1px solid var(--border-m); color: #fff; font-family: 'Barlow Condensed', sans-serif; font-size: 10px; letter-spacing: 1.5px; text-transform: uppercase; padding: 4px 10px; border-radius: 3px; font-weight: 500; }
.ck-root .product-card-price { position: absolute; right: 8px; top: 8px; background: var(--yellow); color: #000; font-family: 'Bebas Neue', sans-serif; font-size: 14px; letter-spacing: 1.5px; padding: 3px 8px; border-radius: 3px; box-shadow: 0 2px 8px rgba(0,0,0,0.3); }

.ck-root .finish-options { display: grid; grid-template-columns: repeat(3, 1fr); gap: 4px; }
.ck-root .finish-btn { padding: 11px 4px; border: 1px solid var(--border); border-radius: 4px; background: transparent; cursor: pointer; transition: all .2s ease; color: inherit; font-family: inherit; }
.ck-root .finish-btn:hover { border-color: var(--border-m); background: rgba(255,255,255,0.03); transform: translateY(-1px); }
.ck-root .finish-btn.active { border-color: var(--yellow); background: rgba(255,193,7,0.07); box-shadow: 0 0 10px rgba(255,193,7,0.1); }
.ck-root .finish-name { font-family: 'Barlow Condensed', sans-serif; font-size: 11px; color: var(--muted); letter-spacing: 1.4px; text-transform: uppercase; line-height: 1; display: block; transition: color .2s ease; }
.ck-root .finish-btn.active .finish-name { color: var(--yellow); font-weight: 600; }

.ck-root .opt-section { display: flex; flex-direction: column; gap: 6px; }
.ck-root .opt-label { font-family: 'Barlow Condensed', sans-serif; font-size: 10px; letter-spacing: 2px; color: var(--muted); text-transform: uppercase; }
.ck-root .bainha-options { grid-template-columns: 1fr 1fr; }

.ck-root .bainha-extra { display: flex; align-items: center; gap: 10px; padding: 9px 11px; background: transparent; border: 1px dashed var(--border-m); border-radius: 4px; cursor: pointer; transition: all .2s ease; margin-top: 2px; }
.ck-root .bainha-extra:hover { border-color: rgba(255,193,7,0.4); }
.ck-root .bainha-extra.active { border-style: solid; border-color: var(--yellow); background: rgba(255,193,7,0.06); }
.ck-root .bainha-extra input { width: 14px; height: 14px; accent-color: var(--yellow); cursor: pointer; flex-shrink: 0; }
.ck-root .bainha-extra-title { flex: 1; font-family: 'Barlow Condensed', sans-serif; font-size: 11px; letter-spacing: 1.4px; text-transform: uppercase; color: var(--muted); transition: color .2s ease; }
.ck-root .bainha-extra.active .bainha-extra-title { color: var(--text); font-weight: 600; }
.ck-root .bainha-extra-price { font-family: 'Bebas Neue', sans-serif; font-size: 13px; color: var(--yellow); letter-spacing: 1px; }

.ck-root .cta-block { max-width: 560px; margin: 3rem auto 0; padding: 2rem 1.5rem; text-align: center; border-top: 1px solid var(--border); border-bottom: 1px solid var(--border); position: relative; animation: fadeInUp 0.6s 0.2s ease-out both; }
.ck-root .cta-block::before, .ck-root .cta-block::after { content: ''; position: absolute; left: 50%; transform: translateX(-50%); width: 40px; height: 1px; background: var(--yellow); }
.ck-root .cta-block::before { top: -1px; }
.ck-root .cta-block::after { bottom: -1px; }
.ck-root .total-row { display: flex; flex-direction: column; align-items: center; gap: 8px; margin-bottom: 18px; }
.ck-root .total-label { font-family: 'Barlow Condensed', sans-serif; font-size: 11px; letter-spacing: 3px; color: var(--muted); text-transform: uppercase; }
.ck-root .total-de { display: inline-flex; align-items: baseline; gap: 8px; opacity: 0.85; }
.ck-root .total-de-label { font-family: 'Barlow Condensed', sans-serif; font-size: 11px; letter-spacing: 2px; color: var(--muted); text-transform: uppercase; }
.ck-root .total-old { font-family: 'Barlow', sans-serif; font-size: 28px; color: var(--dim); text-decoration: line-through; }
.ck-root .total-por { display: inline-flex; align-items: baseline; gap: 10px; }
.ck-root .total-por-label { font-family: 'Barlow Condensed', sans-serif; font-size: 13px; letter-spacing: 3px; color: var(--yellow); text-transform: uppercase; }
.ck-root .total-val { font-family: 'Bebas Neue', sans-serif; font-size: 84px; letter-spacing: 3px; color: var(--yellow); line-height: 1; text-shadow: 0 2px 24px rgba(255,193,7,0.25); transition: all .3s ease; }
.ck-root .total-discount { display: inline-block; margin-top: 4px; font-family: 'Barlow Condensed', sans-serif; font-size: 11px; letter-spacing: 2px; background: var(--yellow); color: #000; padding: 4px 12px; border-radius: 3px; font-weight: 700; }
.ck-root .btn-cta { display: inline-block; background: var(--yellow); color: #000; border: none; border-radius: 6px; padding: 16px 48px; font-family: 'Barlow Condensed', sans-serif; font-size: 18px; font-weight: 700; letter-spacing: 3px; cursor: pointer; text-decoration: none; text-transform: uppercase; transition: all .25s ease; box-shadow: 0 4px 0 var(--yellow-dim), 0 8px 24px rgba(255,193,7,0.2); }
.ck-root .btn-cta:hover { background: var(--yellow-l); transform: translateY(-2px); box-shadow: 0 6px 0 var(--yellow-dim), 0 12px 28px rgba(255,193,7,0.3); }
.ck-root .btn-cta:active { transform: translateY(2px); box-shadow: 0 2px 0 var(--yellow-dim); }
.ck-root .cta-note { margin-top: 14px; font-family: 'Barlow Condensed', sans-serif; font-size: 11px; letter-spacing: 1.5px; color: var(--dim); text-transform: uppercase; }
.ck-root .cupom-msg { margin: 1.25rem auto 1rem; padding: 10px 18px; display: inline-block; background: rgba(255,193,7,0.1); border: 1px dashed var(--yellow); color: var(--yellow-l); font-family: 'Barlow Condensed', sans-serif; font-size: 14px; letter-spacing: 1.5px; text-transform: uppercase; border-radius: 4px; }
.ck-root .cupom-msg strong { color: #fff; font-weight: 700; }

.ck-root .ref-section { max-width: 900px; margin: 4rem auto 0; padding: 0 1.75rem; animation: fadeInUp 0.6s 0.25s ease-out both; }
.ck-root .ref-section-head { text-align: center; margin-bottom: 1.75rem; }
.ck-root .ref-section-head h2 { font-family: 'Bebas Neue', sans-serif; font-size: clamp(28px, 4vw, 38px); letter-spacing: 5px; margin: 6px 0 0; }
.ck-root .ref-card { margin: 0; background: var(--s1); border: 1px solid var(--border); border-radius: 6px; overflow: hidden; transition: all .3s ease; }
.ck-root .ref-card:hover { border-color: rgba(255,193,7,0.3); box-shadow: 0 8px 32px rgba(0,0,0,0.35); }
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

/* See prices button */
.ck-root .see-prices-btn { margin-top: 22px; display: inline-flex; align-items: center; gap: 8px; padding: 10px 22px; background: transparent; border: 1px solid var(--yellow); color: var(--yellow); font-family: 'Barlow Condensed', sans-serif; font-size: 12px; letter-spacing: 2.5px; text-transform: uppercase; border-radius: 4px; cursor: pointer; transition: all .25s ease; }
.ck-root .see-prices-btn:hover { background: rgba(255,193,7,0.1); transform: translateY(-1px); box-shadow: 0 4px 16px rgba(255,193,7,0.18); }

/* Price modal */
.ck-root .price-modal { position: fixed; inset: 0; z-index: 100; background: rgba(0,0,0,0.85); backdrop-filter: blur(8px); display: flex; align-items: flex-start; justify-content: center; padding: 2rem 1rem; overflow-y: auto; animation: fadeInUp 0.25s ease-out; }
.ck-root .price-modal-card { position: relative; width: 100%; max-width: 720px; background: linear-gradient(180deg, var(--s1) 0%, #070707 100%); border: 1px solid var(--border-m); border-radius: 8px; padding: 1.5rem 1.25rem 2rem; }
.ck-root .price-modal-card::before { content: ''; position: absolute; top: -1px; left: -1px; width: 18px; height: 18px; border-top: 2px solid var(--yellow); border-left: 2px solid var(--yellow); border-top-left-radius: 2px; }
.ck-root .price-modal-card::after { content: ''; position: absolute; bottom: -1px; right: -1px; width: 18px; height: 18px; border-bottom: 2px solid var(--yellow); border-right: 2px solid var(--yellow); border-bottom-right-radius: 2px; }
.ck-root .price-modal-close { position: absolute; top: 10px; right: 10px; width: 32px; height: 32px; background: transparent; border: 1px solid var(--border-m); color: var(--text); font-size: 20px; line-height: 1; border-radius: 50%; cursor: pointer; transition: all .2s ease; display: flex; align-items: center; justify-content: center; }
.ck-root .price-modal-close:hover { background: var(--yellow); color: #000; border-color: var(--yellow); }
.ck-root .price-modal-head { text-align: center; padding-bottom: 1.25rem; border-bottom: 1px solid var(--border); margin-bottom: 1.25rem; }
.ck-root .price-modal-head h2 { font-family: 'Bebas Neue', sans-serif; font-size: clamp(22px, 4vw, 30px); letter-spacing: 3px; margin: 6px 0 8px; }
.ck-root .price-modal-sub { font-family: 'Barlow Condensed', sans-serif; font-size: 11px; letter-spacing: 1.5px; color: var(--muted); text-transform: uppercase; margin: 0; }

.ck-root .price-version { margin-bottom: 1.5rem; }
.ck-root .price-version-title { display: flex; align-items: center; gap: 10px; padding: 8px 12px; background: rgba(255,193,7,0.06); border-left: 3px solid var(--yellow); border-radius: 2px; margin-bottom: 8px; }
.ck-root .price-version-name { font-family: 'Bebas Neue', sans-serif; font-size: 18px; letter-spacing: 3px; color: var(--text); }
.ck-root .price-version-tag { margin-left: auto; font-family: 'Barlow Condensed', sans-serif; font-size: 10px; letter-spacing: 1.5px; color: var(--yellow); text-transform: uppercase; }
.ck-root .price-table-wrap { overflow-x: auto; border: 1px solid var(--border); border-radius: 4px; }
.ck-root .price-table { width: 100%; border-collapse: collapse; min-width: 360px; }
.ck-root .price-table th { background: var(--s2); padding: 10px 8px; font-family: 'Barlow Condensed', sans-serif; font-size: 10px; letter-spacing: 1.5px; color: var(--muted); text-transform: uppercase; text-align: center; font-weight: 600; border-bottom: 1px solid var(--border); }
.ck-root .price-table th:first-child { text-align: left; padding-left: 12px; }
.ck-root .price-table td { padding: 10px 8px; text-align: center; border-bottom: 1px solid var(--border); }
.ck-root .price-table tbody tr:last-child td { border-bottom: none; }
.ck-root .price-table tbody tr:hover { background: rgba(255,193,7,0.04); }
.ck-root .price-size-name { font-family: 'Bebas Neue', sans-serif; font-size: 15px; letter-spacing: 2px; color: var(--text); text-align: left; padding-left: 4px; }
.ck-root .price-size-dim { display: flex; flex-direction: column; gap: 2px; font-family: 'Barlow Condensed', sans-serif; font-size: 10px; letter-spacing: 0.8px; color: var(--muted); text-transform: uppercase; text-align: left; padding-left: 4px; margin-top: 4px; }
.ck-root .price-size-dim strong { color: var(--text); font-weight: 600; letter-spacing: 1px; }
.ck-root .price-size-total { color: var(--yellow) !important; font-weight: 600; margin-top: 2px; }
.ck-root .price-cell { font-family: 'Bebas Neue', sans-serif; font-size: 17px; letter-spacing: 1px; color: var(--yellow); }
.ck-root .price-extra { display: flex; align-items: center; justify-content: space-between; margin-top: 8px; padding: 8px 12px; border: 1px dashed var(--border-m); border-radius: 4px; font-family: 'Barlow Condensed', sans-serif; font-size: 11px; letter-spacing: 1.5px; color: var(--muted); text-transform: uppercase; }
.ck-root .price-extra strong { font-family: 'Bebas Neue', sans-serif; font-size: 14px; color: var(--yellow); letter-spacing: 1px; font-weight: 400; }

.ck-root .price-discounts { margin-top: 1.5rem; padding: 1rem; background: var(--s2); border-radius: 4px; border: 1px solid var(--border); }
.ck-root .price-discounts-title { font-family: 'Barlow Condensed', sans-serif; font-size: 11px; letter-spacing: 2px; color: var(--muted); text-transform: uppercase; text-align: center; margin-bottom: 10px; }
.ck-root .price-discounts-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 8px; }
.ck-root .price-disc-item { display: flex; flex-direction: column; align-items: center; padding: 10px 6px; background: var(--s1); border: 1px solid var(--border); border-radius: 4px; }
.ck-root .price-disc-item.on { border-color: var(--yellow); background: rgba(255,193,7,0.07); }
.ck-root .price-disc-qty { font-family: 'Barlow Condensed', sans-serif; font-size: 10px; letter-spacing: 1.5px; color: var(--muted); text-transform: uppercase; }
.ck-root .price-disc-val { font-family: 'Bebas Neue', sans-serif; font-size: 22px; color: var(--yellow); letter-spacing: 1px; margin-top: 2px; }
.ck-root .price-disc-item:not(.on) .price-disc-val { color: var(--dim); }
.ck-root .price-disc-note { font-family: 'Barlow Condensed', sans-serif; font-size: 10px; letter-spacing: 1px; color: var(--muted); text-align: center; margin: 10px 0 0; text-transform: uppercase; }

.ck-root .price-modal-cta { display: block; width: 100%; margin: 1.5rem auto 0; text-align: center; }

@media (max-width: 520px) {
  .ck-root .price-modal { padding: 1rem 0.5rem; }
  .ck-root .price-modal-card { padding: 1.25rem 0.85rem 1.5rem; }
  .ck-root .price-cell { font-size: 14px; }
  .ck-root .price-size-name { font-size: 13px; letter-spacing: 1.5px; }
  .ck-root .price-table th, .ck-root .price-table td { padding: 8px 4px; }
}
`;
