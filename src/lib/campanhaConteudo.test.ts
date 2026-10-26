import { test } from 'node:test';
import assert from 'node:assert/strict';
import { inclusosDoItem, ehCoin, ehKitCompletoSls } from './campanhaConteudo';
import { valoresCombo } from './campanhaCombos';

const inclusos = ['Push Dagger SLS Micro', 'Push Dagger SLS Compact', 'Push Dagger SLS Standard', '3 bainhas em Kydex + clipes em aço inox', 'Challenge Coin Kaowz'];
const combo = { preco: 2035, brindes: [{ nome: 'Cinto', preco: 225 }, { nome: 'Multitool', preco: 75 }, { nome: 'Case', preco: 250 }] } as Parameters<typeof valoresCombo>[1];
test('kit custa 2035 e totaliza 2585 com 550 em brindes', () => {
  assert.deepEqual(valoresCombo({ valor: 2035, valor_de: null }, combo), { valorBrindes: 550, valorDe: 2585, economia: 550 });
});
test('kit pode ser parcelado em dez vezes de 203,50', () => { assert.equal(combo.preco / 10, 203.5); });
test('coin é um dos cinco inclusos do kit e não é um dos três brindes', () => {
  assert.equal(inclusosDoItem({ inclusos }, ['Outro'], ['Extra']).length, 5);
  assert.equal(inclusos.filter(ehCoin).length, 1);
  assert.equal(combo.brindes.filter(b => ehCoin(b.nome)).length, 0);
});
test('inclusos próprios substituem descrição e extras sem afetar itens sem override', () => {
  assert.deepEqual(inclusosDoItem({ inclusos: [] }, ['Descrição']), []);
  assert.deepEqual(inclusosDoItem({ inclusos: null }, ['Kydex'], ['Clipe']), ['Kydex', 'Clipe']);
});
test('kit é identificado sem confundir opções individuais', () => {
  assert.equal(ehKitCompletoSls({ titulo: 'Kit Completo Push Dagger SLS' }), true);
  assert.equal(ehKitCompletoSls({ titulo: 'Push Dagger Micro Sandvik - SLS' }), false);
});