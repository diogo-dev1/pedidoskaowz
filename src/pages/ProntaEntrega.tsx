import { useEffect, useMemo, useRef, useState } from 'react';
import { Loader2, Plus, RefreshCw, Truck, Tv } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { TZ_BR } from '@/lib/prontaEntrega';
import { acaoPE, type PedidoPE } from '@/lib/pedidoPE';
import { useModoTV, useProntaEntrega } from '@/hooks/useProntaEntrega';
import { PedidoDetalhes } from '@/components/pronta-entrega/PedidoDetalhes';
import { BarraUrgencia } from '@/components/pronta-entrega/BarraUrgencia';
import { ConsultaPedido } from '@/components/pronta-entrega/ConsultaPedido';
import { AbasEtapas } from '@/components/pronta-entrega/AbasEtapas';
import { ColunaEtapa } from '@/components/pronta-entrega/ColunaEtapa';
import { CardPedido, type CampoPreparo } from '@/components/pronta-entrega/CardPedido';
import { ModoTV } from '@/components/pronta-entrega/ModoTV';
import { EnviarDialog } from '@/components/pronta-entrega/EnviarDialog';
import { ManualDialog } from '@/components/pronta-entrega/ManualDialog';
import { ETAPAS, contarUrgencia, separarPorEtapa, type Etapa } from '@/components/pronta-entrega/etapas';

const hora = (d: Date) => d.toLocaleTimeString('pt-BR', { timeZone: TZ_BR, hour: '2-digit', minute: '2-digit' });

const TEXTO_VAZIO: Record<Etapa, string> = {
  novos: 'Nenhum pedido novo. As próximas vendas com itens prontos aparecem aqui.',
  preparo: 'Nenhum pedido em preparo.',
  prontos: 'Nenhum pedido pronto para enviar.',
  enviados: 'Nenhum envio nos últimos 30 dias.',
};

export default function ProntaEntrega() {
  const { pedidos, isLoading, isError, agora, dias, ultimaSync, sincronizando, sincronizar, recarregar } = useProntaEntrega();
  const tv = useModoTV();

  const [selecionado, setSelecionado] = useState<string | null>(null);
  const [enviar, setEnviar] = useState<PedidoPE[] | null>(null);
  const [marcados, setMarcados] = useState<Set<string>>(new Set());
  const [manualOpen, setManualOpen] = useState(false);
  const [ocupados, setOcupados] = useState<Set<string>>(new Set());

  // ── Colunas e contadores ───────────────────────────────────
  const colunas = useMemo(() => separarPorEtapa(pedidos, dias, agora), [pedidos, dias, agora]);
  const contagem = useMemo(() => contarUrgencia(colunas, dias, agora), [colunas, dias, agora]);

  const totais = {} as Record<Etapa, number>;
  const comAtraso = {} as Record<Etapa, boolean>;
  for (const { key } of ETAPAS) {
    totais[key] = colunas[key].length;
    comAtraso[key] = key !== 'enviados' && colunas[key].some((p) => dias(p) < 0);
  }

  // ── Aba do celular: abre em "Novos" se houver, senão "Em preparo" ──
  const [aba, setAba] = useState<Etapa>('novos');
  const escolheuAba = useRef(false);
  useEffect(() => {
    if (isLoading || escolheuAba.current) return;
    setAba(colunas.novos.length ? 'novos' : 'preparo');
  }, [isLoading, colunas.novos.length]);

  // ── Ações ──────────────────────────────────────────────────
  /** Roda uma ação marcando o pedido como "salvando" e mostra o erro, se houver. */
  const comOcupado = async (p: PedidoPE, fn: () => Promise<void>) => {
    setOcupados((s) => new Set(s).add(p.id));
    try {
      await fn();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Não foi possível salvar');
    } finally {
      setOcupados((s) => {
        const n = new Set(s);
        n.delete(p.id);
        return n;
      });
    }
  };

  /** Mesmo caminho de antes: campo "visualizado" via acaoPE('acompanhamento'). */
  const visualizado = async (p: PedidoPE, valor: boolean) => {
    await acaoPE({ acao: 'acompanhamento', id: p.id, campo: 'visualizado', valor });
    recarregar();

    if (!valor) {
      toast.success('Movido para Novos');
      return;
    }
    toast.success('Movido para Em preparo', {
      action: {
        label: 'Desfazer',
        onClick: () => {
          acaoPE({ acao: 'acompanhamento', id: p.id, campo: 'visualizado', valor: false })
            .then(recarregar)
            .catch(() => toast.error('Não foi possível desfazer'));
        },
      },
    });
  };

  /** Case/certificado: mesmo caminho do PedidoDetalhes. */
  const alternarPreparo = (p: PedidoPE, campo: CampoPreparo, valor: boolean) =>
    comOcupado(p, async () => {
      await acaoPE({ acao: 'acompanhamento', id: p.id, campo, valor });
      recarregar();
      const outro = campo === 'case_pronta' ? p.certificado_pronto : p.case_pronta;
      if (valor && outro) toast.success('Pronto para enviar');
    });

  const marcar = (p: PedidoPE, valor: boolean) =>
    setMarcados((m) => {
      const n = new Set(m);
      if (valor) n.add(p.id);
      else n.delete(p.id);
      return n;
    });

  const selecionadosProntos = colunas.prontos.filter((p) => marcados.has(p.id));
  const pedidoAberto = pedidos.find((p) => p.id === selecionado);

  // ── Modo TV ────────────────────────────────────────────────
  if (tv.ativo) {
    return (
      <ModoTV
        colunas={colunas}
        contagem={contagem}
        agora={agora}
        dias={dias}
        ultimaSync={ultimaSync}
        onSair={tv.sair}
      />
    );
  }

  // ── Tela normal (PC e celular) ─────────────────────────────
  return (
    <div className="pe-panel mx-auto space-y-4 px-2 py-4 sm:px-4">
      {/* Cabeçalho */}
      <div className="flex shrink-0 flex-wrap items-start justify-between gap-2">
        <div className="flex items-center gap-3">
          <Truck className="h-6 w-6 text-primary" />
          <div>
            <h1 className="text-xl font-bold sm:text-2xl">Pronta Entrega</h1>
            <p className="text-xs text-muted-foreground">
              {ultimaSync ? `Sincronizado às ${hora(new Date(ultimaSync))}` : 'Aguardando sincronização'}
            </p>
          </div>
        </div>

        <div className="flex flex-wrap gap-2">
          {/* Neutro: a sincronização já é automática; o laranja fica para as ações dos pedidos. */}
          <Button variant="outline" size="sm" onClick={() => sincronizar(false)} disabled={sincronizando} className="h-10 gap-1.5">
            {sincronizando ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
            Sincronizar agora
          </Button>
          <Button variant="outline" size="sm" onClick={tv.entrar} className="hidden h-10 gap-1.5 lg:inline-flex">
            <Tv className="h-4 w-4" />
            Modo TV
          </Button>
          <Button variant="outline" size="sm" onClick={() => setManualOpen(true)} className="h-10 gap-1.5">
            <Plus className="h-4 w-4" />
            Adicionar pedido manual
          </Button>
        </div>
      </div>

      <BarraUrgencia contagem={contagem} />

      <ConsultaPedido pedidos={pedidos} dias={dias} onAbrir={(p) => setSelecionado(p.id)} />

      <AbasEtapas
        aba={aba}
        onTrocar={(v) => {
          escolheuAba.current = true;
          setAba(v);
        }}
        totais={totais}
        comAtraso={comAtraso}
      />

      {isLoading ? (
        <p className="flex items-center gap-2 py-8 text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" />
          Carregando pedidos...
        </p>
      ) : isError ? (
        <p role="alert" className="py-8 text-muted-foreground">
          Não foi possível carregar os pedidos. Tente sincronizar novamente.
        </p>
      ) : (
        <div className="pe-columns grid min-h-0 grid-cols-1 gap-4 lg:grid-cols-4">
          {ETAPAS.map(({ key, titulo }) => {
            const lista = colunas[key];
            const ativa = key !== 'enviados';

            return (
              <ColunaEtapa
                key={key}
                titulo={titulo}
                total={lista.length}
                atrasados={ativa ? lista.filter((p) => dias(p) < 0).length : 0}
                venceHoje={ativa ? lista.filter((p) => dias(p) === 0).length : 0}
                vazio={TEXTO_VAZIO[key]}
                visivelNoCelular={aba === key}
                barra={
                  key === 'prontos' && lista.length > 0 && (
                    <SelecaoMultipla
                      todos={lista.every((p) => marcados.has(p.id))}
                      onTodos={(v) => setMarcados(v ? new Set(lista.map((p) => p.id)) : new Set())}
                      quantidade={selecionadosProntos.length}
                      onConcluir={() => setEnviar(selecionadosProntos)}
                    />
                  )
                }
              >
                {lista.map((p) => (
                  <CardPedido
                    key={p.id}
                    pedido={p}
                    etapa={key}
                    dias={dias(p)}
                    ocupado={ocupados.has(p.id)}
                    onAbrir={() => setSelecionado(p.id)}
                    onDistribuir={() => comOcupado(p, () => visualizado(p, true))}
                    onAlternar={(campo, valor) => alternarPreparo(p, campo, valor)}
                    onEnviar={() => setEnviar([p])}
                    {...(key === 'prontos' && {
                      marcado: marcados.has(p.id),
                      onMarcar: (v: boolean) => marcar(p, v),
                    })}
                  />
                ))}
              </ColunaEtapa>
            );
          })}
        </div>
      )}

      {pedidoAberto && (
        <PedidoDetalhes
          key={pedidoAberto.id}
          pedido={pedidoAberto}
          dias={dias(pedidoAberto)}
          onClose={() => setSelecionado(null)}
          onEnviar={(p) => setEnviar([p])}
          onDone={recarregar}
          onVisualizado={visualizado}
        />
      )}

      <EnviarDialog
        pedidos={enviar}
        onClose={() => setEnviar(null)}
        onDone={() => {
          setMarcados(new Set());
          setSelecionado(null);
          recarregar();
        }}
      />

      <ManualDialog open={manualOpen} onClose={() => setManualOpen(false)} onDone={recarregar} />
    </div>
  );
}

function SelecaoMultipla({ todos, onTodos, quantidade, onConcluir }: {
  todos: boolean;
  onTodos: (valor: boolean) => void;
  quantidade: number;
  onConcluir: () => void;
}) {
  return (
    <div className="flex flex-wrap items-center gap-2 border bg-card p-2 text-xs">
      <label className="flex min-h-11 cursor-pointer items-center gap-2">
        <Checkbox aria-label="Selecionar todos" checked={todos} onCheckedChange={(v) => onTodos(v === true)} />
        Selecionar todos
      </label>
      {quantidade > 0 && (
        <Button size="sm" className="h-10" onClick={onConcluir}>
          Concluir {quantidade} {quantidade === 1 ? 'envio' : 'envios'}
        </Button>
      )}
    </div>
  );
}
