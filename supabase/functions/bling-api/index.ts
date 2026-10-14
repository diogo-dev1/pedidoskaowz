import { authenticatedRequest } from "../_shared/auth.ts";
import { getValidToken, blingFetch } from "../_shared/bling.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { corsHeaders } from "https://esm.sh/@supabase/supabase-js@2/cors";

const BLING_API_BASE = "https://api.bling.com.br/Api/v3";

async function fetchWithRetry(url: string, options: RequestInit, retries = 3, delay = 1000): Promise<Response> {
  const response = await blingFetch(url, options);
  if (response.status === 429 && retries > 0) {
    console.warn(`Rate limit hit. Retrying in ${delay}ms... (${retries} retries left)`);
    await new Promise(resolve => setTimeout(resolve, delay));
    return fetchWithRetry(url, options, retries - 1, delay * 2);
  }
  return response;
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

    const response = await fetchWithRetry(url.toString(), {
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

    if (items.length < limite) break;
    
    page++;
    if (page > 50) break;

    // Delay between pages to respect rate limit (3 req/s)
    await new Promise(resolve => setTimeout(resolve, 400));
  }

  return allData;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  if (!await authenticatedRequest(req)) return new Response(JSON.stringify({ error: 'Faça login para continuar' }), { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });

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

    const response = await fetchWithRetry(url.toString(), fetchOptions);
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
