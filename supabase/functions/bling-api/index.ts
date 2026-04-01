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
        "Authorization": `Basic ${credentials}`,
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

async function fetchAllPages(accessToken: string, endpoint: string, params: Record<string, string>) {
  const allData: any[] = [];
  let page = 1;
  const limite = 100;

  while (true) {
    const url = new URL(`${BLING_API_BASE}/${endpoint}`);
    for (const [key, value] of Object.entries(params)) {
      if (key !== 'pagina' && key !== 'limite' && key !== 'paginate') {
        url.searchParams.set(key, String(value));
      }
    }
    url.searchParams.set('pagina', String(page));
    url.searchParams.set('limite', String(limite));

    const response = await fetch(url.toString(), {
      method: "GET",
      headers: {
        "Authorization": `Bearer ${accessToken}`,
        "Content-Type": "application/json",
        "Accept": "application/json",
      },
    });

    if (!response.ok) break;

    const result = await response.json();
    const items = result?.data || [];
    allData.push(...items);

    // If we got fewer than the limit, we've reached the last page
    if (items.length < limite) break;
    
    page++;
    // Safety limit to avoid infinite loops
    if (page > 50) break;
  }

  return allData;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
  const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

  try {
    const { endpoint, method = "GET", params = {}, body, paginate = false } = await req.json();

    if (!endpoint) {
      return new Response(JSON.stringify({ error: "endpoint is required" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
    const accessToken = await getValidToken(supabase);

    // If paginate=true, fetch all pages automatically
    if (paginate && method === "GET") {
      const allData = await fetchAllPages(accessToken, endpoint, params);
      return new Response(JSON.stringify({ data: allData }), {
        status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Standard single-page request
    const url = new URL(`${BLING_API_BASE}/${endpoint}`);
    for (const [key, value] of Object.entries(params)) {
      url.searchParams.set(key, String(value));
    }

    const fetchOptions: RequestInit = {
      method,
      headers: {
        "Authorization": `Bearer ${accessToken}`,
        "Content-Type": "application/json",
        "Accept": "application/json",
      },
    };

    if (body && method !== "GET") {
      fetchOptions.body = JSON.stringify(body);
    }

    const response = await fetch(url.toString(), fetchOptions);
    const data = await response.json();

    if (!response.ok) {
      return new Response(JSON.stringify({ error: "Bling API error", status: response.status, data }), {
        status: response.status, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify(data), {
      status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Bling API proxy error:", error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
