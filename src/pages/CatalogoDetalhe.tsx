import { useState, useEffect, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ArrowLeft, MessageCircle, Zap, TrendingUp } from 'lucide-react';
import { toast } from 'sonner';
import { useExchangeRate, type ExchangeMode } from '@/hooks/useExchangeRate';

const PREF_LANG_KEY = 'catalogo_internacional_lang';
const PREF_CURRENCY_KEY = 'catalogo_internacional_currency';

const I18N = {
  pt: {
    back: 'Catálogo', loading: 'Carregando...', notFound: 'Produto não encontrado',
    backToCatalog: 'Voltar ao catálogo', readyDelivery: 'Pronta Entrega',
    salePrice: 'Preço de Venda', cost: 'Custo Revendedor', profit: 'Lucro',
    base: 'Preço', exchange: 'Câmbio', delivery: 'Entrega:', warranty: 'Garantia:',
    lifetimeWarranty: 'Garantia Vitalícia', lifetimeSub: 'Qualidade que dura para sempre',
    askWhatsapp: 'Consultar no WhatsApp',
    waMsg: (n: string, p: string) => `Olá! Gostaria de saber mais sobre:\n\n${n}\n${p}`,
    waMsgNoPrice: (n: string) => `Olá! Gostaria de saber mais sobre:\n\n${n}`,
  },
  en: {
    back: 'Catalog', loading: 'Loading...', notFound: 'Product not found',
    backToCatalog: 'Back to catalog', readyDelivery: 'In Stock',
    salePrice: 'Sale Price', cost: 'Reseller Cost', profit: 'Profit',
    base: 'Price', exchange: 'Exchange', delivery: 'Delivery:', warranty: 'Warranty:',
    lifetimeWarranty: 'Lifetime Warranty', lifetimeSub: 'Quality that lasts forever',
    askWhatsapp: 'Ask on WhatsApp',
    waMsg: (n: string, p: string) => `Hello! I would like to know more about:\n\n${n}\n${p}`,
    waMsgNoPrice: (n: string) => `Hello! I would like to know more about:\n\n${n}`,
  },
} as const;
type Lang = keyof typeof I18N;

const CATEGORY_I18N: Record<string, string> = {
  'Cozinha': 'Kitchen', 'EDC': 'EDC', 'EDCs': 'EDC', 'EDC Mini': 'Mini EDC',
  'Caça': 'Hunting', 'Tática': 'Tactical', 'Tatica': 'Tactical',
  'Coleção': 'Collection', 'Colecao': 'Collection', 'Bushcraft': 'Bushcraft',
  'Sobrevivência': 'Survival', 'Sobrevivencia': 'Survival',
  'Adagas': 'Daggers', 'Adaga': 'Dagger', 'Espada': 'Sword', 'Espadas': 'Swords',
  'Machados': 'Axes', 'Machado': 'Axe', 'Personalizada': 'Custom', 'Personalizadas': 'Custom',
  'Acessórios': 'Accessories', 'Acessorios': 'Accessories', 'Utensílios': 'Accessories',
  'Defesa': 'Defense', 'Campo': 'Outdoor', 'Churrasco': 'BBQ', 'Kits': 'Kits',
  'Vestuário': 'Apparel', 'Cafés': 'Coffee', 'Novidades': 'New Arrivals',
  'Porte velado': 'Concealed Carry',
};
const trCategoria = (cat: string, lang: Lang) =>
  lang === 'en' ? (CATEGORY_I18N[cat] || cat) : cat;

function convertPlainToHtml(text: string): string {
  const sectionHeaders = [
    'Itens Inclusos', 'Itens inclusos',
    'Especificações técnicas', 'Especificações Técnicas',
    'Especificações', 'Diferenciais',
    'Descrição do produto', 'Descrição do Produto',
    'Descrição', 'Características', 'Detalhes',
    'Material', 'Dimensões', 'Composição',
  ];
  let html = text;
  for (const header of sectionHeaders) {
    const regex = new RegExp(`^(${header}):?\\s*`, 'gmi');
    html = html.replace(regex, `</p><h2 class="theme-title">${header}</h2><p>`);
  }
  html = html.replace(/^([📌✔️🔪⚡🔥💎✅🎯📋🛡️])\s*([^:\n]+):?\s*$/gm, '</p><h2 class="theme-title">$2</h2><p>');
  html = html.replace(/^([✔️✅📌🔪⚡•●▪➤➜→])\s*(.+)$/gm, '<li>$2</li>');
  html = html.replace(/((?:<li>.*<\/li>\s*)+)/g, '<ul>$1</ul>');
  html = html.replace(/\n\n+/g, '</p><p>');
  html = html.replace(/\n/g, '<br>');
  html = `<p>${html}</p>`;
  html = html.replace(/<p>\s*<\/p>/g, '');
  html = html.replace(/<p>\s*<br>\s*<\/p>/g, '');
  return html;
}

interface Modelo {
  id: string;
  nome_modelo: string;
  preco_base: number;
  imagem_modelo: string | null;
  categorias: string[];
  categoria: string | null;
  apresentacao_venda: string | null;
  descricao_html: string | null;
  video_url: string | null;
  garantia: string | null;
  prazo_entrega: string | null;
  aspect_ratio: string;
  pronta_entrega: boolean;
}

interface Midia {
  id: string;
  nome_arquivo: string;
  url: string;
}

interface CatalogoDetalheProps {
  isRevendedor?: boolean;
}

interface Modelo {
  id: string;
  nome_modelo: string;
  nome_modelo_en?: string | null;
  preco_base: number;
  imagem_modelo: string | null;
  categorias: string[];
  categoria: string | null;
  apresentacao_venda: string | null;
  descricao_html: string | null;
  descricao_html_en?: string | null;
  video_url: string | null;
  garantia: string | null;
  prazo_entrega: string | null;
  aspect_ratio: string;
  pronta_entrega: boolean;
}

interface Midia {
  id: string;
  nome_arquivo: string;
  url: string;
}

interface CatalogoDetalheProps {
  isRevendedor?: boolean;
  isInternacional?: boolean;
}

interface IntlConfig {
  base_currency: string;
  exchange_mode: ExchangeMode;
  manual_rates: Record<string, number>;
  manual_rates_updated_at: string | null;
  margin_percent: number;
  contact_whatsapp: string | null;
}

export default function CatalogoDetalhe({ isRevendedor = false, isInternacional = false }: CatalogoDetalheProps) {
  const { id } = useParams();
  const navigate = useNavigate();
  const [modelo, setModelo] = useState<Modelo | null>(null);
  const [midias, setMidias] = useState<Midia[]>([]);
  const [imagemAtual, setImagemAtual] = useState(0);
  const [loading, setLoading] = useState(true);
  const [exibirPrecos, setExibirPrecos] = useState(true);
  const [exibirFormasPagamento, setExibirFormasPagamento] = useState(true);
  const [descontoPix, setDescontoPix] = useState(5);
  const [textoPix, setTextoPix] = useState('no PIX');
  const [textoParcelamento, setTextoParcelamento] = useState('3x sem juros ou até 12x no cartão');
  const [margemGlobal, setMargemGlobal] = useState(30);
  const [margemProduto, setMargemProduto] = useState<number | null>(null);
  const [intlConfig, setIntlConfig] = useState<IntlConfig | null>(null);
  const [intlMargemGlobal, setIntlMargemGlobal] = useState(30);
  const [intlMargemProduto, setIntlMargemProduto] = useState<number | null>(null);
  const [lang, setLang] = useState<Lang>(() => {
    if (typeof window === 'undefined') return 'en';
    return (sessionStorage.getItem(PREF_LANG_KEY) as Lang) || 'en';
  });
  const [currency, setCurrency] = useState<string>(() => {
    if (typeof window === 'undefined') return 'USD';
    return sessionStorage.getItem(PREF_CURRENCY_KEY) || 'USD';
  });

  const t = isInternacional ? I18N[lang] : I18N.pt;

  const exchange = useExchangeRate({
    mode: intlConfig?.exchange_mode || 'auto',
    baseCurrency: intlConfig?.base_currency || 'BRL',
    manualRates: intlConfig?.manual_rates || {},
    manualRatesUpdatedAt: intlConfig?.manual_rates_updated_at || null,
  });

  useEffect(() => {
    if (id) {
      carregarModelo();
      carregarMidias();
      if (isInternacional) {
        carregarConfigInternacional();
      } else if (isRevendedor) {
        carregarConfigRevendedor();
        carregarMargemProduto();
      } else {
        carregarConfigs();
      }
    }
  }, [id]);

  const carregarConfigs = async () => {
    const { data } = await supabase
      .from('configuracoes_catalogo')
      .select('*')
      .in('chave', ['exibir_precos', 'exibir_formas_pagamento', 'desconto_pix', 'texto_pix', 'texto_parcelamento']);
    if (data) {
      data.forEach(d => {
        if (d.chave === 'exibir_precos') setExibirPrecos(d.valor === 'true');
        if (d.chave === 'exibir_formas_pagamento') setExibirFormasPagamento(d.valor === 'true');
        if (d.chave === 'desconto_pix') setDescontoPix(parseFloat(d.valor) || 5);
        if (d.chave === 'texto_pix') setTextoPix(d.valor);
        if (d.chave === 'texto_parcelamento') setTextoParcelamento(d.valor);
      });
    }
  };

  const carregarConfigRevendedor = async () => {
    const { data } = await supabase
      .from('config_revendedor' as any)
      .select('*')
      .in('chave', ['margem_global']);
    if (data) {
      (data as any[]).forEach((d: any) => {
        if (d.chave === 'margem_global') setMargemGlobal(parseFloat(d.valor) || 30);
      });
    }
  };

  const carregarConfigInternacional = async () => {
    // Margem global do catálogo internacional
    const { data: kv } = await supabase
      .from('config_internacional' as any)
      .select('chave, valor')
      .in('chave', ['exibir_precos', 'margem_global']);
    if (kv) {
      (kv as any[]).forEach((d: any) => {
        if (d.chave === 'exibir_precos') setExibirPrecos(d.valor === 'true');
        if (d.chave === 'margem_global') setIntlMargemGlobal(parseFloat(d.valor) || 30);
      });
    }
    // Margem individual
    const { data: mp } = await supabase
      .from('margem_internacional_produto' as any)
      .select('margem_percentual').eq('modelo_id', id).maybeSingle();
    if (mp) setIntlMargemProduto(Number((mp as any).margem_percentual));
    // Config externa (cotação/idioma/moeda/whatsapp)
    const { data: ext } = await supabase
      .from('international_catalog_config')
      .select('base_currency, exchange_mode, manual_rates, manual_rates_updated_at, margin_percent, contact_whatsapp, default_language, default_currency')
      .order('updated_at', { ascending: false }).limit(1).maybeSingle();
    if (ext) {
      const e = ext as any;
      setIntlConfig({
        base_currency: e.base_currency || 'BRL',
        exchange_mode: e.exchange_mode || 'auto',
        manual_rates: e.manual_rates || {},
        manual_rates_updated_at: e.manual_rates_updated_at || null,
        margin_percent: Number(e.margin_percent) || 0,
        contact_whatsapp: e.contact_whatsapp || null,
      });
      if (typeof window !== 'undefined') {
        if (!sessionStorage.getItem(PREF_LANG_KEY) && e.default_language) {
          setLang(e.default_language === 'pt' ? 'pt' : 'en');
        }
        if (!sessionStorage.getItem(PREF_CURRENCY_KEY) && e.default_currency) {
          setCurrency(e.default_currency);
        }
      }
    }
  };

  const carregarMargemProduto = async () => {
    const { data } = await supabase
      .from('margem_revendedor_produto' as any)
      .select('margem_percentual')
      .eq('modelo_id', id)
      .maybeSingle();
    if (data) {
      setMargemProduto(Number((data as any).margem_percentual));
    }
  };

  const carregarModelo = async () => {
    try {
      const { data, error } = await (supabase
        .from('catalogo_modelos')
        .select('*') as any)
        .eq('id', id)
        .maybeSingle();

      if (error) throw error;
      setModelo(data as Modelo | null);
    } catch (error) {
      console.error('Erro ao carregar modelo:', error);
      toast.error('Erro ao carregar detalhes');
    } finally {
      setLoading(false);
    }
  };

  const carregarMidias = async () => {
    try {
      const { data, error } = await supabase
        .from('midias_catalogo')
        .select('id, nome_arquivo, url')
        .eq('modelo_id', id)
        .eq('visivel_catalogo', true);

      if (error) throw error;
      setMidias(data || []);
    } catch (error) {
      console.error('Erro ao carregar mídias:', error);
    }
  };

  const formatPrecoIntl = (basePrice: number) => {
    // Mesma lógica do catálogo público internacional: apenas conversão de câmbio.
    const converted = exchange.convert(basePrice, currency);
    return exchange.format(converted, currency);
  };

  const enviarWhatsApp = () => {
    if (!modelo) return;
    const imagemPrincipal = modelo.imagem_modelo || (imagensDisponiveis.length > 0 ? imagensDisponiveis[0] : null);
    const nome = isInternacional ? (modelo.nome_modelo_en || modelo.nome_modelo) : modelo.nome_modelo;
    let mensagem: string;
    if (isInternacional) {
      const priceStr = exibirPrecos ? formatPrecoIntl(modelo.preco_base) : '';
      mensagem = exibirPrecos ? t.waMsg(nome, priceStr) : t.waMsgNoPrice(nome);
    } else {
      mensagem = exibirPrecos
        ? `Olá! Gostaria de saber mais sobre:\n\n${nome}\nR$ ${modelo.preco_base.toFixed(2)}`
        : `Olá! Gostaria de saber mais sobre:\n\n${nome}`;
    }
    if (imagemPrincipal) mensagem += `\n\n${imagemPrincipal}`;
    const phone = isInternacional
      ? (intlConfig?.contact_whatsapp || '5528999025695').replace(/\D/g, '')
      : '5528999025695';
    window.open(`https://wa.me/${phone}?text=${encodeURIComponent(mensagem)}`, '_blank');
  };

  const videoUrl = modelo?.video_url;

  const imagensDisponiveis = useMemo(() => {
    const urls: string[] = [];
    const seen = new Set<string>();
    const add = (url: string) => {
      if (!seen.has(url)) { seen.add(url); urls.push(url); }
    };
    if (modelo?.imagem_modelo) add(modelo.imagem_modelo);
    midias
      .filter(m => !m.nome_arquivo.match(/\.(mp4|webm|mov|avi)$/i))
      .forEach(m => add(m.url));
    return urls;
  }, [modelo, midias]);

  if (loading) {
    return (
      <div className="min-h-screen bg-zinc-900 flex items-center justify-center">
        <div className="animate-pulse text-zinc-400">{t.loading}</div>
      </div>
    );
  }

  if (!modelo) {
    return (
      <div className="min-h-screen bg-zinc-900 flex items-center justify-center">
        <div className="text-center">
          <p className="text-zinc-400 mb-4">{t.notFound}</p>
          <Button onClick={() => navigate(-1)} className="bg-accent hover:bg-accent/90">
            {t.backToCatalog}
          </Button>
        </div>
      </div>
    );
  }

  const nomeExibido = isInternacional ? (modelo.nome_modelo_en || modelo.nome_modelo) : modelo.nome_modelo;
  const descricaoIntlHtml = isInternacional && modelo.descricao_html_en ? modelo.descricao_html_en : null;

  const descriptionHtml = descricaoIntlHtml || modelo.descricao_html
    || (modelo.apresentacao_venda && /Itens Inclusos|Especificações|Diferenciais|Características|Detalhes|[✔️📌🔪⚡✅]/i.test(modelo.apresentacao_venda)
      ? convertPlainToHtml(modelo.apresentacao_venda)
      : null);

  return (
    <div className="min-h-screen bg-zinc-900 overflow-x-hidden">
      {/* Header minimal */}
      <header className="sticky top-0 z-50 bg-zinc-900/80 backdrop-blur-md border-b border-zinc-800/50">
        <div className="max-w-5xl mx-auto px-4 py-3">
          <button
            onClick={() => navigate(isInternacional ? '/catalogo-internacional' : isRevendedor ? '/catalogo-revendedor' : -1 as any)}
            className="text-zinc-500 hover:text-white transition-colors text-sm flex items-center gap-1.5"
          >
            <ArrowLeft className="h-4 w-4" />
            {isInternacional ? t.back : isRevendedor ? 'Catálogo Revendedor' : 'Catálogo'}
          </button>
        </div>
      </header>

      <div className="max-w-5xl mx-auto px-4 py-8">
        <div className="grid md:grid-cols-2 gap-8 lg:gap-12">
          {/* Mídia */}
          <div className="space-y-3 min-w-0">
            {videoUrl && (
              <div className="rounded-2xl overflow-hidden aspect-[3/4] max-h-[75vh] bg-zinc-950">
                <video src={videoUrl} autoPlay loop muted playsInline className="w-full h-full object-contain" />
              </div>
            )}

            {imagensDisponiveis.length > 0 && (
              <div className="rounded-2xl overflow-hidden aspect-[3/4] max-h-[75vh] bg-zinc-950">
                <img
                  src={imagensDisponiveis[imagemAtual]}
                  alt={modelo.nome_modelo}
                  className="w-full h-full object-contain"
                />
              </div>
            )}

            {imagensDisponiveis.length > 1 && (
              <div className="flex gap-2 py-1 overflow-x-auto justify-center scrollbar-none">
                {imagensDisponiveis.map((img, idx) => (
                  <button
                    key={idx}
                    onClick={() => setImagemAtual(idx)}
                    className={`flex-shrink-0 w-16 h-16 rounded-lg overflow-hidden border-2 transition-all ${
                      idx === imagemAtual
                        ? 'border-accent opacity-100'
                        : 'border-transparent opacity-50 hover:opacity-80'
                    }`}
                  >
                    <img src={img} alt="" className="w-full h-full object-cover" />
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Info */}
          <div className="space-y-5 min-w-0">
            {/* Badges */}
            <div className="flex flex-wrap items-center gap-2">
              {modelo.pronta_entrega && (
                <span className="inline-flex items-center gap-1 text-xs font-medium text-emerald-400">
                  <Zap className="h-3 w-3" />
                  {t.readyDelivery}
                </span>
              )}
              {modelo.categorias?.map((cat: string) => (
                <span key={cat} className="text-xs text-zinc-500">{isInternacional ? trCategoria(cat, lang) : cat}</span>
              ))}
            </div>

            {/* Nome */}
            <h1 className="text-2xl md:text-3xl font-semibold text-white tracking-tight leading-tight break-words">
              {nomeExibido}
            </h1>

            {/* Preço */}
            {isInternacional ? (exibirPrecos && (
              <div className="space-y-1">
                <p className="text-2xl font-semibold text-accent">
                  {formatPrecoIntl(modelo.preco_base)}
                </p>
              </div>
            )) : isRevendedor && modelo ? (() => {
              const margem = margemProduto ?? margemGlobal;
              const precoRevenda = modelo.preco_base * (1 - margem / 100);
              const lucro = modelo.preco_base * (margem / 100);
              return (
                <div className="space-y-2">
                  <div>
                    <p className="text-[10px] text-zinc-500 uppercase tracking-wider">Preço de Venda</p>
                    <p className="text-2xl font-black text-accent">
                      R$ {modelo.preco_base.toFixed(2)}
                    </p>
                  </div>
                  <div>
                    <p className="text-[10px] text-zinc-500 uppercase tracking-wider">Custo Revendedor</p>
                    <p className="text-lg font-bold text-zinc-200">
                      R$ {precoRevenda.toFixed(2)}
                    </p>
                  </div>
                  <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-xl px-4 py-2.5">
                    <p className="text-[10px] text-emerald-400/70 uppercase tracking-wider">Lucro</p>
                    <div className="flex items-center justify-between gap-2">
                      <p className="text-lg font-black text-emerald-400">
                        R$ {lucro.toFixed(2)}
                      </p>
                      <Badge className="bg-emerald-500/20 text-emerald-400 border-emerald-500/30 text-xs font-bold">
                        {margem.toFixed(0)}%
                      </Badge>
                    </div>
                  </div>
                </div>
              );
            })() : exibirPrecos && (
              <div className="space-y-1">
                <p className="text-2xl font-semibold text-white">
                  R$ {modelo.preco_base.toFixed(2)}
                </p>
                {exibirFormasPagamento && (
                  <p className="text-sm text-zinc-500">
                    {textoParcelamento} · <span className="text-accent">R$ {(modelo.preco_base * (1 - descontoPix / 100)).toFixed(2)} {textoPix}</span>
                  </p>
                )}
              </div>
            )}

            {/* WhatsApp */}
            {(!isRevendedor || isInternacional) && (
              <Button
                size="lg"
                className="w-full bg-accent hover:bg-accent/90 text-white rounded-xl h-12"
                onClick={enviarWhatsApp}
              >
                <MessageCircle className="h-5 w-5 mr-2" />
                {t.askWhatsapp}
              </Button>
            )}

            {/* Garantia destaque */}
            {modelo.garantia && /vital[ií]cia/i.test(modelo.garantia) ? (
              <div className="flex items-center gap-2.5 bg-emerald-500/10 border border-emerald-500/20 rounded-xl px-4 py-2.5">
                <span className="text-emerald-400 text-base">🛡️</span>
                <div>
                  <p className="text-emerald-400 text-xs font-semibold tracking-wide uppercase">{t.lifetimeWarranty}</p>
                  <p className="text-zinc-500 text-[11px]">{t.lifetimeSub}</p>
                </div>
              </div>
            ) : modelo.garantia ? (
              <div className="flex gap-4 text-xs text-zinc-500 pt-1">
                <span>{t.warranty} {modelo.garantia}</span>
              </div>
            ) : null}

            {/* Prazo entrega */}
            {modelo.prazo_entrega && (
              <p className="text-xs text-zinc-500">{t.delivery} {modelo.prazo_entrega}</p>
            )}

            {/* Separador */}
            <div className="border-t border-zinc-800/60" />

            {/* Descrição */}
            {descriptionHtml ? (
              <div>
                <div
                  className="shopify-description max-w-none text-zinc-400 text-[14px] leading-7 break-words"
                  dangerouslySetInnerHTML={{ __html: descriptionHtml }}
                />
              </div>
            ) : modelo.apresentacao_venda ? (
              <p className="text-zinc-400 text-sm leading-relaxed whitespace-pre-line break-words">
                {modelo.apresentacao_venda}
              </p>
            ) : null}
          </div>
        </div>
      </div>
    </div>
  );
}
