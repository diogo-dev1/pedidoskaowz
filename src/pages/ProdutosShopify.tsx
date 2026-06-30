import { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Search, ShoppingBag, Loader2, RefreshCw, Package, Download } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';

interface ShopifyVariant {
  id: number;
  title: string;
  sku: string | null;
  price: string | null;
  inventory_quantity: number;
}
interface ShopifyProduct {
  id: number;
  title: string;
  status: string;
  image: { src: string } | null;
  variants: ShopifyVariant[];
}
interface InventoryData {
  products: ShopifyProduct[];
}

const brl = (v: string | number | null) => {
  const n = typeof v === 'string' ? parseFloat(v) : v;
  if (n == null || isNaN(n)) return '—';
  return n.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
};

function priceRange(p: ShopifyProduct): string {
  const prices = p.variants.map((v) => parseFloat(v.price ?? '0')).filter((n) => !isNaN(n));
  if (prices.length === 0) return '—';
  const min = Math.min(...prices);
  const max = Math.max(...prices);
  return min === max ? brl(min) : `${brl(min)} – ${brl(max)}`;
}

function totalEstoque(p: ShopifyProduct): number {
  return p.variants.reduce((s, v) => s + (v.inventory_quantity ?? 0), 0);
}

const STATUS_LABEL: Record<string, string> = { active: 'Ativo', draft: 'Rascunho', archived: 'Arquivado' };
const STATUS_VARIANT: Record<string, 'default' | 'secondary' | 'outline'> = { active: 'default', draft: 'secondary', archived: 'outline' };

function csvEscape(value: string | number): string {
  const s = String(value ?? '');
  if (/[";\n]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
  return s;
}

function exportarCsv(produtos: ShopifyProduct[]) {
  const header = ['ID Produto', 'Produto', 'Status', 'Variante', 'SKU', 'Preço (R$)', 'Estoque'];
  const rows: string[][] = [];

  for (const p of produtos) {
    if (p.variants.length === 0) {
      rows.push([String(p.id), p.title, STATUS_LABEL[p.status] ?? p.status, '—', '—', '—', '—']);
      continue;
    }
    for (const v of p.variants) {
      const preco = v.price != null ? parseFloat(v.price).toFixed(2).replace('.', ',') : '—';
      rows.push([
        String(p.id),
        p.title,
        STATUS_LABEL[p.status] ?? p.status,
        v.title === 'Default Title' ? 'Padrão' : v.title,
        v.sku ?? '—',
        preco,
        String(v.inventory_quantity ?? 0),
      ]);
    }
  }

  const csv = [header, ...rows].map((row) => row.map(csvEscape).join(';')).join('\r\n');
  const blob = new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  const dataHoje = new Date().toISOString().slice(0, 10);
  a.href = url;
  a.download = `produtos-shopify-${dataHoje}.csv`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

export default function ProdutosShopify() {
  const [search, setSearch] = useState('');
  const [selected, setSelected] = useState<ShopifyProduct | null>(null);

  const { data, isLoading, isFetching, error, refetch } = useQuery({
    queryKey: ['shopify-produtos'],
    queryFn: async () => {
      const { data, error } = await supabase.functions.invoke('shopify-inventory', { body: { action: 'list' } });
      if (error) throw error;
      if (data?.error) throw new Error(typeof data.error === 'string' ? data.error : 'Erro na API Shopify');
      return data as InventoryData;
    },
    staleTime: 60_000,
  });

  const produtos = data?.products ?? [];

  const filtrados = useMemo(() => {
    if (!search.trim()) return produtos;
    const q = search.toLowerCase();
    return produtos.filter((p) => p.title.toLowerCase().includes(q) || p.variants.some((v) => v.sku?.toLowerCase().includes(q)));
  }, [produtos, search]);

  return (
    <div className="max-w-5xl mx-auto py-6 px-4 space-y-5">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-3">
          <ShoppingBag className="h-6 w-6 text-primary" />
          <div>
            <h1 className="text-xl sm:text-2xl font-bold">Produtos Shopify</h1>
            <p className="text-xs text-muted-foreground">
              {isLoading ? 'Carregando...' : `${produtos.length} produto(s) na loja`}
            </p>
          </div>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            className="gap-2"
            disabled={produtos.length === 0}
            onClick={() => {
              exportarCsv(filtrados.length !== produtos.length ? filtrados : produtos);
              toast.success(`CSV exportado: ${(filtrados.length !== produtos.length ? filtrados : produtos).length} produto(s)`);
            }}
          >
            <Download className="h-4 w-4" />
            Exportar CSV
          </Button>
          <Button variant="outline" size="sm" className="gap-2" onClick={() => refetch()} disabled={isFetching}>
            {isFetching ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
            Atualizar
          </Button>
        </div>
      </div>

      {error && (
        <div className="p-4 rounded-lg border border-destructive/30 bg-destructive/5 text-sm text-destructive">
          <p className="font-medium">Erro ao buscar produtos da Shopify</p>
          <p className="text-xs mt-1 text-muted-foreground">{(error as Error).message}</p>
          <p className="text-xs mt-2">
            Verifique se as credenciais estão configuradas no Supabase: <code className="bg-muted px-1 rounded">SHOPIFY_SHOP</code> e{' '}
            <code className="bg-muted px-1 rounded">SHOPIFY_ACCESS_TOKEN</code> (ou <code className="bg-muted px-1 rounded">SHOPIFY_CLIENT_ID</code>/<code className="bg-muted px-1 rounded">SHOPIFY_CLIENT_SECRET</code>).
          </p>
        </div>
      )}

      {!error && (
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Buscar por nome ou SKU..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9" />
        </div>
      )}

      {isLoading ? (
        <div className="flex items-center justify-center py-16 text-muted-foreground gap-2">
          <Loader2 className="h-5 w-5 animate-spin" /> Carregando produtos...
        </div>
      ) : !error && filtrados.length === 0 ? (
        <div className="text-center py-16 text-muted-foreground">
          <Package className="h-10 w-10 mx-auto mb-3 opacity-40" />
          <p className="font-medium">{produtos.length === 0 ? 'Nenhum produto encontrado na loja' : 'Nenhum produto corresponde à busca'}</p>
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
          {filtrados.map((p) => {
            const estoque = totalEstoque(p);
            return (
              <button
                key={p.id}
                onClick={() => setSelected(p)}
                className="text-left border rounded-xl overflow-hidden bg-card hover:shadow-md hover:border-primary/30 transition-all"
              >
                <div className="aspect-square bg-muted overflow-hidden">
                  {p.image?.src ? (
                    <img src={p.image.src} alt={p.title} className="w-full h-full object-cover" loading="lazy" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-muted-foreground">
                      <Package className="h-8 w-8 opacity-30" />
                    </div>
                  )}
                </div>
                <div className="p-2.5 space-y-1">
                  <p className="text-xs font-medium leading-tight line-clamp-2">{p.title}</p>
                  <div className="flex items-center justify-between gap-1">
                    <span className="text-xs font-bold text-primary">{priceRange(p)}</span>
                    <Badge variant={STATUS_VARIANT[p.status] ?? 'outline'} className="text-[9px] px-1.5 py-0">
                      {STATUS_LABEL[p.status] ?? p.status}
                    </Badge>
                  </div>
                  <p className="text-[10px] text-muted-foreground">
                    {p.variants.length} {p.variants.length === 1 ? 'variante' : 'variantes'} · Estoque: {estoque}
                  </p>
                </div>
              </button>
            );
          })}
        </div>
      )}

      {/* Modal de detalhe */}
      <Dialog open={!!selected} onOpenChange={(v) => !v && setSelected(null)}>
        <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
          {selected && (
            <>
              <DialogHeader>
                <DialogTitle className="text-base pr-6">{selected.title}</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                {selected.image?.src && (
                  <img src={selected.image.src} alt={selected.title} className="w-full aspect-square object-cover rounded-lg border" />
                )}
                <div className="flex items-center gap-2">
                  <Badge variant={STATUS_VARIANT[selected.status] ?? 'outline'}>{STATUS_LABEL[selected.status] ?? selected.status}</Badge>
                  <span className="text-xs text-muted-foreground">ID: {selected.id}</span>
                </div>
                <div className="space-y-1.5">
                  <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Variantes</p>
                  {selected.variants.map((v) => (
                    <div key={v.id} className="flex items-center justify-between p-2.5 rounded-lg bg-muted/50 border text-sm">
                      <div className="min-w-0">
                        <p className="font-medium truncate">{v.title === 'Default Title' ? 'Padrão' : v.title}</p>
                        {v.sku && <p className="text-[10px] text-muted-foreground">SKU: {v.sku}</p>}
                      </div>
                      <div className="text-right flex-shrink-0 ml-2">
                        <p className="font-bold text-primary">{brl(v.price)}</p>
                        <p className="text-[10px] text-muted-foreground">{v.inventory_quantity ?? 0} em estoque</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
