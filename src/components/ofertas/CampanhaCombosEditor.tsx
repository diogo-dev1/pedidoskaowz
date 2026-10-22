import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { type CampanhaItem, moeda } from '@/lib/campanhas';
import { type ComboCompleto, valoresCombo } from '@/lib/campanhaCombos';
import type { Extra } from '@/lib/campanhaExtras';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Switch } from '@/components/ui/switch';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogContent, AlertDialogHeader, AlertDialogTitle, AlertDialogDescription, AlertDialogFooter, AlertDialogCancel, AlertDialogAction } from '@/components/ui/alert-dialog';
import { Plus, Pencil, Trash2, ArrowUp, ArrowDown, Loader2 } from 'lucide-react';
import { toast } from 'sonner';

const vazio = { nome: '', descricao_curta: '', preco: '', destaque: false, extras: [] as string[] };
export default function CampanhaCombosEditor({ item }: { item: CampanhaItem }) {
  const [lista, setLista] = useState<ComboCompleto[]>([]);
  const [biblioteca, setBiblioteca] = useState<Extra[]>([]);
  const [form, setForm] = useState(vazio);
  const [aberto, setAberto] = useState(false);
  const [id, setId] = useState<string | null>(null);
  const [excluir, setExcluir] = useState<ComboCompleto | null>(null);
  const [busy, setBusy] = useState(false);
  const [busca, setBusca] = useState('');
  async function carregar() {
    const [a, b] = await Promise.all([supabase.from('campanha_combos').select('*, campanha_combo_extras(*, campanha_extras(*))').eq('campanha_item_id', item.id).order('ordem').order('created_at'), supabase.from('campanha_extras').select('*').order('nome')]);
    if (a.error || b.error) toast.error('Não foi possível carregar os combos'); else { setLista(a.data ?? []); setBiblioteca(b.data ?? []); }
  }
  useEffect(() => { void carregar(); }, [item.id]);
  async function abrir(c?: ComboCompleto) {
    await carregar(); setBusca(''); setId(c?.id ?? null);
    setForm(c ? { nome: c.nome, descricao_curta: c.descricao_curta ?? '', preco: String(c.preco), destaque: c.destaque, extras: [...c.campanha_combo_extras].sort((a,b) => a.ordem-b.ordem).map(v => v.extra_id) } : { ...vazio, destaque: lista.length === 0 });
    setAberto(true);
  }
  async function salvar() {
    if (!form.nome.trim() || !form.preco || !Number.isFinite(Number(form.preco)) || Number(form.preco) < 0) { toast.error('Informe nome e preço válidos'); return; }
    setBusy(true);
    try {
      const { error } = await supabase.rpc('salvar_campanha_combo', { p_id: id ?? undefined, p_item_id: item.id, p_nome: form.nome.trim(), p_descricao_curta: form.descricao_curta.trim(), p_preco: Number(form.preco), p_destaque: form.destaque, p_extras: form.extras });
      if (error) throw error;
      toast.success('Combo salvo'); setAberto(false); await carregar();
    } catch { toast.error('Não foi possível salvar o combo'); } finally { setBusy(false); }
  }
  async function mover(i: number, dir: number) {
    const arr = [...lista]; const j = i + dir; if (j < 0 || j >= arr.length) return;
    [arr[i], arr[j]] = [arr[j], arr[i]]; setBusy(true);
    const results = await Promise.all(arr.map((c, ordem) => supabase.from('campanha_combos').update({ ordem }).eq('id', c.id)));
    if (results.some(r => r.error)) toast.error('Não foi possível salvar a ordem');
    setBusy(false); await carregar();
  }
  async function remover() {
    if (!excluir) return;
    const { error } = await supabase.from('campanha_combos').delete().eq('id', excluir.id);
    if (error) toast.error('Não foi possível remover'); else { setExcluir(null); await carregar(); }
  }
  const brindes = form.extras.flatMap(id => { const e = biblioteca.find(e => e.id === id); return e ? [e] : []; });
  const calculo = valoresCombo(item, { preco: Number(form.preco) || 0, brindes });
  return <section className="space-y-3 border-t pt-4"><div className="flex items-center justify-between gap-2"><h3 className="font-semibold">Combos</h3><Button size="sm" variant="outline" onClick={() => void abrir()}><Plus className="mr-1 h-4 w-4"/>Criar combo</Button></div><p className="text-xs text-muted-foreground">Combos são as opções de brinde que o cliente escolhe. O destaque aparece no cartão.</p>{lista.map((c,i) => { const calc = valoresCombo(item, { preco: c.preco, brindes: c.campanha_combo_extras.flatMap(v => v.campanha_extras ? [v.campanha_extras] : []) }); return <div key={c.id} className="rounded border p-3 space-y-2"><div className="flex flex-wrap items-center gap-2"><div className="flex-1 min-w-0"><p className="text-sm font-bold break-words">{c.nome}{c.destaque && <span className="text-xs text-accent ml-2">Destaque</span>}</p><p className="text-xs text-muted-foreground">{c.descricao_curta}</p></div><div className="flex gap-1"><Button size="icon" variant="ghost" disabled={busy || i===0} aria-label={`Subir combo ${c.nome}`} onClick={() => void mover(i,-1)}><ArrowUp className="h-4 w-4"/></Button><Button size="icon" variant="ghost" disabled={busy || i===lista.length-1} aria-label={`Descer combo ${c.nome}`} onClick={() => void mover(i,1)}><ArrowDown className="h-4 w-4"/></Button><Button size="icon" variant="ghost" aria-label={`Editar combo ${c.nome}`} onClick={() => void abrir(c)}><Pencil className="h-4 w-4"/></Button><Button size="icon" variant="ghost" aria-label={`Remover combo ${c.nome}`} onClick={() => setExcluir(c)}><Trash2 className="h-4 w-4 text-destructive"/></Button></div></div><p className="text-sm"><strong className="text-accent">{moeda(c.preco)}</strong><span className="ml-2 text-muted-foreground line-through">{moeda(calc.valorDe)}</span>{calc.economia > 0 && <span className="ml-2 text-success text-xs">Economia {moeda(calc.economia)}</span>}</p></div>; })}{!lista.length && <p className="text-xs text-muted-foreground">Sem combos cadastrados: serão usados o preço da faca e os brindes fixos.</p>}<Dialog open={aberto} onOpenChange={setAberto}><DialogContent className="w-[calc(100%-1rem)] max-w-xl max-h-[90dvh] overflow-y-auto grid-cols-[minmax(0,1fr)]"><DialogHeader><DialogTitle>{id ? 'Editar combo' : 'Criar combo'}</DialogTitle></DialogHeader><div className="space-y-1"><Label htmlFor="combo-nome">Nome do combo</Label><Input id="combo-nome" value={form.nome} onChange={e => setForm(f => ({ ...f, nome:e.target.value }))}/></div><div className="space-y-1"><Label htmlFor="combo-descricao">Descrição curta do combo</Label><Input id="combo-descricao" maxLength={80} value={form.descricao_curta} onChange={e => setForm(f => ({ ...f, descricao_curta:e.target.value.replace(/[\r\n]+/g,' ') }))}/></div><div className="space-y-1"><Label htmlFor="combo-preco">Preço do combo (R$)</Label><Input id="combo-preco" type="number" min={0} step="0.01" value={form.preco} onChange={e => setForm(f => ({ ...f, preco:e.target.value }))}/><p className="text-xs text-muted-foreground">Valor de: {moeda(calculo.valorDe)}{calculo.economia > 0 && <span className="ml-2 text-success">Economia: {moeda(calculo.economia)}</span>}</p></div><Label className="flex gap-2 items-center"><Switch checked={form.destaque} onCheckedChange={destaque => setForm(f => ({ ...f,destaque }))}/>Destaque no cartão</Label><h4 className="text-sm font-semibold">Brindes da biblioteca</h4><Input aria-label="Buscar brindes do combo" value={busca} onChange={e => setBusca(e.target.value)} placeholder="Buscar brinde"/><div className="space-y-2">{biblioteca.filter(e => e.nome.toLowerCase().includes(busca.toLowerCase())).map(e => <Label key={e.id} className="flex items-center gap-2 border rounded p-2"><Checkbox checked={form.extras.includes(e.id)} aria-label={`Incluir ${e.nome} no combo`} onCheckedChange={v => setForm(f => ({ ...f, extras:v ? [...f.extras,e.id] : f.extras.filter(id => id!==e.id) }))}/>{e.imagem_url && <img src={e.imagem_url} alt={e.nome} className="h-8 w-8 object-cover rounded"/>}<span className="min-w-0 flex-1 break-words text-sm">{e.nome}</span><span className="text-xs text-muted-foreground">{moeda(e.preco ?? 0)}</span></Label>)}</div><div className="flex justify-end gap-2"><Button variant="outline" onClick={() => setAberto(false)}>Cancelar</Button><Button disabled={busy} onClick={() => void salvar()}>{busy && <Loader2 className="h-4 w-4 animate-spin mr-2"/>}Salvar combo</Button></div></DialogContent></Dialog><AlertDialog open={!!excluir} onOpenChange={v => !v && setExcluir(null)}><AlertDialogContent><AlertDialogHeader><AlertDialogTitle>Remover {excluir?.nome}?</AlertDialogTitle><AlertDialogDescription>Os brindes permanecem na biblioteca. Se não restar nenhum combo, os brindes fixos serão usados.</AlertDialogDescription></AlertDialogHeader><AlertDialogFooter><AlertDialogCancel>Cancelar</AlertDialogCancel><AlertDialogAction onClick={() => void remover()}>Remover</AlertDialogAction></AlertDialogFooter></AlertDialogContent></AlertDialog></section>;
}