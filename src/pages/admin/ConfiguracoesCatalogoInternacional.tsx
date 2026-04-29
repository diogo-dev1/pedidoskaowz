import { useEffect, useMemo, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { toast } from 'sonner';
import {
  Globe,
  Languages,
  DollarSign,
  RefreshCw,
  AlertTriangle,
  CheckCircle2,
  Image as ImageIcon,
  Package,
  Loader2,
  Save,
  Mail,
  Phone,
  Link2,
} from 'lucide-react';
import { useExchangeRate, type ExchangeMode } from '@/hooks/useExchangeRate';

const ALL_CURRENCIES = ['USD', 'BRL', 'EUR', 'AED'] as const;
const ALL_LANGUAGES = [
  { code: 'pt', label: 'Português' },
  { code: 'en', label: 'Inglês' },
] as const;

interface ConfigRow {
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
  updated_at: string;
}

interface ProdutoLinha {
  id: string;
  nome_modelo: string;
  nome_modelo_en: string | null;
  descricao_html_en: string | null;
  imagem_modelo: string | null;
}

export default function ConfiguracoesCatalogoInternacional() {
  const [config, setConfig] = useState<ConfigRow | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [produtos, setProdutos] = useState<ProdutoLinha[]>([]);
  const [busca, setBusca] = useState('');
  const [manualRatesDraft, setManualRatesDraft] = useState<Record<string, string>>({});

  useEffect(() => {
    void carregar();
  }, []);

  async function carregar() {
    setLoading(true);
    try {
      const [{ data: cfg, error: cfgErr }, { data: prods, error: prodsErr }] = await Promise.all([
        supabase
          .from('international_catalog_config')
          .select('*')
          .order('updated_at', { ascending: false })
          .limit(1)
          .maybeSingle(),
        supabase
          .from('catalogo_modelos')
          .select('id, nome_modelo, nome_modelo_en, descricao_html_en, imagem_modelo')
          .order('nome_modelo', { ascending: true }),
      ]);
      if (cfgErr) throw cfgErr;
      if (prodsErr) throw prodsErr;
      if (cfg) {
        const row = cfg as unknown as ConfigRow;
        setConfig(row);
        const draft: Record<string, string> = {};
        for (const c of row.available_currencies || []) {
          if (c === row.base_currency) continue;
          const v = (row.manual_rates || {})[c];
          draft[c] = v != null ? String(v) : '';
        }
        setManualRatesDraft(draft);
      }
      setProdutos((prods as ProdutoLinha[]) || []);
    } catch (e: any) {
      toast.error('Erro ao carregar configuração: ' + e.message);
    } finally {
      setLoading(false);
    }
  }

  function update<K extends keyof ConfigRow>(key: K, value: ConfigRow[K]) {
    setConfig((prev) => (prev ? { ...prev, [key]: value } : prev));
  }

  function toggleArrayItem(arr: string[], item: string): string[] {
    return arr.includes(item) ? arr.filter((i) => i !== item) : [...arr, item];
  }

  async function salvar() {
    if (!config) return;
    setSaving(true);
    try {
      // Reconstrói manual_rates a partir do draft (apenas moedas ativas, exceto a base)
      const manual_rates: Record<string, number> = {};
      for (const code of config.available_currencies) {
        if (code === config.base_currency) continue;
        const raw = manualRatesDraft[code];
        const num = raw ? parseFloat(raw.replace(',', '.')) : NaN;
        if (!isNaN(num) && num > 0) manual_rates[code] = num;
      }

      const previousManual = config.manual_rates || {};
      const manualChanged =
        JSON.stringify(previousManual) !== JSON.stringify(manual_rates);
      const manual_rates_updated_at =
        config.exchange_mode === 'manual' && manualChanged
          ? new Date().toISOString()
          : config.manual_rates_updated_at;

      const payload = {
        show_prices: config.show_prices,
        show_stock: config.show_stock,
        base_currency: config.base_currency,
        default_currency: config.default_currency,
        margin_percent: Number(config.margin_percent) || 0,
        show_currency_selector: config.show_currency_selector,
        available_currencies: config.available_currencies,
        default_language: config.default_language,
        show_language_selector: config.show_language_selector,
        available_languages: config.available_languages,
        exchange_mode: config.exchange_mode,
        manual_rates,
        manual_rates_updated_at,
        show_logo: config.show_logo,
        show_banner: config.show_banner,
        banner_content: config.banner_content,
        contact_email: config.contact_email,
        contact_whatsapp: config.contact_whatsapp,
        visible_product_ids: config.visible_product_ids,
      };

      const { error } = await supabase
        .from('international_catalog_config')
        .update(payload)
        .eq('id', config.id);
      if (error) throw error;
      toast.success('Configuração salva com sucesso');
      await carregar();
    } catch (e: any) {
      toast.error('Erro ao salvar: ' + e.message);
    } finally {
      setSaving(false);
    }
  }

  // Hook de cotação para preview do bloco "Cotação"
  const exchange = useExchangeRate({
    mode: config?.exchange_mode || 'auto',
    baseCurrency: config?.base_currency || 'BRL',
    manualRates: config?.manual_rates || {},
    manualRatesUpdatedAt: config?.manual_rates_updated_at || null,
  });

  const produtosFiltrados = useMemo(() => {
    const q = busca.trim().toLowerCase();
    if (!q) return produtos;
    return produtos.filter(
      (p) =>
        p.nome_modelo.toLowerCase().includes(q) ||
        (p.nome_modelo_en || '').toLowerCase().includes(q),
    );
  }, [produtos, busca]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!config) {
    return (
      <div className="text-center py-10 text-muted-foreground">
        Nenhuma configuração encontrada.
      </div>
    );
  }

  const visibleProductIds = new Set(config.visible_product_ids || []);

  return (
    <div className="space-y-6 max-w-5xl mx-auto pb-24">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Globe className="h-6 w-6" />
            Catálogo Multinacional
          </h1>
          <p className="text-sm text-muted-foreground">
            Configure idioma, moeda, cotação e produtos do catálogo internacional.
          </p>
        </div>
        <Button onClick={salvar} disabled={saving} size="lg">
          {saving ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Save className="h-4 w-4 mr-2" />}
          Salvar
        </Button>
      </div>

      {/* Visibilidade */}
      <Card>
        <CardHeader>
          <CardTitle>Visibilidade</CardTitle>
          <CardDescription>Controle o que será exibido no catálogo.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between gap-4">
            <Label htmlFor="show_prices">Exibir preços no catálogo</Label>
            <Switch
              id="show_prices"
              checked={config.show_prices}
              onCheckedChange={(v) => update('show_prices', v)}
            />
          </div>
          <div className="flex items-center justify-between gap-4">
            <Label htmlFor="show_stock">Exibir estoque no catálogo</Label>
            <Switch
              id="show_stock"
              checked={config.show_stock}
              onCheckedChange={(v) => update('show_stock', v)}
            />
          </div>
        </CardContent>
      </Card>

      {/* Idioma */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Languages className="h-5 w-5" />
            Idioma
          </CardTitle>
          <CardDescription>Idioma padrão e seletor exibido ao cliente.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label>Idioma padrão do catálogo</Label>
            <Select
              value={config.default_language}
              onValueChange={(v) => update('default_language', v)}
            >
              <SelectTrigger className="mt-1">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {ALL_LANGUAGES.map((l) => (
                  <SelectItem key={l.code} value={l.code}>
                    {l.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="flex items-center justify-between gap-4">
            <Label htmlFor="show_lang_sel">Mostrar seletor de idioma para o cliente?</Label>
            <Switch
              id="show_lang_sel"
              checked={config.show_language_selector}
              onCheckedChange={(v) => update('show_language_selector', v)}
            />
          </div>

          {config.show_language_selector && (
            <div className="space-y-2 pl-2 border-l-2 border-muted">
              <Label className="text-sm text-muted-foreground">
                Idiomas disponíveis para o cliente
              </Label>
              <div className="flex flex-wrap gap-3">
                {ALL_LANGUAGES.map((l) => (
                  <label key={l.code} className="flex items-center gap-2 cursor-pointer">
                    <Checkbox
                      checked={config.available_languages.includes(l.code)}
                      onCheckedChange={() =>
                        update(
                          'available_languages',
                          toggleArrayItem(config.available_languages, l.code),
                        )
                      }
                    />
                    <span className="text-sm">{l.label}</span>
                  </label>
                ))}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Moeda */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <DollarSign className="h-5 w-5" />
            Moeda
          </CardTitle>
          <CardDescription>Moeda padrão, seletor e margem aplicada.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <Label>Moeda base (preços cadastrados)</Label>
              <Select
                value={config.base_currency}
                onValueChange={(v) => update('base_currency', v)}
              >
                <SelectTrigger className="mt-1">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {ALL_CURRENCIES.map((c) => (
                    <SelectItem key={c} value={c}>
                      {c}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Moeda padrão exibida</Label>
              <Select
                value={config.default_currency}
                onValueChange={(v) => update('default_currency', v)}
              >
                <SelectTrigger className="mt-1">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {ALL_CURRENCIES.map((c) => (
                    <SelectItem key={c} value={c}>
                      {c}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="flex items-center justify-between gap-4">
            <Label htmlFor="show_curr_sel">Mostrar seletor de moeda para o cliente?</Label>
            <Switch
              id="show_curr_sel"
              checked={config.show_currency_selector}
              onCheckedChange={(v) => update('show_currency_selector', v)}
            />
          </div>

          {config.show_currency_selector && (
            <div className="space-y-2 pl-2 border-l-2 border-muted">
              <Label className="text-sm text-muted-foreground">
                Moedas disponíveis para o cliente
              </Label>
              <div className="flex flex-wrap gap-3">
                {ALL_CURRENCIES.map((c) => (
                  <label key={c} className="flex items-center gap-2 cursor-pointer">
                    <Checkbox
                      checked={config.available_currencies.includes(c)}
                      onCheckedChange={() =>
                        update(
                          'available_currencies',
                          toggleArrayItem(config.available_currencies, c),
                        )
                      }
                    />
                    <span className="text-sm">{c}</span>
                  </label>
                ))}
              </div>
            </div>
          )}

          <div>
            <Label htmlFor="margin">Margem sobre a cotação (%)</Label>
            <Input
              id="margin"
              type="number"
              step="0.1"
              value={config.margin_percent}
              onChange={(e) => update('margin_percent', parseFloat(e.target.value) || 0)}
              className="mt-1"
            />
            <p className="text-xs text-muted-foreground mt-1">
              Use para cobrir variação cambial ou adicionar margem de segurança.
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Cotação */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <RefreshCw className="h-5 w-5" />
            Cotação
          </CardTitle>
          <CardDescription>Como as cotações serão obtidas.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {(['auto', 'manual'] as const).map((mode) => {
              const active = config.exchange_mode === mode;
              return (
                <button
                  key={mode}
                  type="button"
                  onClick={() => update('exchange_mode', mode)}
                  className={`text-left rounded-lg border p-4 transition ${
                    active
                      ? 'border-primary bg-primary/5 ring-2 ring-primary/30'
                      : 'border-border hover:border-primary/50'
                  }`}
                >
                  <div className="font-semibold">
                    {mode === 'auto' ? 'Automático' : 'Manual'}
                  </div>
                  <div className="text-xs text-muted-foreground mt-1">
                    {mode === 'auto'
                      ? 'Busca a cotação do dia automaticamente.'
                      : 'Você define manualmente os valores de cada moeda.'}
                  </div>
                </button>
              );
            })}
          </div>

          {config.exchange_mode === 'auto' && (
            <div className="space-y-3 rounded-md border p-4 bg-muted/30">
              <div className="flex items-center justify-between gap-2">
                <p className="text-sm text-muted-foreground">
                  A cotação é atualizada automaticamente uma vez por dia.
                </p>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => exchange.refresh()}
                  disabled={exchange.loading}
                >
                  {exchange.loading ? (
                    <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" />
                  ) : (
                    <RefreshCw className="h-3.5 w-3.5 mr-1.5" />
                  )}
                  Atualizar agora
                </Button>
              </div>
              <div className="space-y-1 text-sm">
                {config.available_currencies
                  .filter((c) => c !== config.base_currency)
                  .map((c) => {
                    const rate = exchange.getRate(c);
                    return (
                      <div key={c} className="flex justify-between font-mono">
                        <span>
                          1 {config.base_currency} = {rate ? rate.toFixed(4) : '—'} {c}
                        </span>
                      </div>
                    );
                  })}
              </div>
              <p className="text-xs text-muted-foreground">
                Atualizado em:{' '}
                {exchange.lastUpdatedAt
                  ? new Date(exchange.lastUpdatedAt).toLocaleString('pt-BR')
                  : '—'}
              </p>
              {exchange.error && (
                <p className="text-xs text-destructive">{exchange.error}</p>
              )}
            </div>
          )}

          {config.exchange_mode === 'manual' && (
            <div className="space-y-3 rounded-md border p-4 bg-yellow-50 dark:bg-yellow-950/30 border-yellow-300 dark:border-yellow-800">
              <div className="flex items-start gap-2">
                <AlertTriangle className="h-4 w-4 text-yellow-700 dark:text-yellow-400 mt-0.5 flex-shrink-0" />
                <p className="text-sm text-yellow-900 dark:text-yellow-200">
                  Você está usando cotação manual. Os preços não serão atualizados automaticamente.
                </p>
              </div>
              <div className="space-y-2">
                {config.available_currencies
                  .filter((c) => c !== config.base_currency)
                  .map((c) => (
                    <div key={c} className="flex items-center gap-2">
                      <Label className="w-16 font-mono">{c}</Label>
                      <Input
                        type="number"
                        step="0.0001"
                        placeholder={`1 ${c} = X ${config.base_currency}`}
                        value={manualRatesDraft[c] ?? ''}
                        onChange={(e) =>
                          setManualRatesDraft((p) => ({ ...p, [c]: e.target.value }))
                        }
                      />
                    </div>
                  ))}
              </div>
              <p className="text-xs text-yellow-900 dark:text-yellow-200">
                Última atualização manual:{' '}
                {config.manual_rates_updated_at
                  ? new Date(config.manual_rates_updated_at).toLocaleString('pt-BR')
                  : '— ainda não salva'}
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Aparência */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <ImageIcon className="h-5 w-5" />
            Aparência e contato
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between gap-4">
            <Label htmlFor="show_logo">Exibir logo</Label>
            <Switch
              id="show_logo"
              checked={config.show_logo}
              onCheckedChange={(v) => update('show_logo', v)}
            />
          </div>
          <div className="flex items-center justify-between gap-4">
            <Label htmlFor="show_banner">Exibir banner</Label>
            <Switch
              id="show_banner"
              checked={config.show_banner}
              onCheckedChange={(v) => update('show_banner', v)}
            />
          </div>
          <div>
            <Label htmlFor="banner_content">Conteúdo do banner</Label>
            <Textarea
              id="banner_content"
              value={config.banner_content || ''}
              onChange={(e) => update('banner_content', e.target.value)}
              placeholder="Welcome to our international catalog..."
              className="mt-1"
            />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="contact_email" className="flex items-center gap-1">
                <Mail className="h-3.5 w-3.5" />
                E-mail de contato
              </Label>
              <Input
                id="contact_email"
                type="email"
                value={config.contact_email || ''}
                onChange={(e) => update('contact_email', e.target.value)}
                className="mt-1"
              />
            </div>
            <div>
              <Label htmlFor="contact_whatsapp" className="flex items-center gap-1">
                <Phone className="h-3.5 w-3.5" />
                WhatsApp de contato
              </Label>
              <Input
                id="contact_whatsapp"
                value={config.contact_whatsapp || ''}
                onChange={(e) => update('contact_whatsapp', e.target.value)}
                placeholder="+55 11 99999-9999"
                className="mt-1"
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Produtos */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Package className="h-5 w-5" />
            Produtos visíveis no catálogo
          </CardTitle>
          <CardDescription>
            Selecione quais produtos aparecem. Se nenhum for selecionado, todos serão exibidos.
            A coluna "Tradução" mostra se o nome e descrição em inglês estão preenchidos.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex flex-wrap items-center gap-2">
            <Input
              placeholder="Buscar produto..."
              value={busca}
              onChange={(e) => setBusca(e.target.value)}
              className="max-w-xs"
            />
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => update('visible_product_ids', [])}
            >
              Mostrar todos
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() =>
                update(
                  'visible_product_ids',
                  produtosFiltrados.map((p) => p.id),
                )
              }
            >
              Selecionar visíveis
            </Button>
            <Badge variant="secondary">
              {visibleProductIds.size === 0
                ? 'Todos os produtos'
                : `${visibleProductIds.size} selecionados`}
            </Badge>
          </div>

          <div className="border rounded-md divide-y max-h-[420px] overflow-y-auto">
            {produtosFiltrados.map((p) => {
              const checked =
                visibleProductIds.size === 0 ? false : visibleProductIds.has(p.id);
              const traduzido = !!p.nome_modelo_en && !!p.descricao_html_en;
              return (
                <label
                  key={p.id}
                  className="flex items-center gap-3 p-2 hover:bg-muted/40 cursor-pointer"
                >
                  <Checkbox
                    checked={checked}
                    onCheckedChange={() => {
                      const list = new Set(config.visible_product_ids);
                      if (list.has(p.id)) list.delete(p.id);
                      else list.add(p.id);
                      update('visible_product_ids', Array.from(list));
                    }}
                  />
                  {p.imagem_modelo ? (
                    <img
                      src={p.imagem_modelo}
                      alt=""
                      className="h-10 w-10 rounded object-cover bg-muted"
                    />
                  ) : (
                    <div className="h-10 w-10 rounded bg-muted" />
                  )}
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium truncate">{p.nome_modelo}</div>
                    {p.nome_modelo_en && (
                      <div className="text-xs text-muted-foreground truncate">
                        EN: {p.nome_modelo_en}
                      </div>
                    )}
                  </div>
                  <div className="flex-shrink-0" title={traduzido ? 'Traduzido' : 'Tradução incompleta'}>
                    {traduzido ? (
                      <CheckCircle2 className="h-5 w-5 text-green-600" />
                    ) : (
                      <AlertTriangle className="h-5 w-5 text-yellow-500" />
                    )}
                  </div>
                </label>
              );
            })}
            {produtosFiltrados.length === 0 && (
              <div className="p-4 text-center text-sm text-muted-foreground">
                Nenhum produto encontrado.
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Botão flutuante salvar (mobile) */}
      <div className="sticky bottom-4 flex justify-end">
        <Button onClick={salvar} disabled={saving} size="lg" className="shadow-lg">
          {saving ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Save className="h-4 w-4 mr-2" />}
          Salvar configuração
        </Button>
      </div>
    </div>
  );
}
