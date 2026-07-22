import { useEffect, useMemo, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { Eye, EyeOff, Search, Loader2 } from 'lucide-react';

type VisibilidadeField =
  | 'visivel_publico'
  | 'visivel_revendedor'
  | 'visivel_internacional'
  | 'visivel_publico_internacional';

interface Modelo {
  id: string;
  nome_modelo: string;
  imagem_modelo: string | null;
  preco_base: number;
  categorias: string[] | null;
  visivel: boolean;
}

interface Props {
  field: VisibilidadeField;
  catalogoLabel: string;
}

export function VisibilidadeLaminasTab({ field, catalogoLabel }: Props) {
  const [modelos, setModelos] = useState<Modelo[]>([]);
  const [busca, setBusca] = useState('');
  const [filtro, setFiltro] = useState<'todos' | 'visiveis' | 'ocultos'>('todos');
  const [loading, setLoading] = useState(true);
  const [pendingId, setPendingId] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      setLoading(true);
      const { data, error } = await supabase
        .from('catalogo_modelos')
        .select(`id, nome_modelo, imagem_modelo, preco_base, categorias, ${field}`)
        .eq('visivel_catalogo', true)
        .order('nome_modelo');
      if (error) {
        toast.error('Erro ao carregar lâminas');
      } else if (data) {
        setModelos(
          (data as any[]).map((m) => ({
            id: m.id,
            nome_modelo: m.nome_modelo,
            imagem_modelo: m.imagem_modelo,
            preco_base: m.preco_base,
            categorias: m.categorias,
            visivel: m[field] !== false,
          })),
        );
      }
      setLoading(false);
    })();
  }, [field]);

  const toggle = async (m: Modelo) => {
    setPendingId(m.id);
    const novo = !m.visivel;
    const { error } = await supabase
      .from('catalogo_modelos')
      .update({ [field]: novo } as any)
      .eq('id', m.id);
    if (error) {
      toast.error('Erro ao atualizar');
    } else {
      setModelos((prev) => prev.map((x) => (x.id === m.id ? { ...x, visivel: novo } : x)));
      toast.success(novo ? 'Lâmina visível' : 'Lâmina oculta');
    }
    setPendingId(null);
  };

  const setTodos = async (visivel: boolean) => {
    const alvo = modelosFiltrados;
    if (alvo.length === 0) return;
    if (!confirm(`${visivel ? 'Exibir' : 'Ocultar'} ${alvo.length} lâmina(s) neste catálogo?`)) return;
    const ids = alvo.map((m) => m.id);
    const { error } = await supabase
      .from('catalogo_modelos')
      .update({ [field]: visivel } as any)
      .in('id', ids);
    if (error) {
      toast.error('Erro em massa');
    } else {
      setModelos((prev) => prev.map((x) => (ids.includes(x.id) ? { ...x, visivel } : x)));
      toast.success(`${alvo.length} lâmina(s) atualizadas`);
    }
  };

  const modelosFiltrados = useMemo(() => {
    const q = busca.trim().toLowerCase();
    return modelos.filter((m) => {
      if (filtro === 'visiveis' && !m.visivel) return false;
      if (filtro === 'ocultos' && m.visivel) return false;
      if (!q) return true;
      return (
        m.nome_modelo.toLowerCase().includes(q) ||
        (m.categorias || []).some((c) => c.toLowerCase().includes(q))
      );
    });
  }, [modelos, busca, filtro]);

  const totalVisiveis = modelos.filter((m) => m.visivel).length;

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center gap-2">
          <Eye className="h-4 w-4" />
          Visibilidade de Lâminas — {catalogoLabel}
        </CardTitle>
        <CardDescription className="text-xs">
          Desative para ocultar uma lâmina apenas neste catálogo. Não afeta os demais.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="flex flex-col sm:flex-row gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
            <Input
              placeholder="Buscar lâmina ou categoria..."
              value={busca}
              onChange={(e) => setBusca(e.target.value)}
              className="pl-9 h-9 text-sm"
            />
          </div>
          <div className="flex gap-1">
            {(['todos', 'visiveis', 'ocultos'] as const).map((f) => (
              <Button
                key={f}
                size="sm"
                variant={filtro === f ? 'default' : 'outline'}
                onClick={() => setFiltro(f)}
                className="text-xs h-9 px-3"
              >
                {f === 'todos' ? 'Todas' : f === 'visiveis' ? 'Visíveis' : 'Ocultas'}
              </Button>
            ))}
          </div>
        </div>

        <div className="flex items-center justify-between text-xs text-muted-foreground">
          <span>
            {totalVisiveis} de {modelos.length} visíveis · Exibindo {modelosFiltrados.length}
          </span>
          <div className="flex gap-2">
            <Button size="sm" variant="ghost" className="h-7 text-xs" onClick={() => setTodos(true)}>
              Exibir todas
            </Button>
            <Button size="sm" variant="ghost" className="h-7 text-xs" onClick={() => setTodos(false)}>
              Ocultar todas
            </Button>
          </div>
        </div>

        {loading ? (
          <div className="flex justify-center py-8">
            <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <div className="max-h-[520px] overflow-y-auto divide-y divide-border/60 border border-border/60 rounded-md">
            {modelosFiltrados.map((m) => (
              <div
                key={m.id}
                className={`flex items-center gap-3 px-3 py-2 hover:bg-muted/30 transition-colors ${!m.visivel ? 'opacity-60' : ''}`}
              >
                <div className="w-10 h-10 rounded overflow-hidden bg-muted flex-shrink-0">
                  {m.imagem_modelo ? (
                    <img src={m.imagem_modelo} alt={m.nome_modelo} className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-[9px] text-muted-foreground">S/img</div>
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-medium truncate">{m.nome_modelo}</p>
                    {!m.visivel && <EyeOff className="h-3 w-3 text-muted-foreground flex-shrink-0" />}
                  </div>
                  <div className="flex items-center gap-2 mt-0.5">
                    <span className="text-[10px] text-muted-foreground">R$ {m.preco_base.toFixed(2)}</span>
                    {m.categorias?.[0] && (
                      <Badge variant="outline" className="text-[9px] px-1 py-0 h-4">
                        {m.categorias[0]}
                      </Badge>
                    )}
                  </div>
                </div>
                <Switch
                  checked={m.visivel}
                  disabled={pendingId === m.id}
                  onCheckedChange={() => toggle(m)}
                />
              </div>
            ))}
            {modelosFiltrados.length === 0 && (
              <p className="text-center text-xs text-muted-foreground py-6">Nenhuma lâmina encontrada</p>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
