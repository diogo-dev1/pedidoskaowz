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
import { Plus, ArrowUp, ArrowDown, Pencil, Trash2, ExternalLink, Star, X, Loader2, Video } from 'lucide-react';
import type { MidiaOferta, Oferta } from '@/pages/publico/Ofertas';

const BUCKET = 'catalogo-midias';
const BRL = (n: number) => n.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

interface Form {
  id?: string;
  titulo: string;
  descricao: string;
  bordao_modal: string;
  etiqueta: string;
  valor: string;
  valor_de: string;
  texto_pix: string;
  texto_parcelamento: string;
  selos: string[];
  link_produto: string;
  midias: MidiaOferta[];
}

const vazio: Form = {
  titulo: '', descricao: '', bordao_modal: '', etiqueta: '', valor: '', valor_de: '',
  texto_pix: '', texto_parcelamento: '', selos: [], link_produto: '', midias: [],
};

export default function OfertasAdmin() {
  const [ofertas, setOfertas] = useState<Oferta[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState<Form>(vazio);
  const [salvando, setSalvando] = useState(false);
  const [enviando, setEnviando] = useState(false);
  const [excluir, setExcluir] = useState<Oferta | null>(null);
  const [novoSelo, setNovoSelo] = useState('');

  const carregar = async () => {
    const { data, error } = await supabase.from('ofertas').select('*').order('ordem', { ascending: true });
    if (error) toast.error('Erro ao carregar ofertas');
    setOfertas((data as Oferta[]) || []);
    setLoading(false);
  };

  useEffect(() => { carregar(); }, []);

  const abrirNova = () => { setForm(vazio); setNovoSelo(''); setOpen(true); };

  const abrirEdicao = (o: Oferta) => {
    setForm({
      id: o.id,
      titulo: o.titulo,
      descricao: o.descricao || '',
      bordao_modal: o.bordao_modal || '',
      etiqueta: o.etiqueta || '',
      valor: o.valor != null ? String(o.valor) : '',
      valor_de: o.valor_de != null ? String(o.valor_de) : '',
      texto_pix: o.texto_pix || '',
      texto_parcelamento: o.texto_parcelamento || '',
      selos: o.selos || [],
      link_produto: o.link_produto || '',
      midias: Array.isArray(o.midias) && o.midias.length ? o.midias : (o.imagens || []).map((url) => ({ url, tipo: 'imagem' })),
    });
    setNovoSelo('');
    setOpen(true);
  };

  const adicionarSelo = () => {
    const selo = novoSelo.trim();
    if (!selo) return;
    if (form.selos.some((item) => item.toLocaleLowerCase('pt-BR') === selo.toLocaleLowerCase('pt-BR'))) {
      toast.error('Este selo já foi adicionado');
      return;
    }
    setForm((atual) => ({ ...atual, selos: [...atual.selos, selo] }));
    setNovoSelo('');
  };

  const removerSelo = (indice: number) => {
    setForm((atual) => ({ ...atual, selos: atual.selos.filter((_, i) => i !== indice) }));
  };

  const subirMidias = async (files: FileList | null) => {
    if (!files?.length) return;
    setEnviando(true);
    const midias: MidiaOferta[] = [];
    for (const file of Array.from(files)) {
      const path = `ofertas/${Date.now()}-${Math.random().toString(36).slice(2)}-${file.name.replace(/[^\w.-]/g, '_')}`;
      const { error } = await supabase.storage.from(BUCKET).upload(path, file, { upsert: true, contentType: file.type });
      if (error) { toast.error(`Falha ao enviar ${file.name}`); continue; }
       midias.push({ url: supabase.storage.from(BUCKET).getPublicUrl(path).data.publicUrl, tipo: file.type.startsWith('video/') ? 'video' : 'imagem' });
    }
    setForm((f) => ({ ...f, midias: [...f.midias, ...midias] }));
    setEnviando(false);
    if (midias.length) toast.success(`${midias.length} mídia(s) enviada(s)`);
  };

  const moverImagem = (i: number, dir: -1 | 1) => {
    setForm((f) => {
      const arr = [...f.midias];
      const j = i + dir;
      if (j < 0 || j >= arr.length) return f;
      [arr[i], arr[j]] = [arr[j], arr[i]];
      return { ...f, midias: arr };
    });
  };

  const tornarCapa = (i: number) => {
    setForm((f) => {
      const arr = [...f.midias];
      const [img] = arr.splice(i, 1);
      return { ...f, midias: [img, ...arr] };
    });
  };

  const removerMidia = (i: number) =>
    setForm((f) => ({ ...f, midias: f.midias.filter((_, k) => k !== i) }));

  const salvar = async () => {
    if (!form.titulo.trim()) { toast.error('Informe o título'); return; }
    setSalvando(true);
    const payload = {
      titulo: form.titulo.trim(),
      descricao: form.descricao.trim() || null,
      bordao_modal: form.bordao_modal.trim() || null,
      etiqueta: form.etiqueta.trim() || null,
      valor: form.valor ? Number(form.valor) : null,
      valor_de: form.valor_de ? Number(form.valor_de) : null,
      texto_pix: form.texto_pix.trim() || null,
      texto_parcelamento: form.texto_parcelamento.trim() || null,
      selos: form.selos,
      link_produto: form.link_produto.trim() || null,
      midias: form.midias,
      imagens: form.midias.filter((item) => item.tipo === 'imagem').map((item) => item.url),
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
                 {(o.midias?.[0] || o.imagens?.[0]) && ((o.midias?.[0]?.tipo === 'video')
                   ? <video src={o.midias[0].url} className="h-full w-full object-cover" muted playsInline />
                   : <img src={o.midias?.[0]?.url || o.imagens[0]} alt={o.titulo} className="h-full w-full object-cover" />)}
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
              <Label>Bordão de apresentação</Label>
              <Textarea maxLength={300} rows={2} placeholder="Ex.: A lâmina que transforma presença em assinatura." value={form.bordao_modal} onChange={(e) => setForm({ ...form, bordao_modal: e.target.value })} />
              <p className="mt-1 text-xs text-muted-foreground">Aparece em destaque somente ao abrir os detalhes do produto.</p>
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
              <Label>Texto do Pix</Label>
              <Input placeholder="Ex.: R$ 950,00 no Pix (5% OFF)" value={form.texto_pix} onChange={(e) => setForm({ ...form, texto_pix: e.target.value })} />
            </div>
            <div>
              <Label>Parcelamento</Label>
              <Input placeholder="Ex.: 10x sem juros" value={form.texto_parcelamento} onChange={(e) => setForm({ ...form, texto_parcelamento: e.target.value })} />
            </div>
            <div>
              <Label>Selos</Label>
              <div className="flex gap-2">
                <Input
                  placeholder="Ex.: FRETE GRÁTIS"
                  value={novoSelo}
                  onChange={(e) => setNovoSelo(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      adicionarSelo();
                    }
                  }}
                />
                <Button type="button" variant="secondary" onClick={adicionarSelo} disabled={!novoSelo.trim()}>
                  Adicionar
                </Button>
              </div>
              {form.selos.length > 0 && (
                <div className="mt-2 flex flex-wrap gap-1.5">
                  {form.selos.map((selo, indice) => (
                    <Badge key={`${selo}-${indice}`} variant="secondary" className="gap-1 pr-1">
                      {selo}
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="h-5 w-5"
                        onClick={() => removerSelo(indice)}
                        aria-label={`Remover selo ${selo}`}
                      >
                        <X className="h-3 w-3" />
                      </Button>
                    </Badge>
                  ))}
                </div>
              )}
              <p className="mt-1 text-xs text-muted-foreground">
                Use textos bem curtos — eles aparecem sobre a imagem do card.
              </p>
            </div>
            <div>
              <Label>Link do produto</Label>
              <Input placeholder="https://kaowz.com.br/products/..." value={form.link_produto} onChange={(e) => setForm({ ...form, link_produto: e.target.value })} />
            </div>

            <div>
              <Label>Mídias</Label>
              <p className="text-xs text-muted-foreground mb-1">
                Adicione imagens e vídeos. A primeira mídia é a capa; as demais passam no card e aparecem nos detalhes.
              </p>
              <Input type="file" accept="image/*,video/*" multiple onChange={(e) => subirMidias(e.target.files)} />
              {enviando && (
                <p className="mt-1 flex items-center gap-1 text-xs text-muted-foreground">
                   <Loader2 className="h-3 w-3 animate-spin" /> Enviando mídias...
                </p>
              )}
              {form.midias.length > 0 && (
                <div className="mt-2 grid grid-cols-3 gap-2">
                  {form.midias.map((midia, i) => (
                    <div key={midia.url + i} className="relative rounded border overflow-hidden">
                      {midia.tipo === 'video' ? <video src={midia.url} className="aspect-[3/4] w-full object-cover" muted playsInline /> : <img src={midia.url} alt="" className="aspect-[3/4] w-full object-cover" />}
                      {i === 0 && <Badge className="absolute left-1 top-1 bg-accent text-white text-[10px]">Capa</Badge>}
                      {midia.tipo === 'video' && <Badge variant="secondary" className="absolute bottom-8 left-1 gap-1 text-[9px]"><Video className="h-3 w-3" /> Vídeo</Badge>}
                      <button
                        type="button"
                        onClick={() => removerMidia(i)}
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
                         <Button type="button" variant="ghost" size="icon" className="h-6 w-6" onClick={() => moverImagem(i, 1)} disabled={i === form.midias.length - 1}>
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
