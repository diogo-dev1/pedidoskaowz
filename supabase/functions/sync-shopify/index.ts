import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

const API_VERSION = Deno.env.get('SHOPIFY_API_VERSION') ?? '2024-01';

// ─── Shopify Admin token (client_credentials com fallback) ──────────────────
let cachedToken: string | null = null;
let tokenExpiresAt = 0;

async function getShopifyAdminToken(shopDomain: string): Promise<string> {
  const clientId = Deno.env.get('SHOPIFY_CLIENT_ID');
  const clientSecret = Deno.env.get('SHOPIFY_CLIENT_SECRET');
  if (clientId && clientSecret) {
    if (cachedToken && Date.now() < tokenExpiresAt) return cachedToken;
    const res = await fetch(`https://${shopDomain}/admin/oauth/access_token`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ grant_type: 'client_credentials', client_id: clientId, client_secret: clientSecret }),
    });
    if (!res.ok) throw new Error(`Shopify token error [${res.status}]: ${await res.text()}`);
    const data = await res.json();
    cachedToken = data.access_token as string;
    const expiresIn = typeof data.expires_in === 'number' ? data.expires_in : 86400;
    tokenExpiresAt = Date.now() + Math.max(0, expiresIn - 60) * 1000;
    return cachedToken;
  }
  const staticToken = Deno.env.get('SHOPIFY_ACCESS_TOKEN');
  if (staticToken) return staticToken;
  throw new Error('Shopify Admin credentials not configured');
}

async function resolveShopDomain(): Promise<string> {
  const raw = Deno.env.get('SHOPIFY_SHOP') ?? Deno.env.get('SHOPIFY_STORE_URL');
  if (!raw) throw new Error('Shopify shop not configured');
  let domain = raw.replace(/^https?:\/\//, '').replace(/\/$/, '');
  if (!domain.endsWith('.myshopify.com')) {
    try {
      const metaRes = await fetch(`https://${domain}/meta.json`);
      if (metaRes.ok) {
        const meta = await metaRes.json();
        if (meta?.myshopify_domain) domain = meta.myshopify_domain;
      }
    } catch (e) {
      console.warn('Could not resolve myshopify domain:', e);
    }
  }
  return domain;
}

function convertPlainToHtml(text: string): string {
  const sectionHeaders = [
    'Itens Inclusos', 'Itens inclusos', 'ITENS INCLUSOS',
    'Especificações técnicas', 'Especificações Técnicas', 'ESPECIFICAÇÕES TÉCNICAS',
    'Especificações', 'ESPECIFICAÇÕES',
    'Diferenciais', 'DIFERENCIAIS',
    'Descrição do produto', 'Descrição do Produto', 'DESCRIÇÃO DO PRODUTO',
    'Descrição', 'DESCRIÇÃO',
    'Características', 'CARACTERÍSTICAS',
    'Detalhes', 'DETALHES',
    'Material', 'MATERIAL',
    'Dimensões', 'DIMENSÕES',
    'Composição', 'COMPOSIÇÃO',
  ];
  let html = text;
  for (const header of sectionHeaders) {
    const regex = new RegExp(`^(${header}):?\\s*`, 'gmi');
    html = html.replace(regex, `</p><h2 class="theme-title">${header}</h2><p>`);
  }
  html = html.replace(/^([📌✔️🔪⚡🔥💎✅🎯📋🛡️])\s*([^:\n]+):?\s*$/gm, '</p><h2 class="theme-title">$2</h2><p>');
  html = html.replace(/^([✔️✅📌🔪⚡•●▪➤➜→])\s*(.+)$/gm, '<li>$2</li>');
  html = html.replace(/((?:<li>.*<\/li>\s*)+)/g, '<ul>$1</ul>');
  html = html.replace(/\n\n+/g, '</p><p>');
  html = html.replace(/\n/g, '<br>');
  html = `<p>${html}</p>`;
  html = html.replace(/<p>\s*<\/p>/g, '');
  html = html.replace(/<p>\s*<br>\s*<\/p>/g, '');
  return html;
}

interface AdminVariant { price: string | null; compare_at_price: string | null; }
interface AdminImage { src: string; alt: string | null; }
interface AdminProduct {
  id: number;
  title: string;
  body_html: string | null;
  product_type: string | null;
  tags: string;
  status: string;
  variants: AdminVariant[];
  images: AdminImage[];
  image: AdminImage | null;
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
    const supabase = createClient(supabaseUrl, supabaseAnonKey, { global: { headers: { Authorization: authHeader } } });
    const token = authHeader.replace('Bearer ', '');
    const { data: claimsData, error: claimsError } = await supabase.auth.getClaims(token);
    if (claimsError || !claimsData?.claims) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    const storeDomain = await resolveShopDomain();
    const adminToken = await getShopifyAdminToken(storeDomain);
    const baseUrl = `https://${storeDomain}/admin/api/${API_VERSION}`;
    const shopifyHeaders = { 'X-Shopify-Access-Token': adminToken, 'Content-Type': 'application/json' };

    // Paginated products via Admin REST
    const allProducts: AdminProduct[] = [];
    let url: string | null = `${baseUrl}/products.json?limit=250&fields=id,title,body_html,product_type,tags,status,variants,images,image`;
    while (url) {
      const res: Response = await fetch(url, { headers: shopifyHeaders });
      if (!res.ok) throw new Error(`Shopify Admin API error [${res.status}]: ${await res.text()}`);
      const data = await res.json();
      allProducts.push(...(data.products ?? []));
      const link = res.headers.get('link') ?? '';
      const next = link.split(',').find((p) => p.includes('rel="next"'));
      const match = next?.match(/<([^>]+)>/);
      url = match ? match[1] : null;
    }

    console.log(`Fetched ${allProducts.length} products from Shopify Admin API`);

    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey);

    let synced = 0;
    let errors = 0;

    for (const product of allProducts) {
      const title = product.title?.trim() || '';
      if (!title || title.startsWith('com ') || title.startsWith('cerca ') || title.includes('<strong') || title.includes('<br') || title.length < 3) {
        continue;
      }

      // Use MAX variant price (Admin API — reflects painel Shopify)
      const prices = (product.variants ?? [])
        .map((v) => parseFloat(v.price ?? '0'))
        .filter((n) => !isNaN(n) && n > 0);
      const price = prices.length > 0 ? Math.max(...prices) : 0;

      const mainImage = product.image?.src || product.images?.[0]?.src || null;
      const bodyHtml = product.body_html || '';
      const description = bodyHtml.replace(/<[^>]+>/g, '\n').replace(/&nbsp;/g, ' ').replace(/\n{2,}/g, '\n\n').trim();

      const tags = (product.tags || '').toLowerCase().split(',').map((t) => t.trim());
      const titleLower = title.toLowerCase();
      const cats: string[] = [];
      if (titleLower.includes('adaga') || titleLower.includes('defcon') || titleLower.includes('wharncliffe') ||
          titleLower.includes('ring tant') || titleLower.includes('jagunç') || titleLower.includes('jagunc') ||
          titleLower.includes('nimbus') || titleLower.includes('tantô') || titleLower.includes('tanto') ||
          titleLower.includes('tantō') || titleLower.includes('push dagger') ||
          tags.some((t) => t.includes('adaga') || t.includes('tático') || t.includes('tatico') || t.includes('defesa')))
        cats.push('Defesa');
      if (titleLower.includes('edc- mini') || titleLower.includes('edc-mini') || titleLower.includes('edc mini'))
        cats.push('EDC Mini');
      if ((titleLower.startsWith('edc') || titleLower.includes('canivete')) &&
          !titleLower.includes('edc- mini') && !titleLower.includes('edc-mini') && !titleLower.includes('edc mini'))
        cats.push('EDCs');
      if (titleLower.includes('camp knife') || titleLower.includes('camp-knife') ||
          titleLower.includes('big camp') || titleLower.includes('big-camp') ||
          titleLower.includes('nimbowie') || titleLower.includes('kzr full') || titleLower.includes('kzr-full') ||
          tags.some((t) => t.includes('campo') || t.includes('caça')))
        cats.push('Campo');
      if (titleLower.includes('chef') || titleLower.includes('nakiri') || titleLower.includes('kiritsuke') ||
          titleLower.includes('santoku') || titleLower.includes('petty') || titleLower.includes('paring') ||
          titleLower.includes('desossa') || titleLower.includes('steak') || titleLower.includes('butcher') ||
          titleLower.includes('chaira') || tags.some((t) => t.includes('cozinha')))
        cats.push('Cozinha');
      if (titleLower.includes('picanheira') || titleLower.includes('pichanheira') ||
          titleLower.includes('garfo') || titleLower.includes('churrasco') ||
          tags.some((t) => t.includes('churrasco')))
        cats.push('Churrasco');
      if (titleLower.startsWith('kit ') || titleLower.startsWith('kit-'))
        cats.push('Kits');
      if (titleLower.includes('bainha') || titleLower.includes('clipe') ||
          titleLower.includes('strop') || titleLower.includes('passador'))
        cats.push('Utensílios');
      if (titleLower.includes('boné') || titleLower.includes('bone') ||
          titleLower.includes('camiseta') || titleLower.includes('moletom') ||
          titleLower.includes('bucket hat') || titleLower.includes('cinto'))
        cats.push('Vestuário');
      if (titleLower.includes('café') || titleLower.includes('cafe'))
        cats.push('Cafés');
      if (cats.length === 0) cats.push('EDCs');

      let htmlContent: string | null = null;
      if (bodyHtml && bodyHtml.trim().length > 0) {
        htmlContent = bodyHtml;
      } else if (description) {
        htmlContent = convertPlainToHtml(description);
      }

      const specText = htmlContent || description;
      const specClean = specText.replace(/<[^>]+>/g, ' ').replace(/&nbsp;/g, ' ').replace(/\s+/g, ' ');
      let comprimento_total: number | null = null;
      let area_util_corte: number | null = null;
      const compMatch = specClean.match(/[Cc]omprimento\s*total[:\s]*(\d+[,.]?\d*)\s*cm/i) || specClean.match(/(\d+[,.]?\d*)\s*cm\s*tota(?:is|l)/i);
      if (compMatch) {
        const v = parseFloat(compMatch[1].replace(',', '.'));
        if (!isNaN(v) && v > 0 && v < 200) comprimento_total = v;
      }
      const fioMatch = specClean.match(/[Ff]io\s*de\s*corte\s*[uú]til[:\s]*(\d+[,.]?\d*)\s*cm/i)
        || specClean.match(/[Ll][aâ]mina[:\s]*(\d+[,.]?\d*)\s*cm/i)
        || specClean.match(/(\d+[,.]?\d*)\s*cm\s*de\s*l[aâ]mina/i);
      if (fioMatch) {
        const v = parseFloat(fioMatch[1].replace(',', '.'));
        if (!isNaN(v) && v > 0 && v < 200) area_util_corte = v;
      }

      const { data: modeloData, error: modeloError } = await supabaseAdmin
        .from('catalogo_modelos')
        .upsert(
          {
            nome_modelo: product.title,
            preco_base: price,
            categoria: cats[0],
            categorias: cats,
            imagem_modelo: mainImage,
            apresentacao_venda: description || null,
            descricao_html: htmlContent,
            comprimento_total,
            area_util_corte,
          },
          { onConflict: 'nome_modelo' }
        )
        .select('id')
        .single();

      if (modeloError) {
        console.error(`Error upserting ${product.title}:`, modeloError);
        errors++;
        continue;
      }

      if (modeloData && product.images?.length > 0) {
        for (const img of product.images) {
          await supabaseAdmin
            .from('midias_catalogo')
            .upsert(
              { modelo_id: modeloData.id, nome_arquivo: img.alt || product.title, url: img.src, visivel_catalogo: true },
              { onConflict: 'modelo_id,url' }
            );
        }
      }

      synced++;
    }

    return new Response(
      JSON.stringify({ success: true, total: allProducts.length, synced, errors }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : 'Unknown error';
    console.error('Sync error:', error);
    return new Response(JSON.stringify({ success: false, error: msg }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
