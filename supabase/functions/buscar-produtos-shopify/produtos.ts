export function textoSimples(html: string): string {
  return html.replace(/<(script|style)\b[^>]*>[\s\S]*?<\/\1>/gi, '')
    .replace(/<br\s*\/?\s*>|<\/(p|div|li|h[1-6])>/gi, '\n')
    .replace(/<[^>]+>/g, '').replace(/&nbsp;/g, ' ').replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"')
    .replace(/&#(\d+);/g, (_, n) => String.fromCodePoint(Number(n)))
    .replace(/&#x([\da-f]+);/gi, (_, n) => String.fromCodePoint(parseInt(n, 16)))
    .replace(/[ \t]+\n/g, '\n').replace(/\n{3,}/g, '\n\n').trim();
}

export interface ProdutoNode {
  id: string; title: string; descriptionHtml?: string; handle: string; onlineStoreUrl?: string;
  status: string; images?: { nodes: { url: string }[] };
  variants?: { nodes: { price: string; compareAtPrice?: string; availableForSale: boolean }[] };
}

export function mapearProduto(p: ProdutoNode) {
  const variantes = p.variants?.nodes ?? [];
  const menor = variantes.reduce<typeof variantes[number] | undefined>((a, v) => !a || Number(v.price) < Number(a.price) ? v : a, undefined);
  const preco = Number(menor?.price) || 0;
  const comparado = Number(menor?.compareAtPrice) || 0;
  return { produtoId: p.id, titulo: p.title, descricao: textoSimples(p.descriptionHtml ?? ''),
    imagens: (p.images?.nodes ?? []).slice(0, 10).map(i => i.url), preco,
    precoDe: comparado > preco ? comparado : null,
    link: p.onlineStoreUrl || `https://kaowz.com.br/products/${p.handle}`,
    disponivel: variantes.some(v => v.availableForSale) };
}