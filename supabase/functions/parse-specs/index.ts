import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

// Extract numeric cm value from text patterns like "20,5 cm" or "20.5 cm" or "20,5cm"
function extractCm(text: string, patterns: RegExp[]): number | null {
  for (const pattern of patterns) {
    const match = text.match(pattern);
    if (match) {
      // Handle comma as decimal separator
      const value = match[1].replace(',', '.');
      const num = parseFloat(value);
      if (!isNaN(num) && num > 0 && num < 200) return num;
    }
  }
  return null;
}

function parseSpecs(text: string): { comprimento_total: number | null; area_util_corte: number | null } {
  // Normalize: strip HTML tags for matching
  const clean = text.replace(/<[^>]+>/g, ' ').replace(/&nbsp;/g, ' ').replace(/\s+/g, ' ');

  const comprimentoPatterns = [
    /[Cc]omprimento\s*total[:\s]*(\d+[,.]?\d*)\s*cm/i,
    /(\d+[,.]?\d*)\s*cm\s*tota(?:is|l)/i,
    /(\d+[,.]?\d*)\s*cm\s*\(?[\d,.]+["'']\)?\s*$/im, // last measurement in specs often is total
  ];

  const fioCortePatterns = [
    /[Ff]io\s*de\s*corte\s*[uú]til[:\s]*(\d+[,.]?\d*)\s*cm/i,
    /[Áá]rea\s*[uú]til\s*(?:de\s*)?(?:fio\s*(?:de\s*)?)?corte[:\s]*(\d+[,.]?\d*)\s*cm/i,
    /[Ll][aâ]mina[:\s]*(\d+[,.]?\d*)\s*cm/i,
    /(\d+[,.]?\d*)\s*cm\s*de\s*l[aâ]mina/i,
    /(\d+[,.]?\d*)\s*cm\s*de\s*fio/i,
  ];

  return {
    comprimento_total: extractCm(clean, comprimentoPatterns),
    area_util_corte: extractCm(clean, fioCortePatterns),
  };
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
    });

    // Verify auth
    const token = authHeader.replace('Bearer ', '');
    const { data: claimsData, error: claimsError } = await supabase.auth.getClaims(token);
    if (claimsError || !claimsData?.claims) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    // Fetch all models with descriptions
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey);

    const { data: modelos, error } = await supabaseAdmin
      .from('catalogo_modelos')
      .select('id, nome_modelo, descricao_html, apresentacao_venda, comprimento_total, area_util_corte');

    if (error) throw error;

    let updated = 0;
    let skipped = 0;

    for (const modelo of (modelos || [])) {
      // Skip if already has values
      if (modelo.comprimento_total != null && modelo.area_util_corte != null) {
        skipped++;
        continue;
      }

      const text = modelo.descricao_html || modelo.apresentacao_venda || '';
      if (!text) { skipped++; continue; }

      const specs = parseSpecs(text);

      // Only update fields that are null
      const updateData: Record<string, number> = {};
      if (modelo.comprimento_total == null && specs.comprimento_total != null) {
        updateData.comprimento_total = specs.comprimento_total;
      }
      if (modelo.area_util_corte == null && specs.area_util_corte != null) {
        updateData.area_util_corte = specs.area_util_corte;
      }

      if (Object.keys(updateData).length > 0) {
        const { error: updateError } = await supabaseAdmin
          .from('catalogo_modelos')
          .update(updateData)
          .eq('id', modelo.id);

        if (updateError) {
          console.error(`Error updating ${modelo.nome_modelo}:`, updateError);
        } else {
          console.log(`Updated ${modelo.nome_modelo}: ${JSON.stringify(updateData)}`);
          updated++;
        }
      } else {
        skipped++;
      }
    }

    return new Response(
      JSON.stringify({ success: true, total: (modelos || []).length, updated, skipped }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : 'Unknown error';
    console.error('Parse specs error:', error);
    return new Response(JSON.stringify({ success: false, error: msg }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
