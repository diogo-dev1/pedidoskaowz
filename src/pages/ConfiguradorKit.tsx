import { useMemo, useState } from 'react';

type FinishKey = 'satin' | 'sw' | 'tac';

interface Finish {
  key: FinishKey;
  name: string;
  desc: string;
  price: number;
  swatchClass: string;
  blade: string;
  handle: string;
}

const FINISHES: Finish[] = [
  { key: 'satin', name: 'Acetinado', desc: 'Reflexo controlado', price: 935, swatchClass: 'swatch-satin', blade: '#D0D4D8', handle: '#181A1C' },
  { key: 'sw',    name: 'Stone Washed', desc: 'Anti-reflexo tático', price: 985, swatchClass: 'swatch-sw',    blade: '#8A8E92', handle: '#141618' },
  { key: 'tac',   name: 'Tactical',     desc: 'Cerakote Elite Series', price: 1090, swatchClass: 'swatch-tac', blade: '#2E333C', handle: '#0E1014' },
];

interface ModelDef {
  key: string;
  name: string;
  bladeMm: number;
  gripMm: number;
  scale: number; // 1.0 = standard
}

const MODELS: ModelDef[] = [
  { key: 'standard', name: 'STANDARD', bladeMm: 62.49, gripMm: 87.97, scale: 1.0 },
  { key: 'compact',  name: 'COMPACT',  bladeMm: 52.74, gripMm: 73.84, scale: 0.84 },
  { key: 'micro',    name: 'MICRO',    bladeMm: 37.16, gripMm: 68.51, scale: 0.7 },
];

const BRL = (n: number) =>
  n.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL', minimumFractionDigits: 0, maximumFractionDigits: 0 });

function PushDagger({ blade, handle, scale }: { blade: string; handle: string; scale: number }) {
  // Push dagger T-shape: horizontal grip + vertical double-edged blade pointing down
  const W = 220;
  const H = 160;
  const cx = W / 2;
  // grip
  const gripW = 110 * scale;
  const gripH = 22 * scale;
  const gripY = 44;
  // blade
  const bladeLen = 90 * scale;
  const bladeWMax = 26 * scale;
  const bladeTopY = gripY + gripH;
  const bladeTipY = bladeTopY + bladeLen;
  // bolsters (small caps on grip ends)
  const bolsterW = 10 * scale;

  return (
    <svg viewBox={`0 0 ${W} ${H}`} width="100%" height="100%" preserveAspectRatio="xMidYMid meet">
      <defs>
        <linearGradient id={`bladeG-${blade}`} x1="0" x2="1" y1="0" y2="0">
          <stop offset="0%" stopColor={blade} stopOpacity="0.55" />
          <stop offset="50%" stopColor={blade} stopOpacity="1" />
          <stop offset="100%" stopColor={blade} stopOpacity="0.55" />
        </linearGradient>
        <linearGradient id={`handleG-${handle}`} x1="0" x2="0" y1="0" y2="1">
          <stop offset="0%" stopColor={handle} stopOpacity="1" />
          <stop offset="100%" stopColor="#000" stopOpacity="1" />
        </linearGradient>
      </defs>

      {/* Grip body */}
      <rect
        x={cx - gripW / 2}
        y={gripY}
        width={gripW}
        height={gripH}
        rx={gripH / 2}
        fill={`url(#handleG-${handle})`}
        stroke="rgba(255,255,255,0.05)"
        strokeWidth="0.5"
      />
      {/* Bolsters */}
      <rect x={cx - gripW / 2 - bolsterW / 2} y={gripY - 2} width={bolsterW} height={gripH + 4} rx="2" fill="#1f1f22" stroke="rgba(255,255,255,0.07)" strokeWidth="0.5" />
      <rect x={cx + gripW / 2 - bolsterW / 2} y={gripY - 2} width={bolsterW} height={gripH + 4} rx="2" fill="#1f1f22" stroke="rgba(255,255,255,0.07)" strokeWidth="0.5" />

      {/* Guard plate connecting grip to blade */}
      <rect x={cx - bladeWMax * 1.4} y={bladeTopY - 2} width={bladeWMax * 2.8} height="4" rx="1" fill="#2a2a2d" />

      {/* Blade — symmetric double-edged spear point */}
      <polygon
        points={`
          ${cx - bladeWMax / 2},${bladeTopY}
          ${cx + bladeWMax / 2},${bladeTopY}
          ${cx + bladeWMax / 2},${bladeTopY + bladeLen * 0.55}
          ${cx},${bladeTipY}
          ${cx - bladeWMax / 2},${bladeTopY + bladeLen * 0.55}
        `}
        fill={`url(#bladeG-${blade})`}
        stroke="rgba(0,0,0,0.4)"
        strokeWidth="0.5"
      />
      {/* Center fuller line */}
      <line
        x1={cx}
        y1={bladeTopY + 3}
        x2={cx}
        y2={bladeTipY - 4}
        stroke="rgba(0,0,0,0.35)"
        strokeWidth="0.7"
      />
      {/* Highlight */}
      <line
        x1={cx - bladeWMax / 4}
        y1={bladeTopY + 4}
        x2={cx - bladeWMax / 4}
        y2={bladeTopY + bladeLen * 0.5}
        stroke="rgba(255,255,255,0.18)"
        strokeWidth="0.6"
      />
    </svg>
  );
}

export default function ConfiguradorKit() {
  const [selections, setSelections] = useState<Record<string, FinishKey>>({
    standard: 'satin',
    compact: 'satin',
    micro: 'satin',
  });

  const total = useMemo(
    () =>
      MODELS.reduce((sum, m) => {
        const f = FINISHES.find((x) => x.key === selections[m.key])!;
        return sum + f.price;
      }, 0),
    [selections],
  );

  const waMessage = useMemo(() => {
    const lines = MODELS.map((m) => {
      const f = FINISHES.find((x) => x.key === selections[m.key])!;
      return `• ${m.name} — ${f.name} (${BRL(f.price)})`;
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

      <div className="sep">
        <div className="sep-line" />
        <div className="sep-text">Selecione o acabamento de cada modelo</div>
        <div className="sep-line" />
      </div>

      <div className="config-grid">
        {MODELS.map((m) => {
          const sel = selections[m.key];
          const f = FINISHES.find((x) => x.key === sel)!;
          return (
            <div className="col" key={m.key}>
              <div className="col-head">
                <div className="col-model">{m.name}</div>
                <div className="col-dims">
                  Lâmina {m.bladeMm.toLocaleString('pt-BR', { minimumFractionDigits: 2 })} mm{' '}
                  <span>·</span> Empunhadura {m.gripMm.toLocaleString('pt-BR', { minimumFractionDigits: 2 })} mm
                </div>
              </div>

              <div className="dagger-stage">
                <PushDagger blade={f.blade} handle={f.handle} scale={m.scale} />
              </div>

              <div className="finish-label">Acabamento</div>
              <div className="finish-options">
                {FINISHES.map((finish) => {
                  const active = sel === finish.key;
                  return (
                    <button
                      key={finish.key}
                      type="button"
                      className={`finish-btn ${active ? 'active' : ''}`}
                      onClick={() => setSelections((s) => ({ ...s, [m.key]: finish.key }))}
                    >
                      <div className={`finish-swatch ${finish.swatchClass}`} />
                      <div className="finish-info">
                        <div className="finish-name">{finish.name}</div>
                        <div className="finish-desc">{finish.desc}</div>
                      </div>
                      <div className="finish-price">{BRL(finish.price)}</div>
                      <div className="check">
                        <div className="check-dot" />
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>

      <div className="summary">
        <div className="summary-inner">
          <div className="summary-kit">
            {MODELS.map((m) => {
              const f = FINISHES.find((x) => x.key === selections[m.key])!;
              return (
                <div className="kit-pill" key={m.key}>
                  <div className={`kit-pill-swatch ${f.swatchClass}`} />
                  <div className="kit-pill-text">
                    <strong>{m.name.charAt(0) + m.name.slice(1).toLowerCase()}</strong>
                    {f.name}
                  </div>
                </div>
              );
            })}
          </div>
          <div className="summary-total">
            <div className="total-label">Total do Kit</div>
            <div className="total-val">{BRL(total)}</div>
          </div>
          <div className="summary-cta">
            <a
              className="btn-wa"
              href={`https://wa.me/?text=${waMessage}`}
              target="_blank"
              rel="noopener noreferrer"
            >
              <svg viewBox="0 0 24 24" fill="currentColor">
                <path d="M20.5 3.5A11.9 11.9 0 0 0 12 0C5.4 0 0 5.4 0 12c0 2.1.6 4.2 1.6 6L0 24l6.2-1.6A11.9 11.9 0 0 0 12 24c6.6 0 12-5.4 12-12 0-3.2-1.2-6.2-3.5-8.5zM12 22c-1.9 0-3.7-.5-5.3-1.5l-.4-.2-3.7 1 1-3.6-.3-.4A9.9 9.9 0 0 1 2 12c0-5.5 4.5-10 10-10s10 4.5 10 10-4.5 10-10 10zm5.5-7.5c-.3-.2-1.8-.9-2-1s-.5-.2-.7.2-.8 1-1 1.2-.4.2-.7 0c-.3-.2-1.3-.5-2.5-1.5-.9-.8-1.5-1.8-1.7-2.1-.2-.3 0-.5.1-.6.1-.1.3-.4.5-.5.1-.2.2-.3.3-.5s0-.4 0-.5-.7-1.7-1-2.3c-.2-.6-.5-.5-.7-.5h-.6c-.2 0-.5.1-.8.4-.3.3-1 1-1 2.5s1.1 2.9 1.2 3.1c.2.2 2.2 3.4 5.4 4.8.8.3 1.4.5 1.8.7.8.2 1.5.2 2 .1.6-.1 1.8-.7 2-1.4.2-.7.2-1.3.2-1.4-.1-.1-.3-.2-.6-.4z" />
              </svg>
              Pedir no WhatsApp
            </a>
          </div>
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
  --s3: #222226;
  --border: rgba(255,255,255,0.07);
  --border-m: rgba(255,255,255,0.14);
  --gold: #C9A435;
  --gold-l: #E2BC55;
  --text: #ECEAE4;
  --muted: #777774;
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
  padding: 1.2rem 2rem; border-bottom: 1px solid var(--border);
  background: var(--bg); position: sticky; top: 0; z-index: 40;
}
.ck-root .logo { display: flex; align-items: center; gap: 12px; }
.ck-root .logo-mark { width: 36px; height: 36px; border: 1.5px solid var(--gold); border-radius: 7px; display: flex; align-items: center; justify-content: center; }
.ck-root .logo-mark svg { width: 20px; height: 20px; }
.ck-root .logo-name { font-family: 'Bebas Neue', sans-serif; font-size: 22px; letter-spacing: 3px; color: var(--text); line-height: 1; }
.ck-root .logo-sub { font-size: 11px; color: var(--muted); letter-spacing: 2px; text-transform: uppercase; font-family: 'Barlow Condensed', sans-serif; }
.ck-root .header-tag { font-family: 'Barlow Condensed', sans-serif; font-size: 12px; letter-spacing: 2px; color: var(--muted); text-transform: uppercase; border: 1px solid var(--border); padding: 4px 12px; border-radius: 4px; }

.ck-root .hero { padding: 3rem 2rem 2rem; text-align: center; max-width: 680px; margin: 0 auto; }
.ck-root .hero-eyebrow { font-family: 'Barlow Condensed', sans-serif; font-size: 12px; letter-spacing: 3px; color: var(--gold); text-transform: uppercase; margin-bottom: 12px; }
.ck-root .hero-title { font-family: 'Bebas Neue', sans-serif; font-size: clamp(36px, 6vw, 54px); letter-spacing: 4px; line-height: 1.05; margin-bottom: 12px; color: var(--text); }
.ck-root .hero-title span { color: var(--gold); }
.ck-root .hero-desc { font-size: 15px; color: var(--muted); font-weight: 300; line-height: 1.6; max-width: 480px; margin: 0 auto; }

.ck-root .sep { display: flex; align-items: center; gap: 12px; padding: 0 2rem; margin: 2rem auto 1rem; max-width: 1100px; }
.ck-root .sep-line { flex: 1; height: 1px; background: var(--border); }
.ck-root .sep-text { font-family: 'Barlow Condensed', sans-serif; font-size: 11px; letter-spacing: 2px; color: var(--dim); text-transform: uppercase; white-space: nowrap; }

.ck-root .config-grid { display: grid; grid-template-columns: repeat(3, 1fr); max-width: 1100px; margin: 0 auto; gap: 1px; background: var(--border); border: 1px solid var(--border); border-radius: 14px; overflow: hidden; }

.ck-root .col { background: var(--bg); padding: 2rem 1.5rem; display: flex; flex-direction: column; align-items: center; }
.ck-root .col-head { text-align: center; width: 100%; margin-bottom: 1.5rem; }
.ck-root .col-model { font-family: 'Bebas Neue', sans-serif; font-size: 28px; letter-spacing: 4px; color: var(--text); line-height: 1; }
.ck-root .col-dims { font-family: 'Barlow Condensed', sans-serif; font-size: 12px; color: var(--muted); letter-spacing: 1px; margin-top: 4px; }
.ck-root .col-dims span { color: var(--dim); }

.ck-root .dagger-stage { width: 100%; height: 180px; display: flex; align-items: center; justify-content: center; margin-bottom: 1.5rem; }

.ck-root .finish-label { font-family: 'Barlow Condensed', sans-serif; font-size: 10px; letter-spacing: 2px; color: var(--dim); text-transform: uppercase; width: 100%; margin-bottom: 8px; text-align: left; }
.ck-root .finish-options { display: flex; flex-direction: column; gap: 6px; width: 100%; }
.ck-root .finish-btn { display: flex; align-items: center; gap: 10px; padding: 10px 12px; border: 1px solid var(--border); border-radius: 8px; background: var(--s1); cursor: pointer; transition: all .2s ease; text-align: left; width: 100%; color: inherit; font-family: inherit; }
.ck-root .finish-btn:hover { border-color: var(--border-m); background: var(--s2); }
.ck-root .finish-btn.active { border-color: var(--gold); background: var(--s2); }
.ck-root .finish-swatch { width: 28px; height: 28px; border-radius: 5px; flex-shrink: 0; border: 1px solid rgba(255,255,255,0.1); }
.ck-root .swatch-satin { background: linear-gradient(135deg, #C8CDD2 0%, #9EA3A8 40%, #D4D8DC 60%, #A8ADB2 100%); }
.ck-root .swatch-sw { background: linear-gradient(135deg, #7A7E82 0%, #606468 50%, #7C8084 100%); }
.ck-root .swatch-tac { background: linear-gradient(135deg, #2A2E36 0%, #1A1E26 50%, #282C34 100%); }
.ck-root .finish-info { flex: 1; min-width: 0; }
.ck-root .finish-name { font-size: 13px; font-weight: 500; color: var(--text); line-height: 1.2; }
.ck-root .finish-desc { font-size: 11px; color: var(--muted); line-height: 1.2; margin-top: 2px; }
.ck-root .finish-price { font-family: 'Barlow Condensed', sans-serif; font-size: 14px; color: var(--gold); font-weight: 600; white-space: nowrap; }
.ck-root .finish-btn.active .finish-price { color: var(--gold-l); }
.ck-root .check { width: 16px; height: 16px; border-radius: 50%; border: 1.5px solid var(--dim); flex-shrink: 0; display: flex; align-items: center; justify-content: center; transition: all .2s; }
.ck-root .finish-btn.active .check { background: var(--gold); border-color: var(--gold); }
.ck-root .check-dot { width: 7px; height: 7px; border-radius: 50%; background: var(--bg); opacity: 0; transition: opacity .2s; }
.ck-root .finish-btn.active .check-dot { opacity: 1; }

.ck-root .summary { position: sticky; bottom: 0; z-index: 30; background: rgba(9,9,9,0.95); backdrop-filter: blur(12px); border-top: 1px solid var(--border-m); padding: 1rem 2rem; margin-top: 2rem; }
.ck-root .summary-inner { display: flex; align-items: center; gap: 1rem; max-width: 1100px; margin: 0 auto; flex-wrap: wrap; }
.ck-root .summary-kit { display: flex; gap: 8px; flex: 1; flex-wrap: wrap; }
.ck-root .kit-pill { display: flex; align-items: center; gap: 6px; background: var(--s2); border: 1px solid var(--border); border-radius: 6px; padding: 6px 10px; min-width: 120px; }
.ck-root .kit-pill-swatch { width: 10px; height: 10px; border-radius: 2px; flex-shrink: 0; }
.ck-root .kit-pill-text { font-family: 'Barlow Condensed', sans-serif; font-size: 12px; color: var(--muted); line-height: 1.2; }
.ck-root .kit-pill-text strong { display: block; font-size: 13px; color: var(--text); font-weight: 500; }
.ck-root .summary-total { text-align: right; flex-shrink: 0; }
.ck-root .total-label { font-family: 'Barlow Condensed', sans-serif; font-size: 10px; letter-spacing: 2px; color: var(--muted); text-transform: uppercase; }
.ck-root .total-val { font-family: 'Bebas Neue', sans-serif; font-size: 30px; letter-spacing: 2px; color: var(--gold-l); line-height: 1; }
.ck-root .btn-wa { display: inline-flex; align-items: center; gap: 8px; background: var(--gold); color: #000; border: none; border-radius: 8px; padding: 11px 18px; font-family: 'Barlow Condensed', sans-serif; font-size: 14px; font-weight: 600; letter-spacing: 1px; cursor: pointer; text-transform: uppercase; transition: all .2s; text-decoration: none; white-space: nowrap; }
.ck-root .btn-wa:hover { background: var(--gold-l); }
.ck-root .btn-wa svg { width: 16px; height: 16px; flex-shrink: 0; }

.ck-root .footer-note { text-align: center; padding: 1.5rem 2rem 4rem; font-size: 12px; color: var(--dim); line-height: 1.8; }

@media (max-width: 700px) {
  .ck-root .config-grid { grid-template-columns: 1fr; border-radius: 10px; }
  .ck-root .hero { padding: 2rem 1.5rem 1.5rem; }
  .ck-root .ck-header { padding: 1rem 1.2rem; }
  .ck-root .summary-inner { gap: .6rem; }
  .ck-root .summary-kit { gap: 6px; }
  .ck-root .kit-pill { min-width: 90px; }
}
`;
