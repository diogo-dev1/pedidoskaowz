import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { SEED, normalizarData, type SimuladorData } from '@/lib/simuladorData';

export const SIMULADOR_CONFIG_CHAVE = 'default';

/**
 * Lê a config de preços do Simulador do Supabase (tabela singleton
 * simulador_precos_config). Cai para o SEED da planilha se a tabela ainda
 * não existir/estiver vazia, então o Simulador nunca fica sem valores.
 */
export function useSimuladorConfig() {
  const query = useQuery({
    queryKey: ['simulador-precos-config'],
    queryFn: async (): Promise<SimuladorData> => {
      const { data, error } = await supabase
        .from('simulador_precos_config')
        .select('dados')
        .eq('chave', SIMULADOR_CONFIG_CHAVE)
        .maybeSingle();
      // Sem tabela/linha ainda → usa o SEED (não quebra o simulador)
      if (error || !data?.dados) return SEED;
      return normalizarData(data.dados);
    },
    staleTime: 60_000,
  });

  return {
    data: query.data ?? SEED,
    isLoading: query.isLoading,
    isError: query.isError,
    refetch: query.refetch,
  };
}
