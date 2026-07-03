import { useEffect, useMemo, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import kaowzLogo from '@/assets/kaowz-logo.png';
import {
  loadKitConfig,
  ACO_KEYS,
  ACO_NAMES,
  EMPUNHADURA_KEYS,
  EMPUNHADURA_NAMES,
  type KitConfig,
  type AcoKey,
  type EmpunhaduraKey,
  type VersionKey,
} from './ConfiguradorKit';

/* ─── Types ─── */
type PushSizeKey = 'compact' | 'micro';
type FinishKey = 'satin' | 'sw' | 'tac';
/** Versões da push dagger oferecidas no kit (Metálica e Non Metallic — sem treino) */
type PushVersionKey = Extract<VersionKey, 'standard' | 'nonmetallic'>;
const PUSH_VERSION_KEYS: PushVersionKey[] = ['standard', 'nonmetallic'];
const PUSH_VERSION_FALLBACK: Record<PushVersionKey, string> = { standard: 'Metálica', nonmetallic: 'Non Metallic' };

const PUSH_SIZE_NAMES: Record<PushSizeKey, string> = { compact: 'COMPACT', micro: 'MICRO' };
const PUSH_SIZE_LIST: { key: PushSizeKey; name: string; desc: string }[] = [
  { key: 'compact', name: 'COMPACT', desc: '52,74 mm lâmina' },
  { key: 'micro', name: 'MICRO', desc: '37,16 mm lâmina' },
];

const FINISH_NAMES: Record<FinishKey, string> = { satin: 'Acetinada', sw: 'Stone Washed', tac: 'Tactical' };
const FINISH_KEYS: FinishKey[] = ['satin', 'sw', 'tac'];

/** Produto vindo do catálogo (site/Shopify) */
interface CatalogoItem {
  id: string;
  nome_modelo: string;
  preco_base: number;
  imagem_modelo: string | null;
}
type Canivete = CatalogoItem;

/* ─── Config (apenas os campos próprios do Kit; push e canivetes vêm das fontes reais) ─── */
export interface UrbanEdcTexts {
  eyebrow: string;
  heroTitle: string;
  heroDesc: string;
  ctaText: string;
  refEyebrow: string;
  refTitle: string;
  refLabel: string;
  refSub: string;
  footerNote: string;
}

export interface UrbanEdcConfig {
  whatsappPhone: string;
  texts: UrbanEdcTexts;
  /** Aço inicial selecionado (cliente pode trocar entre Sandvik e Inox) */
  pushAco: AcoKey;
  /** Empunhadura base usada para puxar preço/imagem da push dagger Metálica */
  pushEmpunhadura: EmpunhaduraKey;
  /** IDs dos canivetes K1 (catalogo_modelos) exibidos como opção no kit */
  caniveteIds: string[];
  /** IDs dos canivetes marcados como esgotados (aparecem, mas não selecionáveis) */
  caniveteEsgotadoIds: string[];
  /** ID do multitool no catálogo (foto e nome vêm do site) */
  multitoolId: string;
  /** Valor do multitool embutido no total (NÃO exibido) */
  multitoolPrice: number;
  /** Valor da case embutido no total (NÃO exibido) */
  casePrice: number;
  kitDiscount: number;
  /** Banner exibido abaixo do hero (imagem do kit) */
  bannerImage: string;
  /** Imagem de referência do rodapé (opcional) */
  kitImage: string;
}

/** IDs padrão dos canivetes K1 reais do catálogo (Acetinado, Stone Washed, Full Black) */
const DEFAULT_CANIVETE_IDS = [
  '4ebaad04-6e2b-45ee-b641-b2c534a9014f', // K1 Acetinado
  '862d07a7-8e86-4710-8dd6-822a8d9e40b8', // K1 SW
  'b62876de-1843-4a3c-92a3-c325850409bb', // K1 Full Black
];

/** ID do Multitool Kaowz no catálogo (site) */
const DEFAULT_MULTITOOL_ID = '1b6cf9e3-96d8-403f-8119-25cf4888d935';

/** Canivetes esgotados por padrão (Full Black) */
const DEFAULT_CANIVETE_ESGOTADO_IDS = [
  'b62876de-1843-4a3c-92a3-c325850409bb', // K1 Full Black
];

export const DEFAULT_URBAN_EDC_CONFIG: UrbanEdcConfig = {
  whatsappPhone: '5528999025695',
  texts: {
    eyebrow: '— Urban EDC Series —',
    heroTitle: 'MONTE SEU {KIT URBAN EDC}',
    heroDesc: 'O kit definitivo para o dia a dia urbano. Push Dagger + Canivete K1 + Multitool — tudo em uma case tática exclusiva.',
    ctaText: 'Quero Montar Meu Kit',
    refEyebrow: '— Referência Visual —',
    refTitle: 'Kit Urban EDC',
    refLabel: 'Push Dagger · Canivete K1 · Multitool',
    refSub: 'Case tática com espuma recortada',
    footerNote: 'Garantia vitalícia · Afiação vitalícia gratuita · Certificado oficial\nVenda exclusiva para maiores de 18 anos.',
  },
  pushAco: 'sandvik',
  pushEmpunhadura: 'g10',
  caniveteIds: DEFAULT_CANIVETE_IDS,
  caniveteEsgotadoIds: DEFAULT_CANIVETE_ESGOTADO_IDS,
  multitoolId: DEFAULT_MULTITOOL_ID,
  multitoolPrice: 75,
  casePrice: 50,
  kitDiscount: 0,
  bannerImage: '',
  kitImage: '',
};

export const URBAN_EDC_CONFIG_TABLE = 'urban_edc_config' as const;

export async function loadUrbanEdcConfig(): Promise<UrbanEdcConfig> {
  try {
    const { data, error } = await supabase.from(URBAN_EDC_CONFIG_TABLE).select('chave, valor');
    if (error || !data) return DEFAULT_URBAN_EDC_CONFIG;
    const map: Record<string, string> = {};
    data.forEach((r: any) => { if (r.valor != null) map[r.chave] = r.valor; });
    const p = (key: string) => { try { return map[key] ? JSON.parse(map[key]) : undefined; } catch { return undefined; } };
    return mergeConfig({
      whatsappPhone: map.whatsapp_phone,
      texts: p('texts'),
      pushAco: map.push_aco,
      pushEmpunhadura: map.push_empunhadura,
      caniveteIds: p('canivete_ids'),
      caniveteEsgotadoIds: p('canivete_esgotado_ids'),
      multitoolId: map.multitool_id,
      multitoolPrice: p('multitool_price'),
      casePrice: p('case_price'),
      kitDiscount: p('kit_discount'),
      bannerImage: map.banner_image,
      kitImage: map.kit_image,
    });
  } catch {
    return DEFAULT_URBAN_EDC_CONFIG;
  }
}

export async function saveUrbanEdcConfig(cfg: UrbanEdcConfig): Promise<void> {
  const rows = [
    { chave: 'whatsapp_phone', valor: cfg.whatsappPhone },
    { chave: 'texts', valor: JSON.stringify(cfg.texts) },
    { chave: 'push_aco', valor: cfg.pushAco },
    { chave: 'push_empunhadura', valor: cfg.pushEmpunhadura },
    { chave: 'canivete_ids', valor: JSON.stringify(cfg.caniveteIds) },
    { chave: 'canivete_esgotado_ids', valor: JSON.stringify(cfg.caniveteEsgotadoIds) },
    { chave: 'multitool_id', valor: cfg.multitoolId || '' },
    { chave: 'multitool_price', valor: JSON.stringify(cfg.multitoolPrice) },
    { chave: 'case_price', valor: JSON.stringify(cfg.casePrice) },
    { chave: 'kit_discount', valor: JSON.stringify(cfg.kitDiscount) },
    { chave: 'banner_image', valor: cfg.bannerImage || '' },
    { chave: 'kit_image', valor: cfg.kitImage || '' },
  ];
  const { error } = await supabase.from(URBAN_EDC_CONFIG_TABLE).upsert(rows, { onConflict: 'chave' });
  if (error) throw error;
}

function mergeConfig(p: any): UrbanEdcConfig {
  const d = DEFAULT_URBAN_EDC_CONFIG;
  return {
    whatsappPhone: p?.whatsappPhone || d.whatsappPhone,
    texts: { ...d.texts, ...(p?.texts || {}) },
    pushAco: p?.pushAco || d.pushAco,
    pushEmpunhadura: p?.pushEmpunhadura || d.pushEmpunhadura,
    caniveteIds: Array.isArray(p?.caniveteIds) && p.caniveteIds.length ? p.caniveteIds : d.caniveteIds,
    caniveteEsgotadoIds: Array.isArray(p?.caniveteEsgotadoIds) ? p.caniveteEsgotadoIds : d.caniveteEsgotadoIds,
    multitoolId: p?.multitoolId || d.multitoolId,
    multitoolPrice: typeof p?.multitoolPrice === 'number' ? p.multitoolPrice : d.multitoolPrice,
    casePrice: typeof p?.casePrice === 'number' ? p.casePrice : d.casePrice,
    kitDiscount: typeof p?.kitDiscount === 'number' ? p.kitDiscount : d.kitDiscount,
    bannerImage: p?.bannerImage || d.bannerImage,
    kitImage: p?.kitImage || d.kitImage,
  };
}

/* ─── Helpers para puxar dados reais da push dagger (Metálica ou Non Metallic) ─── */
function pushPrice(kit: KitConfig, version: PushVersionKey, size: PushSizeKey, finish: FinishKey, aco: AcoKey, emp: EmpunhaduraKey): number {
  const ver = kit.versions[version];
  if (ver.hasAcoEmpunhadura && ver.pricesByConfig) return ver.pricesByConfig[size][aco][emp][finish];
  return ver.prices[size][finish];
}
function pushImage(kit: KitConfig, version: PushVersionKey, size: PushSizeKey, finish: FinishKey, aco: AcoKey, emp: EmpunhaduraKey): string {
  const ver = kit.versions[version];
  if (ver.hasAcoEmpunhadura && ver.imagesByConfig) {
    const u = ver.imagesByConfig[size][aco][emp][finish];
    if (u) return u;
  }
  return ver.imagesBySize[size][finish] || '';
}

const BRL = (n: number) =>
  n.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL', minimumFractionDigits: 0, maximumFractionDigits: 0 });
const BRL2 = (n: number) =>
  n.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL', minimumFractionDigits: 2, maximumFractionDigits: 2 });

function renderHeroTitle(t: string) {
  return t.split(/\{([^}]+)\}/g).map((p, i) => <span key={i}>{p}</span>);
}

/* ─── Component ─── */
export default function KitUrbanEdc() {
  const [cfg, setCfg] = useState<UrbanEdcConfig>(DEFAULT_URBAN_EDC_CONFIG);
  const [kit, setKit] = useState<KitConfig | null>(null);
  const [canivetes, setCanivetes] = useState<Canivete[]>([]);
  const [multitool, setMultitool] = useState<CatalogoItem | null>(null);
  const [parcelamento, setParcelamento] = useState<{ parcelas: number; taxa: number }>({ parcelas: 10, taxa: 11.43 });
  const [loading, setLoading] = useState(true);

  const [pushVersion, setPushVersion] = useState<PushVersionKey>('standard');
  const [pushSize, setPushSize] = useState<PushSizeKey>('compact');
  const [pushAco, setPushAco] = useState<AcoKey>('sandvik');
  const [pushEmpunhadura, setPushEmpunhadura] = useState<EmpunhaduraKey>('g10');
  const [pushFinish, setPushFinish] = useState<FinishKey>('sw');
  const [caniveteId, setCaniveteId] = useState<string>('');

  useEffect(() => {
    let active = true;
    (async () => {
      const c = await loadUrbanEdcConfig();
      const kitCfg = await loadKitConfig();
      if (!active) return;
      setCfg(c);
      setKit(kitCfg);
      setPushAco(c.pushAco);
      setPushEmpunhadura(c.pushEmpunhadura);

      // Maior parcelamento ativo limitado a 10x para o kit
      supabase
        .from('parcelamento_taxas')
        .select('parcelas, taxa_percentual')
        .eq('ativo', true)
        .lte('parcelas', 10)
        .order('parcelas', { ascending: false })
        .limit(1)
        .then(({ data }) => {
          if (active && data?.[0]) {
            setParcelamento({ parcelas: data[0].parcelas, taxa: Number(data[0].taxa_percentual) || 0 });
          }
        });

      // Carrega canivetes + multitool a partir do catálogo (site) numa única consulta
      const ids = [...c.caniveteIds, c.multitoolId].filter(Boolean);
      if (ids.length) {
        const { data } = await supabase
          .from('catalogo_modelos')
          .select('id, nome_modelo, preco_base, imagem_modelo')
          .in('id', ids);
        if (active && data) {
          const byId: Record<string, CatalogoItem> = {};
          (data as CatalogoItem[]).forEach((x) => (byId[x.id] = x));
          const sorted = c.caniveteIds.map((id) => byId[id]).filter(Boolean);
          setCanivetes(sorted);
          // Seleção inicial: primeiro canivete NÃO esgotado (preferindo o 2º — Stone Washed)
          const disponiveis = sorted.filter((cv) => !c.caniveteEsgotadoIds.includes(cv.id));
          const escolha = disponiveis[Math.min(1, disponiveis.length - 1)] || sorted[0];
          if (escolha) setCaniveteId(escolha.id);
          setMultitool(byId[c.multitoolId] || null);
        }
      }
      setLoading(false);
    })();
    return () => { active = false; };
  }, []);

  const canivete = useMemo(() => canivetes.find((c) => c.id === caniveteId) || null, [canivetes, caniveteId]);

  // Pré-carrega todas as imagens (push dagger + canivetes) para troca instantânea
  useEffect(() => {
    if (!kit) return;
    const urls = new Set<string>();
    PUSH_VERSION_KEYS.forEach((version) => {
      (['compact', 'micro'] as PushSizeKey[]).forEach((size) => {
        FINISH_KEYS.forEach((finish) => {
          ACO_KEYS.forEach((aco) => {
            EMPUNHADURA_KEYS.forEach((emp) => {
              const u = pushImage(kit, version, size, finish, aco, emp);
              if (u) urls.add(u);
            });
          });
        });
      });
    });
    canivetes.forEach((c) => { if (c.imagem_modelo) urls.add(c.imagem_modelo); });
    urls.forEach((src) => {
      const im = new Image();
      im.decoding = 'async';
      im.src = src;
    });
  }, [kit, canivetes]);

  if (loading || !kit) {
    return <div className="uedc-root" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '60vh', color: '#8A8A88' }}>
      <style>{css}</style>
      Carregando Kit Urban EDC...
    </div>;
  }

  const pushVer = kit.versions[pushVersion];
  const effFinish: FinishKey = pushVer.hasFinishes ? pushFinish : 'satin';
  const pPrice = pushPrice(kit, pushVersion, pushSize, effFinish, pushAco, pushEmpunhadura);
  const pImg = pushImage(kit, pushVersion, pushSize, effFinish, pushAco, pushEmpunhadura);
  const pushVerLabel = pushVer.texts?.tabLabel || PUSH_VERSION_FALLBACK[pushVersion];
  const cPrice = canivete?.preco_base ?? 0;
  // Multitool e case têm custo embutido no total (não exibidos individualmente)
  const embutido = (cfg.multitoolPrice || 0) + (cfg.casePrice || 0);
  const subtotal = pPrice + cPrice + embutido;
  const discountValue = cfg.kitDiscount > 0 ? Math.round(subtotal * (cfg.kitDiscount / 100)) : 0;
  const total = subtotal - discountValue;

  // Pagamento: Pix com 5% OFF e parcelamento (taxa da tabela parcelamento_taxas)
  const DESCONTO_PIX = 5;
  const totalPix = total * (1 - DESCONTO_PIX / 100);
  const valorParcela = (total * (1 + parcelamento.taxa / 100)) / parcelamento.parcelas;

  const multitoolName = multitool?.nome_modelo?.trim() ?? 'Multitool Kaowz';

  const waMessage = (() => {
    const pushDetail = pushVer.hasAcoEmpunhadura
      ? ` — ${FINISH_NAMES[pushFinish]} (${ACO_NAMES[pushAco]} · ${EMPUNHADURA_NAMES[pushEmpunhadura]})`
      : '';
    const lines = [
      `Quero montar meu Kit Urban EDC:`,
      ``,
      `• Push Dagger ${pushVerLabel} ${PUSH_SIZE_NAMES[pushSize]}${pushDetail}`,
      `• ${canivete?.nome_modelo?.trim() ?? 'Canivete K1'}`,
      `• ${multitoolName}`,
      `• Case tática`,
    ];
    if (discountValue > 0) lines.push(`\nDesconto Kit: ${cfg.kitDiscount}% (-${BRL(discountValue)})`);
    lines.push(`\nTotal do Kit: ${BRL(total)}`);
    return encodeURIComponent(lines.join('\n'));
  })();
  const waUrl = `https://wa.me/${cfg.whatsappPhone}?text=${waMessage}`;

  return (
    <div className="uedc-root">
      <style>{css}</style>

      <header className="uedc-header">
        <a href="/kit-urban-edc" className="logo" aria-label="Kaowz">
          <img src={kaowzLogo} alt="Kaowz" className="logo-img" />
        </a>
      </header>

      <section className="hero">
        <div className="eyebrow">{cfg.texts.eyebrow}</div>
        <h1 className="hero-title">{renderHeroTitle(cfg.texts.heroTitle)}</h1>
        <p className="hero-desc">{cfg.texts.heroDesc}</p>
      </section>

      {cfg.bannerImage && (
        <section className="banner">
          <div className="banner-frame">
            <img src={cfg.bannerImage} alt={cfg.texts.refTitle} className="banner-img" />
          </div>
        </section>
      )}

      <div className="kit-grid">
        {/* Push Dagger */}
        <article className="kit-item">
          <div className="kit-item-header">
            <span className="kit-item-num">01</span>
            <div>
              <div className="kit-item-name">Push Dagger</div>
              <div className="kit-item-sub">
                {pushVerLabel} · {PUSH_SIZE_NAMES[pushSize]}
                {pushVer.hasFinishes && ` · ${FINISH_NAMES[pushFinish]}`}
                {pushVer.hasAcoEmpunhadura && ` · ${ACO_NAMES[pushAco]} · ${EMPUNHADURA_NAMES[pushEmpunhadura]}`}
              </div>
            </div>
            <span className="kit-item-price">{BRL(pPrice)}</span>
          </div>

          <div className="product-stage">
            <div className="product-card">
              {pImg ? (
                <img src={pImg} alt={`Push Dagger ${PUSH_SIZE_NAMES[pushSize]}`} className="product-img" loading="eager" />
              ) : (
                <div className="product-placeholder">Push Dagger<br />{PUSH_SIZE_NAMES[pushSize]}</div>
              )}
              <div className="product-card-overlay" />
              <div className="product-card-tag">{pushVer.hasFinishes ? FINISH_NAMES[pushFinish] : pushVerLabel}</div>
              <div className="product-card-price">{BRL(pPrice)}</div>
            </div>
          </div>

          <div className="opt-section">
            <div className="opt-label">Versão</div>
            <div className="finish-options bainha-options">
              {PUSH_VERSION_KEYS.map((vk) => (
                <button key={vk} type="button" className={`finish-btn ${pushVersion === vk ? 'active' : ''}`} onClick={() => setPushVersion(vk)}>
                  <span className="finish-name">{kit.versions[vk].texts?.tabLabel || PUSH_VERSION_FALLBACK[vk]}</span>
                </button>
              ))}
            </div>
          </div>

          <div className="opt-section">
            <div className="opt-label">Tamanho</div>
            <div className="finish-options bainha-options">
              {PUSH_SIZE_LIST.map((s) => (
                <button key={s.key} type="button" className={`finish-btn ${pushSize === s.key ? 'active' : ''}`} onClick={() => setPushSize(s.key)}>
                  <span className="finish-name">{s.name}</span>
                </button>
              ))}
            </div>
          </div>

          {pushVer.hasAcoEmpunhadura && (
            <div className="opt-section">
              <div className="opt-label">Aço</div>
              <div className="finish-options bainha-options">
                {ACO_KEYS.map((ak) => (
                  <button key={ak} type="button" className={`finish-btn ${pushAco === ak ? 'active' : ''}`} onClick={() => setPushAco(ak)}>
                    <span className="finish-name">{ACO_NAMES[ak]}</span>
                  </button>
                ))}
              </div>
            </div>
          )}

          {pushVer.hasAcoEmpunhadura && (
            <div className="opt-section">
              <div className="opt-label">Empunhadura</div>
              <div className="finish-options bainha-options">
                {EMPUNHADURA_KEYS.map((ek) => (
                  <button key={ek} type="button" className={`finish-btn ${pushEmpunhadura === ek ? 'active' : ''}`} onClick={() => setPushEmpunhadura(ek)}>
                    <span className="finish-name">{EMPUNHADURA_NAMES[ek]}</span>
                  </button>
                ))}
              </div>
            </div>
          )}

          {pushVer.hasFinishes && (
            <div className="opt-section">
              <div className="opt-label">Acabamento</div>
              <div className="finish-options">
                {FINISH_KEYS.map((fk) => (
                  <button key={fk} type="button" className={`finish-btn ${pushFinish === fk ? 'active' : ''}`} onClick={() => setPushFinish(fk)}>
                    <span className="finish-name">{FINISH_NAMES[fk]}</span>
                  </button>
                ))}
              </div>
            </div>
          )}
        </article>

        {/* Multitool (centro) */}
        <article className="kit-item">
          <div className="kit-item-header">
            <span className="kit-item-num">02</span>
            <div>
              <div className="kit-item-name">Multitool</div>
              <div className="kit-item-sub">{multitoolName}</div>
            </div>
            <span className="kit-item-included-tag">NO KIT</span>
          </div>

          <div className="product-stage">
            <div className="product-card">
              {multitool?.imagem_modelo ? (
                <img src={multitool.imagem_modelo} alt={multitoolName} className="product-img" loading="eager" />
              ) : (
                <div className="product-placeholder">Multitool<br />Kaowz</div>
              )}
              <div className="product-card-overlay" />
              <div className="product-card-tag">{multitoolName}</div>
            </div>
          </div>

          <div className="included-note">
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none"><path d="M13.3 4.3L6 11.6 2.7 8.3" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
            <span>{multitoolName} + Case tática inclusos no kit.</span>
          </div>
        </article>

        {/* Canivete K1 */}
        <article className="kit-item">
          <div className="kit-item-header">
            <span className="kit-item-num">03</span>
            <div>
              <div className="kit-item-name">Canivete K1</div>
              <div className="kit-item-sub">{canivete?.nome_modelo?.trim() ?? '—'}</div>
            </div>
            <span className="kit-item-price">{BRL(cPrice)}</span>
          </div>

          <div className="product-stage">
            <div className="product-card">
              {canivete?.imagem_modelo ? (
                <img src={canivete.imagem_modelo} alt={canivete.nome_modelo} className="product-img" loading="eager" />
              ) : (
                <div className="product-placeholder">Canivete K1</div>
              )}
              <div className="product-card-overlay" />
              {canivete && <div className="product-card-tag">{canivete.nome_modelo.trim()}</div>}
              <div className="product-card-price">{BRL(cPrice)}</div>
            </div>
          </div>

          <div className="opt-section">
            <div className="opt-label">Modelo</div>
            <div className="finish-options canivete-options">
              {canivetes.map((c) => {
                const esgotado = cfg.caniveteEsgotadoIds.includes(c.id);
                return (
                  <button
                    key={c.id}
                    type="button"
                    disabled={esgotado}
                    className={`finish-btn canivete-btn ${caniveteId === c.id ? 'active' : ''} ${esgotado ? 'esgotado' : ''}`}
                    onClick={() => { if (!esgotado) setCaniveteId(c.id); }}
                  >
                    <span className="finish-name">{c.nome_modelo.trim()}</span>
                    {esgotado
                      ? <span className="canivete-esgotado">Esgotado</span>
                      : <span className="canivete-price">{BRL(c.preco_base)}</span>}
                  </button>
                );
              })}
            </div>
          </div>
        </article>
      </div>

      {/* CTA */}
      <div className="cta-block">
        <div className="total-row">
          <span className="total-label">Total do Kit</span>
          {discountValue > 0 && (
            <div className="total-de">
              <span className="total-de-label">De</span>
              <span className="total-old">{BRL(subtotal)}</span>
            </div>
          )}
          <div className="total-por">
            {discountValue > 0 && <span className="total-por-label">Por</span>}
            <span className="total-val">{BRL(total)}</span>
          </div>
          {discountValue > 0 && <span className="total-discount">-{cfg.kitDiscount}% Kit</span>}
        </div>

        <div className="pay-info">
          <span className="pay-pix">ou {BRL2(totalPix)} no Pix <em>({DESCONTO_PIX}% OFF)</em></span>
          <span className="pay-parc">OU EM 10X DE {BRL2(total / 10)} SEM JUROS</span>
        </div>

        <a className="btn-cta" href={waUrl} target="_blank" rel="noopener noreferrer">{cfg.texts.ctaText}</a>
        <div className="cta-note">Atendimento via WhatsApp</div>
      </div>

      {/* Reference */}
      {cfg.kitImage && (
        <section className="ref-section">
          <div className="ref-section-head">
            <div className="eyebrow">{cfg.texts.refEyebrow}</div>
            <h2>{cfg.texts.refTitle}</h2>
          </div>
          <figure className="ref-card">
            <div className="ref-img-wrap">
              <img src={cfg.kitImage} alt={cfg.texts.refTitle} />
            </div>
            <figcaption>
              <span className="ref-label">{cfg.texts.refLabel}</span>
              <span className="ref-sub">{cfg.texts.refSub}</span>
            </figcaption>
          </figure>
        </section>
      )}

      <div className="footer-note">
        {cfg.texts.footerNote.split('\n').map((l, i) => (
          <span key={i}>{l}<br /></span>
        ))}
      </div>
    </div>
  );
}

/* ─── Styles (same visual language as Push Dagger configurator) ─── */
const css = `
.uedc-root {
  --bg: #050505;
  --s1: #0C0C0C;
  --s2: #161616;
  --border: rgba(255,255,255,0.06);
  --border-m: rgba(255,255,255,0.14);
  --accent: #FFC107;
  --accent-l: #FFD54A;
  --accent-dim: #b58800;
  --text: #FFFFFF;
  --muted: #8A8A88;
  --dim: #4A4A48;
  background: var(--bg);
  color: var(--text);
  font-family: 'Barlow', sans-serif;
  min-height: 100vh;
  background-image:
    radial-gradient(ellipse at top, rgba(255,193,7,0.04), transparent 55%),
    repeating-linear-gradient(0deg, transparent 0 40px, rgba(255,255,255,0.015) 40px 41px),
    repeating-linear-gradient(90deg, transparent 0 40px, rgba(255,255,255,0.015) 40px 41px),
    repeating-linear-gradient(45deg, transparent 0 12px, rgba(255,255,255,0.012) 12px 13px);
}
.uedc-root * { box-sizing: border-box; }

.uedc-root .uedc-header {
  display: flex; align-items: center; justify-content: center;
  padding: 1rem 1.75rem; border-bottom: 1px solid var(--border);
  background: rgba(5,5,5,0.9); backdrop-filter: blur(12px);
  position: sticky; top: 0; z-index: 40;
}
.uedc-root .logo { display: inline-flex; align-items: center; }
.uedc-root .logo-img { height: 38px; width: auto; display: block; }

.uedc-root .hero { padding: 2.5rem 1.5rem 2rem; text-align: center; max-width: 760px; margin: 0 auto; animation: uedcFadeIn 0.6s ease-out both; }
.uedc-root .eyebrow { font-family: 'Barlow Condensed', sans-serif; font-size: 11px; letter-spacing: 4px; color: var(--accent); text-transform: uppercase; margin-bottom: 18px; }
.uedc-root .hero-title { font-family: 'Bebas Neue', sans-serif; font-size: clamp(42px, 8vw, 72px); letter-spacing: 6px; line-height: 0.95; margin-bottom: 22px; font-weight: 700; }
.uedc-root .hero-title span:nth-child(even) { color: var(--accent); font-style: italic; }
.uedc-root .hero-desc { font-size: 14px; color: #B5B5B3; line-height: 1.7; max-width: 540px; margin: 0 auto; letter-spacing: 0.3px; }

/* Banner abaixo do hero */
.uedc-root .banner { max-width: 900px; margin: 0 auto 2.5rem; padding: 0 1.5rem; animation: uedcFadeIn 0.6s 0.1s ease-out both; }
.uedc-root .banner-frame { position: relative; width: 100%; border: 1px solid var(--border); border-radius: 8px; overflow: hidden; background: #000; }
.uedc-root .banner-frame::before { content: ''; position: absolute; top: -1px; left: -1px; width: 16px; height: 16px; border-top: 2px solid var(--accent); border-left: 2px solid var(--accent); border-top-left-radius: 2px; z-index: 2; opacity: 0.8; }
.uedc-root .banner-frame::after { content: ''; position: absolute; bottom: -1px; right: -1px; width: 16px; height: 16px; border-bottom: 2px solid var(--accent); border-right: 2px solid var(--accent); border-bottom-right-radius: 2px; z-index: 2; opacity: 0.8; }
.uedc-root .banner-img { display: block; width: 100%; height: auto; object-fit: cover; }

/* Grid: 3 items */
.uedc-root .kit-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 16px; max-width: 1100px; margin: 0 auto; padding: 0 1.5rem; animation: uedcFadeIn 0.6s 0.15s ease-out both; }

.uedc-root .kit-item {
  background: linear-gradient(180deg, var(--s1) 0%, #070707 100%);
  border: 1px solid var(--border); border-radius: 6px;
  padding: 1.25rem; display: flex; flex-direction: column; gap: 1rem;
  position: relative; transition: all .3s ease;
  animation: uedcFadeIn 0.5s ease-out both;
}
.uedc-root .kit-item:nth-child(1) { animation-delay: 0.1s; }
.uedc-root .kit-item:nth-child(2) { animation-delay: 0.2s; }
.uedc-root .kit-item:nth-child(3) { animation-delay: 0.3s; }
.uedc-root .kit-item:hover { border-color: rgba(255,193,7,0.3); transform: translateY(-3px); box-shadow: 0 8px 32px rgba(0,0,0,0.4); }

.uedc-root .kit-item::before {
  content: ''; position: absolute; top: -1px; left: -1px;
  width: 14px; height: 14px;
  border-top: 2px solid var(--accent); border-left: 2px solid var(--accent);
  border-top-left-radius: 2px; pointer-events: none; z-index: 2; opacity: 0.7;
}
.uedc-root .kit-item::after {
  content: ''; position: absolute; bottom: -1px; right: -1px;
  width: 14px; height: 14px;
  border-bottom: 2px solid var(--accent); border-right: 2px solid var(--accent);
  border-bottom-right-radius: 2px; pointer-events: none; z-index: 2; opacity: 0.7;
}

.uedc-root .kit-item-header { display: flex; align-items: center; gap: 12px; padding-bottom: 0.75rem; border-bottom: 1px solid var(--border); }
.uedc-root .kit-item-num { font-family: 'Bebas Neue', sans-serif; font-size: 28px; color: var(--accent); line-height: 1; opacity: 0.85; }
.uedc-root .kit-item-name { font-family: 'Bebas Neue', sans-serif; font-size: 20px; letter-spacing: 3px; line-height: 1; }
.uedc-root .kit-item-sub { font-family: 'Barlow Condensed', sans-serif; font-size: 10px; color: var(--muted); letter-spacing: 1.2px; margin-top: 3px; text-transform: uppercase; }
.uedc-root .kit-item-price { margin-left: auto; font-family: 'Bebas Neue', sans-serif; font-size: 20px; color: var(--accent); letter-spacing: 1px; }
.uedc-root .kit-item-included-tag { margin-left: auto; font-family: 'Barlow Condensed', sans-serif; font-size: 10px; letter-spacing: 2px; text-transform: uppercase; background: rgba(255,193,7,0.12); color: var(--accent); padding: 4px 10px; border-radius: 3px; border: 1px solid rgba(255,193,7,0.25); }

/* Product card */
.uedc-root .product-stage { width: 100%; }
.uedc-root .product-card { position: relative; width: 100%; aspect-ratio: 1 / 1; background: var(--s2); border: 1px solid var(--border); border-radius: 6px; overflow: hidden; transition: all .3s ease; }
.uedc-root .product-card:hover { border-color: var(--border-m); }
.uedc-root .product-img { position: absolute; inset: 0; width: 100%; height: 100%; object-fit: cover; transition: transform .35s ease; }
.uedc-root .product-card:hover .product-img { transform: scale(1.04); }
.uedc-root .product-card-overlay { position: absolute; inset: 0; background: linear-gradient(180deg, transparent 50%, rgba(0,0,0,0.7) 100%); pointer-events: none; }
.uedc-root .product-card-tag { position: absolute; left: 8px; bottom: 8px; background: rgba(0,0,0,0.65); backdrop-filter: blur(8px); border: 1px solid var(--border-m); color: #fff; font-family: 'Barlow Condensed', sans-serif; font-size: 10px; letter-spacing: 1.5px; text-transform: uppercase; padding: 4px 10px; border-radius: 3px; font-weight: 500; }
.uedc-root .product-card-price { position: absolute; right: 8px; top: 8px; background: var(--accent); color: #000; font-family: 'Bebas Neue', sans-serif; font-size: 14px; letter-spacing: 1.5px; padding: 3px 8px; border-radius: 3px; box-shadow: 0 2px 8px rgba(0,0,0,0.3); }
.uedc-root .product-placeholder { display: flex; align-items: center; justify-content: center; width: 100%; height: 100%; text-align: center; font-family: 'Barlow Condensed', sans-serif; font-size: 14px; letter-spacing: 2px; text-transform: uppercase; color: var(--dim); line-height: 1.6; }

/* Options — mesmas classes/estilo do configurador do Kit Push Dagger */
.uedc-root .opt-section { display: flex; flex-direction: column; gap: 6px; }
.uedc-root .opt-label { font-family: 'Barlow Condensed', sans-serif; font-size: 10px; letter-spacing: 2px; color: var(--muted); text-transform: uppercase; }
.uedc-root .finish-options { display: grid; grid-template-columns: repeat(3, 1fr); gap: 4px; }
.uedc-root .finish-btn { position: relative; padding: 11px 4px; border: 1px solid var(--border); border-radius: 4px; background: transparent; cursor: pointer; transition: all .2s ease; color: inherit; font-family: inherit; }
.uedc-root .finish-btn:hover { border-color: var(--border-m); background: rgba(255,255,255,0.03); transform: translateY(-1px); }
.uedc-root .finish-btn.active { border-color: var(--accent); background: rgba(255,193,7,0.07); box-shadow: 0 0 10px rgba(255,193,7,0.1); }
.uedc-root .finish-name { font-family: 'Barlow Condensed', sans-serif; font-size: 11px; color: var(--muted); letter-spacing: 1.4px; text-transform: uppercase; line-height: 1; display: block; transition: color .2s ease; }
.uedc-root .finish-btn.active .finish-name { color: var(--accent); font-weight: 600; }
.uedc-root .bainha-options { grid-template-columns: 1fr 1fr; }
.uedc-root .canivete-options { grid-template-columns: 1fr; }
.uedc-root .canivete-btn { display: flex; align-items: center; justify-content: space-between; gap: 8px; text-align: left; padding: 11px 12px; }
.uedc-root .canivete-price { font-family: 'Bebas Neue', sans-serif; font-size: 13px; color: var(--accent); letter-spacing: 1px; flex-shrink: 0; }
.uedc-root .canivete-btn.esgotado { opacity: 0.5; cursor: not-allowed; }
.uedc-root .canivete-btn.esgotado:hover { border-color: var(--border); background: transparent; transform: none; }
.uedc-root .canivete-btn.esgotado .finish-name { text-decoration: line-through; color: var(--dim); }
.uedc-root .canivete-esgotado { font-family: 'Barlow Condensed', sans-serif; font-size: 10px; letter-spacing: 1.5px; text-transform: uppercase; color: #F87171; border: 1px solid rgba(248,113,113,0.4); border-radius: 3px; padding: 2px 7px; flex-shrink: 0; }

/* Included note */
.uedc-root .included-note { display: flex; align-items: flex-start; gap: 10px; padding: 12px; background: rgba(255,193,7,0.06); border: 1px solid rgba(255,193,7,0.15); border-radius: 4px; color: var(--muted); font-family: 'Barlow Condensed', sans-serif; font-size: 12px; letter-spacing: 1px; line-height: 1.5; }
.uedc-root .included-note svg { flex-shrink: 0; color: var(--accent); margin-top: 1px; }

/* CTA block */
.uedc-root .cta-block { max-width: 560px; margin: 3rem auto 0; padding: 2rem 1.5rem; text-align: center; border-top: 1px solid var(--border); border-bottom: 1px solid var(--border); position: relative; animation: uedcFadeIn 0.6s 0.2s ease-out both; }
.uedc-root .cta-block::before, .uedc-root .cta-block::after { content: ''; position: absolute; left: 50%; transform: translateX(-50%); width: 40px; height: 1px; background: var(--accent); }
.uedc-root .cta-block::before { top: -1px; }
.uedc-root .cta-block::after { bottom: -1px; }

.uedc-root .total-row { display: flex; flex-direction: column; align-items: center; gap: 8px; margin-bottom: 18px; }
.uedc-root .total-label { font-family: 'Barlow Condensed', sans-serif; font-size: 11px; letter-spacing: 3px; color: var(--muted); text-transform: uppercase; }
.uedc-root .total-de { display: inline-flex; align-items: baseline; gap: 8px; opacity: 0.85; }
.uedc-root .total-de-label { font-family: 'Barlow Condensed', sans-serif; font-size: 11px; letter-spacing: 2px; color: var(--muted); text-transform: uppercase; }
.uedc-root .total-old { font-family: 'Barlow', sans-serif; font-size: 28px; color: var(--dim); text-decoration: line-through; }
.uedc-root .total-por { display: inline-flex; align-items: baseline; gap: 10px; }
.uedc-root .total-por-label { font-family: 'Barlow Condensed', sans-serif; font-size: 13px; letter-spacing: 3px; color: var(--accent); text-transform: uppercase; }
.uedc-root .total-val { font-family: 'Bebas Neue', sans-serif; font-size: 84px; letter-spacing: 3px; color: var(--accent); line-height: 1; text-shadow: 0 2px 24px rgba(255,193,7,0.25); transition: all .3s ease; }
.uedc-root .total-discount { display: inline-block; margin-top: 4px; font-family: 'Barlow Condensed', sans-serif; font-size: 11px; letter-spacing: 2px; background: var(--accent); color: #000; padding: 4px 12px; border-radius: 3px; font-weight: 700; }

.uedc-root .pay-info { display: flex; flex-direction: column; align-items: center; gap: 3px; margin: 4px 0 18px; }
.uedc-root .pay-pix { font-family: 'Barlow', sans-serif; font-size: 16px; font-weight: 800; color: #34D399; letter-spacing: 0.3px; }
.uedc-root .pay-pix em { font-style: normal; font-weight: 600; font-size: 12px; color: #10B981; }
.uedc-root .pay-parc { font-family: 'Barlow Condensed', sans-serif; font-size: 13px; letter-spacing: 1px; color: var(--muted); text-transform: uppercase; }

/* Kit summary */
.uedc-root .kit-summary { display: flex; flex-direction: column; gap: 6px; margin-bottom: 1.5rem; text-align: left; max-width: 380px; margin-left: auto; margin-right: auto; }
.uedc-root .kit-summary-item { display: flex; align-items: center; gap: 10px; font-family: 'Barlow Condensed', sans-serif; font-size: 12px; letter-spacing: 1px; color: var(--muted); text-transform: uppercase; padding: 6px 10px; background: rgba(255,255,255,0.02); border: 1px solid var(--border); border-radius: 3px; }
.uedc-root .kit-summary-dot { width: 8px; height: 8px; border-radius: 50%; flex-shrink: 0; }
.uedc-root .dot-push { background: var(--accent); }
.uedc-root .dot-canivete { background: #8AB4F8; }
.uedc-root .dot-multi { background: #81C784; }
.uedc-root .dot-case { background: #B388FF; }
.uedc-root .kit-summary-val { margin-left: auto; font-family: 'Bebas Neue', sans-serif; font-size: 14px; color: var(--accent); letter-spacing: 1px; }
.uedc-root .kit-summary-val.check { color: #81C784; font-family: 'Barlow', sans-serif; font-size: 15px; font-weight: 700; }

.uedc-root .btn-cta { display: inline-block; background: var(--accent); color: #000; border: none; border-radius: 6px; padding: 16px 48px; font-family: 'Barlow Condensed', sans-serif; font-size: 18px; font-weight: 700; letter-spacing: 3px; cursor: pointer; text-decoration: none; text-transform: uppercase; transition: all .25s ease; box-shadow: 0 4px 0 var(--accent-dim), 0 8px 24px rgba(255,193,7,0.2); }
.uedc-root .btn-cta:hover { background: var(--accent-l); transform: translateY(-2px); box-shadow: 0 6px 0 var(--accent-dim), 0 12px 28px rgba(255,193,7,0.3); }
.uedc-root .btn-cta:active { transform: translateY(2px); box-shadow: 0 2px 0 var(--accent-dim); }
.uedc-root .cta-note { margin-top: 14px; font-family: 'Barlow Condensed', sans-serif; font-size: 11px; letter-spacing: 1.5px; color: var(--dim); text-transform: uppercase; }

/* Ref section */
.uedc-root .ref-section { max-width: 900px; margin: 4rem auto 0; padding: 0 1.75rem; animation: uedcFadeIn 0.6s 0.25s ease-out both; }
.uedc-root .ref-section-head { text-align: center; margin-bottom: 1.75rem; }
.uedc-root .ref-section-head h2 { font-family: 'Bebas Neue', sans-serif; font-size: clamp(28px, 4vw, 38px); letter-spacing: 5px; margin: 6px 0 0; }
.uedc-root .ref-card { margin: 0; background: var(--s1); border: 1px solid var(--border); border-radius: 6px; overflow: hidden; transition: all .3s ease; position: relative; }
.uedc-root .ref-card:hover { border-color: rgba(255,193,7,0.3); box-shadow: 0 8px 32px rgba(0,0,0,0.35); }
.uedc-root .ref-card::before { content: ''; position: absolute; top: -1px; left: -1px; width: 14px; height: 14px; border-top: 2px solid var(--accent); border-left: 2px solid var(--accent); border-top-left-radius: 2px; pointer-events: none; z-index: 2; opacity: 0.7; }
.uedc-root .ref-card::after { content: ''; position: absolute; bottom: -1px; right: -1px; width: 14px; height: 14px; border-bottom: 2px solid var(--accent); border-right: 2px solid var(--accent); border-bottom-right-radius: 2px; pointer-events: none; z-index: 2; opacity: 0.7; }
.uedc-root .ref-img-wrap { position: relative; width: 100%; background: #000; aspect-ratio: 16/9; }
.uedc-root .ref-img-wrap img { position: absolute; inset: 0; width: 100%; height: 100%; object-fit: cover; transition: transform .5s ease; }
.uedc-root .ref-card:hover .ref-img-wrap img { transform: scale(1.03); }
.uedc-root .ref-card figcaption { display: flex; align-items: center; justify-content: space-between; padding: 12px 16px; border-top: 1px solid var(--border); }
.uedc-root .ref-label { font-family: 'Bebas Neue', sans-serif; font-size: 16px; letter-spacing: 3px; color: var(--text); }
.uedc-root .ref-sub { font-family: 'Barlow Condensed', sans-serif; font-size: 10px; letter-spacing: 1.5px; color: var(--muted); text-transform: uppercase; }

.uedc-root .footer-note { text-align: center; padding: 2rem 1.5rem 4rem; font-size: 11px; color: var(--dim); line-height: 1.9; letter-spacing: 0.5px; animation: uedcFadeIn 0.5s 0.35s ease-out both; }

@keyframes uedcFadeIn {
  from { opacity: 0; transform: translateY(18px); }
  to { opacity: 1; transform: translateY(0); }
}

@media (max-width: 760px) {
  .uedc-root .uedc-header { padding: 0.85rem 1rem; }
  .uedc-root .hero { padding: 2rem 1rem 1.5rem; }
  .uedc-root .kit-grid { grid-template-columns: 1fr !important; padding: 0 1rem; gap: 14px; }
  .uedc-root .cta-block { padding: 1.5rem 1rem; }
  .uedc-root .btn-cta { padding: 14px 32px; font-size: 15px; width: 100%; }
  .uedc-root .total-val { font-size: 68px; }
  .uedc-root .total-old { font-size: 22px; }
  .uedc-root .ref-section { padding: 0 1rem; margin-top: 2.5rem; }
}

@media (max-width: 480px) {
  .uedc-root .kit-item-header { flex-wrap: wrap; }
  .uedc-root .kit-summary { padding: 0 0.5rem; }
}
`;
