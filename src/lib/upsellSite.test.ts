import { describe, it, expect } from 'vitest';
import { agruparPedidosSite, type PedidoSite } from './upsellSite';

const p = (id: string, o: Partial<PedidoSite>): PedidoSite => ({ id, numero: `#KWZ-${id}`, nome: 'Ana', email: null, telefone: null, cidade: null, estado: null, total: '100', criado_em: '2026-10-20T10:00:00Z', itens: [], ...o });

describe('agruparPedidosSite', () => {
  it('junta pedidos do mesmo telefone mesmo com formatos diferentes', () => {
    const r = agruparPedidosSite([p('1', { telefone: '(11) 98888-7777' }), p('2', { telefone: '+55 11 988887777', total: '50' })]);
    expect(r).toHaveLength(1);
    expect(r[0].total).toBe(150);
    expect(r[0].pedidos).toHaveLength(2);
  });
  it('sem telefone, agrupa por e-mail ignorando maiúsculas', () => {
    expect(agruparPedidosSite([p('1', { email: 'A@x.com' }), p('2', { email: 'a@x.com' })])).toHaveLength(1);
  });
});
