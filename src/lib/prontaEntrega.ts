// Cópia de supabase/functions/_shared/prontaEntrega.ts — manter idênticas.

export const PRAZO_PADRAO_PRONTA = 5;
export const PRAZO_PADRAO_ENCOMENDA = 65;
export const TZ_BR = 'America/Sao_Paulo';

export interface AtributoPE { key?: string; name?: string; value?: string }

export interface ClassificacaoPE {
  pronta: boolean;
  prazo: number;
}

function semAcento(s: string): string {
  return (s ?? '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
}

function attr(attrs: AtributoPE[] | undefined, nome: string): string | undefined {
  const alvo = semAcento(nome).trim();
  const a = (attrs ?? []).find((x) => semAcento(String(x.key ?? x.name ?? '')).trim() === alvo);
  const v = a?.value?.toString().trim();
  return v || undefined;
}

/** Classifica um item como pronta entrega ou sob encomenda, com prazo em dias úteis. */
export function classificarItemPE(vendor?: string | null, attrs?: AtributoPE[]): ClassificacaoPE {
  const v = semAcento(vendor ?? '');
  const flag = attr(attrs, 'Pronta entrega');
  let pronta: boolean;
  if (flag && /^(sim|nao)$/.test(semAcento(flag))) pronta = semAcento(flag) === 'sim';
  else if (v.includes('pronta entrega')) pronta = true;
  else pronta = false; // "encomenda" ou desconhecido → sob encomenda

  let prazo = pronta ? PRAZO_PADRAO_PRONTA : PRAZO_PADRAO_ENCOMENDA;
  const m = v.match(/em ate\s*(\d+)\s*dias? uteis/);
  if (m) prazo = parseInt(m[1], 10);
  const pa = attr(attrs, 'Prazo (dias úteis)');
  if (pa && /^\d+$/.test(pa)) prazo = parseInt(pa, 10);
  return { pronta, prazo };
}

// ───────────── Dias úteis ─────────────

/** "YYYY-MM-DD" de uma data no fuso de São Paulo. */
export function ymdBR(d: Date): string {
  return d.toLocaleDateString('en-CA', { timeZone: TZ_BR });
}
function horaBR(d: Date): string {
  return d.toLocaleTimeString('en-GB', { timeZone: TZ_BR, hour: '2-digit', minute: '2-digit', hour12: false });
}
function addDias(ymd: string, n: number): string {
  const [y, m, d] = ymd.split('-').map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d + n));
  return dt.toISOString().slice(0, 10);
}
export function ehDiaUtil(ymd: string, feriados: Set<string>): boolean {
  const [y, m, d] = ymd.split('-').map(Number);
  const dow = new Date(Date.UTC(y, m - 1, d)).getUTCDay();
  return dow !== 0 && dow !== 6 && !feriados.has(ymd);
}
function proximoUtil(ymd: string, feriados: Set<string>): string {
  let x = addDias(ymd, 1);
  while (!ehDiaUtil(x, feriados)) x = addDias(x, 1);
  return x;
}

/** Dia em que a contagem começa: dia do pagamento, ou próximo dia útil se pago
 *  depois do horário de corte / em fim de semana ou feriado. */
export function inicioContagem(pagamento: Date, horarioCorte: string, feriados: Set<string>): string {
  const dia = ymdBR(pagamento);
  if (ehDiaUtil(dia, feriados) && horaBR(pagamento) < (horarioCorte || '14:00')) return dia;
  return proximoUtil(dia, feriados);
}

/** Prazo limite = início da contagem + N dias úteis. */
export function calcularPrazoLimite(pagamento: Date, diasUteis: number, horarioCorte: string, feriados: Set<string>): string {
  let x = inicioContagem(pagamento, horarioCorte, feriados);
  for (let i = 0; i < diasUteis; i++) x = proximoUtil(x, feriados);
  return x;
}

/** Dias úteis entre hoje e o prazo. 0 = vence hoje; negativo = atrasado. */
export function diasUteisRestantes(prazoYmd: string, feriados: Set<string>, hoje: Date = new Date()): number {
  const h = ymdBR(hoje);
  if (prazoYmd === h) return 0;
  let n = 0;
  if (prazoYmd > h) {
    let x = h;
    while (x < prazoYmd) { x = addDias(x, 1); if (ehDiaUtil(x, feriados)) n++; }
    return n;
  }
  let x = prazoYmd;
  while (x < h) { x = addDias(x, 1); if (ehDiaUtil(x, feriados)) n++; }
  return -n;
}

export interface ItemPE {
  titulo: string;
  quantidade: number;
  pronta_entrega: boolean;
  prazo_dias_uteis: number;
  enviado?: boolean;
  enviado_em?: string | null;
}

/** Maior prazo considerado: só prontos (parcial / só pronta / a definir) ou todos (junto). */
export function prazoDoPedido(itens: ItemPE[], modo: string | null): number {
  const base = modo === 'junto' ? itens : itens.filter((i) => i.pronta_entrega);
  const lista = base.length ? base : itens;
  return Math.max(0, ...lista.map((i) => Number(i.prazo_dias_uteis) || 0));
}
