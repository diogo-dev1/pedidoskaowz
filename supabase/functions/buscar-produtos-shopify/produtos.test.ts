import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mapearProduto, textoSimples } from './produtos';
test('one product uses cheapest variant and its own compareAtPrice, and at most ten images', () => {
  const p = mapearProduto({ id: 'gid://shopify/Product/1', title: 'SLS', status: 'ACTIVE', handle: 'sls', images: {nodes: Array.from({length:12}, (_, i) => ({url: `imagem-${i}`}))}, variants: {nodes:[{price:'75',compareAtPrice:'100',availableForSale:false},{price:'90',compareAtPrice:'200',availableForSale:true}]}});
  assert.equal(p.preco, 75); assert.equal(p.precoDe, 100); assert.equal(p.imagens.length, 10); assert.equal(p.disponivel, true); assert.equal(p.link, 'https://kaowz.com.br/products/sls');
});
test('compareAtPrice not higher than price is omitted', () => {
  assert.equal(mapearProduto({id:'1',title:'SLS',status:'ACTIVE',handle:'sls',variants:{nodes:[{price:'75',compareAtPrice:'75',availableForSale:true}]}}).precoDe, null);
});
test('HTML descriptions keep paragraph and line breaks as plain text', () => {
  assert.equal(textoSimples('<p>Aço &amp; acabamento<br>Sandvik</p><p>SLS</p>'), 'Aço & acabamento\nSandvik\nSLS');
});