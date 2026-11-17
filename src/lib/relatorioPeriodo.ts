import type { Sale } from '@/types/sales';
import { addDays, dateKey } from '@/lib/homeSalesChart';

export type PeriodoTipo = 'mes_atual' | 'mes_anterior' | 'ultimos30' | 'mes';
export interface PeriodoEscolha { tipo: PeriodoTipo; mes?: string } // mes = 'YYYY-MM'
export interface PeriodoResolvido {
  inicio: Date; fim: Date; prevInicio: Date; prevFim: Date;
  titulo: string; intervalo: string; comparacao: string;
}

const cal = (y: number, m: number, d: number) => new Date(Date.UTC(y, m, d));
const lastDay = (y: number, m: number) => cal(y, m + 1, 0).getUTCDate();
const dm = (d: Date) => `${String(d.getUTCDate()).padStart(2, '0')}/${String(d.getUTCMonth() + 1).padStart(2, '0')}`;
const nomeMes = (d: Date) => new Intl.DateTimeFormat('pt-BR', { month: 'long', timeZone: 'UTC' }).format(d);
const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);
export const mesTitulo = (y: number, m: number) => `${cap(nomeMes(cal(y, m, 1)))} de ${y}`;

/** Converte a data da planilha (DD/MM/AAAA) em data de calendário UTC. */
export function dataVenda(text: string): Date | null {
  const [d, m, y] = (text || '').split('/').map(Number);
  if (!d || !m || !y) return null;
  const date = cal(y, m - 1, d);
  return date.getUTCDate() === d && date.getUTCMonth() === m - 1 ? date : null;
}

/** Mês inteiro (ou até `ateDia`), comparando com o mesmo intervalo do mês anterior. */
function periodoMes(y: number, m: number, ateDia?: number): PeriodoResolvido {
  const fimDia = ateDia ?? lastDay(y, m);
  const inicio = cal(y, m, 1), fim = cal(y, m, fimDia);
  const prevInicio = cal(y, m - 1, 1);
  const prevDia = ateDia ? Math.min(ateDia, lastDay(prevInicio.getUTCFullYear(), prevInicio.getUTCMonth())) : lastDay(prevInicio.getUTCFullYear(), prevInicio.getUTCMonth());
  const prevFim = cal(prevInicio.getUTCFullYear(), prevInicio.getUTCMonth(), prevDia);
  return {
    inicio, fim, prevInicio, prevFim,
    titulo: mesTitulo(y, m),
    intervalo: `${dm(inicio)} a ${dm(fim)}`,
    comparacao: ateDia ? `vs. mesmo período de ${nomeMes(prevInicio)}` : `vs. ${nomeMes(prevInicio)}`,
  };
}

export function resolverPeriodo(escolha: PeriodoEscolha, today: Date): PeriodoResolvido {
  const y = today.getUTCFullYear(), m = today.getUTCMonth();
  if (escolha.tipo === 'ultimos30') {
    const inicio = addDays(today, -29);
    return {
      inicio, fim: today, prevInicio: addDays(today, -59), prevFim: addDays(today, -30),
      titulo: 'Últimos 30 dias', intervalo: `${dm(inicio)} a ${dm(today)}`, comparacao: 'vs. 30 dias anteriores',
    };
  }
  if (escolha.tipo === 'mes_anterior') return periodoMes(m === 0 ? y - 1 : y, (m + 11) % 12);
  if (escolha.tipo === 'mes' && escolha.mes) {
    const [my, mm] = escolha.mes.split('-').map(Number);
    if (my && mm) {
      if (my === y && mm - 1 === m) return periodoMes(y, m, today.getUTCDate());
      return periodoMes(my, mm - 1);
    }
  }
  return periodoMes(y, m, today.getUTCDate());
}

export function filtrarPeriodo(sales: Sale[], inicio: Date, fim: Date): Sale[] {
  return sales.filter(s => { const d = dataVenda(s.date); return !!d && d >= inicio && d <= fim; });
}

/** Meses ('YYYY-MM') presentes na planilha, do mais recente ao mais antigo. */
export function mesesDisponiveis(sales: Sale[]): string[] {
  const set = new Set<string>();
  for (const s of sales) { const d = dataVenda(s.date); if (d) set.add(dateKey(d).slice(0, 7)); }
  return [...set].sort().reverse();
}
