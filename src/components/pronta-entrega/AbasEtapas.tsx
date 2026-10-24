import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ETAPAS, type Etapa } from './etapas';

interface Props {
  aba: Etapa;
  onTrocar: (aba: Etapa) => void;
  totais: Record<Etapa, number>;
  /** Abas com algum pedido atrasado ganham um ponto vermelho. */
  comAtraso: Record<Etapa, boolean>;
}

/** Abas das 4 etapas — só aparecem no celular (no desktop as colunas ficam lado a lado). */
export function AbasEtapas({ aba, onTrocar, totais, comAtraso }: Props) {
  return (
    <Tabs value={aba} onValueChange={(v) => onTrocar(v as Etapa)} className="shrink-0 lg:hidden">
      <TabsList className="h-auto w-full rounded-none p-1">
        {ETAPAS.map((etapa) => (
          <TabsTrigger
            key={etapa.key}
            value={etapa.key}
            className="relative min-h-11 flex-1 flex-col gap-0 rounded-none px-1 text-xs"
          >
            <span className="text-base font-semibold tabular-nums leading-tight">{totais[etapa.key]}</span>
            <span className="leading-tight">{etapa.curto}</span>

            {comAtraso[etapa.key] && (
              <span
                aria-label="Tem pedido atrasado"
                className="absolute right-1.5 top-1.5 h-2 w-2 rounded-full bg-destructive"
              />
            )}
          </TabsTrigger>
        ))}
      </TabsList>
    </Tabs>
  );
}
