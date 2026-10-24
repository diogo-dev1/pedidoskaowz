import { cn } from '@/lib/utils';
import type { ContagemUrgencia } from './etapas';

interface Props {
  contagem: ContagemUrgencia;
  /** "tv" = números bem grandes para a TV; padrão = desktop + versão compacta no celular. */
  variante?: 'padrao' | 'tv';
}

export function BarraUrgencia({ contagem, variante = 'padrao' }: Props) {
  const tv = variante === 'tv';

  const itens = [
    {
      rotulo: 'Atrasados',
      valor: contagem.atrasados,
      // Só pinta quando existe atraso — zero não deve chamar atenção.
      caixa: contagem.atrasados > 0 ? 'border-destructive bg-destructive/10' : '',
      numero: contagem.atrasados > 0 ? 'text-destructive' : '',
    },
    {
      rotulo: 'Vencem hoje',
      valor: contagem.venceHoje,
      caixa: contagem.venceHoje > 0 ? 'border-warning bg-warning/10' : '',
      numero: contagem.venceHoje > 0 ? 'text-warning' : '',
    },
    { rotulo: 'Em aberto', valor: contagem.emAberto, caixa: '', numero: '' },
    { rotulo: 'Enviados hoje', valor: contagem.enviadosHoje, caixa: '', numero: '' },
  ];

  return (
    <div
      role="status"
      aria-label="Resumo de urgência"
      className={cn(
        'grid grid-cols-4 gap-1.5 sm:gap-3',
        // No celular fica fixa logo abaixo da TopNav (h-14).
        !tv && 'sticky top-14 z-30 -mx-2 bg-background px-2 py-2 lg:static lg:mx-0 lg:p-0',
      )}
    >
      {itens.map((item) => (
        <div
          key={item.rotulo}
          className={cn(
            'min-w-0 rounded-none border bg-card',
            tv ? 'p-6' : 'px-2 py-1.5 sm:p-4',
            item.caixa,
          )}
        >
          {/* A cor fica só no número (texto grande). O rótulo pequeno fica na cor do texto
              para manter o contraste — o âmbar não passa de 4.5:1 em letra pequena. */}
          <p
            className={cn(
              'font-bold tabular-nums leading-none',
              tv ? 'text-8xl' : 'text-2xl sm:text-5xl',
              item.numero,
            )}
          >
            {item.valor}
          </p>
          <p
            className={cn(
              'mt-1 truncate font-medium',
              tv ? 'text-2xl' : 'text-[11px] sm:text-sm',
              item.caixa ? 'text-foreground' : 'text-muted-foreground',
            )}
          >
            {item.rotulo}
          </p>
        </div>
      ))}
    </div>
  );
}
