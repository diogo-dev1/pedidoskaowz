export interface ClientData {
  nome: string;
  cpf: string;
  cep: string;
  estado: string;
  cidade: string;
  bairro: string;
  endereco: string;
  numero: string;
  complemento: string;
  celular: string;
  email: string;
  dataNascimento: string;
}

const FIELD_MAP: Record<number, keyof ClientData> = {
  1: 'nome',
  2: 'cpf',
  3: 'cep',
  4: 'estado',
  5: 'cidade',
  6: 'bairro',
  7: 'endereco',
  8: 'numero',
  9: 'complemento',
  10: 'celular',
  11: 'email',
  12: 'dataNascimento',
};

/**
 * Parseia texto colado no formato numerado:
 *   1. NOME: José Willian
 *   2. CPF: 076.061.239-00
 *   ...
 * Aceita variações: com/sem ponto, com/sem espaço, com emoji (⁠), com texto do label em qualquer case.
 */
export function parseClientData(raw: string): Partial<ClientData> {
  const result: Partial<ClientData> = {};
  const lines = raw.split('\n');

  for (const line of lines) {
    const cleaned = line.replace(/[⁠​ ]/g, '').trim();
    const match = cleaned.match(/^(\d{1,2})\s*[.)\-:]\s*.+?:\s*(.+)$/);
    if (!match) continue;
    const num = parseInt(match[1], 10);
    const value = match[2].trim();
    const field = FIELD_MAP[num];
    if (field && value) {
      result[field] = value;
    }
  }

  return result;
}
