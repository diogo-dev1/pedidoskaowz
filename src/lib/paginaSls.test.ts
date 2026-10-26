import { test } from 'node:test';
import assert from 'node:assert/strict';
import { PADRAO_SLS, mesclarConteudoSls, preencher, PAGAMENTO_SLS, pilaresSls, imagemDaPagina, normalizarBlocosSls } from './paginaSls.ts';

test('usa 15 e 65 dias úteis quando nada foi salvo', () => {
  const c = mesclarConteudoSls(null);
  assert.equal(c.prazoSls, 15);
  assert.equal(c.prazoSobEncomenda, 65);
});
test('página SLS mantém produção em 15 dias úteis mesmo com configuração antiga', () => {
  assert.equal(mesclarConteudoSls({ prazoSls: 20 }).prazoSls, 15);
  assert.equal(mesclarConteudoSls({ prazoSls: 0 }).prazoSls, 15);
});
test('pagamento permite PIX e cartão, não PIX parcelado', () => {
  assert.equal(PAGAMENTO_SLS.pix, true);
  assert.equal(PAGAMENTO_SLS.cartao, true);
  assert.equal(PAGAMENTO_SLS.pixParcelado, false);
});
test('cartão oferece até 10 parcelas sem juros', () => {
  assert.equal(PAGAMENTO_SLS.maxParcelasSemJuros, 10);
});
test('tratamento térmico não é pilar de produção SLS', () => {
  assert.deepEqual(pilaresSls([{ titulo: 'Usinagem CNC' }, { titulo: 'Tratamento térmico especial' }]), [{ titulo: 'Usinagem CNC' }]);
});
test('troca os marcadores de prazo', () => {
  assert.equal(preencher('em {prazo} e {prazo_encomenda}', { ...PADRAO_SLS, prazoSls: 12 }), 'em 12 e 65');
});
test('remove o parêntese de parcelamento quando não há parcelamento', () => {
  assert.equal(preencher('cartão ({parcelamento}) ou pix', PADRAO_SLS, null), 'cartão ou pix');
});

 test('blocos podem ser retirados, restaurados e ordenados', () => {
  assert.deepEqual(mesclarConteudoSls({ blocos: [] }).blocos, []);
  const blocos = [{ id: 'p', tipo: 'porte' }, { id: 'novo', tipo: 'livre', titulo: 'Detalhe' }, { id: 'h', tipo: 'hero' }];
  assert.deepEqual(normalizarBlocosSls(blocos).map(b => b.tipo), ['porte', 'livre', 'hero']);
  assert.ok(mesclarConteudoSls({}).blocos.some(b => b.tipo === 'oferta'));
  assert.equal(normalizarBlocosSls([{ id: 'a', tipo: 'porte' }, { id: 'b', tipo: 'porte' }]).length, 1);
});
test('imagens admitem troca, retirada explícita e retorno ao padrão', () => {
  assert.equal(imagemDaPagina(mesclarConteudoSls({}), 'hero', 'original'), 'original');
  assert.equal(imagemDaPagina(mesclarConteudoSls({ imagens: { hero: null } }), 'hero', 'original'), null);
  assert.equal(imagemDaPagina(mesclarConteudoSls({ imagens: { hero: 'https://example.org/foto.jpg' } }), 'hero', 'original'), 'https://example.org/foto.jpg');
  assert.equal(imagemDaPagina(mesclarConteudoSls({ imagens: { hero: 'javascript:alert(1)' } }), 'hero', 'original'), null);
});
