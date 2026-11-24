import { test } from 'node:test';
import assert from 'node:assert/strict';
import { CHURRASCO, escolherHeroi, menorPreco, type ModeloChurrasco } from '../../lib/churrascoLanding';

const modelo = (id: string, preco: number, fotos: string[]): ModeloChurrasco => ({ id, nome_modelo: id, preco_base: preco, fotos, imagem_modelo: fotos[0] || null, casos_uso: ['churrasco'], categorias: [], grupo_escada: 'Picanheira', posicao_escada: 'entrada', porque_texto: null, tipo_porte: [], nivel_envolvimento: [], forma_enxoval: [], manutencao: [] });
test('a peça de mais fotos é o herói automático, independentemente de vídeos', () => {
  assert.equal(escolherHeroi([{ ...modelo('uma', 500, ['a']), midias_count: 20 }, modelo('tres', 900, ['a', 'b', 'c'])])?.id, 'tres');
});
test('a escolha configurada do herói prevalece quando tem foto', () => {
  assert.equal(escolherHeroi([modelo('uma', 500, ['a']), modelo('tres', 900, ['a', 'b', 'c'])], 'uma')?.id, 'uma');
});
test('peças sem foto não viram herói nem reduzem o preço de entrada', () => {
  const lista = [modelo('sem', 100, []), modelo('com', 525, ['a'])];
  assert.equal(escolherHeroi(lista, 'sem')?.id, 'com');
  assert.equal(menorPreco(lista), 525);
  assert.equal(escolherHeroi([]), undefined);
  assert.equal(menorPreco([]), null);
});
test('parcelamento da apresentação é em até 10x sem juros', () => {
  assert.equal(CHURRASCO.parcelasSemJuros, 10);
});