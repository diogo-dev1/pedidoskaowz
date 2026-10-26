// Helpers compartilhados entre a base Bling e as vendas recentes do site no Upsell.
export interface ClienteMensagem { nome: string | null; cidade: string | null; total_gasto: number; qtd_pedidos: number; produtos: string[] | null; ultimo_pedido_em: string | null }
// ──────────────────────────────────────────────────────────────────
export const brl = (v: number | null | undefined) =>
  typeof v === 'number' && !isNaN(v) ? v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }) : '—';

export const dataHora = (iso: string) =>
  new Date(iso).toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' });

export const diasDesde = (data: string | null): number | null => {
  if (!data) return null;
  return Math.floor((Date.now() - new Date(`${data}T00:00:00`).getTime()) / 86400_000);
};

export const rotuloDias = (data: string | null) => {
  const d = diasDesde(data);
  if (d === null) return 'sem pedidos';
  if (d < 1) return 'hoje';
  if (d === 1) return 'ontem';
  return `há ${d}d`;
};

export const STATUS_META: Record<string, { label: string; className: string }> = {
  pendente: { label: 'Pendente', className: 'bg-amber-500/15 text-amber-600 border-amber-500/30' },
  contatado: { label: 'Contatado', className: 'bg-blue-500/15 text-blue-600 border-blue-500/30' },
  vendeu: { label: 'Vendeu', className: 'bg-emerald-500/15 text-emerald-600 border-emerald-500/30' },
  sem_interesse: { label: 'Sem interesse', className: 'bg-muted text-muted-foreground border-border' },
};

export const VARIAVEIS_MENSAGEM = [
  '{nome}', '{nome_completo}', '{vendedor}', '{cidade}', '{total_gasto}',
  '{qtd_pedidos}', '{ultimo_produto}', '{produtos}', '{dias_sem_comprar}',
];

export function montarMensagem(tpl: string, c: ClienteMensagem, vendedor: string): string {
  const nomeCompleto = c.nome ?? 'cliente';
  const produtos = (c.produtos ?? []).slice(0, 4).join(', ');
  const dias = diasDesde(c.ultimo_pedido_em);
  const vars: Record<string, string> = {
    '{nome_completo}': nomeCompleto,
    '{nome}': nomeCompleto.split(' ')[0] || 'tudo bem',
    '{vendedor}': vendedor,
    '{cidade}': c.cidade ?? '',
    '{total_gasto}': brl(c.total_gasto),
    '{qtd_pedidos}': String(c.qtd_pedidos ?? 0),
    '{ultimo_produto}': (c.produtos ?? [])[0] ?? 'sua última compra',
    '{produtos}': produtos || 'sua última compra',
    '{dias_sem_comprar}': dias === null ? '' : String(dias),
    // compatibilidade com modelos antigos (por pedido)
    '{itens}': produtos || 'sua última compra',
    '{total}': brl(c.total_gasto),
    '{data}': c.ultimo_pedido_em ? new Date(`${c.ultimo_pedido_em}T00:00:00`).toLocaleDateString('pt-BR') : '',
    '{pedido}': '',
  };
  let out = tpl;
  for (const [k, v] of Object.entries(vars)) out = out.split(k).join(v);
  return out;
}

