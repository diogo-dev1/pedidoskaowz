export interface Sale {
  id: string;
  date: string;
  name: string;
  channel: string;
  seller: string;
  value: number;
  paymentMethod: string;
  status: string;
  item: string;
  observation: string;
  coupon: string;
  grupoPedidos: string;
  bling: string;
  controle: string;
}

export interface SalesMetrics {
  totalSales: number;
  totalCount: number;
  averageTicket: number;
  salesByPaymentMethod: Record<string, number>;
  salesBySeller: Record<string, number>;
  salesByChannel: Record<string, number>;
  salesByDate: { date: string; value: number }[];
}
