import { useMemo, useState } from 'react';
import { Copy, MessageCircle, Search, X } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';
import { corPrazo, dataDia, dataHora, dataPedido, normalPE, textoPrazo, ultimoEnvio, type PedidoPE } from '@/lib/pedidoPE';
import { copiarPE } from './PedidoDetalhes';
import { ETAPAS, etapaDoPedido, mensagemCliente } from './etapas';

/** Quantos resultados mostrar no máximo. */
const LIMITE = 5;

interface Props {
  pedidos: PedidoPE[];
  dias: (p: PedidoPE) => number;
  onAbrir: (p: PedidoPE) => void;
}

/** "Onde está o pedido de fulano?" — busca por cliente ou número e mostra tudo de uma vez. */
export function ConsultaPedido({ pedidos, dias, onAbrir }: Props) {
  const [busca, setBusca] = useState('');
  const termo = normalPE(busca);

  const resultados = useMemo(() => {
    if (termo.length < 2) return [];
    return pedidos
      .filter((p) => normalPE(p.cliente_nome || '').includes(termo) || normalPE(p.pedido_numero).includes(termo))
      // Mais recentes primeiro
      .sort((a, b) => (dataPedido(b) || '').localeCompare(dataPedido(a) || ''));
  }, [pedidos, termo]);

  return (
    <div className="space-y-2">
      <div className="relative">
        <Search className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-muted-foreground" />
        <Input
          aria-label="Consultar pedido"
          placeholder="Consultar pedido por cliente ou número..."
          value={busca}
          onChange={(e) => setBusca(e.target.value)}
          className="h-12 rounded-none pl-10 pr-10 text-base"
        />
        {busca && (
          <Button
            variant="ghost"
            size="icon"
            aria-label="Limpar busca"
            onClick={() => setBusca('')}
            className="absolute right-1 top-1/2 h-10 w-10 -translate-y-1/2"
          >
            <X className="h-4 w-4" />
          </Button>
        )}
      </div>

      {termo.length >= 2 && resultados.length === 0 && (
        <p className="border border-dashed p-3 text-sm text-muted-foreground">Nenhum pedido encontrado.</p>
      )}

      {resultados.length > 0 && (
        <div className="grid gap-2 md:grid-cols-2 xl:grid-cols-3">
          {resultados.slice(0, LIMITE).map((p) => (
            <ResultadoConsulta key={p.id} pedido={p} dias={dias(p)} onAbrir={() => onAbrir(p)} />
          ))}
        </div>
      )}

      {resultados.length > LIMITE && (
        <p className="text-xs text-muted-foreground">
          Mostrando {LIMITE} de {resultados.length}. Digite mais para refinar.
        </p>
      )}
    </div>
  );
}

function ResultadoConsulta({ pedido: p, dias, onAbrir }: { pedido: PedidoPE; dias: number; onAbrir: () => void }) {
  const etapa = etapaDoPedido(p);
  const nomeEtapa = ETAPAS.find((e) => e.key === etapa)?.titulo;
  const enviado = etapa === 'enviados';

  const linha = (rotulo: string, valor: React.ReactNode) => (
    <div className="grid grid-cols-[6.5rem_minmax(0,1fr)] gap-2">
      <dt className="text-muted-foreground">{rotulo}</dt>
      <dd className="break-words">{valor}</dd>
    </div>
  );

  return (
    <div className="space-y-3 rounded-none border bg-card p-3 text-sm">
      <div className="flex items-start justify-between gap-2">
        <button
          type="button"
          onClick={onAbrir}
          className="min-w-0 text-left underline-offset-4 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          <p className="break-words font-semibold">{p.cliente_nome || 'Sem nome'}</p>
          <p className="text-xs text-muted-foreground">{p.pedido_numero}</p>
        </button>
        <Badge variant={enviado ? 'secondary' : 'outline'} className="shrink-0 rounded-none">
          {nomeEtapa}
        </Badge>
      </div>

      <dl className="space-y-1">
        {linha('Pagamento', p.data_pagamento ? dataHora(p.data_pagamento) : '—')}
        {linha(
          'Prazo',
          p.prazo_limite ? (
            <>
              {dataDia(p.prazo_limite)}
              {!enviado && <span className={cn('ml-1 font-medium', corPrazo(dias).texto)}>· {textoPrazo(dias)}</span>}
            </>
          ) : '—',
        )}
        {linha('Envio', enviado ? dataHora(ultimoEnvio(p)) : 'Ainda não enviado')}
        {linha(
          'Rastreio',
          p.rastreio ? (
            <span className="flex items-center gap-1">
              <span className="break-all font-mono">{p.rastreio}</span>
              <Button variant="ghost" size="icon" aria-label="Copiar rastreio" className="h-8 w-8 shrink-0" onClick={() => copiarPE(p.rastreio || '')}>
                <Copy className="h-3.5 w-3.5" />
              </Button>
            </span>
          ) : enviado ? 'Aguardando rastreio do Bling' : '—',
        )}
      </dl>

      <Button
        variant="outline"
        className="h-11 w-full gap-1.5 rounded-none"
        disabled={!p.rastreio}
        onClick={() => copiarPE(mensagemCliente(p))}
      >
        <MessageCircle className="h-4 w-4" />
        {/* Desabilitado sem dizer o motivo confunde: o rótulo explica. */}
        {p.rastreio ? 'Copiar mensagem para o cliente' : 'Mensagem disponível após o rastreio'}
      </Button>
    </div>
  );
}
