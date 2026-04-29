import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const SYSTEM_PROMPT = `You are a professional translator for a premium Brazilian knife brand (Kaowz).
Translate Portuguese product names and descriptions into natural, marketable English.
Keep technical terms (steel grades like SAE52100, finishes, dimensions in cm) intact.
Preserve ALL HTML tags, structure, classes and attributes EXACTLY in descriptions — translate only the visible text content.
Do NOT add commentary. Return only the translation.`;

async function translate(text: string, kind: 'name' | 'html', apiKey: string): Promise<string> {
  const userPrompt = kind === 'name'
    ? `Translate this product name to English (concise, brand-appropriate):\n\n${text}`
    : `Translate the visible text in this HTML to English. Keep all tags/attributes/classes intact:\n\n${text}`;

  const resp = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
    method: "POST",
    headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      model: "google/gemini-2.5-flash",
      messages: [
        { role: "system", content: SYSTEM_PROMPT },
        { role: "user", content: userPrompt },
      ],
    }),
  });
  if (!resp.ok) {
    const t = await resp.text();
    throw new Error(`AI ${resp.status}: ${t.slice(0, 200)}`);
  }
  const json = await resp.json();
  return (json.choices?.[0]?.message?.content || '').trim();
}

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });

  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
    const ANON = Deno.env.get('SUPABASE_ANON_KEY')!;
    const SERVICE = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    if (!LOVABLE_API_KEY) throw new Error('LOVABLE_API_KEY not configured');

    const sb = createClient(SUPABASE_URL, ANON, { global: { headers: { Authorization: authHeader } } });
    const { data: claims, error: cErr } = await sb.auth.getClaims(authHeader.replace('Bearer ', ''));
    if (cErr || !claims?.claims) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    const body = await req.json().catch(() => ({}));
    const { mode = 'missing', modelo_id } = body as { mode?: 'missing' | 'all' | 'single'; modelo_id?: string };

    const admin = createClient(SUPABASE_URL, SERVICE);

    let query = admin.from('catalogo_modelos').select('id, nome_modelo, descricao_html, nome_modelo_en, descricao_html_en');
    if (mode === 'single' && modelo_id) query = query.eq('id', modelo_id);
    const { data: models, error } = await query;
    if (error) throw error;

    let translated = 0;
    let skipped = 0;
    let failed = 0;
    const errors: string[] = [];

    for (const m of (models || [])) {
      try {
        const needName = !m.nome_modelo_en || mode === 'all';
        const needDesc = (!!m.descricao_html && (!m.descricao_html_en || mode === 'all'));
        if (!needName && !needDesc) { skipped++; continue; }

        const updates: Record<string, string> = {};
        if (needName && m.nome_modelo) {
          updates.nome_modelo_en = await translate(m.nome_modelo, 'name', LOVABLE_API_KEY);
          await new Promise(r => setTimeout(r, 400));
        }
        if (needDesc && m.descricao_html) {
          updates.descricao_html_en = await translate(m.descricao_html, 'html', LOVABLE_API_KEY);
          await new Promise(r => setTimeout(r, 400));
        }
        if (Object.keys(updates).length > 0) {
          const { error: uErr } = await admin.from('catalogo_modelos').update(updates).eq('id', m.id);
          if (uErr) throw uErr;
          translated++;
        } else {
          skipped++;
        }
      } catch (e) {
        failed++;
        errors.push(`${m.nome_modelo}: ${e instanceof Error ? e.message : 'err'}`);
        if (errors.length >= 5) break;
      }
    }

    return new Response(
      JSON.stringify({ success: true, total: models?.length || 0, translated, skipped, failed, errors }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (e) {
    console.error('translate-products error:', e);
    return new Response(
      JSON.stringify({ success: false, error: e instanceof Error ? e.message : 'unknown' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
