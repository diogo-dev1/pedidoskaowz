// Shared OAuth and paced API transport. Never log token response bodies.
export const BLING_API_BASE = 'https://api.bling.com.br/Api/v3';
const wait = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));
let queue: Promise<unknown> = Promise.resolve();
let lastCall = 0;
let refreshing: Promise<string> | null = null;
export async function tokenRequest(body: URLSearchParams): Promise<Response> {
  const id = Deno.env.get('BLING_CLIENT_ID');
  const secret = Deno.env.get('BLING_CLIENT_SECRET');
  if (!id || !secret) throw new Error('Credenciais Bling não configuradas');
  const init = { method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded', Authorization: `Basic ${btoa(`${id}:${secret}`)}` }, body };
  const response = await fetch(`${BLING_API_BASE}/oauth/token`, init);
  if (response.status === 403 || response.status === 404) {
    await response.body?.cancel();
    return fetch('https://www.bling.com.br/Api/v3/oauth/token', init);
  }
  return response;
}
export async function getValidToken(db: any): Promise<string> {
  const latest = async () => {
    const { data, error } = await db.from('bling_tokens').select('*').order('created_at', { ascending: false }).limit(1);
    if (error || !data?.[0]) throw new Error('Token Bling não encontrado — conecte o Bling');
    return data[0];
  };
  const token = await latest();
  if (new Date(token.expires_at).getTime() - Date.now() > 300000) return token.access_token;
  if (refreshing) return refreshing;
  refreshing = (async () => {
    const response = await tokenRequest(new URLSearchParams({ grant_type: 'refresh_token', refresh_token: token.refresh_token }));
    const result = await response.json().catch(() => ({}));
    if (!response.ok) {
      if (/invalid_grant|invalid.refresh.token/i.test(JSON.stringify(result))) {
        for (let attempt = 0; attempt < 3; attempt++) {
          const newer = await latest();
          if ((newer.id !== token.id || newer.refresh_token !== token.refresh_token) && new Date(newer.created_at) >= new Date(token.created_at) && new Date(newer.expires_at).getTime() > Date.now()) return newer.access_token;
          await wait(400);
        }
      }
      throw new Error(`Não foi possível renovar o acesso ao Bling (${response.status})`);
    }
    if (!result.access_token || !result.refresh_token) throw new Error('Resposta de acesso Bling inválida');
    // Insert first; retain historical rows so concurrent readers never see an empty token store.
    const { error } = await db.from('bling_tokens').insert({ access_token: result.access_token, refresh_token: result.refresh_token, expires_at: new Date(Date.now() + result.expires_in * 1000).toISOString() });
    if (error) throw new Error('Não foi possível salvar o acesso Bling');
    return result.access_token;
  })();
  try { return await refreshing; } finally { refreshing = null; }
}
export async function blingFetch(url: string, init: RequestInit = {}, retries = 3): Promise<Response> {
  for (let attempt = 0; ; attempt++) {
    const task = queue.then(async () => {
      await wait(Math.max(0, 410 - (Date.now() - lastCall)));
      lastCall = Date.now();
      return fetch(url, init);
    });
    queue = task.catch(() => {});
    const response = await task;
    if (response.status !== 429 || attempt >= retries) return response;
    const retry = Number(response.headers.get('Retry-After'));
    await response.body?.cancel();
    await wait(Math.max(1000 * 2 ** attempt, Number.isFinite(retry) ? retry * 1000 : 0));
  }
}
export async function blingGet(db: any, endpoint: string): Promise<any> {
  const token = await getValidToken(db);
  const response = await blingFetch(`${BLING_API_BASE}/${endpoint}`, { headers: { Authorization: `Bearer ${token}`, Accept: 'application/json' } });
  if (!response.ok) throw new Error(`Bling indisponível (${response.status})`);
  return response.json();
}
