/// <reference types="node" />
import { test as it } from 'node:test';
import assert from 'node:assert/strict';
const expect = (actual: unknown) => ({ toBe: (e: unknown) => assert.equal(actual, e), toEqual: (e: unknown) => assert.deepEqual(actual, e) });
const describe = (_: string, fn: () => void) => fn();
import { filtrarPeriodo, resolverPeriodo } from './relatorioPeriodo';
import type { Sale } from '@/types/sales';

const today = new Date(Date.UTC(2026, 10, 17));
const iso = (d: Date) => d.toISOString().slice(0, 10);

describe('relatorioPeriodo', () => {
  it('este mês vai do dia 1 até hoje e compara com o mesmo intervalo do mês anterior', () => {
    const p = resolverPeriodo({ tipo: 'mes_atual' }, today);
    expect([iso(p.inicio), iso(p.fim), iso(p.prevInicio), iso(p.prevFim)]).toEqual(['2026-11-01', '2026-11-17', '2026-10-01', '2026-10-17']);
    expect(p.titulo).toBe('Novembro de 2026');
    expect(p.intervalo).toBe('01/11 a 17/11');
  });
  it('mês anterior é fechado e compara com o mês antes dele', () => {
    const p = resolverPeriodo({ tipo: 'mes_anterior' }, today);
    expect([iso(p.inicio), iso(p.fim), iso(p.prevInicio), iso(p.prevFim)]).toEqual(['2026-10-01', '2026-10-31', '2026-09-01', '2026-09-30']);
  });
  it('em janeiro, mês anterior é dezembro do ano anterior', () => {
    const p = resolverPeriodo({ tipo: 'mes_anterior' }, new Date(Date.UTC(2027, 0, 5)));
    expect(iso(p.inicio)).toBe('2026-12-01');
  });
  it('filtra apenas vendas do período', () => {
    const s = (date: string, value: number) => ({ date, value } as Sale);
    const p = resolverPeriodo({ tipo: 'mes_atual' }, today);
    const r = filtrarPeriodo([s('31/10/2026', 1), s('01/11/2026', 2), s('17/11/2026', 3), s('18/11/2026', 4)], p.inicio, p.fim);
    expect(r.reduce((a, b) => a + b.value, 0)).toBe(5);
  });
});
