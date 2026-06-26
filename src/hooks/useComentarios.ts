import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface Comentario {
  id: string;
  pedido_id: string;
  autor_id: string | null;
  autor_nome: string;
  texto: string;
  created_at: string;
}

export function useComentarios(pedidoId: string | null) {
  const qc = useQueryClient();
  const queryKey = ['comentarios', pedidoId];

  const query = useQuery({
    queryKey,
    enabled: !!pedidoId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('pedido_comentarios')
        .select('*')
        .eq('pedido_id', pedidoId!)
        .order('created_at', { ascending: true });
      if (error) throw error;
      return (data ?? []) as Comentario[];
    },
  });

  const addMutation = useMutation({
    mutationFn: async (params: { pedidoId: string; autorId: string | null; autorNome: string; texto: string }) => {
      const { error } = await supabase.from('pedido_comentarios').insert({
        pedido_id: params.pedidoId,
        autor_id: params.autorId,
        autor_nome: params.autorNome,
        texto: params.texto,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey });
    },
  });

  return { comentarios: query.data ?? [], isLoading: query.isLoading, addComentario: addMutation.mutateAsync, isAdding: addMutation.isPending };
}
