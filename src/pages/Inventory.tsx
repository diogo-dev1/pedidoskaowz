import { useMemo, useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Search, RefreshCw, Package, Pencil } from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

interface ShopifyVariant {
  id: number;
  title: string;
  sku: string | null;
  inventory_quantity: number;
  inventory_item_id: number;
  inventory_management: string | null;
}

interface ShopifyProduct {
  id: number;
  title: string;
  status: string;
  image: { src: string } | null;
  variants: ShopifyVariant[];
}

interface ShopifyLocation {
  id: number;
  name: string;
}

interface InventoryData {
  products: ShopifyProduct[];
  locations: ShopifyLocation[];
}

type StockStatus = 'OK' | 'BAIXO' | 'CRÍTICO' | 'ESGOTADO';

function getStockStatus(qty: number): StockStatus {
  if (qty <= 0) return 'ESGOTADO';
  if (qty <= 3) return 'CRÍTICO';
  if (qty <= 10) return 'BAIXO';
  return 'OK';
}

const statusStyles: Record<StockStatus, string> = {
  OK: 'bg-green-500/15 text-green-500 border-green-500/30',
  BAIXO: 'bg-yellow-500/15 text-yellow-500 border-yellow-500/30',
  'CRÍTICO': 'bg-orange-500/15 text-orange-500 border-orange-500/30',
  ESGOTADO: 'bg-destructive/15 text-destructive border-destructive/30',
};

interface AdjustTarget {
  productTitle: string;
  variant: ShopifyVariant;
}

export default function Inventory() {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState('');
  const [adjustTarget, setAdjustTarget] = useState<AdjustTarget | null>(null);
  const [newQty, setNewQty] = useState('');
  const [locationId, setLocationId] = useState<string>('');

  const { data, isLoading, isFetching, error, refetch, dataUpdatedAt } = useQuery<InventoryData>({
    queryKey: ['shopify-inventory'],
    queryFn: async () => {
      const { data, error } = await supabase.functions.invoke('shopify-inventory', {
        body: { action: 'list' },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      return data as InventoryData;
    },
    refetchInterval: 30000,
    refetchIntervalInBackground: false,
  });

  const setInventory = useMutation({
    mutationFn: async (params: { inventory_item_id: number; location_id: number; available: number }) => {
      const { data, error } = await supabase.functions.invoke('shopify-inventory', {
        body: { action: 'set', ...params },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      return data;
    },
    onSuccess: () => {
      toast.success('Estoque atualizado com sucesso');
      setAdjustTarget(null);
      queryClient.invalidateQueries({ queryKey: ['shopify-inventory'] });
    },
    onError: (err: Error) => {
      toast.error(`Erro ao atualizar estoque: ${err.message}`);
    },
  });

  const filteredProducts = useMemo(() => {
    const products = data?.products ?? [];
    const term = search.trim().toLowerCase();
    if (!term) return products;
    return products.filter(
      (p) =>
        p.title.toLowerCase().includes(term) ||
        p.variants.some(
          (v) =>
            v.title.toLowerCase().includes(term) ||
            (v.sku ?? '').toLowerCase().includes(term),
        ),
    );
  }, [data?.products, search]);

  const openAdjust = (productTitle: string, variant: ShopifyVariant) => {
    setAdjustTarget({ productTitle, variant });
    setNewQty(String(Math.max(0, variant.inventory_quantity)));
    if (data?.locations?.length && !locationId) {
      setLocationId(String(data.locations[0].id));
    }
  };

  const handleConfirm = () => {
    if (!adjustTarget) return;
    const qty = parseInt(newQty, 10);
    if (isNaN(qty) || qty < 0) {
      toast.error('Informe uma quantidade válida');
      return;
    }
    const locId = locationId || (data?.locations?.[0] ? String(data.locations[0].id) : '');
    if (!locId) {
      toast.error('Nenhuma localização disponível');
      return;
    }
    setInventory.mutate({
      inventory_item_id: adjustTarget.variant.inventory_item_id,
      location_id: parseInt(locId, 10),
      available: qty,
    });
  };

  return (
    <div className="max-w-6xl mx-auto space-y-6 p-4 md:p-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Package className="h-6 w-6" />
            Inventário
          </h1>
          <p className="text-sm text-muted-foreground">
            Estoque por variante · atualização automática a cada 30s
            {dataUpdatedAt > 0 && (
              <span className="ml-2">
                (última: {new Date(dataUpdatedAt).toLocaleTimeString('pt-BR')})
              </span>
            )}
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={() => refetch()} disabled={isFetching}>
          <RefreshCw className={cn('h-4 w-4', isFetching && 'animate-spin')} />
          Atualizar
        </Button>
      </div>

      <div className="relative">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          placeholder="Buscar por produto, variante ou SKU..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-9"
        />
      </div>

      {error && (
        <Card className="border-destructive/50">
          <CardContent className="py-6 text-center text-destructive">
            Erro ao carregar inventário: {(error as Error).message}
          </CardContent>
        </Card>
      )}

      {isLoading ? (
        <div className="grid gap-4 md:grid-cols-2">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-48 rounded-lg" />
          ))}
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {filteredProducts.map((product) => (
            <Card key={product.id} className="overflow-hidden">
              <CardHeader className="pb-3">
                <div className="flex items-center gap-3">
                  {product.image?.src ? (
                    <img
                      src={product.image.src}
                      alt={product.title}
                      loading="lazy"
                      className="h-12 w-12 rounded-md object-cover border"
                    />
                  ) : (
                    <div className="h-12 w-12 rounded-md border bg-muted flex items-center justify-center">
                      <Package className="h-5 w-5 text-muted-foreground" />
                    </div>
                  )}
                  <div className="min-w-0">
                    <CardTitle className="text-base truncate">{product.title}</CardTitle>
                    <p className="text-xs text-muted-foreground">
                      {product.variants.length} variante{product.variants.length !== 1 && 's'}
                    </p>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-2 pt-0">
                {product.variants.map((variant) => {
                  const status = getStockStatus(variant.inventory_quantity);
                  return (
                    <div
                      key={variant.id}
                      className="flex items-center justify-between gap-2 rounded-md border px-3 py-2"
                    >
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-medium truncate">
                          {variant.title === 'Default Title' ? 'Padrão' : variant.title}
                        </p>
                        {variant.sku && (
                          <p className="text-xs text-muted-foreground truncate">SKU: {variant.sku}</p>
                        )}
                      </div>
                      <span className="text-sm font-semibold tabular-nums">
                        {variant.inventory_quantity}
                      </span>
                      <Badge variant="outline" className={cn('shrink-0', statusStyles[status])}>
                        {status}
                      </Badge>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 shrink-0"
                        onClick={() => openAdjust(product.title, variant)}
                        title="Ajustar estoque"
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>
                    </div>
                  );
                })}
              </CardContent>
            </Card>
          ))}
          {!filteredProducts.length && !error && (
            <div className="col-span-full py-12 text-center text-muted-foreground">
              Nenhum produto encontrado
            </div>
          )}
        </div>
      )}

      <Dialog open={!!adjustTarget} onOpenChange={(open) => !open && setAdjustTarget(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Ajustar estoque</DialogTitle>
            <DialogDescription>
              {adjustTarget?.productTitle}
              {adjustTarget && adjustTarget.variant.title !== 'Default Title' && (
                <> · {adjustTarget.variant.title}</>
              )}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            {(data?.locations?.length ?? 0) > 1 && (
              <div className="space-y-2">
                <Label>Localização</Label>
                <Select value={locationId} onValueChange={setLocationId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione a localização" />
                  </SelectTrigger>
                  <SelectContent>
                    {data?.locations.map((loc) => (
                      <SelectItem key={loc.id} value={String(loc.id)}>
                        {loc.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
            <div className="space-y-2">
              <Label htmlFor="qty">Nova quantidade disponível</Label>
              <Input
                id="qty"
                type="number"
                min={0}
                value={newQty}
                onChange={(e) => setNewQty(e.target.value)}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAdjustTarget(null)}>
              Cancelar
            </Button>
            <Button onClick={handleConfirm} disabled={setInventory.isPending}>
              {setInventory.isPending ? 'Salvando...' : 'Confirmar'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
