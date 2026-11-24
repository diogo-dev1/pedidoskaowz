/* Classes compartilhadas da landing — mesmo padrão visual da /ofertas
   (tokens --oferta-*, laranja só no preço, botões de 44px). */

export const EASE = 'ease-[cubic-bezier(0.23,1,0.32,1)]';

export const HAIRLINE = 'border-[hsl(var(--oferta-texto)/0.08)]';

/** Tela cheia descontando o header do PublicoLayout (62px no celular, 66px do md para cima). */
export const ALTURA_TELA = 'min-h-[calc(100svh-62px)] md:min-h-[calc(100svh-66px)]';

/** Sai do container do PublicoLayout e ocupa a largura toda (o layout usa overflow-x-clip). */
export const SANGRIA = 'ml-[calc(50%-50vw)] w-screen';

const BOTAO_BASE = `inline-flex h-11 items-center justify-center gap-2 rounded-lg px-5 text-sm font-medium transition-[background-color,border-color,color,transform] duration-150 ${EASE} active:scale-[0.97] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-[hsl(var(--oferta-fundo))] [&_svg]:size-4 [&_svg]:shrink-0`;

/** Ação principal: off-white do ramp com texto escuro (contraste ≈ 19:1). */
export const BOTAO_PRIMARIO = `${BOTAO_BASE} bg-[hsl(var(--oferta-texto))] text-[hsl(var(--oferta-fundo))] hover:bg-[hsl(var(--oferta-detalhe))]`;

/** Ação de card: superfície elevada com hairline. */
export const BOTAO_NEUTRO = `${BOTAO_BASE} border border-[hsl(var(--oferta-texto)/0.1)] bg-[hsl(var(--oferta-superficie))] text-[hsl(var(--oferta-texto))] hover:bg-[hsl(var(--oferta-borda))]`;

/** Ação secundária: só contorno. */
export const BOTAO_CONTORNO = `${BOTAO_BASE} border border-[hsl(var(--oferta-texto)/0.16)] bg-transparent text-[hsl(var(--oferta-texto))] hover:bg-[hsl(var(--oferta-superficie))]`;

/** 0 → "01" (numeração dos passos). */
export const numeroPasso = (i: number) => String(i + 1).padStart(2, '0');

export const CHIP = 'block w-fit max-w-full truncate rounded-md bg-[hsl(var(--oferta-fundo)/0.85)] px-2 py-1 text-xs font-medium leading-4 text-[hsl(var(--oferta-texto))]';
