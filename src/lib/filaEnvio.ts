// Regras puras do "Modo fila" de envio no WhatsApp (compartilhado por Checkouts e Upsell).

export const META_PADRAO = 40;
export const LIMITE_RAPIDO = 15;
export const JANELA_RAPIDO_MS = 10 * 60_000;
export const PAUSA_MS = 2 * 60_000;

/** Início do dia atual em São Paulo (UTC-3), em ISO. */
export function inicioDoDiaSP(agora = new Date()): string {
  const sp = new Date(agora.getTime() - 3 * 3600_000).toISOString().slice(0, 10);
  return new Date(`${sp}T00:00:00-03:00`).toISOString();
}

/** Mantém só telefones válidos, não contatados hoje e sem repetir a mesma pessoa. */
export function montarFila<T extends { id: string; telefone: string | null }>(itens: T[], contatadosHoje: Set<string>): T[] {
  const vistos = new Set<string>();
  return itens.filter((i) => {
    if (!i.telefone || contatadosHoje.has(i.telefone) || vistos.has(i.telefone)) return false;
    vistos.add(i.telefone);
    return true;
  });
}

/** Alterna entre as variações da mensagem a cada envio. */
export function escolherVariacao(mensagens: string[], envioN: number): string {
  const validas = mensagens.filter((m) => m.trim());
  return validas.length ? validas[envioN % validas.length] : '';
}

/** Verdadeiro quando houve mais de 15 envios nos últimos 10 minutos. */
export function enviosRapidos(envios: number[], agora = Date.now()): boolean {
  return envios.filter((t) => agora - t < JANELA_RAPIDO_MS).length > LIMITE_RAPIDO;
}

export function aplicarVariaveis(tpl: string, vars: Record<string, string>): string {
  let out = tpl;
  for (const [k, v] of Object.entries(vars)) out = out.split(k).join(v);
  return out;
}
