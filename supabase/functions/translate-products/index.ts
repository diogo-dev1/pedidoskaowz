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

  const ctrl = new AbortController();
  const timeoutId = setTimeout(() => ctrl.abort(), 45_000); // 45s per call
  try {
    const resp = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
      signal: ctrl.signal,
      body: JSON.stringify({
        model: "google/gemini-2.5-flash-lite",
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
  } finally {
    clearTimeout(timeoutId);
  }
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

    const BATCH_LIMIT = mode === 'single' ? 1 : 8;
    const CONCURRENCY = 5;

    let query = admin.from('catalogo_modelos').select('id, nome_modelo, descricao_html, nome_modelo_en, descricao_html_en');
    if (mode === 'single' && modelo_id) query = query.eq('id', modelo_id);
    if (mode === 'missing') query = query.or('nome_modelo_en.is.null,descricao_html_en.is.null');
    const { data: allModels, error } = await query;
    if (error) throw error;

    const candidates = (allModels || []).filter(m => {
      const needName = !m.nome_modelo_en || mode === 'all';
      const needDesc = (!!m.descricao_html && (!m.descricao_html_en || mode === 'all'));
      return needName || needDesc;
    });

    const batch = candidates.slice(0, BATCH_LIMIT);
    const remaining = Math.max(0, candidates.length - batch.length);

    let translated = 0;
    let failed = 0;
    const errors: string[] = [];

    const processOne = async (m: any) => {
      try {
        const needName = !m.nome_modelo_en || mode === 'all';
        const needDesc = (!!m.descricao_html && (!m.descricao_html_en || mode === 'all'));
        const updates: Record<string, string> = {};
        const tasks: Promise<void>[] = [];
        if (needName && m.nome_modelo) {
          tasks.push(translate(m.nome_modelo, 'name', LOVABLE_API_KEY).then(v => { updates.nome_modelo_en = v; }));
        }
        if (needDesc && m.descricao_html) {
          tasks.push(translate(m.descricao_html, 'html', LOVABLE_API_KEY).then(v => { updates.descricao_html_en = v; }));
        }
        await Promise.all(tasks);
        if (Object.keys(updates).length > 0) {
          const { error: uErr } = await admin.from('catalogo_modelos').update(updates).eq('id', m.id);
          if (uErr) throw uErr;
          translated++;
        }
      } catch (e) {
        failed++;
        if (errors.length < 5) errors.push(`${m.nome_modelo}: ${e instanceof Error ? e.message : 'err'}`);
      }
    };

    // Run with concurrency
    for (let i = 0; i < batch.length; i += CONCURRENCY) {
      await Promise.all(batch.slice(i, i + CONCURRENCY).map(processOne));
    }

    const skipped = (allModels?.length || 0) - candidates.length;

    return new Response(
      JSON.stringify({ success: true, total: allModels?.length || 0, translated, skipped, failed, remaining, errors }),
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
