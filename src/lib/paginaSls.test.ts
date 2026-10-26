import { test } from 'node:test';
import assert from 'node:assert/strict';
import { PADRAO_SLS, mesclarConteudoSls, preencher } from './paginaSls.ts';

test('usa 15 e 65 dias úteis quando nada foi salvo', () => {
  const c = mesclarConteudoSls(null);
  assert.equal(c.prazoSls, 15);
  assert.equal(c.prazoSobEncomenda, 65);
});
test('mantém prazo salvo e ignora prazo inválido', () => {
  assert.equal(mesclarConteudoSls({ prazoSls: 20 }).prazoSls, 20);
  assert.equal(mesclarConteudoSls({ prazoSls: 0 }).prazoSls, 15);
});
test('troca os marcadores de prazo', () => {
  assert.equal(preencher('em {prazo} e {prazo_encomenda}', { ...PADRAO_SLS, prazoSls: 12 }), 'em 12 e 65');
});
test('remove o parêntese de parcelamento quando não há parcelamento', () => {
  assert.equal(preencher('cartão ({parcelamento}) ou pix', PADRAO_SLS, null), 'cartão ou pix');
});
