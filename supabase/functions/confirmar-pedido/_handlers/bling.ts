const BLING_API_BASE = "https://www.bling.com.br/Api/v3";

async function getValidToken(supabase: any) {
  const { data: tokens, error } = await supabase
    .from("bling_tokens")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(1);

  if (error || !tokens?.length) throw new Error("Token Bling não encontrado");

  const token = tokens[0];
  const now = new Date();
  const expiresAt = new Date(token.expires_at);

  if (expiresAt.getTime() - now.getTime() < 5 * 60 * 1000) {
    const BLING_CLIENT_ID = Deno.env.get("BLING_CLIENT_ID")!;
    const BLING_CLIENT_SECRET = Deno.env.get("BLING_CLIENT_SECRET")!;
    const credentials = btoa(`${BLING_CLIENT_ID}:${BLING_CLIENT_SECRET}`);

    const res = await fetch(`${BLING_API_BASE}/oauth/token`, {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
        "Authorization": `Basic ${credentials}`,
      },
      body: new URLSearchParams({
        grant_type: "refresh_token",
        refresh_token: token.refresh_token,
      }),
    });

    if (!res.ok) throw new Error(`Refresh token falhou: ${await res.text()}`);
    const newToken = await res.json();

    await supabase.from("bling_tokens").delete().neq("id", "00000000-0000-0000-0000-000000000000");
    await supabase.from("bling_tokens").insert({
      access_token: newToken.access_token,
      refresh_token: newToken.refresh_token,
      expires_at: new Date(Date.now() + newToken.expires_in * 1000).toISOString(),
    });

    return newToken.access_token;
  }

  return token.access_token;
}

async function blingRequest(accessToken: string, endpoint: string, method: string, body?: any) {
  const url = `${BLING_API_BASE}/${endpoint}`;
  const options: RequestInit = {
    method,
    headers: {
      "Authorization": `Bearer ${accessToken}`,
      "Content-Type": "application/json",
      "Accept": "application/json",
    },
  };
  if (body && method !== "GET") options.body = JSON.stringify(body);

  const res = await fetch(url, options);
  const data = await res.json();
  if (!res.ok) {
    console.error(`[bling] ${method} ${endpoint} → ${res.status}:`, JSON.stringify(data));
    throw new Error(`Bling ${endpoint} erro ${res.status}: ${JSON.stringify(data?.error || data)}`);
  }
  return data;
}

async function buscarOuCriarContato(accessToken: string, supabase: any, pedido: any): Promise<number> {
  // Buscar contato existente pelo CPF ou nome
  if (pedido.cliente_cpf) {
    const busca = await blingRequest(accessToken, `contatos?pesquisa=${encodeURIComponent(pedido.cliente_cpf)}&limite=1`, "GET");
    if (busca?.data?.length > 0) {
      const contatoId = busca.data[0].id;
      console.log(`[bling] Contato encontrado: ${contatoId}`);
      return contatoId;
    }
  }

  // Criar contato novo
  const tipoPessoa = pedido.cliente_cpf && pedido.cliente_cpf.length > 14 ? "J" : "F";
  const contato = {
    nome: pedido.cliente_nome,
    tipoPessoa,
    numeroDocumento: pedido.cliente_cpf || "",
    telefone: pedido.cliente_celular || "",
    email: pedido.cliente_email || "",
    endereco: {
      endereco: pedido.cliente_endereco || "",
      numero: pedido.cliente_numero || "",
      complemento: pedido.cliente_complemento || "",
      bairro: pedido.cliente_bairro || "",
      cep: pedido.cliente_cep?.replace(/\D/g, "") || "",
      municipio: pedido.cliente_cidade || "",
      uf: pedido.cliente_estado || "",
    },
  };

  const resultado = await blingRequest(accessToken, "contatos", "POST", contato);
  const novoId = resultado?.data?.id;
  console.log(`[bling] Contato criado: ${novoId}`);

  // Salvar no banco
  if (novoId) {
    await supabase.from("bling_contatos").upsert({
      bling_id: novoId,
      nome: pedido.cliente_nome,
      cpf_cnpj: pedido.cliente_cpf || null,
      email: pedido.cliente_email || null,
      telefone: pedido.cliente_celular || null,
    }, { onConflict: "bling_id" });
  }

  return novoId;
}

export async function criarNoBling(supabase: any, pedido: any, itens: any[]) {
  try {
    const accessToken = await getValidToken(supabase);

    // 1. Buscar ou criar contato
    const contatoId = await buscarOuCriarContato(accessToken, supabase, pedido);

    // 2. Montar itens do pedido de venda
    const itensBling = itens.map((item, idx) => {
      const descricao = [
        item.modelo,
        item.aco ? `Aço: ${item.aco}` : null,
        item.acabamento ? `Acabamento: ${item.acabamento}` : null,
        item.empunhadura ? `Empunhadura: ${item.empunhadura}` : null,
        item.bainha ? `Bainha: ${item.bainha}` : null,
        item.cor_bainha ? `Cor: ${item.cor_bainha}` : null,
        item.texto_laser && item.texto_laser !== '-' ? `Laser: ${item.texto_laser}` : null,
      ].filter(Boolean).join(' | ');

      return {
        codigo: `KWZ-ITEM-${idx + 1}`,
        descricao,
        unidade: "UN",
        quantidade: item.quantidade || 1,
        valor: item.preco_unitario || 0,
      };
    });

    // 3. Criar pedido de venda
    const pedidoVenda = {
      numero: 0,
      data: new Date().toISOString().split("T")[0],
      contato: { id: contatoId },
      itens: itensBling.map(item => ({
        codigo: item.codigo,
        descricao: item.descricao,
        unidade: item.unidade,
        quantidade: item.quantidade,
        valor: item.valor,
      })),
      observacoes: [
        pedido.numero_pedido,
        pedido.observacao || "",
        pedido.embalagem ? `Embalagem: ${pedido.embalagem}` : "",
        pedido.brindes ? `Brindes: ${pedido.brindes}` : "",
      ].filter(Boolean).join(" | "),
      observacoesInternas: `Pedido ${pedido.numero_pedido} - Prazo: ${pedido.prazo_entrega || "-"}`,
    };

    const resultado = await blingRequest(accessToken, "pedidos/vendas", "POST", pedidoVenda);
    const blingPedidoId = resultado?.data?.id;

    console.log(`[bling] Pedido de venda criado: ${blingPedidoId}`);

    // 4. Salvar ID do Bling no pedido
    if (blingPedidoId) {
      await supabase
        .from("pedidos")
        .update({ bling_pedido_id: blingPedidoId, bling_contato_id: contatoId })
        .eq("id", pedido.id);

      await supabase.from("bling_pedidos").upsert({
        bling_id: blingPedidoId,
        pedido_id: pedido.id,
        numero_pedido: pedido.numero_pedido,
        status: "em_aberto",
        valor_total: pedido.valor_total,
      }, { onConflict: "bling_id" });
    }

  } catch (error) {
    console.error(`[bling] Erro ao criar pedido ${pedido.numero_pedido}:`, error);
    throw error;
  }
}
