import { createClient } from 'npm:@supabase/supabase-js@2';
/** Validate callers before any privileged work; scheduled server calls may use the service credential. */
export async function authenticatedRequest(req: Request): Promise<boolean> {
  const url = Deno.env.get('SUPABASE_URL');
  const anon = Deno.env.get('SUPABASE_ANON_KEY');
  const auth = req.headers.get('Authorization') || '';
  const bearer = auth.replace(/^Bearer\s+/i, '');
  if (!url || !anon || !bearer) return false;
  if (bearer === Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')) return true;
  const client = createClient(url, anon, { global: { headers: { Authorization: auth } } });
  const { data, error } = await client.auth.getUser();
  return !error && !!data.user;
}

/** Scheduled jobs prove themselves with x-cron-secret, matched in constant time against the server-only config row. */
export async function cronRequest(req: Request, db: any): Promise<boolean> {
  const enviado = req.headers.get('x-cron-secret') ?? '';
  if (!enviado) return false;
  const { data } = await db.from('config_servidor').select('valor').eq('chave', 'bling_cron_secret').maybeSingle();
  const esperado: string = data?.valor ?? '';
  if (!esperado) return false;
  const a = new TextEncoder().encode(enviado);
  const b = new TextEncoder().encode(esperado);
  let diff = a.length ^ b.length;
  for (let i = 0; i < b.length; i++) diff |= (a[i] ?? 0) ^ b[i];
  return diff === 0;
}
