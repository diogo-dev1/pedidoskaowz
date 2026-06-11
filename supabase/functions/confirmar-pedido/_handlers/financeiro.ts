export async function registrarFinanceiro(supabase: any, pedido: any) {
  await supabase.from('financeiro_recebimentos').insert({
    pedido_id: pedido.id,
    valor: pedido.valor_total,
    forma_pagamento: pedido.forma_pagamento,
    status: 'pendente',
  });
  console.log(`[financeiro] Conta a receber criada: R$ ${pedido.valor_total}`);
}
