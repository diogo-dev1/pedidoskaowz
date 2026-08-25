import { useEffect, useState } from 'react';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Search, Loader2, Plus, ShoppingBag } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { BRL } from '@/lib/simuladorData';

export interface ProdutoShopify {
  variantId: string;
  titulo: string;
  variante: string;
  preco: number;
  imagem: string | null;
  disponivel?: boolean;
}

/** Busca produtos do catálogo Shopify (ativos e publicados) e devolve a variante escolhida. */
export default function CatalogoShopifyPicker({ open, onOpenChange, onPick }: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  onPick: (p: ProdutoShopify) => void;
}) {
  const [termo, setTermo] = useState('');
  const [loading, setLoading] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [produtos, setProdutos] = useState<ProdutoShopify[]>([]);

  useEffect(() => {
    if (!open) return;
    let cancelado = false;
    setLoading(true);
    setErro(null);
    const t = setTimeout(async () => {
      try {
        const { data, error } = await supabase.functions.invoke('buscar-produtos-shopify', {
          body: { termo, limite: 20 },
        });
        if (cancelado) return;
        if (error) throw error;
        if (data?.sucesso === false) throw new Error(data?.erro ?? 'Falha na busca');
        setProdutos(data?.produtos ?? []);
      } catch (e: any) {
        if (!cancelado) { setErro(e?.message ?? 'Não foi possível buscar'); setProdutos([]); }
      } finally {
        if (!cancelado) setLoading(false);
      }
    }, termo ? 400 : 0);
    return () => { cancelado = true; clearTimeout(t); };
  }, [termo, open]);

  useEffect(() => { if (!open) setTermo(''); }, [open]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md max-h-[85vh] overflow-hidden flex flex-col rounded-2xl p-0">
        <DialogHeader className="p-4 pb-2">
          <DialogTitle className="flex items-center gap-2">
            <ShoppingBag className="h-5 w-5 text-primary" /> Buscar no site
          </DialogTitle>
          <DialogDescription>Produtos que estão à venda no site, com o preço do site.</DialogDescription>
        </DialogHeader>

        <div className="px-4 pb-2">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input autoFocus value={termo} onChange={(e) => setTermo(e.target.value)}
              placeholder="Digite o nome do produto..." className="pl-9 h-12 text-base" />
          </div>
        </div>

        <div className="flex-1 overflow-y-auto px-4 pb-4 space-y-2">
          {loading && (
            <div className="flex items-center justify-center gap-2 py-10 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" /> Buscando...
            </div>
          )}
          {!loading && erro && (
            <p className="text-sm text-destructive text-center py-8">{erro}</p>
          )}
          {!loading && !erro && produtos.length === 0 && (
            <p className="text-sm text-muted-foreground text-center py-10">Nenhum produto encontrado</p>
          )}
          {!loading && produtos.map((p) => (
            <button key={p.variantId} type="button"
              onClick={() => { onPick(p); onOpenChange(false); }}
              className="w-full flex items-center gap-3 p-2.5 rounded-2xl border text-left hover:bg-muted/50 active:scale-[0.99] transition-all">
              {p.imagem ? (
                <img src={p.imagem} alt={p.titulo} loading="lazy"
                  className="h-14 w-14 rounded-xl object-cover flex-shrink-0 bg-muted" />
              ) : (
                <span className="h-14 w-14 rounded-xl bg-muted flex items-center justify-center flex-shrink-0">
                  <ShoppingBag className="h-5 w-5 text-muted-foreground" />
                </span>
              )}
              <span className="flex-1 min-w-0">
                <span className="block text-sm font-semibold truncate">{p.titulo}</span>
                {p.variante && <span className="block text-[11px] text-muted-foreground truncate">{p.variante}</span>}
                <span className="block text-sm font-bold text-primary tabular-nums">{BRL(p.preco)}</span>
              </span>
              <Plus className="h-5 w-5 text-primary flex-shrink-0" />
            </button>
          ))}
        </div>
      </DialogContent>
    </Dialog>
  );
}
