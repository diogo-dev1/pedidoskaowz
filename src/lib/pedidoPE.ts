import { supabase } from '@/integrations/supabase/client';
import { TZ_BR, type ItemPE } from '@/lib/prontaEntrega';
export interface ItemPedidoPE extends ItemPE { propriedades?: { key: string; value: string }[]; certificado?: string | null }
export interface PedidoPE {
  id: string; pedido_numero: string; shopify_order_id: string | null; origem: string;
  cliente_nome: string | null; cliente_telefone: string | null; vendedor: string | null;
  data_pagamento: string | null; itens: ItemPedidoPE[]; classificacao: string; prazo_limite: string | null;
  status: string; enviado_em: string | null; enviado_por: string | null; rastreio: string | null; observacao: string | null;
  visualizado: boolean; visualizado_em: string | null; case_pronta: boolean; case_pronta_em: string | null;
  certificado_pronto: boolean; certificado_pronto_em: string | null; certificados: string[]; embalagens: string[];
  observacao_pedido: string | null; detalhes: DetalhesPE | null; rastreio_servico: string | null; rastreio_buscado_em: string | null; rastreio_origem: string | null;
}
interface DetalhesPE {
  email?: string; phone?: string; note?: string; cpf_cnpj?: string; aviso?: string; paymentGatewayNames?: string[];
  totalPriceSet?: { shopMoney: { amount: string; currencyCode: string } }; shippingLine?: { title: string };
  customer?: { displayName?: string; email?: string; phone?: string };
  shippingAddress?: { name?: string; phone?: string; address1?: string; address2?: string; city?: string; province?: string; provinceCode?: string; zip?: string };
}
export const normalPE = (v: string) => v.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/\s+/g, ' ').trim();
export const pendente = (p: PedidoPE) => p.itens.some(i => i.pronta_entrega && !i.enviado);
export const ultimoEnvio = (p: PedidoPE) => p.itens.filter(i => i.pronta_entrega && i.enviado && i.enviado_em).map(i => i.enviado_em || '').sort().reverse()[0] || p.enviado_em;
export const dataHora = (d?: string | null) => d ? new Date(d).toLocaleString('pt-BR', { timeZone: TZ_BR, day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' }) : '—';
export const dataDia = (d?: string | null) => d ? d.split('-').reverse().join('/') : '—';
export const nomesCertificado = (p: PedidoPE) => p.certificados?.length ? p.certificados : [...new Set(p.itens.map(i => i.certificado).filter((n): n is string => !!n))];
export const certificadoDiferente = (p: PedidoPE) => nomesCertificado(p).filter(n => normalPE(n) !== normalPE(p.cliente_nome || ''));
export function textoPrazo(r: number) { return r < 0 ? `Atrasado há ${-r} ${r === -1 ? 'dia útil' : 'dias úteis'}` : r === 0 ? 'Enviar hoje' : r === 1 ? 'Vence amanhã' : `Faltam ${r} dias úteis`; }
export function corPrazo(r: number) { return r < 0 ? { faixa: 'bg-destructive', texto: 'text-destructive' } : r === 0 ? { faixa: 'bg-primary', texto: 'text-primary' } : r === 1 ? { faixa: 'bg-warning', texto: 'text-warning' } : { faixa: 'bg-success', texto: 'text-success' }; }
export async function acaoPE(body: Record<string, unknown>) {
  const { data, error } = await supabase.functions.invoke('sincronizar-pronta-entrega', { body });
  if (error || !data?.sucesso) throw new Error(data?.erro || error?.message || 'Não foi possível salvar');
  return data;
}
