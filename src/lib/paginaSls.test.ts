import { describe, expect, it } from 'vitest';
import { PADRAO_SLS, mesclarConteudoSls, preencher } from './paginaSls';

describe('conteúdo da página SLS', () => {
  it('usa 15 e 65 dias úteis quando nada foi salvo', () => {
    const c = mesclarConteudoSls(null);
    expect(c.prazoSls).toBe(15);
    expect(c.prazoSobEncomenda).toBe(65);
  });
  it('mantém o prazo salvo e ignora prazo inválido', () => {
    expect(mesclarConteudoSls({ prazoSls: 20 }).prazoSls).toBe(20);
    expect(mesclarConteudoSls({ prazoSls: 0 }).prazoSls).toBe(15);
  });
  it('troca os marcadores de prazo', () => {
    expect(preencher('em {prazo} e {prazo_encomenda}', { ...PADRAO_SLS, prazoSls: 12 })).toBe('em 12 e 65');
  });
  it('remove o parêntese de parcelamento quando não há parcelamento', () => {
    expect(preencher('cartão ({parcelamento}) ou pix', PADRAO_SLS, null)).toBe('cartão ou pix');
  });
});
