import { useMemo, useState, useEffect } from 'react';

type FinishKey = 'satin' | 'sw' | 'tac';

interface FinishOption {
  key: FinishKey;
  name: string;
  desc: string;
  price: number;
  swatchClass: string;
  bladeColor: string;
  handleColor: string;
}

const FINISHES: FinishOption[] = [
  { key: 'satin', name: 'Acetinado', desc: 'Reflexo controlado', price: 935, swatchClass: 'swatch-satin', bladeColor: '#D0D4D8', handleColor: '#181A1C' },
  { key: 'sw', name: 'Stone Washed', desc: 'Anti-reflexo tático', price: 985, swatchClass: 'swatch-sw', bladeColor: '#8A8E92', handleColor: '#141618' },
  { key: 'tac', name: 'Tactical', desc: 'Cerakote Elite Series', price: 1090, swatchClass: 'swatch-tac', bladeColor: '#2E333C', handleColor: '#0E1014' },
];

interface ModelDef {
  key: 'standard' | 'compact' | 'micro';
  name: string;
  blade: string;
  handle: string;
  scale: number;
}

const MODELS: ModelDef[] = [
  { key: 'standard', name: 'STANDARD', blade: '62,49 mm', handle: '87,97 mm', scale: 1.0 },
  { key: 'compact', name: 'COMPACT', blade: '52,74 mm', handle: '73,84 mm', scale: 0.82 },
  { key: 'micro', name: 'MICRO', blade: '37,16 mm', handle: '68,51 mm', scale: 0.66 },
];

function Dagger({ blade, handle, scale }: { blade: string; handle: string; scale: number }) {
  // Stylized push dagger silhouette: T-shape handle + symmetric blade
  const w = 220;
  const h = 140;
  return (
    <svg width={w * scale} height={h} viewBox={`0 0 ${w} ${h}`} style={{ transition: 'all .4s ease' }}>
      {/* Handle (horizontal T-bar) */}
      <rect x="70" y="58" width="80" height="24" rx="4" fill={handle} stroke="rgba(255,255,255,0.08)" strokeWidth="1" />
      {/* Finger ring opening */}
      <circle cx="110" cy="70" r="6" fill="#000" opacity="0.5" />
      {/* Blade — symmetric dagger tip pointing right */}
      <polygon
        points="150,62 210,68 215,70 210,72 150,78"
        fill={blade}
        stroke="rgba(255,255,255,0.1)"
        strokeWidth="0.5"
      />
      {/* Center fuller line */}
      <line x1="155" y1="70" x2="208" y2="70" stroke="rgba(0,0,0,0.3)" strokeWidth="0.5" />
      {/* Handle grip lines */}
      <line x1="82" y1="62" x2="82" y2="78" stroke="rgba(255,255,255,0.06)" strokeWidth="1" />
      <line x1="92" y1="62" x2="92" y2="78" stroke="rgba(255,255,255,0.06)" strokeWidth="1" />
      <line x1="128" y1="62" x2="128" y2="78" stroke="rgba(255,255,255,0.06)" strokeWidth="1" />
      <line x1="138" y1="62" x2="138" y2="78" stroke="rgba(255,255,255,0.06)" strokeWidth="1" />
    </svg>
  );
}

export default function PushDaggerConfigurador() {
  const [selection, setSelection] = useState<Record<string, FinishKey>>({
    standard: 'satin',
    compact: 'satin',
    micro: 'satin',
  });

  useEffect(() => {
    document.title = 'Configurador de Kit Push Dagger — Kaowz';
  }, []);

  const total = useMemo(
    () =>
      MODELS.reduce((sum, m) => {
        const f = FINISHES.find(x => x.key === selection[m.key])!;
        return sum + f.price;
      }, 0),
    [selection]
  );

  const totalFmt = total.toLocaleString('pt-BR');

  const handleWhats = () => {
    const lines = MODELS.map(m => {
      const f = FINISHES.find(x => x.key === selection[m.key])!;
      return `• ${m.name} — ${f.name} (R$ ${f.price.toLocaleString('pt-BR')})`;
    }).join('\n');
    const msg = `Olá! Quero montar este Kit Push Dagger:\n\n${lines}\n\nTotal: R$ ${totalFmt}`;
    window.open(`https://wa.me/5528999025695?text=${encodeURIComponent(msg)}`, '_blank');
  };

  return (
    <div className="pdc-root">
      <style>{CSS}</style>

      <header>
        <div className="logo">
          <div className="logo-mark">
            <svg viewBox="0 0 24 24" fill="none" stroke="#C9A435" strokeWidth="2">
              <path d="M3 12 L9 6 L21 18 L15 18 L9 12 Z" />
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
        <h1 className="hero-title">Monte seu <span>Kit Exclusivo</span></h1>
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
        {MODELS.map(model => {
          const current = FINISHES.find(f => f.key === selection[model.key])!;
          return (
            <div key={model.key} className="col">
              <div className="col-head">
                <div className="col-model">{model.name}</div>
                <div className="col-dims">
                  Lâmina {model.blade} <span>·</span> Empunhadura {model.handle}
                </div>
              </div>

              <div className="dagger-stage">
                <Dagger blade={current.bladeColor} handle={current.handleColor} scale={model.scale} />
              </div>

              <div className="finish-label">Acabamento</div>
              <div className="finish-options">
                {FINISHES.map(f => {
                  const active = selection[model.key] === f.key;
                  return (
                    <button
                      key={f.key}
                      className={`finish-btn${active ? ' active' : ''}`}
                      onClick={() => setSelection(s => ({ ...s, [model.key]: f.key }))}
                    >
                      <div className={`finish-swatch ${f.swatchClass}`} />
                      <div className="finish-info">
                        <div className="finish-name">{f.name}</div>
                        <div className="finish-desc">{f.desc}</div>
                      </div>
                      <div className="finish-price">R${f.price.toLocaleString('pt-BR')}</div>
                      <div className="check"><div className="check-dot" /></div>
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
            {MODELS.map(m => {
              const f = FINISHES.find(x => x.key === selection[m.key])!;
              return (
                <div key={m.key} className="kit-pill">
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
            <div className="total-val">R$ {totalFmt}</div>
          </div>
          <div className="summary-cta">
            <button onClick={handleWhats} className="btn-wa">
              <svg viewBox="0 0 24 24" fill="currentColor">
                <path d="M17.5 14.4c-.3-.1-1.7-.8-2-.9s-.5-.1-.7.2-.8.9-.9 1.1c-.2.2-.3.2-.6.1-1.7-.8-2.8-1.5-3.9-3.4-.3-.5.3-.5.8-1.5.1-.2 0-.3 0-.5s-.7-1.7-1-2.3c-.2-.6-.5-.5-.7-.5s-.4 0-.6 0a1.2 1.2 0 0 0-.8.4c-.3.3-1.1 1.1-1.1 2.6s1.1 3 1.3 3.2 2.2 3.3 5.3 4.7c2 .8 2.7.9 3.7.7.6-.1 1.7-.7 2-1.4.2-.7.2-1.3.2-1.4 0-.1-.2-.2-.5-.3z" />
                <path d="M12 2a10 10 0 0 0-8.5 15.2L2 22l4.9-1.3A10 10 0 1 0 12 2zm0 18.3a8.3 8.3 0 0 1-4.2-1.1l-.3-.2-3 .8.8-2.9-.2-.3A8.3 8.3 0 1 1 12 20.3z" />
              </svg>
              Pedir no WhatsApp
            </button>
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

const CSS = `
.pdc-root {
  --bg: #090909; --s1: #111113; --s2: #19191C; --s3: #222226;
  --border: rgba(255,255,255,0.07); --border-m: rgba(255,255,255,0.14);
  --gold: #C9A435; --gold-l: #E2BC55;
  --text: #ECEAE4; --muted: #777774; --dim: #444442;
  background: var(--bg); color: var(--text);
  font-family: 'Barlow', system-ui, sans-serif;
  min-height: 100vh; overflow-x: hidden;
}
.pdc-root * { box-sizing: border-box; }
.pdc-root header { display:flex; align-items:center; justify-content:space-between; padding:1.2rem 2rem; border-bottom:1px solid var(--border); background:var(--bg); position:sticky; top:0; z-index:100; }
.pdc-root .logo { display:flex; align-items:center; gap:12px; }
.pdc-root .logo-mark { width:36px; height:36px; border:1.5px solid var(--gold); border-radius:7px; display:flex; align-items:center; justify-content:center; }
.pdc-root .logo-mark svg { width:20px; height:20px; }
.pdc-root .logo-name { font-family:'Bebas Neue',sans-serif; font-size:22px; letter-spacing:3px; color:var(--text); }
.pdc-root .logo-sub { font-size:11px; color:var(--muted); letter-spacing:2px; text-transform:uppercase; font-family:'Barlow Condensed',sans-serif; }
.pdc-root .header-tag { font-family:'Barlow Condensed',sans-serif; font-size:12px; letter-spacing:2px; color:var(--muted); text-transform:uppercase; border:1px solid var(--border); padding:4px 12px; border-radius:4px; }
.pdc-root .hero { padding:3rem 2rem 2rem; text-align:center; max-width:680px; margin:0 auto; }
.pdc-root .hero-eyebrow { font-family:'Barlow Condensed',sans-serif; font-size:12px; letter-spacing:3px; color:var(--gold); text-transform:uppercase; margin-bottom:12px; }
.pdc-root .hero-title { font-family:'Bebas Neue',sans-serif; font-size:clamp(36px,6vw,54px); letter-spacing:4px; line-height:1.05; margin-bottom:12px; }
.pdc-root .hero-title span { color:var(--gold); }
.pdc-root .hero-desc { font-size:15px; color:var(--muted); font-weight:300; line-height:1.6; max-width:480px; margin:0 auto; }
.pdc-root .sep { display:flex; align-items:center; gap:12px; padding:0 2rem; margin:2rem auto 1rem; max-width:1100px; }
.pdc-root .sep-line { flex:1; height:1px; background:var(--border); }
.pdc-root .sep-text { font-family:'Barlow Condensed',sans-serif; font-size:11px; letter-spacing:2px; color:var(--dim); text-transform:uppercase; white-space:nowrap; }
.pdc-root .config-grid { display:grid; grid-template-columns:repeat(3,1fr); max-width:1100px; margin:0 auto; gap:1px; background:var(--border); border:1px solid var(--border); border-radius:14px; overflow:hidden; }
.pdc-root .col { background:var(--bg); padding:2rem 1.5rem; display:flex; flex-direction:column; align-items:center; }
.pdc-root .col-head { text-align:center; width:100%; margin-bottom:1.5rem; }
.pdc-root .col-model { font-family:'Bebas Neue',sans-serif; font-size:28px; letter-spacing:4px; color:var(--text); line-height:1; }
.pdc-root .col-dims { font-family:'Barlow Condensed',sans-serif; font-size:12px; color:var(--muted); letter-spacing:1px; margin-top:4px; }
.pdc-root .col-dims span { color:var(--dim); }
.pdc-root .dagger-stage { width:100%; height:160px; display:flex; align-items:center; justify-content:center; margin-bottom:1.5rem; }
.pdc-root .finish-label { font-family:'Barlow Condensed',sans-serif; font-size:10px; letter-spacing:2px; color:var(--dim); text-transform:uppercase; width:100%; margin-bottom:8px; text-align:left; }
.pdc-root .finish-options { display:flex; flex-direction:column; gap:6px; width:100%; }
.pdc-root .finish-btn { display:flex; align-items:center; gap:10px; padding:10px 12px; border:1px solid var(--border); border-radius:8px; background:var(--s1); cursor:pointer; transition:all .2s ease; text-align:left; width:100%; color:inherit; font-family:inherit; }
.pdc-root .finish-btn:hover { border-color:var(--border-m); background:var(--s2); }
.pdc-root .finish-btn.active { border-color:var(--gold); background:var(--s2); }
.pdc-root .finish-swatch { width:28px; height:28px; border-radius:5px; flex-shrink:0; border:1px solid rgba(255,255,255,0.1); }
.pdc-root .swatch-satin { background:linear-gradient(135deg,#C8CDD2 0%,#9EA3A8 40%,#D4D8DC 60%,#A8ADB2 100%); }
.pdc-root .swatch-sw { background:linear-gradient(135deg,#7A7E82 0%,#606468 50%,#7C8084 100%); }
.pdc-root .swatch-tac { background:linear-gradient(135deg,#2A2E36 0%,#1A1E26 50%,#282C34 100%); }
.pdc-root .finish-info { flex:1; }
.pdc-root .finish-name { font-size:13px; font-weight:500; color:var(--text); line-height:1.2; }
.pdc-root .finish-desc { font-size:11px; color:var(--muted); line-height:1.2; margin-top:2px; }
.pdc-root .finish-price { font-family:'Barlow Condensed',sans-serif; font-size:14px; color:var(--gold); font-weight:600; white-space:nowrap; }
.pdc-root .finish-btn.active .finish-price { color:var(--gold-l); }
.pdc-root .check { width:16px; height:16px; border-radius:50%; border:1.5px solid var(--dim); flex-shrink:0; display:flex; align-items:center; justify-content:center; transition:all .2s; }
.pdc-root .finish-btn.active .check { background:var(--gold); border-color:var(--gold); }
.pdc-root .check-dot { width:7px; height:7px; border-radius:50%; background:var(--bg); opacity:0; transition:opacity .2s; }
.pdc-root .finish-btn.active .check-dot { opacity:1; }
.pdc-root .summary { position:sticky; bottom:0; z-index:50; background:rgba(9,9,9,0.95); backdrop-filter:blur(12px); border-top:1px solid var(--border-m); padding:1rem 2rem; margin-top:2rem; }
.pdc-root .summary-inner { display:flex; align-items:center; gap:1rem; max-width:1100px; margin:0 auto; flex-wrap:wrap; }
.pdc-root .summary-kit { display:flex; gap:8px; flex:1; flex-wrap:wrap; }
.pdc-root .kit-pill { display:flex; align-items:center; gap:6px; background:var(--s2); border:1px solid var(--border); border-radius:6px; padding:6px 10px; min-width:120px; }
.pdc-root .kit-pill-swatch { width:10px; height:10px; border-radius:2px; flex-shrink:0; }
.pdc-root .kit-pill-text { font-family:'Barlow Condensed',sans-serif; font-size:12px; color:var(--muted); line-height:1.2; }
.pdc-root .kit-pill-text strong { display:block; font-size:13px; color:var(--text); font-weight:500; }
.pdc-root .summary-total { text-align:right; flex-shrink:0; }
.pdc-root .total-label { font-family:'Barlow Condensed',sans-serif; font-size:10px; letter-spacing:2px; color:var(--muted); text-transform:uppercase; }
.pdc-root .total-val { font-family:'Bebas Neue',sans-serif; font-size:30px; letter-spacing:2px; color:var(--gold-l); line-height:1; }
.pdc-root .btn-wa { display:flex; align-items:center; gap:8px; background:var(--gold); color:#000; border:none; border-radius:8px; padding:11px 18px; font-family:'Barlow Condensed',sans-serif; font-size:14px; font-weight:600; letter-spacing:1px; cursor:pointer; text-transform:uppercase; transition:all .2s; white-space:nowrap; }
.pdc-root .btn-wa:hover { background:var(--gold-l); }
.pdc-root .btn-wa svg { width:16px; height:16px; flex-shrink:0; }
.pdc-root .footer-note { text-align:center; padding:1.5rem 2rem 4rem; font-size:12px; color:var(--dim); }
@media(max-width:700px) {
  .pdc-root .config-grid { grid-template-columns:1fr; border-radius:10px; }
  .pdc-root .hero { padding:2rem 1.5rem 1.5rem; }
  .pdc-root header { padding:1rem 1.2rem; }
  .pdc-root .summary-inner { gap:.6rem; }
  .pdc-root .summary-kit { gap:6px; }
  .pdc-root .kit-pill { min-width:90px; }
}
`;
