import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from '@/components/ui/dialog';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Plus, ArrowUp, ArrowDown, Pencil, Trash2, ExternalLink, Star, X, Loader2 } from 'lucide-react';
import type { Oferta } from '@/pages/publico/Ofertas';

const BUCKET = 'catalogo-midias';
const BRL = (n: number) => n.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

interface Form {
  id?: string;
  titulo: string;
  descricao: string;
  etiqueta: string;
  valor: string;
  valor_de: string;
  condicoes: string;
  link_produto: string;
  imagens: string[];
}

const vazio: Form = {
  titulo: '', descricao: '', etiqueta: '', valor: '', valor_de: '',
  condicoes: '', link_produto: '', imagens: [],
};

export default function OfertasAdmin() {
  const [ofertas, setOfertas] = useState<Oferta[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState<Form>(vazio);
  const [salvando, setSalvando] = useState(false);
  const [enviando, setEnviando] = useState(false);
  const [excluir, setExcluir] = useState<Oferta | null>(null);

  const carregar = async () => {
    const { data, error } = await supabase.from('ofertas').select('*').order('ordem', { ascending: true });
    if (error) toast.error('Erro ao carregar ofertas');
    setOfertas((data as Oferta[]) || []);
    setLoading(false);
  };

  useEffect(() => { carregar(); }, []);

  const abrirNova = () => { setForm(vazio); setOpen(true); };

  const abrirEdicao = (o: Oferta) => {
    setForm({
      id: o.id,
      titulo: o.titulo,
      descricao: o.descricao || '',
      etiqueta: o.etiqueta || '',
      valor: o.valor != null ? String(o.valor) : '',
      valor_de: o.valor_de != null ? String(o.valor_de) : '',
      condicoes: o.condicoes || '',
      link_produto: o.link_produto || '',
      imagens: o.imagens || [],
    });
    setOpen(true);
  };

  const subirImagens = async (files: FileList | null) => {
    if (!files?.length) return;
    setEnviando(true);
    const urls: string[] = [];
    for (const file of Array.from(files)) {
      const path = `ofertas/${Date.now()}-${Math.random().toString(36).slice(2)}-${file.name.replace(/[^\w.-]/g, '_')}`;
      const { error } = await supabase.storage.from(BUCKET).upload(path, file, { upsert: true, contentType: file.type });
      if (error) { toast.error(`Falha ao enviar ${file.name}`); continue; }
      urls.push(supabase.storage.from(BUCKET).getPublicUrl(path).data.publicUrl);
    }
    setForm((f) => ({ ...f, imagens: [...f.imagens, ...urls] }));
    setEnviando(false);
    if (urls.length) toast.success(`${urls.length} imagem(ns) enviada(s)`);
  };

  const moverImagem = (i: number, dir: -1 | 1) => {
    setForm((f) => {
      const arr = [...f.imagens];
      const j = i + dir;
      if (j < 0 || j >= arr.length) return f;
      [arr[i], arr[j]] = [arr[j], arr[i]];
      return { ...f, imagens: arr };
    });
  };

  const tornarCapa = (i: number) => {
    setForm((f) => {
      const arr = [...f.imagens];
      const [img] = arr.splice(i, 1);
      return { ...f, imagens: [img, ...arr] };
    });
  };

  const removerImagem = (i: number) =>
    setForm((f) => ({ ...f, imagens: f.imagens.filter((_, k) => k !== i) }));

  const salvar = async () => {
    if (!form.titulo.trim()) { toast.error('Informe o título'); return; }
    setSalvando(true);
    const payload = {
      titulo: form.titulo.trim(),
      descricao: form.descricao.trim() || null,
      etiqueta: form.etiqueta.trim() || null,
      valor: form.valor ? Number(form.valor) : null,
      valor_de: form.valor_de ? Number(form.valor_de) : null,
      condicoes: form.condicoes.trim() || null,
      link_produto: form.link_produto.trim() || null,
      imagens: form.imagens,
    };
    const res = form.id
      ? await supabase.from('ofertas').update(payload).eq('id', form.id)
      : await supabase.from('ofertas').insert({ ...payload, ordem: ofertas.length });
    setSalvando(false);
    if (res.error) { toast.error('Erro ao salvar'); return; }
    toast.success(form.id ? 'Oferta atualizada' : 'Oferta criada');
    setOpen(false);
    carregar();
  };

  const alternarAtivo = async (o: Oferta, ativo: boolean) => {
    setOfertas((list) => list.map((x) => (x.id === o.id ? { ...x, ativo } : x)));
    const { error } = await supabase.from('ofertas').update({ ativo }).eq('id', o.id);
    if (error) { toast.error('Erro ao atualizar'); carregar(); return; }
    toast.success(ativo ? 'Oferta ativada' : 'Oferta desativada');
  };

  const mover = async (i: number, dir: -1 | 1) => {
    const j = i + dir;
    if (j < 0 || j >= ofertas.length) return;
    const arr = [...ofertas];
    [arr[i], arr[j]] = [arr[j], arr[i]];
    setOfertas(arr);
    await Promise.all(arr.map((o, k) => supabase.from('ofertas').update({ ordem: k }).eq('id', o.id)));
    carregar();
  };

  const confirmarExclusao = async () => {
    if (!excluir) return;
    const { error } = await supabase.from('ofertas').delete().eq('id', excluir.id);
    setExcluir(null);
    if (error) { toast.error('Erro ao excluir'); return; }
    toast.success('Oferta excluída');
    carregar();
  };

  const ativas = ofertas.filter((o) => o.ativo).length;

  return (
    <div className="max-w-6xl mx-auto p-4 space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">Novidades e Ofertas</h1>
          <p className="text-sm text-muted-foreground">{ativas} de {ofertas.length} ofertas ativas</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => window.open('/ofertas', '_blank')}>
            <ExternalLink className="h-4 w-4 mr-1" /> Ver página pública
          </Button>
          <Button onClick={abrirNova}>
            <Plus className="h-4 w-4 mr-1" /> Nova oferta
          </Button>
        </div>
      </div>

      {loading ? (
        <p className="text-muted-foreground">Carregando...</p>
      ) : ofertas.length === 0 ? (
        <div className="border border-dashed rounded-lg p-10 text-center text-muted-foreground">
          Nenhuma oferta cadastrada. Clique em “Nova oferta” para começar.
        </div>
      ) : (
        <div className="space-y-2">
          {ofertas.map((o, i) => (
            <div
              key={o.id}
              className={`flex items-center gap-3 rounded-lg border bg-card p-3 ${o.ativo ? '' : 'opacity-60'}`}
            >
              <div className="h-16 w-12 shrink-0 overflow-hidden rounded bg-muted">
                {o.imagens?.[0] && <img src={o.imagens[0]} alt={o.titulo} className="h-full w-full object-cover" />}
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <p className="truncate font-semibold">{o.titulo}</p>
                  {!o.ativo && <Badge variant="secondary">Inativa</Badge>}
                  {o.etiqueta && <Badge className="bg-accent text-white">{o.etiqueta}</Badge>}
                </div>
                <p className="text-sm text-muted-foreground">
                  {o.valor != null ? BRL(Number(o.valor)) : 'Sem valor'}
                </p>
              </div>
              <div className="flex items-center gap-1">
                <Switch checked={o.ativo} onCheckedChange={(v) => alternarAtivo(o, v)} />
                <Button variant="ghost" size="icon" onClick={() => mover(i, -1)} disabled={i === 0}>
                  <ArrowUp className="h-4 w-4" />
                </Button>
                <Button variant="ghost" size="icon" onClick={() => mover(i, 1)} disabled={i === ofertas.length - 1}>
                  <ArrowDown className="h-4 w-4" />
                </Button>
                <Button variant="ghost" size="icon" onClick={() => abrirEdicao(o)}>
                  <Pencil className="h-4 w-4" />
                </Button>
                <Button variant="ghost" size="icon" className="text-destructive" onClick={() => setExcluir(o)}>
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{form.id ? 'Editar oferta' : 'Nova oferta'}</DialogTitle>
          </DialogHeader>

          <div className="space-y-3">
            <div>
              <Label>Título</Label>
              <Input value={form.titulo} onChange={(e) => setForm({ ...form, titulo: e.target.value })} />
            </div>
            <div>
              <Label>Descrição</Label>
              <Textarea rows={3} value={form.descricao} onChange={(e) => setForm({ ...form, descricao: e.target.value })} />
            </div>
            <div>
              <Label>Etiqueta</Label>
              <Input placeholder="Ex.: Novidade, Últimas unidades" value={form.etiqueta} onChange={(e) => setForm({ ...form, etiqueta: e.target.value })} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Valor</Label>
                <Input type="number" step="0.01" value={form.valor} onChange={(e) => setForm({ ...form, valor: e.target.value })} />
              </div>
              <div>
                <Label>Valor de (riscado)</Label>
                <Input type="number" step="0.01" value={form.valor_de} onChange={(e) => setForm({ ...form, valor_de: e.target.value })} />
              </div>
            </div>
            <div>
              <Label>Condições</Label>
              <Input placeholder="Ex.: 5% no Pix ou 3x sem juros" value={form.condicoes} onChange={(e) => setForm({ ...form, condicoes: e.target.value })} />
            </div>
            <div>
              <Label>Link do produto</Label>
              <Input placeholder="https://kaowz.com.br/products/..." value={form.link_produto} onChange={(e) => setForm({ ...form, link_produto: e.target.value })} />
            </div>

            <div>
              <Label>Imagens</Label>
              <p className="text-xs text-muted-foreground mb-1">
                A primeira imagem é a capa do card. As demais aparecem na troca ao passar o mouse (ou arrastar no celular).
              </p>
              <Input type="file" accept="image/*" multiple onChange={(e) => subirImagens(e.target.files)} />
              {enviando && (
                <p className="mt-1 flex items-center gap-1 text-xs text-muted-foreground">
                  <Loader2 className="h-3 w-3 animate-spin" /> Enviando imagens...
                </p>
              )}
              {form.imagens.length > 0 && (
                <div className="mt-2 grid grid-cols-3 gap-2">
                  {form.imagens.map((img, i) => (
                    <div key={img + i} className="relative rounded border overflow-hidden">
                      <img src={img} alt="" className="aspect-[3/4] w-full object-cover" />
                      {i === 0 && <Badge className="absolute left-1 top-1 bg-accent text-white text-[10px]">Capa</Badge>}
                      <button
                        type="button"
                        onClick={() => removerImagem(i)}
                        className="absolute right-1 top-1 rounded bg-black/70 p-1 text-white"
                      >
                        <X className="h-3 w-3" />
                      </button>
                      <div className="flex justify-between gap-0.5 p-1">
                        <Button type="button" variant="ghost" size="icon" className="h-6 w-6" onClick={() => moverImagem(i, -1)} disabled={i === 0}>
                          <ArrowUp className="h-3 w-3" />
                        </Button>
                        <Button type="button" variant="ghost" size="icon" className="h-6 w-6" onClick={() => tornarCapa(i)} title="Tornar capa">
                          <Star className="h-3 w-3" />
                        </Button>
                        <Button type="button" variant="ghost" size="icon" className="h-6 w-6" onClick={() => moverImagem(i, 1)} disabled={i === form.imagens.length - 1}>
                          <ArrowDown className="h-3 w-3" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>Cancelar</Button>
            <Button onClick={salvar} disabled={salvando || enviando}>
              {salvando && <Loader2 className="h-4 w-4 mr-1 animate-spin" />} Salvar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!excluir} onOpenChange={(v) => !v && setExcluir(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir oferta</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja excluir “{excluir?.titulo}”? Essa ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={confirmarExclusao}>Excluir</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
