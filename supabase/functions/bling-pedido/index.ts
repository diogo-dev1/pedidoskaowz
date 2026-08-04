import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const BLING_API_BASE = "https://www.bling.com.br/Api/v3";
const NCM_PADRAO = Deno.env.get("BLING_NCM_PADRAO") || "82119100";
const ORIGEM_PADRAO = Number(Deno.env.get("BLING_ORIGEM_PADRAO") ?? 0);

async function getValidToken(supabase: any) {
  const { data: tokens, error } = await supabase
    .from("bling_tokens").select("*").order("created_at", { ascending: false }).limit(1);
  if (error || !tokens?.length) throw new Error("Token Bling não encontrado — conecte o Bling em /bling");

  const token = tokens[0];
  const expiresAt = new Date(token.expires_at);
  if (expiresAt.getTime() - Date.now() < 5 * 60 * 1000) {
    const credentials = btoa(`${Deno.env.get("BLING_CLIENT_ID")}:${Deno.env.get("BLING_CLIENT_SECRET")}`);
    const res = await fetch(`${BLING_API_BASE}/oauth/token`, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded", "Authorization": `Basic ${credentials}` },
      body: new URLSearchParams({ grant_type: "refresh_token", refresh_token: token.refresh_token }),
    });
    if (!res.ok) throw new Error(`Refresh token Bling falhou: ${await res.text()}`);
    const novo = await res.json();
    await supabase.from("bling_tokens").delete().neq("id", "00000000-0000-0000-0000-000000000000");
    await supabase.from("bling_tokens").insert({
      access_token: novo.access_token,
      refresh_token: novo.refresh_token,
      expires_at: new Date(Date.now() + novo.expires_in * 1000).toISOString(),
    });
    return novo.access_token;
  }
  return token.access_token;
}

async function blingRequest(accessToken: string, endpoint: string, method = "GET", body?: any) {
  const res = await fetch(`${BLING_API_BASE}/${endpoint}`, {
    method,
    headers: { "Authorization": `Bearer ${accessToken}`, "Content-Type": "application/json", "Accept": "application/json" },
    body: body ? JSON.stringify(body) : undefined,
  });
  const texto = await res.text();
  let json: any = null;
  try { json = texto ? JSON.parse(texto) : null; } catch { /* resposta não-JSON */ }
  if (!res.ok) {
    const detalhe = json?.error?.description
      || json?.error?.fields?.map((f: any) => `${f.element}: ${f.msg}`).join('; ')
      || texto?.slice(0, 400)
      || res.statusText;
    throw new Error(`Bling ${method} /${endpoint} → ${res.status}: ${detalhe}`);
  }
  return json;
}

function apenasDigitos(v: any) { return String(v ?? "").replace(/\D/g, ""); }

function cpfValido(cpf: string) {
  if (cpf.length !== 11 || /^(\d)\1+$/.test(cpf)) return false;
  let s = 0;
  for (let i = 0; i < 9; i++) s += parseInt(cpf[i]) * (10 - i);
  let d1 = (s * 10) % 11; if (d1 === 10) d1 = 0;
  if (d1 !== parseInt(cpf[9])) return false;
  s = 0;
  for (let i = 0; i < 10; i++) s += parseInt(cpf[i]) * (11 - i);
  let d2 = (s * 10) % 11; if (d2 === 10) d2 = 0;
  return d2 === parseInt(cpf[10]);
}

async function buscarOuCriarContato(accessToken: string, supabase: any, pedido: any) {
  const doc = apenasDigitos(pedido.cliente_cpf);
  if (doc) {
    try {
      const res = await blingRequest(accessToken, `contatos?numeroDocumento=${doc}`, "GET");
      const achado = res?.data?.[0]?.id;
      if (achado) return achado;
    } catch (_) { /* segue para criação */ }
  }

  const contato: any = { nome: pedido.cliente_nome, tipo: "F", situacao: "A", contribuinte: 9 };
  if (doc.length === 11 && cpfValido(doc)) contato.numeroDocumento = doc;
  const cel = apenasDigitos(pedido.cliente_celular);
  if (cel) { contato.celular = cel; contato.telefone = cel; }
  if (pedido.cliente_email) contato.email = pedido.cliente_email;
  if (pedido.cliente_endereco || pedido.cliente_cep) {
    contato.endereco = {
      geral: {
        endereco: pedido.cliente_endereco || "",
        numero: pedido.cliente_numero || "",
        complemento: pedido.cliente_complemento || "",
        bairro: pedido.cliente_bairro || "",
        cep: apenasDigitos(pedido.cliente_cep),
        municipio: pedido.cliente_cidade || "",
        uf: pedido.cliente_estado || "",
      },
    };
  }

  const resultado = await blingRequest(accessToken, "contatos", "POST", contato);
  const novoId = resultado?.data?.id;
  if (!novoId) throw new Error("Bling criou contato mas não retornou ID");
  return novoId;
}

const cacheProdutos = new Map<string, any | null>();
async function buscarProduto(accessToken: string, nome: string | null) {
  if (!nome) return null;
  const chave = nome.trim().toLowerCase();
  if (cacheProdutos.has(chave)) return cacheProdutos.get(chave)!;
  let encontrado: any | null = null;
  try {
    const res = await blingRequest(accessToken, `produtos?pesquisa=${encodeURIComponent(nome)}&limite=10&criterio=2`, "GET");
    const lista: any[] = res?.data ?? [];
    encontrado = lista.find(p => p.nome?.trim().toLowerCase() === chave)
      ?? lista.find(p => p.nome?.toLowerCase().includes(chave)) ?? null;
  } catch (_) { /* ignora */ }
  cacheProdutos.set(chave, encontrado);
  return encontrado;
}

async function buscarFormaPagamentoId(accessToken: string, nome: string | null) {
  if (!nome) return null;
  try {
    const res = await blingRequest(accessToken, "formas-pagamentos?situacao=1", "GET");
    const formas: any[] = res?.data ?? [];
    const alvo = nome.toLowerCase();
    return (formas.find(f => f.descricao?.toLowerCase() === alvo)
      ?? formas.find(f => f.descricao?.toLowerCase().includes(alvo)))?.id ?? null;
  } catch { return null; }
}

// ─── Ações ──────────────────────────────────────────────────────────────────

async function lancarPedidoVenda(supabase: any, pedido: any, itens: any[]) {
  const accessToken = await getValidToken(supabase);
  const contatoId = await buscarOuCriarContato(accessToken, supabase, pedido);

  const itensBling: any[] = [];
  for (const item of itens) {
    const descricao = [
      item.modelo,
      item.aco ? `Aço: ${item.aco}` : null,
      item.acabamento ? `Acabamento: ${item.acabamento}` : null,
      item.empunhadura ? `Empunhadura: ${item.empunhadura}` : null,
      item.bainha ? `Bainha: ${item.bainha}` : null,
      item.cor_bainha ? `Cor: ${item.cor_bainha}` : null,
      item.texto_laser && !['-', 'Sem gravação'].includes(item.texto_laser) ? `Laser: ${item.texto_laser}` : null,
    ].filter(Boolean).join(' | ');

    const produto = await buscarProduto(accessToken, item.modelo);
    const itemBling: any = {
      descricao: descricao || 'Item',
      unidade: produto?.unidade || "UN",
      quantidade: Number(item.quantidade) || 1,
      valor: Number(item.preco_unitario) || 0,
    };
    if (produto?.id) {
      itemBling.produto = { id: produto.id };
      if (produto.codigo) itemBling.codigo = produto.codigo;
    } else {
      itemBling.codigo = (item.modelo || 'ITEM').toUpperCase().replace(/[^A-Z0-9]+/g, '-').slice(0, 30);
      itemBling.ncm = NCM_PADRAO;
      itemBling.origem = ORIGEM_PADRAO;
    }
    itensBling.push(itemBling);
  }

  const hoje = new Date().toISOString().split("T")[0];
  const valorPedido = Number(pedido.valor_total) || itensBling.reduce((a, i) => a + i.valor * i.quantidade, 0);

  const pedidoVenda: any = {
    data: hoje,
    contato: { id: contatoId },
    itens: itensBling,
    observacoes: [
      pedido.numero_pedido,
      pedido.observacao || "",
      pedido.embalagem ? `Embalagem: ${pedido.embalagem}` : "",
      pedido.brindes ? `Brindes: ${pedido.brindes}` : "",
    ].filter(Boolean).join(" | "),
    observacoesInternas: `Pedido ${pedido.numero_pedido} - Prazo: ${pedido.prazo_entrega || "-"} - Pagamento: ${pedido.forma_pagamento || "-"}`,
  };
  if (pedido.prazo_entrega) pedidoVenda.dataPrevista = pedido.prazo_entrega;

  const formaPagId = await buscarFormaPagamentoId(accessToken, pedido.forma_pagamento);
  if (formaPagId && valorPedido > 0) {
    pedidoVenda.parcelas = [{ dataVencimento: hoje, valor: valorPedido, formaPagamento: { id: formaPagId } }];
  }

  const resultado = await blingRequest(accessToken, "pedidos/vendas", "POST", pedidoVenda);
  const blingPedidoId = resultado?.data?.id;
  if (!blingPedidoId) throw new Error("Bling criou pedido mas não retornou ID");

  await supabase.from("pedidos")
    .update({ bling_pedido_id: blingPedidoId, bling_contato_id: contatoId })
    .eq("id", pedido.id);

  await supabase.from("bling_pedidos").upsert({
    bling_id: blingPedidoId,
    numero: pedido.numero_pedido,
    data: hoje,
    total: valorPedido,
    situacao: "em_aberto",
    contato_bling_id: contatoId,
  }, { onConflict: "bling_id" });

  return { blingPedidoId, contatoId };
}

async function gerarNfe(supabase: any, pedido: any, enviarSefaz: boolean) {
  if (!pedido.bling_pedido_id) throw new Error("Lance o pedido de venda no Bling antes de gerar a NF-e");
  const accessToken = await getValidToken(supabase);
  const res = await blingRequest(accessToken, `pedidos/vendas/${pedido.bling_pedido_id}/gerar-nfe`, "POST");
  const nfeId = res?.data?.id;
  if (!nfeId) throw new Error("Bling não retornou o ID da NF-e");

  let enviada = false;
  if (enviarSefaz) {
    await blingRequest(accessToken, `nfe/${nfeId}/enviar`, "POST");
    enviada = true;
  }

  await supabase.from("pedidos").update({ bling_nfe_id: nfeId }).eq("id", pedido.id);
  return { nfeId, enviada };
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
  );

  const json = (body: any, status = 200) => new Response(JSON.stringify(body), {
    status, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });

  try {
    const { acao, pedidoId, pedido: edicoesPedido, itens: edicoesItens, enviarSefaz } = await req.json();
    if (!pedidoId) return json({ sucesso: false, erro: 'pedidoId é obrigatório' }, 400);

    // Aplica edições vindas do card antes de enviar ao Bling
    if (edicoesPedido && Object.keys(edicoesPedido).length) {
      const { error } = await supabase.from('pedidos').update(edicoesPedido).eq('id', pedidoId);
      if (error) return json({ sucesso: false, erro: `Erro ao salvar pedido: ${error.message}` }, 400);
    }
    if (Array.isArray(edicoesItens)) {
      for (const it of edicoesItens) {
        if (!it?.id) continue;
        const { id, ...campos } = it;
        const { error } = await supabase.from('pedido_itens').update(campos).eq('id', id).eq('pedido_id', pedidoId);
        if (error) return json({ sucesso: false, erro: `Erro ao salvar item: ${error.message}` }, 400);
      }
    }

    const { data: pedido, error: erroPedido } = await supabase
      .from('pedidos').select('*').eq('id', pedidoId).single();
    if (erroPedido || !pedido) return json({ sucesso: false, erro: 'Pedido não encontrado' }, 404);

    const { data: itens } = await supabase
      .from('pedido_itens').select('*').eq('pedido_id', pedidoId).order('created_at');

    if (acao === 'salvar') {
      return json({ sucesso: true, pedido, itens: itens ?? [] });
    }

    if (acao === 'lancar') {
      if (pedido.bling_pedido_id) {
        return json({ sucesso: false, erro: `Pedido já lançado no Bling (ID ${pedido.bling_pedido_id})`, blingPedidoId: pedido.bling_pedido_id }, 409);
      }
      const r = await lancarPedidoVenda(supabase, pedido, itens ?? []);
      return json({ sucesso: true, ...r });
    }

    if (acao === 'nfe') {
      const r = await gerarNfe(supabase, pedido, enviarSefaz === true);
      return json({ sucesso: true, ...r });
    }

    return json({ sucesso: false, erro: `Ação inválida: ${acao}` }, 400);
  } catch (e: any) {
    console.error('[bling-pedido] erro:', e?.message);
    return json({ sucesso: false, erro: e?.message ?? 'Erro desconhecido' }, 200);
  }
});
