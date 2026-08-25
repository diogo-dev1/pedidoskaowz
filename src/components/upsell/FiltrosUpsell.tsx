import { useMemo, useState } from 'react';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { SlidersHorizontal, X } from 'lucide-react';

export interface FiltrosUpsell {
  busca: string;
  ufs: string[];
  tipoPessoa: string | null;
  gastoMin: string;
  gastoMax: string;
  comprouHaDias: number | null;
  semComprarHaDias: number | null;
  minPedidos: number | null;
  canais: string[];
  produtosIncluir: string[];
  produtosExcluir: string[];
  soWhatsapp: boolean;
  ordem: string;
}

export const FILTROS_PADRAO: FiltrosUpsell = {
  busca: '',
  ufs: [],
  tipoPessoa: null,
  gastoMin: '',
  gastoMax: '',
  comprouHaDias: null,
  semComprarHaDias: null,
  minPedidos: null,
  canais: [],
  produtosIncluir: [],
  produtosExcluir: [],
  soWhatsapp: false,
  ordem: 'maior_gasto',
};

export const UFS = [
  'AC','AL','AM','AP','BA','CE','DF','ES','GO','MA','MG','MS','MT','PA','PB','PE','PI','PR','RJ','RN','RO','RR','RS','SC','SE','SP','TO',
];

const JANELAS = [30, 60, 90, 180, 365];

export function contarFiltrosAtivos(f: FiltrosUpsell): number {
  let n = 0;
  if (f.ufs.length) n++;
  if (f.tipoPessoa) n++;
  if (f.gastoMin || f.gastoMax) n++;
  if (f.comprouHaDias) n++;
  if (f.semComprarHaDias) n++;
  if (f.minPedidos) n++;
  if (f.canais.length) n++;
  if (f.produtosIncluir.length) n++;
  if (f.produtosExcluir.length) n++;
  if (f.soWhatsapp) n++;
  return n;
}

interface ProdutoOpcao { produto: string; exemplo: string | null; clientes: number }

interface Props {
  filtros: FiltrosUpsell;
  onChange: (f: FiltrosUpsell) => void;
  produtos: ProdutoOpcao[];
  totalNoSegmento: number;
}

function Secao({ titulo, children, hint }: { titulo: string; children: React.ReactNode; hint?: string }) {
  return (
    <div className="space-y-2">
      <div>
        <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">{titulo}</p>
        {hint && <p className="text-[10px] text-muted-foreground/80 mt-0.5">{hint}</p>}
      </div>
      {children}
    </div>
  );
}

function SeletorProdutos({
  valor,
  onChange,
  produtos,
  placeholder,
}: {
  valor: string[];
  onChange: (v: string[]) => void;
  produtos: ProdutoOpcao[];
  placeholder: string;
}) {
  const [q, setQ] = useState('');
  const lista = useMemo(() => {
    const termo = q.trim().toLowerCase();
    const base = termo ? produtos.filter((p) => p.produto.includes(termo)) : produtos;
    return base.slice(0, 60);
  }, [q, produtos]);

  const alternar = (p: string) =>
    onChange(valor.includes(p) ? valor.filter((v) => v !== p) : [...valor, p]);

  return (
    <div className="space-y-2">
      <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder={placeholder} className="h-9 text-sm" />
      {valor.length > 0 && (
        <div className="flex flex-wrap gap-1">
          {valor.map((p) => (
            <Badge key={p} variant="secondary" className="text-[10px] gap-1 max-w-full">
              <span className="truncate">{p}</span>
              <button type="button" onClick={() => alternar(p)}><X className="h-3 w-3" /></button>
            </Badge>
          ))}
        </div>
      )}
      <ScrollArea className="h-40 rounded-md border">
        <div className="p-1.5 space-y-0.5">
          {lista.map((p) => (
            <label key={p.produto} className="flex items-center gap-2 px-2 py-1.5 rounded hover:bg-muted cursor-pointer">
              <Checkbox checked={valor.includes(p.produto)} onCheckedChange={() => alternar(p.produto)} className="h-3.5 w-3.5" />
              <span className="text-[11px] truncate flex-1">{p.exemplo || p.produto}</span>
              <span className="text-[10px] text-muted-foreground shrink-0">{p.clientes}</span>
            </label>
          ))}
          {lista.length === 0 && <p className="text-[11px] text-muted-foreground p-2">Nenhum produto encontrado.</p>}
        </div>
      </ScrollArea>
    </div>
  );
}

export function FiltrosUpsellSheet({ filtros, onChange, produtos, totalNoSegmento }: Props) {
  const [open, setOpen] = useState(false);
  const ativos = contarFiltrosAtivos(filtros);
  const set = (patch: Partial<FiltrosUpsell>) => onChange({ ...filtros, ...patch });

  const alternarLista = (chave: 'ufs' | 'canais', v: string) => {
    const atual = filtros[chave];
    set({ [chave]: atual.includes(v) ? atual.filter((x) => x !== v) : [...atual, v] } as Partial<FiltrosUpsell>);
  };

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <Button variant="outline" size="sm" className="h-10 gap-2 shrink-0">
          <SlidersHorizontal className="h-4 w-4" />
          Filtros
          {ativos > 0 && <Badge variant="secondary" className="px-1.5 py-0 text-[10px]">{ativos}</Badge>}
        </Button>
      </SheetTrigger>
      <SheetContent side="bottom" className="h-[88vh] flex flex-col p-0 sm:max-w-xl sm:mx-auto rounded-t-xl">
        <SheetHeader className="p-4 pb-2">
          <SheetTitle className="text-base">Filtros de segmentação</SheetTitle>
        </SheetHeader>

        <ScrollArea className="flex-1 px-4">
          <div className="space-y-5 pb-4">
            <Secao titulo="Perfil">
              <div className="flex flex-wrap gap-1.5">
                {[
                  { v: null, l: 'Todos' },
                  { v: 'PF', l: 'Pessoa física' },
                  { v: 'PJ', l: 'Pessoa jurídica' },
                ].map((o) => (
                  <Button
                    key={o.l}
                    size="sm"
                    variant={filtros.tipoPessoa === o.v ? 'secondary' : 'outline'}
                    className="h-8 text-xs"
                    onClick={() => set({ tipoPessoa: o.v })}
                  >
                    {o.l}
                  </Button>
                ))}
              </div>
              <div className="flex flex-wrap gap-1.5">
                {['site', 'manual'].map((c) => (
                  <Button
                    key={c}
                    size="sm"
                    variant={filtros.canais.includes(c) ? 'secondary' : 'outline'}
                    className="h-8 text-xs capitalize"
                    onClick={() => alternarLista('canais', c)}
                  >
                    Canal {c}
                  </Button>
                ))}
                <Button
                  size="sm"
                  variant={filtros.soWhatsapp ? 'secondary' : 'outline'}
                  className="h-8 text-xs"
                  onClick={() => set({ soWhatsapp: !filtros.soWhatsapp })}
                >
                  Só com WhatsApp
                </Button>
              </div>
            </Secao>

            <Separator />

            <Secao titulo="Localização" hint="Cobertura parcial: hoje só parte da base tem UF preenchida.">
              <div className="flex flex-wrap gap-1">
                {UFS.map((uf) => (
                  <button
                    key={uf}
                    type="button"
                    onClick={() => alternarLista('ufs', uf)}
                    className={`px-2 py-1 rounded border text-[11px] ${
                      filtros.ufs.includes(uf) ? 'bg-primary/15 border-primary/40 text-primary' : 'border-border text-muted-foreground'
                    }`}
                  >
                    {uf}
                  </button>
                ))}
              </div>
            </Secao>

            <Separator />

            <Secao titulo="Valor e recorrência">
              <div className="flex gap-2">
                <Input
                  type="number" inputMode="decimal" placeholder="Gasto mín. (R$)"
                  value={filtros.gastoMin} onChange={(e) => set({ gastoMin: e.target.value })}
                  className="h-9 text-sm flex-1 min-w-0"
                />
                <Input
                  type="number" inputMode="decimal" placeholder="Gasto máx. (R$)"
                  value={filtros.gastoMax} onChange={(e) => set({ gastoMax: e.target.value })}
                  className="h-9 text-sm flex-1 min-w-0"
                />
              </div>
              <div className="flex flex-wrap gap-1.5">
                {[null, 1, 2, 3, 5].map((n) => (
                  <Button
                    key={String(n)}
                    size="sm"
                    variant={filtros.minPedidos === n ? 'secondary' : 'outline'}
                    className="h-8 text-xs"
                    onClick={() => set({ minPedidos: n })}
                  >
                    {n === null ? 'Qualquer' : n === 1 ? 'Com pedidos' : `${n}+ pedidos`}
                  </Button>
                ))}
              </div>
            </Secao>

            <Separator />

            <Secao titulo="Recência">
              <p className="text-[10px] text-muted-foreground">Comprou nos últimos…</p>
              <div className="flex flex-wrap gap-1.5">
                {JANELAS.map((d) => (
                  <Button
                    key={`c${d}`}
                    size="sm"
                    variant={filtros.comprouHaDias === d ? 'secondary' : 'outline'}
                    className="h-8 text-xs"
                    onClick={() => set({ comprouHaDias: filtros.comprouHaDias === d ? null : d })}
                  >
                    {d} dias
                  </Button>
                ))}
              </div>
              <p className="text-[10px] text-muted-foreground pt-1">Não compra há mais de… (reativação)</p>
              <div className="flex flex-wrap gap-1.5">
                {JANELAS.map((d) => (
                  <Button
                    key={`s${d}`}
                    size="sm"
                    variant={filtros.semComprarHaDias === d ? 'secondary' : 'outline'}
                    className="h-8 text-xs"
                    onClick={() => set({ semComprarHaDias: filtros.semComprarHaDias === d ? null : d })}
                  >
                    {d} dias
                  </Button>
                ))}
              </div>
            </Secao>

            <Separator />

            <Secao titulo="Produtos" hint="Cross-sell: quem comprou X e nunca comprou Y.">
              <p className="text-[10px] text-muted-foreground">Já comprou</p>
              <SeletorProdutos
                valor={filtros.produtosIncluir}
                onChange={(v) => set({ produtosIncluir: v })}
                produtos={produtos}
                placeholder="Buscar produto comprado..."
              />
              <p className="text-[10px] text-muted-foreground pt-2">Nunca comprou</p>
              <SeletorProdutos
                valor={filtros.produtosExcluir}
                onChange={(v) => set({ produtosExcluir: v })}
                produtos={produtos}
                placeholder="Buscar produto a excluir..."
              />
            </Secao>
          </div>
        </ScrollArea>

        <div className="p-3 border-t flex gap-2">
          <Button
            variant="outline"
            className="flex-1"
            onClick={() => onChange({ ...FILTROS_PADRAO, busca: filtros.busca, ordem: filtros.ordem })}
          >
            Limpar tudo
          </Button>
          <Button className="flex-1" onClick={() => setOpen(false)}>
            Ver {totalNoSegmento} cliente(s)
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  );
}
