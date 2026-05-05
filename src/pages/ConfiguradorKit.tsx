import { useMemo, useState } from 'react';
import sizesRef from '@/assets/push-dagger-sizes.jpeg';
import kitCard from '@/assets/push-dagger-kit-card.jpeg';
import imgAcetinada from '@/assets/push-dagger-acetinada.jpeg';
import imgStoneWashed from '@/assets/push-dagger-stone-washed.jpeg';
import imgTactical from '@/assets/push-dagger-tactical.jpeg';

type FinishKey = 'satin' | 'sw' | 'tac';
type SizeKey = 'standard' | 'compact' | 'micro';

interface Finish {
  key: FinishKey;
  name: string;
  swatchClass: string;
  image: string;
}

const FINISHES: Finish[] = [
  { key: 'satin', name: 'Acetinada',    swatchClass: 'swatch-satin', image: imgAcetinada },
  { key: 'sw',    name: 'Stone Washed', swatchClass: 'swatch-sw',    image: imgStoneWashed },
  { key: 'tac',   name: 'Tactical',     swatchClass: 'swatch-tac',   image: imgTactical },
];

interface SizeDef {
  key: SizeKey;
  name: string;
  bladeMm: number;
  gripMm: number;
}

const SIZES: SizeDef[] = [
  { key: 'standard', name: 'STANDARD', bladeMm: 62.49, gripMm: 87.97 },
  { key: 'compact',  name: 'COMPACT',  bladeMm: 52.74, gripMm: 73.84 },
  { key: 'micro',    name: 'MICRO',    bladeMm: 37.16, gripMm: 68.51 },
];

const PRICES: Record<SizeKey, Record<FinishKey, number>> = {
  standard: { satin: 935, sw: 985, tac: 1090 },
  compact:  { satin: 645, sw: 665, tac: 755 },
  micro:    { satin: 515, sw: 535, tac: 625 },
};

const BRL = (n: number) =>
  n.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL', minimumFractionDigits: 0, maximumFractionDigits: 0 });

export default function ConfiguradorKit() {
  const [selections, setSelections] = useState<Record<SizeKey, FinishKey>>({
    standard: 'sw',
    compact: 'sw',
    micro: 'sw',
  });

  const total = useMemo(
    () => SIZES.reduce((sum, s) => sum + PRICES[s.key][selections[s.key]], 0),
    [selections],
  );

  const waMessage = useMemo(() => {
    const lines = SIZES.map((s) => {
      const f = FINISHES.find((x) => x.key === selections[s.key])!;
      return `• ${s.name} — ${f.name} (${BRL(PRICES[s.key][f.key])})`;
    });
    return encodeURIComponent(
      `Olá! Quero montar este Kit Push Dagger:\n${lines.join('\n')}\n\nTotal: ${BRL(total)}`,
    );
  }, [selections, total]);

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
        <div className="header-tag">
          <span className="dot" /> Edição Limitada
        </div>
      </header>

      <section className="hero">
        <div className="eyebrow">— Push Dagger Series —</div>
        <h1 className="hero-title">
          MONTE SEU <span>KIT</span>
        </h1>
        <p className="hero-desc">
          A evolução de um ícone da defesa pessoal. Escolha o acabamento de cada tamanho e configure o seu kit exclusivo.
        </p>
      </section>

      <div className="config-grid">
        {SIZES.map((s, i) => {
          const sel = selections[s.key];
          const f = FINISHES.find((x) => x.key === sel)!;
          const totalMm = s.bladeMm + s.gripMm;
          const maxMm = SIZES[0].bladeMm + SIZES[0].gripMm;
          const scale = totalMm / maxMm; // 1.00, 0.85, 0.70
          return (
            <article className="col" key={s.key} data-size={s.key}>
              <div className="col-head">
                <div className="col-index">0{i + 1}</div>
                <div className="col-head-text">
                  <div className="col-model">{s.name}</div>
                  <div className="col-dims">
                    Total {totalMm.toFixed(1).replace('.', ',')} mm
                  </div>
                </div>
                <div className="col-scale" aria-hidden>
                  <span style={{ height: `${scale * 100}%` }} />
                </div>
              </div>

              <div className="product-stage">
                <div className="product-card">
                  {FINISHES.map((finish) => (
                    <img
                      key={finish.key}
                      src={finish.image}
                      alt={`${s.name} ${finish.name}`}
                      className={`product-img ${sel === finish.key ? 'is-active' : ''}`}
                      loading="eager"
                    />
                  ))}
                  <div className="product-card-overlay" />
                  <div className="product-card-tag">
                    <span className={`finish-swatch ${f.swatchClass}`} />
                    {f.name}
                  </div>
                  <div className="product-card-price">{BRL(PRICES[s.key][f.key])}</div>
                </div>
                <div className="ruler" aria-hidden>
                  <span className="ruler-bar" style={{ width: `${scale * 100}%` }} />
                  <span className="ruler-label">{totalMm.toFixed(1).replace('.', ',')} mm</span>
                </div>
              </div>

              <div className="finish-options">
                {FINISHES.map((finish) => {
                  const active = sel === finish.key;
                  return (
                    <button
                      key={finish.key}
                      type="button"
                      className={`finish-btn ${active ? 'active' : ''}`}
                      onClick={() => setSelections((st) => ({ ...st, [s.key]: finish.key }))}
                      aria-label={finish.name}
                    >
                      <span className={`finish-swatch ${finish.swatchClass}`} />
                      <span className="finish-name">{finish.name}</span>
                    </button>
                  );
                })}
              </div>
            </article>
          );
        })}
      </div>

      <div className="cta-block">
        <div className="total-row">
          <span className="total-label">Total do Kit</span>
          <span className="total-val">{BRL(total)}</span>
        </div>
        <a className="btn-cta" href={`https://wa.me/?text=${waMessage}`} target="_blank" rel="noopener noreferrer">
          Quero Comprar Agora
        </a>
        <div className="cta-note">Pagamento seguro · Envio em 24h após confirmação</div>
      </div>

      {/* Referência visual: Kit completo embaixo + tamanhos reais à direita */}
      <section className="ref-section">
        <div className="ref-section-head">
          <div className="eyebrow">— Referência Visual —</div>
          <h2>O Kit por Inteiro</h2>
        </div>
        <div className="ref-grid">
          <figure className="ref-card ref-main">
            <div className="ref-img-wrap">
              <img src={kitCard} alt="Kit Push Dagger completo" />
            </div>
            <figcaption>
              <span className="ref-label">Kit Completo</span>
              <span className="ref-sub">Standard · Compact · Micro</span>
            </figcaption>
          </figure>
          <figure className="ref-card ref-side">
            <div className="ref-img-wrap">
              <img src={sizesRef} alt="Comparativo de tamanhos reais" />
            </div>
            <figcaption>
              <span className="ref-label">Tamanhos Reais</span>
              <span className="ref-sub">Comparativo 1:1</span>
            </figcaption>
          </figure>
        </div>
      </section>

      <div className="ticker">
        <div className="ticker-track">
          {Array.from({ length: 8 }).map((_, i) => (
            <span key={i}>Edição Limitada <i>›</i> Kaowz Facas <i>›</i> </span>
          ))}
        </div>
      </div>

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
.ck-root .header-tag { display: flex; align-items: center; gap: 8px; font-family: 'Barlow Condensed', sans-serif; font-size: 11px; letter-spacing: 2.5px; text-transform: uppercase; color: var(--muted); }
.ck-root .header-tag .dot { width: 7px; height: 7px; background: var(--yellow); border-radius: 50%; box-shadow: 0 0 10px var(--yellow); animation: pulse 2s ease-in-out infinite; }
@keyframes pulse { 0%, 100% { opacity: 1; } 50% { opacity: 0.4; } }

.ck-root .hero { padding: 4rem 1.5rem 2.5rem; text-align: center; max-width: 760px; margin: 0 auto; }
.ck-root .eyebrow { font-family: 'Barlow Condensed', sans-serif; font-size: 11px; letter-spacing: 4px; color: var(--yellow); text-transform: uppercase; margin-bottom: 18px; }
.ck-root .hero-title { font-family: 'Bebas Neue', sans-serif; font-size: clamp(48px, 8vw, 80px); letter-spacing: 6px; line-height: 0.95; margin-bottom: 22px; font-weight: 700; }
.ck-root .hero-title span { color: var(--yellow); font-style: italic; }
.ck-root .hero-desc { font-size: 14px; color: #B5B5B3; line-height: 1.7; max-width: 520px; margin: 0 auto; letter-spacing: 0.3px; }

.ck-root .config-grid { display: grid; grid-template-columns: repeat(3, 1fr); max-width: 1100px; margin: 1rem auto 0; gap: 18px; padding: 0 1.75rem; }
.ck-root .col { background: linear-gradient(180deg, var(--s1) 0%, #070707 100%); border: 1px solid var(--border); border-radius: 4px; padding: 1.25rem; display: flex; flex-direction: column; gap: 1rem; transition: all .3s; position: relative; }
.ck-root .col::before { content: ''; position: absolute; top: 0; left: 0; right: 0; height: 1px; background: linear-gradient(90deg, transparent, rgba(255,193,7,0.3), transparent); opacity: 0; transition: opacity .3s; }
.ck-root .col:hover { border-color: rgba(255,193,7,0.25); transform: translateY(-2px); }
.ck-root .col:hover::before { opacity: 1; }
.ck-root .col-head { display: grid; grid-template-columns: auto 1fr auto; align-items: center; gap: 12px; padding-bottom: 0.75rem; border-bottom: 1px solid var(--border); }
.ck-root .col-index { font-family: 'Bebas Neue', sans-serif; font-size: 28px; color: var(--yellow); line-height: 1; opacity: 0.85; }
.ck-root .col-model { font-family: 'Bebas Neue', sans-serif; font-size: 22px; letter-spacing: 4px; line-height: 1; }
.ck-root .col-dims { font-family: 'Barlow Condensed', sans-serif; font-size: 10px; color: var(--muted); letter-spacing: 1.2px; margin-top: 4px; text-transform: uppercase; }
.ck-root .col-scale { width: 6px; height: 36px; background: rgba(255,255,255,0.04); border-radius: 2px; display: flex; align-items: flex-end; overflow: hidden; }
.ck-root .col-scale span { display: block; width: 100%; background: linear-gradient(180deg, var(--yellow) 0%, #b58800 100%); border-radius: 2px; }

.ck-root .product-stage { position: relative; width: 100%; padding: 8px 0 4px; display: flex; flex-direction: column; align-items: center; }
.ck-root .product-card { position: relative; width: 100%; aspect-ratio: 1 / 1; background: var(--s2); border: 1px solid var(--border); border-radius: 3px; overflow: hidden; }
.ck-root .product-img { position: absolute; inset: 0; width: 100%; height: 100%; object-fit: cover; opacity: 0; transition: opacity .18s ease-out; will-change: opacity; }
.ck-root .product-img.is-active { opacity: 1; }
.ck-root .product-card-overlay { position: absolute; inset: 0; background: linear-gradient(180deg, transparent 50%, rgba(0,0,0,0.7) 100%); pointer-events: none; }
.ck-root .product-card-tag { position: absolute; left: 8px; bottom: 8px; display: flex; align-items: center; gap: 6px; background: rgba(0,0,0,0.65); backdrop-filter: blur(8px); border: 1px solid var(--border-m); color: #fff; font-family: 'Barlow Condensed', sans-serif; font-size: 10px; letter-spacing: 1.5px; text-transform: uppercase; padding: 3px 8px; border-radius: 2px; font-weight: 500; }
.ck-root .product-card-price { position: absolute; right: 8px; top: 8px; background: var(--yellow); color: #000; font-family: 'Bebas Neue', sans-serif; font-size: 14px; letter-spacing: 1.5px; padding: 3px 8px; border-radius: 2px; }

.ck-root .ruler { position: relative; width: 100%; margin-top: 14px; display: flex; flex-direction: column; align-items: center; }
.ck-root .ruler-bar { position: relative; height: 2px; background: var(--yellow); border-radius: 2px; transition: width .35s ease; }
.ck-root .ruler-bar::before, .ck-root .ruler-bar::after { content: ''; position: absolute; top: -4px; width: 2px; height: 10px; background: var(--yellow); }
.ck-root .ruler-bar::before { left: 0; }
.ck-root .ruler-bar::after { right: 0; }
.ck-root .ruler-label { margin-top: 6px; font-family: 'Barlow Condensed', sans-serif; font-size: 10px; color: var(--yellow); letter-spacing: 2px; text-transform: uppercase; }

.ck-root .finish-options { display: grid; grid-template-columns: repeat(3, 1fr); gap: 4px; }
.ck-root .finish-btn { display: flex; flex-direction: column; align-items: center; gap: 6px; padding: 9px 4px; border: 1px solid var(--border); border-radius: 2px; background: transparent; cursor: pointer; transition: all .15s ease; color: inherit; font-family: inherit; }
.ck-root .finish-btn:hover { border-color: var(--border-m); background: rgba(255,255,255,0.02); }
.ck-root .finish-btn.active { border-color: var(--yellow); background: rgba(255,193,7,0.06); }
.ck-root .finish-swatch { width: 16px; height: 16px; border-radius: 50%; flex-shrink: 0; border: 1px solid rgba(255,255,255,0.18); display: inline-block; }
.ck-root .swatch-satin { background: linear-gradient(135deg, #C8CDD2 0%, #9EA3A8 50%, #D4D8DC 100%); }
.ck-root .swatch-sw { background: linear-gradient(135deg, #7A7E82 0%, #4A4E52 50%, #7C8084 100%); }
.ck-root .swatch-tac { background: linear-gradient(135deg, #2A2E36 0%, #0E1218 50%, #282C34 100%); }
.ck-root .finish-name { font-family: 'Barlow Condensed', sans-serif; font-size: 10px; color: var(--muted); letter-spacing: 1.2px; text-transform: uppercase; line-height: 1; }
.ck-root .finish-btn.active .finish-name { color: var(--yellow); font-weight: 600; }

.ck-root .cta-block { max-width: 560px; margin: 3.5rem auto 0; padding: 2rem 1.5rem; text-align: center; border-top: 1px solid var(--border); border-bottom: 1px solid var(--border); position: relative; }
.ck-root .cta-block::before, .ck-root .cta-block::after { content: ''; position: absolute; left: 50%; transform: translateX(-50%); width: 40px; height: 1px; background: var(--yellow); }
.ck-root .cta-block::before { top: -1px; }
.ck-root .cta-block::after { bottom: -1px; }
.ck-root .total-row { display: flex; align-items: baseline; justify-content: center; gap: 14px; margin-bottom: 18px; }
.ck-root .total-label { font-family: 'Barlow Condensed', sans-serif; font-size: 11px; letter-spacing: 3px; color: var(--muted); text-transform: uppercase; }
.ck-root .total-val { font-family: 'Bebas Neue', sans-serif; font-size: 44px; letter-spacing: 2px; color: var(--yellow); line-height: 1; }
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

.ck-root .ref-section { max-width: 1100px; margin: 4rem auto 0; padding: 0 1.75rem; }
.ck-root .ref-section-head { text-align: center; margin-bottom: 1.75rem; }
.ck-root .ref-section-head h2 { font-family: 'Bebas Neue', sans-serif; font-size: clamp(28px, 4vw, 38px); letter-spacing: 5px; margin: 6px 0 0; }
.ck-root .ref-grid { display: grid; grid-template-columns: 2fr 1fr; gap: 14px; }
.ck-root .ref-card { margin: 0; background: var(--s1); border: 1px solid var(--border); border-radius: 3px; overflow: hidden; transition: border-color .3s; }
.ck-root .ref-card:hover { border-color: rgba(255,193,7,0.2); }
.ck-root .ref-img-wrap { position: relative; width: 100%; background: #000; }
.ck-root .ref-main .ref-img-wrap { aspect-ratio: 16/9; }
.ck-root .ref-side .ref-img-wrap { aspect-ratio: 4/5; }
.ck-root .ref-img-wrap img { position: absolute; inset: 0; width: 100%; height: 100%; object-fit: cover; }
.ck-root .ref-card figcaption { display: flex; align-items: center; justify-content: space-between; padding: 12px 16px; border-top: 1px solid var(--border); }
.ck-root .ref-label { font-family: 'Bebas Neue', sans-serif; font-size: 16px; letter-spacing: 3px; color: var(--text); }
.ck-root .ref-sub { font-family: 'Barlow Condensed', sans-serif; font-size: 10px; letter-spacing: 1.5px; color: var(--muted); text-transform: uppercase; }

.ck-root .ticker { margin-top: 4rem; background: var(--yellow); color: #000; overflow: hidden; padding: 11px 0; }
.ck-root .ticker-track { display: flex; gap: 24px; white-space: nowrap; animation: ck-marquee 32s linear infinite; font-family: 'Bebas Neue', sans-serif; font-size: 16px; letter-spacing: 4px; }
.ck-root .ticker-track span { display: inline-flex; align-items: center; gap: 14px; }
.ck-root .ticker-track i { color: #000; opacity: 0.5; font-style: normal; }
@keyframes ck-marquee { from { transform: translateX(0); } to { transform: translateX(-50%); } }

.ck-root .footer-note { text-align: center; padding: 2rem 1.5rem 4rem; font-size: 11px; color: var(--dim); line-height: 1.9; letter-spacing: 0.5px; }

@media (max-width: 760px) {
  .ck-root .ck-header { padding: 0.85rem 1rem; }
  .ck-root .header-tag { display: none; }
  .ck-root .hero { padding: 2.5rem 1rem 1.5rem; }
  .ck-root .config-grid { grid-template-columns: 1fr; padding: 0 1rem; gap: 14px; }
  .ck-root .product-card { aspect-ratio: 4 / 3; }
  .ck-root .cta-block { padding: 1.5rem 1rem; }
  .ck-root .btn-cta { padding: 14px 32px; font-size: 15px; width: 100%; }
  .ck-root .total-val { font-size: 36px; }
  .ck-root .ref-section { padding: 0 1rem; margin-top: 2.5rem; }
  .ck-root .ref-grid { grid-template-columns: 1fr; }
  .ck-root .ref-main .ref-img-wrap, .ck-root .ref-side .ref-img-wrap { aspect-ratio: 16/10; }
}
`;
