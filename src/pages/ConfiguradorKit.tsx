import { useEffect, useMemo, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import sizesRef from '@/assets/push-dagger-sizes.jpeg';
import kitCard from '@/assets/push-dagger-kit-card.jpeg';

type FinishKey = 'satin' | 'sw' | 'tac';
type SizeKey = 'standard' | 'compact' | 'micro';

interface Finish {
  key: FinishKey;
  name: string;
  desc: string;
  swatchClass: string;
  catalogName: string; // used to match catalogo_modelos
}

const FINISHES: Finish[] = [
  { key: 'satin', name: 'Acetinada',   desc: 'Reflexo controlado',     swatchClass: 'swatch-satin', catalogName: 'Push Dagger - Sandvik (G10)' },
  { key: 'sw',    name: 'Stone Washed', desc: 'Anti-reflexo tático',    swatchClass: 'swatch-sw',    catalogName: 'Push Dagger - Sandvik SW (G10)' },
  { key: 'tac',   name: 'Tactical',     desc: 'Cerakote Elite Series',  swatchClass: 'swatch-tac',   catalogName: 'Push Dagger - Sandvik Tactical (G10)' },
];

interface SizeDef {
  key: SizeKey;
  name: string;
  bladeMm: number;
  gripMm: number;
  scale: number; // visual scale of card image
}

const SIZES: SizeDef[] = [
  { key: 'standard', name: 'STANDARD', bladeMm: 62.49, gripMm: 87.97, scale: 1.0 },
  { key: 'compact',  name: 'COMPACT',  bladeMm: 52.74, gripMm: 73.84, scale: 0.84 },
  { key: 'micro',    name: 'MICRO',    bladeMm: 37.16, gripMm: 68.51, scale: 0.78 },
];

// Tabela de preços fornecida (R$)
const PRICES: Record<SizeKey, Record<FinishKey, number>> = {
  standard: { satin: 935,  sw: 985, tac: 1090 },
  compact:  { satin: 645,  sw: 665, tac: 755 },
  micro:    { satin: 515,  sw: 535, tac: 625 },
};

const BRL = (n: number) =>
  n.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL', minimumFractionDigits: 0, maximumFractionDigits: 0 });

export default function ConfiguradorKit() {
  const [selections, setSelections] = useState<Record<SizeKey, FinishKey>>({
    standard: 'sw',
    compact: 'sw',
    micro: 'sw',
  });
  const [images, setImages] = useState<Record<FinishKey, string | null>>({ satin: null, sw: null, tac: null });

  useEffect(() => {
    (async () => {
      const names = FINISHES.map((f) => f.catalogName);
      const { data } = await supabase
        .from('catalogo_modelos')
        .select('nome_modelo, imagem_modelo')
        .in('nome_modelo', names);
      if (!data) return;
      const map: Record<FinishKey, string | null> = { satin: null, sw: null, tac: null };
      for (const f of FINISHES) {
        const row = data.find((d: any) => d.nome_modelo === f.catalogName);
        map[f.key] = row?.imagem_modelo ?? null;
      }
      setImages(map);
    })();
  }, []);

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

      <div className="config-grid">
        {SIZES.map((s) => {
          const sel = selections[s.key];
          const f = FINISHES.find((x) => x.key === sel)!;
          const img = images[sel];
          return (
            <div className="col" key={s.key}>
              <div className="col-head">
                <div className="col-model">{s.name}</div>
                <div className="col-dims">
                  {s.bladeMm.toLocaleString('pt-BR', { minimumFractionDigits: 2 })} <span>·</span>{' '}
                  {s.gripMm.toLocaleString('pt-BR', { minimumFractionDigits: 2 })} mm
                </div>
              </div>

              <div className="dagger-stage" style={{ height: `${110 * s.scale + 30}px` }}>
                {img ? (
                  <img
                    src={img}
                    alt={`${s.name} ${f.name}`}
                    style={{ maxHeight: `${110 * s.scale}px`, maxWidth: `${85 * s.scale}%` }}
                  />
                ) : (
                  <div className="img-skel" style={{ height: `${90 * s.scale}px`, width: `${70 * s.scale}%` }} />
                )}
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
                      <div className="finish-info">
                        <div className="finish-name">{finish.name}</div>
                      </div>
                      <div className="finish-price">{BRL(PRICES[s.key][finish.key])}</div>
                    </button>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>

      {/* Referência visual compacta */}
      <section className="size-ref">
        <button className="size-ref-toggle" onClick={() => {
          const el = document.getElementById('size-ref-content');
          if (el) el.classList.toggle('open');
        }}>
          Ver comparativo de tamanhos reais ↓
        </button>
        <div id="size-ref-content" className="size-ref-content">
          <img src={sizesRef} alt="Comparação Standard / Compact / Micro" />
        </div>
      </section>

      <div className="summary">
        <div className="summary-inner">
          <div className="summary-kit">
            {SIZES.map((s) => {
              const f = FINISHES.find((x) => x.key === selections[s.key])!;
              return (
                <div className="kit-pill" key={s.key}>
                  <div className={`kit-pill-swatch ${f.swatchClass}`} />
                  <div className="kit-pill-text">
                    <strong>{s.name.charAt(0) + s.name.slice(1).toLowerCase()}</strong>
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
            <a className="btn-wa" href={`https://wa.me/?text=${waMessage}`} target="_blank" rel="noopener noreferrer">
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

.ck-root .hero { padding: 3rem 2rem 1.5rem; text-align: center; max-width: 680px; margin: 0 auto; }
.ck-root .hero-eyebrow { font-family: 'Barlow Condensed', sans-serif; font-size: 12px; letter-spacing: 3px; color: var(--gold); text-transform: uppercase; margin-bottom: 12px; }
.ck-root .hero-title { font-family: 'Bebas Neue', sans-serif; font-size: clamp(36px, 6vw, 54px); letter-spacing: 4px; line-height: 1.05; margin-bottom: 12px; color: var(--text); }
.ck-root .hero-title span { color: var(--gold); }
.ck-root .hero-desc { font-size: 15px; color: var(--muted); font-weight: 300; line-height: 1.6; max-width: 480px; margin: 0 auto; }

.ck-root .size-ref { padding: 0 2rem; max-width: 1100px; margin: 0 auto 1rem; }
.ck-root .size-ref-inner { background: #0d0d0e; border: 1px solid var(--border); border-radius: 14px; padding: 1rem; text-align: center; }
.ck-root .size-ref-inner img { width: 100%; max-width: 520px; display: block; margin: 0 auto; filter: brightness(1.05) contrast(1.05); border-radius: 8px; }
.ck-root .size-ref-cap { font-family: 'Barlow Condensed', sans-serif; font-size: 12px; color: var(--muted); letter-spacing: 1px; text-transform: uppercase; margin-top: 8px; }

.ck-root .sep { display: flex; align-items: center; gap: 12px; padding: 0 2rem; margin: 2rem auto 1rem; max-width: 1100px; }
.ck-root .sep-line { flex: 1; height: 1px; background: var(--border); }
.ck-root .sep-text { font-family: 'Barlow Condensed', sans-serif; font-size: 11px; letter-spacing: 2px; color: var(--dim); text-transform: uppercase; white-space: nowrap; }

.ck-root .config-grid { display: grid; grid-template-columns: repeat(3, 1fr); max-width: 1100px; margin: 0 auto; gap: 1px; background: var(--border); border: 1px solid var(--border); border-radius: 14px; overflow: hidden; }

.ck-root .col { background: var(--bg); padding: 2rem 1.5rem; display: flex; flex-direction: column; align-items: center; }
.ck-root .col-head { text-align: center; width: 100%; margin-bottom: 1.5rem; }
.ck-root .col-model { font-family: 'Bebas Neue', sans-serif; font-size: 28px; letter-spacing: 4px; color: var(--text); line-height: 1; }
.ck-root .col-dims { font-family: 'Barlow Condensed', sans-serif; font-size: 12px; color: var(--muted); letter-spacing: 1px; margin-top: 4px; }
.ck-root .col-dims span { color: var(--dim); }

.ck-root .dagger-stage { width: 100%; height: 240px; display: flex; align-items: center; justify-content: center; margin-bottom: 1.5rem; background: linear-gradient(180deg, #0d0d0e 0%, #060606 100%); border: 1px solid var(--border); border-radius: 10px; overflow: hidden; }
.ck-root .img-skel { aspect-ratio: 1; background: linear-gradient(90deg, #16161a, #1d1d22, #16161a); border-radius: 6px; }

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

.ck-root .kit-visual { padding: 2.5rem 2rem 1rem; max-width: 1100px; margin: 0 auto; text-align: center; }
.ck-root .kit-visual-eyebrow { font-family: 'Barlow Condensed', sans-serif; font-size: 12px; letter-spacing: 3px; color: var(--gold); text-transform: uppercase; margin-bottom: 14px; }
.ck-root .kit-visual img { width: 100%; max-width: 760px; border: 1px solid var(--border); border-radius: 14px; background: #fff; }

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
  .ck-root .hero { padding: 2rem 1.5rem 1rem; }
  .ck-root .ck-header { padding: 1rem 1.2rem; }
  .ck-root .summary-inner { gap: .6rem; }
  .ck-root .summary-kit { gap: 6px; }
  .ck-root .kit-pill { min-width: 90px; }
  .ck-root .dagger-stage { height: 200px; }
}
`;
