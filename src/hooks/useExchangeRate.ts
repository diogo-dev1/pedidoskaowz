import { useCallback, useEffect, useState } from 'react';

export type ExchangeMode = 'auto' | 'manual';

export interface UseExchangeRateOptions {
  /** Modo de cotação: 'auto' busca da API, 'manual' usa as taxas fornecidas */
  mode: ExchangeMode;
  /** Moeda base — todos os preços do banco estão nesta moeda. Default: BRL */
  baseCurrency?: string;
  /**
   * Cotações manuais quando mode='manual'.
   * Formato: chave = código da moeda, valor = quanto 1 unidade da BASE vale na moeda.
   * Ex: { USD: 0.20, EUR: 0.18 } significa 1 BRL = 0.20 USD.
   * Aceitamos também o formato inverso comum em painéis ({ USD: 4.97 }).
   * Detectamos automaticamente: se valor > 1 para USD/EUR, assumimos "1 USD = X BRL".
   */
  manualRates?: Record<string, number>;
  /** Data ISO da última atualização manual (vem do Supabase) */
  manualRatesUpdatedAt?: string | null;
}

export interface UseExchangeRateResult {
  /** Converte um valor da moeda base para a moeda destino */
  convert: (amount: number, targetCurrency: string) => number;
  /** Formata o valor convertido no padrão internacional da moeda */
  format: (amount: number, targetCurrency: string) => string;
  /** Conveniência: converte e formata em uma única chamada */
  convertAndFormat: (amount: number, targetCurrency: string) => string;
  /** Fonte da cotação atualmente em uso */
  source: ExchangeMode;
  /** Data ISO da última atualização da cotação em uso */
  lastUpdatedAt: string | null;
  /** Taxa atual: 1 unidade da base = N unidades da moeda destino */
  getRate: (targetCurrency: string) => number;
  /** Indica se ainda está carregando taxas (apenas no modo auto) */
  loading: boolean;
  /** Erro na busca de taxas */
  error: string | null;
  /** Força nova busca da API e limpa o cache (apenas no modo auto) */
  refresh: () => Promise<void>;
}

const CACHE_KEY = 'exchange_rates_cache_v1';
const CACHE_TTL_MS = 24 * 60 * 60 * 1000; // 24h

interface CachedRates {
  rates: Record<string, number>; // 1 BASE = N MOEDA
  base: string;
  fetchedAt: string; // ISO
}

function readCache(base: string): CachedRates | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = localStorage.getItem(CACHE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as CachedRates;
    if (parsed.base !== base) return null;
    const age = Date.now() - new Date(parsed.fetchedAt).getTime();
    if (age > CACHE_TTL_MS) return null;
    return parsed;
  } catch {
    return null;
  }
}

function writeCache(data: CachedRates) {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(CACHE_KEY, JSON.stringify(data));
  } catch {
    /* noop */
  }
}

async function fetchFromApi(base: string): Promise<CachedRates> {
  // Sempre buscamos a partir de USD (mais confiável em planos free) e
  // derivamos as taxas para a moeda base solicitada.
  const url = `https://open.er-api.com/v6/latest/USD`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Falha na API de cotação: ${res.status}`);
  const json = await res.json();
  if (json.result !== 'success' || !json.rates) {
    throw new Error('Resposta inválida da API de cotação');
  }
  const usdRates = json.rates as Record<string, number>; // 1 USD = N MOEDA
  const baseInUsd = usdRates[base.toUpperCase()];
  if (!baseInUsd || !isFinite(baseInUsd) || baseInUsd <= 0) {
    throw new Error(`Moeda base não suportada pela API: ${base}`);
  }
  // Converte para "1 BASE = N MOEDA"
  const rates: Record<string, number> = {};
  for (const [code, perUsd] of Object.entries(usdRates)) {
    rates[code] = perUsd / baseInUsd;
  }
  rates[base.toUpperCase()] = 1;
  return {
    rates,
    base: base.toUpperCase(),
    fetchedAt: new Date().toISOString(),
  };
}

/**
 * Normaliza taxas manuais. Se o admin digitou "USD = 4.97" (1 USD = 4.97 BRL),
 * convertemos para o formato interno (1 BRL = 0.2012 USD).
 */
function normalizeManualRates(
  raw: Record<string, number>,
  baseCurrency: string,
): Record<string, number> {
  const out: Record<string, number> = { [baseCurrency]: 1 };
  for (const [code, value] of Object.entries(raw)) {
    if (!value || !isFinite(value) || value <= 0) continue;
    if (code === baseCurrency) {
      out[code] = 1;
      continue;
    }
    // Heurística: para BRL como base, valores > 1 normalmente significam
    // "1 MOEDA = X BRL" (ex: 1 USD = 4.97 BRL), então invertemos.
    out[code] = value > 1 ? 1 / value : value;
  }
  return out;
}

export function useExchangeRate(options: UseExchangeRateOptions): UseExchangeRateResult {
  const {
    mode,
    baseCurrency = 'BRL',
    manualRates = {},
    manualRatesUpdatedAt = null,
  } = options;

  const [autoData, setAutoData] = useState<CachedRates | null>(() =>
    mode === 'auto' ? readCache(baseCurrency) : null,
  );
  const [loading, setLoading] = useState<boolean>(mode === 'auto' && !autoData);
  const [error, setError] = useState<string | null>(null);

  const loadAuto = useCallback(
    async (force = false) => {
      if (mode !== 'auto') return;
      if (!force) {
        const cached = readCache(baseCurrency);
        if (cached) {
          setAutoData(cached);
          setLoading(false);
          return;
        }
      }
      setLoading(true);
      setError(null);
      try {
        const fresh = await fetchFromApi(baseCurrency);
        writeCache(fresh);
        setAutoData(fresh);
      } catch (e: any) {
        setError(e?.message || 'Erro ao buscar cotação');
      } finally {
        setLoading(false);
      }
    },
    [mode, baseCurrency],
  );

  useEffect(() => {
    if (mode === 'auto') {
      loadAuto(false);
    } else {
      setAutoData(null);
      setLoading(false);
      setError(null);
    }
  }, [mode, baseCurrency, loadAuto]);

  const refresh = useCallback(async () => {
    if (typeof window !== 'undefined') {
      try {
        localStorage.removeItem(CACHE_KEY);
      } catch {
        /* noop */
      }
    }
    await loadAuto(true);
  }, [loadAuto]);

  const normalizedManual = normalizeManualRates(manualRates, baseCurrency);

  const getRate = useCallback(
    (target: string): number => {
      const code = target.toUpperCase();
      if (code === baseCurrency.toUpperCase()) return 1;
      if (mode === 'manual') {
        return normalizedManual[code] ?? 0;
      }
      return autoData?.rates?.[code] ?? 0;
    },
    [autoData, mode, normalizedManual, baseCurrency],
  );

  const convert = useCallback(
    (amount: number, target: string): number => {
      const rate = getRate(target);
      if (!rate) return 0;
      return amount * rate;
    },
    [getRate],
  );

  const format = useCallback((amount: number, target: string): string => {
    const code = target.toUpperCase();
    try {
      const locale =
        code === 'BRL' ? 'pt-BR' : code === 'EUR' ? 'de-DE' : code === 'AED' ? 'ar-AE' : 'en-US';
      return new Intl.NumberFormat(locale, {
        style: 'currency',
        currency: code,
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      }).format(amount);
    } catch {
      return `${code} ${amount.toFixed(2)}`;
    }
  }, []);

  const convertAndFormat = useCallback(
    (amount: number, target: string) => format(convert(amount, target), target),
    [convert, format],
  );

  const lastUpdatedAt =
    mode === 'auto' ? autoData?.fetchedAt ?? null : manualRatesUpdatedAt;

  return {
    convert,
    format,
    convertAndFormat,
    source: mode,
    lastUpdatedAt,
    getRate,
    loading,
    error,
    refresh,
  };
}
