/* ════════════════════════════════════════════════════════════════
   Simulador de Preços — dados e lógica compartilhados.

   SEED = valores EXATOS da planilha "Lista de Valores" (Página1),
   catalogados por tamanho. Serve de:
   - semente inicial da tabela editável no Supabase
   - fallback caso a config ainda não tenha carregado

   Regra de classe (M usa P / G cai M→P) fica em precoClasse().
   ════════════════════════════════════════════════════════════════ */

export type Tamanho = 'P' | 'M' | 'G' | '-';
export type Classe = 'P' | 'M' | 'G';
export interface Precos { P?: number; M?: number; G?: number }
export interface Modelo { nome: string; tamanho: Tamanho; preco: number }
// cores: lista de nomes de cor cadastráveis no admin. Se vazia/ausente, a
// opção não abre seletor de cor (comportamento atual, sem cor).
export interface Opcao { nome: string; precos: Precos; incluso?: boolean; cores?: string[] }
export interface Adicional { nome: string; preco: number }

export interface SimuladorData {
  modelos: Modelo[];
  acos: Opcao[];        // primeiro item (Inox) é o incluso
  bruteForge: Precos;   // opcional do aço
  empunhaduras: Opcao[]; // primeiro item (Grafite) é o incluso
  dragonScale: Precos;  // opcional da empunhadura
  acabamentos: Opcao[]; // primeiro item (Acetinado) é o incluso
  bainhas: Opcao[];     // primeiro item (Preta) é o incluso
  adicionais: Adicional[];
}

/** Preço de cada bainha ADICIONAL (a primeira já vem inclusa no preço base). */
export const BAINHA_ADICIONAL_PRECO = 195;
/** Preço da gravação à laser (mesma regra usada em Novo Pedido). */
export const LASER_PRECO = 30;
/** Opções de embalagem (campo INTERNO — nunca exposto ao cliente). */
export const EMBALAGENS = ['Comum', 'Patola Padrão', 'Patola KIT'] as const;

/** Produto da vitrine Shopify que serviu de base para uma faca configurável.
 *  Somente leitura — editar a faca aqui NUNCA altera o cadastro na Shopify. */
export interface OrigemCatalogo {
  variantId: string;        // gid://shopify/ProductVariant/...
  produtoTitulo: string;
  varianteTitulo: string;
  imagem?: string | null;
  precoOriginal: number;
  /** Assinatura da configuração no momento em que veio do catálogo */
  snapshot: string;
}

/** Configuração escolhida pelo usuário para UMA faca. Índices apontam para SEED/config. */
export interface ItemCfg {
  id: string;
  modeloIdx: number | null;
  acoIdx: number;      // default 0 (Inox incluso)
  bruteForge: boolean; // opcional do aço
  empIdx: number;      // default 0 (Grafite inclusa)
  empCor: string | null; // cor da empunhadura, quando a opção tem `cores`
  dragonScale: boolean; // opcional da empunhadura
  espacador: boolean;   // opcional da empunhadura (soma ao valor da empunhadura)
  espacadorCor: string | null; // cor do espaçador
  acabIdx: number;     // default 0 (Acetinado incluso)
  /** Bainhas escolhidas (múltiplas): índices em data.bainhas */
  bainhaIdxs: number[];
  /** Cor por bainha escolhida: { [idxBainha]: cor } */
  bainhaCores: Record<number, string | null>;
  /** Personalização à laser (vazio = sem gravação) */
  textoLaser?: string;
  /** Nome que vai no certificado (default: nome do cliente do pedido) */
  certificado?: string;
  /** Embalagem — campo interno de produção */
  embalagem?: string;
  /** Subtotal sobrescrito manualmente (null = usa o calculado) */
  subtotalManual?: number | null;
  /** Produto da vitrine que originou esta faca (quando veio da busca no site) */
  origem?: OrigemCatalogo;
}



/** Índice da opção "Espaçador" na lista de empunhaduras (opcional, não é uma empunhadura). */
export function espacadorIdx(data: SimuladorData): number {
  return data.empunhaduras.findIndex((e) => /espa[çc]ador/i.test(e.nome));
}


/** Item avulso — um produto do catálogo de Adicionais comprado fora da
 *  configuração de uma faca (ex.: brinde, acessório vendido à parte). */
export interface AvulsoCfg {
  id: string;
  adicionalIdx: number;
  quantidade: number;
}

/** Item personalizado — descrição livre e preço definido manualmente
 *  pelo vendedor (ex.: produto que não está no catálogo). */
export interface CustomCfg {
  id: string;
  descricao: string;
  preco: number;
  quantidade: number;
  /** Item de cortesia — preço zero, entra como linha R$ 0,00 no draft */
  brinde?: boolean;
}

/** Produto real do catálogo Shopify (variante). Baixa estoque no draft order. */
export interface CatalogoCfg {
  id: string;
  variantId: string;      // gid://shopify/ProductVariant/...
  titulo: string;
  variante: string;
  imagem?: string | null;
  /** Preço cadastrado na Shopify (referência) */
  precoOriginal: number;
  /** Preço praticado (editável). É esse que vale. */
  preco: number;
  quantidade: number;
}


/** Uma entrada do pedido: faca configurada, item avulso, item personalizado
 *  ou produto do catálogo Shopify. */
export type PedidoEntry =
  | { id: string; kind: 'faca'; faca: ItemCfg }
  | { id: string; kind: 'avulso'; avulso: AvulsoCfg }
  | { id: string; kind: 'custom'; custom: CustomCfg }
  | { id: string; kind: 'catalogo'; catalogo: CatalogoCfg };


export const BRL = (n: number) =>
  n.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL', minimumFractionDigits: 2 });

export const TAM_DOT: Record<Tamanho, string> = {
  P: 'bg-sky-500', M: 'bg-amber-500', G: 'bg-rose-500', '-': 'bg-zinc-400',
};

export function newItem(): ItemCfg {
  return {
    id: crypto.randomUUID(), modeloIdx: null,
    acoIdx: 0, bruteForge: false, empIdx: 0, empCor: null, dragonScale: false,
    espacador: false, espacadorCor: null,
    acabIdx: 0, bainhaIdxs: [0], bainhaCores: {},
    textoLaser: '', certificado: '', embalagem: '', subtotalManual: null,
  };
}


/** Nome legível de uma bainha escolhida, com a cor quando houver. */
export function nomeBainha(data: SimuladorData, cfg: ItemCfg, idx: number): string {
  const b = data.bainhas[idx];
  if (!b) return '';
  const cor = cfg.bainhaCores?.[idx];
  return cor ? `${b.nome} (${cor})` : b.nome;
}


export function newAvulso(adicionalIdx: number, quantidade = 1): AvulsoCfg {
  return { id: crypto.randomUUID(), adicionalIdx, quantidade };
}

export function novaEntradaFaca(): PedidoEntry {
  return { id: crypto.randomUUID(), kind: 'faca', faca: newItem() };
}

export function novaEntradaAvulso(adicionalIdx: number, quantidade = 1): PedidoEntry {
  return { id: crypto.randomUUID(), kind: 'avulso', avulso: newAvulso(adicionalIdx, quantidade) };
}

export function novaEntradaCustom(descricao = '', preco = 0, quantidade = 1, brinde = false): PedidoEntry {
  return { id: crypto.randomUUID(), kind: 'custom', custom: { id: crypto.randomUUID(), descricao, preco, quantidade, brinde } };
}

export function novaEntradaCatalogo(p: {
  variantId: string; titulo: string; variante?: string; imagem?: string | null; preco: number;
}): PedidoEntry {
  return {
    id: crypto.randomUUID(),
    kind: 'catalogo',
    catalogo: {
      id: crypto.randomUUID(),
      variantId: p.variantId,
      titulo: p.titulo,
      variante: p.variante ?? '',
      imagem: p.imagem ?? null,
      precoOriginal: p.preco,
      preco: p.preco,
      quantidade: 1,
    },
  };
}

/* ═══════ Produto da vitrine → faca configurável (somente leitura) ═══════ */

const norm = (s: string) =>
  (s ?? '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();

/** Melhor correspondência por nome dentro de um texto livre (nome mais longo vence). */
function acharPorNome<T extends { nome: string }>(lista: T[], texto: string): number {
  const t = ` ${norm(texto)} `;
  let melhor = -1;
  let tam = 0;
  lista.forEach((o, i) => {
    const n = norm(o.nome);
    if (!n) return;
    if (t.includes(` ${n} `) || t.includes(n)) {
      if (n.length > tam) { melhor = i; tam = n.length; }
    }
  });
  return melhor;
}

/** Assinatura das opções de uma faca — usada para saber se ela ainda é o produto do site. */
export function assinaturaCfg(cfg: ItemCfg): string {
  return JSON.stringify({
    modeloIdx: cfg.modeloIdx,
    acoIdx: cfg.acoIdx,
    bruteForge: cfg.bruteForge,
    empIdx: cfg.empIdx,
    empCor: cfg.empCor,
    dragonScale: cfg.dragonScale,
    espacador: cfg.espacador,
    espacadorCor: cfg.espacadorCor,
    acabIdx: cfg.acabIdx,
    bainhaIdxs: [...(cfg.bainhaIdxs ?? [])].sort(),
    bainhaCores: cfg.bainhaCores ?? {},
    textoLaser: (cfg.textoLaser ?? '').trim(),
  });
}

/** A faca continua idêntica ao produto do site (opções e preço)? */
export function catalogoIntacto(cfg: ItemCfg): boolean {
  if (!cfg.origem) return false;
  if (assinaturaCfg(cfg) !== cfg.origem.snapshot) return false;
  const preco = cfg.subtotalManual;
  return preco !== null && preco !== undefined && Math.abs(preco - cfg.origem.precoOriginal) < 0.01;
}

/** Cria uma faca configurável pré-preenchida a partir de um produto/variante da vitrine. */
export function facaDeProdutoShopify(data: SimuladorData, p: {
  variantId: string; titulo: string; variante?: string; imagem?: string | null; preco: number;
}): ItemCfg {
  const texto = [p.titulo, p.variante ?? ''].join(' ');
  const cfg = newItem();

  const mi = acharPorNome(data.modelos, texto);
  if (mi >= 0) cfg.modeloIdx = mi;

  const ai = acharPorNome(data.acos, texto);
  if (ai >= 0) cfg.acoIdx = ai;
  if (/brute\s*forge/i.test(texto)) cfg.bruteForge = true;

  const espIdx = espacadorIdx(data);
  const empLista = data.empunhaduras.map((e, i) => ({ e, i })).filter(({ i }) => i !== espIdx);
  const ei = acharPorNome(empLista.map(({ e }) => e), texto);
  if (ei >= 0) cfg.empIdx = empLista[ei].i;
  if (/dragon\s*scale/i.test(texto)) cfg.dragonScale = true;
  const cores = data.empunhaduras[cfg.empIdx]?.cores ?? [];
  const cor = cores.find((c) => norm(texto).includes(norm(c)));
  if (cor) cfg.empCor = cor;

  const aci = acharPorNome(data.acabamentos, texto);
  if (aci >= 0) cfg.acabIdx = aci;

  const bi = acharPorNome(data.bainhas, texto);
  if (bi >= 0) cfg.bainhaIdxs = [bi];
  const bCores = data.bainhas[cfg.bainhaIdxs[0]]?.cores ?? [];
  const bCor = bCores.find((c) => norm(texto).includes(norm(c)));
  if (bCor) cfg.bainhaCores = { [cfg.bainhaIdxs[0]]: bCor };

  // Preço do site entra como subtotal manual pré-preenchido (editável / reversível)
  cfg.subtotalManual = p.preco;

  cfg.origem = {
    variantId: p.variantId,
    produtoTitulo: p.titulo,
    varianteTitulo: p.variante ?? '',
    imagem: p.imagem ?? null,
    precoOriginal: p.preco,
    snapshot: assinaturaCfg(cfg),
  };
  return cfg;
}

/** Entrada de pedido do tipo faca, pré-preenchida a partir da vitrine. */
export function novaEntradaFacaDeCatalogo(data: SimuladorData, p: {
  variantId: string; titulo: string; variante?: string; imagem?: string | null; preco: number;
}): PedidoEntry {
  return { id: crypto.randomUUID(), kind: 'faca', faca: facaDeProdutoShopify(data, p) };
}


/** Regra da planilha: M usa P quando não definido; G cai para M→P. */
export function precoClasse(p: Precos, c: Classe): number {
  if (c === 'P') return p.P ?? 0;
  if (c === 'M') return p.M ?? p.P ?? 0;
  return p.G ?? p.M ?? p.P ?? 0;
}

export function classeDo(m: Modelo | null): Classe {
  return !m || m.tamanho === '-' ? 'P' : m.tamanho;
}

/** Valor CALCULADO de uma faca (ignora sobrescrita manual de subtotal). */
export function calcItemBase(data: SimuladorData, cfg: ItemCfg): number {
  const m = cfg.modeloIdx !== null ? data.modelos[cfg.modeloIdx] : null;
  if (!m) return 0;
  const c = classeDo(m);
  let t = m.preco;
  t += precoClasse(data.acos[cfg.acoIdx]?.precos ?? {}, c);
  if (cfg.bruteForge) t += precoClasse(data.bruteForge, c);
  t += precoClasse(data.empunhaduras[cfg.empIdx]?.precos ?? {}, c);
  if (cfg.dragonScale) t += precoClasse(data.dragonScale, c);
  if (cfg.espacador) {
    const ei = espacadorIdx(data);
    if (ei >= 0) t += precoClasse(data.empunhaduras[ei].precos, c);
  }
  t += precoClasse(data.acabamentos[cfg.acabIdx]?.precos ?? {}, c);
  const bainhas = cfg.bainhaIdxs ?? [];
  bainhas.forEach((i) => {
    t += precoClasse(data.bainhas[i]?.precos ?? {}, c);
  });
  // A primeira bainha já está inclusa no preço base; a partir da segunda, cobra-se.
  if (bainhas.length > 1) t += (bainhas.length - 1) * BAINHA_ADICIONAL_PRECO;
  // Personalização à laser (mesma regra do Novo Pedido)
  if (temLaser(cfg)) t += LASER_PRECO;
  return t;
}

/** Há gravação à laser configurada? */
export function temLaser(cfg: ItemCfg): boolean {
  const t = (cfg.textoLaser ?? '').trim();
  return !!t && t !== '-';
}

/** Valor de uma faca — usa o subtotal manual quando definido. */
export function calcItem(data: SimuladorData, cfg: ItemCfg): number {
  if (cfg.modeloIdx === null) return 0;
  if (cfg.subtotalManual !== null && cfg.subtotalManual !== undefined && Number.isFinite(cfg.subtotalManual)) {
    return Math.max(0, cfg.subtotalManual);
  }
  return calcItemBase(data, cfg);
}

/** Bloco de texto de uma faca para o orçamento (formato WhatsApp).
 *  Embalagem é campo INTERNO e nunca entra aqui. */
export function textoItem(data: SimuladorData, cfg: ItemCfg, n: number): string[] {
  const m = cfg.modeloIdx !== null ? data.modelos[cfg.modeloIdx] : null;
  if (!m) return [];
  const aco = data.acos[cfg.acoIdx]?.nome + (cfg.bruteForge ? ' + Brute Forge' : '');
  let emp = data.empunhaduras[cfg.empIdx]?.nome ?? '';
  if (cfg.empCor) emp += ` (${cfg.empCor})`;
  emp += cfg.dragonScale ? ' + Dragon Scale' : '';
  if (cfg.espacador) emp += ` + Espaçador${cfg.espacadorCor ? ` (${cfg.espacadorCor})` : ''}`;
  const bainhas = (cfg.bainhaIdxs ?? []).map((i) => nomeBainha(data, cfg, i)).filter(Boolean);
  const l = [
    `Item ${n}:`,
    m.nome,
    `Aço: ${aco}`,
    `Empunhadura: ${emp}`,
    `Acabamento: ${data.acabamentos[cfg.acabIdx]?.nome ?? '-'}`,
    `Bainha: ${bainhas.length ? bainhas.join(' + ') : '-'}`,
  ];
  if (temLaser(cfg)) l.push(`Personalização: ${(cfg.textoLaser ?? '').trim()}`);
  if ((cfg.certificado ?? '').trim()) l.push(`Certificado: ${(cfg.certificado ?? '').trim()}`);
  l.push(`Valor: ${BRL(calcItem(data, cfg))}`);
  return l;
}



/** Valor total de um item avulso (produto do catálogo de Adicionais). */
export function calcAvulso(data: SimuladorData, cfg: AvulsoCfg): number {
  const a = data.adicionais[cfg.adicionalIdx];
  if (!a) return 0;
  return a.preco * Math.max(1, cfg.quantidade);
}

/** Bloco de texto de um item avulso para o orçamento. */
export function textoAvulso(data: SimuladorData, cfg: AvulsoCfg, n: number): string[] {
  const a = data.adicionais[cfg.adicionalIdx];
  if (!a) return [];
  const qtd = cfg.quantidade > 1 ? ` x${cfg.quantidade}` : '';
  return [
    `Item ${n}:`,
    `${a.nome}${qtd}`,
    `Valor: ${BRL(calcAvulso(data, cfg))}`,
  ];
}

/** Valor total de um item personalizado (brinde = zero). */
export function calcCustom(cfg: CustomCfg): number {
  if (cfg.brinde) return 0;
  return Math.max(0, cfg.preco) * Math.max(1, cfg.quantidade);
}


/** Bloco de texto de um item personalizado. */
export function textoCustom(cfg: CustomCfg, n: number): string[] {
  const nome = cfg.descricao.trim() || 'Item personalizado';
  const qtd = cfg.quantidade > 1 ? ` x${cfg.quantidade}` : '';
  return [
    `Item ${n}:`,
    `${nome}${qtd}`,
    cfg.brinde ? 'Valor: Brinde (R$ 0,00)' : `Valor: ${BRL(calcCustom(cfg))}`,
  ];
}


/** Nome legível de um produto do catálogo Shopify. */
export function nomeCatalogo(cfg: CatalogoCfg): string {
  return cfg.variante ? `${cfg.titulo} — ${cfg.variante}` : cfg.titulo;
}

/** Valor total de um produto do catálogo Shopify (usa o preço editado). */
export function calcCatalogo(cfg: CatalogoCfg): number {
  return Math.max(0, cfg.preco) * Math.max(1, cfg.quantidade);
}

/** Bloco de texto de um produto do catálogo Shopify. */
export function textoCatalogo(cfg: CatalogoCfg, n: number): string[] {
  const qtd = cfg.quantidade > 1 ? ` x${cfg.quantidade}` : '';
  return [
    `Item ${n}:`,
    `${nomeCatalogo(cfg)}${qtd}`,
    `Valor: ${BRL(calcCatalogo(cfg))}`,
  ];
}

/** Valor total de uma entrada. */
export function calcEntry(data: SimuladorData, e: PedidoEntry): number {
  if (e.kind === 'faca') return calcItem(data, e.faca);
  if (e.kind === 'avulso') return calcAvulso(data, e.avulso);
  if (e.kind === 'catalogo') return calcCatalogo(e.catalogo);
  return calcCustom(e.custom);
}

/** Bloco de texto de uma entrada. */
export function textoEntry(data: SimuladorData, e: PedidoEntry, n: number): string[] {
  if (e.kind === 'faca') return textoItem(data, e.faca, n);
  if (e.kind === 'avulso') return textoAvulso(data, e.avulso, n);
  if (e.kind === 'catalogo') return textoCatalogo(e.catalogo, n);
  return textoCustom(e.custom, n);

}

/** Orçamento completo — formato "Pedido: / Item N: / Total:". Mistura facas e avulsos. */
export function gerarOrcamento(data: SimuladorData, entries: PedidoEntry[], total: number): string {
  const l: string[] = ['Pedido:', ''];
  let n = 0;
  entries.forEach((e) => {
    const bloco = textoEntry(data, e, n + 1);
    if (bloco.length === 0) return;
    n++;
    l.push(...bloco, '');
  });
  l.push(`Total: ${BRL(total)}`);
  return l.join('\n');
}

/* ════════════════ SEED — valores exatos da planilha ════════════════ */

export const SEED: SimuladorData = {
  modelos: [
    // ── P ──
    { nome: 'Adaga Edc', tamanho: 'P', preco: 705 },
    { nome: 'Edc', tamanho: 'P', preco: 575 },
    { nome: 'Edc - Mini', tamanho: 'P', preco: 475 },
    { nome: 'Edc Mini Reverse Tanto', tamanho: 'P', preco: 475 },
    { nome: 'Edc Mini Tanto', tamanho: 'P', preco: 590 },
    { nome: 'Edc Mini Wharncliffe', tamanho: 'P', preco: 590 },
    { nome: 'Edc Reverse Tanto', tamanho: 'P', preco: 575 },
    { nome: 'Edc Ring', tamanho: 'P', preco: 610 },
    { nome: 'Edc Ring Tanto', tamanho: 'P', preco: 725 },
    { nome: 'Edc Tanto', tamanho: 'P', preco: 690 },
    { nome: 'Edc Wharncliffe', tamanho: 'P', preco: 690 },
    { nome: 'Karambit', tamanho: 'P', preco: 720 },
    { nome: 'Push Dagger Compact', tamanho: 'P', preco: 470 },
    { nome: 'Push Dagger Micro', tamanho: 'P', preco: 340 },
    { nome: 'Push Dagger Standard', tamanho: 'P', preco: 610 },
    { nome: 'Ring Tanto', tamanho: 'P', preco: 585 },
    { nome: 'Wharncliffe', tamanho: 'P', preco: 585 },
    { nome: 'Shank', tamanho: 'P', preco: 0 },
    { nome: 'Shiv', tamanho: 'P', preco: 0 },
    // ── M ──
    { nome: 'Adaga Full Size', tamanho: 'M', preco: 805 },
    { nome: 'Butcher', tamanho: 'M', preco: 715 },
    { nome: 'Chef Royal', tamanho: 'M', preco: 715 },
    { nome: 'Defcon 1', tamanho: 'M', preco: 790 },
    { nome: 'Defcon 2', tamanho: 'M', preco: 835 },
    { nome: 'Garfo 8"', tamanho: 'M', preco: 325 },
    { nome: 'Garfo 10"', tamanho: 'M', preco: 370 },
    { nome: 'Jagunço', tamanho: 'M', preco: 760 },
    { nome: 'Jagunço Tanto', tamanho: 'M', preco: 875 },
    { nome: 'Kiritsuke 8,5"', tamanho: 'M', preco: 620 },
    { nome: 'Kiritsuke 10"', tamanho: 'M', preco: 650 },
    { nome: 'Kzr Elite Knight', tamanho: 'M', preco: 780 },
    { nome: 'Kzr Nimbus', tamanho: 'M', preco: 720 },
    { nome: 'Kzr Nimbus Tanto', tamanho: 'M', preco: 835 },
    { nome: 'Picanheira 9"', tamanho: 'M', preco: 650 },
    { nome: 'Picanheira 10"', tamanho: 'M', preco: 680 },
    { nome: 'Mini Camp', tamanho: 'M', preco: 0 },
    // ── G ──
    { nome: 'Camp', tamanho: 'G', preco: 800 },
    { nome: 'Kzr Full Size', tamanho: 'G', preco: 750 },
    { nome: 'Kzr Nimbowie', tamanho: 'G', preco: 1555 },
    { nome: 'Big Camp', tamanho: 'G', preco: 1430 },
    { nome: 'Kzr Big Nimbowie', tamanho: 'G', preco: 1710 },
    { nome: 'Big Camp 40 cm', tamanho: 'G', preco: 0 },
    { nome: 'Kzr Big Nimbowie 40 cm', tamanho: 'G', preco: 0 },
    // ── Sem classe ──
    { nome: 'Chaira 8"', tamanho: '-', preco: 300 },
    { nome: 'Chaira 10"', tamanho: '-', preco: 350 },
  ],
  acos: [
    { nome: 'Inox', precos: { P: 0, M: 0, G: 0 }, incluso: true },
    { nome: 'Sandvik 14C28N', precos: { P: 165, M: 195, G: 350 } },
    { nome: '52100', precos: { P: 165, M: 175, G: 195 } },
  ],
  bruteForge: { P: 125, M: 125, G: 300 },
  empunhaduras: [
    { nome: 'Grafite', precos: { P: 0, M: 0, G: 0 }, incluso: true, cores: ['Preto', 'Cinza'] },
    { nome: 'G10', precos: { P: 115, M: 145 } },
    { nome: 'Espaçador', precos: { P: 70, M: 70, G: 90 }, cores: ['Preto', 'Vermelho', 'Azul'] },
    { nome: 'Imbuia', precos: { P: 80, M: 80, G: 100 } },
  ],
  dragonScale: { P: 70, M: 70, G: 90 },
  acabamentos: [
    { nome: 'Acetinado', precos: { P: 0, M: 0, G: 0 }, incluso: true },
    { nome: 'Stone Washed', precos: { P: 25, M: 25, G: 35 } },
    { nome: 'Black Stone Washed', precos: { P: 25, M: 25, G: 35 } },
    { nome: 'Tactical', precos: { P: 90, M: 90, G: 125 } },
  ],
  bainhas: [
    { nome: 'Velada', precos: { P: 0, M: 0, G: 0 }, incluso: true, cores: ['Preto', 'Coyote', 'Vermelho', 'Azul', 'Verde'] },
    { nome: 'Multifuncional', precos: { P: 0, M: 0, G: 0 }, incluso: true, cores: ['Preto', 'Coyote', 'Vermelho', 'Azul', 'Verde'] },
  ],

  adicionais: [
    { nome: 'Strop', preco: 95 },
    { nome: 'Café Médio ou Escuro', preco: 45 },
    { nome: 'Clipe Extra', preco: 25 },
    { nome: 'Clipe Lateral', preco: 75 },
    { nome: 'Patch Fluorescente', preco: 55 },
    { nome: 'Patch Cão Pastor', preco: 45 },
    { nome: 'Patch K', preco: 35 },
    { nome: 'BC Churrasco', preco: 200 },
    { nome: 'BC Churrasco Dupla', preco: 270 },
    { nome: 'BC Churrasco Tripla', preco: 370 },
    { nome: 'Passador de Couro', preco: 95 },
    { nome: 'Bainha Couro EDC', preco: 200 },
    { nome: 'Bainha Couro Camp', preco: 350 },
    { nome: 'Bainha Couro Jagunço', preco: 290 },
    { nome: 'Boné', preco: 75 },
    { nome: 'Camisa Kaowz', preco: 170 },
    { nome: 'Moletom', preco: 240 },
  ],
};

/** Garante que uma config vinda do banco tenha todos os campos (merge com SEED). */
export function normalizarData(raw: unknown): SimuladorData {
  const d = (raw ?? {}) as Partial<SimuladorData>;
  return {
    modelos: Array.isArray(d.modelos) && d.modelos.length ? d.modelos : SEED.modelos,
    acos: Array.isArray(d.acos) && d.acos.length ? d.acos : SEED.acos,
    bruteForge: d.bruteForge ?? SEED.bruteForge,
    empunhaduras: Array.isArray(d.empunhaduras) && d.empunhaduras.length ? d.empunhaduras : SEED.empunhaduras,
    dragonScale: d.dragonScale ?? SEED.dragonScale,
    acabamentos: Array.isArray(d.acabamentos) && d.acabamentos.length ? d.acabamentos : SEED.acabamentos,
    bainhas: Array.isArray(d.bainhas) && d.bainhas.length ? d.bainhas : SEED.bainhas,
    adicionais: Array.isArray(d.adicionais) && d.adicionais.length ? d.adicionais : SEED.adicionais,
  };
}
