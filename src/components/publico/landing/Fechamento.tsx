import { forwardRef } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, MessageCircle } from 'lucide-react';
import { BOTAO_CONTORNO, BOTAO_PRIMARIO, HAIRLINE } from './estilo';

interface Props {
  linkVendedor: string;
  onQuiz?: () => void;
  onVendedor?: () => void;
}

/** Último bloco: quiz para quem não decidiu, vendedor para quem quer conversar. */
export const Fechamento = forwardRef<HTMLElement, Props>(function Fechamento({ linkVendedor, onQuiz, onVendedor }, ref) {
  return (
    <section ref={ref} id="fechamento" aria-labelledby="titulo-fechamento" className={`border-t ${HAIRLINE} py-20 text-center md:py-28`}>
      <h2 id="titulo-fechamento" className="font-bebas text-[48px] leading-none text-[hsl(var(--oferta-texto))] md:text-[80px]">
        Não sabe qual escolher?
      </h2>
      <p className="mx-auto mt-4 max-w-md text-base leading-7 text-[hsl(var(--oferta-detalhe))]">
        Responda o quiz e veja as lâminas que combinam com o seu dia a dia, ou fale direto com quem faz.
      </p>
      <div className="mt-8 flex flex-col justify-center gap-3 sm:flex-row">
        <Link to="/descubra" className={BOTAO_PRIMARIO} onClick={onQuiz}>
          Fazer o quiz <ArrowRight aria-hidden strokeWidth={1.5} />
        </Link>
        <a href={linkVendedor} target="_blank" rel="noopener noreferrer" className={BOTAO_CONTORNO} onClick={onVendedor}>
          <MessageCircle aria-hidden strokeWidth={1.5} /> Falar com um vendedor
        </a>
      </div>
    </section>
  );
});
