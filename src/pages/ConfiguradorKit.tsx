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
  scale: number;
}

const SIZES: SizeDef[] = [
  { key: 'standard', name: 'STANDARD', bladeMm: 62.49, gripMm: 87.97, scale: 1.0 },
  { key: 'compact',  name: 'COMPACT',  bladeMm: 52.74, gripMm: 73.84, scale: 0.88 },
  { key: 'micro',    name: 'MICRO',    bladeMm: 37.16, gripMm: 68.51, scale: 0.78 },
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
            <svg viewBox="0 0 24 24" fill="none" stroke="#C9A435" strokeWidth="2">
              <path d="M4 20 L12 4 L20 20 Z" />
            </svg>
          </div>
          <div>
            <div className="logo-name">KAOWZ</div>
            <div className="logo-sub">Facas</div>
          </div>
        </div>
        <div className="header-tag">Configurador de Kit</div>
      </header>

      <section className="hero">
        <div className="hero-eyebrow">Push Daggers Collector Kit</div>
        <h1 className="hero-title">
          Monte seu <span>Kit Exclusivo</span>
        </h1>
        <p className="hero-desc">
          Escolha o acabamento de cada tamanho e visualize seu kit completo antes de confirmar o pedido.
        </p>
      </section>

      {/* Referência visual do kit + tamanhos — sempre visível, minimal */}
      <section className="ref-row">
        <figure className="ref-card">
          <img src={kitCard} alt="Kit Push Dagger completo" />
          <figcaption>Kit Completo</figcaption>
        </figure>
        <figure className="ref-card">
          <img src={sizesRef} alt="Comparativo de tamanhos Standard, Compact e Micro" />
          <figcaption>Tamanhos Reais</figcaption>
        </figure>
      </section>

      <div className="config-grid">
        {SIZES.map((s) => {
          const sel = selections[s.key];
          const f = FINISHES.find((x) => x.key === sel)!;
          return (
            <article className="col" key={s.key}>
              <div className="col-head">
                <div className="col-model">{s.name}</div>
                <div className="col-dims">
                  Lâmina {s.bladeMm.toLocaleString('pt-BR', { minimumFractionDigits: 2 })} mm
                  <span>·</span>
                  Cabo {s.gripMm.toLocaleString('pt-BR', { minimumFractionDigits: 2 })} mm
                </div>
              </div>

              <div
                className="product-card"
                style={{ aspectRatio: `1 / ${s.scale * 1.1}` }}
              >
                <img src={f.image} alt={`${s.name} ${f.name}`} />
                <div className="product-card-tag">{f.name}</div>
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
                    >
                      <div className={`finish-swatch ${finish.swatchClass}`} />
                      <div className="finish-name">{finish.name}</div>
                      <div className="finish-price">{BRL(PRICES[s.key][finish.key])}</div>
                    </button>
                  );
                })}
              </div>
            </article>
          );
        })}
      </div>

      <div className="summary">
        <div className="summary-inner">
          <div className="summary-total">
            <div className="total-label">Total do Kit</div>
            <div className="total-val">{BRL(total)}</div>
          </div>
          <a className="btn-wa" href={`https://wa.me/?text=${waMessage}`} target="_blank" rel="noopener noreferrer">
            <svg viewBox="0 0 24 24" fill="currentColor">
              <path d="M20.5 3.5A11.9 11.9 0 0 0 12 0C5.4 0 0 5.4 0 12c0 2.1.6 4.2 1.6 6L0 24l6.2-1.6A11.9 11.9 0 0 0 12 24c6.6 0 12-5.4 12-12 0-3.2-1.2-6.2-3.5-8.5zM12 22c-1.9 0-3.7-.5-5.3-1.5l-.4-.2-3.7 1 1-3.6-.3-.4A9.9 9.9 0 0 1 2 12c0-5.5 4.5-10 10-10s10 4.5 10 10-4.5 10-10 10zm5.5-7.5c-.3-.2-1.8-.9-2-1s-.5-.2-.7.2-.8 1-1 1.2-.4.2-.7 0c-.3-.2-1.3-.5-2.5-1.5-.9-.8-1.5-1.8-1.7-2.1-.2-.3 0-.5.1-.6.1-.1.3-.4.5-.5.1-.2.2-.3.3-.5s0-.4 0-.5-.7-1.7-1-2.3c-.2-.6-.5-.5-.7-.5h-.6c-.2 0-.5.1-.8.4-.3.3-1 1-1 2.5s1.1 2.9 1.2 3.1c.2.2 2.2 3.4 5.4 4.8.8.3 1.4.5 1.8.7.8.2 1.5.2 2 .1.6-.1 1.8-.7 2-1.4.2-.7.2-1.3.2-1.4-.1-.1-.3-.2-.6-.4z" />
            </svg>
            Pedir no WhatsApp
          </a>
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
  --bg: #090909;
  --s1: #111113;
  --s2: #19191C;
  --border: rgba(255,255,255,0.07);
  --border-m: rgba(255,255,255,0.14);
  --gold: #C9A435;
  --gold-l: #E2BC55;
  --text: #ECEAE4;
  --muted: #888884;
  --dim: #444442;
  background: var(--bg);
  color: var(--text);
  font-family: 'Barlow', sans-serif;
  min-height: 100vh;
  margin: -1.5rem;
}
.ck-root * { box-sizing: border-box; }

.ck-header {
  display: flex; align-items: center; justify-content: space-between;
  padding: 1rem 1.5rem; border-bottom: 1px solid var(--border);
  background: var(--bg); position: sticky; top: 0; z-index: 40;
}
.ck-root .logo { display: flex; align-items: center; gap: 12px; }
.ck-root .logo-mark { width: 34px; height: 34px; border: 1.5px solid var(--gold); border-radius: 7px; display: flex; align-items: center; justify-content: center; }
.ck-root .logo-mark svg { width: 18px; height: 18px; }
.ck-root .logo-name { font-family: 'Bebas Neue', sans-serif; font-size: 20px; letter-spacing: 3px; color: var(--text); line-height: 1; }
.ck-root .logo-sub { font-size: 10px; color: var(--muted); letter-spacing: 2px; text-transform: uppercase; font-family: 'Barlow Condensed', sans-serif; }
.ck-root .header-tag { font-family: 'Barlow Condensed', sans-serif; font-size: 11px; letter-spacing: 2px; color: var(--muted); text-transform: uppercase; border: 1px solid var(--border); padding: 4px 10px; border-radius: 4px; }

.ck-root .hero { padding: 2rem 1.5rem 1rem; text-align: center; max-width: 680px; margin: 0 auto; }
.ck-root .hero-eyebrow { font-family: 'Barlow Condensed', sans-serif; font-size: 11px; letter-spacing: 3px; color: var(--gold); text-transform: uppercase; margin-bottom: 8px; }
.ck-root .hero-title { font-family: 'Bebas Neue', sans-serif; font-size: clamp(28px, 5vw, 44px); letter-spacing: 4px; line-height: 1.05; margin-bottom: 8px; color: var(--text); }
.ck-root .hero-title span { color: var(--gold); }
.ck-root .hero-desc { font-size: 13px; color: var(--muted); font-weight: 300; line-height: 1.6; max-width: 460px; margin: 0 auto; }

.ck-root .ref-row { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; max-width: 680px; margin: 1.5rem auto 0; padding: 0 1.5rem; }
.ck-root .ref-card { margin: 0; background: var(--s1); border: 1px solid var(--border); border-radius: 10px; overflow: hidden; }
.ck-root .ref-card img { width: 100%; height: 140px; object-fit: cover; display: block; }
.ck-root .ref-card figcaption { font-family: 'Barlow Condensed', sans-serif; font-size: 10px; letter-spacing: 2px; color: var(--muted); text-transform: uppercase; text-align: center; padding: 8px; border-top: 1px solid var(--border); }

.ck-root .config-grid { display: grid; grid-template-columns: repeat(3, 1fr); max-width: 980px; margin: 1.5rem auto 0; gap: 12px; padding: 0 1.5rem; }
.ck-root .col { background: var(--s1); border: 1px solid var(--border); border-radius: 12px; padding: 1rem; display: flex; flex-direction: column; gap: 0.85rem; }
.ck-root .col-head { text-align: center; }
.ck-root .col-model { font-family: 'Bebas Neue', sans-serif; font-size: 22px; letter-spacing: 4px; color: var(--text); line-height: 1; }
.ck-root .col-dims { font-family: 'Barlow Condensed', sans-serif; font-size: 10px; color: var(--muted); letter-spacing: 1px; margin-top: 4px; text-transform: uppercase; }
.ck-root .col-dims span { color: var(--dim); margin: 0 4px; }

.ck-root .product-card { position: relative; width: 100%; background: var(--s2); border: 1px solid var(--border); border-radius: 10px; overflow: hidden; }
.ck-root .product-card img { position: absolute; inset: 0; width: 100%; height: 100%; object-fit: cover; transition: transform .35s ease; }
.ck-root .col:hover .product-card img { transform: scale(1.04); }
.ck-root .product-card-tag { position: absolute; left: 8px; bottom: 8px; background: rgba(0,0,0,0.65); backdrop-filter: blur(4px); color: var(--text); font-family: 'Barlow Condensed', sans-serif; font-size: 10px; letter-spacing: 1.5px; text-transform: uppercase; padding: 3px 8px; border-radius: 4px; border: 1px solid var(--border-m); }

.ck-root .finish-options { display: flex; flex-direction: column; gap: 4px; }
.ck-root .finish-btn { display: flex; align-items: center; gap: 8px; padding: 8px 10px; border: 1px solid var(--border); border-radius: 6px; background: transparent; cursor: pointer; transition: all .15s ease; text-align: left; width: 100%; color: inherit; font-family: inherit; }
.ck-root .finish-btn:hover { border-color: var(--border-m); }
.ck-root .finish-btn.active { border-color: var(--gold); background: rgba(201,164,53,0.06); }
.ck-root .finish-swatch { width: 16px; height: 16px; border-radius: 4px; flex-shrink: 0; border: 1px solid rgba(255,255,255,0.1); }
.ck-root .swatch-satin { background: linear-gradient(135deg, #C8CDD2 0%, #9EA3A8 40%, #D4D8DC 60%, #A8ADB2 100%); }
.ck-root .swatch-sw { background: linear-gradient(135deg, #7A7E82 0%, #606468 50%, #7C8084 100%); }
.ck-root .swatch-tac { background: linear-gradient(135deg, #2A2E36 0%, #1A1E26 50%, #282C34 100%); }
.ck-root .finish-name { flex: 1; font-size: 12px; color: var(--text); line-height: 1.2; }
.ck-root .finish-price { font-family: 'Barlow Condensed', sans-serif; font-size: 13px; color: var(--muted); font-weight: 500; white-space: nowrap; }
.ck-root .finish-btn.active .finish-price { color: var(--gold-l); font-weight: 600; }

.ck-root .summary { position: sticky; bottom: 0; z-index: 30; background: rgba(9,9,9,0.95); backdrop-filter: blur(12px); border-top: 1px solid var(--border-m); padding: 0.85rem 1.5rem; margin-top: 1.5rem; }
.ck-root .summary-inner { display: flex; align-items: center; gap: 1rem; max-width: 980px; margin: 0 auto; }
.ck-root .summary-total { flex: 1; }
.ck-root .total-label { font-family: 'Barlow Condensed', sans-serif; font-size: 10px; letter-spacing: 2px; color: var(--muted); text-transform: uppercase; }
.ck-root .total-val { font-family: 'Bebas Neue', sans-serif; font-size: 30px; letter-spacing: 2px; color: var(--gold-l); line-height: 1; }
.ck-root .btn-wa { display: inline-flex; align-items: center; gap: 8px; background: var(--gold); color: #000; border: none; border-radius: 8px; padding: 11px 20px; font-family: 'Barlow Condensed', sans-serif; font-size: 14px; font-weight: 600; letter-spacing: 1px; cursor: pointer; text-transform: uppercase; transition: all .2s; text-decoration: none; white-space: nowrap; }
.ck-root .btn-wa:hover { background: var(--gold-l); }
.ck-root .btn-wa svg { width: 16px; height: 16px; flex-shrink: 0; }

.ck-root .footer-note { text-align: center; padding: 1.5rem 1.5rem 4rem; font-size: 11px; color: var(--dim); line-height: 1.8; }

@media (max-width: 760px) {
  .ck-root .config-grid { grid-template-columns: 1fr; }
  .ck-root .ref-card img { height: 120px; }
  .ck-root .product-card { aspect-ratio: 4 / 3 !important; }
  .ck-root .ck-header { padding: 0.85rem 1rem; }
  .ck-root .hero { padding: 1.5rem 1rem 0.5rem; }
  .ck-root .ref-row, .ck-root .config-grid { padding: 0 1rem; }
  .ck-root .summary { padding: 0.75rem 1rem; }
  .ck-root .total-val { font-size: 26px; }
  .ck-root .btn-wa { padding: 10px 14px; font-size: 13px; }
}
`;
