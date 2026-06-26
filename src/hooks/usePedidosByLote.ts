import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface PedidoItem {
  id: string;
  pedido_id: string;
  modelo: string | null;
  aco: string | null;
  acabamento: string | null;
  empunhadura: string | null;
  bainha: string | null;
  cor_bainha: string | null;
  brute_forge: boolean | null;
  dragon_scale: boolean | null;
  texto_laser: string | null;
  posicao_laser: string | null;
  embalagem_item: string | null;
  observacoes_item: string | null;
  preco_unitario: number | null;
  quantidade: number | null;
  status_lamina: string | null;
  status_empunhadura: string | null;
  status_bainha: string | null;
  status_laser: string | null;
  certificado_id: string | null;
  created_at: string | null;
}

export interface PedidoComItens {
  id: string;
  numero_pedido: string;
  cliente_nome: string;
  cliente_cpf: string | null;
  cliente_email: string | null;
  cliente_celular: string | null;
  cliente_cep: string | null;
  cliente_estado: string | null;
  cliente_cidade: string | null;
  cliente_bairro: string | null;
  cliente_endereco: string | null;
  cliente_numero: string | null;
  cliente_complemento: string | null;
  cliente_nascimento: string | null;
  canal: string | null;
  forma_pagamento: string | null;
  valor_total: number | null;
  status: string | null;
  prazo_entrega: string | null;
  embalagem: string | null;
  brindes: string | null;
  observacao: string | null;
  bloqueado_expedicao: boolean | null;
  motivo_bloqueio: string | null;
  nome_certificado: string | null;
  cupom: string | null;
  lote_id: string | null;
  created_at: string | null;
  pedido_itens: PedidoItem[];
}

export function usePedidosByLote(loteId: string | null) {
  return useQuery({
    queryKey: ['pedidos-lote', loteId],
    enabled: !!loteId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('pedidos')
        .select('*, pedido_itens(*)')
        .eq('lote_id', loteId!)
        .order('cliente_nome');
      if (error) throw error;
      return (data ?? []) as PedidoComItens[];
    },
  });
}
