import { test } from 'node:test';
import assert from 'node:assert/strict';
const expect = (actual: unknown) => ({
  toBe: (expected: unknown) => assert.equal(actual, expected),
  toBeNull: () => assert.equal(actual, null),
});
import type { Sale } from '@/types/sales';
import { aggregateSales, chartBuckets, dateKey, periodSummaries, saoPauloDay } from './homeSalesChart';

const sale = (date: string, value: number) => ({ date, value } as Sale);
const day = (date: string) => new Date(`${date}T00:00:00Z`);

test('current day follows Sao Paulo even after UTC midnight', () => {
  expect(dateKey(saoPauloDay(new Date('2026-10-21T01:00:00Z')))).toBe('2026-10-20');
});
test('day totals sum sales.value by spreadsheet date and compare with yesterday', () => {
  const summaries = periodSummaries(aggregateSales([sale('20/10/2026', 100), sale('20/10/2026', 200), sale('19/10/2026', 50)]), day('2026-10-20'));
  expect(summaries[0].value).toBe(300);
  expect(summaries[0].count).toBe(2);
  expect(summaries[0].previous).toBe(50);
});
test('week is Monday through today, compared with matching weekdays last week', () => {
  const data = aggregateSales([sale('18/10/2026', 999), sale('19/10/2026', 100), sale('20/10/2026', 200), sale('21/10/2026', 999), sale('12/10/2026', 50), sale('13/10/2026', 100), sale('14/10/2026', 999)]);
  const summary = periodSummaries(data, day('2026-10-20'))[1];
  expect(summary.value).toBe(300);
  expect(summary.count).toBe(2);
  expect(summary.previous).toBe(150);
  expect(summary.change).toBe(100);
});
test('month is day one through today, compared with matching dates last month', () => {
  const data = aggregateSales([sale('01/10/2026', 100), sale('20/10/2026', 200), sale('21/10/2026', 999), sale('01/09/2026', 400), sale('20/09/2026', 200), sale('21/09/2026', 999)]);
  const summary = periodSummaries(data, day('2026-10-20'))[2];
  expect(summary.value).toBe(300);
  expect(summary.previous).toBe(600);
  expect(summary.change).toBe(-50);
});
test('previous-month comparison clamps to the last day of a shorter month', () => {
  const summary = periodSummaries(aggregateSales([sale('28/02/2026', 100), sale('01/03/2026', 200)]), day('2026-03-31'))[2];
  expect(summary.previous).toBe(100);
});
test('zero previous period omits percentage comparison', () => {
  expect(periodSummaries(aggregateSales([sale('20/10/2026', 100)]), day('2026-10-20'))[0].change).toBeNull();
});
test('chart spans 30 days, 12 Monday-to-Sunday weeks and 12 months', () => {
  const data = aggregateSales([]), today = day('2026-10-20');
  const days = chartBuckets(data, today, 'day');
  expect(days.length).toBe(30);
  expect(days[0].key).toBe('2026-09-21');
  expect(days[29].current).toBe(true);
  const weeks = chartBuckets(data, today, 'week');
  expect(weeks.length).toBe(12);
  expect(weeks[11].key).toBe('2026-10-19');
  expect(dateKey(weeks[11].end)).toBe('2026-10-25');
  const months = chartBuckets(data, today, 'month');
  expect(months.length).toBe(12);
  expect(months[0].key).toBe('2025-11-01');
});
test('drilling down includes every day in the selected week or month and preserves totals', () => {
  const data = aggregateSales([sale('20/10/2026', 300), sale('22/10/2026', 50)]), today = day('2026-10-20');
  for (const type of ['week', 'month'] as const) {
    const selected = chartBuckets(data, today, type)[11];
    const daily = chartBuckets(data, today, type, selected);
    expect(daily.length).toBe(type === 'week' ? 7 : 31);
    expect(daily.reduce((sum, bucket) => sum + bucket.value, 0)).toBe(350);
    expect(daily.reduce((sum, bucket) => sum + bucket.count, 0)).toBe(2);
  }
});