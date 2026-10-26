import { normalizarTelefone } from '@/lib/telefone';

export interface PedidoSite {
  id: string; numero: string; nome: string; email: string | null; telefone: string | null;
  cidade: string | null; estado: string | null; total: string; criado_em: string;
  itens: { titulo: string }[];
}
export interface ClienteSite {
  chave: string; nome: string; email: string | null; telefone: string | null; fone: string | null;
  cidade: string | null; uf: string | null; total: number; pedidos: PedidoSite[];
  produtos: string[]; ultimo: string;
}

/** Agrupa pedidos do mesmo cliente por telefone normalizado; sem telefone, por e-mail. */
export function agruparPedidosSite(pedidos: PedidoSite[]): ClienteSite[] {
  const mapa = new Map<string, ClienteSite>();
  const ordenados = [...pedidos].sort((a, b) => (a.criado_em < b.criado_em ? 1 : -1));
  for (const p of ordenados) {
    const fone = normalizarTelefone(p.telefone);
    const email = p.email?.trim().toLowerCase() || null;
    const chave = fone ? `t:${fone}` : email ? `e:${email}` : `p:${p.id}`;
    let c = mapa.get(chave);
    if (!c) {
      c = { chave, nome: p.nome, email, telefone: p.telefone, fone, cidade: p.cidade, uf: p.estado, total: 0, pedidos: [], produtos: [], ultimo: p.criado_em };
      mapa.set(chave, c);
    }
    c.pedidos.push(p);
    c.total += Number(p.total) || 0;
    for (const i of p.itens) if (i.titulo && !c.produtos.includes(i.titulo)) c.produtos.push(i.titulo);
  }
  return [...mapa.values()];
}
