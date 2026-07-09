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
export interface Opcao { nome: string; precos: Precos; incluso?: boolean }
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

/** Configuração escolhida pelo usuário para UMA faca. Índices apontam para SEED/config. */
export interface ItemCfg {
  id: string;
  modeloIdx: number | null;
  acoIdx: number;      // default 0 (Inox incluso)
  bruteForge: boolean; // opcional do aço
  empIdx: number;      // default 0 (Grafite inclusa)
  dragonScale: boolean; // opcional da empunhadura
  acabIdx: number;     // default 0 (Acetinado incluso)
  bainhaIdx: number;   // default 0 (Preta inclusa)
  adicionais: Set<number>;
}

export const BRL = (n: number) =>
  n.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL', minimumFractionDigits: 2 });

export const TAM_DOT: Record<Tamanho, string> = {
  P: 'bg-sky-500', M: 'bg-amber-500', G: 'bg-rose-500', '-': 'bg-zinc-400',
};

export function newItem(): ItemCfg {
  return {
    id: crypto.randomUUID(), modeloIdx: null,
    acoIdx: 0, bruteForge: false, empIdx: 0, dragonScale: false,
    acabIdx: 0, bainhaIdx: 0, adicionais: new Set(),
  };
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

/** Valor total de um item, usando os dados (SEED ou config do banco). */
export function calcItem(data: SimuladorData, cfg: ItemCfg): number {
  const m = cfg.modeloIdx !== null ? data.modelos[cfg.modeloIdx] : null;
  if (!m) return 0;
  const c = classeDo(m);
  let t = m.preco;
  t += precoClasse(data.acos[cfg.acoIdx]?.precos ?? {}, c);
  if (cfg.bruteForge) t += precoClasse(data.bruteForge, c);
  t += precoClasse(data.empunhaduras[cfg.empIdx]?.precos ?? {}, c);
  if (cfg.dragonScale) t += precoClasse(data.dragonScale, c);
  t += precoClasse(data.acabamentos[cfg.acabIdx]?.precos ?? {}, c);
  t += precoClasse(data.bainhas[cfg.bainhaIdx]?.precos ?? {}, c);
  cfg.adicionais.forEach((i) => { t += data.adicionais[i]?.preco ?? 0; });
  return t;
}

/** Bloco de texto de um item para o orçamento (formato WhatsApp). */
export function textoItem(data: SimuladorData, cfg: ItemCfg, n: number): string[] {
  const m = cfg.modeloIdx !== null ? data.modelos[cfg.modeloIdx] : null;
  if (!m) return [];
  const aco = data.acos[cfg.acoIdx]?.nome + (cfg.bruteForge ? ' + Brute Forge' : '');
  const emp = data.empunhaduras[cfg.empIdx]?.nome + (cfg.dragonScale ? ' + Dragon Scale' : '');
  const l = [
    `Item ${n}:`,
    m.nome,
    `Aço: ${aco}`,
    `Empunhadura: ${emp}`,
    `Acabamento: ${data.acabamentos[cfg.acabIdx]?.nome ?? '-'}`,
    `Bainha: ${data.bainhas[cfg.bainhaIdx]?.nome ?? '-'}`,
  ];
  const ads = [...cfg.adicionais].map((i) => data.adicionais[i]?.nome).filter(Boolean);
  if (ads.length) l.push(`Adicionais: ${ads.join(', ')}`);
  l.push(`Valor: ${BRL(calcItem(data, cfg))}`);
  return l;
}

/** Orçamento completo — formato "Pedido: / Item N: / Total:". */
export function gerarOrcamento(data: SimuladorData, itens: ItemCfg[], total: number): string {
  const l: string[] = ['Pedido:', ''];
  let n = 0;
  itens.forEach((cfg) => {
    const bloco = textoItem(data, cfg, n + 1);
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
    { nome: 'Grafite', precos: { P: 0, M: 0, G: 0 }, incluso: true },
    { nome: 'G10', precos: { P: 115, M: 145 } },
    { nome: 'Espaçador', precos: { P: 70, M: 70, G: 90 } },
    { nome: 'Imbuia', precos: { P: 80, M: 80, G: 100 } },
  ],
  dragonScale: { P: 70, M: 70, G: 90 },
  acabamentos: [
    { nome: 'Acetinado', precos: { P: 0, M: 0, G: 0 }, incluso: true },
    { nome: 'Stone Washed', precos: { P: 25, M: 25, G: 35 } },
    { nome: 'Tactical', precos: { P: 90, M: 90, G: 125 } },
  ],
  bainhas: [
    { nome: 'Preta', precos: { P: 0, M: 0, G: 0 }, incluso: true },
    { nome: 'Colorida', precos: { P: 195, M: 195, G: 250 } },
    { nome: 'Bainha adicional', precos: { P: 195, M: 195, G: 250 } },
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
