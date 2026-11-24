import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import {
  CTA_LABEL_ADMIN,
  EXIBICOES_PRECO,
  NIVEIS,
  NIVEL_LABEL,
  PRECO_LABEL,
  TIPOS_CTA,
  type ExibicaoPreco,
  type LandingEdicao,
  type TipoCta,
} from '@/lib/landings';
import { Campo } from './Campo';
import type { AtualizarLanding } from './tipos';

interface Props {
  landing: LandingEdicao;
  atualizar: AtualizarLanding;
  contagem: Record<string, number>;
}

const EXEMPLO: Record<string, string> = {
  entrada: 'O primeiro passo no porte velado.',
  ideal: 'O equilíbrio para quem já usa todo dia.',
  definitiva: 'A peça definitiva, para quem não abre mão de nada.',
};

export function AbaEscada({ landing, atualizar, contagem }: Props) {
  return (
    <div className="space-y-4">
      <p className="text-sm text-muted-foreground">
        A página mostra as lâminas em três blocos, do ticket de entrada ao premium. Cada lâmina cai no nível escolhido
        para ela na aba Lâminas; sem escolha, vale a posição na escada do cadastro do modelo; sem nenhuma, Ideal.
        Bloco sem lâmina não aparece.
      </p>

      <div className="grid gap-4 lg:grid-cols-3">
        {NIVEIS.map((nivel) => (
          <div key={nivel} className="space-y-4 rounded-lg border bg-card p-4">
            <p className="text-base font-medium">
              {NIVEL_LABEL[nivel]}{' '}
              <span className="text-sm tabular-nums text-muted-foreground">
                · {contagem[nivel] ?? 0} {(contagem[nivel] ?? 0) === 1 ? 'lâmina' : 'lâminas'}
              </span>
            </p>

            <Campo rotulo="Frase do nível" htmlFor={`escada-${nivel}-texto`} ajuda="Abre o bloco deste nível na página.">
              <Textarea
                id={`escada-${nivel}-texto`}
                rows={2}
                placeholder={`Ex.: ${EXEMPLO[nivel]}`}
                value={landing[`texto_nivel_${nivel}`] ?? ''}
                onChange={(e) => atualizar(`texto_nivel_${nivel}`, e.target.value || null)}
              />
            </Campo>

            <Campo rotulo="Preço padrão" ajuda="Cada lâmina pode trocar na aba Lâminas.">
              <Select value={landing[`preco_${nivel}`]} onValueChange={(v) => atualizar(`preco_${nivel}`, v as ExibicaoPreco)}>
                <SelectTrigger aria-label={`Preço padrão do nível ${NIVEL_LABEL[nivel]}`}><SelectValue /></SelectTrigger>
                <SelectContent>
                  {EXIBICOES_PRECO.map((p) => <SelectItem key={p} value={p}>{PRECO_LABEL[p]}</SelectItem>)}
                </SelectContent>
              </Select>
            </Campo>

            <Campo rotulo="Botão padrão" ajuda="Para onde o botão dos cards deste nível leva.">
              <Select value={landing[`cta_${nivel}`]} onValueChange={(v) => atualizar(`cta_${nivel}`, v as TipoCta)}>
                <SelectTrigger aria-label={`Botão padrão do nível ${NIVEL_LABEL[nivel]}`}><SelectValue /></SelectTrigger>
                <SelectContent>
                  {TIPOS_CTA.map((c) => <SelectItem key={c} value={c}>{CTA_LABEL_ADMIN[c]}</SelectItem>)}
                </SelectContent>
              </Select>
            </Campo>
          </div>
        ))}
      </div>
    </div>
  );
}
