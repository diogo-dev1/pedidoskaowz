import { cn } from '@/lib/utils';

/**
 * Martelo batendo numa peça em brasa, presa pela tenaz sobre a bigorna.
 * No impacto: clarão, brasa mais viva, tranco na bigorna e faíscas em rastro.
 *
 * Só SVG + CSS (keyframes "forja-*" em src/index.css), animando apenas transform e opacity.
 * As cores vêm dos tokens (foreground, primary, warning) — funciona no tema escuro do login.
 * Com "reduzir movimento" ligado no sistema, fica parado no quadro do impacto.
 */

/** Onde a face do martelo encontra a peça (coordenadas do viewBox). */
const IMPACTO = { x: 110, y: 67 };

/** Faíscas fixas: deslocamento final e tamanho do rastro. Sem aleatório (mesmo desenho sempre). */
const FAISCAS = [
  { dx: -52, dy: -30, len: 5, atraso: 0 },
  { dx: -38, dy: -44, len: 4, atraso: 25 },
  { dx: -24, dy: -22, len: 6, atraso: 10 },
  { dx: -12, dy: -48, len: 3.5, atraso: 40 },
  { dx: -62, dy: -12, len: 3, atraso: 55 },
  { dx: 6, dy: -40, len: 4.5, atraso: 15 },
  { dx: 20, dy: -52, len: 3, atraso: 35 },
  { dx: 30, dy: -26, len: 6, atraso: 5 },
  { dx: 46, dy: -40, len: 4, atraso: 30 },
  { dx: 58, dy: -16, len: 5, atraso: 45 },
  { dx: 68, dy: -32, len: 3, atraso: 60 },
  { dx: -70, dy: -36, len: 3, atraso: 50 },
  { dx: 14, dy: -20, len: 5, atraso: 20 },
  { dx: -4, dy: -30, len: 4, atraso: 65 },
];

/** Graus do rastro: aponta na direção em que a faísca voa. */
const angulo = (dx: number, dy: number) => (Math.atan2(dy, dx) * 180) / Math.PI;

const TRACO = 'hsl(var(--foreground) / 0.55)';
const ACO = 'hsl(var(--foreground) / 0.14)';
const ACO_CLARO = 'hsl(var(--foreground) / 0.32)';
const MADEIRA = 'hsl(var(--primary) / 0.28)';

export function ForjaAnimada({ className }: { className?: string }) {
  return (
    // viewBox começa em y=-14 para caber o martelo no alto do movimento sem invadir o texto de cima.
    <svg viewBox="0 -14 200 126" aria-hidden className={cn('forja overflow-visible', className)}>
      <defs>
        {/* Calor da peça: centro amarelado, pontas alaranjadas */}
        <linearGradient id="forja-calor" x1="0" x2="1" y1="0" y2="0">
          <stop offset="0%" stopColor="hsl(var(--primary))" />
          <stop offset="55%" stopColor="hsl(var(--warning))" />
          <stop offset="100%" stopColor="hsl(var(--primary))" />
        </linearGradient>
      </defs>

      {/* ── Bigorna (dá um tranco de 1px no impacto) ── */}
      <g className="forja-bigorna">
        <path
          d="M26 75 C38 72.5 50 72 62 72 H156 V80 H148 C142 84 136 88 132 94 H138 L150 104 V108 H66 V104 L78 94 H84 C80 88 74 84 70 80 H62 C50 80 38 78 26 75 Z"
          fill={ACO}
          stroke={TRACO}
          strokeWidth="1"
          strokeLinejoin="round"
        />
        {/* Brilho da face de trabalho */}
        <line x1="64" y1="72.9" x2="154" y2="72.9" stroke={ACO_CLARO} strokeWidth="0.8" />
        {/* Furo de ferramenta (hardy hole) */}
        <rect x="143" y="74.5" width="5" height="3" rx="0.5" fill="hsl(var(--background))" />
        {/* Sombra da cintura */}
        <path d="M84 94 H132" stroke={TRACO} strokeWidth="0.6" opacity="0.6" />
      </g>

      {/* ── Reflexo da brasa na face da bigorna ── */}
      <ellipse className="forja-reflexo" cx="106" cy="72.5" rx="30" ry="2.5" fill="hsl(var(--primary))" />

      {/* ── Tenaz segurando a peça ── */}
      <g stroke={TRACO} strokeWidth="1.6" strokeLinecap="round" fill="none">
        <path d="M84 68.6 L52 60 L20 58" />
        <path d="M84 71.2 L52 65 L20 66" />
      </g>
      <circle cx="56" cy="62.4" r="1.4" fill={TRACO} />

      {/* ── Peça em brasa ── */}
      <ellipse className="forja-halo" cx="108" cy="70.3" rx="32" ry="5" fill="hsl(var(--primary))" />
      <path d="M82 68.5 H126 L135 70.3 L126 72 H82 Z" fill="url(#forja-calor)" />
      <path className="forja-brasa" d="M92 69.6 H122 L127 70.3 L122 71 H92 Z" fill="hsl(var(--warning))" />

      {/* ── Martelo: gira em torno da mão, no fim do cabo ── */}
      <g className="forja-martelo">
        {/* Cabo de madeira, afinando até a cabeça */}
        <path
          d="M117 55.4 L181 45 C183.5 44.7 184.6 46.6 184.4 47.6 C184.2 48.7 183.4 49.6 181.4 49.8 L117 59.6 Z"
          fill={MADEIRA}
          stroke={TRACO}
          strokeWidth="0.9"
          strokeLinejoin="round"
        />
        {/* Veio da madeira */}
        <path d="M128 56.4 L170 49.4" stroke="hsl(var(--primary) / 0.5)" strokeWidth="0.5" />
        {/* Cunha no olho do martelo */}
        <rect x="115.6" y="54.6" width="3" height="5.6" rx="0.6" fill={ACO_CLARO} stroke={TRACO} strokeWidth="0.6" />

        {/* Cabeça: pena em cima, corpo, face alargada embaixo */}
        <path d="M104.5 52 L106.5 45.5 H113.5 L115.5 52 Z" fill={ACO} stroke={TRACO} strokeWidth="1" strokeLinejoin="round" />
        <path d="M103 52 H117 V63.5 L119.5 67 H100.5 L103 63.5 Z" fill={ACO} stroke={TRACO} strokeWidth="1" strokeLinejoin="round" />
        {/* Luz na lateral e na borda da face */}
        <line x1="106" y1="53.5" x2="106" y2="62.5" stroke={ACO_CLARO} strokeWidth="1.2" strokeLinecap="round" />
        <line x1="101.5" y1="66.3" x2="118.5" y2="66.3" stroke="hsl(var(--foreground) / 0.7)" strokeWidth="0.7" />
      </g>

      {/* ── Clarão do impacto ── */}
      <circle className="forja-clarao" cx={IMPACTO.x} cy={IMPACTO.y} r="9" fill="hsl(var(--warning))" />

      {/* ── Faíscas: o grupo voa (CSS), o traço interno aponta na direção do voo ── */}
      {FAISCAS.map((f, i) => (
        <g
          key={i}
          className="forja-faisca"
          style={
            {
              '--dx': `${f.dx}px`,
              '--dy': `${f.dy}px`,
              animationDelay: `${f.atraso}ms`,
            } as React.CSSProperties
          }
        >
          <line
            x1={IMPACTO.x - f.len}
            y1={IMPACTO.y}
            x2={IMPACTO.x}
            y2={IMPACTO.y}
            transform={`rotate(${angulo(f.dx, f.dy)} ${IMPACTO.x} ${IMPACTO.y})`}
            stroke={i % 3 === 0 ? 'hsl(var(--warning))' : 'hsl(var(--primary))'}
            strokeWidth="1.1"
            strokeLinecap="round"
          />
        </g>
      ))}
    </svg>
  );
}
