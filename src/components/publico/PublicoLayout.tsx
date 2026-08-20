import { ReactNode } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Swords } from 'lucide-react';
import { lerToken } from '@/lib/publico';

interface Props {
  children: ReactNode;
  /** Saída sempre visível para quem não quer responder nada. */
  mostrarSaida?: boolean;
}

export function PublicoLayout({ children, mostrarSaida = true }: Props) {
  const token = lerToken();
  const { pathname } = useLocation();

  return (
    <div className="publico min-h-screen w-full max-w-[100vw] overflow-x-hidden bg-zinc-950 text-white">
      <header className="sticky top-0 z-30 border-b border-zinc-800 bg-black/80 backdrop-blur">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-3 px-3 py-3 sm:px-4">
          <Link to="/descubra" className="flex flex-col leading-none">
            <span className="text-[9px] font-semibold uppercase tracking-[0.3em] text-accent">Cutelaria Artesanal</span>
            <span className="text-xl font-black tracking-tight text-white md:text-2xl">
              KAOWZ <span className="text-accent">LÂMINAS</span>
            </span>
          </Link>
          <nav className="flex items-center gap-3 text-[11px] font-semibold uppercase tracking-widest md:text-xs">
            {mostrarSaida && pathname !== '/vitrine' && (
              <Link to="/vitrine" className="text-zinc-400 transition-colors hover:text-accent">
                Ver todas as lâminas
              </Link>
            )}
            {token && (
              <Link
                to={`/arsenal/${token}`}
                className="flex items-center gap-1.5 text-zinc-400 transition-colors hover:text-accent"
              >
                <Swords className="h-3.5 w-3.5" />
                Arsenal
              </Link>
            )}
          </nav>
        </div>
      </header>

      <main className="mx-auto max-w-7xl px-3 pb-20 pt-6 sm:px-4">{children}</main>

      <footer className="border-t border-zinc-800/60 px-4 py-6 text-center text-[11px] uppercase tracking-widest text-zinc-600">
        Kaowz · Cutelaria artesanal · Garantia vitalícia
      </footer>
    </div>
  );
}

/** Título padrão da área pública — mesmo peso visual do catálogo. */
export const TituloPublico = ({ children, className = '' }: { children: ReactNode; className?: string }) => (
  <h1 className={`text-2xl font-black leading-tight tracking-tight text-white md:text-4xl ${className}`}>
    {children}
  </h1>
);
