import { test } from 'node:test';
import assert from 'node:assert/strict';
import { montarFila, escolherVariacao, enviosRapidos, inicioDoDiaSP } from './filaEnvio';

test('fila exclui quem foi contatado hoje, sem telefone e repetidos', () => {
  const fila = montarFila([
    { id: 'a', telefone: '5511999990000' },
    { id: 'b', telefone: null },
    { id: 'c', telefone: '5511888880000' },
    { id: 'd', telefone: '5511999990000' },
    { id: 'e', telefone: '5521777770000' },
  ], new Set(['5511888880000']));
  assert.deepEqual(fila.map((f) => f.id), ['a', 'e']);
});

test('variações alternam a cada envio', () => {
  const m = ['A', 'B', ''];
  assert.equal(escolherVariacao(m, 0), 'A');
  assert.equal(escolherVariacao(m, 1), 'B');
  assert.equal(escolherVariacao(m, 2), 'A');
});

test('aviso aparece só acima de 15 envios em 10 minutos', () => {
  const agora = 1_000_000_000;
  const quinze = Array.from({ length: 15 }, (_, i) => agora - i * 1000);
  assert.equal(enviosRapidos(quinze, agora), false);
  assert.equal(enviosRapidos([...quinze, agora], agora), true);
  const antigos = Array.from({ length: 20 }, () => agora - 11 * 60_000);
  assert.equal(enviosRapidos(antigos, agora), false);
});

test('dia começa à meia-noite de São Paulo', () => {
  assert.equal(inicioDoDiaSP(new Date('2026-10-27T02:00:00Z')), '2026-10-26T03:00:00.000Z');
  assert.equal(inicioDoDiaSP(new Date('2026-10-27T17:00:00Z')), '2026-10-27T03:00:00.000Z');
});
