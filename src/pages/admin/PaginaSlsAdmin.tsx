import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card } from '@/components/ui/card';
import { ArrowDown, ArrowUp, ExternalLink, Loader2, Plus, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { type ConteudoSls, PADRAO_SLS, SLUG_PAGINA_SLS, mesclarConteudoSls } from '@/lib/paginaSls';
import { SlsBlocosEditor, SlsImagemEditor } from '@/components/ofertas/SlsConteudoEditor';
import type { ImagemSls } from '@/lib/paginaSls';

function mover<T>(arr: T[], i: number, d: number) {
  const j = i + d; if (j < 0 || j >= arr.length) return arr;
  const a = [...arr]; [a[i], a[j]] = [a[j], a[i]]; return a;
}

function Secao({ titulo, children }: { titulo: string; children: React.ReactNode }) {
  return <Card className="space-y-3 p-4"><h2 className="font-semibold">{titulo}</h2>{children}</Card>;
}

export default function PaginaSlsAdmin() {
  const [c, setC] = useState<ConteudoSls | null>(null);
  const [busy, setBusy] = useState(false);
  const [upload, setUpload] = useState(false);
  const [url, setUrl] = useState('');
  const [imageUploads, setImageUploads] = useState(0);
  const imagemBusy = (v: boolean) => setImageUploads(n => Math.max(0, n + (v ? 1 : -1)));

  useEffect(() => {
    void supabase.from('paginas_venda_config').select('conteudo').eq('slug', SLUG_PAGINA_SLS).maybeSingle()
      .then(({ data }) => setC(mesclarConteudoSls(data?.conteudo)));
  }, []);

  if (!c) return <div className="flex justify-center py-16"><Loader2 className="h-5 w-5 animate-spin"/></div>;
  const set = <K extends keyof ConteudoSls>(k: K, v: ConteudoSls[K]) => setC({ ...c, [k]: v });
  const texto = (k: keyof ConteudoSls, label: string, area = false) => <div className="space-y-1.5">
    <Label htmlFor={k}>{label}</Label>
    {area ? <Textarea id={k} value={c[k] as string} onChange={e => set(k, e.target.value as never)}/> : <Input id={k} value={c[k] as string} onChange={e => set(k, e.target.value as never)}/>}
  </div>;
  const linhas = (k: keyof ConteudoSls, label: string) => <div className="space-y-1.5">
    <Label htmlFor={k}>{label} <span className="text-xs text-muted-foreground">(um por linha)</span></Label>
    <Textarea id={k} rows={4} value={(c[k] as string[]).join('\n')} onChange={e => set(k, e.target.value.split('\n') as never)}/>
  </div>;

  async function enviar(files: FileList | null) {
    if (!files?.length || !c) return;
    setUpload(true);
    const novos = [];
    for (const f of Array.from(files)) {
      if (!f.type.startsWith('video/')) { toast.error(`${f.name} não é um vídeo`); continue; }
      const path = `paginas/sls/${crypto.randomUUID()}-${f.name.replace(/[^\w.-]/g, '_')}`;
      const { error } = await supabase.storage.from('catalogo-midias').upload(path, f, { contentType: f.type });
      if (error) { toast.error(`Não foi possível enviar ${f.name}`); continue; }
      novos.push({ url: supabase.storage.from('catalogo-midias').getPublicUrl(path).data.publicUrl, legenda: '' });
    }
    setC(prev => prev && { ...prev, videos: [...prev.videos, ...novos] });
    setUpload(false);
    if (novos.length) toast.success('Vídeo adicionado. Lembre de salvar.');
  }

  function addUrl() {
    if (!c) return;
    try { if (!/^https?:$/.test(new URL(url).protocol)) throw 0; } catch { toast.error('Informe um link http ou https válido'); return; }
    set('videos', [...c.videos, { url: url.trim(), legenda: '' }]); setUrl('');
  }

  async function salvar() {
    if (!c) return;
    const urls = [...Object.values(c.imagens), ...c.blocos.map(b => b.imagem)].filter(Boolean);
    if (urls.some(u => { try { return !/^https?:$/.test(new URL(u as string).protocol); } catch { return true; } })) { toast.error('Informe links de imagem http ou https válidos'); return; }
    const limpo: ConteudoSls = mesclarConteudoSls({
      ...c,
      ...Object.fromEntries((['dorParagrafos', 'inclusosExtras', 'paraQuemSim', 'paraQuemNao'] as const).map(k => [k, c[k].map(s => s.trim()).filter(Boolean)])),
      perguntas: c.perguntas.filter(q => q.p.trim() && q.r.trim()),
    });
    setBusy(true);
    const { error } = await supabase.from('paginas_venda_config').upsert({ slug: SLUG_PAGINA_SLS, conteudo: limpo as never });
    setBusy(false);
    if (error) { toast.error('Não foi possível salvar'); return; }
    setC(limpo); toast.success('Página atualizada');
  }

  return <div className="mx-auto max-w-3xl space-y-4 p-3 pb-24 md:p-6">
    <div className="flex flex-wrap items-center justify-between gap-2">
      <div><h1 className="text-xl font-bold">Página SLS</h1><p className="text-sm text-muted-foreground">Preços e brindes continuam vindo da campanha. Use {'{prazo}'}, {'{prazo_encomenda}'} e {'{parcelamento}'} nos textos.</p></div>
      <Button variant="outline" asChild><a href="/sls" target="_blank" rel="noopener noreferrer"><ExternalLink className="mr-2 h-4 w-4"/>Ver página</a></Button>
    </div>

    <Secao titulo="Blocos da página"><SlsBlocosEditor blocos={c.blocos} onChange={b => set('blocos', b)} onBusy={imagemBusy}/></Secao>
    <Secao titulo="Imagens da página">
      <div className="grid gap-6 sm:grid-cols-2">{([['hero', 'Foto do topo'], ['porte', 'Foto do porte'], ['ac etinada', 'Foto Acetinada'], ['stoneWashed', 'Foto Stone Washed'], ['tactical', 'Foto Tactical']] as [ImagemSls, string][]).map(([chave, titulo]) => <SlsImagemEditor key={chave} id={`foto-${chave}`} titulo={titulo} valor={c.imagens[chave]} onBusy={imagemBusy} onChange={v => setC(prev => { if (!prev) return prev; const imagens = { ...prev.imagens }; if (v === undefined) delete imagens[chave]; else imagens[chave] = v; return { ...prev, imagens }; })}/>)}</div>
    </Secao>
    <Secao titulo="Prazos">
      <div className="grid gap-3 sm:grid-cols-2">
        <div className="space-y-1.5"><Label htmlFor="prazoSls">Prazo SLS (dias úteis)</Label><Input id="prazoSls" type="number" min={1} value={c.prazoSls} onChange={e => set('prazoSls', Number(e.target.value))}/></div>
        <div className="space-y-1.5"><Label htmlFor="prazoSob">Prazo sob encomenda (dias úteis)</Label><Input id="prazoSob" type="number" min={1} value={c.prazoSobEncomenda} onChange={e => set('prazoSobEncomenda', Number(e.target.value))}/></div>
      </div>
    </Secao>

    <Secao titulo="Topo">
      {texto('heroTitulo', 'Título (o prazo aparece logo depois, destacado)')}
      {texto('heroTexto', 'Texto de apoio', true)}
    </Secao>

    <Secao titulo="Vídeos">
      <p className="text-xs text-muted-foreground">O primeiro vídeo abre o topo da página; os demais aparecem na seção de vídeos. Aceita arquivo de vídeo ou link de reel/post do Instagram.</p>
      {texto('videosTitulo', 'Título da seção de vídeos')}
      <div className="flex items-center gap-2"><Input aria-label="Enviar vídeos" type="file" accept="video/*" multiple disabled={upload} onChange={e => { void enviar(e.target.files); e.target.value = ''; }}/>{upload && <Loader2 className="h-4 w-4 animate-spin"/>}</div>
      <div className="flex gap-2"><Input className="min-w-0 flex-1" placeholder="https://… (mp4 ou Instagram)" value={url} onChange={e => setUrl(e.target.value)}/><Button variant="outline" size="icon" aria-label="Adicionar link" onClick={addUrl}><Plus className="h-4 w-4"/></Button></div>
      {c.videos.map((v, i) => <div key={`${i}-${v.url}`} className="flex min-w-0 items-center gap-2 rounded-md border p-2">
        {/instagram\.com/.test(v.url) ? <div className="flex h-16 w-12 shrink-0 items-center justify-center rounded bg-muted text-[10px]">IG</div> : <video src={v.url} muted preload="metadata" className="h-16 w-12 shrink-0 rounded object-cover"/>}
        <div className="min-w-0 flex-1 space-y-1">
          <p className="text-xs">{i === 0 ? 'Topo da página' : `Vídeo ${i + 1}`}</p>
          <Input className="h-8" placeholder="Legenda (opcional)" value={v.legenda ?? ''} onChange={e => set('videos', c.videos.map((x, j) => j === i ? { ...x, legenda: e.target.value } : x))}/>
        </div>
        <Button size="icon" variant="ghost" disabled={i === 0} aria-label="Subir" onClick={() => set('videos', mover(c.videos, i, -1))}><ArrowUp className="h-4 w-4"/></Button>
        <Button size="icon" variant="ghost" disabled={i === c.videos.length - 1} aria-label="Descer" onClick={() => set('videos', mover(c.videos, i, 1))}><ArrowDown className="h-4 w-4"/></Button>
        <Button size="icon" variant="ghost" aria-label="Remover" onClick={() => set('videos', c.videos.filter((_, j) => j !== i))}><Trash2 className="h-4 w-4 text-destructive"/></Button>
      </div>)}
    </Secao>

    <Secao titulo="Uma nova linha de fabricação">
      {texto('dorTitulo', 'Título')}
      {linhas('dorParagrafos', 'Parágrafos')}
    </Secao>

    <Secao titulo="Itens inclusos">
      {linhas('inclusosExtras', 'Itens extras que vão na caixa (somam aos do produto)')}
    </Secao>

    <Secao titulo="Para quem é">
      {linhas('paraQuemSim', 'É para você se')}
      {linhas('paraQuemNao', 'Não é para você se')}
    </Secao>

    <Secao titulo="Configurador e garantia">
      {texto('customizarTitulo', 'Título do configurador')}
      {texto('customizarTexto', 'Texto do configurador', true)}
      {texto('garantiaTitulo', 'Título da garantia')}
      {texto('garantiaTexto', 'Texto da garantia', true)}
    </Secao>

    <Secao titulo="Perguntas frequentes">
      {c.perguntas.map((q, i) => <div key={i} className="space-y-2 rounded-md border p-2">
        <div className="flex gap-1">
          <Input className="min-w-0 flex-1" placeholder="Pergunta" value={q.p} onChange={e => set('perguntas', c.perguntas.map((x, j) => j === i ? { ...x, p: e.target.value } : x))}/>
          <Button size="icon" variant="ghost" disabled={i === 0} aria-label="Subir pergunta" onClick={() => set('perguntas', mover(c.perguntas, i, -1))}><ArrowUp className="h-4 w-4"/></Button>
          <Button size="icon" variant="ghost" disabled={i === c.perguntas.length - 1} aria-label="Descer pergunta" onClick={() => set('perguntas', mover(c.perguntas, i, 1))}><ArrowDown className="h-4 w-4"/></Button>
          <Button size="icon" variant="ghost" aria-label="Remover pergunta" onClick={() => set('perguntas', c.perguntas.filter((_, j) => j !== i))}><Trash2 className="h-4 w-4 text-destructive"/></Button>
        </div>
        <Textarea placeholder="Resposta" value={q.r} onChange={e => set('perguntas', c.perguntas.map((x, j) => j === i ? { ...x, r: e.target.value } : x))}/>
      </div>)}
      <Button variant="outline" onClick={() => set('perguntas', [...c.perguntas, { p: '', r: '' }])}><Plus className="mr-2 h-4 w-4"/>Adicionar pergunta</Button>
    </Secao>

    <Secao titulo="Fechamento">{texto('ps', 'P.S.', true)}</Secao>

    <div className="fixed inset-x-0 bottom-0 z-30 border-t bg-background/95 p-3 md:static md:border-0 md:bg-transparent md:p-0">
      <div className="mx-auto flex max-w-3xl justify-end gap-2">
        <Button variant="ghost" disabled={busy || upload || imageUploads > 0} onClick={() => { if (confirm('Voltar textos, imagens e blocos ao padrão? (só vale depois de salvar)')) setC(mesclarConteudoSls(null)); }}>Restaurar padrão</Button>
        <Button onClick={() => void salvar()} disabled={busy || upload || imageUploads > 0}>{busy && <Loader2 className="mr-2 h-4 w-4 animate-spin"/>}Salvar página</Button>
      </div>
    </div>
  </div>;
}
