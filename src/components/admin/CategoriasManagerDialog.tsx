import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { toast } from 'sonner';
import { Plus, Pencil, Trash2, Check, X, Loader2, Eye, EyeOff } from 'lucide-react';

interface Categoria {
  id: string;
  categoria: string;
  visivel: boolean;
  ordem: number;
  icone: string | null;
}

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onChanged?: () => void;
}

export default function CategoriasManagerDialog({ open, onOpenChange, onChanged }: Props) {
  const [categorias, setCategorias] = useState<Categoria[]>([]);
  const [loading, setLoading] = useState(false);
  const [novaCategoria, setNovaCategoria] = useState('');
  const [editandoId, setEditandoId] = useState<string | null>(null);
  const [nomeEditando, setNomeEditando] = useState('');
  const [salvando, setSalvando] = useState(false);

  useEffect(() => {
    if (open) carregar();
  }, [open]);

  const carregar = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('categorias_catalogo_visiveis')
      .select('id, categoria, visivel, ordem, icone')
      .order('ordem');
    if (error) toast.error('Erro ao carregar categorias');
    else setCategorias((data || []) as Categoria[]);
    setLoading(false);
  };

  const criar = async () => {
    const nome = novaCategoria.trim();
    if (!nome) return;
    if (categorias.some(c => c.categoria.toLowerCase() === nome.toLowerCase())) {
      toast.error('Categoria já existe');
      return;
    }
    setSalvando(true);
    const proxOrdem = (categorias.reduce((m, c) => Math.max(m, c.ordem), 0) || 0) + 1;
    const { error } = await supabase
      .from('categorias_catalogo_visiveis')
      .insert({ categoria: nome, visivel: true, ordem: proxOrdem, icone: 'package' });
    setSalvando(false);
    if (error) { toast.error('Erro ao criar categoria'); return; }
    toast.success('Categoria criada');
    setNovaCategoria('');
    carregar();
    onChanged?.();
  };

  const iniciarEdicao = (c: Categoria) => {
    setEditandoId(c.id);
    setNomeEditando(c.categoria);
  };

  const salvarEdicao = async (c: Categoria) => {
    const novo = nomeEditando.trim();
    if (!novo || novo === c.categoria) { setEditandoId(null); return; }
    setSalvando(true);
    const { error } = await supabase
      .from('categorias_catalogo_visiveis')
      .update({ categoria: novo })
      .eq('id', c.id);
    setSalvando(false);
    if (error) { toast.error('Erro ao renomear'); return; }
    toast.success('Categoria renomeada');
    setEditandoId(null);
    carregar();
    onChanged?.();
  };

  const alternarVisivel = async (c: Categoria) => {
    const { error } = await supabase
      .from('categorias_catalogo_visiveis')
      .update({ visivel: !c.visivel })
      .eq('id', c.id);
    if (error) { toast.error('Erro'); return; }
    setCategorias(prev => prev.map(x => x.id === c.id ? { ...x, visivel: !c.visivel } : x));
    onChanged?.();
  };

  const excluir = async (c: Categoria) => {
    if (!confirm(`Excluir categoria "${c.categoria}"?`)) return;
    const { error } = await supabase
      .from('categorias_catalogo_visiveis')
      .delete()
      .eq('id', c.id);
    if (error) { toast.error('Erro ao excluir'); return; }
    toast.success('Categoria excluída');
    carregar();
    onChanged?.();
  };

  const mudarOrdem = async (c: Categoria, delta: number) => {
    const nova = c.ordem + delta;
    const { error } = await supabase
      .from('categorias_catalogo_visiveis')
      .update({ ordem: nova })
      .eq('id', c.id);
    if (error) return;
    carregar();
    onChanged?.();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Gerenciar Categorias</DialogTitle>
          <DialogDescription>
            Crie, renomeie, oculte ou reordene as categorias do catálogo.
          </DialogDescription>
        </DialogHeader>

        <div className="flex gap-2">
          <Input
            placeholder="Nome da nova categoria"
            value={novaCategoria}
            onChange={(e) => setNovaCategoria(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && criar()}
          />
          <Button onClick={criar} disabled={salvando || !novaCategoria.trim()}>
            <Plus className="h-4 w-4 mr-1" /> Criar
          </Button>
        </div>

        {loading ? (
          <div className="flex justify-center py-6"><Loader2 className="h-5 w-5 animate-spin" /></div>
        ) : (
          <div className="space-y-1.5 mt-2">
            {categorias.map((c) => (
              <div key={c.id} className={`flex items-center gap-2 p-2 rounded-md border ${c.visivel ? 'bg-card' : 'bg-muted/40 opacity-70'}`}>
                <div className="flex flex-col">
                  <button onClick={() => mudarOrdem(c, -1)} className="text-xs text-muted-foreground hover:text-foreground leading-none">▲</button>
                  <button onClick={() => mudarOrdem(c, 1)} className="text-xs text-muted-foreground hover:text-foreground leading-none">▼</button>
                </div>
                {editandoId === c.id ? (
                  <>
                    <Input
                      value={nomeEditando}
                      onChange={(e) => setNomeEditando(e.target.value)}
                      autoFocus
                      onKeyDown={(e) => e.key === 'Enter' && salvarEdicao(c)}
                      className="h-8 flex-1"
                    />
                    <Button size="icon" variant="ghost" className="h-8 w-8" onClick={() => salvarEdicao(c)}>
                      <Check className="h-4 w-4" />
                    </Button>
                    <Button size="icon" variant="ghost" className="h-8 w-8" onClick={() => setEditandoId(null)}>
                      <X className="h-4 w-4" />
                    </Button>
                  </>
                ) : (
                  <>
                    <span className="flex-1 text-sm truncate">{c.categoria}</span>
                    <Button size="icon" variant="ghost" className="h-8 w-8" onClick={() => alternarVisivel(c)} title={c.visivel ? 'Ocultar' : 'Mostrar'}>
                      {c.visivel ? <Eye className="h-4 w-4" /> : <EyeOff className="h-4 w-4 text-muted-foreground" />}
                    </Button>
                    <Button size="icon" variant="ghost" className="h-8 w-8" onClick={() => iniciarEdicao(c)}>
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button size="icon" variant="ghost" className="h-8 w-8 text-destructive" onClick={() => excluir(c)}>
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </>
                )}
              </div>
            ))}
            {categorias.length === 0 && (
              <p className="text-center text-sm text-muted-foreground py-6">Nenhuma categoria ainda.</p>
            )}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
