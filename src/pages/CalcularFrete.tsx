import { useMemo, useState } from 'react';
import { Truck, Loader2, AlertCircle, Package as PackageIcon, Plus, Trash2, Info, ShoppingBag } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import CatalogoShopifyPicker, { type ProdutoShopify } from '@/components/simulador/CatalogoShopifyPicker';
import { useSimuladorConfig } from '@/hooks/useSimuladorConfig';
import { BRL, pesoDoTipo, TIPOS_PESO_BASE, type TipoPeso } from '@/lib/simuladorData';

interface OpcaoFrete {
  handle: string;
  nome: string;
  valor: number;
  moeda: string;
}

interface ItemCotacao {
  id: string;
  titulo: string;
  variantId?: string;
  preco: number;
  quantidade: number;
  imagem?: string | null;
  /** Só para item avulso: de onde vem o peso padrão */
  tipoPeso?: TipoPeso;
}

const maskCep = (v: string) => {
  const d = v.replace(/\D/g, '').slice(0, 8);
  return d.length > 5 ? `${d.slice(0, 5)}-${d.slice(5)}` : d;
};

const novoId = () => Math.random().toString(36).slice(2);


export default function CalcularFrete() {
  const { toast } = useToast();
  const { data: config } = useSimuladorConfig();
  const [loading, setLoading] = useState(false);
  const [resultados, setResultados] = useState<OpcaoFrete[] | null>(null);
  const [erro, setErro] = useState<string | null>(null);

  const [cep, setCep] = useState('');
  const [itens, setItens] = useState<ItemCotacao[]>([]);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [avulsoTitulo, setAvulsoTitulo] = useState('');
  const [avulsoPreco, setAvulsoPreco] = useState('');

  /** Tipos de peso disponíveis: os fixos + um por acessório cadastrado. */
  const tiposPeso = useMemo(() => [
    ...TIPOS_PESO_BASE,
    ...config.adicionais.map((a) => ({ valor: `adicional:${a.nome}` as TipoPeso, label: a.nome })),
  ], [config.adicionais]);

  const gramasDe = (i: ItemCotacao) =>
    i.variantId ? null : pesoDoTipo(config.pesos, i.tipoPeso ?? 'generico');

  const addCatalogo = (p: ProdutoShopify) => {
    setItens((prev) => [...prev, {
      id: novoId(),
      titulo: [p.titulo, p.variante].filter(Boolean).join(' — '),
      variantId: p.variantId,
      preco: p.preco,
      quantidade: 1,
      imagem: p.imagem,
    }]);
  };

  const addAvulso = () => {
    const titulo = avulsoTitulo.trim();
    const preco = Number(String(avulsoPreco).replace(',', '.'));
    if (!titulo) {
      toast({ title: 'Informe a descrição do item avulso', variant: 'destructive' });
      return;
    }
    setItens((prev) => [...prev, {
      id: novoId(), titulo, preco: isNaN(preco) ? 0 : preco, quantidade: 1, tipoPeso: 'generico',
    }]);
    setAvulsoTitulo('');
    setAvulsoPreco('');
  };

  const setQtd = (id: string, q: number) =>
    setItens((prev) => prev.map((i) => (i.id === id ? { ...i, quantidade: Math.max(1, q || 1) } : i)));

  const setTipoPeso = (id: string, t: TipoPeso) =>
    setItens((prev) => prev.map((i) => (i.id === id ? { ...i, tipoPeso: t } : i)));

  const remover = (id: string) => setItens((prev) => prev.filter((i) => i.id !== id));

  const handleCalcular = async () => {
    if (cep.replace(/\D/g, '').length !== 8) {
      toast({ title: 'CEP inválido', description: 'Informe o CEP de destino com 8 dígitos.', variant: 'destructive' });
      return;
    }
    if (itens.length === 0) {
      toast({ title: 'Nenhum item', description: 'Adicione ao menos um produto ao pedido.', variant: 'destructive' });
      return;
    }
    const faltandoPeso = itens.filter((i) => !i.variantId && !gramasDe(i));
    if (faltandoPeso.length) {
      toast({
        title: 'Peso não cadastrado',
        description: `Cadastre o peso em Configurações do Simulador → Pesos para: ${faltandoPeso.map((i) => i.titulo).join(', ')}.`,
        variant: 'destructive',
      });
      return;
    }
    setLoading(true);
    setResultados(null);
    setErro(null);
    try {
      const { data, error } = await supabase.functions.invoke('cotar-frete-shopify', {
        body: {
          cep,
          itens: itens.map((i) => ({
            variantId: i.variantId,
            title: i.titulo,
            price: i.preco,
            quantity: i.quantidade,
            grams: gramasDe(i) ?? undefined,
          })),
        },
      });
      if (error && !data) throw error;
      if (data?.sucesso === false) throw new Error(data?.erro ?? 'Falha na cotação');
      setResultados(data?.opcoes ?? []);
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Falha desconhecida.';
      setErro(msg);
      toast({ title: 'Erro ao calcular frete', description: msg, variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };


  return (
    <div className="container mx-auto max-w-3xl px-4 py-6 space-y-5 pb-24">
      <div className="flex items-center gap-3">
        <div className="h-10 w-10 rounded-lg bg-accent/20 flex items-center justify-center shrink-0">
          <Truck className="h-5 w-5 text-accent" />
        </div>
        <div className="min-w-0">
          <h1 className="text-2xl font-semibold tracking-tight">Calcular Frete</h1>
          <p className="text-sm text-muted-foreground">Cotação real do checkout (via Shopify)</p>
        </div>
      </div>

      <div className="flex items-start gap-2 rounded-lg border bg-muted/40 p-3 text-xs text-muted-foreground">
        <Info className="h-4 w-4 mt-0.5 shrink-0 text-accent" />
        <span>O valor exibido aqui é exatamente o mesmo que o cliente verá no checkout da loja.</span>
      </div>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Destino</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-1.5">
            <Label htmlFor="cepDestino">CEP de destino</Label>
            <Input
              id="cepDestino"
              placeholder="00000-000"
              value={cep}
              onChange={(e) => setCep(maskCep(e.target.value))}
              inputMode="numeric"
              className="h-11 text-base"
            />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Itens do pedido</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {itens.length === 0 && (
            <p className="text-sm text-muted-foreground">Nenhum item adicionado ainda.</p>
          )}

          {itens.map((i) => (
            <div key={i.id} className="flex items-center gap-3 rounded-xl border p-2.5">
              {i.imagem ? (
                <img src={i.imagem} alt={i.titulo} loading="lazy" className="h-12 w-12 rounded-lg object-cover bg-muted shrink-0" />
              ) : (
                <span className="h-12 w-12 rounded-lg bg-muted flex items-center justify-center shrink-0">
                  <ShoppingBag className="h-4 w-4 text-muted-foreground" />
                </span>
              )}
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate">{i.titulo}</p>
                <p className="text-xs text-muted-foreground tabular-nums">{BRL(i.preco)}</p>
              </div>
              <Input
                type="number"
                min={1}
                value={i.quantidade}
                onChange={(e) => setQtd(i.id, parseInt(e.target.value, 10))}
                className="h-9 w-16 text-center"
                aria-label={`Quantidade de ${i.titulo}`}
              />
              <Button variant="ghost" size="icon" onClick={() => remover(i.id)} aria-label="Remover item">
                <Trash2 className="h-4 w-4 text-destructive" />
              </Button>
            </div>
          ))}

          <Button variant="outline" className="w-full h-11" onClick={() => setPickerOpen(true)}>
            <Plus className="h-4 w-4 mr-2" /> Buscar produto no catálogo
          </Button>

          <div className="rounded-xl border border-dashed p-3 space-y-2">
            <Label className="text-[11px] uppercase tracking-wider text-muted-foreground">Item avulso (fora do catálogo)</Label>
            <div className="flex flex-col sm:flex-row gap-2">
              <Input
                placeholder="Descrição (ex.: Faca customizada)"
                value={avulsoTitulo}
                onChange={(e) => setAvulsoTitulo(e.target.value)}
                className="h-10 flex-1"
              />
              <Input
                type="number"
                step="0.01"
                min="0"
                placeholder="Valor (R$)"
                value={avulsoPreco}
                onChange={(e) => setAvulsoPreco(e.target.value)}
                className="h-10 sm:w-36"
              />
              <Button variant="secondary" className="h-10" onClick={addAvulso}>
                <Plus className="h-4 w-4 mr-1" /> Adicionar
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      <Button onClick={handleCalcular} disabled={loading} className="w-full h-12 text-base">
        {loading ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Calculando...</> : <><Truck className="h-4 w-4 mr-2" /> Calcular Frete</>}
      </Button>

      {erro && (
        <Card className="border-destructive/40">
          <CardContent className="pt-6 flex items-start gap-2 text-sm text-destructive">
            <AlertCircle className="h-4 w-4 mt-0.5 shrink-0" />
            <span>{erro}</span>
          </CardContent>
        </Card>
      )}

      {resultados && resultados.length > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {resultados.map((s, idx) => (
            <Card key={s.handle || idx}>
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2 text-lg">
                  <PackageIcon className="h-5 w-5 text-accent" />
                  <span className="truncate">{s.nome}</span>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-xs text-muted-foreground uppercase tracking-wider">Preço</p>
                <p className="text-2xl font-semibold text-foreground tabular-nums">{BRL(s.valor)}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <CatalogoShopifyPicker open={pickerOpen} onOpenChange={setPickerOpen} onPick={addCatalogo} />
    </div>
  );
}
