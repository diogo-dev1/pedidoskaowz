import { test } from 'node:test';
import assert from 'node:assert/strict';
import { confirmedPayment, awaitingPayment, shopifySheetStatus, paymentDate, netShopifyValue, shopifyMarker, sheetPaymentCellEqual } from '../../supabase/functions/_shared/salesPayment';

for (const status of ['Pendente', 'Cancelado', 'Estornado', 'Reembolsado', 'Aguardando']) {
  test(`receita exclui ${status} ignorando caixa e acentos`, () => {
    assert.equal(confirmedPayment(` ${status.toUpperCase()} `), false);
    assert.equal(confirmedPayment(status.replace('a', 'á')), false);
  });
}
for (const status of ['', 'Pago', 'Recebido', 'Ok']) {
  test(`receita preserva status manual ${status || 'vazio'}`, () => assert.equal(confirmedPayment(status), true));
}
test('pendências ficam separadas de cancelamentos', () => {
  assert.equal(awaitingPayment('Aguardando'), true);
  assert.equal(awaitingPayment('Pendente'), true);
  assert.equal(awaitingPayment('Cancelado'), false);
});
for (const status of ['pending', 'authorized', 'voided', 'refunded']) {
  test(`Shopify não lança ${status}`, () => assert.notEqual(shopifySheetStatus({ financial_status: status, total_price: '100' }), 'Pago'));
}
test('cancelamento prevalece sobre paid', () => assert.equal(shopifySheetStatus({ financial_status: 'paid', total_price: '100', cancelled_at: '2026-11-19' }), 'Cancelado'));
test('paid entra na planilha', () => assert.equal(shopifySheetStatus({ financial_status: 'paid', total_price: '100' }), 'Pago'));
test('partially_refunded usa líquido descontando só refunds bem sucedidos', () => {
  const o = { financial_status: 'partially_refunded', total_price: '100', refunds: [{ transactions: [{kind:'refund',status:'success',amount:'25'}, {kind:'refund',status:'failure',amount:'10'}] }] };
  assert.equal(shopifySheetStatus(o), 'Pago'); assert.equal(netShopifyValue(o), 75);
});
test('pagamento tardio usa captura bem sucedida em São Paulo', () => assert.equal(paymentDate({ financial_status: 'paid', total_price: '100', processed_at: '2026-11-17T12:00:00Z' }, [
  {kind:'authorization',status:'success',processed_at:'2026-11-17T12:00:00Z'},
  {kind:'capture',status:'success',processed_at:'2026-11-19T01:00:00Z'},
  {kind:'capture',status:'failure',processed_at:'2026-11-19T15:00:00Z'},
]), '18/11/2026'));
test('sem transação usa processed_at', () => assert.equal(paymentDate({financial_status:'paid',total_price:'100',processed_at:'2026-11-19T01:00:00Z'}, []), '18/11/2026'));
test('dedup não confunde números prefixados', () => {
  assert.equal(shopifyMarker('obs | Shopify #1234'), '#1234');
  assert.notEqual(shopifyMarker('Shopify #12345'), '#1234');
  assert.equal(shopifyMarker('Shopify #KWZ-2938'), '#KWZ-2938');
  assert.notEqual(shopifyMarker('Shopify #KWZ-29380'), '#KWZ-2938');
});
test('repetir sync compara valores formatados sem regravar o mesmo pagamento', () => {
  assert.equal(sheetPaymentCellEqual(4, 'R$ 3.855,00', '3855,00'), true);
  assert.equal(sheetPaymentCellEqual(4, 'R$ 3.855,00', '3000,00'), false);
  assert.equal(sheetPaymentCellEqual(6, 'pago', 'Pago'), true);
  assert.equal(sheetPaymentCellEqual(6, 'Pago', 'Cancelado'), false);
});