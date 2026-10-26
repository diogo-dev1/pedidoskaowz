import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { type Campanha, type CampanhaItem, type ProdutoCampanha, moeda, linkCampanha, atualizacaoDoSite } from '@/lib/campanhas';
import CampanhaItemEditor from '@/components/ofertas/CampanhaItemEditor';
import { CampanhaExtrasBiblioteca } from '@/components/ofertas/CampanhaExtrasBiblioteca';
import { atualizacaoExtraDoSite } from '@/lib/campanhaExtras';
import { limparDescricao } from '@/lib/campanhaCombos';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Checkbox } from '@/components/ui/checkbox';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogContent, AlertDialogHeader, AlertDialogTitle, AlertDialogDescription, AlertDialogFooter, AlertDialogCancel, AlertDialogAction } from '@/components/ui/alert-dialog';
import { ArrowLeft, ArrowUp, ArrowDown, Copy, ExternalLink, Plus, Search, RefreshCw, Pencil, Trash2, Loader2, Tag } from 'lucide-react';
import { toast } from 'sonner';

const vazio = { titulo: '', slug: '', subtitulo: '', aviso_prazo: '', texto_pix_padrao: '', texto_parcelamento_padrao: '', imagem_porte_url: '', imagem_kit_url: '', video_teste_url: '', ativo: true };
type Form = typeof vazio;
function dados(c: Campanha): Form { return { titulo: c.titulo, slug: c.slug, subtitulo: c.subtitulo ?? '', aviso_prazo: c.aviso_prazo ?? '', texto_pix_padrao: c.texto_pix_padrao ?? '', texto_parcelamento_padrao: c.texto_parcelamento_padrao ?? '', imagem_porte_url: c.imagem_porte_url ?? '', imagem_kit_url: c.imagem_kit_url ?? '', video_teste_url: c.video_teste_url ?? '', ativo: c.ativo }; }

export default function CampanhasAdmin() {
  const { profile } = useAuth();
  const [campanhas, setCampanhas] = useState<Campanha[]>([]);
  const [campanha, setCampanha] = useState<Campanha | null>(null);
  const [form, setForm] = useState<Form>(vazio);
  const [itens, setItens] = useState<CampanhaItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [uploadPorte, setUploadPorte] = useState(false);
  const [uploadKit, setUploadKit] = useState(false);
  const [uploadVideo, setUploadVideo] = useState(false);
  const [nova, setNova] = useState(false);
  const [editando, setEditando] = useState<CampanhaItem | null>(null);
  const [excluir, setExcluir] = useState<CampanhaItem | null>(null);
  const [buscar, setBuscar] = useState(false);
  const [termo, setTermo] = useState('');
  const [produtos, setProdutos] = useState<ProdutoCampanha[]>([]);
  const [selecionados, setSelecionados] = useState<string[]>([]);
  const [buscando, setBuscando] = useState(false);
  const [pesquisou, setPesquisou] = useState(false);
  const [bibliotecaVersao, setBibliotecaVersao] = useState(0);
  const admin = profile?.cargo === 'admin';
  async function carregarCampanhas() {
    const { data, error } = await supabase.from('campanhas_oferta').select('*').order('created_at', { ascending: false });
    if (error) toast.error('Não foi possível carregar as campanhas'); else setCampanhas(data ?? []);
    setLoading(false);
  }
  async function carregarItens(id: string) {
    const { data, error } = await supabase.from('campanha_itens').select('*').eq('campanha_id', id).order('ordem').order('created_at');
    if (error) toast.error('Não foi possível carregar os produtos'); else setItens(data ?? []);
  }
  useEffect(() => { if (admin) void carregarCampanhas(); }, [admin]);
  async function abrir(c: Campanha) { setCampanha(c); setForm(dados(c)); setItens([]); await carregarItens(c.id); }
  async function salvar(criar = false) {
    const payload = { ...form, titulo: form.titulo.trim(), slug: form.slug.trim().toLowerCase(), video_teste_url: form.video_teste_url.trim() || null };
    if (!payload.titulo || !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(payload.slug)) { toast.error('Informe título e link com letras minúsculas, números e hífens'); return; }
    if (payload.video_teste_url) {
      try { if (!['https:', 'http:'].includes(new URL(payload.video_teste_url).protocol)) throw new Error(); }
      catch { toast.error('Informe uma URL válida de vídeo (http ou https)'); return; }
    }
    setBusy(true);
    const result = criar ? await supabase.from('campanhas_oferta').insert(payload).select().single() : await supabase.from('campanhas_oferta').update(payload).eq('id', campanha?.id ?? '').select().single();
    setBusy(false);
    if (result.error) { toast.error(result.error.code === '23505' ? 'Este link já está em uso' : 'Não foi possível salvar a campanha'); return; }
    setCampanha(result.data); setForm(dados(result.data)); if (criar) setItens([]); setNova(false); toast.success('Campanha salva'); void carregarCampanhas();
  }
  async function enviarPorte(file: File | undefined, destino: 'porte' | 'kit' = 'porte') {
    if (!file) return;
    if (!file.type.startsWith('image/')) { toast.error('Escolha uma imagem'); return; }
    const setUpload = destino === 'kit' ? setUploadKit : setUploadPorte;
    setUpload(true);
    try {
      const path = `campanhas/${campanha?.id ?? 'nova'}/${destino}-${crypto.randomUUID()}-${file.name.replace(/[^\w.-]/g, '_')}`;
      const { error } = await supabase.storage.from('catalogo-midias').upload(path, file, { contentType: file.type });
      if (error) throw error;
      const url = supabase.storage.from('catalogo-midias').getPublicUrl(path).data.publicUrl;
      setForm(f => ({ ...f, [destino === 'kit' ? 'imagem_kit_url' : 'imagem_porte_url']: url }));
      toast.success('Foto enviada. Salve a campanha para publicar a alteração.');
    } catch { toast.error('Não foi possível enviar a foto'); }
    finally { setUpload(false); }
  }
  async function enviarVideo(file: File | undefined) {
    if (!file) return;
    if (!/\.(mp4|webm|mov)$/i.test(file.name)) { toast.error('Escolha um vídeo mp4, webm ou mov'); return; }
    setUploadVideo(true);
    try {
      const path = `campanhas/${campanha?.id ?? 'nova'}/teste-${crypto.randomUUID()}-${file.name.replace(/[^\w.-]/g, '_')}`;
      const tipo = file.type || (/\.webm$/i.test(file.name) ? 'video/webm' : /\.mov$/i.test(file.name) ? 'video/quicktime' : 'video/mp4');
      const { error } = await supabase.storage.from('catalogo-midias').upload(path, file, { contentType: tipo });
      if (error) throw error;
      setForm(f => ({ ...f, video_teste_url: supabase.storage.from('catalogo-midias').getPublicUrl(path).data.publicUrl }));
      toast.success('Vídeo enviado. Salve a campanha para publicar a alteração.');
    } catch { toast.error('Não foi possível enviar o vídeo'); }
    finally { setUploadVideo(false); }
  }
  async function pesquisar() {
    setBuscando(true); setPesquisou(false);
    try {
      const { data, error } = await supabase.functions.invoke('buscar-produtos-shopify', { body: { modo: 'produtos', termo, limite: 50 } });
      if (error || !data?.sucesso) throw new Error();
      setProdutos(data.produtos ?? []); setPesquisou(true);
    } catch { toast.error('Não foi possível buscar os produtos do site'); } finally { setBuscando(false); }
  }
  async function adicionar() {
    if (!campanha || !selecionados.length) return;
    setBusy(true);
    const novos = produtos.filter(p => selecionados.includes(p.produtoId) && !itens.some(i => i.shopify_produto_id === p.produtoId));
    const ordem = Math.max(-1, ...itens.map(i => i.ordem)) + 1;
    const { error } = await supabase.from('campanha_itens').insert(novos.map((p, i) => ({ campanha_id: campanha.id, shopify_produto_id: p.produtoId, titulo: p.titulo, descricao: limparDescricao(p.descricao), ...atualizacaoDoSite(p), ordem: ordem + i })));
    setBusy(false);
    if (error) { toast.error('Não foi possível adicionar os produtos; atualize a lista e tente novamente'); void carregarItens(campanha.id); return; }
    toast.success(`${novos.length} produtos adicionados`); setBuscar(false); setSelecionados([]); void carregarItens(campanha.id);
  }
  async function atualizarSite() {
    if (!campanha) return;
    setBusy(true);
    try {
      const encontrados: ProdutoCampanha[] = [];
      const { data: extras, error: extrasErro } = await supabase.from('campanha_extras').select('*').eq('origem', 'shopify');
      if (extrasErro) throw extrasErro;
      const itensSite = itens.filter(x => !x.shopify_produto_id.startsWith('manual:'));
      const ids = [...new Set([...itensSite.map(x => x.shopify_produto_id), ...(extras ?? []).map(x => x.shopify_produto_id)].filter((id): id is string => !!id))];
      for (let i = 0; i < ids.length; i += 250) {
        const { data, error } = await supabase.functions.invoke('buscar-produtos-shopify', { body: { modo: 'produtos', ids: ids.slice(i, i + 250) } });
        if (error || !data?.sucesso) throw new Error();
        encontrados.push(...data.produtos);
      }
      let total = 0;
      for (const item of itensSite) {
        const p = encontrados.find(x => x.produtoId === item.shopify_produto_id);
        if (!p) continue;
        const { error } = await supabase.from('campanha_itens').update({ ...atualizacaoDoSite(p), descricao: limparDescricao(item.descricao) }).eq('id', item.id);
        if (error) throw new Error(); total++;
      }
      let totalExtras = 0;
      for (const extra of extras ?? []) {
        const p = encontrados.find(x => x.produtoId === extra.shopify_produto_id);
        if (!p) continue;
        const { error } = await supabase.from('campanha_extras').update({ ...atualizacaoExtraDoSite(p), descricao: limparDescricao(extra.descricao) }).eq('id', extra.id);
        if (error) throw error;
        totalExtras++;
      }
      toast.success(`${total} produtos e ${totalExtras} extras atualizados do site`);
      if (total < itensSite.length) toast.warning('Alguns produtos não estão mais disponíveis no site');
    } catch { toast.error('Não foi possível concluir a atualização de todos os produtos'); }
    finally { setBusy(false); setBibliotecaVersao(v => v + 1); void carregarItens(campanha.id); }
  }
  async function mover(index: number, direcao: number) {
    if (!campanha || index + direcao < 0 || index + direcao >= itens.length) return;
    const lista = [...itens]; [lista[index], lista[index + direcao]] = [lista[index + direcao], lista[index]];
    setBusy(true);
    const results = await Promise.all(lista.map((item, ordem) => supabase.from('campanha_itens').update({ ordem }).eq('id', item.id)));
    setBusy(false); if (results.some(r => r.error)) toast.error('Não foi possível salvar a ordem');
    await carregarItens(campanha.id);
  }
  async function alternar(item: CampanhaItem, ativo: boolean) {
    const { error } = await supabase.from('campanha_itens').update({ ativo }).eq('id', item.id);
    if (error) toast.error('Não foi possível alterar o produto'); else setItens(list => list.map(i => i.id === item.id ? { ...i, ativo } : i));
  }
  async function remover() {
    if (!excluir || !campanha) return;
    const { error } = await supabase.from('campanha_itens').delete().eq('id', excluir.id);
    if (error) toast.error('Não foi possível remover o produto'); else { toast.success('Produto removido'); void carregarItens(campanha.id); }
    setExcluir(null);
  }
  async function copiar(c: Campanha) { try { await navigator.clipboard.writeText(linkCampanha(c.slug)); toast.success('Link copiado'); } catch { toast.error('Não foi possível copiar o link'); } }
  const campos = <div className="grid gap-4 sm:grid-cols-2">{([['titulo', 'Título'], ['slug', 'Link da campanha (slug)'], ['subtitulo', 'Subtítulo'], ['aviso_prazo', 'Aviso de prazo'], ['texto_pix_padrao', 'Pix padrão'], ['texto_parcelamento_padrao', 'Parcelamento padrão']] as const).map(([key, label]) => <div key={key} className="space-y-1.5"><Label htmlFor={`campanha-${key}`}>{label}</Label><Input id={`campanha-${key}`} value={form[key]} onChange={e => setForm(f => ({ ...f, [key]: e.target.value }))}/></div>)}<Label className="flex items-center gap-3"><Switch checked={form.ativo} onCheckedChange={ativo => setForm(f => ({ ...f, ativo }))}/>Campanha ativa</Label></div>;
  if (!admin) return <div className="p-4 text-muted-foreground">Apenas administradores podem gerenciar campanhas.</div>;
  return <div className="max-w-6xl mx-auto w-full min-w-0 px-2 sm:px-4 py-4 space-y-6">
    <header className="flex flex-wrap items-center justify-between gap-3"><div><h1 className="text-xl font-semibold flex items-center gap-2"><Tag className="h-5 w-5 text-accent"/>Campanhas de oferta</h1><p className="text-xs text-muted-foreground mt-1">Escolha os produtos, ajuste a oferta e compartilhe o link com seus clientes.</p></div>{!campanha && <Button onClick={() => { setForm(vazio); setNova(true); }}><Plus className="h-4 w-4 mr-2"/>Nova campanha</Button>}</header>
    {!campanha ? loading ? <Loader2 className="h-5 w-5 animate-spin"/> : <div className="grid gap-3 sm:grid-cols-2">{campanhas.map(c => <article key={c.id} className="border bg-card rounded-lg p-4 space-y-3 min-w-0"><div className="flex justify-between gap-2"><h2 className="font-medium break-words">{c.titulo}</h2><Badge variant={c.ativo ? 'default' : 'secondary'}>{c.ativo ? 'Ativa' : 'Inativa'}</Badge></div><p className="truncate text-xs text-muted-foreground">/ofertas/{c.slug}</p><div className="flex flex-wrap gap-2"><Button size="sm" onClick={() => void abrir(c)}><Pencil className="h-3.5 w-3.5 mr-1"/>Gerenciar</Button><Button size="sm" variant="outline" onClick={() => void copiar(c)}><Copy className="h-3.5 w-3.5 mr-1"/>Copiar link</Button><Button size="sm" variant="outline" asChild><a href={linkCampanha(c.slug)} target="_blank" rel="noopener noreferrer"><ExternalLink className="h-3.5 w-3.5 mr-1"/>Abrir página</a></Button></div></article>)}{!campanhas.length && <p className="text-sm text-muted-foreground">Nenhuma campanha cadastrada. Comece em Nova campanha.</p>}</div> : <>
      <div className="flex flex-wrap gap-2"><Button variant="ghost" onClick={() => setCampanha(null)}><ArrowLeft className="h-4 w-4 mr-2"/>Campanhas</Button><Button variant="outline" onClick={() => void copiar(campanha)}><Copy className="h-4 w-4 mr-2"/>Copiar link</Button><Button variant="outline" asChild><a href={linkCampanha(campanha.slug)} target="_blank" rel="noopener noreferrer"><ExternalLink className="h-4 w-4 mr-2"/>Abrir página</a></Button></div>
      <section className="space-y-4 border-b pb-6"><h2 className="font-semibold">Dados da campanha</h2>{campos}
        <div className="space-y-2"><Label htmlFor="foto-porte">Foto do porte (bainha + clipe)</Label><Input id="foto-porte" type="file" accept="image/*" disabled={uploadPorte} onChange={e => { void enviarPorte(e.target.files?.[0]); e.target.value = ''; }}/>{uploadPorte && <Loader2 className="h-4 w-4 animate-spin"/>}
          {form.imagem_porte_url && <div className="space-y-2"><img src={form.imagem_porte_url} alt="Prévia da foto do porte" className="aspect-[4/5] w-40 rounded-lg border bg-muted object-contain"/><Button size="sm" variant="outline" onClick={() => setForm(f => ({ ...f, imagem_porte_url: '' }))}><Trash2 className="mr-2 h-4 w-4"/>Remover foto</Button></div>}
        </div>
        <div className="space-y-2"><Label htmlFor="banner-kit">Banner do Kit Completo</Label><Input id="banner-kit" type="file" accept="image/*" disabled={uploadKit || busy} onChange={e => { void enviarPorte(e.target.files?.[0], 'kit'); e.target.value = ''; }}/>{uploadKit && <Loader2 className="h-4 w-4 animate-spin"/>}
          {form.imagem_kit_url && <div className="space-y-2"><img src={form.imagem_kit_url} alt="Prévia do banner do Kit Completo" className="aspect-[4/3] w-60 max-w-full rounded-lg border bg-muted object-contain"/><Button size="sm" variant="outline" onClick={() => setForm(f => ({ ...f, imagem_kit_url: '' }))}><Trash2 className="mr-2 h-4 w-4"/>Remover banner</Button></div>}
        </div>
        <div className="space-y-2"><Label htmlFor="video-teste-arquivo">Vídeo de teste (formato reels/vertical)</Label>
          <Input id="video-teste-arquivo" type="file" accept="video/mp4,video/webm,video/quicktime,.mp4,.webm,.mov" disabled={uploadVideo || busy} onChange={e => { void enviarVideo(e.target.files?.[0]); e.target.value = ''; }}/>
          <Label htmlFor="video-teste-url" className="text-xs text-muted-foreground">Ou cole a URL do vídeo</Label>
          <Input id="video-teste-url" type="url" placeholder="https://…/video.mp4" value={form.video_teste_url} disabled={uploadVideo || busy} onChange={e => setForm(f => ({ ...f, video_teste_url: e.target.value }))}/>
          <p className="text-xs text-muted-foreground">Aparece na página /sls depois de 'Como chegamos a 15 dias úteis'. Vazio = seção escondida.</p>
          {uploadVideo && <Loader2 className="h-4 w-4 animate-spin" aria-label="Enviando vídeo"/>}
          {form.video_teste_url && <div className="space-y-2"><video key={form.video_teste_url} src={form.video_teste_url} muted playsInline controls preload="metadata" aria-label="Prévia do vídeo de teste" className="aspect-[9/16] w-48 rounded-lg border bg-[hsl(var(--oferta-preto))] object-contain"/><Button size="sm" variant="outline" disabled={uploadVideo || busy} onClick={() => setForm(f => ({ ...f, video_teste_url: '' }))}><Trash2 className="mr-2 h-4 w-4"/>Remover vídeo</Button></div>}
        </div>
        <p className="text-xs text-muted-foreground">Pix e parcelamento padrão aparecem quando o produto não tiver um texto próprio. Salve antes de compartilhar.</p><Button disabled={busy || uploadPorte || uploadKit || uploadVideo} onClick={() => void salvar()}>{busy && <Loader2 className="h-4 w-4 mr-2 animate-spin"/>}Salvar campanha</Button></section>
      <section className="space-y-3"><div className="flex justify-between gap-3 flex-wrap"><div><h2 className="font-semibold">Produtos ({itens.length})</h2><p className="text-xs text-muted-foreground mt-1">Busque no site para adicionar produtos. Editar permite personalizar cada oferta.</p></div><div className="flex gap-2 flex-wrap"><Button onClick={() => { setTermo(campanha.slug === 'push-dagger-sls' ? 'SLS' : ''); setProdutos([]); setPesquisou(false); setSelecionados([]); setBuscar(true); }}><Search className="h-4 w-4 mr-2"/>Buscar no site</Button><Button variant="outline" disabled={busy || !itens.length} onClick={() => void atualizarSite()}><RefreshCw className={`h-4 w-4 mr-2 ${busy ? 'animate-spin' : ''}`}/>Atualizar do site</Button></div></div>
        <p className="text-xs text-muted-foreground">Atualizar do site troca apenas preços, imagens e link. Seus títulos, descrições e condições permanecem.</p>
        {itens.map((item, i) => { const midias = item.midias as unknown as {url: string; tipo: string}[]; const foto = midias.find(m => m.tipo === 'imagem'); return <article key={item.id} className="flex flex-wrap sm:flex-nowrap items-center gap-3 border bg-card rounded-lg p-3 min-w-0">{foto && <img src={foto.url} alt={item.titulo} className="w-14 h-16 object-cover rounded shrink-0"/>}<div className="flex-1 min-w-0"><h3 className="text-sm font-medium truncate">{item.titulo}</h3><p className="text-xs text-muted-foreground">{item.valor != null ? moeda(item.valor) : 'Sem valor'}</p></div><div className="flex gap-1 items-center flex-wrap"><Switch aria-label={`Ativar ${item.titulo}`} checked={item.ativo} onCheckedChange={ativo => void alternar(item, ativo)}/><Button size="icon" variant="ghost" disabled={busy || i === 0} title="Subir produto" aria-label={`Subir ${item.titulo}`} onClick={() => void mover(i, -1)}><ArrowUp className="h-4 w-4"/></Button><Button size="icon" variant="ghost" disabled={busy || i === itens.length - 1} title="Descer produto" aria-label={`Descer ${item.titulo}`} onClick={() => void mover(i, 1)}><ArrowDown className="h-4 w-4"/></Button><Button size="icon" variant="ghost" title="Editar produto" aria-label={`Editar ${item.titulo}`} onClick={() => setEditando(item)}><Pencil className="h-4 w-4"/></Button><Button size="icon" variant="ghost" title="Remover produto" aria-label={`Remover ${item.titulo}`} onClick={() => setExcluir(item)}><Trash2 className="h-4 w-4 text-destructive"/></Button></div></article>; })}
        {!itens.length && <p className="text-sm text-muted-foreground py-6">Nenhum produto nesta campanha. Use Buscar no site para escolher os primeiros.</p>}
      </section>
      <CampanhaExtrasBiblioteca versao={bibliotecaVersao}/>
    </>}
    <Dialog open={nova} onOpenChange={setNova}><DialogContent className="w-[calc(100%-1rem)] max-h-[90dvh] overflow-y-auto"><DialogHeader><DialogTitle>Nova campanha</DialogTitle></DialogHeader>{campos}<DialogFooter><Button variant="outline" onClick={() => setNova(false)}>Cancelar</Button><Button disabled={busy} onClick={() => void salvar(true)}>Criar campanha</Button></DialogFooter></DialogContent></Dialog>
    <Dialog open={buscar} onOpenChange={setBuscar}><DialogContent className="w-[calc(100%-1rem)] max-w-3xl max-h-[90dvh] overflow-y-auto"><DialogHeader><DialogTitle>Buscar produtos no site</DialogTitle></DialogHeader><p className="text-xs text-muted-foreground">Pesquise e marque os produtos que deseja incluir. Cada produto aparece uma vez, pelo menor preço.</p><form className="flex gap-2" onSubmit={e => { e.preventDefault(); void pesquisar(); }}><Input aria-label="Termo de busca no site" placeholder="Ex.: SLS" value={termo} onChange={e => setTermo(e.target.value)}/><Button disabled={buscando} type="submit">{buscando ? <Loader2 className="h-4 w-4 animate-spin"/> : <Search className="h-4 w-4 mr-1"/>}Buscar</Button></form>
      <div className="space-y-2">{produtos.map(p => { const existe = itens.some(i => i.shopify_produto_id === p.produtoId); return <label key={p.produtoId} className="flex items-center gap-3 border rounded-lg p-2 min-w-0 cursor-pointer"><Checkbox aria-label={`Selecionar ${p.titulo}`} disabled={existe || busy} checked={existe || selecionados.includes(p.produtoId)} onCheckedChange={v => setSelecionados(ids => v ? [...ids, p.produtoId] : ids.filter(id => id !== p.produtoId))}/>{p.imagens[0] && <img src={p.imagens[0]} alt={p.titulo} className="w-12 h-14 object-cover shrink-0"/>}<div className="flex-1 min-w-0"><p className="text-sm font-medium break-words">{p.titulo}</p><p className="text-xs text-muted-foreground">{moeda(p.preco)}</p>{existe && <Badge variant="secondary" className="text-xs">Já na campanha</Badge>}</div></label>; })}{pesquisou && !produtos.length && <p className="text-sm text-muted-foreground py-4">Nenhum produto encontrado. Tente outro termo.</p>}</div><DialogFooter><Button variant="outline" onClick={() => setBuscar(false)}>Fechar</Button><Button disabled={busy || !selecionados.length} onClick={() => void adicionar()}>{busy && <Loader2 className="h-4 w-4 mr-2 animate-spin"/>}Adicionar selecionados ({selecionados.length})</Button></DialogFooter>
    </DialogContent></Dialog>
    {editando && <CampanhaItemEditor item={editando} onClose={() => { setEditando(null); setBibliotecaVersao(v => v + 1); }} onSaved={() => { if (campanha) void carregarItens(campanha.id); }}/>}<AlertDialog open={!!excluir} onOpenChange={o => !o && setExcluir(null)}><AlertDialogContent><AlertDialogHeader><AlertDialogTitle>Remover produto da campanha?</AlertDialogTitle><AlertDialogDescription>{excluir?.titulo} será removido apenas desta campanha. O produto no Shopify não será alterado.</AlertDialogDescription></AlertDialogHeader><AlertDialogFooter><AlertDialogCancel>Cancelar</AlertDialogCancel><AlertDialogAction onClick={() => void remover()}>Remover</AlertDialogAction></AlertDialogFooter></AlertDialogContent></AlertDialog>
  </div>;
}