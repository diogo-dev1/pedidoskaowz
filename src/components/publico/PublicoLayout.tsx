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
    <div className="publico min-h-screen w-full max-w-[100vw] overflow-x-hidden bg-[hsl(0_0%_5%)] text-[hsl(40_15%_92%)]">
      <header className="sticky top-0 z-30 border-b border-[hsl(0_0%_14%)] bg-[hsl(0_0%_5%/0.92)] backdrop-blur">
        <div className="mx-auto flex max-w-5xl items-center justify-between gap-3 px-4 py-3">
          <Link to="/descubra" className="font-bebas text-2xl leading-none tracking-[0.18em] text-[hsl(42_72%_58%)]">
            KAOWZ
          </Link>
          <nav className="flex items-center gap-4 text-xs uppercase tracking-widest">
            {mostrarSaida && pathname !== '/vitrine' && (
              <Link to="/vitrine" className="text-[hsl(40_10%_70%)] transition-colors hover:text-[hsl(42_72%_58%)]">
                Ver todas as lâminas
              </Link>
            )}
            {token && (
              <Link
                to={`/arsenal/${token}`}
                className="flex items-center gap-1.5 text-[hsl(40_10%_70%)] transition-colors hover:text-[hsl(42_72%_58%)]"
              >
                <Swords className="h-3.5 w-3.5" />
                Arsenal
              </Link>
            )}
          </nav>
        </div>
      </header>

      <main className="mx-auto max-w-5xl px-4 pb-20 pt-6">{children}</main>

      <footer className="border-t border-[hsl(0_0%_14%)] px-4 py-6 text-center text-[11px] uppercase tracking-widest text-[hsl(0_0%_40%)]">
        Kaowz · Cutelaria artesanal
      </footer>
    </div>
  );
}

/** Título em Bebas, padrão da área pública. */
export const TituloPublico = ({ children, className = '' }: { children: ReactNode; className?: string }) => (
  <h1 className={`font-bebas text-3xl leading-tight tracking-wide sm:text-4xl ${className}`}>{children}</h1>
);
