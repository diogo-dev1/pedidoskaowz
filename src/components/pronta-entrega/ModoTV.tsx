import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { cn } from '@/lib/utils';
import { TZ_BR } from '@/lib/prontaEntrega';
import { corPrazo, textoPrazo, ultimoEnvio, type PedidoPE } from '@/lib/pedidoPE';
import { BarraUrgencia } from './BarraUrgencia';
import { ETAPAS, enviadoHoje, oQueFalta, type ContagemUrgencia, type Etapa } from './etapas';

interface Props {
  colunas: Record<Etapa, PedidoPE[]>;
  contagem: ContagemUrgencia;
  agora: Date;
  dias: (p: PedidoPE) => number;
  ultimaSync?: string | null;
  onSair: () => void;
}

const hora = (d: Date, segundos = false) =>
  d.toLocaleTimeString('pt-BR', {
    timeZone: TZ_BR,
    hour: '2-digit',
    minute: '2-digit',
    ...(segundos ? { second: '2-digit' } : {}),
  });

const dataExtenso = (d: Date) =>
  d.toLocaleDateString('pt-BR', { timeZone: TZ_BR, weekday: 'long', day: '2-digit', month: 'long' });

/**
 * Painel para TV: fundo escuro, fontes grandes, sem botões.
 * Para sair: tecla Esc (sai da tela cheia) ou duplo clique no relógio.
 */
export function ModoTV({ colunas, contagem, agora, dias, ultimaSync, onSair }: Props) {
  // Esc também sai quando o navegador não entrou em tela cheia nativa.
  useEffect(() => {
    const tecla = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onSair();
    };
    window.addEventListener('keydown', tecla);
    return () => window.removeEventListener('keydown', tecla);
  }, [onSair]);

  // Na TV a coluna Enviados mostra só o que saiu hoje.
  const colunasTV: Record<Etapa, PedidoPE[]> = {
    ...colunas,
    enviados: colunas.enviados.filter((p) => enviadoHoje(p, agora)),
  };

  return (
    // A classe "dark" troca todos os tokens de cor do index.css para o tema escuro.
    <div className="dark pe-panel pe-panel-fullscreen flex flex-col gap-5 bg-background text-foreground">
      <header className="flex shrink-0 items-end justify-between gap-6">
        <div>
          <h1 className="text-4xl font-bold">Pronta Entrega</h1>
          <p className="text-xl capitalize text-muted-foreground">{dataExtenso(agora)}</p>
        </div>
        <div className="text-right" onDoubleClick={onSair} title="Duplo clique para sair">
          <p className="text-6xl font-bold tabular-nums leading-none">{hora(agora, true)}</p>
          <p className="mt-1 text-lg text-muted-foreground">
            {ultimaSync ? `Atualizado às ${hora(new Date(ultimaSync))}` : 'Aguardando atualização'}
          </p>
        </div>
      </header>

      <BarraUrgencia contagem={contagem} variante="tv" />

      <div className="grid min-h-0 flex-1 grid-cols-4 gap-5">
        {ETAPAS.map((etapa) => (
          <ColunaTV
            key={etapa.key}
            titulo={etapa.key === 'enviados' ? 'Enviados hoje' : etapa.titulo}
            etapa={etapa.key}
            pedidos={colunasTV[etapa.key]}
            dias={dias}
          />
        ))}
      </div>
    </div>
  );
}

/** Espaço reservado para o aviso "+N pedidos" quando nem tudo cabe. */
const ESPACO_AVISO = 56;

function ColunaTV({ titulo, etapa, pedidos, dias }: {
  titulo: string;
  etapa: Etapa;
  pedidos: PedidoPE[];
  dias: (p: PedidoPE) => number;
}) {
  const areaRef = useRef<HTMLDivElement>(null);
  const [cabem, setCabem] = useState(pedidos.length);

  // Mede quantos cards cabem na altura da coluna. Os que não cabem ficam invisíveis
  // (continuam no layout para a medição funcionar) e viram "+N pedidos".
  useLayoutEffect(() => {
    const area = areaRef.current;
    if (!area) return;

    const medir = () => {
      const cards = Array.from(area.children) as HTMLElement[];
      const altura = area.clientHeight;
      const fundo = (el: HTMLElement) => el.offsetTop + el.offsetHeight;

      const todosCabem = cards.every((el) => fundo(el) <= altura);
      if (todosCabem) {
        setCabem(cards.length);
        return;
      }
      setCabem(cards.filter((el) => fundo(el) <= altura - ESPACO_AVISO).length);
    };

    medir();
    const observer = new ResizeObserver(medir);
    observer.observe(area);
    return () => observer.disconnect();
  }, [pedidos]);

  const escondidos = pedidos.length - cabem;

  return (
    <section className="flex min-h-0 min-w-0 flex-col">
      <header className="mb-3 flex shrink-0 items-baseline gap-3 border-b pb-3">
        <span className="text-6xl font-bold tabular-nums">{pedidos.length}</span>
        <h2 className="text-2xl font-medium text-muted-foreground">{titulo}</h2>
      </header>

      <div className="relative min-h-0 flex-1 overflow-hidden">
        <div ref={areaRef} className="relative h-full space-y-3">
          {pedidos.map((p, i) => (
            <CardTV key={p.id} pedido={p} etapa={etapa} dias={dias(p)} invisivel={i >= cabem} />
          ))}
        </div>

        {escondidos > 0 && (
          <p className="absolute inset-x-0 bottom-0 border bg-card py-3 text-center text-2xl font-semibold">
            +{escondidos} {escondidos === 1 ? 'pedido' : 'pedidos'}
          </p>
        )}
      </div>
    </section>
  );
}

function CardTV({ pedido: p, etapa, dias, invisivel }: {
  pedido: PedidoPE;
  etapa: Etapa;
  dias: number;
  invisivel: boolean;
}) {
  const enviado = etapa === 'enviados';
  const atrasado = !enviado && dias < 0;
  const cor = corPrazo(dias);
  const itens = p.itens.filter((i) => i.pronta_entrega && (enviado ? i.enviado : !i.enviado));
  const envio = ultimoEnvio(p);

  return (
    <div
      className={cn(
        'relative space-y-1 overflow-hidden rounded-none border bg-card p-4 pl-5',
        atrasado && 'border-destructive bg-destructive/20 ring-1 ring-inset ring-destructive',
        invisivel && 'invisible',
      )}
    >
      {!enviado && <span className={cn('absolute inset-y-0 left-0 w-1.5', cor.faixa)} />}

      <p className={cn('text-xl font-bold', enviado ? 'text-success' : cor.texto)}>
        {enviado ? `Enviado às ${envio ? hora(new Date(envio)) : '—'}` : textoPrazo(dias)}
      </p>
      <p className="truncate text-2xl font-semibold">{p.cliente_nome || 'Sem nome'}</p>
      <ul className="text-lg text-muted-foreground">
        {itens.map((i, n) => (
          <li key={n} className="truncate">
            {i.quantidade}x {i.titulo}
          </li>
        ))}
      </ul>
      {!enviado && <p className="text-lg font-medium">{oQueFalta(p)}</p>}
    </div>
  );
}
