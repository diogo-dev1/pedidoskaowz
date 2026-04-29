import { useState, useEffect, useMemo } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Checkbox } from '@/components/ui/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { toast } from 'sonner';
import { Globe, Languages, DollarSign, TrendingUp, Save, Loader2, Percent, RefreshCw, Copy, Share2 } from 'lucide-react';
import { useExchangeRate, type ExchangeMode } from '@/hooks/useExchangeRate';

const ALL_CURRENCIES = ['USD', 'BRL', 'EUR', 'AED'] as const;
const ALL_LANGUAGES = [
  { code: 'pt', label: 'Português' },
  { code: 'en', label: 'English' },
] as const;

interface ModeloRow {
  id: string;
  nome_modelo: string;
  nome_modelo_en: string | null;
  preco_base: number;
}

interface PubIntlConfig {
  default_language: string;
  available_languages: string[];
  show_language_selector: boolean;
  default_currency: string;
  base_currency: string;
  available_currencies: string[];
  show_currency_selector: boolean;
  exchange_mode: ExchangeMode;
  manual_rates: Record<string, number>;
  manual_rates_updated_at: string | null;
  margin_global: number;
}

const DEFAULT: PubIntlConfig = {
  default_language: 'en',
  available_languages: ['en', 'pt'],
  show_language_selector: true,
  default_currency: 'USD',
  base_currency: 'BRL',
  available_currencies: ['USD', 'BRL'],
  show_currency_selector: true,
  exchange_mode: 'auto',
  manual_rates: {},
  manual_rates_updated_at: null,
  margin_global: 0,
};

export default function ConfiguracoesCatalogoPublicoInternacional() {
  const [cfg, setCfg] = useState<PubIntlConfig>(DEFAULT);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [manualDraft, setManualDraft] = useState<Record<string, string>>({});

  const [modelos, setModelos] = useState<ModeloRow[]>([]);
  const [margens, setMargens] = useState<Record<string, string>>({});
  const [busca, setBusca] = useState('');

  useEffect(() => { fetchAll(); }, []);

  const safeParse = <T,>(raw: string | undefined, fallback: T): T => {
    if (!raw) return fallback;
    try { return JSON.parse(raw) as T; }
    catch {
      // Fallback: comma-separated string like "en,pt" or single value "en"
      if (Array.isArray(fallback)) {
        return raw.split(',').map(s => s.trim()).filter(Boolean) as unknown as T;
      }
      return fallback;
    }
  };

  const fetchAll = async () => {
    setLoading(true);
    try {
      const { data: kv } = await (supabase as any).from('config_publico_internacional').select('chave, valor');
      const map: Record<string, string> = {};
      (kv || []).forEach((r: any) => { map[r.chave] = r.valor; });
      const next: PubIntlConfig = {
        default_language: map.default_language || DEFAULT.default_language,
        available_languages: safeParse(map.available_languages, DEFAULT.available_languages),
        show_language_selector: (map.show_language_selector ?? 'true') === 'true',
        default_currency: map.default_currency || DEFAULT.default_currency,
        base_currency: map.base_currency || DEFAULT.base_currency,
        available_currencies: safeParse(map.available_currencies, DEFAULT.available_currencies),
        show_currency_selector: (map.show_currency_selector ?? 'true') === 'true',
        exchange_mode: (map.exchange_mode as ExchangeMode) || 'auto',
        manual_rates: safeParse(map.manual_rates, {} as Record<string, number>),
        manual_rates_updated_at: map.manual_rates_updated_at || null,
        margin_global: map.margin_global ? Number(map.margin_global) : 0,
      };
    setCfg(next);
    const draft: Record<string, string> = {};
    for (const c of next.available_currencies) {
      if (c === next.base_currency) continue;
      const v = next.manual_rates[c];
      draft[c] = v != null ? String(v) : '';
    }
    setManualDraft(draft);

    const [{ data: mds }, { data: mgs }] = await Promise.all([
      supabase.from('catalogo_modelos').select('id, nome_modelo, nome_modelo_en, preco_base').eq('visivel_catalogo', true).order('nome_modelo'),
      (supabase as any).from('margem_publico_internacional').select('modelo_id, margem_percentual'),
    ]);
    setModelos((mds || []) as ModeloRow[]);
    const mm: Record<string, string> = {};
    (mgs || []).forEach((r: any) => { mm[r.modelo_id] = String(r.margem_percentual); });
      setMargens(mm);
    } catch (e) {
      console.error('fetchAll error:', e);
    } finally {
      setLoading(false);
    }
  };

  const update = <K extends keyof PubIntlConfig>(k: K, v: PubIntlConfig[K]) => setCfg((p) => ({ ...p, [k]: v }));
  const toggleArr = (arr: string[], item: string) => arr.includes(item) ? arr.filter(i => i !== item) : [...arr, item];

  const upsertKV = async (chave: string, valor: string) => {
    const { data: ex } = await (supabase as any).from('config_publico_internacional').select('id').eq('chave', chave).maybeSingle();
    if (ex) await (supabase as any).from('config_publico_internacional').update({ valor }).eq('chave', chave);
    else await (supabase as any).from('config_publico_internacional').insert({ chave, valor });
  };

  const salvar = async () => {
    setSaving(true);
    try {
      const manual_rates: Record<string, number> = {};
      for (const c of cfg.available_currencies) {
        if (c === cfg.base_currency) continue;
        const raw = manualDraft[c];
        const num = raw ? parseFloat(raw.replace(',', '.')) : NaN;
        if (!isNaN(num) && num > 0) manual_rates[c] = num;
      }
      const manualChanged = JSON.stringify(cfg.manual_rates || {}) !== JSON.stringify(manual_rates);
      const manual_rates_updated_at = cfg.exchange_mode === 'manual' && manualChanged
        ? new Date().toISOString() : cfg.manual_rates_updated_at;

      await Promise.all([
        upsertKV('default_language', cfg.default_language),
        upsertKV('available_languages', JSON.stringify(cfg.available_languages)),
        upsertKV('show_language_selector', String(cfg.show_language_selector)),
        upsertKV('default_currency', cfg.default_currency),
        upsertKV('base_currency', cfg.base_currency),
        upsertKV('available_currencies', JSON.stringify(cfg.available_currencies)),
        upsertKV('show_currency_selector', String(cfg.show_currency_selector)),
        upsertKV('exchange_mode', cfg.exchange_mode),
        upsertKV('manual_rates', JSON.stringify(manual_rates)),
        upsertKV('manual_rates_updated_at', manual_rates_updated_at || ''),
        upsertKV('margin_global', String(Number(cfg.margin_global) || 0)),
      ]);
      toast.success('Configurações salvas');
      await fetchAll();
    } catch (e: any) {
      toast.error('Erro: ' + e.message);
    } finally { setSaving(false); }
  };

  const exchange = useExchangeRate({
    mode: cfg.exchange_mode,
    baseCurrency: cfg.base_currency,
    manualRates: cfg.manual_rates,
    manualRatesUpdatedAt: cfg.manual_rates_updated_at,
  });

  const salvarMargemProduto = async (modeloId: string, valor: string) => {
    const num = parseFloat(valor);
    if (isNaN(num) || num <= 0) {
      await (supabase as any).from('margem_publico_internacional').delete().eq('modelo_id', modeloId);
      setMargens(prev => { const n = { ...prev }; delete n[modeloId]; return n; });
      toast.success('Margem removida');
      return;
    }
    const { data: ex } = await (supabase as any).from('margem_publico_internacional').select('id').eq('modelo_id', modeloId).maybeSingle();
    if (ex) await (supabase as any).from('margem_publico_internacional').update({ margem_percentual: num }).eq('modelo_id', modeloId);
    else await (supabase as any).from('margem_publico_internacional').insert({ modelo_id: modeloId, margem_percentual: num });
    setMargens(prev => ({ ...prev, [modeloId]: valor }));
    toast.success('Margem salva');
  };

  const filtrados = useMemo(() => {
    const q = busca.trim().toLowerCase();
    if (!q) return modelos;
    return modelos.filter(m => m.nome_modelo.toLowerCase().includes(q) || (m.nome_modelo_en || '').toLowerCase().includes(q));
  }, [modelos, busca]);

  const copiarLink = () => {
    navigator.clipboard.writeText(`${window.location.origin}/catalogo-publico-internacional`);
    toast.success('Link copiado!');
  };

  if (loading) return <div className="flex justify-center py-10"><Loader2 className="h-6 w-6 animate-spin" /></div>;

  return (
    <div className="space-y-4 px-1">
      <div className="min-w-0 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
        <div>
          <h1 className="text-lg sm:text-2xl font-bold flex items-center gap-2"><Globe className="h-5 w-5" /> Catálogo Público Internacional</h1>
          <p className="text-muted-foreground text-xs sm:text-sm">Idioma, moeda, câmbio e margem oculta. Categorias/Destaques/Banners são gerenciados no Catálogo Público.</p>
        </div>
        <Button variant="outline" size="sm" onClick={copiarLink} className="gap-2"><Share2 className="h-4 w-4" /> Copiar link público</Button>
      </div>

      <Tabs defaultValue="idioma-moeda" className="w-full">
        <TabsList className="grid grid-cols-2 w-full h-auto gap-1">
          <TabsTrigger value="idioma-moeda" className="gap-1 text-xs sm:text-sm px-2 py-1.5"><Languages className="h-3.5 w-3.5" />Idioma & Câmbio</TabsTrigger>
          <TabsTrigger value="margens" className="gap-1 text-xs sm:text-sm px-2 py-1.5"><TrendingUp className="h-3.5 w-3.5" />Margens</TabsTrigger>
        </TabsList>

        <TabsContent value="idioma-moeda" className="space-y-4 mt-4">
          <Card>
            <CardHeader className="pb-3"><CardTitle className="text-base flex items-center gap-2"><Languages className="h-4 w-4" /> Idioma</CardTitle></CardHeader>
            <CardContent className="space-y-3">
              <div className="flex items-center justify-between">
                <Label className="text-sm">Mostrar seletor de idioma</Label>
                <Switch checked={cfg.show_language_selector} onCheckedChange={(v) => update('show_language_selector', v)} />
              </div>
              <div className="space-y-1">
                <Label className="text-sm">Idioma padrão</Label>
                <Select value={cfg.default_language} onValueChange={(v) => update('default_language', v)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{ALL_LANGUAGES.map(l => <SelectItem key={l.code} value={l.code}>{l.label}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label className="text-sm">Idiomas disponíveis</Label>
                <div className="flex flex-wrap gap-3">
                  {ALL_LANGUAGES.map(l => (
                    <label key={l.code} className="flex items-center gap-2 text-sm">
                      <Checkbox checked={cfg.available_languages.includes(l.code)} onCheckedChange={() => update('available_languages', toggleArr(cfg.available_languages, l.code))} />
                      {l.label}
                    </label>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3"><CardTitle className="text-base flex items-center gap-2"><DollarSign className="h-4 w-4" /> Moeda</CardTitle></CardHeader>
            <CardContent className="space-y-3">
              <div className="flex items-center justify-between">
                <Label className="text-sm">Mostrar seletor de moeda</Label>
                <Switch checked={cfg.show_currency_selector} onCheckedChange={(v) => update('show_currency_selector', v)} />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label className="text-sm">Moeda base (preços)</Label>
                  <Input value="BRL" disabled className="bg-muted" />
                  <p className="text-[11px] text-muted-foreground">Os preços cadastrados estão em reais (BRL). Configure as taxas manuais para converter para outras moedas.</p>
                </div>
                <div className="space-y-1">
                  <Label className="text-sm">Moeda padrão (exibida)</Label>
                  <Select value={cfg.default_currency} onValueChange={(v) => update('default_currency', v)}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>{ALL_CURRENCIES.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
              </div>
              <div className="space-y-2">
                <Label className="text-sm">Moedas disponíveis</Label>
                <div className="flex flex-wrap gap-3">
                  {ALL_CURRENCIES.map(c => (
                    <label key={c} className="flex items-center gap-2 text-sm">
                      <Checkbox checked={cfg.available_currencies.includes(c)} onCheckedChange={() => update('available_currencies', toggleArr(cfg.available_currencies, c))} />
                      {c}
                    </label>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3"><CardTitle className="text-base flex items-center gap-2"><RefreshCw className="h-4 w-4" /> Câmbio</CardTitle></CardHeader>
            <CardContent className="space-y-3">
              <div className="space-y-1">
                <Label className="text-sm">Modo de câmbio</Label>
                <Select value={cfg.exchange_mode} onValueChange={(v) => update('exchange_mode', v as ExchangeMode)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="auto">Automático (cotação real)</SelectItem>
                    <SelectItem value="manual">Manual (taxas fixas)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              {cfg.exchange_mode === 'manual' && (
                <div className="space-y-2">
                  <Label className="text-sm">Taxas manuais (1 {cfg.base_currency} = X)</Label>
                  {cfg.available_currencies.filter(c => c !== cfg.base_currency).map(c => (
                    <div key={c} className="flex items-center gap-2">
                      <span className="text-sm w-12">{c}</span>
                      <Input value={manualDraft[c] ?? ''} onChange={(e) => setManualDraft(prev => ({ ...prev, [c]: e.target.value }))} placeholder="0.00" />
                    </div>
                  ))}
                </div>
              )}
              {cfg.exchange_mode === 'auto' && (
                <div className="text-xs text-muted-foreground">
                  Cotação automática carregada em tempo real.{' '}
                  {cfg.available_currencies.filter(c => c !== cfg.base_currency).map(c => (
                    <span key={c} className="mr-2">1 {cfg.base_currency} = {exchange.convert(1, c).toFixed(4)} {c}</span>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3"><CardTitle className="text-base flex items-center gap-2"><Percent className="h-4 w-4" /> Margem global oculta</CardTitle><CardDescription className="text-xs">Aplicada silenciosamente sobre o preço final exibido (não visível ao público).</CardDescription></CardHeader>
            <CardContent className="space-y-3">
              <div className="flex items-center gap-2">
                <Input type="number" value={cfg.margin_global} onChange={(e) => update('margin_global', Number(e.target.value))} className="max-w-32" />
                <span className="text-sm text-muted-foreground">%</span>
              </div>
            </CardContent>
          </Card>

          <div className="flex justify-end">
            <Button onClick={salvar} disabled={saving} className="gap-2">
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
              Salvar configurações
            </Button>
          </div>
        </TabsContent>

        <TabsContent value="margens" className="space-y-4 mt-4">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2"><Percent className="h-4 w-4" /> Margens individuais por produto</CardTitle>
              <CardDescription className="text-xs">Aplicadas em conjunto com a margem global. Ocultas do público.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <Input placeholder="Buscar produto..." value={busca} onChange={(e) => setBusca(e.target.value)} />
              <div className="space-y-2 max-h-[500px] overflow-y-auto">
                {filtrados.map(m => (
                  <div key={m.id} className="flex items-center gap-2 border rounded p-2">
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-medium truncate">{m.nome_modelo}</div>
                      {m.nome_modelo_en && <div className="text-xs text-muted-foreground truncate">{m.nome_modelo_en}</div>}
                    </div>
                    <Input
                      type="number"
                      placeholder="0"
                      className="w-24"
                      value={margens[m.id] ?? ''}
                      onChange={(e) => setMargens(prev => ({ ...prev, [m.id]: e.target.value }))}
                      onBlur={(e) => salvarMargemProduto(m.id, e.target.value)}
                    />
                    <span className="text-xs text-muted-foreground">%</span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
