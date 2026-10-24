import { Check, Copy, Loader2, PackageCheck, Send, Square, StickyNote } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';
import {
  certificadoDiferente,
  corPrazo,
  dataHora,
  textoPrazo,
  ultimoEnvio,
  type PedidoPE,
} from '@/lib/pedidoPE';
import { copiarPE } from './PedidoDetalhes';
import type { Etapa } from './etapas';

export type CampoPreparo = 'case_pronta' | 'certificado_pronto';

interface Props {
  pedido: PedidoPE;
  etapa: Etapa;
  /** Dias úteis até o prazo (negativo = atrasado). */
  dias: number;
  /** Enquanto uma ação deste pedido está salvando. */
  ocupado: boolean;
  onAbrir: () => void;
  onDistribuir: () => void;
  onAlternar: (campo: CampoPreparo, valor: boolean) => void;
  onEnviar: () => void;
  /** Seleção múltipla — só existe na coluna "Prontos para enviar". */
  marcado?: boolean;
  onMarcar?: (valor: boolean) => void;
}

/** Botão "afunda" ao toque (feedback rápido), sem perder a transição de cor. */
const TOQUE = 'transition-[color,background-color,border-color,transform] duration-150 active:scale-[0.97] motion-reduce:active:scale-100';

/** Impede que o clique num botão abra o PedidoDetalhes. */
const naoPropagar = {
  onClick: (e: React.SyntheticEvent) => e.stopPropagation(),
  onKeyDown: (e: React.SyntheticEvent) => e.stopPropagation(),
};

export function CardPedido(props: Props) {
  const { pedido: p, etapa, dias, ocupado, onAbrir } = props;

  const enviado = etapa === 'enviados';
  const atrasado = !enviado && dias < 0;
  const cor = corPrazo(dias);

  const itens = p.itens.filter((i) => i.pronta_entrega && (enviado ? i.enviado : !i.enviado));
  const sobEncomenda = p.itens.filter((i) => !i.pronta_entrega).length;
  const certificados = certificadoDiferente(p);
  const temObservacao = !!(p.observacao_pedido || p.observacao);

  return (
    <div
      role="button"
      tabIndex={0}
      aria-label={`Ver pedido: ${p.cliente_nome || 'Sem nome'}, ${p.pedido_numero}`}
      onClick={onAbrir}
      onKeyDown={(e) => {
        if (e.target === e.currentTarget && ['Enter', ' '].includes(e.key)) {
          e.preventDefault();
          onAbrir();
        }
      }}
      className={cn(
        'relative cursor-pointer space-y-2 overflow-hidden rounded-none border bg-card p-3 pl-4',
        // Hover só com mouse — no toque ele "gruda" depois do clique.
        '[@media(hover:hover)]:hover:bg-muted/40',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
        // ring-1 soma à borda sem mudar o tamanho do card (border-2 faria o card "pular").
        atrasado && 'border-destructive bg-destructive/10 ring-1 ring-inset ring-destructive [@media(hover:hover)]:hover:bg-destructive/15',
      )}
    >
      {/* Faixa lateral com a cor do prazo */}
      {!enviado && <span className={cn('absolute inset-y-0 left-0 w-1', cor.faixa)} />}

      {/* Prazo no topo */}
      {!enviado && (
        <div className="flex items-center justify-between gap-2">
          <p className={cn('text-sm font-semibold', cor.texto)}>{textoPrazo(dias)}</p>

          {props.onMarcar && (
            <span className="flex min-h-11 min-w-11 items-center justify-center" {...naoPropagar}>
              <Checkbox
                aria-label={`Selecionar ${p.cliente_nome || p.pedido_numero}`}
                checked={props.marcado}
                onCheckedChange={(v) => props.onMarcar?.(v === true)}
              />
            </span>
          )}
        </div>
      )}

      {/* Cliente, número e vendedor */}
      <div className="flex min-w-0 items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="break-words font-semibold">{p.cliente_nome || 'Sem nome'}</p>
          <p className="text-xs text-muted-foreground">
            {p.pedido_numero}
            {p.vendedor ? ` · ${p.vendedor}` : ''}
          </p>
        </div>

        {temObservacao && (
          <Tooltip>
            <TooltipTrigger asChild>
              <span tabIndex={0} aria-label="Tem observação" className="text-muted-foreground">
                <StickyNote className="h-4 w-4" />
              </span>
            </TooltipTrigger>
            <TooltipContent>Tem observação no pedido</TooltipContent>
          </Tooltip>
        )}
      </div>

      {/* Itens */}
      <ul className="space-y-1 break-words text-sm">
        {itens.map((i, n) => (
          <li key={n}>
            {i.quantidade}x {i.titulo}
          </li>
        ))}
      </ul>

      {/* Avisos */}
      {/* Avisos que evitam erro na expedição: legíveis, sem competir com o laranja da ação. */}
      {!enviado && sobEncomenda > 0 && (
        <p className="text-xs font-medium">
          +{sobEncomenda} {sobEncomenda === 1 ? 'item sob encomenda' : 'itens sob encomenda'} — não enviar
        </p>
      )}
      {!enviado && certificados.length > 0 && (
        <p className="break-words text-sm">
          <span className="text-muted-foreground">Certificado: </span>
          <span className="font-semibold">{certificados.join(' · ')}</span>
        </p>
      )}

      {/* Ação principal da etapa */}
      <AcaoDaEtapa {...props} />
    </div>
  );
}

function AcaoDaEtapa({ pedido: p, etapa, ocupado, onDistribuir, onAlternar, onEnviar }: Props) {
  if (etapa === 'novos') {
    return (
      // Neutro: com vários pedidos novos, botões laranja em todos os cards virariam uma parede de laranja.
      <Button variant="secondary" className={cn('h-11 w-full gap-1.5', TOQUE)} disabled={ocupado} onClick={(e) => { e.stopPropagation(); onDistribuir(); }} onKeyDown={(e) => e.stopPropagation()}>
        {ocupado ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
        Distribuir tarefas
      </Button>
    );
  }

  if (etapa === 'preparo') {
    const toggles: { campo: CampoPreparo; rotulo: string }[] = [
      { campo: 'case_pronta', rotulo: 'Case' },
      { campo: 'certificado_pronto', rotulo: 'Certificado' },
    ];

    return (
      <div className="grid grid-cols-2 gap-2">
        {toggles.map(({ campo, rotulo }) => {
          const pronto = p[campo];
          return (
            <Button
              key={campo}
              variant="outline"
              aria-pressed={pronto}
              disabled={ocupado}
              onClick={(e) => { e.stopPropagation(); onAlternar(campo, !pronto); }}
              onKeyDown={(e) => e.stopPropagation()}
              className={cn(
                'h-11 gap-1.5 rounded-none',
                TOQUE,
                pronto && 'border-success bg-success text-white hover:bg-success/90 hover:text-white',
              )}
            >
              {pronto ? <Check className="h-4 w-4" /> : <Square className="h-4 w-4" />}
              {rotulo}
            </Button>
          );
        })}
      </div>
    );
  }

  if (etapa === 'prontos') {
    return (
      // A ação que fecha o ciclo: é o único laranja dos cards.
      <Button className={cn('h-11 w-full gap-1.5', TOQUE)} onClick={(e) => { e.stopPropagation(); onEnviar(); }} onKeyDown={(e) => e.stopPropagation()}>
        <PackageCheck className="h-4 w-4" />
        Envio concluído
      </Button>
    );
  }

  // Enviados: data e rastreio
  return (
    <div className="space-y-1">
      <p className="text-xs text-muted-foreground">Enviado em {dataHora(ultimoEnvio(p))}</p>
      {p.rastreio ? (
        <div className="flex items-center gap-1">
          <span className="break-all font-mono text-xs">{p.rastreio}</span>
          <Button
            variant="ghost"
            size="icon"
            aria-label="Copiar rastreio"
            onClick={(e) => { e.stopPropagation(); copiarPE(p.rastreio || ''); }}
            onKeyDown={(e) => e.stopPropagation()}
          >
            <Copy className="h-3 w-3" />
          </Button>
        </div>
      ) : (
        <p className="text-xs text-muted-foreground">Aguardando rastreio do Bling</p>
      )}
    </div>
  );
}
