import type { ReactNode } from 'react';
import { Label } from '@/components/ui/label';

interface Props {
  rotulo: string;
  ajuda?: ReactNode;
  htmlFor?: string;
  children: ReactNode;
  className?: string;
}

/** Rótulo + controle + uma linha de ajuda (outras pessoas do time usam o admin). */
export function Campo({ rotulo, ajuda, htmlFor, children, className = '' }: Props) {
  return (
    <div className={`space-y-1.5 ${className}`}>
      <Label htmlFor={htmlFor} className="text-sm font-medium">
        {rotulo}
      </Label>
      {children}
      {ajuda && <p className="text-xs leading-4 text-muted-foreground">{ajuda}</p>}
    </div>
  );
}
