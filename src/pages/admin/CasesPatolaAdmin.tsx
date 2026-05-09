import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent } from '@/components/ui/card';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import {
  Copy, Trash2, Plus, Save, ExternalLink, Loader2, Image as ImageIcon,
  MessageCircle, Phone, User, Crosshair, Wrench, FileText
} from 'lucide-react';

const BUCKET = 'cases-patola';

interface Solic {
  id: string;
  nome: string;
  telefone: string | null;
  fabricante: string | null;
  modelo_arma: string | null;
  calibre: string | null;
  customizacoes: string | null;
  observacoes: string | null;
  foto_arma_url: string | null;
  foto_carregador_url: string | null;
  status: string;
  created_at: string;
}

interface Modelo {
  id: string;
  nome: string;
  horizontal_cm: number | null;
  vertical_cm: number | null;
  descricao: string | null;
  imagem_url: string | null;
  ordem: number;
  ativo: boolean;
}

const CONFIG_KEYS = [
  { key: 'titulo', label: 'Título', textarea: false },
  { key: 'subtitulo', label: 'Subtítulo', textarea: false },
  { key: 'instrucoes_foto', label: 'Instruções para foto da arma', textarea: true },
  { key: 'instrucoes_customizacao', label: 'Instruções para customizações', textarea: true },
  { key: 'mensagem_pos_envio', label: 'Mensagem após envio', textarea: true },
  { key: 'whatsapp_destino', label: 'WhatsApp para receber pedidos (com DDI/DDD, só números)', textarea: false },
];

export default function CasesPatolaAdmin() {
  const [tab, setTab] = useState('solicitacoes');
  const [solicitacoes, setSolicitacoes] = useState<Solic[]>([]);
  const [modelos, setModelos] = useState<Modelo[]>([]);
  const [config, setConfig] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => { document.title = 'Cases Patola · Admin'; load(); }, []);

  async function load() {
    setLoading(true);
    const [s, m, c] = await Promise.all([
      supabase.from('cases_patola_solicitacoes').select('*').order('created_at', { ascending: false }),
      supabase.from('cases_patola_modelos').select('*').order('ordem'),
      supabase.from('cases_patola_config').select('chave, valor'),
    ]);
    setSolicitacoes((s.data as Solic[]) || []);
    setModelos((m.data as Modelo[]) || []);
    const kv: Record<string, string> = {};
    (c.data || []).forEach((r: any) => { kv[r.chave] = r.valor || ''; });
    setConfig(kv);
    setLoading(false);
  }

  function copyLink() {
    const url = `${window.location.origin}/cases-patola`;
    navigator.clipboard.writeText(url);
    toast.success('Link copiado!');
  }

  if (loading) return <div className="p-10 text-center"><Loader2 className="w-6 h-6 animate-spin mx-auto" /></div>;

  return (
    <div className="max-w-6xl mx-auto p-4 sm:p-6 space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-2xl font-light tracking-tight">Cases Patola Personalizadas</h1>
          <p className="text-sm text-muted-foreground">Gerencie solicitações de clientes e o formulário público.</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={copyLink}><Copy className="w-4 h-4 mr-1" /> Copiar link</Button>
          <Button variant="outline" asChild><a href="/cases-patola" target="_blank"><ExternalLink className="w-4 h-4 mr-1" /> Abrir</a></Button>
        </div>
      </div>

      <Tabs value={tab} onValueChange={setTab}>
        <TabsList className="w-full grid grid-cols-3">
          <TabsTrigger value="solicitacoes">Solicitações ({solicitacoes.length})</TabsTrigger>
          <TabsTrigger value="modelos">Modelos de Cases</TabsTrigger>
          <TabsTrigger value="config">Configurações</TabsTrigger>
        </TabsList>

        <TabsContent value="solicitacoes" className="space-y-3 mt-4">
          {solicitacoes.length === 0 && (
            <div className="text-center text-sm text-muted-foreground py-12">Nenhuma solicitação ainda.</div>
          )}
          {solicitacoes.map((s) => <SolicCard key={s.id} s={s} onChange={load} />)}
        </TabsContent>

        <TabsContent value="modelos" className="space-y-3 mt-4">
          <div className="flex justify-end">
            <Button onClick={async () => {
              const { error } = await supabase.from('cases_patola_modelos').insert({
                nome: 'Novo modelo', ordem: (modelos.at(-1)?.ordem ?? 0) + 1,
              });
              if (error) toast.error(error.message); else load();
            }}><Plus className="w-4 h-4 mr-1" /> Novo modelo</Button>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {modelos.map((m) => <ModeloCard key={m.id} m={m} onChange={load} />)}
          </div>
        </TabsContent>

        <TabsContent value="config" className="mt-4">
          <ConfigForm config={config} onSaved={load} />
        </TabsContent>
      </Tabs>
    </div>
  );
}

function SolicCard({ s, onChange }: { s: Solic; onChange: () => void }) {
  const wpp = (s.telefone || '').replace(/\D/g, '');
  return (
    <Card>
      <CardContent className="p-4 space-y-3">
        <div className="flex items-start justify-between gap-3 flex-wrap">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <User className="w-4 h-4 text-muted-foreground" />
              <span className="font-medium">{s.nome}</span>
              <Badge variant="outline" className="text-xs">{s.status}</Badge>
            </div>
            {s.telefone && <div className="text-xs text-muted-foreground flex items-center gap-1.5"><Phone className="w-3 h-3" /> {s.telefone}</div>}
            <div className="text-xs text-muted-foreground">{new Date(s.created_at).toLocaleString('pt-BR')}</div>
          </div>
          <div className="flex gap-2">
            {wpp && (
              <Button size="sm" variant="outline" asChild>
                <a href={`https://wa.me/${wpp}`} target="_blank" rel="noreferrer"><MessageCircle className="w-4 h-4 mr-1" /> WhatsApp</a>
              </Button>
            )}
            <Button size="sm" variant="ghost" onClick={async () => {
              if (!confirm('Excluir esta solicitação?')) return;
              await supabase.from('cases_patola_solicitacoes').delete().eq('id', s.id);
              onChange();
            }}><Trash2 className="w-4 h-4" /></Button>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-sm">
          {s.fabricante && <div><span className="text-muted-foreground text-xs">Fabricante:</span> {s.fabricante}</div>}
          {s.modelo_arma && <div><span className="text-muted-foreground text-xs">Modelo:</span> {s.modelo_arma}</div>}
          {s.calibre && <div><span className="text-muted-foreground text-xs">Calibre:</span> {s.calibre}</div>}
        </div>

        {s.customizacoes && (
          <div className="text-sm">
            <div className="text-xs text-muted-foreground flex items-center gap-1"><Wrench className="w-3 h-3" /> Customizações</div>
            <div>{s.customizacoes}</div>
          </div>
        )}
        {s.observacoes && (
          <div className="text-sm">
            <div className="text-xs text-muted-foreground flex items-center gap-1"><FileText className="w-3 h-3" /> Observações</div>
            <div>{s.observacoes}</div>
          </div>
        )}

        {(s.foto_arma_url || s.foto_carregador_url) && (
          <div className="grid grid-cols-2 gap-2">
            {s.foto_arma_url && (
              <a href={s.foto_arma_url} target="_blank" rel="noreferrer" className="block">
                <img src={s.foto_arma_url} alt="arma" className="w-full h-32 object-cover rounded border" />
                <div className="text-xs text-muted-foreground mt-1">Arma</div>
              </a>
            )}
            {s.foto_carregador_url && (
              <a href={s.foto_carregador_url} target="_blank" rel="noreferrer" className="block">
                <img src={s.foto_carregador_url} alt="carregador" className="w-full h-32 object-cover rounded border" />
                <div className="text-xs text-muted-foreground mt-1">Carregador</div>
              </a>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function ModeloCard({ m, onChange }: { m: Modelo; onChange: () => void }) {
  const [local, setLocal] = useState(m);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);

  async function save() {
    setSaving(true);
    const { error } = await supabase.from('cases_patola_modelos').update({
      nome: local.nome,
      horizontal_cm: local.horizontal_cm,
      vertical_cm: local.vertical_cm,
      descricao: local.descricao,
      imagem_url: local.imagem_url,
      ordem: local.ordem,
      ativo: local.ativo,
    }).eq('id', m.id);
    setSaving(false);
    if (error) toast.error(error.message); else { toast.success('Salvo'); onChange(); }
  }

  async function uploadImg(file: File) {
    setUploading(true);
    const ext = file.name.split('.').pop();
    const path = `modelos/${m.id}-${Date.now()}.${ext}`;
    const { error } = await supabase.storage.from(BUCKET).upload(path, file, { upsert: true, contentType: file.type });
    if (error) { toast.error(error.message); setUploading(false); return; }
    const { data } = supabase.storage.from(BUCKET).getPublicUrl(path);
    setLocal({ ...local, imagem_url: data.publicUrl });
    setUploading(false);
  }

  return (
    <Card>
      <CardContent className="p-4 space-y-3">
        <div className="flex gap-3">
          <div className="w-24 h-24 shrink-0 rounded border bg-muted/30 overflow-hidden flex items-center justify-center">
            {local.imagem_url ? <img src={local.imagem_url} alt="" className="w-full h-full object-cover" /> : <ImageIcon className="w-6 h-6 text-muted-foreground" />}
          </div>
          <div className="flex-1 space-y-2">
            <Input value={local.nome} onChange={(e) => setLocal({ ...local, nome: e.target.value })} placeholder="Nome do modelo" />
            <div className="grid grid-cols-2 gap-2">
              <Input type="number" step="0.1" value={local.horizontal_cm ?? ''} onChange={(e) => setLocal({ ...local, horizontal_cm: e.target.value === '' ? null : Number(e.target.value) })} placeholder="Horizontal cm" />
              <Input type="number" step="0.1" value={local.vertical_cm ?? ''} onChange={(e) => setLocal({ ...local, vertical_cm: e.target.value === '' ? null : Number(e.target.value) })} placeholder="Vertical cm" />
            </div>
          </div>
        </div>
        <Textarea value={local.descricao || ''} onChange={(e) => setLocal({ ...local, descricao: e.target.value })} placeholder="Descrição (opcional)" className="min-h-[60px]" />
        <div className="flex items-center gap-2 flex-wrap">
          <label className="text-xs flex items-center gap-1.5 cursor-pointer">
            <input type="checkbox" checked={local.ativo} onChange={(e) => setLocal({ ...local, ativo: e.target.checked })} /> Ativo
          </label>
          <Input type="number" value={local.ordem} onChange={(e) => setLocal({ ...local, ordem: Number(e.target.value) })} className="w-20 h-8" placeholder="Ordem" />
          <label className="ml-auto cursor-pointer">
            <input type="file" accept="image/*" className="hidden" onChange={(e) => e.target.files?.[0] && uploadImg(e.target.files[0])} />
            <span className="inline-flex items-center gap-1 text-xs px-3 py-2 border rounded hover:bg-muted">
              {uploading ? <Loader2 className="w-3 h-3 animate-spin" /> : <ImageIcon className="w-3 h-3" />} Imagem
            </span>
          </label>
          <Button size="sm" variant="ghost" onClick={async () => {
            if (!confirm('Excluir modelo?')) return;
            await supabase.from('cases_patola_modelos').delete().eq('id', m.id);
            onChange();
          }}><Trash2 className="w-4 h-4" /></Button>
          <Button size="sm" onClick={save} disabled={saving}>
            {saving ? <Loader2 className="w-3 h-3 animate-spin" /> : <Save className="w-3 h-3 mr-1" />} Salvar
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

function ConfigForm({ config, onSaved }: { config: Record<string, string>; onSaved: () => void }) {
  const [local, setLocal] = useState(config);
  const [saving, setSaving] = useState(false);

  async function saveAll() {
    setSaving(true);
    const rows = CONFIG_KEYS.map((c) => ({ chave: c.key, valor: local[c.key] || '' }));
    const { error } = await supabase.from('cases_patola_config').upsert(rows, { onConflict: 'chave' });
    setSaving(false);
    if (error) toast.error(error.message); else { toast.success('Configurações salvas'); onSaved(); }
  }

  return (
    <Card>
      <CardContent className="p-4 sm:p-6 space-y-4">
        {CONFIG_KEYS.map((c) => (
          <div key={c.key} className="space-y-1.5">
            <Label className="text-sm">{c.label}</Label>
            {c.textarea ? (
              <Textarea value={local[c.key] || ''} onChange={(e) => setLocal({ ...local, [c.key]: e.target.value })} className="min-h-[80px]" />
            ) : (
              <Input value={local[c.key] || ''} onChange={(e) => setLocal({ ...local, [c.key]: e.target.value })} />
            )}
          </div>
        ))}
        <Button onClick={saveAll} disabled={saving}>
          {saving ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Save className="w-4 h-4 mr-1" />} Salvar tudo
        </Button>
      </CardContent>
    </Card>
  );
}
