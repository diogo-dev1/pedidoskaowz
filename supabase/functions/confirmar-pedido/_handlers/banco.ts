export async function salvarNoBanco(supabase: any, payload: any) {
  const {
    nomeCompleto, cpf, email, celular, cep, estado, cidade, bairro,
    endereco, numero, complemento, dataNascimento,
    canal, formaPagamento, status, prazo, brindes, cupom, observacao,
    nomeCertificado, embalagem, valorTotal, vendedorId,
    laminas, produtosAdicionais,
  } = payload;

  // Detectar bloqueio de expedição pelo campo observacao
  const bloqueado = observacao?.toLowerCase().includes('somente depois') ||
                    observacao?.toLowerCase().includes('aguardando pagamento') ||
                    observacao?.toLowerCase().includes('pagar') && observacao?.toLowerCase().includes('pendente');

  // Gerar número do pedido
  const { data: numData, error: numError } = await supabase
    .rpc('gerar_numero_pedido');
  if (numError) throw new Error(`Erro ao gerar número: ${numError.message}`);
  const numeroPedido = numData;

  // Calcular prazo — usa prazo informado ou calcula +65 dias úteis
  let prazoEntrega = null;
  if (prazo && prazo !== '-') {
    // Converte DD/MM/YYYY para YYYY-MM-DD
    const partes = prazo.split('/');
    if (partes.length === 3) {
      prazoEntrega = `${partes[2]}-${partes[1]}-${partes[0]}`;
    }
  }
  if (!prazoEntrega) {
    const { data: prazoData } = await supabase.rpc('calcular_prazo_uteis', { dias: 65 });
    prazoEntrega = prazoData;
  }

  // INSERT pedido
  const { data: pedido, error: erroPedido } = await supabase
    .from('pedidos')
    .insert({
      numero_pedido: numeroPedido,
      vendedor_id: vendedorId || null,
      canal: canal || null,
      cliente_nome: nomeCompleto,
      cliente_cpf: cpf || null,
      cliente_email: email || null,
      cliente_celular: celular || null,
      cliente_cep: cep || null,
      cliente_estado: estado || null,
      cliente_cidade: cidade || null,
      cliente_bairro: bairro || null,
      cliente_endereco: endereco || null,
      cliente_numero: numero || null,
      cliente_complemento: complemento || null,
      cliente_nascimento: dataNascimento || null,
      valor_total: valorTotal ? parseFloat(String(valorTotal).replace(',', '.')) : null,
      forma_pagamento: formaPagamento || null,
      cupom: cupom || null,
      status: 'aguardando_triagem',
      prazo_entrega: prazoEntrega,
      nome_certificado: nomeCertificado || nomeCompleto,
      embalagem: embalagem || null,
      brindes: brindes || null,
      observacao: observacao || null,
      bloqueado_expedicao: bloqueado,
      motivo_bloqueio: bloqueado ? observacao : null,
    })
    .select()
    .single();

  if (erroPedido) throw new Error(`Erro ao salvar pedido: ${erroPedido.message}`);

  // INSERT itens (uma linha por lâmina)
  const itensParaSalvar = (laminas || []).map((lamina: any) => ({
    pedido_id: pedido.id,
    modelo: lamina.modelo?.nome_modelo || lamina.modelo || null,
    aco: lamina.aco?.nome_opcao || lamina.aco || null,
    acabamento: lamina.acabamento?.nome_opcao || lamina.acabamento || null,
    empunhadura: lamina.empunhadura?.nome_opcao || lamina.empunhadura || null,
    bainha: lamina.bainha?.nome_opcao || lamina.bainha || null,
    cor_bainha: lamina.corBainha || null,
    brute_forge: lamina.bruteForge || false,
    dragon_scale: lamina.dragonScale || false,
    texto_laser: lamina.textoLaser || null,
    embalagem_item: lamina.embalagem || null,
    observacoes_item: lamina.observacoesLamina || null,
    preco_unitario: lamina.subtotal || null,
    quantidade: lamina.quantidade || 1,
    status_laser: (lamina.textoLaser && lamina.textoLaser !== '-' && lamina.textoLaser !== 'Sem gravação')
      ? 'pendente' : 'nao_aplicavel',
  }));

  if (itensParaSalvar.length > 0) {
    const { error: erroItens } = await supabase
      .from('pedido_itens')
      .insert(itensParaSalvar);
    if (erroItens) throw new Error(`Erro ao salvar itens: ${erroItens.message}`);
  }

  const { data: itens } = await supabase
    .from('pedido_itens')
    .select('*')
    .eq('pedido_id', pedido.id);

  console.log(`Pedido ${pedido.numero_pedido} salvo com ${itens?.length || 0} itens`);
  return { pedido, itens: itens || [] };
}
