import { useCallback, useEffect, useRef, useState } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';

/**
 * Carrossel das receitas ("Para que você vai usar?").
 * O card da frente fica em foco; os demais ficam menores e desfocados.
 *
 * Rolagem nativa com scroll-snap (a física do navegador, sem gesto em JS).
 * Toque num card lateral → ele vem para a frente. Toque no da frente → escolhe a receita.
 * Estilos no bloco "Carrossel de receitas" do css de src/pages/ConfiguradorKit.tsx (escopo .ck-root).
 */

export interface ItemReceita {
  id: string;
  titulo: string;
  preco: string;
  imagem: string;
  /** A configuração atual bate com esta receita. */
  ativa: boolean;
}

interface Props {
  itens: ItemReceita[];
  onEscolher: (indice: number) => void;
}

const prefereMenosMovimento = () =>
  typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

export function CarrosselReceitas({ itens, onEscolher }: Props) {
  const trilhoRef = useRef<HTMLDivElement>(null);
  const cardsRef = useRef<(HTMLButtonElement | null)[]>([]);
  const [frente, setFrente] = useState(0);

  /** O card da frente é o que está mais perto do centro do trilho. */
  const medirFrente = useCallback(() => {
    const trilho = trilhoRef.current;
    if (!trilho) return;
    const centro = trilho.scrollLeft + trilho.clientWidth / 2;
    let maisPerto = 0;
    let menorDistancia = Infinity;
    cardsRef.current.forEach((card, i) => {
      if (!card) return;
      const distancia = Math.abs(card.offsetLeft + card.offsetWidth / 2 - centro);
      if (distancia < menorDistancia) {
        menorDistancia = distancia;
        maisPerto = i;
      }
    });
    setFrente(maisPerto);
  }, []);

  const centralizar = useCallback((i: number, suave = true) => {
    const trilho = trilhoRef.current;
    const card = cardsRef.current[i];
    if (!trilho || !card) return;
    trilho.scrollTo({
      left: card.offsetLeft + card.offsetWidth / 2 - trilho.clientWidth / 2,
      behavior: suave && !prefereMenosMovimento() ? 'smooth' : 'auto',
    });
  }, []);

  // Acompanha a rolagem (uma medida por quadro) e o redimensionamento.
  useEffect(() => {
    const trilho = trilhoRef.current;
    if (!trilho) return;
    let quadro = 0;
    const aoMover = () => {
      cancelAnimationFrame(quadro);
      quadro = requestAnimationFrame(medirFrente);
    };
    trilho.addEventListener('scroll', aoMover, { passive: true });
    window.addEventListener('resize', aoMover);
    return () => {
      trilho.removeEventListener('scroll', aoMover);
      window.removeEventListener('resize', aoMover);
      cancelAnimationFrame(quadro);
    };
  }, [medirFrente]);

  // Ao abrir, começa pela receita que já bate com a configuração (ou pela primeira).
  useEffect(() => {
    const inicial = Math.max(0, itens.findIndex((it) => it.ativa));
    centralizar(inicial, false);
    medirFrente();
    // Só na montagem: depois disso quem manda é o cliente.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const aoTocar = (i: number) => {
    if (i === frente) onEscolher(i);
    else centralizar(i);
  };

  return (
    <div className="carousel" role="region" aria-roledescription="carrossel" aria-label="Receitas">
      <div ref={trilhoRef} className="carousel-track">
        {itens.map((item, i) => {
          const naFrente = i === frente;
          return (
            <button
              key={item.id}
              ref={(el) => { cardsRef.current[i] = el; }}
              type="button"
              className={`carousel-card ${naFrente ? 'is-front' : ''} ${item.ativa ? 'is-active' : ''}`}
              aria-label={`${item.titulo}, ${item.preco}${naFrente ? ' — escolher' : ''}`}
              aria-pressed={item.ativa}
              onClick={() => aoTocar(i)}
              onFocus={() => centralizar(i)}
            >
              <span className="carousel-img">
                <img src={item.imagem} alt="" loading="lazy" />
              </span>
              <span className="carousel-body">
                <span className="carousel-title">{item.titulo}</span>
                <span className="carousel-price">{item.preco}</span>
              </span>
            </button>
          );
        })}
      </div>

      {/* Setas: só para mouse (no toque o gesto já é natural) */}
      <button
        type="button"
        className="carousel-arrow is-prev"
        onClick={() => centralizar(Math.max(0, frente - 1))}
        disabled={frente === 0}
        aria-label="Receita anterior"
      >
        <ChevronLeft aria-hidden="true" />
      </button>
      <button
        type="button"
        className="carousel-arrow is-next"
        onClick={() => centralizar(Math.min(itens.length - 1, frente + 1))}
        disabled={frente === itens.length - 1}
        aria-label="Próxima receita"
      >
        <ChevronRight aria-hidden="true" />
      </button>

      {/* Posição: um traço por receita, o da frente mais longo */}
      <div className="carousel-dots" aria-hidden="true">
        {itens.map((item, i) => (
          <span key={item.id} className={i === frente ? 'is-front' : ''} />
        ))}
      </div>
    </div>
  );
}
