import { test } from 'node:test';
import assert from 'node:assert/strict';
import { atualizacaoDoSite, ofertaDoItem, type Campanha, type CampanhaItem, type ProdutoCampanha } from './campanhas';

test('empty item conditions use campaign defaults and overrides take priority', () => {
  const c = { texto_pix_padrao: '10% off no Pix', texto_parcelamento_padrao: 'até 10x sem juros' } as Campanha;
  const item = { texto_pix: '', texto_parcelamento: null, midias: [], selos: [] } as unknown as CampanhaItem;
  assert.equal(ofertaDoItem(item, c).texto_pix, '10% off no Pix');
  assert.equal(ofertaDoItem(item, c).texto_parcelamento, 'até 10x sem juros');
  assert.equal(ofertaDoItem({ ...item, texto_pix: 'Pix exclusivo' }, c).texto_pix, 'Pix exclusivo');
});
test('Shopify refresh changes only prices, images and link and preserves hand edited fields', () => {
  const edited = { titulo: 'Título editado', descricao: 'Descrição editada', selos: ['Especial'], bordao_modal: 'Bordão', texto_pix: 'Pix manual', texto_parcelamento: 'Condição manual', ativo: false };
  const p: ProdutoCampanha = { produtoId: 'gid://shopify/Product/1', titulo: 'Título site', descricao: 'Descrição site', preco: 75, precoDe: 100, imagens: ['https://kaowz.com.br/foto.jpg'], link: 'https://kaowz.com.br/products/sls', disponivel: true };
  const patch = atualizacaoDoSite(p);
  assert.deepEqual(Object.keys(patch).sort(), ['link_produto', 'midias', 'valor', 'valor_de']);
  assert.deepEqual({ ...edited, ...patch }, { ...edited, valor: 75, valor_de: 100, midias: [{url: p.imagens[0], tipo: 'imagem'}], link_produto: p.link });
});