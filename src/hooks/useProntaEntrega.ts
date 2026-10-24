import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { calcularPrazoLimite, prazoDoPedido } from '@/lib/prontaEntrega';
import { pendente, type PedidoPE } from '@/lib/pedidoPE';
import { diasRestantes } from '@/components/pronta-entrega/etapas';

/** Sincroniza com o Shopify e recarrega a tela a cada 2 minutos. */
const INTERVALO_SYNC = 120000;

/**
 * Dados e efeitos do painel de Pronta Entrega:
 * pedidos, feriados, configuração, sincronização automática, relógio e Wake Lock.
 */
export function useProntaEntrega() {
  const qc = useQueryClient();
  const [agora, setAgora] = useState(() => new Date());
  const [sincronizando, setSincronizando] = useState(false);
  const executando = useRef(false);

  // ── Consultas ──────────────────────────────────────────────
  const pedidosQuery = useQuery({
    queryKey: ['pronta-entrega'],
    refetchInterval: INTERVALO_SYNC,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('pedidos_pronta_entrega')
        .select('*')
        .order('prazo_limite');
      if (error) throw error;
      return (data ?? []) as unknown as PedidoPE[];
    },
  });

  const { data: feriados = new Set<string>() } = useQuery({
    queryKey: ['feriados'],
    queryFn: async () => {
      const { data, error } = await supabase.from('feriados').select('data');
      if (error) throw error;
      return new Set((data ?? []).map((f) => f.data));
    },
  });

  const { data: configData } = useQuery({
    queryKey: ['pe-config-expedicao', 'rows-v1'],
    refetchInterval: INTERVALO_SYNC,
    queryFn: async () => {
      const { data, error } = await supabase.from('config_expedicao').select('chave, valor');
      if (error) throw error;
      return data ?? [];
    },
  });

  // Sessões antigas guardavam só um timestamp ISO em pe-ultima-sync.
  // A chave nova isola o contrato de lista de linhas; também protege contra cache malformado.
  const config = Array.isArray(configData) ? configData : [];
  const ultimaSync = config.find((c) => c.chave === 'ultima_sincronizacao')?.valor;
  const corte = config.find((c) => c.chave === 'horario_corte')?.valor || '14:00';

  // ── Pedidos com prazo recalculado ──────────────────────────
  // Só pedidos com algum item de pronta entrega. Pendentes têm o prazo recalculado
  // no navegador com a mesma regra do servidor (feriados + horário de corte).
  const brutos = pedidosQuery.data;
  const pedidos = useMemo(
    () =>
      (brutos ?? [])
        .filter((p) => p.itens.some((i) => i.pronta_entrega))
        .map((p) => {
          if (!pendente(p) || !p.data_pagamento) return p;
          const prazo = calcularPrazoLimite(new Date(p.data_pagamento), prazoDoPedido(p.itens), corte, feriados);
          return { ...p, prazo_limite: prazo };
        }),
    [brutos, corte, feriados],
  );

  const dias = useCallback((p: PedidoPE) => diasRestantes(p, feriados, agora), [feriados, agora]);

  // ── Sincronização ──────────────────────────────────────────
  const recarregar = useCallback(() => {
    qc.invalidateQueries({ queryKey: ['pronta-entrega'] });
    qc.invalidateQueries({ queryKey: ['pe-config-expedicao'] });
  }, [qc]);

  const sincronizar = useCallback(
    async (silencioso = true) => {
      if (executando.current) return;
      executando.current = true;
      setSincronizando(true);
      try {
        const { data, error } = await supabase.functions.invoke('sincronizar-pronta-entrega', {
          body: { acao: 'sincronizar' },
        });
        if (error || !data?.sucesso) throw new Error(data?.erro || error?.message || 'Tente novamente');
        if (!silencioso) toast.success('Pedidos atualizados');
        if (data.avisos?.length) toast.warning(data.avisos[0]);
      } catch (error) {
        toast.error(`Não foi possível sincronizar: ${error instanceof Error ? error.message : 'Tente novamente'}`);
      } finally {
        executando.current = false;
        setSincronizando(false);
        recarregar();
      }
    },
    [recarregar],
  );

  // Sincroniza ao abrir e depois a cada 2 minutos.
  useEffect(() => {
    sincronizar();
    const timer = setInterval(() => sincronizar(), INTERVALO_SYNC);
    return () => clearInterval(timer);
  }, [sincronizar]);

  // Relógio (atualiza prazos e o relógio do Modo TV).
  useEffect(() => {
    const timer = setInterval(() => setAgora(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  // Mantém a tela acordada (útil na TV). Sem suporte, o painel funciona igual.
  useEffect(() => {
    type Lock = { release: () => Promise<void> };
    let lock: Lock | undefined;
    let disposed = false;

    const manterAcordada = async () => {
      try {
        const wake = (navigator as unknown as { wakeLock?: { request: (tipo: string) => Promise<Lock> } }).wakeLock;
        if (!wake || document.visibilityState !== 'visible') return;
        const novo = await wake.request('screen');
        if (disposed) {
          await novo.release();
        } else {
          await lock?.release();
          lock = novo;
        }
      } catch {
        /* Wake Lock não suportado/permitido: o painel continua funcionando. */
      }
    };

    manterAcordada();
    document.addEventListener('visibilitychange', manterAcordada);
    return () => {
      disposed = true;
      document.removeEventListener('visibilitychange', manterAcordada);
      lock?.release().catch(() => {});
    };
  }, []);

  return {
    pedidos,
    isLoading: pedidosQuery.isLoading,
    isError: pedidosQuery.isError,
    agora,
    dias,
    ultimaSync,
    sincronizando,
    sincronizar,
    recarregar,
  };
}

/**
 * Modo TV: tela cheia nativa + esconde a navegação do app (o Layout escuta "pe-panel-mode").
 * Sair da tela cheia pelo Esc também desliga o modo.
 */
export function useModoTV() {
  const [ativo, setAtivo] = useState(false);

  useEffect(() => {
    window.dispatchEvent(new CustomEvent('pe-panel-mode', { detail: ativo }));
    return () => {
      window.dispatchEvent(new CustomEvent('pe-panel-mode', { detail: false }));
    };
  }, [ativo]);

  useEffect(() => {
    const mudou = () => {
      if (!document.fullscreenElement) setAtivo(false);
    };
    document.addEventListener('fullscreenchange', mudou);
    return () => document.removeEventListener('fullscreenchange', mudou);
  }, []);

  const entrar = useCallback(async () => {
    setAtivo(true);
    try {
      await document.documentElement.requestFullscreen();
    } catch {
      /* O modo TV funciona mesmo sem tela cheia nativa. */
    }
  }, []);

  const sair = useCallback(async () => {
    setAtivo(false);
    if (document.fullscreenElement) await document.exitFullscreen().catch(() => {});
  }, []);

  return { ativo, entrar, sair };
}
