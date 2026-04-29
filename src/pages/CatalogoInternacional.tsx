import { useEffect, useMemo, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Search, Mail, MessageCircle, Globe } from 'lucide-react';
import { useExchangeRate, type ExchangeMode } from '@/hooks/useExchangeRate';

interface Produto {
  id: string;
  nome_modelo: string;
  nome_modelo_en: string | null;
  descricao_html: string | null;
  descricao_html_en: string | null;
  apresentacao_venda: string | null;
  imagem_modelo: string | null;
  preco_base: number;
  categorias: string[] | null;
}

interface Config {
  id: string;
  show_prices: boolean;
  show_stock: boolean;
  base_currency: string;
  default_currency: string;
  margin_percent: number;
  show_currency_selector: boolean;
  available_currencies: string[];
  default_language: string;
  show_language_selector: boolean;
  available_languages: string[];
  exchange_mode: ExchangeMode;
  manual_rates: Record<string, number>;
  manual_rates_updated_at: string | null;
  show_logo: boolean;
  show_banner: boolean;
  banner_content: string | null;
  contact_email: string | null;
  contact_whatsapp: string | null;
  visible_product_ids: string[];
}

const T = {
  pt: {
    search: 'Buscar produto...',
    products: 'Produtos',
    noResults: 'Nenhum produto encontrado.',
    contact: 'Contato',
    rateAuto: 'Cotação atualizada diariamente · Última atualização',
    rateManual: 'Cotação definida manualmente · Última atualização',
    missingTranslation: 'Tradução pendente',
  },
  en: {
    search: 'Search product...',
    products: 'Products',
    noResults: 'No products found.',
    contact: 'Contact',
    rateAuto: 'Exchange rate updated daily · Last rate',
    rateManual: 'Exchange rate set manually · Last update',
    missingTranslation: 'Translation pending',
  },
};

const CURRENCY_SYMBOLS: Record<string, string> = {
  USD: '$',
  BRL: 'R$',
  EUR: '€',
  AED: 'د.إ',
};

const LANG_FLAGS: Record<string, string> = {
  pt: '🇧🇷',
  en: '🇺🇸',
};

export default function CatalogoInternacional() {
  const [config, setConfig] = useState<Config | null>(null);
  const [produtos, setProdutos] = useState<Produto[]>([]);
  const [loading, setLoading] = useState(true);
  const [busca, setBusca] = useState('');
  const [language, setLanguage] = useState<string>('en');
  const [currency, setCurrency] = useState<string>('USD');

  useEffect(() => {
    void carregar();
  }, []);

  async function carregar() {
    setLoading(true);
    try {
      const { data: cfg } = await supabase
        .from('international_catalog_config')
        .select('*')
        .order('updated_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      const cfgRow = cfg as unknown as Config | null;

      let query = supabase
        .from('catalogo_modelos')
        .select(
          'id, nome_modelo, nome_modelo_en, descricao_html, descricao_html_en, apresentacao_venda, imagem_modelo, preco_base, categorias',
        )
        .order('nome_modelo', { ascending: true });

      if (cfgRow && cfgRow.visible_product_ids && cfgRow.visible_product_ids.length > 0) {
        query = query.in('id', cfgRow.visible_product_ids);
      }
      const { data: prods } = await query;

      if (cfgRow) {
        setConfig(cfgRow);
        setLanguage(cfgRow.default_language || 'en');
        setCurrency(cfgRow.default_currency || 'USD');
      }
      setProdutos((prods as Produto[]) || []);
    } finally {
      setLoading(false);
    }
  }

  const exchange = useExchangeRate({
    mode: config?.exchange_mode || 'auto',
    baseCurrency: config?.base_currency || 'BRL',
    manualRates: config?.manual_rates || {},
    manualRatesUpdatedAt: config?.manual_rates_updated_at || null,
  });

  const t = T[(language as 'pt' | 'en')] || T.en;

  const produtosFiltrados = useMemo(() => {
    const q = busca.trim().toLowerCase();
    if (!q) return produtos;
    return produtos.filter((p) => {
      const name = (language === 'en' ? p.nome_modelo_en : p.nome_modelo) || p.nome_modelo;
      return name.toLowerCase().includes(q);
    });
  }, [produtos, busca, language]);

  function formatPrice(precoBase: number) {
    if (!config?.show_prices) return null;
    const margin = 1 + (Number(config.margin_percent) || 0) / 100;
    const converted = exchange.convert(precoBase, currency) * margin;
    return exchange.format(converted, currency);
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-zinc-950 text-zinc-100 flex items-center justify-center">
        <div className="animate-pulse text-zinc-400">Loading...</div>
      </div>
    );
  }

  if (!config) {
    return (
      <div className="min-h-screen bg-zinc-950 text-zinc-100 flex items-center justify-center">
        Configuration not available.
      </div>
    );
  }

  const lastUpdatedLabel = exchange.lastUpdatedAt
    ? new Date(exchange.lastUpdatedAt).toLocaleString(language === 'en' ? 'en-US' : 'pt-BR')
    : '—';

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100 overflow-x-hidden">
      {/* Header */}
      <header className="sticky top-0 z-40 bg-zinc-950/95 backdrop-blur border-b border-zinc-800">
        <div className="max-w-6xl mx-auto px-3 sm:px-4 py-3 flex items-center gap-3 flex-wrap">
          {config.show_logo && (
            <div className="font-bold text-lg tracking-tight">Kaowz</div>
          )}
          <div className="flex-1" />

          {config.show_language_selector && config.available_languages.length > 0 && (
            <div className="flex items-center gap-1 bg-zinc-900 rounded-md p-0.5">
              {config.available_languages.map((l) => (
                <button
                  key={l}
                  onClick={() => setLanguage(l)}
                  className={`px-2 py-1 text-xs rounded transition ${
                    language === l ? 'bg-zinc-700 text-white' : 'text-zinc-400 hover:text-white'
                  }`}
                  aria-label={l}
                >
                  <span className="mr-1">{LANG_FLAGS[l] || '🌐'}</span>
                  {l.toUpperCase()}
                </button>
              ))}
            </div>
          )}

          {config.show_currency_selector && config.available_currencies.length > 0 && (
            <div className="flex items-center gap-1 bg-zinc-900 rounded-md p-0.5">
              {config.available_currencies.map((c) => (
                <button
                  key={c}
                  onClick={() => setCurrency(c)}
                  className={`px-2 py-1 text-xs font-mono rounded transition ${
                    currency === c ? 'bg-zinc-700 text-white' : 'text-zinc-400 hover:text-white'
                  }`}
                >
                  <span className="mr-1">{CURRENCY_SYMBOLS[c] || ''}</span>
                  {c}
                </button>
              ))}
            </div>
          )}
        </div>
      </header>

      {/* Banner */}
      {config.show_banner && config.banner_content && (
        <section className="bg-gradient-to-b from-zinc-900 to-zinc-950 border-b border-zinc-800">
          <div className="max-w-6xl mx-auto px-3 sm:px-4 py-10 sm:py-16 text-center">
            <p className="text-lg sm:text-2xl font-light tracking-wide whitespace-pre-line">
              {config.banner_content}
            </p>
          </div>
        </section>
      )}

      {/* Search */}
      <div className="max-w-6xl mx-auto px-3 sm:px-4 py-4">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-500" />
          <Input
            value={busca}
            onChange={(e) => setBusca(e.target.value)}
            placeholder={t.search}
            className="pl-9 bg-zinc-900 border-zinc-800 text-zinc-100 placeholder:text-zinc-500"
          />
        </div>
      </div>

      {/* Products */}
      <main className="max-w-6xl mx-auto px-3 sm:px-4 pb-12">
        {produtosFiltrados.length === 0 ? (
          <div className="text-center py-20 text-zinc-500">{t.noResults}</div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-1.5 sm:gap-3">
            {produtosFiltrados.map((p) => {
              const showEn = language === 'en';
              const name = showEn ? p.nome_modelo_en || p.nome_modelo : p.nome_modelo;
              const missingEn = showEn && !p.nome_modelo_en;
              const description = showEn
                ? p.descricao_html_en || p.descricao_html || p.apresentacao_venda
                : p.descricao_html || p.apresentacao_venda;
              const price = formatPrice(Number(p.preco_base) || 0);
              return (
                <article
                  key={p.id}
                  className="group bg-zinc-900 border border-zinc-800 rounded-lg overflow-hidden flex flex-col hover:border-zinc-700 transition"
                >
                  <div className="aspect-[9/16] bg-zinc-800 overflow-hidden">
                    {p.imagem_modelo ? (
                      <img
                        src={p.imagem_modelo}
                        alt={name}
                        loading="lazy"
                        className="w-full h-full object-cover group-hover:scale-105 transition duration-500"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-zinc-600">
                        <Globe className="h-8 w-8" />
                      </div>
                    )}
                  </div>
                  <div className="p-2 sm:p-3 flex-1 flex flex-col gap-1">
                    <div className="flex items-start gap-1">
                      <h3 className="text-sm font-medium leading-tight flex-1 line-clamp-2">
                        {name}
                      </h3>
                      {missingEn && (
                        <span
                          title={t.missingTranslation}
                          className="text-[10px] text-yellow-500 flex-shrink-0"
                        >
                          ⚠
                        </span>
                      )}
                    </div>
                    {price && (
                      <div className="text-base font-bold text-white mt-auto pt-1">
                        {price}
                      </div>
                    )}
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className="border-t border-zinc-800 bg-zinc-950">
        <div className="max-w-6xl mx-auto px-3 sm:px-4 py-6 space-y-3 text-xs text-zinc-500">
          <div className="text-center">
            {config.exchange_mode === 'auto' ? t.rateAuto : t.rateManual}: {lastUpdatedLabel}
          </div>
          {(config.contact_email || config.contact_whatsapp) && (
            <div className="flex items-center justify-center gap-4 flex-wrap">
              {config.contact_email && (
                <a
                  href={`mailto:${config.contact_email}`}
                  className="flex items-center gap-1.5 hover:text-zinc-200 transition"
                >
                  <Mail className="h-3.5 w-3.5" />
                  {config.contact_email}
                </a>
              )}
              {config.contact_whatsapp && (
                <a
                  href={`https://wa.me/${config.contact_whatsapp.replace(/\D/g, '')}`}
                  target="_blank"
                  rel="noreferrer"
                  className="flex items-center gap-1.5 hover:text-zinc-200 transition"
                >
                  <MessageCircle className="h-3.5 w-3.5" />
                  {config.contact_whatsapp}
                </a>
              )}
            </div>
          )}
        </div>
      </footer>
    </div>
  );
}
