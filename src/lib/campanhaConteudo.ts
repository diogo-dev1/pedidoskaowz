// Extrai da descrição livre dos itens o conteúdo da landing: manchete, pilares e ficha técnica.
import type { CampanhaItem } from './campanhas';
import { limparDescricao } from './campanhaCombos';

export interface Pilar { titulo: string; texto: string }
export interface Spec { rotulo: string; valor: string }
export interface ConteudoItem { manchete: string | null; chamada: string | null; pilares: Pilar[]; specs: Spec[]; inclusos: string[] }

const MARCADOR = /^\s*(?:📌\s*|•\s*|✅\s*|✔️?\s*|[-*]\s+)/u;
const limpar = (t: string) => t.replace(/\u00a0/g, ' ').replace(/[ \t]+/g, ' ').trim();
const ehTitulo = (b: string) => !b.includes('\n') && b.length <= 80 && /\p{L}/u.test(b) && b === b.toLocaleUpperCase('pt-BR') && !MARCADOR.test(b);
const primeiraFrase = (t: string) => t.split(/(?<=[.!?])\s+(?=[A-ZÀ-Ú])/)[0];

export function conteudoDoItem(descricao: string | null | undefined): ConteudoItem {
  const blocos = limparDescricao(descricao).split(/\n\s*\n/).map(limpar).filter(Boolean);
  const specs: Spec[] = [];
  const inclusos: string[] = [];
  const texto: string[] = [];
  for (const bloco of blocos) {
    const linhas = bloco.split('\n').map(limpar);
    const marcadas = linhas.filter(l => MARCADOR.test(l));
    if (!marcadas.length) { texto.push(bloco); continue; }
    for (const l of marcadas) {
      const s = l.replace(MARCADOR, '');
      const m = s.match(/^([^:]{2,40}):\s*(.+)$/);
      if (m) specs.push({ rotulo: m[1].trim(), valor: m[2].trim() });
      else inclusos.push(s.replace(/^incluso\s+/i, ''));
    }
  }
  const corpo = texto.filter(b => !/^especifica[çc][õo]es/i.test(b));
  let manchete: string | null = null;
  let chamada: string | null = null;
  const pilares: Pilar[] = [];
  corpo.forEach((b, i) => {
    if (!ehTitulo(b)) return;
    const seguinte = corpo[i + 1];
    if (manchete == null) {
      manchete = b.split(/\s[—–-]\s/).pop() ?? b;
      if (seguinte && !ehTitulo(seguinte) && seguinte.length <= 140) chamada = seguinte;
      return;
    }
    if (seguinte && !ehTitulo(seguinte)) pilares.push({ titulo: b, texto: primeiraFrase(seguinte) });
  });
  return { manchete, chamada, pilares, specs, inclusos };
}

/** Nome que diferencia cada item dos outros: "Push Dagger Micro Sandvik - SLS" → "Micro". */
export function nomesDistintos(itens: Pick<CampanhaItem, 'id' | 'titulo' | 'titulo_curto'>[]): Record<string, string> {
  const palavras = itens.map(i => i.titulo.split(/\s+/).filter(p => !/^[-–—]$/.test(p)));
  const comuns = new Set(palavras[0]?.filter(p => itens.length > 1 && palavras.every(ps => ps.includes(p))));
  return Object.fromEntries(itens.map((item, i) => {
    const proprio = palavras[i].filter(p => !comuns.has(p)).join(' ');
    return [item.id, item.titulo_curto?.trim() || proprio || item.titulo];
  }));
}

export interface FichaCampanha { comparar: { rotulo: string; valores: Record<string, string> }[]; comuns: Spec[] }

/** Separa o que muda entre os itens (tabela comparativa) do que é igual em todos. */
export function fichaDaCampanha(itens: { id: string; specs: Spec[] }[]): FichaCampanha {
  const rotulos = [...new Set(itens.flatMap(i => i.specs.map(s => s.rotulo)))];
  const comparar: FichaCampanha['comparar'] = [];
  const comuns: Spec[] = [];
  for (const rotulo of rotulos) {
    const valores = Object.fromEntries(itens.map(i => [i.id, i.specs.find(s => s.rotulo === rotulo)?.valor ?? '—']));
    const distintos = new Set(Object.values(valores).map(v => v.toLocaleLowerCase('pt-BR')));
    // Só é "comum" o que é igual em todos; qualquer diferença (ou ausência) vai para a comparação.
    if (distintos.size === 1 && !distintos.has('—')) comuns.push({ rotulo, valor: Object.values(valores)[0] });
    else if (itens.length > 1) comparar.push({ rotulo, valores });
  }
  return { comparar, comuns };
}

/** Medida que mais ajuda a escolher o tamanho, para mostrar no card. */
export const medidaChave = (comparar: FichaCampanha['comparar']) =>
  comparar.find(c => /comprimento total/i.test(c.rotulo)) ?? comparar[0];
