import { ArrowRight, ArrowUpRight, MessageCircle, Wrench } from 'lucide-react';
import { formatarBRL, type LaminaResolvida } from '@/lib/landingsRegras';
import { CtaLink } from './CtaLink';
import { BOTAO_NEUTRO, CHIP, HAIRLINE } from './estilo';

interface Props {
  lamina: LaminaResolvida;
  /** Card maior (nível Definitiva). */
  grande?: boolean;
  onClique?: (lamina: LaminaResolvida) => void;
}

function IconeCta({ lamina }: { lamina: LaminaResolvida }) {
  if (lamina.cta === 'vendedor') return <MessageCircle aria-hidden strokeWidth={1.5} />;
  if (lamina.cta === 'montar') return <Wrench aria-hidden strokeWidth={1.5} />;
  return lamina.destino.externo ? <ArrowUpRight aria-hidden strokeWidth={1.5} /> : <ArrowRight aria-hidden strokeWidth={1.5} />;
}

export function Preco({ lamina, grande = false }: { lamina: LaminaResolvida; grande?: boolean }) {
  const valor = Number(lamina.modelo.preco_base);
  if (lamina.exibicaoPreco === 'consulta' || !(valor > 0)) {
    return <p className="text-sm leading-6 text-[hsl(var(--oferta-detalhe))]">Valor sob consulta</p>;
  }
  return (
    <p className="tabular-nums">
      {lamina.exibicaoPreco === 'a_partir' && (
        <span className="block text-xs leading-4 text-[hsl(var(--oferta-muted))]">a partir de</span>
      )}
      <span className={`font-semibold text-accent ${grande ? 'text-2xl leading-8 md:text-[28px]' : 'text-lg leading-6 md:text-2xl md:leading-8'}`}>
        {formatarBRL(valor)}
      </span>
    </p>
  );
}

export function LaminaLandingCard({ lamina, grande = false, onClique }: Props) {
  const m = lamina.modelo;
  return (
    <article className={`flex h-full flex-col overflow-hidden rounded-xl border ${HAIRLINE} bg-[hsl(var(--oferta-modal))]`}>
      <div className={`relative overflow-hidden bg-[hsl(var(--oferta-fundo))] ${grande ? 'aspect-[4/5]' : 'aspect-[3/4]'}`}>
        {m.imagem_modelo ? (
          <img src={m.imagem_modelo} alt={m.nome_modelo} loading="lazy" decoding="async" className="h-full w-full object-cover" />
        ) : m.video_url ? (
          <video src={m.video_url} aria-label={`Vídeo de ${m.nome_modelo}`} className="h-full w-full object-cover" muted loop playsInline autoPlay preload="metadata" />
        ) : (
          <div className="flex h-full items-center justify-center text-xs text-[hsl(var(--oferta-muted))]">Sem imagem</div>
        )}
        {lamina.destaque && <span className={`${CHIP} absolute left-2 top-2 md:left-3 md:top-3`}>Destaque</span>}
        {m.pronta_entrega && (
          <span className={`${CHIP} absolute bottom-2 left-2 md:bottom-3 md:left-3`}>Pronta entrega</span>
        )}
      </div>

      <div className={`flex flex-1 flex-col gap-3 ${grande ? 'p-4 md:p-6' : 'p-3 md:p-5'}`}>
        <div className="flex flex-col gap-1">
          <h4 className={`line-clamp-2 font-bebas leading-none text-[hsl(var(--oferta-texto))] ${grande ? 'text-[28px] md:text-[36px]' : 'text-[22px] md:text-[28px]'}`}>
            {m.nome_modelo}
          </h4>
          {lamina.texto && (
            <p className={`text-xs leading-4 text-[hsl(var(--oferta-muted))] md:text-sm md:leading-5 ${grande ? 'line-clamp-4' : 'line-clamp-3'}`}>
              {lamina.texto}
            </p>
          )}
        </div>
        <div className="flex-1">
          <Preco lamina={lamina} grande={grande} />
        </div>
        <CtaLink
          destino={lamina.destino}
          className={`${BOTAO_NEUTRO} h-auto min-h-11 w-full px-3 py-2 text-center text-xs leading-4 md:text-sm md:leading-5`}
          onClique={() => onClique?.(lamina)}
        >
          <IconeCta lamina={lamina} />
          <span>{lamina.ctaLabel}</span>
        </CtaLink>
      </div>
    </article>
  );
}
