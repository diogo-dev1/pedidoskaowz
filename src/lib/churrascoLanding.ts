import type { ModeloRecomendavel } from './recomendacao';

/** Edite aqui a ordem, os grupos incluídos e todos os textos de apoio. */
export const CHURRASCO = {
  titulo: 'Linha de Churrasco Kaowz — Refinar o simples',
  descricao: 'Descubra a linha de churrasco Kaowz: Picanheira, Butcher, Chef Royal e Kiritsuke. Do Inox 420 ao Sandvik, Tactical e Kit Pater. Feita para servir e durar.',
  manifesto: 'Refinar o simples.',
  subtitulo: 'Facas de churrasco feitas à mão, uma a uma.',
  familias: [
    { id: 'picanheira', nome: 'Picanheira', titulo: 'O primeiro corte.', apoio: 'A peça que abre o ritual.' },
    { id: 'butcher', nome: 'Butcher', titulo: 'Porcionar sem esforço.', apoio: '' },
    { id: 'chef', nome: 'Chef Royal', titulo: 'Da tábua para a mesa.', apoio: '' },
    { id: 'kiritsuke', nome: 'Kiritsuke', titulo: 'Fatias finas. Corte limpo.', apoio: '' },
    { id: 'complementos', nome: 'Complementos da mesa', titulo: 'A mesa completa.', apoio: 'Garfo, tábua e chaira no mesmo padrão.' },
    { id: 'pater', nome: 'Kit Pater', titulo: 'Pater. Defensor. Provisor.', apoio: '' },
  ],
  passos: ['picanheira', 'butcher', 'chef', 'kiritsuke', 'complementos'],
  // Defina heroiId com o ID do catálogo para fixar uma peça; null escolhe a de mais fotos.
  degraus: [
    { id: 'entrada', titulo: 'Para começar.', material: 'Inox 420', heroiId: null as string | null },
    { id: 'ideal', titulo: 'Para durar.', material: 'Sandvik 14C28N', heroiId: null as string | null },
    { id: 'definitiva', titulo: 'Para deixar.', material: 'Tactical e Kit Pater', heroiId: null as string | null },
  ],
  acos: [
    { id: 'entrada', nome: 'Inox 420', frase: 'Resistente e fácil de cuidar.' },
    { id: 'ideal', nome: 'Sandvik 14C28N', frase: 'Mais fio por mais tempo.' },
    { id: 'definitiva', nome: 'Tactical', frase: 'Acabamento de série limitada.' },
  ],
  confianca: 'Feita à mão · Garantia Kaowz · Até 10x sem juros',
  parcelasSemJuros: 10,
  prazoPadrao: '65 dias úteis',
  fechamento: 'Monte a sua mesa.',
  mensagem: 'Olá! Vi a linha de churrasco da Kaowz e tenho interesse na ',
  mensagemMesa: 'Olá! Vi a linha de churrasco da Kaowz e quero montar a minha',
};
export type ModeloChurrasco = ModeloRecomendavel & { prazo_entrega?: string | null; fotos: string[] };
export interface FamiliaChurrasco { id: string; nome: string; titulo: string; apoio: string; modelos: ModeloChurrasco[] }
export const brl = (n: number) => n.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
const normalizar = (s: string) => s.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
export function pertenceChurrasco(m: ModeloRecomendavel) {
  return (m.casos_uso.includes('churrasco') || (m.categorias ?? []).includes('Churrasco')) && !(m.categorias ?? []).includes('Defesa');
}
export function familiaDoModelo(m: ModeloRecomendavel): string | null {
  const nome = normalizar(m.nome_modelo);
  if (/kit[ -]+pater/.test(nome)) return 'pater';
  if (/^(garfo|tabua|chaira|bainha)/.test(nome)) return 'complementos';
  const grupo = normalizar(m.grupo_escada || '');
  const alvo = grupo || nome;
  if (/^picanheira/.test(alvo)) return 'picanheira';
  if (/^butcher/.test(alvo)) return 'butcher';
  if (/^chef/.test(alvo)) return 'chef';
  if (/^kiritsuke/.test(alvo)) return 'kiritsuke';
  return null;
}
export function degrauDoModelo(m: ModeloRecomendavel): string | null {
  const n = normalizar(m.nome_modelo);
  if (familiaDoModelo(m) === 'pater' || /tactical/.test(n)) return 'definitiva';
  if (m.posicao_escada === 'ideal' || /sandvik|\bsvk\b/.test(n)) return 'ideal';
  if (m.posicao_escada === 'entrada' || /inox|420/.test(n)) return 'entrada';
  return null;
}
export function agruparFamilias(modelos: ModeloChurrasco[], degrau?: string): FamiliaChurrasco[] {
  return CHURRASCO.familias.map(f => ({ ...f, modelos: modelos.filter(m => pertenceChurrasco(m) && m.fotos.length > 0 && familiaDoModelo(m) === f.id && (!degrau || degrauDoModelo(m) === degrau)).sort((a, b) => a.preco_base - b.preco_base) })).filter(f => f.modelos.length > 0);
}
export function fotosDoModelo(m: ModeloRecomendavel, midias: { modelo_id: string; nome_arquivo: string; url: string }[]) {
  return [...new Set([m.imagem_modelo, ...midias.filter(x => x.modelo_id === m.id && !/\.(mp4|webm|mov|avi)(?:\?|$)/i.test(x.nome_arquivo)).map(x => x.url)].filter((x): x is string => !!x))];
}
export function limparTexto(texto: string | null | undefined): string {
  const limpo = (texto || '').replace(/<(script|style)\b[^>]*>[\s\S]*?<\/\1>/gi, '').replace(/<[^>]+>/g, ' ').replace(/&nbsp;|&#160;/gi, ' ').replace(/&amp;/gi, '&').replace(/&quot;|&#34;/gi, '"').replace(/&#39;|&apos;/gi, "'").replace(/^\s*descri[çc][ãa]o do produto\s*[:\-]?\s*/i, '').replace(/\s+/g, ' ').trim();
  return (limpo.match(/[^.!?]+(?:[.!?]+(?=\s|$)|$)/g) || [limpo]).slice(0, 2).map(s => s.trim()).join(' ').trim();
}
export function textoDoModelo(m: ModeloRecomendavel, apoio: string) {
  return [m.porque_texto, m.apresentacao_venda, m.descricao_html].map(limparTexto).find(Boolean) || apoio;
}
export function chipDoModelo(m: ModeloRecomendavel) {
  const n = m.nome_modelo;
  const partes: string[] = [];
  if (/inox|420/i.test(n)) partes.push('Inox 420');
  if (/sandvik|\bsvk\b/i.test(n)) partes.push('Sandvik');
  if (/tactical/i.test(n)) partes.push('Tactical');
  const tamanho = n.match(/\d+(?:[.,]\d+)?\s*["'”″]/);
  if (tamanho) partes.push(tamanho[0]);
  if (/grafite|gratife/i.test(n)) partes.push('Grafite');
  if (/imbuia/i.test(n)) partes.push('Imbuia');
  if (/completo/i.test(n)) partes.push('Completo');
  if (/tr[ií]ade/i.test(n)) partes.push('Tríade');
  return partes.join(' · ') || (m.posicao_escada === 'entrada' ? 'Inox 420' : n);
}
export function comparativo(modelos: ModeloChurrasco[]) {
  return ['entrada', 'ideal', 'definitiva'].map((degrau, i) => {
    const lista = modelos.filter(m => pertenceChurrasco(m) && m.fotos.length && degrauDoModelo(m) === degrau && familiaDoModelo(m) !== 'pater');
    const todosTextos = lista.map(m => (m.descricao_html || '') + ' ' + (m.apresentacao_venda || '') + ' ' + (m.porque_texto || '')).join(' ').replace(/<[^>]*>/g, ' ');
    const extrair = (r: RegExp) => [...new Set((todosTextos.match(r) || []).map(s => s.replace(/\s+/g, ' ').trim()))].join(' / ') || 'Não informado';
    const precos = lista.map(m => m.preco_base);
    return { nome: ['Inox 420', 'Sandvik 14C28N', 'Tactical'][i], dureza: extrair(/\d+(?:[.,]\d+)?\s*(?:hrc|h\s*rc)\b/gi), espessura: extrair(/\d+(?:[.,]\d+)?\s*mm\b/gi), prazo: [...new Set(lista.map(m => m.prazo_entrega?.trim() || CHURRASCO.prazoPadrao))].join(' / ') || CHURRASCO.prazoPadrao, preco: precos.length ? `${brl(Math.min(...precos))} — ${brl(Math.max(...precos))}` : 'Não disponível' };
  });
}

export type DegrauChurrasco = typeof CHURRASCO.degraus[number];
/** Explicit selection wins; the automatic hero uses actual photo counts, not video counts. */
export function escolherHeroi(modelos: ModeloChurrasco[], heroiId: string | null = null): ModeloChurrasco | undefined {
  const comFoto = modelos.filter(m => m.fotos.length > 0);
  return comFoto.find(m => m.id === heroiId) || [...comFoto].sort((a, b) => b.fotos.length - a.fotos.length || a.preco_base - b.preco_base || a.nome_modelo.localeCompare(b.nome_modelo))[0];
}
export function menorPreco(modelos: ModeloChurrasco[]): number | null {
  const precos = modelos.filter(m => m.fotos.length > 0).map(m => m.preco_base);
  return precos.length ? Math.min(...precos) : null;
}
