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
