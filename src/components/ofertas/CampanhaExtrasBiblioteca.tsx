import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { type Extra, type TipoExtra, atualizacaoExtraDoSite } from '@/lib/campanhaExtras';
import { moeda, type ProdutoCampanha } from '@/lib/campanhas';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogContent, AlertDialogHeader, AlertDialogTitle, AlertDialogDescription, AlertDialogFooter, AlertDialogCancel, AlertDialogAction } from '@/components/ui/alert-dialog';
import { Pencil, Trash2, Search, Loader2 } from 'lucide-react';
import { toast } from 'sonner';

export function ExtraFormulario({ extra, onSaved, onClose }: { extra?: Extra; onSaved: (e: Extra) => void; onClose?: () => void }) {
  const [form, setForm] = useState({ nome: extra?.nome ?? '', descricao: extra?.descricao ?? '', imagem_url: extra?.imagem_url ?? '', preco: extra?.preco == null ? '' : String(extra.preco), link: extra?.link ?? '' });
  const [busy, setBusy] = useState(false);
  async function upload(file?: File) {
    if (!file) return;
    if (!file.type.startsWith('image/')) { toast.error('Selecione uma imagem'); return; }
    setBusy(true);
    try {
      const path = `campanhas/extras/${crypto.randomUUID()}-${file.name.replace(/[^\w.-]/g, '_')}`;
      const { error } = await supabase.storage.from('catalogo-midias').upload(path, file, { contentType: file.type });
      if (error) throw error;
      setForm(f => ({ ...f, imagem_url: supabase.storage.from('catalogo-midias').getPublicUrl(path).data.publicUrl }));
    } catch { toast.error('Não foi possível enviar a foto'); } finally { setBusy(false); }
  }
  async function salvar() {
    if (!form.nome.trim()) { toast.error('Informe o nome'); return; }
    if (form.preco && (!Number.isFinite(Number(form.preco)) || Number(form.preco) < 0)) { toast.error('Informe um preço válido'); return; }
    if (form.link && !/^https?:\/\//i.test(form.link)) { toast.error('Informe um link http ou https'); return; }
    setBusy(true);
    const payload = { ...form, nome: form.nome.trim(), preco: form.preco === '' ? null : Number(form.preco), link: form.link.trim() || null };
    const result = extra ? await supabase.from('campanha_extras').update(payload).eq('id', extra.id).select().single() : await supabase.from('campanha_extras').insert({ ...payload, origem: 'manual' }).select().single();
    setBusy(false);
    if (result.error) { toast.error('Não foi possível salvar'); return; }
    toast.success('Item cadastrado'); onSaved(result.data);
  }
  return <div className="space-y-3">{(['nome', 'descricao', 'preco', 'link'] as const).map(key => <div className="space-y-1" key={key}><Label htmlFor={`extra-${key}`}>{({ nome: 'Nome', descricao: 'Descrição curta', preco: 'Preço normal (opcional)', link: 'Link (opcional)' })[key]}</Label>{key === 'descricao' ? <Textarea id={`extra-${key}`} value={form[key]} onChange={e => setForm(f => ({ ...f, [key]: e.target.value }))}/> : <Input id={`extra-${key}`} type={key === 'preco' ? 'number' : 'text'} min={0} step="0.01" value={form[key]} onChange={e => setForm(f => ({ ...f, [key]: e.target.value }))}/>}</div>)}<Label htmlFor="extra-foto">Foto</Label><Input id="extra-foto" type="file" accept="image/*" disabled={busy} onChange={e => void upload(e.target.files?.[0])}/>{form.imagem_url && <img src={form.imagem_url} alt={form.nome || 'Foto do item'} className="h-20 w-20 object-cover rounded"/>}<div className="flex justify-end gap-2">{onClose && <Button variant="outline" onClick={onClose}>Cancelar</Button>}<Button disabled={busy} onClick={() => void salvar()}>{busy && <Loader2 className="h-4 w-4 mr-2 animate-spin"/>}Salvar item</Button></div></div>;
}

export function AdicionarExtras({ itemId, tipo, onClose, onSaved }: { itemId: string; tipo: TipoExtra; onClose: () => void; onSaved: () => void }) {
  const [lista, setLista] = useState<Extra[]>([]);
  const [selecionados, setSelecionados] = useState<string[]>([]);
  const [termo, setTermo] = useState('');
  const [produtos, setProdutos] = useState<ProdutoCampanha[]>([]);
  const [pesquisou, setPesquisou] = useState(false);
  const [busy, setBusy] = useState(false);
  const [aba, setAba] = useState('biblioteca');
  const [existentes, setExistentes] = useState<string[]>([]);
  useEffect(() => { void Promise.all([supabase.from('campanha_extras').select('*').order('nome'), supabase.from('campanha_item_extras').select('extra_id').eq('campanha_item_id', itemId).eq('tipo', tipo)]).then(([a, b]) => { if (a.error || b.error) toast.error('Não foi possível carregar os itens'); else { setLista(a.data ?? []); setExistentes((b.data ?? []).map(v => v.extra_id)); } }); }, [itemId, tipo]);
  async function pesquisar() {
    setBusy(true);
    const { data, error } = await supabase.functions.invoke('buscar-produtos-shopify', { body: { modo: 'produtos', termo, limite: 50 } });
    setBusy(false);
    if (error || !data?.sucesso) { toast.error('Não foi possível buscar no site'); return; }
    setProdutos(data.produtos ?? []); setPesquisou(true);
  }
  async function cadastrarSite(p: ProdutoCampanha) {
    setBusy(true);
    const { data, error } = await supabase.from('campanha_extras').upsert({ nome: p.titulo, descricao: p.descricao, ...atualizacaoExtraDoSite(p), shopify_produto_id: p.produtoId, origem: 'shopify' }, { onConflict: 'shopify_produto_id' }).select().single();
    setBusy(false);
    if (error) { toast.error('Não foi possível cadastrar o item do site'); return; }
    setLista(l => [...l.filter(e => e.id !== data.id), data]); setSelecionados(s => [...new Set([...s, data.id])]); setAba('biblioteca'); toast.success('Item selecionado');
  }
  async function adicionar() {
    setBusy(true);
    const { data: ordem, error: ordemError } = await supabase.from('campanha_item_extras').select('ordem').eq('campanha_item_id', itemId).eq('tipo', tipo).order('ordem', { ascending: false }).limit(1);
    if (ordemError) { setBusy(false); toast.error('Não foi possível adicionar'); return; }
    const { error } = await supabase.from('campanha_item_extras').upsert(selecionados.filter(id => !existentes.includes(id)).map((id, i) => ({ campanha_item_id: itemId, extra_id: id, tipo, ordem: (ordem?.[0]?.ordem ?? -1) + 1 + i })), { onConflict: 'campanha_item_id,extra_id,tipo', ignoreDuplicates: true });
    setBusy(false);
    if (error) { toast.error('Não foi possível adicionar'); return; }
    toast.success('Itens adicionados'); onSaved(); onClose();
  }
  return <Dialog open onOpenChange={v => !v && onClose()}><DialogContent className="w-[calc(100%-1rem)] max-w-2xl max-h-[90dvh] overflow-y-auto"><DialogHeader><DialogTitle>Adicionar {tipo === 'brinde' ? 'brindes' : 'upsells'}</DialogTitle></DialogHeader><Tabs value={aba} onValueChange={setAba}><TabsList className="grid w-full grid-cols-3 h-auto"><TabsTrigger value="biblioteca" className="text-xs px-1 whitespace-normal">Já cadastrados</TabsTrigger><TabsTrigger value="site" className="text-xs px-1 whitespace-normal">Buscar no site</TabsTrigger><TabsTrigger value="manual" className="text-xs px-1 whitespace-normal">Criar manual</TabsTrigger></TabsList><TabsContent value="biblioteca" className="space-y-3"><Input aria-label="Buscar na biblioteca" placeholder="Buscar item" value={termo} onChange={e => setTermo(e.target.value)}/>{lista.filter(e => e.nome.toLowerCase().includes(termo.toLowerCase())).map(e => <label key={e.id} className="flex items-center gap-3 border rounded p-2 min-w-0"><Checkbox aria-label={`Selecionar ${e.nome}`} disabled={busy || existentes.includes(e.id)} checked={existentes.includes(e.id) || selecionados.includes(e.id)} onCheckedChange={v => setSelecionados(s => v ? [...s, e.id] : s.filter(id => id !== e.id))}/>{e.imagem_url && <img src={e.imagem_url} alt={e.nome} className="w-10 h-10 object-cover rounded"/>}<span className="text-sm break-words min-w-0">{e.nome}{existentes.includes(e.id) && <small className="block text-muted-foreground">Já adicionado</small>}</span></label>)}{!lista.length && <p className="text-sm text-muted-foreground">Nenhum item cadastrado.</p>}</TabsContent><TabsContent value="site" className="space-y-3"><form className="flex gap-2" onSubmit={e => { e.preventDefault(); void pesquisar(); }}><Input aria-label="Buscar extras no site" placeholder="Ex.: Patola" value={termo} onChange={e => setTermo(e.target.value)}/><Button disabled={busy}><Search className="h-4 w-4 mr-1"/>Buscar</Button></form>{produtos.map(p => <div key={p.produtoId} className="flex items-center gap-2 border rounded p-2 min-w-0">{p.imagens[0] && <img src={p.imagens[0]} alt={p.titulo} className="h-10 w-10 object-cover"/>}<div className="flex-1 min-w-0 text-sm break-words">{p.titulo}<p className="text-xs text-muted-foreground">{moeda(p.preco)}</p></div><Button size="sm" disabled={busy || lista.some(e => e.shopify_produto_id === p.produtoId)} onClick={() => void cadastrarSite(p)}>{lista.some(e => e.shopify_produto_id === p.produtoId) ? 'Cadastrado' : 'Escolher'}</Button></div>)}{pesquisou && !produtos.length && <p className="text-sm text-muted-foreground">Nenhum produto encontrado.</p>}</TabsContent><TabsContent value="manual"><ExtraFormulario onSaved={e => { setLista(l => [...l, e]); setSelecionados(s => [...s, e.id]); setTermo(''); setAba('biblioteca'); }}/></TabsContent></Tabs><DialogFooter><Button variant="outline" onClick={onClose}>Fechar</Button><Button disabled={busy || !selecionados.filter(id => !existentes.includes(id)).length} onClick={() => void adicionar()}>Adicionar selecionados</Button></DialogFooter></DialogContent></Dialog>;
}

export function CampanhaExtrasBiblioteca({ versao = 0 }: { versao?: number }) {
  const [lista, setLista] = useState<Extra[]>([]);
  const [usos, setUsos] = useState<Record<string, number>>({});
  const [editar, setEditar] = useState<Extra | null>(null);
  const [excluir, setExcluir] = useState<Extra | null>(null);
  const [busca, setBusca] = useState('');
  async function carregar() {
    const [a, b] = await Promise.all([supabase.from('campanha_extras').select('*').order('nome'), supabase.from('campanha_item_extras').select('extra_id')]);
    if (a.error || b.error) { toast.error('Não foi possível carregar a biblioteca'); return; }
    setLista(a.data ?? []); setUsos((b.data ?? []).reduce<Record<string, number>>((r, v) => ({ ...r, [v.extra_id]: (r[v.extra_id] ?? 0) + 1 }), {}));
  }
  useEffect(() => { void carregar(); }, [versao]);
  async function remover() {
    if (!excluir) return;
    const { error } = await supabase.from('campanha_extras').delete().eq('id', excluir.id);
    if (error) { toast.error('Não foi possível excluir'); return; }
    setExcluir(null); toast.success('Item excluído'); void carregar();
  }
  return <section className="space-y-3 border-t pt-6"><h2 className="font-semibold">Brindes e upsells cadastrados</h2><p className="text-xs text-muted-foreground">Cadastre Patola, Multitool, Cinto etc. uma vez e reaproveite em qualquer faca.</p><Input aria-label="Filtrar biblioteca" placeholder="Buscar item cadastrado" value={busca} onChange={e => setBusca(e.target.value)}/>{lista.filter(e => e.nome.toLowerCase().includes(busca.toLowerCase())).map(e => <div key={e.id} className="flex items-center gap-3 border rounded p-2 min-w-0">{e.imagem_url && <img src={e.imagem_url} alt={e.nome} className="h-12 w-12 rounded object-cover shrink-0"/>}<div className="flex-1 min-w-0"><p className="text-sm font-medium break-words">{e.nome}</p><p className="text-xs text-muted-foreground">{e.preco == null ? 'Sem preço' : moeda(e.preco)} · {e.origem === 'shopify' ? 'Shopify' : 'Manual'}{usos[e.id] ? ` · Em uso em ${usos[e.id]} vínculo(s)` : ''}</p></div><Button size="icon" variant="ghost" aria-label={`Editar extra ${e.nome}`} onClick={() => setEditar(e)}><Pencil className="h-4 w-4"/></Button><Button size="icon" variant="ghost" aria-label={`Excluir extra ${e.nome}`} onClick={() => setExcluir(e)}><Trash2 className="h-4 w-4 text-destructive"/></Button></div>)}{!lista.length && <p className="text-sm text-muted-foreground">Nenhum brinde ou upsell cadastrado.</p>}{editar && <Dialog open onOpenChange={v => !v && setEditar(null)}><DialogContent className="w-[calc(100%-1rem)] max-h-[90dvh] overflow-y-auto"><DialogHeader><DialogTitle>Editar item da biblioteca</DialogTitle></DialogHeader>{usos[editar.id] > 0 && <p className="text-sm text-muted-foreground">Em uso em {usos[editar.id]} vínculo(s). Alterações aparecerão em todos eles.</p>}<ExtraFormulario extra={editar} onClose={() => setEditar(null)} onSaved={() => { setEditar(null); void carregar(); }}/></DialogContent></Dialog>}<AlertDialog open={!!excluir} onOpenChange={v => !v && setExcluir(null)}><AlertDialogContent><AlertDialogHeader><AlertDialogTitle>Excluir {excluir?.nome}?</AlertDialogTitle><AlertDialogDescription>{excluir && usos[excluir.id] ? `Em uso em ${usos[excluir.id]} vínculo(s). Será removido de todos os produtos que o utilizam.` : 'O item será excluído da biblioteca.'}</AlertDialogDescription></AlertDialogHeader><AlertDialogFooter><AlertDialogCancel>Cancelar</AlertDialogCancel><AlertDialogAction onClick={() => void remover()}>Excluir</AlertDialogAction></AlertDialogFooter></AlertDialogContent></AlertDialog></section>;
}