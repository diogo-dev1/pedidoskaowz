import type { Sale } from '@/types/sales';

export type SalesPeriod = 'day' | 'week' | 'month';
export interface SalesBucket {
  key: string;
  label: string;
  period: string;
  start: Date;
  end: Date;
  value: number;
  count: number;
  current: boolean;
}
export const salesBRL = (value: number) => value.toLocaleString('pt-BR', {
  style: 'currency', currency: 'BRL', maximumFractionDigits: 0,
});
const calendar = (year: number, month: number, day: number) => new Date(Date.UTC(year, month, day));
export function saoPauloDay(now = new Date()): Date {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'America/Sao_Paulo', year: 'numeric', month: '2-digit', day: '2-digit',
  }).formatToParts(now);
  const part = (type: string) => Number(parts.find(p => p.type === type)?.value);
  return calendar(part('year'), part('month') - 1, part('day'));
}
export const addDays = (date: Date, days: number) => calendar(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate() + days);
export const dateKey = (date: Date) => date.toISOString().slice(0, 10);
const shortDate = (date: Date) => new Intl.DateTimeFormat('pt-BR', { day: '2-digit', month: '2-digit', timeZone: 'UTC' }).format(date);
const monday = (date: Date) => addDays(date, -((date.getUTCDay() + 6) % 7));
const monthStart = (date: Date, offset = 0) => calendar(date.getUTCFullYear(), date.getUTCMonth() + offset, 1);
const capitalize = (text: string) => text.charAt(0).toUpperCase() + text.slice(1);

// Calendar dates are represented at UTC midnight, avoiding browser-zone and DST shifts.
export function aggregateSales(sales: Sale[]) {
  const days = new Map<string, { value: number; count: number }>();
  for (const sale of sales) {
    const [day, month, year] = sale.date.split('/').map(Number);
    if (!day || !month || !year) continue;
    const date = calendar(year, month - 1, day);
    if (date.getUTCDate() !== day || date.getUTCMonth() !== month - 1) continue;
    const key = dateKey(date);
    const previous = days.get(key) ?? { value: 0, count: 0 };
    days.set(key, { value: previous.value + sale.value, count: previous.count + 1 });
  }
  return days;
}
export function rangeTotal(days: ReturnType<typeof aggregateSales>, start: Date, end: Date) {
  let value = 0, count = 0;
  for (let date = start; date <= end; date = addDays(date, 1)) {
    const sales = days.get(dateKey(date));
    value += sales?.value ?? 0;
    count += sales?.count ?? 0;
  }
  return { value, count };
}
export function periodSummaries(days: ReturnType<typeof aggregateSales>, today: Date) {
  const startWeek = monday(today);
  const previousMonth = monthStart(today, -1);
  const previousMonthLastDay = addDays(monthStart(today), -1).getUTCDate();
  const previousMonthEnd = calendar(previousMonth.getUTCFullYear(), previousMonth.getUTCMonth(), Math.min(today.getUTCDate(), previousMonthLastDay));
  const ranges = {
    day: [today, addDays(today, -1), addDays(today, -1)],
    week: [startWeek, addDays(startWeek, -7), addDays(today, -7)],
    month: [monthStart(today), previousMonth, previousMonthEnd],
  };
  return (['day', 'week', 'month'] as const).map(type => {
    const [start, previousStart, previousEnd] = ranges[type];
    const total = rangeTotal(days, start, today);
    const previous = rangeTotal(days, previousStart, previousEnd).value;
    return { type, ...total, previous, change: previous === 0 ? null : (total.value - previous) / previous * 100 };
  });
}
export function chartBuckets(days: ReturnType<typeof aggregateSales>, today: Date, type: SalesPeriod, drill?: SalesBucket | null): SalesBucket[] {
  const daily = type === 'day' || !!drill;
  const starts: Date[] = [];
  if (drill) {
    for (let date = drill.start; date <= drill.end; date = addDays(date, 1)) starts.push(date);
  } else if (type === 'day') {
    for (let i = 29; i >= 0; i--) starts.push(addDays(today, -i));
  } else {
    for (let i = 11; i >= 0; i--) starts.push(type === 'week' ? addDays(monday(today), -7 * i) : monthStart(today, -i));
  }
  return starts.map(start => {
    const end = daily ? start : type === 'week' ? addDays(start, 6) : addDays(monthStart(start, 1), -1);
    const label = daily || type === 'week' ? shortDate(start) : new Intl.DateTimeFormat('pt-BR', { month: 'short', year: '2-digit', timeZone: 'UTC' }).format(start).replace('.', '').replace(' de ', '/');
    const weekday = new Intl.DateTimeFormat('pt-BR', { weekday: 'short', timeZone: 'UTC' }).format(start).replace('.', '');
    const period = daily ? `${capitalize(weekday)}, ${shortDate(start)}` : type === 'week' ? `Semana de ${shortDate(start)} a ${shortDate(end)}` : `${capitalize(new Intl.DateTimeFormat('pt-BR', { month: 'long', timeZone: 'UTC' }).format(start))}/${start.getUTCFullYear()}`;
    return { key: dateKey(start), label, period, start, end, ...rangeTotal(days, start, end), current: today >= start && today <= end };
  });
}