import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { toast } from 'sonner';
import { Languages, Loader2, CheckCircle2, AlertTriangle, Sparkles, Save, ChevronDown, ChevronUp } from 'lucide-react';

interface Produto {
  id: string;
  nome_modelo: string;
  nome_modelo_en: string | null;
  descricao_html_en: string | null;
  imagem_modelo: string | null;
}

interface Props {
  produtos: Produto[];
  busca: string;
  setBusca: (v: string) => void;
  onRefresh: () => void;
}

export function TranslationManager({ produtos, busca, setBusca, onRefresh }: Props) {
  const [bulkLoading, setBulkLoading] = useState<'missing' | 'all' | null>(null);
  const [rowLoading, setRowLoading] = useState<string | null>(null);
  const [expanded, setExpanded] = useState<string | null>(null);
  const [drafts, setDrafts] = useState<Record<string, { nome: string; html: string }>>({});
  const [savingId, setSavingId] = useState<string | null>(null);

  const runBulk = async (mode: 'missing' | 'all') => {
    setBulkLoading(mode);
    let totalTranslated = 0;
    let totalFailed = 0;
    try {
      const { data: session } = await supabase.auth.getSession();
      const token = session.session?.access_token;
      // Loop in batches until no remaining items (avoids 150s edge timeout)
      for (let i = 0; i < 50; i++) {
        const { data, error } = await supabase.functions.invoke('translate-products', {
          body: { mode },
          headers: token ? { Authorization: `Bearer ${token}` } : undefined,
        });
        if (error) throw error;
        if (!data?.success) throw new Error(data?.error || 'Falha na tradução');
        totalTranslated += data.translated || 0;
        totalFailed += data.failed || 0;
        toast.message(`Lote ${i + 1}: +${data.translated} traduzidos • ${data.remaining} restantes`);
        if (!data.remaining || data.remaining === 0) break;
      }
      toast.success(`Concluído: ${totalTranslated} traduzidos • ${totalFailed} falhas`);
      onRefresh();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Erro ao traduzir');
    } finally {
      setBulkLoading(null);
    }
  };

  const runSingle = async (id: string) => {
    setRowLoading(id);
    try {
      const { data: session } = await supabase.auth.getSession();
      const token = session.session?.access_token;
      const { data, error } = await supabase.functions.invoke('translate-products', {
        body: { mode: 'single', modelo_id: id },
        headers: token ? { Authorization: `Bearer ${token}` } : undefined,
      });
      if (error) throw error;
      if (!data?.success) throw new Error(data?.error || 'Falha');
      toast.success('Traduzido');
      onRefresh();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Erro');
    } finally {
      setRowLoading(null);
    }
  };

  const toggleExpand = (p: Produto) => {
    if (expanded === p.id) {
      setExpanded(null);
      return;
    }
    setExpanded(p.id);
    setDrafts(prev => ({
      ...prev,
      [p.id]: { nome: p.nome_modelo_en || '', html: p.descricao_html_en || '' },
    }));
  };

  const saveManual = async (id: string) => {
    const d = drafts[id];
    if (!d) return;
    setSavingId(id);
    try {
      const { error } = await supabase
        .from('catalogo_modelos')
        .update({ nome_modelo_en: d.nome || null, descricao_html_en: d.html || null })
        .eq('id', id);
      if (error) throw error;
      toast.success('Salvo');
      setExpanded(null);
      onRefresh();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Erro');
    } finally {
      setSavingId(null);
    }
  };

  const totalPendentes = produtos.filter(p => !p.nome_modelo_en || !p.descricao_html_en).length;

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center gap-2">
          <Languages className="h-4 w-4" /> Traduções (PT → EN)
        </CardTitle>
        <CardDescription className="text-xs">
          Traduza nomes e descrições com IA, ou edite manualmente. {totalPendentes} pendente(s).
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="grid grid-cols-2 gap-2">
          <Button
            size="sm"
            variant="default"
            onClick={() => runBulk('missing')}
            disabled={bulkLoading !== null}
            className="h-9"
          >
            {bulkLoading === 'missing' ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : <Sparkles className="h-4 w-4 mr-1" />}
            Traduzir pendentes
          </Button>
          <Button
            size="sm"
            variant="outline"
            onClick={() => runBulk('all')}
            disabled={bulkLoading !== null}
            className="h-9"
          >
            {bulkLoading === 'all' ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : <Sparkles className="h-4 w-4 mr-1" />}
            Re-traduzir tudo
          </Button>
        </div>

        <Input placeholder="Buscar..." value={busca} onChange={(e) => setBusca(e.target.value)} className="h-8 text-sm" />

        <div className="border rounded-md divide-y max-h-[480px] overflow-y-auto">
          {produtos.map(p => {
            const traduzido = !!p.nome_modelo_en && !!p.descricao_html_en;
            const isExpanded = expanded === p.id;
            const draft = drafts[p.id];
            return (
              <div key={p.id} className="p-2 space-y-2">
                <div className="flex items-center gap-2">
                  {p.imagem_modelo
                    ? <img src={p.imagem_modelo} className="h-8 w-8 rounded object-cover" alt="" />
                    : <div className="h-8 w-8 rounded bg-muted" />}
                  <div className="flex-1 min-w-0">
                    <div className="text-xs font-medium truncate">{p.nome_modelo}</div>
                    {p.nome_modelo_en && <div className="text-[10px] text-muted-foreground truncate">EN: {p.nome_modelo_en}</div>}
                  </div>
                  {traduzido
                    ? <CheckCircle2 className="h-4 w-4 text-green-600 shrink-0" />
                    : <AlertTriangle className="h-4 w-4 text-yellow-500 shrink-0" />}
                  <Button
                    size="sm"
                    variant="ghost"
                    className="h-7 w-7 p-0 shrink-0"
                    onClick={() => runSingle(p.id)}
                    disabled={rowLoading === p.id}
                    title="Traduzir com IA"
                  >
                    {rowLoading === p.id ? <Loader2 className="h-3 w-3 animate-spin" /> : <Sparkles className="h-3 w-3" />}
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    className="h-7 w-7 p-0 shrink-0"
                    onClick={() => toggleExpand(p)}
                    title="Editar manualmente"
                  >
                    {isExpanded ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
                  </Button>
                </div>

                {isExpanded && draft && (
                  <div className="space-y-2 pl-10 pr-1 pb-2">
                    <div>
                      <Label className="text-[10px]">Nome (EN)</Label>
                      <Input
                        value={draft.nome}
                        onChange={(e) => setDrafts(prev => ({ ...prev, [p.id]: { ...draft, nome: e.target.value } }))}
                        className="h-8 text-xs mt-1"
                      />
                    </div>
                    <div>
                      <Label className="text-[10px]">Descrição HTML (EN)</Label>
                      <Textarea
                        value={draft.html}
                        onChange={(e) => setDrafts(prev => ({ ...prev, [p.id]: { ...draft, html: e.target.value } }))}
                        className="text-xs mt-1 font-mono min-h-[120px]"
                      />
                    </div>
                    <Button
                      size="sm"
                      onClick={() => saveManual(p.id)}
                      disabled={savingId === p.id}
                      className="h-8 w-full"
                    >
                      {savingId === p.id ? <Loader2 className="h-3 w-3 mr-1 animate-spin" /> : <Save className="h-3 w-3 mr-1" />}
                      Salvar
                    </Button>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}
