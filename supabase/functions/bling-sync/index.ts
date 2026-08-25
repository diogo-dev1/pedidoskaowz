import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { corsHeaders } from "https://esm.sh/@supabase/supabase-js@2/cors";

const BLING_API_BASE = "https://www.bling.com.br/Api/v3";
const THROTTLE_MS = 400; // ~2.5 req/s — limite do Bling é 3 req/s

async function getValidToken(supabase: any) {
  const { data: tokens, error } = await supabase
    .from("bling_tokens")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(1);

  if (error || !tokens?.length) {
    throw new Error("No Bling token found. Please authorize first.");
  }

  const token = tokens[0];
  const now = new Date();
  const expiresAt = new Date(token.expires_at);

  if (expiresAt.getTime() - now.getTime() < 5 * 60 * 1000) {
    const BLING_CLIENT_ID = Deno.env.get("BLING_CLIENT_ID")!;
    const BLING_CLIENT_SECRET = Deno.env.get("BLING_CLIENT_SECRET")!;
    const credentials = btoa(`${BLING_CLIENT_ID}:${BLING_CLIENT_SECRET}`);

    const refreshResponse = await fetch(`${BLING_API_BASE}/oauth/token`, {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
        Authorization: `Basic ${credentials}`,
      },
      body: new URLSearchParams({
        grant_type: "refresh_token",
        refresh_token: token.refresh_token,
      }),
    });

    if (!refreshResponse.ok) {
      const err = await refreshResponse.text();
      throw new Error(`Token refresh failed: ${err}`);
    }

    const newToken = await refreshResponse.json();
    const newExpiresAt = new Date(Date.now() + newToken.expires_in * 1000).toISOString();

    await supabase.from("bling_tokens").delete().neq("id", "00000000-0000-0000-0000-000000000000");
    await supabase.from("bling_tokens").insert({
      access_token: newToken.access_token,
      refresh_token: newToken.refresh_token,
      expires_at: newExpiresAt,
    });

    return newToken.access_token;
  }

  return token.access_token;
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

async function fetchWithRetry(url: string, options: RequestInit, retries = 3, delay = 1000): Promise<Response> {
  const response = await fetch(url, options);
  if (response.status === 429 && retries > 0) {
    console.warn(`Rate limit hit. Retrying in ${delay}ms...`);
    await sleep(delay);
    return fetchWithRetry(url, options, retries - 1, delay * 2);
  }
  return response;
}

class BlingHttpError extends Error {
  constructor(public status: number, public body: string) {
    super(`Bling HTTP ${status}: ${body.slice(0, 300)}`);
  }
}

async function fetchAllPages(
  accessToken: string,
  endpoint: string,
  params: Record<string, string> = {},
  onProgress?: (registros: number, pagina: number) => void,
) {
  const allData: any[] = [];
  let page = 1;
  const limite = 100;

  while (true) {
    const url = new URL(`${BLING_API_BASE}/${endpoint}`);
    for (const [key, value] of Object.entries(params)) {
      url.searchParams.set(key, String(value));
    }
    url.searchParams.set("pagina", String(page));
    url.searchParams.set("limite", String(limite));

    const response = await fetchWithRetry(url.toString(), {
      method: "GET",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
        Accept: "application/json",
      },
    });

    if (!response.ok) {
      const body = await response.text();
      // 404 na paginação = fim dos resultados no Bling
      if (response.status === 404) break;
      throw new BlingHttpError(response.status, body);
    }

    const result = await response.json();
    const items = result?.data || [];
    allData.push(...items);
    onProgress?.(allData.length, page);

    if (items.length < limite) break;
    page++;
    if (page > 100) break;

    await sleep(THROTTLE_MS);
  }

  return allData;
}

async function fetchOrderDetail(accessToken: string, orderId: string) {
  const url = `${BLING_API_BASE}/pedidos/vendas/${orderId}`;
  const response = await fetchWithRetry(url, {
    method: "GET",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
      Accept: "application/json",
    },
  });

  if (!response.ok) return null;
  const result = await response.json();
  return result?.data || null;
}

// ── Canal de origem ──────────────────────────────────────────────────────────
function normalizarCanal(lojaId: number | null, lojas: Map<number, { nome: string | null; canal: string | null }>) {
  if (!lojaId) return "manual";
  const loja = lojas.get(lojaId);
  if (loja?.canal) return loja.canal;
  if (loja?.nome) return loja.nome;
  return "site";
}

async function carregarLojas(supabase: any, accessToken: string) {
  const mapa = new Map<number, { nome: string | null; canal: string | null }>();
  try {
    const lojas = await fetchAllPages(accessToken, "lojas");
    for (const l of lojas) {
      const nome: string | null = l?.descricao || l?.nome || null;
      const canal = nome && /shopify|site|loja/i.test(nome) ? "site" : nome;
      mapa.set(Number(l.id), { nome, canal });
      await supabase.from("bling_lojas").upsert(
        { id: Number(l.id), nome, canal_normalizado: canal, updated_at: new Date().toISOString() },
        { onConflict: "id" },
      );
    }
  } catch (e) {
    console.warn(`[bling-sync] Não foi possível carregar lojas: ${(e as Error).message}`);
    const { data } = await supabase.from("bling_lojas").select("*");
    for (const l of data ?? []) mapa.set(Number(l.id), { nome: l.nome, canal: l.canal_normalizado });
  }
  return mapa;
}

// ── Watermark ────────────────────────────────────────────────────────────────
async function lerWatermark(supabase: any, chave: string): Promise<Date | null> {
  const { data } = await supabase.from("bling_sync_state").select("ultimo_sync_em").eq("chave", chave).maybeSingle();
  return data?.ultimo_sync_em ? new Date(data.ultimo_sync_em) : null;
}

async function gravarWatermark(supabase: any, chave: string, quando: Date) {
  await supabase.from("bling_sync_state").upsert(
    { chave, ultimo_sync_em: quando.toISOString(), updated_at: new Date().toISOString() },
    { onConflict: "chave" },
  );
}

// Bling espera "YYYY-MM-DD HH:MM:SS" (horário do servidor Bling — usamos UTC-3)
function formatarDataBling(d: Date) {
  const local = new Date(d.getTime() - 3 * 3600_000);
  return local.toISOString().slice(0, 19).replace("T", " ");
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
  const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

  let logId: string | undefined;

  try {
    const body = req.method === "POST" ? await req.json().catch(() => ({})) : {};
    const syncType = body?.type || "full"; // "full" | "incremental" | "contatos" | "pedidos"
    const incremental = syncType === "incremental";
    const fazerContatos = ["full", "incremental", "contatos"].includes(syncType);
    const fazerPedidos = ["full", "incremental", "pedidos"].includes(syncType);
    const inicioExecucao = new Date();

    const { data: logEntry } = await supabase
      .from("bling_sync_log")
      .insert({ tipo: syncType, status: "running", progresso: {} })
      .select()
      .single();

    logId = logEntry?.id;
    const progresso: Record<string, unknown> = {};
    const atualizarProgresso = async (patch: Record<string, unknown>) => {
      Object.assign(progresso, patch);
      if (logId) await supabase.from("bling_sync_log").update({ progresso }).eq("id", logId);
    };

    const accessToken = await getValidToken(supabase);
    const lojas = await carregarLojas(supabase, accessToken);
    let totalRegistros = 0;
    const contatosTocados = new Set<number>();

    // ── Contatos ──────────────────────────────────────────────────────────────
    if (fazerContatos) {
      const wm = incremental ? await lerWatermark(supabase, "contatos") : null;
      // margem de segurança de 1h
      const desde = wm ? new Date(wm.getTime() - 3600_000) : null;
      const params: Record<string, string> = {};
      if (desde) params.dataAlteracaoInicial = formatarDataBling(desde);

      let contatos: any[] = [];
      try {
        contatos = await fetchAllPages(accessToken, "contatos", params, (n, p) =>
          atualizarProgresso({ contatos_registros: n, contatos_pagina: p }),
        );
      } catch (e) {
        if (e instanceof BlingHttpError && e.status === 400 && desde) {
          console.warn("[bling-sync] Filtro de alteração rejeitado em contatos — caindo para carga total");
          contatos = await fetchAllPages(accessToken, "contatos", {}, (n, p) =>
            atualizarProgresso({ contatos_registros: n, contatos_pagina: p }),
          );
        } else {
          throw e;
        }
      }

      console.log(`[bling-sync] ${contatos.length} contatos (${incremental ? "incremental" : "full"})`);

      for (const contato of contatos) {
        const row = {
          bling_id: contato.id,
          nome: contato.nome || null,
          fantasia: contato.fantasia || null,
          tipo: contato.tipo || contato.tipoPessoa || null,
          numero_documento: contato.numeroDocumento || null,
          email: contato.email || null,
          telefone: contato.telefone || null,
          celular: contato.celular || null,
          endereco: contato.endereco || {},
          dados_completos: contato,
        };
        await supabase.from("bling_contatos").upsert(row, { onConflict: "bling_id" });
        contatosTocados.add(Number(contato.id));
      }
      totalRegistros += contatos.length;
      await gravarWatermark(supabase, "contatos", inicioExecucao);
      await atualizarProgresso({ contatos_concluido: true, contatos_total: contatos.length });
    }

    // ── Pedidos ───────────────────────────────────────────────────────────────
    if (fazerPedidos) {
      const wm = incremental ? await lerWatermark(supabase, "pedidos") : null;
      const desde = wm ? new Date(wm.getTime() - 3600_000) : null;
      const params: Record<string, string> = {};
      if (desde) params.dataAlteracaoInicial = formatarDataBling(desde);

      let pedidos: any[] = [];
      try {
        pedidos = await fetchAllPages(accessToken, "pedidos/vendas", params, (n, p) =>
          atualizarProgresso({ pedidos_registros: n, pedidos_pagina: p }),
        );
      } catch (e) {
        if (e instanceof BlingHttpError && e.status === 400 && desde) {
          console.warn("[bling-sync] Filtro de alteração rejeitado em pedidos — caindo para carga total");
          pedidos = await fetchAllPages(accessToken, "pedidos/vendas", {}, (n, p) =>
            atualizarProgresso({ pedidos_registros: n, pedidos_pagina: p }),
          );
        } else {
          throw e;
        }
      }

      console.log(`[bling-sync] ${pedidos.length} pedidos (${incremental ? "incremental" : "full"})`);

      const batchSize = 3;
      for (let i = 0; i < pedidos.length; i += batchSize) {
        const batch = pedidos.slice(i, i + batchSize);
        const details = await Promise.all(batch.map((p: any) => fetchOrderDetail(accessToken, String(p.id))));

        for (let j = 0; j < batch.length; j++) {
          const pedido = batch[j];
          const detail = details[j] || pedido;
          const lojaId = Number(detail?.loja?.id ?? pedido?.loja?.id ?? 0) || null;
          const contatoId = pedido.contato?.id || detail?.contato?.id || null;

          const row = {
            bling_id: pedido.id,
            contato_bling_id: contatoId,
            numero: String(detail?.numero || pedido.numero || pedido.id),
            data: detail?.data || pedido.data || null,
            total: Number(detail?.total || pedido.total || 0),
            situacao: detail?.situacao?.valor || pedido.situacao?.valor || null,
            itens: detail?.itens || [],
            dados_completos: detail || pedido,
            loja_id: lojaId,
            canal: normalizarCanal(lojaId, lojas),
          };

          await supabase.from("bling_pedidos").upsert(row, { onConflict: "bling_id" });
          if (contatoId) contatosTocados.add(Number(contatoId));
        }

        await atualizarProgresso({ pedidos_processados: Math.min(i + batchSize, pedidos.length) });

        if (i + batchSize < pedidos.length) await sleep(1200);
      }
      totalRegistros += pedidos.length;
      await gravarWatermark(supabase, "pedidos", inicioExecucao);
      await atualizarProgresso({ pedidos_concluido: true, pedidos_total: pedidos.length });
    }

    // ── Métricas dos clientes tocados ─────────────────────────────────────────
    const ids = Array.from(contatosTocados);
    if (ids.length > 0) {
      // lotes para não estourar o tamanho do parâmetro
      for (let i = 0; i < ids.length; i += 500) {
        const { error } = await supabase.rpc("recalcular_metricas_clientes", {
          p_contato_ids: ids.slice(i, i + 500),
        });
        if (error) console.error("[bling-sync] Falha ao recalcular métricas:", error.message);
      }
      await atualizarProgresso({ metricas_recalculadas: ids.length });
    }

    if (logId) {
      await supabase
        .from("bling_sync_log")
        .update({
          status: "completed",
          total_registros: totalRegistros,
          finished_at: new Date().toISOString(),
          progresso,
        })
        .eq("id", logId);
    }

    return new Response(
      JSON.stringify({ success: true, total: totalRegistros, clientes_atualizados: ids.length, tipo: syncType }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (error) {
    console.error("Sync error:", error);

    // Watermark NÃO avança em caso de falha (só é gravado quando a etapa completa)
    if (logId) {
      await supabase
        .from("bling_sync_log")
        .update({ status: "failed", erro: (error as Error).message, finished_at: new Date().toISOString() })
        .eq("id", logId);
    } else {
      await supabase.from("bling_sync_log").insert({
        tipo: "error",
        status: "failed",
        erro: (error as Error).message,
        finished_at: new Date().toISOString(),
      });
    }

    return new Response(JSON.stringify({ error: (error as Error).message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
