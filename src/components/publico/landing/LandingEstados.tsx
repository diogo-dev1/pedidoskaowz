import { Link } from 'react-router-dom';
import { ALTURA_TELA, BOTAO_CONTORNO, BOTAO_PRIMARIO, HAIRLINE, SANGRIA } from './estilo';

/** Esqueleto no formato da página: capa, título e uma fileira de cards. */
export function LandingCarregando() {
  return (
    <div aria-busy="true" aria-label="Carregando página" className="motion-safe:animate-pulse">
      <div className={`relative -mt-6 bg-[hsl(var(--oferta-modal))] ${SANGRIA} ${ALTURA_TELA}`}>
        <div className="absolute inset-x-0 bottom-0 mx-auto max-w-7xl space-y-4 px-4 pb-16 md:px-8">
          <div className="h-4 w-32 rounded bg-[hsl(var(--oferta-superficie))]" />
          <div className="h-14 w-4/5 max-w-2xl rounded bg-[hsl(var(--oferta-superficie))] md:h-20" />
          <div className="h-5 w-2/3 max-w-md rounded bg-[hsl(var(--oferta-superficie))]" />
        </div>
      </div>
      <div className="grid grid-cols-2 gap-3 py-16 md:gap-6 lg:grid-cols-3">
        {[0, 1, 2].map((i) => (
          <div key={i} className={`overflow-hidden rounded-xl border ${HAIRLINE} bg-[hsl(var(--oferta-modal))]`}>
            <div className="aspect-[3/4] bg-[hsl(var(--oferta-superficie))]" />
            <div className="space-y-2 p-3 md:p-5">
              <div className="h-5 w-3/4 rounded bg-[hsl(var(--oferta-superficie))]" />
              <div className="h-6 w-1/2 rounded bg-[hsl(var(--oferta-superficie))]" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

interface IndisponivelProps {
  erro?: boolean;
  onTentarDeNovo?: () => void;
}

/** Slug inexistente, rascunho sem prévia de admin ou falha de rede. */
export function LandingIndisponivel({ erro = false, onTentarDeNovo }: IndisponivelProps) {
  return (
    <div className="mx-auto flex max-w-md flex-col items-center py-24 text-center md:py-32">
      <h1 className="font-bebas text-[44px] leading-none text-[hsl(var(--oferta-texto))] md:text-[56px]">
        {erro ? 'Não deu para carregar' : 'Página indisponível'}
      </h1>
      <p className="mt-4 text-base leading-7 text-[hsl(var(--oferta-detalhe))]">
        {erro
          ? 'A página não respondeu. Confira a conexão e tente de novo.'
          : 'Esta página saiu do ar ou o endereço mudou. As lâminas continuam todas na vitrine.'}
      </p>
      <div className="mt-8 flex flex-col gap-3 sm:flex-row">
        {erro && onTentarDeNovo && (
          <button type="button" className={BOTAO_CONTORNO} onClick={onTentarDeNovo}>
            Tentar de novo
          </button>
        )}
        <Link to="/vitrine" className={BOTAO_PRIMARIO}>
          Ver todas as lâminas
        </Link>
      </div>
    </div>
  );
}
