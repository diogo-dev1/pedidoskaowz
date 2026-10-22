import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { type ItemExtra, type TipoExtra } from '@/lib/campanhaExtras';
import { moeda } from '@/lib/campanhas';
import { AdicionarExtras } from './CampanhaExtrasBiblioteca';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ArrowUp, ArrowDown, Plus, Trash2 } from 'lucide-react';
import { toast } from 'sonner';

function PrecoCampanha({ v, onSaved }: { v: ItemExtra; onSaved: () => void }) {
  const [preco, setPreco] = useState(v.preco_campanha == null ? '' : String(v.preco_campanha));
  useEffect(() => setPreco(v.preco_campanha == null ? '' : String(v.preco_campanha)), [v.preco_campanha]);
  async function salvar() {
    if (preco !== '' && (!Number.isFinite(Number(preco)) || Number(preco) < 0)) { toast.error('Informe um preço válido'); return; }
    const valor = preco === '' ? null : Number(preco);
    if (valor === v.preco_campanha) return;
    const { error } = await supabase.from('campanha_item_extras').update({ preco_campanha: valor }).eq('id', v.id);
    if (error) toast.error('Não foi possível salvar o preço'); else { toast.success('Preço da campanha salvo'); onSaved(); }
  }
  return <div className="space-y-1"><Label htmlFor={`preco-${v.id}`} className="text-xs">Preço na campanha (opcional)</Label><Input id={`preco-${v.id}`} type="number" min={0} step="0.01" placeholder="Usa o preço normal" value={preco} onChange={e => setPreco(e.target.value)} onBlur={() => void salvar()}/></div>;
}
export default function CampanhaItemExtrasEditor({ itemId }: { itemId: string }) {
  const [lista, setLista] = useState<ItemExtra[]>([]);
  const [adicionar, setAdicionar] = useState<TipoExtra | null>(null);
  const [busy, setBusy] = useState(false);
  async function carregar() {
    const { data, error } = await supabase.from('campanha_item_extras').select('*, campanha_extras(*)').eq('campanha_item_id', itemId).order('ordem').order('created_at');
    if (error) toast.error('Não foi possível carregar brindes e upsells'); else setLista(data ?? []);
  }
  useEffect(() => { void carregar(); }, [itemId]);
  async function mover(grupo: ItemExtra[], i: number, dir: number) {
    const arr = [...grupo]; const j = i + dir;
    if (j < 0 || j >= arr.length) return;
    [arr[i], arr[j]] = [arr[j], arr[i]]; setBusy(true);
    const results = await Promise.all(arr.map((v, ordem) => supabase.from('campanha_item_extras').update({ ordem }).eq('id', v.id)));
    setBusy(false); if (results.some(r => r.error)) toast.error('Não foi possível salvar a ordem'); void carregar();
  }
  async function remover(v: ItemExtra) {
    const { error } = await supabase.from('campanha_item_extras').delete().eq('id', v.id);
    if (error) toast.error('Não foi possível remover'); else void carregar();
  }
  return <div className="space-y-5 border-t pt-4">{(['brinde', 'upsell'] as const).map(tipo => { const grupo = lista.filter(v => v.tipo === tipo); return <section className="space-y-3" key={tipo}><div className="flex items-center justify-between gap-2"><h3 className="text-sm font-semibold">{tipo === 'brinde' ? 'Brindes (o cliente ganha)' : 'Leve junto (upsell)'}</h3><Button size="sm" variant="outline" onClick={() => setAdicionar(tipo)}><Plus className="h-4 w-4 mr-1"/>Adicionar</Button></div>{grupo.map((v, i) => <div key={v.id} className="border rounded p-2 space-y-2"><div className="flex items-center gap-2 min-w-0">{v.campanha_extras?.imagem_url && <img src={v.campanha_extras.imagem_url} alt={v.campanha_extras.nome} className="h-10 w-10 shrink-0 rounded object-cover"/>}<div className="flex-1 min-w-0"><p className="text-sm break-words">{v.campanha_extras?.nome}</p>{v.campanha_extras?.preco != null && <p className="text-xs text-muted-foreground">{moeda(v.campanha_extras.preco)}</p>}</div><Button size="icon" variant="ghost" disabled={busy || i === 0} aria-label={`Subir extra ${v.campanha_extras?.nome}`} onClick={() => void mover(grupo, i, -1)}><ArrowUp className="h-4 w-4"/></Button><Button size="icon" variant="ghost" disabled={busy || i === grupo.length - 1} aria-label={`Descer extra ${v.campanha_extras?.nome}`} onClick={() => void mover(grupo, i, 1)}><ArrowDown className="h-4 w-4"/></Button><Button size="icon" variant="ghost" aria-label={`Remover extra ${v.campanha_extras?.nome}`} onClick={() => void remover(v)}><Trash2 className="h-4 w-4 text-destructive"/></Button></div>{tipo === 'upsell' && <PrecoCampanha v={v} onSaved={() => void carregar()}/>}</div>)}{!grupo.length && <p className="text-xs text-muted-foreground">Nenhum {tipo === 'brinde' ? 'brinde' : 'upsell'} neste produto.</p>}</section>; })}{adicionar && <AdicionarExtras itemId={itemId} tipo={adicionar} onClose={() => setAdicionar(null)} onSaved={() => void carregar()}/>}</div>;
}