import { blingGet } from '../_shared/bling.ts';
export const normal = (value: string) => String(value ?? '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/\s+/g, ' ').trim();
export function valoresNota(note: string, label: string): string[] {
  const result: string[] = []; let current: string[] | null = null;
  const flush = () => { if (current?.length) result.push(current.join(' ').trim()); current = null; };
  for (const line of String(note ?? '').split('\n')) {
    const match = line.match(/^([^:]+):\s*(.*)$/);
    if (match && normal(match[1]) === normal(label)) { flush(); current = match[2] ? [match[2].trim()] : []; }
    else if (!line.trim() || match || /^[━─]|^\d+\s*·|^PEDIDO INTERNO|^⚡/.test(line)) flush();
    else if (current) current.push(line.trim());
  }
  flush(); return [...new Set(result.filter(Boolean))];
}
export function extrairDados(order: any, origem: string, itens: any[]) {
  const prop = (key: string) => (order.customAttributes ?? []).find((p: any) => normal(p.key) === normal(key))?.value?.trim();
  const certificados = [...new Set(itens.map(i => i.certificado).filter(Boolean))];
  return { certificados: certificados.length ? certificados : valoresNota(order.note ?? '', 'Certificado'), embalagens: valoresNota(order.note ?? '', 'Embalagem'), observacao_pedido: prop('Observação') || (origem === 'simulador' ? valoresNota((order.note ?? '').split('━━━━━━━━━━━━━━━━━━').at(-1) ?? '', 'Observação').join('\n') : order.note || null) };
}
const baseFields = `name note processedAt displayFinancialStatus paymentGatewayNames
 totalPriceSet { shopMoney { amount currencyCode } } shippingLine { title } customAttributes { key value }`;
export async function obterDetalhes(shopify: (q: string, v: Record<string, unknown>) => Promise<any>, id: string) {
  const groups = {
    email: 'email', phone: 'phone', shippingAddress: 'shippingAddress { name phone address1 address2 city province provinceCode zip }',
    billingAddress: 'billingAddress { name phone address1 address2 city province provinceCode zip }',
    customer: 'customer { displayName email phone metafield(namespace: "kaowz", key: "cpf") { value } }',
    localizedFields: 'localizedFields(first: 5) { edges { node { countryCode purpose title value } } }',
  };
  const active = new Set(Object.keys(groups)); const avisos: string[] = [];
  for (let attempt = 0; attempt < 7; attempt++) {
    try {
      const d = await shopify(`query($id: ID!) { order(id: $id) { ${baseFields} ${[...active].map(k => groups[k as keyof typeof groups]).join(' ')} } }`, { id });
      if (!d?.order) throw new Error('Pedido não encontrado no Shopify');
      const o = d.order;
      const attributes = o.customAttributes ?? [];
      const tax = o.localizedFields?.edges?.map((e: any) => e.node).find((n: any) => n.value && (normal(n.title) === 'cpf/cnpj' || /TAX/i.test(n.purpose ?? '')))?.value;
      return { ...o, cpf_cnpj: tax || attributes.find((p: any) => normal(p.key) === 'cpf')?.value || o.customer?.metafield?.value || null, ...(avisos.length ? { aviso: `Shopify não liberou ${avisos.join(', ')} para o app` } : {}) };
    } catch (e) {
      const message = (e as Error).message;
      if (!/access|denied|protected|permission|not approved|not authorized|scope/i.test(message)) throw e;
      const remove = [...active].filter(k => message.toLowerCase().includes(k.toLowerCase()) || (k === 'customer' && /customer|cliente/i.test(message)));
      const keys = remove.length ? remove : [...active];
      if (!keys.length) throw e;
      for (const key of keys) { active.delete(key); avisos.push(({ email: 'e-mail', phone: 'telefone', customer: 'dados do cliente', shippingAddress: 'endereço de entrega', billingAddress: 'endereço de cobrança', localizedFields: 'CPF/CNPJ' } as Record<string, string>)[key]); }
    }
  }
  throw new Error('Não foi possível carregar os detalhes');
}
export async function buscarRastreio(db: any, pedido: any) {
  if (!pedido.shopify_order_id) return { encontrado: false, aviso: 'Pedido manual: informe o rastreio manualmente' };
  if (pedido.rastreio_origem === 'manual') return { encontrado: !!pedido.rastreio, manual: true, aviso: 'Rastreio manual preservado' };
  const now = new Date().toISOString();
  const numericId = String(pedido.shopify_order_id).match(/(\d+)$/)?.[1];
  if (!numericId) throw new Error('ID do Shopify inválido');
  let detalhe: any;
  try {
    if (pedido.bling_pedido_id) {
      const candidate = (await blingGet(db, `pedidos/vendas/${encodeURIComponent(pedido.bling_pedido_id)}`)).data;
      if (String(candidate?.numeroLoja ?? '') === numericId) detalhe = candidate;
    }
    if (!detalhe) {
      // Cache narrows candidates, but always verify numeroLoja from the API detail.
      const { data: cache } = await db.from('bling_pedidos').select('bling_id').contains('dados_completos', { numeroLoja: numericId }).limit(1);
      if (cache?.[0]) {
        const candidate = (await blingGet(db, `pedidos/vendas/${cache[0].bling_id}`)).data;
        if (String(candidate?.numeroLoja ?? '') === numericId) detalhe = candidate;
      }
      const seen = new Set<string>();
      const check = async (candidate: any, inspectMissing: boolean) => {
        if (!candidate?.id || seen.has(String(candidate.id))) return null;
        seen.add(String(candidate.id));
        if (candidate.numeroLoja != null && String(candidate.numeroLoja) !== numericId) return null;
        if (candidate.numeroLoja == null && !inspectMissing) return null;
        const d = (await blingGet(db, `pedidos/vendas/${candidate.id}`)).data;
        return String(d?.numeroLoja ?? '') === numericId ? d : null;
      };
      if (!detalhe) {
        const filtered = await blingGet(db, `pedidos/vendas?numerosLojas[]=${encodeURIComponent(numericId)}&limite=100`);
        for (const c of filtered.data ?? []) { detalhe = await check(c, false); if (detalhe) break; }
      }
      if (!detalhe) {
        const initial = new Date(pedido.data_pagamento || now); initial.setUTCDate(initial.getUTCDate() - 3);
        // Full paginated date window; never accept a result from an ignored filter.
        for (let page = 1; ; page++) {
          const list = await blingGet(db, `pedidos/vendas?dataInicial=${initial.toISOString().slice(0, 10)}&dataFinal=${now.slice(0, 10)}&pagina=${page}&limite=100`);
          const rows = list.data ?? [];
          for (const candidate of rows) { detalhe = await check(candidate, true); if (detalhe) break; }
          if (detalhe || rows.length < 100) break;
        }
      }
    }
    const volumes = detalhe?.transporte?.volumes ?? [];
    const codigos = [...new Set(volumes.map((v: any) => String(v.codigoRastreamento ?? '').trim()).filter(Boolean))];
    const servicos = [...new Set(volumes.map((v: any) => String(v.servico ?? '').trim()).filter(Boolean))];
    const patch = { rastreio_buscado_em: now, ...(detalhe?.id ? { bling_pedido_id: String(detalhe.id) } : {}), ...(codigos.length ? { rastreio: codigos.join(', '), rastreio_servico: servicos.join(', '), rastreio_origem: 'bling' } : {}) };
    // Atomic guard prevents a concurrent manual edit being overwritten.
    const { error } = await db.from('pedidos_pronta_entrega').update(patch).eq('id', pedido.id).or('rastreio_origem.is.null,rastreio_origem.neq.manual');
    if (error) throw error;
    return { encontrado: codigos.length > 0, rastreio: codigos.join(', ') };
  } catch (e) {
    await db.from('pedidos_pronta_entrega').update({ rastreio_buscado_em: now }).eq('id', pedido.id);
    return { encontrado: false, aviso: `Bling: ${(e as Error).message}` };
  }
}
