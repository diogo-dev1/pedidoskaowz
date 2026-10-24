// Conteúdo e cálculos da landing de venda das Push Daggers (/push-daggers).
import { ehDiaUtil, ymdBR } from '@/lib/prontaEntrega';
import { ACO_KEYS, EMPUNHADURA_KEYS, FINISH_KEYS, SIZE_LIST, type KitConfig, type SizeKey } from '@/pages/ConfiguradorKit';

/** Push Dagger montada no configurador e linha SLS. */
export const PRAZO_PUSH_DAGGER = 15;
/** Demais lâminas Kaowz, feitas sob encomenda. */
export const PRAZO_SOB_ENCOMENDA = 65;

export const LINK_CONFIGURADOR = '/push-dagger-kaowz';
export const LINK_SLS = '/ofertas/push-dagger-sls';

/**
 * Vídeos da página. O primeiro abre o topo; os outros vão no carrossel "Veja na mão".
 * Aceita .mp4 (melhor: toca sozinho, sem a moldura do Instagram) ou link de post/reel do Instagram.
 * Sem vídeo, o topo mostra a foto Tactical.
 */
export const VIDEOS: { url: string; legenda?: string }[] = [];

export type FonteVideo = { tipo: 'arquivo'; url: string } | { tipo: 'instagram'; embed: string };

export function fonteVideo(url: string): FonteVideo {
  const ig = url.match(/instagram\.com\/(?:[^/]+\/)?(reel|reels|p|tv)\/([\w-]+)/);
  if (!ig) return { tipo: 'arquivo', url };
  const tipo = ig[1] === 'reels' ? 'reel' : ig[1];
  return { tipo: 'instagram', embed: `https://www.instagram.com/${tipo}/${ig[2]}/embed` };
}

function addDia(ymd: string) {
  const d = new Date(ymd + 'T12:00:00Z');
  d.setUTCDate(d.getUTCDate() + 1);
  return d.toISOString().slice(0, 10);
}

/** Data (yyyy-MM-dd) em que a peça fica pronta se o pedido for confirmado hoje. */
export function prontaAte(diasUteis: number, feriados: Set<string>, hoje = new Date()) {
  let x = ymdBR(hoje);
  for (let i = 0; i < diasUteis; i++) {
    x = addDia(x);
    while (!ehDiaUtil(x, feriados)) x = addDia(x);
  }
  return x;
}

/** "sexta, 14/11/2026" */
export function dataPorExtenso(ymd: string) {
  const [y, m, d] = ymd.split('-').map(Number);
  const dia = new Date(Date.UTC(y, m - 1, d)).toLocaleDateString('pt-BR', { weekday: 'long', timeZone: 'UTC' });
  return `${dia.replace('-feira', '')}, ${ymd.split('-').reverse().join('/')}`;
}

/** Menor preço da versão Metálica por tamanho. Non Metallic e Blue (treino) ficam fora para o "a partir de" não enganar. */
export function precosMetalica(config: KitConfig): Record<SizeKey, number> {
  return Object.fromEntries(SIZE_LIST.map((t) => [t.key, precoMinimoMetalica(config, t.key)])) as Record<SizeKey, number>;
}

function precoMinimoMetalica(config: KitConfig, tamanho: SizeKey) {
  const v = config.versions.standard;
  if (!v.pricesByConfig) return Math.min(...FINISH_KEYS.map((f) => v.prices[tamanho][f]));
  const p = v.pricesByConfig[tamanho];
  return Math.min(...ACO_KEYS.flatMap((a) => EMPUNHADURA_KEYS.flatMap((e) => FINISH_KEYS.map((f) => p[a][e][f]))));
}

export const GUIA_TAMANHO: Record<SizeKey, string> = {
  standard: 'Pega cheia. Mãos grandes e porte no cinto.',
  compact: 'A mais versátil. Presença sem volume.',
  micro: 'Some no bolso. Máxima discrição.',
};

export const INCLUSOS = [
  'Bainha Velada',
  'Certificado oficial no seu nome',
  'Afiação vitalícia gratuita',
  'Garantia vitalícia',
];

export const PERGUNTAS = [
  {
    pergunta: 'Em quanto tempo fica pronta?',
    resposta: `Em ${PRAZO_PUSH_DAGGER} dias úteis a partir da confirmação do pedido, tanto montando a sua quanto na linha SLS. Depois vem o frete, calculado pelo seu CEP. Os demais modelos Kaowz são sob encomenda e levam ${PRAZO_SOB_ENCOMENDA} dias úteis.`,
  },
  {
    pergunta: 'Montar a minha ou linha SLS?',
    resposta: 'No configurador você escolhe tamanho, aço, empunhadura e acabamento. A linha SLS tem configurações já definidas, para decidir em um clique. Mesmo prazo e mesma garantia.',
  },
  {
    pergunta: 'Como posso pagar?',
    resposta: 'PIX, cartão de crédito ou Pix Parcelado. Venda exclusiva para maiores de 18 anos.',
  },
];
