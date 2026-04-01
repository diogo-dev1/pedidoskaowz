import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { corsHeaders } from "https://esm.sh/@supabase/supabase-js@2/cors";

const BLING_API_BASE = "https://www.bling.com.br/Api/v3";

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

async function fetchWithRetry(url: string, options: RequestInit, retries = 3, delay = 1000): Promise<Response> {
  const response = await fetch(url, options);
  if (response.status === 429 && retries > 0) {
    console.warn(`Rate limit hit. Retrying in ${delay}ms...`);
    await new Promise((resolve) => setTimeout(resolve, delay));
    return fetchWithRetry(url, options, retries - 1, delay * 2);
  }
  return response;
}

async function fetchAllPages(accessToken: string, endpoint: string, params: Record<string, string> = {}) {
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

    if (!response.ok) break;

    const result = await response.json();
    const items = result?.data || [];
    allData.push(...items);

    if (items.length < limite) break;
    page++;
    if (page > 100) break;

    // Respect 3 req/s limit
    await new Promise((resolve) => setTimeout(resolve, 500));
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

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
  const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

  try {
    const body = req.method === "POST" ? await req.json().catch(() => ({})) : {};
    const syncType = body?.type || "full"; // "full", "contatos", "pedidos"

    // Create sync log entry
    const { data: logEntry } = await supabase
      .from("bling_sync_log")
      .insert({ tipo: syncType, status: "running" })
      .select()
      .single();

    const logId = logEntry?.id;

    const accessToken = await getValidToken(supabase);
    let totalRegistros = 0;

    // Sync contacts
    if (syncType === "full" || syncType === "contatos") {
      console.log("Syncing contacts...");
      const contatos = await fetchAllPages(accessToken, "contatos");
      console.log(`Fetched ${contatos.length} contacts`);

      for (const contato of contatos) {
        const row = {
          bling_id: contato.id,
          nome: contato.nome || null,
          fantasia: contato.fantasia || null,
          tipo: contato.tipo || null,
          numero_documento: contato.numeroDocumento || null,
          email: contato.email || null,
          telefone: contato.telefone || null,
          celular: contato.celular || null,
          endereco: contato.endereco || {},
          dados_completos: contato,
        };

        await supabase.from("bling_contatos").upsert(row, { onConflict: "bling_id" });
      }
      totalRegistros += contatos.length;
    }

    // Sync orders
    if (syncType === "full" || syncType === "pedidos") {
      console.log("Syncing orders...");
      const pedidos = await fetchAllPages(accessToken, "pedidos/vendas");
      console.log(`Fetched ${pedidos.length} orders`);

      // Fetch details in batches to get items
      const batchSize = 3;
      for (let i = 0; i < pedidos.length; i += batchSize) {
        const batch = pedidos.slice(i, i + batchSize);
        const details = await Promise.all(
          batch.map((p: any) => fetchOrderDetail(accessToken, String(p.id)))
        );

        for (let j = 0; j < batch.length; j++) {
          const pedido = batch[j];
          const detail = details[j] || pedido;

          const row = {
            bling_id: pedido.id,
            contato_bling_id: pedido.contato?.id || detail?.contato?.id || null,
            numero: String(detail?.numero || pedido.numero || pedido.id),
            data: detail?.data || pedido.data || null,
            total: Number(detail?.total || pedido.total || 0),
            situacao: detail?.situacao?.valor || pedido.situacao?.valor || null,
            itens: detail?.itens || [],
            dados_completos: detail || pedido,
          };

          await supabase.from("bling_pedidos").upsert(row, { onConflict: "bling_id" });
        }

        // Respect rate limit between batches
        if (i + batchSize < pedidos.length) {
          await new Promise((resolve) => setTimeout(resolve, 1200));
        }
      }
      totalRegistros += pedidos.length;
    }

    // Update sync log
    if (logId) {
      await supabase.from("bling_sync_log").update({
        status: "completed",
        total_registros: totalRegistros,
        finished_at: new Date().toISOString(),
      }).eq("id", logId);
    }

    return new Response(
      JSON.stringify({ success: true, total: totalRegistros }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Sync error:", error);

    // Log failure
    await supabase.from("bling_sync_log").insert({
      tipo: "error",
      status: "failed",
      erro: error.message,
      finished_at: new Date().toISOString(),
    });

    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
