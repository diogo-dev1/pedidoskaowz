/**
 * Normaliza um telefone para o formato aceito pelo WhatsApp (somente dígitos, com DDI 55).
 * Retorna null quando o número não é utilizável.
 * Mesma lógica usada em CheckoutsAbandonados e no cálculo de métricas de clientes.
 */
export function normalizarTelefone(tel: string | null | undefined): string | null {
  if (!tel) return null;
  let d = tel.replace(/\D/g, '');
  if (d.startsWith('00')) d = d.slice(2);
  if (!d.startsWith('55') && (d.length === 10 || d.length === 11)) d = '55' + d;
  return d.length >= 12 ? d : null;
}
