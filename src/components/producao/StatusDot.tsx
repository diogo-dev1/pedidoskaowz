import { cn } from '@/lib/utils';

export type ItemStatus = 'pendente' | 'em_andamento' | 'concluido' | 'nao_aplicavel';

const STATUS_CYCLE: Record<ItemStatus, ItemStatus> = {
  pendente: 'em_andamento',
  em_andamento: 'concluido',
  concluido: 'pendente',
  nao_aplicavel: 'nao_aplicavel',
};

const STATUS_COLORS: Record<ItemStatus, string> = {
  pendente: 'bg-red-500',
  em_andamento: 'bg-yellow-500',
  concluido: 'bg-green-500',
  nao_aplicavel: 'bg-zinc-600',
};

const STATUS_LABELS: Record<ItemStatus, string> = {
  pendente: 'Pendente',
  em_andamento: 'Em andamento',
  concluido: 'Concluído',
  nao_aplicavel: 'N/A',
};

interface StatusDotProps {
  status: ItemStatus;
  label: string;
  onClick?: (nextStatus: ItemStatus) => void;
  size?: 'sm' | 'md';
}

export function StatusDot({ status, label, onClick, size = 'sm' }: StatusDotProps) {
  const isClickable = onClick && status !== 'nao_aplicavel';
  const next = STATUS_CYCLE[status];

  return (
    <button
      type="button"
      disabled={!isClickable}
      onClick={() => isClickable && onClick(next)}
      title={`${label}: ${STATUS_LABELS[status]}${isClickable ? ` → ${STATUS_LABELS[next]}` : ''}`}
      className={cn(
        'rounded-full transition-all flex-shrink-0',
        size === 'sm' ? 'w-3 h-3' : 'w-4 h-4',
        STATUS_COLORS[status],
        isClickable && 'cursor-pointer hover:ring-2 hover:ring-offset-1 hover:ring-offset-background hover:ring-current',
        !isClickable && 'cursor-default opacity-60',
      )}
    />
  );
}

export function StatusBadge({ status, label, onClick }: StatusDotProps) {
  const isClickable = onClick && status !== 'nao_aplicavel';
  const next = STATUS_CYCLE[status];

  return (
    <button
      type="button"
      disabled={!isClickable}
      onClick={() => isClickable && onClick(next)}
      className={cn(
        'flex items-center gap-2 px-3 py-2 rounded-lg border transition-all text-left w-full',
        isClickable && 'hover:bg-secondary cursor-pointer',
        !isClickable && 'opacity-60 cursor-default',
      )}
    >
      <span className={cn('w-3 h-3 rounded-full flex-shrink-0', STATUS_COLORS[status])} />
      <span className="flex-1 text-xs font-medium">{label}</span>
      <span className="text-[10px] text-muted-foreground">{STATUS_LABELS[status]}</span>
    </button>
  );
}

export { STATUS_COLORS, STATUS_LABELS, STATUS_CYCLE };
