import type { ReactNode } from 'react';

interface Props {
  ativo: boolean;
  onClick: () => void;
  children: ReactNode;
}

/** Chip de filtro liga/desliga, com alvo de toque de 36px. */
export function ChipFiltro({ ativo, onClick, children }: Props) {
  return (
    <button
      type="button"
      aria-pressed={ativo}
      onClick={onClick}
      className={`h-9 rounded-lg border px-3 text-sm transition-colors duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${
        ativo
          ? 'border-primary bg-primary/10 font-medium text-foreground'
          : 'border-border bg-background text-muted-foreground hover:bg-muted hover:text-foreground'
      }`}
    >
      {children}
    </button>
  );
}
