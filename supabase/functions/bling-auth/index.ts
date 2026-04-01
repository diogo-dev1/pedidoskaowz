import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { corsHeaders } from "https://esm.sh/@supabase/supabase-js@2/cors";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  const BLING_CLIENT_ID = Deno.env.get("BLING_CLIENT_ID");
  const BLING_CLIENT_SECRET = Deno.env.get("BLING_CLIENT_SECRET");
  const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
  const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

  if (!BLING_CLIENT_ID || !BLING_CLIENT_SECRET) {
    return new Response(JSON.stringify({ error: "Bling credentials not configured" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  try {
    const { code, refresh_token } = await req.json();
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    let tokenResponse;

    if (code) {
      // Exchange authorization code for tokens
      const credentials = btoa(`${BLING_CLIENT_ID}:${BLING_CLIENT_SECRET}`);
      tokenResponse = await fetch("https://www.bling.com.br/Api/v3/oauth/token", {
        method: "POST",
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
          "Authorization": `Basic ${credentials}`,
        },
        body: new URLSearchParams({
          grant_type: "authorization_code",
          code,
        }),
      });
    } else if (refresh_token) {
      // Refresh expired token
      const credentials = btoa(`${BLING_CLIENT_ID}:${BLING_CLIENT_SECRET}`);
      tokenResponse = await fetch("https://www.bling.com.br/Api/v3/oauth/token", {
        method: "POST",
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
          "Authorization": `Basic ${credentials}`,
        },
        body: new URLSearchParams({
          grant_type: "refresh_token",
          refresh_token,
        }),
      });
    } else {
      return new Response(JSON.stringify({ error: "code or refresh_token required" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (!tokenResponse.ok) {
      const errBody = await tokenResponse.text();
      console.error("Bling token error:", errBody);
      return new Response(JSON.stringify({ error: "Failed to get Bling token", details: errBody }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const tokenData = await tokenResponse.json();
    const expiresAt = new Date(Date.now() + tokenData.expires_in * 1000).toISOString();

    // Delete old tokens and insert new one
    await supabase.from("bling_tokens").delete().neq("id", "00000000-0000-0000-0000-000000000000");

    const { error: insertError } = await supabase.from("bling_tokens").insert({
      access_token: tokenData.access_token,
      refresh_token: tokenData.refresh_token,
      expires_at: expiresAt,
    });

    if (insertError) {
      console.error("Error saving token:", insertError);
      return new Response(JSON.stringify({ error: "Failed to save token" }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ success: true, expires_at: expiresAt }), {
      status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Bling auth error:", error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
