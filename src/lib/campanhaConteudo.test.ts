import { test } from 'node:test';
import assert from 'node:assert/strict';
import { inclusosDoItem, ehCoin, ehKitCompletoSls, nomesDistintos, ordenarOpcoesSls, opcaoInicialSls } from './campanhaConteudo';
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
test('nova opção de kit preserva os nomes individuais Micro Compact Standard', () => {
  assert.deepEqual(nomesDistintos(['Micro', 'Compact', 'Standard'].map((t, n) => ({ id: String(n), titulo: `Push Dagger ${t} Sandvik - SLS`, titulo_curto: null })).concat([{ id: 'kit', titulo: 'Kit Completo Push Dagger SLS', titulo_curto: 'Kit Completo' }])), { 0: 'Micro', 1: 'Compact', 2: 'Standard', kit: 'Kit Completo' });
});
const opcoes = [
  { item: { id: 'kit', titulo: 'Kit Completo Push Dagger SLS', ordem: -1 } },
  { item: { id: 'standard', titulo: 'Push Dagger Standard Sandvik - SLS', ordem: 2 } },
  { item: { id: 'micro', titulo: 'Push Dagger Micro Sandvik - SLS', ordem: 0 } },
  { item: { id: 'compact', titulo: 'Push Dagger Compact Sandvik - SLS', ordem: 1 } },
];
test('ordena pela campanha com Kit Completo sempre por último', () => {
  assert.deepEqual(ordenarOpcoesSls(opcoes).map(i => i.item.id), ['micro', 'compact', 'standard', 'kit']);
});
test('Compact é opção inicial e fallback quando a seleção deixa de existir', () => {
  assert.equal(opcaoInicialSls(opcoes, null), 'compact');
  assert.equal(opcaoInicialSls(opcoes, 'removido'), 'compact');
});
test('escolha compartilhada preserva kit e outras opções depois da seleção', () => {
  assert.equal(opcaoInicialSls(opcoes, 'kit'), 'kit');
  assert.equal(opcaoInicialSls(opcoes, 'micro'), 'micro');
});