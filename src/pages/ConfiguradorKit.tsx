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

  useEffect(() => {
    const onStorage = () => setCfg(loadKitConfig());
    window.addEventListener('storage', onStorage);
    return () => window.removeEventListener('storage', onStorage);
  }, []);

  const subtotal = useMemo(
    () => SIZE_LIST.reduce((sum, s) => sum + cfg.prices[s.key][selections[s.key]], 0),
    [selections, cfg.prices],
  );
  const extra = bainhaExtra ? cfg.bainhaExtraPrice : 0;
  const beforeDiscount = subtotal + extra;
  const discountValue = Math.round(beforeDiscount * (cfg.discountPercent / 100));
  const total = beforeDiscount - discountValue;

  const waMessage = useMemo(() => {
    const lines = SIZE_LIST.map((s) => {
      const fk = selections[s.key];
      return `• ${s.name} — ${FINISH_NAMES[fk]} (${BRL(cfg.prices[s.key][fk])})`;
    });
    const bainhaLine = `Bainha: ${bainha === 'velada' ? 'Velada' : 'Multifuncional'}${bainhaExtra ? ' + Bainha Extra (' + BRL(cfg.bainhaExtraPrice) + ')' : ''}`;
    const desc = cfg.discountPercent > 0 ? `\nDesconto: ${cfg.discountPercent}% (-${BRL(discountValue)})` : '';
    return encodeURIComponent(
      `Olá! Quero montar este Kit Push Dagger:\n${lines.join('\n')}\n${bainhaLine}${desc}\n\nTotal: ${BRL(total)}`,
    );
  }, [selections, bainha, bainhaExtra, cfg, discountValue, total]);

  return (
    <div className="ck-root">
      <style>{css}</style>

      <header className="ck-header">
        <div className="logo">
          <div className="logo-mark">
            <svg viewBox="0 0 24 24" fill="none" stroke="#FFC107" strokeWidth="2.2">
              <path d="M4 20 L12 4 L20 20 Z" />
            </svg>
          </div>
          <div>
            <div className="logo-name">KAOWZ</div>
            <div className="logo-sub">Ferramentas de Corte</div>
          </div>
        </div>
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
            </article>
          );
        })}
      </div>

      {/* Bainha */}
      <section className="bainha-block">
        <div className="bainha-head">
          <div className="eyebrow">— Escolha a Bainha —</div>
          <h2>Tipo de Bainha</h2>
        </div>
        <div className="bainha-grid">
          {([
            { key: 'velada' as BainhaKey, name: 'Velada', desc: 'Discreta · Porte oculto' },
            { key: 'multi'  as BainhaKey, name: 'Multifuncional', desc: 'Versátil · Múltiplas posições' },
          ]).map((b) => (
            <button
              key={b.key}
              type="button"
              className={`bainha-card ${bainha === b.key ? 'active' : ''}`}
              onClick={() => setBainha(b.key)}
            >
              <div className="bainha-name">{b.name}</div>
              <div className="bainha-desc">{b.desc}</div>
            </button>
          ))}
        </div>
        <label className={`bainha-extra ${bainhaExtra ? 'active' : ''}`}>
          <input
            type="checkbox"
            checked={bainhaExtra}
            onChange={(e) => setBainhaExtra(e.target.checked)}
          />
          <div className="bainha-extra-text">
            <div className="bainha-extra-title">Adicionar Bainha Extra</div>
            <div className="bainha-extra-sub">Inclua a segunda opção de bainha no kit</div>
          </div>
          <div className="bainha-extra-price">+ {BRL(cfg.bainhaExtraPrice)}</div>
        </label>
      </section>

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
.ck-root .logo { display: flex; align-items: center; gap: 12px; }
.ck-root .logo-mark { width: 38px; height: 38px; border: 1.5px solid var(--yellow); border-radius: 6px; display: flex; align-items: center; justify-content: center; }
.ck-root .logo-mark svg { width: 20px; height: 20px; }
.ck-root .logo-name { font-family: 'Bebas Neue', sans-serif; font-size: 24px; letter-spacing: 4px; line-height: 1; }
.ck-root .logo-sub { font-size: 9px; color: var(--muted); letter-spacing: 2.5px; text-transform: uppercase; font-family: 'Barlow Condensed', sans-serif; margin-top: 2px; }
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

/* Bainha */
.ck-root .bainha-block { max-width: 1100px; margin: 3rem auto 0; padding: 0 1.75rem; }
.ck-root .bainha-head { text-align: center; margin-bottom: 1.25rem; }
.ck-root .bainha-head h2 { font-family: 'Bebas Neue', sans-serif; font-size: clamp(24px, 3.5vw, 32px); letter-spacing: 5px; margin: 6px 0 0; }
.ck-root .bainha-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; }
.ck-root .bainha-card { background: var(--s1); border: 1px solid var(--border); border-radius: 3px; padding: 1.1rem 1.25rem; cursor: pointer; transition: all .2s; text-align: left; color: inherit; font-family: inherit; }
.ck-root .bainha-card:hover { border-color: var(--border-m); }
.ck-root .bainha-card.active { border-color: var(--yellow); background: rgba(255,193,7,0.06); }
.ck-root .bainha-name { font-family: 'Bebas Neue', sans-serif; font-size: 20px; letter-spacing: 3px; }
.ck-root .bainha-card.active .bainha-name { color: var(--yellow); }
.ck-root .bainha-desc { font-family: 'Barlow Condensed', sans-serif; font-size: 11px; color: var(--muted); letter-spacing: 1.2px; text-transform: uppercase; margin-top: 4px; }
.ck-root .bainha-extra { display: flex; align-items: center; gap: 14px; margin-top: 12px; padding: 14px 16px; background: var(--s1); border: 1px solid var(--border); border-radius: 3px; cursor: pointer; transition: all .2s; }
.ck-root .bainha-extra:hover { border-color: var(--border-m); }
.ck-root .bainha-extra.active { border-color: var(--yellow); background: rgba(255,193,7,0.06); }
.ck-root .bainha-extra input { width: 18px; height: 18px; accent-color: var(--yellow); cursor: pointer; }
.ck-root .bainha-extra-text { flex: 1; }
.ck-root .bainha-extra-title { font-family: 'Bebas Neue', sans-serif; font-size: 16px; letter-spacing: 2px; }
.ck-root .bainha-extra-sub { font-family: 'Barlow Condensed', sans-serif; font-size: 10px; color: var(--muted); letter-spacing: 1.2px; text-transform: uppercase; margin-top: 2px; }
.ck-root .bainha-extra-price { font-family: 'Bebas Neue', sans-serif; font-size: 18px; color: var(--yellow); letter-spacing: 1.5px; }

.ck-root .cta-block { max-width: 560px; margin: 3.5rem auto 0; padding: 2rem 1.5rem; text-align: center; border-top: 1px solid var(--border); border-bottom: 1px solid var(--border); position: relative; }
.ck-root .cta-block::before, .ck-root .cta-block::after { content: ''; position: absolute; left: 50%; transform: translateX(-50%); width: 40px; height: 1px; background: var(--yellow); }
.ck-root .cta-block::before { top: -1px; }
.ck-root .cta-block::after { bottom: -1px; }
.ck-root .total-row { display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 6px; margin-bottom: 18px; }
.ck-root .total-label { font-family: 'Barlow Condensed', sans-serif; font-size: 11px; letter-spacing: 3px; color: var(--muted); text-transform: uppercase; }
.ck-root .total-old { font-family: 'Barlow', sans-serif; font-size: 14px; color: var(--dim); text-decoration: line-through; }
.ck-root .total-val { font-family: 'Bebas Neue', sans-serif; font-size: 52px; letter-spacing: 2px; color: var(--yellow); line-height: 1; }
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
  .ck-root .bainha-block { padding: 0 1rem; }
  .ck-root .bainha-grid { grid-template-columns: 1fr; }
  .ck-root .cta-block { padding: 1.5rem 1rem; }
  .ck-root .btn-cta { padding: 14px 32px; font-size: 15px; width: 100%; }
  .ck-root .total-val { font-size: 42px; }
  .ck-root .ref-section { padding: 0 1rem; margin-top: 2.5rem; }
}
`;
