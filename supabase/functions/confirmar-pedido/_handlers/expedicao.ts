export async function criarExpedicao(supabase: any, pedido: any) {
  await supabase.from('expedicao').insert({
    pedido_id: pedido.id,
    nome_destinatario: pedido.cliente_nome,
    cep_destino: pedido.cliente_cep,
    endereco_completo: [
      pedido.cliente_endereco,
      pedido.cliente_numero,
      pedido.cliente_complemento,
      pedido.cliente_bairro,
      pedido.cliente_cidade,
      pedido.cliente_estado,
    ].filter(Boolean).join(', '),
    tipo_caixa: pedido.embalagem || 'Comum',
    brindes: pedido.brindes,
    observacoes: pedido.observacao,
    status: 'aguardando',
  });
  console.log(`[expedicao] Registro criado para pedido ${pedido.numero_pedido}`);
}
