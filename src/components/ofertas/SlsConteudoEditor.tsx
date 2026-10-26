import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ArrowUp, ArrowDown, Plus, Trash2, RotateCcw, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { BLOCOS_SLS, type BlocoSls, type TipoBlocoSls } from '@/lib/paginaSls';

export function SlsImagemEditor({ id, titulo, valor, onChange, onBusy }: { id: string; titulo: string; valor?: string | null; onChange: (v: string | null | undefined) => void; onBusy: (busy: boolean) => void }) {
  const [busy, setBusy] = useState(false);
  async function enviar(file?: File) {
    if (!file) return;
    if (!file.type.startsWith('image/')) { toast.error('Escolha uma imagem'); return; }
    setBusy(true); onBusy(true);
    try {
      const path = `paginas/sls/${crypto.randomUUID()}-${file.name.replace(/[^\w.-]/g, '_')}`;
      const { error } = await supabase.storage.from('catalogo-midias').upload(path, file, { contentType: file.type });
      if (error) throw error;
      onChange(supabase.storage.from('catalogo-midias').getPublicUrl(path).data.publicUrl);
      toast.success('Imagem adicionada');
    } catch { toast.error('Não foi possível enviar a imagem'); }
    finally { setBusy(false); onBusy(false); }
  }
  return <div className="min-w-0 space-y-2">
    <Label htmlFor={id}>{titulo}</Label>
    {valor && <img src={valor} alt={titulo} className="h-32 w-full rounded-md border bg-muted object-contain"/>}
    <Input id={id} aria-label={titulo} type="file" accept="image/*" disabled={busy} onChange={e => { void enviar(e.target.files?.[0]); e.target.value = ''; }}/>
    <Input aria-label={`Link da imagem: ${titulo}`} placeholder="https://…" value={valor ?? ''} onChange={e => onChange(e.target.value || null)}/>
    <div className="flex flex-wrap items-center gap-2">
      <Button size="sm" variant="ghost" onClick={() => onChange(null)} disabled={busy}><Trash2 className="mr-1 h-4 w-4"/>Retirar imagem</Button>
      <Button size="sm" variant="ghost" onClick={() => onChange(undefined)} disabled={busy}><RotateCcw className="mr-1 h-4 w-4"/>Usar padrão</Button>
      {busy && <Loader2 className="h-4 w-4 animate-spin"/>}
    </div>
  </div>;
}

export function SlsBlocosEditor({ blocos, onChange, onBusy }: { blocos: BlocoSls[]; onChange: (b: BlocoSls[]) => void; onBusy: (busy: boolean) => void }) {
  const [tipo, setTipo] = useState<TipoBlocoSls>('livre');
  const disponiveis = (Object.keys(BLOCOS_SLS) as (keyof typeof BLOCOS_SLS)[]).filter(t => !blocos.some(b => b.tipo === t));
  const atualizar = (id: string, dados: Partial<BlocoSls>) => onChange(blocos.map(b => b.id === id ? { ...b, ...dados } : b));
  function mover(i: number, d: number) { const arr = [...blocos]; const j = i + d; if (j < 0 || j >= arr.length) return; [arr[i], arr[j]] = [arr[j], arr[i]]; onChange(arr); }
  return <div className="space-y-3">
    {blocos.map((b, i) => <div key={b.id} className="min-w-0 space-y-3 border-b pb-3">
      <div className="flex items-center gap-1">
        <span className="min-w-0 flex-1 text-sm font-medium">{i + 1}. {b.tipo === 'livre' ? b.titulo || 'Texto e imagem' : BLOCOS_SLS[b.tipo]}</span>
        <Button variant="ghost" size="icon" disabled={i === 0} aria-label={`Subir bloco ${i + 1}`} onClick={() => mover(i, -1)}><ArrowUp className="h-4 w-4"/></Button>
        <Button variant="ghost" size="icon" disabled={i === blocos.length - 1} aria-label={`Descer bloco ${i + 1}`} onClick={() => mover(i, 1)}><ArrowDown className="h-4 w-4"/></Button>
        <Button variant="ghost" size="icon" aria-label={`Retirar bloco ${i + 1}`} onClick={() => { if (confirm('Retirar este bloco da página?')) onChange(blocos.filter(x => x.id !== b.id)); }}><Trash2 className="h-4 w-4 text-destructive"/></Button>
      </div>
      {b.tipo === 'livre' && <>
        <Label htmlFor={`titulo-${b.id}`}>Título do bloco</Label><Input id={`titulo-${b.id}`} value={b.titulo ?? ''} onChange={e => atualizar(b.id, { titulo: e.target.value })}/>
        <Label htmlFor={`texto-${b.id}`}>Texto do bloco</Label><Textarea id={`texto-${b.id}`} value={b.texto ?? ''} onChange={e => atualizar(b.id, { texto: e.target.value })}/>
        <SlsImagemEditor id={`imagem-${b.id}`} titulo="Imagem do bloco" valor={b.imagem} onChange={v => atualizar(b.id, { imagem: v ?? '' })} onBusy={onBusy}/>
      </>}
    </div>)}
    <div className="flex gap-2">
      <Select value={tipo} onValueChange={v => setTipo(v as TipoBlocoSls)}><SelectTrigger className="min-w-0 flex-1" aria-label="Tipo de bloco"><SelectValue/></SelectTrigger><SelectContent><SelectItem value="livre">Texto e imagem</SelectItem>{disponiveis.map(t => <SelectItem key={t} value={t}>{BLOCOS_SLS[t]}</SelectItem>)}</SelectContent></Select>
      <Button variant="outline" onClick={() => { if (tipo !== 'livre' && !disponiveis.includes(tipo)) return; onChange([...blocos, { id: crypto.randomUUID(), tipo, titulo: '', texto: '', imagem: '' }]); setTipo('livre'); }}><Plus className="mr-1 h-4 w-4"/>Adicionar bloco</Button>
    </div>
  </div>;
}