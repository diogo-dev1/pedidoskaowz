export function normalizePaymentStatus(status: string): string {
  return status.normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim().toLowerCase();
}

export function confirmedPayment(status: string): boolean {
  return !['pendente', 'cancelado', 'estornado', 'reembolsado', 'aguardando'].includes(normalizePaymentStatus(status));
}

export function awaitingPayment(status: string): boolean {
  return ['pendente', 'aguardando'].includes(normalizePaymentStatus(status));
}

export function sheetPaymentCellEqual(index: number, old: string, next: string): boolean {
  if (index === 4) {
    const amount = (v: string) => {
      const raw = v.replace(/R\$|\s/g, '');
      return Number(raw.includes(',') ? raw.replace(/\./g, '').replace(',', '.') : raw);
    };
    return Math.round(amount(old) * 100) === Math.round(amount(next) * 100);
  }
  if (index === 6) return normalizePaymentStatus(old) === normalizePaymentStatus(next);
  return old === next;
}

export interface PaymentOrder {
  financial_status: string;
  cancelled_at?: string | null;
  processed_at?: string | null;
  total_price: string;
  refunds?: { transactions?: { kind: string; status: string; amount: string }[] }[];
}
export interface PaymentTransaction {
  kind: string;
  status: string;
  processed_at?: string | null;
  created_at?: string;
  amount?: string;
}

export function shopifySheetStatus(order: PaymentOrder): 'Pago' | 'Cancelado' | 'Estornado' | null {
  if (order.cancelled_at) return 'Cancelado';
  if (['refunded', 'voided'].includes(order.financial_status)) return 'Estornado';
  if (['paid', 'partially_refunded'].includes(order.financial_status)) return 'Pago';
  return null;
}

export function netShopifyValue(order: PaymentOrder): number {
  const refunds = (order.refunds || []).flatMap(r => r.transactions || [])
    .filter(t => t.kind === 'refund' && t.status === 'success')
    .reduce((sum, t) => sum + Number(t.amount), 0);
  return Math.max(0, Math.round((Number(order.total_price) - refunds) * 100) / 100);
}

export function paymentDate(order: PaymentOrder, transactions: PaymentTransaction[]): string {
  // The last successful capture/sale is when the whole order became paid (authorizations do not count).
  const dates = transactions.filter(t => t.status === 'success' && ['sale', 'capture'].includes(t.kind))
    .map(t => t.processed_at || t.created_at).filter((d): d is string => !!d && Number.isFinite(Date.parse(d))).sort();
  const iso = dates.at(-1) || order.processed_at;
  if (!iso || !Number.isFinite(Date.parse(iso))) throw new Error('Data de pagamento indisponível');
  return new Date(iso).toLocaleDateString('pt-BR', { timeZone: 'America/Sao_Paulo' });
}

export function shopifyMarker(observation: string): string | undefined {
  return observation.match(/Shopify\s+(#[A-Za-z0-9]+(?:-[A-Za-z0-9]+)*)\b/i)?.[1];
}