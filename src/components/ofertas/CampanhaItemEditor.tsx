import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { type CampanhaItem } from '@/lib/campanhas';
import { type MidiaOferta } from './OfertaVisual';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ArrowUp, ArrowDown, Trash2, Plus, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import CampanhaItemExtrasEditor from './CampanhaItemExtrasEditor';

export default function CampanhaItemEditor({ item, onClose, onSaved }: { item: CampanhaItem; onClose: () => void; onSaved: () => void }) {
  const [form, setForm] = useState({ titulo: item.titulo, descricao: item.descricao ?? '', bordao_modal: item.bordao_modal ?? '', valor: item.valor == null ? '' : String(item.valor), valor_de: item.valor_de == null ? '' : String(item.valor_de), texto_pix: item.texto_pix ?? '', texto_parcelamento: item.texto_parcelamento ?? '', link_produto: item.link_produto ?? '', selos: item.selos.join('\n') });
  const [midias, setMidias] = useState<MidiaOferta[]>(item.midias as unknown as MidiaOferta[]);
  const [url, setUrl] = useState('');
  const [tipo, setTipo] = useState<'imagem' | 'video'>('imagem');
  const [busy, setBusy] = useState(false);
  const [upload, setUpload] = useState(false);
  const field = (key: keyof typeof form, label: string, area = false, numeric = false) => <div className="space-y-1.5" key={key}><Label htmlFor={`item-${key}`}>{label}</Label>{area ? <Textarea id={`item-${key}`} value={form[key]} onChange={e => setForm(f => ({ ...f, [key]: e.target.value }))}/> : <Input id={`item-${key}`} type={numeric ? 'number' : 'text'} min={numeric ? 0 : undefined} step={numeric ? '0.01' : undefined} value={form[key]} onChange={e => setForm(f => ({ ...f, [key]: e.target.value }))}/>}</div>;
  const mover = (i: number, dir: number) => setMidias(m => { const arr = [...m]; const j = i + dir; if (j < 0 || j >= arr.length) return m; [arr[i], arr[j]] = [arr[j], arr[i]]; return arr; });
  const adicionar = () => {
    try { if (!/^https?:$/.test(new URL(url).protocol)) throw new Error(); } catch { toast.error('Informe um link http ou https válido'); return; }
    setMidias(m => [...m, { url: url.trim(), tipo }]); setUrl('');
  };
  async function arquivos(files: FileList | null) {
    if (!files?.length) return;
    setUpload(true);
    try {
      const novas: MidiaOferta[] = [];
      for (const file of Array.from(files)) {
        if (!file.type.startsWith('image/') && !file.type.startsWith('video/')) continue;
        const path = `campanhas/${item.campanha_id}/${crypto.randomUUID()}-${file.name.replace(/[^\w.-]/g, '_')}`;
        const { error } = await supabase.storage.from('catalogo-midias').upload(path, file, { contentType: file.type });
        if (error) { toast.error(`Não foi possível enviar ${file.name}`); continue; }
        novas.push({ url: supabase.storage.from('catalogo-midias').getPublicUrl(path).data.publicUrl, tipo: file.type.startsWith('video/') ? 'video' : 'imagem' });
      }
      setMidias(m => [...m, ...novas]);
    } finally { setUpload(false); }
  }
  async function salvar() {
    if (!form.titulo.trim()) { toast.error('Informe o título'); return; }
    if ([form.valor, form.valor_de].some(v => v && (!Number.isFinite(Number(v)) || Number(v) < 0))) { toast.error('Informe valores válidos'); return; }
    if (form.link_produto && !/^https?:\/\//i.test(form.link_produto)) { toast.error('Informe um link http ou https válido'); return; }
    setBusy(true);
    const { error } = await supabase.from('campanha_itens').update({ ...form, titulo: form.titulo.trim(), valor: form.valor ? Number(form.valor) : null, valor_de: form.valor_de ? Number(form.valor_de) : null, selos: form.selos.split('\n').map(s => s.trim()).filter(Boolean), midias }).eq('id', item.id);
    setBusy(false);
    if (error) { toast.error('Não foi possível salvar o produto'); return; }
    toast.success('Produto atualizado'); onSaved(); onClose();
  }
  return <Dialog open onOpenChange={o => !o && onClose()}><DialogContent className="w-[calc(100%-1rem)] max-w-3xl max-h-[90dvh] overflow-y-auto"><DialogHeader><DialogTitle>Editar produto</DialogTitle></DialogHeader>
    <div className="grid gap-4 sm:grid-cols-2">{field('titulo', 'Título')}{field('link_produto', 'Link na loja')}{field('valor', 'Valor (R$)', false, true)}{field('valor_de', 'Valor de (R$)', false, true)}{field('texto_pix', 'Pix (vazio usa padrão)')}{field('texto_parcelamento', 'Parcelamento (vazio usa padrão)')}</div>
    {field('descricao', 'Descrição', true)}{field('bordao_modal', 'Bordão de apresentação (só no detalhe)', true)}{field('selos', 'Selos (um por linha)', true)}
    <section className="space-y-3"><h3 className="font-medium">Mídias</h3><p className="text-xs text-muted-foreground">A primeira mídia é a capa. Adicione imagens ou vídeos e ajuste a ordem pelas setas.</p>
      <Input aria-label="Enviar mídias" type="file" accept="image/*,video/*" multiple disabled={upload} onChange={e => void arquivos(e.target.files)}/>{upload && <Loader2 className="h-4 w-4 animate-spin"/>}
      <div className="flex gap-2 flex-wrap"><Input className="flex-1 min-w-0" aria-label="URL da mídia" placeholder="https://…" value={url} onChange={e => setUrl(e.target.value)}/><Select value={tipo} onValueChange={v => setTipo(v as 'imagem' | 'video')}><SelectTrigger className="w-28"><SelectValue/></SelectTrigger><SelectContent><SelectItem value="imagem">Imagem</SelectItem><SelectItem value="video">Vídeo</SelectItem></SelectContent></Select><Button variant="outline" size="icon" title="Adicionar mídia" aria-label="Adicionar mídia" onClick={adicionar}><Plus className="h-4 w-4"/></Button></div>
      {midias.map((m, i) => <div key={`${i}-${m.url}`} className="flex items-center gap-2 border rounded-md p-2 min-w-0">{m.tipo === 'video' ? <video src={m.url} muted preload="metadata" className="w-12 h-16 object-cover shrink-0"/> : <img src={m.url} alt={`Mídia ${i + 1}`} className="w-12 h-16 object-cover shrink-0"/>}<div className="flex-1 min-w-0"><p className="text-xs">{i === 0 ? 'Capa · ' : ''}{m.tipo === 'video' ? 'Vídeo' : 'Imagem'}</p><p className="truncate text-xs text-muted-foreground">{m.url}</p></div><Button size="icon" variant="ghost" disabled={i === 0} aria-label={`Subir mídia ${i + 1}`} onClick={() => mover(i, -1)}><ArrowUp className="h-4 w-4"/></Button><Button size="icon" variant="ghost" disabled={i === midias.length - 1} aria-label={`Descer mídia ${i + 1}`} onClick={() => mover(i, 1)}><ArrowDown className="h-4 w-4"/></Button><Button size="icon" variant="ghost" aria-label={`Remover mídia ${i + 1}`} onClick={() => setMidias(m => m.filter((_, j) => j !== i))}><Trash2 className="h-4 w-4 text-destructive"/></Button></div>)}
    </section><CampanhaItemExtrasEditor itemId={item.id}/><DialogFooter><Button variant="outline" onClick={onClose}>Cancelar</Button><Button onClick={() => void salvar()} disabled={busy || upload}>{busy && <Loader2 className="mr-2 h-4 w-4 animate-spin"/>}Salvar produto</Button></DialogFooter>
  </DialogContent></Dialog>;
}