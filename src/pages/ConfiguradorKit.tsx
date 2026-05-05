import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { Settings } from 'lucide-react';
import kaowzLogo from '@/assets/kaowz-logo.png';
import kitCard from '@/assets/push-dagger-kit-card.jpeg';
import imgAcetinada from '@/assets/push-dagger-acetinada.jpeg';
import imgStoneWashed from '@/assets/push-dagger-stone-washed.jpeg';
import imgTactical from '@/assets/push-dagger-tactical.jpeg';

type FinishKey = 'satin' | 'sw' | 'tac';
type SizeKey = 'standard' | 'compact' | 'micro';
type BainhaKey = 'velada' | 'multi';

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

export interface KitConfig {
  prices: Record<SizeKey, Record<FinishKey, number>>;
  images: Record<FinishKey, string>;
  kitImage: string;
  discountPercent: number;
  bainhaExtraPrice: number;
}

export const DEFAULT_CONFIG: KitConfig = {
  prices: {
    standard: { satin: 935, sw: 985, tac: 1090 },
    compact:  { satin: 645, sw: 665, tac: 755 },
    micro:    { satin: 515, sw: 535, tac: 625 },
  },
  images: { satin: imgAcetinada, sw: imgStoneWashed, tac: imgTactical },
  kitImage: kitCard,
  discountPercent: 0,
  bainhaExtraPrice: 180,
};

export const CONFIG_STORAGE_KEY = 'configurador-kit-config-v1';

export function loadKitConfig(): KitConfig {
  try {
    const raw = localStorage.getItem(CONFIG_STORAGE_KEY);
    if (!raw) return DEFAULT_CONFIG;
    const parsed = JSON.parse(raw);
    return {
      ...DEFAULT_CONFIG,
      ...parsed,
      prices: { ...DEFAULT_CONFIG.prices, ...(parsed.prices || {}) },
      images: { ...DEFAULT_CONFIG.images, ...(parsed.images || {}) },
    };
  } catch {
    return DEFAULT_CONFIG;
  }
}

const BRL = (n: number) =>
  n.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL', minimumFractionDigits: 0, maximumFractionDigits: 0 });

export default function ConfiguradorKit() {
  const [cfg, setCfg] = useState<KitConfig>(() => loadKitConfig());
  const [selections, setSelections] = useState<Record<SizeKey, FinishKey>>({
    standard: 'sw', compact: 'sw', micro: 'sw',
  });
  const [bainhas, setBainhas] = useState<Record<SizeKey, BainhaKey>>({
    standard: 'velada', compact: 'velada', micro: 'velada',
  });
  const [bainhaExtras, setBainhaExtras] = useState<Record<SizeKey, boolean>>({
    standard: false, compact: false, micro: false,
  });
  const [bainhaExtraTipo, setBainhaExtraTipo] = useState<Record<SizeKey, BainhaKey>>({
    standard: 'multi', compact: 'multi', micro: 'multi',
  });

  useEffect(() => {
    const onStorage = () => setCfg(loadKitConfig());
    window.addEventListener('storage', onStorage);
    return () => window.removeEventListener('storage', onStorage);
  }, []);

  const subtotal = useMemo(
    () => SIZE_LIST.reduce((sum, s) => sum + cfg.prices[s.key][selections[s.key]], 0),
    [selections, cfg.prices],
  );
  const extrasCount = useMemo(
    () => SIZE_LIST.reduce((n, s) => n + (bainhaExtras[s.key] ? 1 : 0), 0),
    [bainhaExtras],
  );
  const extra = extrasCount * cfg.bainhaExtraPrice;
  const beforeDiscount = subtotal + extra;
  const discountValue = Math.round(beforeDiscount * (cfg.discountPercent / 100));
  const total = beforeDiscount - discountValue;

  const waMessage = useMemo(() => {
    const lines = SIZE_LIST.map((s) => {
      const fk = selections[s.key];
      const bk = bainhas[s.key];
      const bn = bk === 'velada' ? 'Velada' : 'Multifuncional';
      const ex = bainhaExtras[s.key]
        ? ` + Bainha Extra ${bainhaExtraTipo[s.key] === 'velada' ? 'Velada' : 'Multifuncional'} (${BRL(cfg.bainhaExtraPrice)})`
        : '';
      return `• ${s.name} — ${FINISH_NAMES[fk]} (${BRL(cfg.prices[s.key][fk])})\n   Bainha: ${bn}${ex}`;
    });
    const desc = cfg.discountPercent > 0 ? `\nDesconto: ${cfg.discountPercent}% (-${BRL(discountValue)})` : '';
    return encodeURIComponent(
      `Olá! Quero montar este Kit Push Dagger:\n${lines.join('\n')}${desc}\n\nTotal: ${BRL(total)}`,
    );
  }, [selections, bainhas, bainhaExtras, bainhaExtraTipo, cfg, discountValue, total]);

  return (
    <div className="ck-root">
      <style>{css}</style>

      <header className="ck-header">
        <Link to="/configurador-kit" className="logo" aria-label="Kaowz">
          <img src={kaowzLogo} alt="Kaowz - Ferramentas de Corte" className="logo-img" />
        </Link>
        <Link to="/configurador-kit/configuracoes" className="header-config" aria-label="Configurações">
          <Settings size={16} />
          <span>Configurar</span>
        </Link>
      </header>

      <section className="hero">
        <div className="eyebrow">— Push Dagger Series —</div>
        <h1 className="hero-title">MONTE SEU <span>KIT</span></h1>
        <p className="hero-desc">
          A evolução de um ícone da defesa pessoal. Escolha o acabamento de cada tamanho e configure o seu kit exclusivo.
        </p>
      </section>

      <div className="config-grid">
        {SIZE_LIST.map((s, i) => {
          const sel = selections[s.key];
          const totalMm = s.bladeMm + s.gripMm;
          return (
            <article className="col" key={s.key}>
              <div className="col-head">
                <div className="col-index">0{i + 1}</div>
                <div className="col-head-text">
                  <div className="col-model">{s.name}</div>
                  <div className="col-dims">Total {totalMm.toFixed(1).replace('.', ',')} mm</div>
                </div>
              </div>

              <div className="product-stage">
                <div className="product-card">
                  {FINISH_KEYS.map((fk) => (
                    <img
                      key={fk}
                      src={cfg.images[fk]}
                      alt={`${s.name} ${FINISH_NAMES[fk]}`}
                      className={`product-img ${sel === fk ? 'is-active' : ''}`}
                      loading="eager"
                    />
                  ))}
                  <div className="product-card-overlay" />
                  <div className="product-card-tag">{FINISH_NAMES[sel]}</div>
                  <div className="product-card-price">{BRL(cfg.prices[s.key][sel])}</div>
                </div>
              </div>

              <div className="opt-section">
                <div className="opt-label">Acabamento</div>
                <div className="finish-options">
                  {FINISH_KEYS.map((fk) => (
                    <button
                      key={fk}
                      type="button"
                      className={`finish-btn ${sel === fk ? 'active' : ''}`}
                      onClick={() => setSelections((st) => ({ ...st, [s.key]: fk }))}
                    >
                      <span className="finish-name">{FINISH_NAMES[fk]}</span>
                    </button>
                  ))}
                </div>
              </div>

              <div className="opt-section">
                <div className="opt-label">Bainha</div>
                <div className="finish-options bainha-options">
                  {([
                    { key: 'velada' as BainhaKey, name: 'Velada' },
                    { key: 'multi' as BainhaKey, name: 'Multifuncional' },
                  ]).map((b) => {
                    const active = bainhas[s.key] === b.key;
                    return (
                      <button
                        key={b.key}
                        type="button"
                        className={`finish-btn ${active ? 'active' : ''}`}
                        onClick={() => setBainhas((st) => ({ ...st, [s.key]: b.key }))}
                      >
                        <span className="finish-name">{b.name}</span>
                      </button>
                    );
                  })}
                </div>
                <label className={`bainha-extra ${bainhaExtras[s.key] ? 'active' : ''}`}>
                  <input
                    type="checkbox"
                    checked={bainhaExtras[s.key]}
                    onChange={(e) =>
                      setBainhaExtras((st) => ({ ...st, [s.key]: e.target.checked }))
                    }
                  />
                  <span className="bainha-extra-title">Bainha Extra</span>
                  <span className="bainha-extra-price">+ {BRL(cfg.bainhaExtraPrice)}</span>
                </label>
                {bainhaExtras[s.key] && (
                  <div className="finish-options bainha-options bainha-extra-tipo">
                    {([
                      { key: 'velada' as BainhaKey, name: 'Velada' },
                      { key: 'multi' as BainhaKey, name: 'Multifuncional' },
                    ]).map((b) => {
                      const active = bainhaExtraTipo[s.key] === b.key;
                      return (
                        <button
                          key={b.key}
                          type="button"
                          className={`finish-btn ${active ? 'active' : ''}`}
                          onClick={() => setBainhaExtraTipo((st) => ({ ...st, [s.key]: b.key }))}
                        >
                          <span className="finish-name">{b.name}</span>
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
            </article>
          );
        })}
      </div>

      <div className="cta-block">
        <div className="total-row">
          <span className="total-label">Total do Kit</span>
          {cfg.discountPercent > 0 && (
            <span className="total-old">{BRL(beforeDiscount)}</span>
          )}
          <span className="total-val">{BRL(total)}</span>
          {cfg.discountPercent > 0 && (
            <span className="total-discount">-{cfg.discountPercent}%</span>
          )}
        </div>
        {cfg.discountPercent > 0 && (
          <div className="cupom-msg">Resgate seu cupom de <strong>{cfg.discountPercent}%</strong> de desconto</div>
        )}
        <a className="btn-cta" href={`https://wa.me/?text=${waMessage}`} target="_blank" rel="noopener noreferrer">
          Quero Comprar Agora
        </a>
        <div className="cta-note">Pagamento seguro</div>
      </div>

      {/* Referência visual: somente o kit completo */}
      <section className="ref-section">
        <div className="ref-section-head">
          <div className="eyebrow">— Referência Visual —</div>
          <h2>O Kit por Inteiro</h2>
        </div>
        <figure className="ref-card">
          <div className="ref-img-wrap">
            <img src={cfg.kitImage} alt="Kit Push Dagger completo" />
          </div>
          <figcaption>
            <span className="ref-label">Kit Completo</span>
            <span className="ref-sub">Standard · Compact · Micro</span>
          </figcaption>
        </figure>
      </section>

      <div className="footer-note">
        Garantia vitalícia · Afiação vitalícia gratuita · Certificado oficial · Cartão premium gravado a laser
        <br />
        Venda exclusiva para maiores de 18 anos.
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
  --yellow: #FFC107;
  --yellow-l: #FFD54A;
  --text: #FFFFFF;
  --muted: #8A8A88;
  --dim: #4A4A48;
  background: var(--bg);
  color: var(--text);
  font-family: 'Barlow', sans-serif;
  min-height: 100vh;
  margin: -1.5rem;
  background-image:
    radial-gradient(ellipse at top, rgba(255,193,7,0.04), transparent 50%),
    repeating-linear-gradient(45deg, transparent 0 12px, rgba(255,255,255,0.012) 12px 13px);
}
.ck-root * { box-sizing: border-box; }

.ck-header {
  display: flex; align-items: center; justify-content: space-between;
  padding: 1rem 1.75rem; border-bottom: 1px solid var(--border);
  background: rgba(5,5,5,0.85); backdrop-filter: blur(12px);
  position: sticky; top: 0; z-index: 40;
}
.ck-root .logo { display: inline-flex; align-items: center; }
.ck-root .logo-img { height: 38px; width: auto; display: block; }
.ck-root .header-config { display: inline-flex; align-items: center; gap: 8px; font-family: 'Barlow Condensed', sans-serif; font-size: 11px; letter-spacing: 2.5px; text-transform: uppercase; color: var(--muted); border: 1px solid var(--border); padding: 7px 12px; border-radius: 3px; text-decoration: none; transition: all .2s; }
.ck-root .header-config:hover { color: var(--yellow); border-color: rgba(255,193,7,0.35); }

.ck-root .hero { padding: 4rem 1.5rem 2.5rem; text-align: center; max-width: 760px; margin: 0 auto; }
.ck-root .eyebrow { font-family: 'Barlow Condensed', sans-serif; font-size: 11px; letter-spacing: 4px; color: var(--yellow); text-transform: uppercase; margin-bottom: 18px; }
.ck-root .hero-title { font-family: 'Bebas Neue', sans-serif; font-size: clamp(48px, 8vw, 80px); letter-spacing: 6px; line-height: 0.95; margin-bottom: 22px; font-weight: 700; }
.ck-root .hero-title span { color: var(--yellow); font-style: italic; }
.ck-root .hero-desc { font-size: 14px; color: #B5B5B3; line-height: 1.7; max-width: 520px; margin: 0 auto; letter-spacing: 0.3px; }

.ck-root .config-grid { display: grid; grid-template-columns: repeat(3, 1fr); max-width: 1100px; margin: 1rem auto 0; gap: 18px; padding: 0 1.75rem; }
.ck-root .col { background: linear-gradient(180deg, var(--s1) 0%, #070707 100%); border: 1px solid var(--border); border-radius: 4px; padding: 1.25rem; display: flex; flex-direction: column; gap: 1rem; transition: all .3s; position: relative; }
.ck-root .col:hover { border-color: rgba(255,193,7,0.25); transform: translateY(-2px); }
.ck-root .col-head { display: grid; grid-template-columns: auto 1fr; align-items: center; gap: 12px; padding-bottom: 0.75rem; border-bottom: 1px solid var(--border); }
.ck-root .col-index { font-family: 'Bebas Neue', sans-serif; font-size: 28px; color: var(--yellow); line-height: 1; opacity: 0.85; }
.ck-root .col-model { font-family: 'Bebas Neue', sans-serif; font-size: 22px; letter-spacing: 4px; line-height: 1; }
.ck-root .col-dims { font-family: 'Barlow Condensed', sans-serif; font-size: 10px; color: var(--muted); letter-spacing: 1.2px; margin-top: 4px; text-transform: uppercase; }

.ck-root .product-stage { position: relative; width: 100%; display: flex; flex-direction: column; align-items: center; }
.ck-root .product-card { position: relative; width: 100%; aspect-ratio: 1 / 1; background: var(--s2); border: 1px solid var(--border); border-radius: 3px; overflow: hidden; }
.ck-root .product-img { position: absolute; inset: 0; width: 100%; height: 100%; object-fit: cover; opacity: 0; transition: opacity .18s ease-out; will-change: opacity; }
.ck-root .product-img.is-active { opacity: 1; }
.ck-root .product-card-overlay { position: absolute; inset: 0; background: linear-gradient(180deg, transparent 50%, rgba(0,0,0,0.7) 100%); pointer-events: none; }
.ck-root .product-card-tag { position: absolute; left: 8px; bottom: 8px; background: rgba(0,0,0,0.65); backdrop-filter: blur(8px); border: 1px solid var(--border-m); color: #fff; font-family: 'Barlow Condensed', sans-serif; font-size: 10px; letter-spacing: 1.5px; text-transform: uppercase; padding: 4px 10px; border-radius: 2px; font-weight: 500; }
.ck-root .product-card-price { position: absolute; right: 8px; top: 8px; background: var(--yellow); color: #000; font-family: 'Bebas Neue', sans-serif; font-size: 14px; letter-spacing: 1.5px; padding: 3px 8px; border-radius: 2px; }

.ck-root .finish-options { display: grid; grid-template-columns: repeat(3, 1fr); gap: 4px; }
.ck-root .finish-btn { padding: 11px 4px; border: 1px solid var(--border); border-radius: 2px; background: transparent; cursor: pointer; transition: all .15s ease; color: inherit; font-family: inherit; }
.ck-root .finish-btn:hover { border-color: var(--border-m); background: rgba(255,255,255,0.02); }
.ck-root .finish-btn.active { border-color: var(--yellow); background: rgba(255,193,7,0.06); }
.ck-root .finish-name { font-family: 'Barlow Condensed', sans-serif; font-size: 11px; color: var(--muted); letter-spacing: 1.4px; text-transform: uppercase; line-height: 1; display: block; }
.ck-root .finish-btn.active .finish-name { color: var(--yellow); font-weight: 600; }

.ck-root .opt-section { display: flex; flex-direction: column; gap: 6px; }
.ck-root .opt-label { font-family: 'Barlow Condensed', sans-serif; font-size: 10px; letter-spacing: 2px; color: var(--muted); text-transform: uppercase; }
.ck-root .bainha-options { grid-template-columns: 1fr 1fr; }

.ck-root .bainha-extra { display: flex; align-items: center; gap: 10px; padding: 9px 11px; background: transparent; border: 1px dashed var(--border-m); border-radius: 2px; cursor: pointer; transition: all .15s; margin-top: 2px; }
.ck-root .bainha-extra:hover { border-color: rgba(255,193,7,0.4); }
.ck-root .bainha-extra.active { border-style: solid; border-color: var(--yellow); background: rgba(255,193,7,0.06); }
.ck-root .bainha-extra input { width: 14px; height: 14px; accent-color: var(--yellow); cursor: pointer; flex-shrink: 0; }
.ck-root .bainha-extra-title { flex: 1; font-family: 'Barlow Condensed', sans-serif; font-size: 11px; letter-spacing: 1.4px; text-transform: uppercase; color: var(--muted); }
.ck-root .bainha-extra.active .bainha-extra-title { color: var(--text); font-weight: 600; }
.ck-root .bainha-extra-price { font-family: 'Bebas Neue', sans-serif; font-size: 13px; color: var(--yellow); letter-spacing: 1px; }

.ck-root .cta-block { max-width: 560px; margin: 3.5rem auto 0; padding: 2rem 1.5rem; text-align: center; border-top: 1px solid var(--border); border-bottom: 1px solid var(--border); position: relative; }
.ck-root .cta-block::before, .ck-root .cta-block::after { content: ''; position: absolute; left: 50%; transform: translateX(-50%); width: 40px; height: 1px; background: var(--yellow); }
.ck-root .cta-block::before { top: -1px; }
.ck-root .cta-block::after { bottom: -1px; }
.ck-root .total-row { display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 6px; margin-bottom: 18px; }
.ck-root .total-label { font-family: 'Barlow Condensed', sans-serif; font-size: 11px; letter-spacing: 3px; color: var(--muted); text-transform: uppercase; }
.ck-root .total-old { font-family: 'Barlow', sans-serif; font-size: 22px; color: var(--dim); text-decoration: line-through; }
.ck-root .total-val { font-family: 'Bebas Neue', sans-serif; font-size: 64px; letter-spacing: 2px; color: var(--yellow); line-height: 1; }
.ck-root .total-discount { display: inline-block; margin-top: 4px; font-family: 'Barlow Condensed', sans-serif; font-size: 11px; letter-spacing: 2px; background: var(--yellow); color: #000; padding: 3px 10px; border-radius: 2px; font-weight: 700; }
.ck-root .btn-cta {
  display: inline-block; background: var(--yellow); color: #000;
  border: none; border-radius: 3px; padding: 16px 48px;
  font-family: 'Barlow Condensed', sans-serif; font-size: 18px; font-weight: 700;
  letter-spacing: 3px; cursor: pointer; text-decoration: none; text-transform: uppercase;
  transition: all .25s; box-shadow: 0 4px 0 #b58800, 0 8px 24px rgba(255,193,7,0.2);
}
.ck-root .btn-cta:hover { background: var(--yellow-l); transform: translateY(-2px); box-shadow: 0 6px 0 #b58800, 0 12px 28px rgba(255,193,7,0.3); }
.ck-root .btn-cta:active { transform: translateY(2px); box-shadow: 0 2px 0 #b58800; }
.ck-root .cta-note { margin-top: 14px; font-family: 'Barlow Condensed', sans-serif; font-size: 11px; letter-spacing: 1.5px; color: var(--dim); text-transform: uppercase; }
.ck-root .cupom-msg { margin: 1.25rem auto 1rem; padding: 10px 18px; display: inline-block; background: rgba(255,193,7,0.1); border: 1px dashed var(--yellow); color: var(--yellow); font-family: 'Barlow Condensed', sans-serif; font-size: 14px; letter-spacing: 1.5px; text-transform: uppercase; border-radius: 4px; }
.ck-root .cupom-msg strong { color: #fff; font-weight: 700; }

.ck-root .ref-section { max-width: 900px; margin: 4rem auto 0; padding: 0 1.75rem; }
.ck-root .ref-section-head { text-align: center; margin-bottom: 1.75rem; }
.ck-root .ref-section-head h2 { font-family: 'Bebas Neue', sans-serif; font-size: clamp(28px, 4vw, 38px); letter-spacing: 5px; margin: 6px 0 0; }
.ck-root .ref-card { margin: 0; background: var(--s1); border: 1px solid var(--border); border-radius: 3px; overflow: hidden; }
.ck-root .ref-img-wrap { position: relative; width: 100%; background: #000; aspect-ratio: 16/9; }
.ck-root .ref-img-wrap img { position: absolute; inset: 0; width: 100%; height: 100%; object-fit: cover; }
.ck-root .ref-card figcaption { display: flex; align-items: center; justify-content: space-between; padding: 12px 16px; border-top: 1px solid var(--border); }
.ck-root .ref-label { font-family: 'Bebas Neue', sans-serif; font-size: 16px; letter-spacing: 3px; color: var(--text); }
.ck-root .ref-sub { font-family: 'Barlow Condensed', sans-serif; font-size: 10px; letter-spacing: 1.5px; color: var(--muted); text-transform: uppercase; }

.ck-root .footer-note { text-align: center; padding: 2rem 1.5rem 4rem; font-size: 11px; color: var(--dim); line-height: 1.9; letter-spacing: 0.5px; }

@media (max-width: 760px) {
  .ck-root .ck-header { padding: 0.85rem 1rem; }
  .ck-root .header-config span { display: none; }
  .ck-root .hero { padding: 2.5rem 1rem 1.5rem; }
  .ck-root .config-grid { grid-template-columns: 1fr; padding: 0 1rem; gap: 14px; }
  .ck-root .product-card { aspect-ratio: 4 / 3; }
  .ck-root .cta-block { padding: 1.5rem 1rem; }
  .ck-root .btn-cta { padding: 14px 32px; font-size: 15px; width: 100%; }
  .ck-root .total-val { font-size: 52px; }
  .ck-root .total-old { font-size: 18px; }
  .ck-root .ref-section { padding: 0 1rem; margin-top: 2.5rem; }
}
`;
