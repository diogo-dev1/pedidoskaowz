import { test } from 'node:test';
import assert from 'node:assert/strict';
import { agruparPedidosSite, type PedidoSite } from './upsellSite';

const p = (id: string, o: Partial<PedidoSite>): PedidoSite => ({ id, numero: `#KWZ-${id}`, nome: 'Ana', email: null, telefone: null, cidade: null, estado: null, total: '100', criado_em: '2026-10-20T10:00:00Z', itens: [], ...o });

test('junta pedidos do mesmo telefone mesmo com formatos diferentes', () => {
  const r = agruparPedidosSite([p('1', { telefone: '(11) 98888-7777' }), p('2', { telefone: '+55 11 988887777', total: '50' })]);
  assert.equal(r.length, 1);
  assert.equal(r[0].total, 150);
  assert.equal(r[0].pedidos.length, 2);
});

test('sem telefone, agrupa por e-mail ignorando maiúsculas', () => {
  assert.equal(agruparPedidosSite([p('1', { email: 'A@x.com' }), p('2', { email: 'a@x.com' })]).length, 1);
});
