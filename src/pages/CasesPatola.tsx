import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { toast } from 'sonner';
import { Camera, Loader2, CheckCircle2, Ruler, Crosshair, Wrench, Upload, X } from 'lucide-react';

interface CaseModelo {
  id: string;
  nome: string;
  horizontal_cm: number | null;
  vertical_cm: number | null;
  descricao: string | null;
  imagem_url: string | null;
  ordem: number;
}

interface ConfigKV {
  [k: string]: string;
}

const CASES_BUCKET = 'cases-patola';

async function uploadFile(file: File, prefix: string): Promise<string | null> {
  const ext = file.name.split('.').pop() || 'jpg';
  const path = `${prefix}/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;
  const { error } = await supabase.storage.from(CASES_BUCKET).upload(path, file, {
    cacheControl: '3600',
    upsert: false,
    contentType: file.type,
  });
  if (error) {
    toast.error('Erro ao enviar imagem: ' + error.message);
    return null;
  }
  const { data } = supabase.storage.from(CASES_BUCKET).getPublicUrl(path);
  return data.publicUrl;
}

export default function CasesPatola() {
  const [modelos, setModelos] = useState<CaseModelo[]>([]);
  const [config, setConfig] = useState<ConfigKV>({});
  const [enviado, setEnviado] = useState(false);
  const [enviando, setEnviando] = useState(false);

  // Form
  const [nome, setNome] = useState('');
  const [telefone, setTelefone] = useState('');
  const [fabricante, setFabricante] = useState('');
  const [modeloArma, setModeloArma] = useState('');
  const [calibre, setCalibre] = useState('');
  const [customizacoes, setCustomizacoes] = useState('');
  const [observacoes, setObservacoes] = useState('');
  const [fotoArma, setFotoArma] = useState<File | null>(null);
  const [fotoCarregador, setFotoCarregador] = useState<File | null>(null);

  useEffect(() => {
    document.title = 'Case Patola Personalizada · Kaowz';
    (async () => {
      const [{ data: m }, { data: c }] = await Promise.all([
        supabase.from('cases_patola_modelos').select('*').eq('ativo', true).order('ordem'),
        supabase.from('cases_patola_config').select('chave, valor'),
      ]);
      setModelos((m as CaseModelo[]) || []);
      const kv: ConfigKV = {};
      (c || []).forEach((r: any) => { kv[r.chave] = r.valor || ''; });
      setConfig(kv);
    })();
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!nome.trim()) { toast.error('Informe seu nome'); return; }
    setEnviando(true);
    try {
      let foto_arma_url: string | null = null;
      let foto_carregador_url: string | null = null;
      if (fotoArma) foto_arma_url = await uploadFile(fotoArma, 'arma');
      if (fotoCarregador) foto_carregador_url = await uploadFile(fotoCarregador, 'carregador');

      const { error } = await supabase.from('cases_patola_solicitacoes').insert({
        nome: nome.trim(),
        telefone: telefone.trim() || null,
        fabricante: fabricante.trim() || null,
        modelo_arma: modeloArma.trim() || null,
        calibre: calibre.trim() || null,
        customizacoes: customizacoes.trim() || null,
        observacoes: observacoes.trim() || null,
        foto_arma_url,
        foto_carregador_url,
      });
      if (error) throw error;

      // WhatsApp
      const wpp = (config.whatsapp_destino || '').replace(/\D/g, '');
      if (wpp) {
        const resumo = [
          `*Nova solicitação Case Patola*`,
          `*Nome:* ${nome}`,
          telefone && `*Telefone:* ${telefone}`,
          fabricante && `*Fabricante:* ${fabricante}`,
          modeloArma && `*Modelo:* ${modeloArma}`,
          calibre && `*Calibre:* ${calibre}`,
          customizacoes && `*Customizações:* ${customizacoes}`,
          observacoes && `*Observações:* ${observacoes}`,
          foto_arma_url && `*Foto da arma:* ${foto_arma_url}`,
          foto_carregador_url && `*Foto carregador:* ${foto_carregador_url}`,
        ].filter(Boolean).join('\n');
        window.open(`https://wa.me/${wpp}?text=${encodeURIComponent(resumo)}`, '_blank');
      }
      setEnviado(true);
    } catch (err: any) {
      toast.error('Erro ao enviar: ' + (err.message || 'tente novamente'));
    } finally {
      setEnviando(false);
    }
  }

  if (enviado) {
    return (
      <div className="min-h-screen bg-zinc-950 text-zinc-100 flex items-center justify-center p-6">
        <div className="max-w-md w-full text-center space-y-5 animate-in fade-in slide-in-from-bottom-4 duration-500">
          <div className="mx-auto w-16 h-16 rounded-full bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center">
            <CheckCircle2 className="w-8 h-8 text-emerald-400" />
          </div>
          <h1 className="text-2xl font-light tracking-tight">Solicitação enviada!</h1>
          <p className="text-zinc-400 text-sm leading-relaxed">{config.mensagem_pos_envio}</p>
          <Button variant="outline" onClick={() => window.location.reload()} className="border-zinc-700">
            Enviar nova solicitação
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100">
      {/* Header */}
      <header className="border-b border-zinc-900 px-4 py-6 sm:py-10">
        <div className="max-w-3xl mx-auto text-center space-y-2">
          <div className="inline-flex items-center gap-2 text-[10px] uppercase tracking-[0.25em] text-amber-400/80">
            <span className="h-px w-6 bg-amber-400/40" /> Kaowz <span className="h-px w-6 bg-amber-400/40" />
          </div>
          <h1 className="text-2xl sm:text-4xl font-light tracking-tight">{config.titulo || 'Case Patola Personalizada'}</h1>
          <p className="text-zinc-400 text-sm sm:text-base">{config.subtitulo}</p>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-4 py-6 sm:py-10 space-y-8">
        {/* Modelos de cases - referência */}
        {modelos.length > 0 && (
          <section className="space-y-3">
            <div className="flex items-center gap-2 text-zinc-300">
              <Ruler className="w-4 h-4" />
              <h2 className="text-sm uppercase tracking-wider font-medium">Modelos disponíveis</h2>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {modelos.map((m) => (
                <div key={m.id} className="bg-zinc-900/50 border border-zinc-800 rounded-lg overflow-hidden">
                  {m.imagem_url ? (
                    <img src={m.imagem_url} alt={m.nome} className="w-full aspect-[4/3] object-cover" loading="lazy" />
                  ) : (
                    <div className="w-full aspect-[4/3] bg-zinc-800/40 flex items-center justify-center text-zinc-600 text-xs">Sem imagem</div>
                  )}
                  <div className="p-3 space-y-1">
                    <div className="font-medium text-sm">{m.nome}</div>
                    <div className="text-xs text-zinc-400">
                      {m.horizontal_cm} cm × {m.vertical_cm} cm
                    </div>
                    {m.descricao && <div className="text-xs text-zinc-500 line-clamp-2">{m.descricao}</div>}
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}

        <form onSubmit={handleSubmit} className="space-y-8">
          {/* Contato */}
          <section className="space-y-3">
            <h2 className="text-sm uppercase tracking-wider font-medium text-zinc-300">Seus dados</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <Field label="Nome completo *">
                <Input value={nome} onChange={(e) => setNome(e.target.value)} required className="bg-zinc-900 border-zinc-800" />
              </Field>
              <Field label="WhatsApp">
                <Input value={telefone} onChange={(e) => setTelefone(e.target.value)} placeholder="(11) 99999-9999" className="bg-zinc-900 border-zinc-800" />
              </Field>
            </div>
          </section>

          {/* Modelo da arma */}
          <section className="space-y-3">
            <div className="flex items-center gap-2 text-zinc-300">
              <Crosshair className="w-4 h-4" />
              <h2 className="text-sm uppercase tracking-wider font-medium">Modelo do armamento</h2>
            </div>
            <p className="text-xs text-zinc-500">Geralmente gravado no cano ou slide da arma e no documento de registro.</p>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <Field label="Fabricante"><Input value={fabricante} onChange={(e) => setFabricante(e.target.value)} placeholder="Glock, Taurus..." className="bg-zinc-900 border-zinc-800" /></Field>
              <Field label="Modelo exato"><Input value={modeloArma} onChange={(e) => setModeloArma(e.target.value)} placeholder="Glock 17 Gen 5" className="bg-zinc-900 border-zinc-800" /></Field>
              <Field label="Calibre"><Input value={calibre} onChange={(e) => setCalibre(e.target.value)} placeholder="9mm, .40..." className="bg-zinc-900 border-zinc-800" /></Field>
            </div>
          </section>

          {/* Fotos */}
          <section className="space-y-3">
            <div className="flex items-center gap-2 text-zinc-300">
              <Camera className="w-4 h-4" />
              <h2 className="text-sm uppercase tracking-wider font-medium">Fotos do armamento</h2>
            </div>
            {config.instrucoes_foto && (
              <div className="text-xs text-zinc-400 leading-relaxed bg-zinc-900/40 border border-zinc-800/60 rounded-md p-3 whitespace-pre-line">
                {config.instrucoes_foto}
              </div>
            )}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <FileDrop label="Foto da arma (vista de cima)" file={fotoArma} onChange={setFotoArma} />
              <FileDrop label="Foto do carregador (em pé)" file={fotoCarregador} onChange={setFotoCarregador} />
            </div>
          </section>

          {/* Customizações */}
          <section className="space-y-3">
            <div className="flex items-center gap-2 text-zinc-300">
              <Wrench className="w-4 h-4" />
              <h2 className="text-sm uppercase tracking-wider font-medium">Customizações</h2>
            </div>
            {config.instrucoes_customizacao && (
              <p className="text-xs text-zinc-500 leading-relaxed">{config.instrucoes_customizacao}</p>
            )}
            <Textarea
              value={customizacoes}
              onChange={(e) => setCustomizacoes(e.target.value)}
              placeholder='Ex.: Lanterna tática, mira red dot, carregador estendido. Ou "Sem customizações".'
              className="bg-zinc-900 border-zinc-800 min-h-[80px]"
            />
          </section>

          {/* Observações */}
          <section className="space-y-3">
            <h2 className="text-sm uppercase tracking-wider font-medium text-zinc-300">Observações (opcional)</h2>
            <Textarea
              value={observacoes}
              onChange={(e) => setObservacoes(e.target.value)}
              placeholder="Algo mais que devamos saber?"
              className="bg-zinc-900 border-zinc-800 min-h-[60px]"
            />
          </section>

          <div className="pt-4">
            <Button type="submit" disabled={enviando} className="w-full h-12 text-base bg-amber-500 hover:bg-amber-400 text-zinc-950 font-medium">
              {enviando ? <><Loader2 className="w-4 h-4 animate-spin mr-2" /> Enviando…</> : 'Enviar solicitação'}
            </Button>
          </div>
        </form>

        <footer className="text-center text-[10px] text-zinc-600 uppercase tracking-widest pt-6 pb-10">
          Kaowz · Cases sob medida
        </footer>
      </main>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <Label className="text-xs text-zinc-400">{label}</Label>
      {children}
    </div>
  );
}

function FileDrop({ label, file, onChange }: { label: string; file: File | null; onChange: (f: File | null) => void }) {
  const id = `f-${label.replace(/\s/g, '')}`;
  return (
    <div className="space-y-1.5">
      <Label className="text-xs text-zinc-400">{label}</Label>
      <label
        htmlFor={id}
        className="flex flex-col items-center justify-center gap-2 border border-dashed border-zinc-700 hover:border-amber-500/60 transition-colors rounded-md p-4 cursor-pointer bg-zinc-900/40 min-h-[110px] text-center"
      >
        {file ? (
          <>
            <img src={URL.createObjectURL(file)} alt="preview" className="max-h-24 rounded" />
            <div className="flex items-center gap-2 text-xs text-zinc-400">
              <span className="truncate max-w-[180px]">{file.name}</span>
              <button type="button" onClick={(e) => { e.preventDefault(); onChange(null); }} className="text-zinc-500 hover:text-red-400"><X className="w-3 h-3" /></button>
            </div>
          </>
        ) : (
          <>
            <Upload className="w-5 h-5 text-zinc-500" />
            <span className="text-xs text-zinc-500">Toque para selecionar ou tirar foto</span>
          </>
        )}
      </label>
      <input
        id={id}
        type="file"
        accept="image/*"
        capture="environment"
        className="hidden"
        onChange={(e) => onChange(e.target.files?.[0] || null)}
      />
    </div>
  );
}
