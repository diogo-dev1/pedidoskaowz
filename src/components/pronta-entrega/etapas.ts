// Regras de etapa do painel de Pronta Entrega.
// Tudo aqui só LÊ os campos do pedido — nada é salvo no banco.
// A regra de prazo continua em src/lib/prontaEntrega.ts (não alterar).

import { diasUteisRestantes, ymdBR } from '@/lib/prontaEntrega';
import { pendente, ultimoEnvio, type PedidoPE } from '@/lib/pedidoPE';

export type Etapa = 'novos' | 'preparo' | 'prontos' | 'enviados';

export const ETAPAS: { key: Etapa; titulo: string; curto: string }[] = [
  { key: 'novos', titulo: 'Novos', curto: 'Novos' },
  { key: 'preparo', titulo: 'Em preparo', curto: 'Preparo' },
  { key: 'prontos', titulo: 'Prontos para enviar', curto: 'Prontos' },
  { key: 'enviados', titulo: 'Enviados', curto: 'Enviados' },
];

/** Etapas em que o pedido ainda precisa de ação (contam como "em aberto"). */
export const ETAPAS_ATIVAS: Etapa[] = ['novos', 'preparo', 'prontos'];

/** Quantos dias o painel mostra na coluna Enviados. */
const DIAS_ENVIADOS = 30;

/** Pedido sem prazo calculado vai para o fim da fila. */
const SEM_PRAZO = 99;

/**
 * Em que etapa o pedido está.
 * Todo pedido precisa de case E certificado antes de ir para "Prontos para enviar".
 */
export function etapaDoPedido(p: PedidoPE): Etapa {
  if (!pendente(p)) return 'enviados';
  if (!p.visualizado) return 'novos';
  if (p.case_pronta && p.certificado_pronto) return 'prontos';
  return 'preparo';
}

/** Dias úteis até o prazo: 0 = vence hoje, negativo = atrasado. */
export function diasRestantes(p: PedidoPE, feriados: Set<string>, agora: Date): number {
  if (!p.prazo_limite) return SEM_PRAZO;
  return diasUteisRestantes(p.prazo_limite, feriados, agora);
}

/** Atrasado primeiro, depois o que vence hoje, e assim por diante.
 *  Empate: quem pagou antes vem antes. */
export function ordenarPorPrazo(pedidos: PedidoPE[], dias: (p: PedidoPE) => number): PedidoPE[] {
  return [...pedidos].sort((a, b) => {
    const diferenca = dias(a) - dias(b);
    if (diferenca !== 0) return diferenca;
    return (a.data_pagamento || '').localeCompare(b.data_pagamento || '');
  });
}

/** Enviado (total ou parcial) dentro da janela de 30 dias — mesma regra de antes. */
export function enviadoRecente(p: PedidoPE, agora: Date): boolean {
  if (pendente(p)) return false;
  if (!['enviado', 'enviado_parcial'].includes(p.status)) return false;

  const envio = ultimoEnvio(p);
  if (!envio) return false;

  const limite = agora.getTime() - DIAS_ENVIADOS * 86400000;
  return new Date(envio).getTime() >= limite;
}

/** Último envio aconteceu hoje (fuso de São Paulo). */
export function enviadoHoje(p: PedidoPE, agora: Date): boolean {
  const envio = ultimoEnvio(p);
  if (!envio) return false;
  return ymdBR(new Date(envio)) === ymdBR(agora);
}

/** Separa os pedidos nas 4 colunas, já ordenados. */
export function separarPorEtapa(
  pedidos: PedidoPE[],
  dias: (p: PedidoPE) => number,
  agora: Date,
): Record<Etapa, PedidoPE[]> {
  const grupos: Record<Etapa, PedidoPE[]> = { novos: [], preparo: [], prontos: [], enviados: [] };

  for (const p of pedidos) {
    const etapa = etapaDoPedido(p);
    if (etapa === 'enviados' && !enviadoRecente(p, agora)) continue;
    grupos[etapa].push(p);
  }

  return {
    novos: ordenarPorPrazo(grupos.novos, dias),
    preparo: ordenarPorPrazo(grupos.preparo, dias),
    prontos: ordenarPorPrazo(grupos.prontos, dias),
    // Enviados: o mais recente primeiro.
    enviados: grupos.enviados.sort((a, b) => (ultimoEnvio(b) || '').localeCompare(ultimoEnvio(a) || '')),
  };
}

export interface ContagemUrgencia {
  atrasados: number;
  venceHoje: number;
  emAberto: number;
  enviadosHoje: number;
}

export function contarUrgencia(
  colunas: Record<Etapa, PedidoPE[]>,
  dias: (p: PedidoPE) => number,
  agora: Date,
): ContagemUrgencia {
  const ativos = ETAPAS_ATIVAS.flatMap((etapa) => colunas[etapa]);

  return {
    atrasados: ativos.filter((p) => dias(p) < 0).length,
    venceHoje: ativos.filter((p) => dias(p) === 0).length,
    emAberto: ativos.length,
    enviadosHoje: colunas.enviados.filter((p) => enviadoHoje(p, agora)).length,
  };
}

/** O que ainda falta para o pedido sair (usado nos cards do Modo TV). */
export function oQueFalta(p: PedidoPE): string {
  const etapa = etapaDoPedido(p);
  if (etapa === 'novos') return 'Falta: distribuir tarefas';
  if (etapa === 'prontos') return 'Falta: enviar';
  if (etapa === 'enviados') return 'Enviado';

  const faltando = [];
  if (!p.case_pronta) faltando.push('case');
  if (!p.certificado_pronto) faltando.push('certificado');
  return `Falta: ${faltando.join(' e ')}`;
}

/** Texto pronto para mandar ao cliente pelo WhatsApp. */
export function mensagemCliente(p: PedidoPE): string {
  const primeiroNome = (p.cliente_nome || '').trim().split(' ')[0];
  const saudacao = primeiroNome ? `Olá, ${primeiroNome}!` : 'Olá!';

  return [
    `${saudacao} Seu pedido ${p.pedido_numero} da Kaowz foi enviado 🚚`,
    `Código de rastreio: ${p.rastreio}`,
    'Acompanhe em https://rastreamento.correios.com.br',
  ].join('\n');
}
