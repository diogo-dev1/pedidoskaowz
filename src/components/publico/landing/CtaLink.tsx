import type { ReactNode } from 'react';
import { Link } from 'react-router-dom';
import type { DestinoCta } from '@/lib/landingsRegras';

interface Props {
  destino: DestinoCta;
  className: string;
  children: ReactNode;
  onClique?: () => void;
}

/** Link interno pelo roteador; loja e WhatsApp em nova aba. */
export function CtaLink({ destino, className, children, onClique }: Props) {
  if (destino.externo) {
    return (
      <a href={destino.href} target="_blank" rel="noopener noreferrer" className={className} onClick={onClique}>
        {children}
      </a>
    );
  }
  return (
    <Link to={destino.href} className={className} onClick={onClique}>
      {children}
    </Link>
  );
}
