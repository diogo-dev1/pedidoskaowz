import { useQuery } from '@tanstack/react-query';
import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

export interface Lote {
  id: string;
  numero_lote: number;
  lote_id_semana: string | null;
  capacidade_max: number | null;
  total_pedidos: number | null;
  prazo_envio: string | null;
  status: string | null;
  created_at: string | null;
}

export function useLoteSelector() {
  const [selectedLoteId, setSelectedLoteId] = useState<string | null>(null);

  const { data: lotes = [], isLoading } = useQuery({
    queryKey: ['lotes'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('lotes')
        .select('*')
        .order('numero_lote', { ascending: false });
      if (error) throw error;
      return (data ?? []) as Lote[];
    },
  });

  useEffect(() => {
    if (!selectedLoteId && lotes.length > 0) {
      const aberto = lotes.find((l) => l.status === 'aberto');
      setSelectedLoteId((aberto || lotes[0]).id);
    }
  }, [lotes, selectedLoteId]);

  const selectedLote = lotes.find((l) => l.id === selectedLoteId) ?? null;

  return { lotes, selectedLote, selectedLoteId, setSelectedLoteId, isLoading };
}
