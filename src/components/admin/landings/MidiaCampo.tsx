import { useRef, useState } from 'react';
import { toast } from 'sonner';
import { ImageIcon, Loader2, Upload, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { enviarMidiaLanding } from '@/lib/landings';
import type { TipoMidia } from '@/lib/landingsRegras';

interface Props {
  url: string | null;
  tipo: TipoMidia;
  /** Pasta no bucket (ex.: slug da landing). */
  pasta: string;
  onChange: (url: string | null, tipo: TipoMidia) => void;
  idBase: string;
}

/** Mídia por upload (bucket `landings`) ou por URL colada, com prévia. */
export function MidiaCampo({ url, tipo, pasta, onChange, idBase }: Props) {
  const arquivo = useRef<HTMLInputElement>(null);
  const [enviando, setEnviando] = useState(false);

  const enviar = async (lista: FileList | null) => {
    const file = lista?.[0];
    if (!file) return;
    if (file.size > 50 * 1024 * 1024) {
      toast.error('Arquivo acima de 50 MB. Comprima o vídeo antes de enviar.');
      return;
    }
    setEnviando(true);
    try {
      const r = await enviarMidiaLanding(file, pasta);
      onChange(r.url, r.tipo);
      toast.success('Mídia enviada');
    } catch {
      toast.error('Não foi possível enviar. Confira a conexão e tente de novo.');
    } finally {
      setEnviando(false);
      if (arquivo.current) arquivo.current.value = '';
    }
  };

  return (
    <div className="flex flex-col gap-3 sm:flex-row">
      <div className="relative flex aspect-[4/5] w-24 shrink-0 items-center justify-center overflow-hidden rounded-lg border bg-muted">
        {url ? (
          tipo === 'video' ? (
            <video src={url} className="h-full w-full object-cover" muted playsInline preload="metadata" />
          ) : (
            <img src={url} alt="" loading="lazy" className="h-full w-full object-cover" />
          )
        ) : (
          <ImageIcon className="h-5 w-5 text-muted-foreground" aria-hidden />
        )}
      </div>

      <div className="flex min-w-0 flex-1 flex-col gap-2">
        <div className="flex flex-wrap gap-2">
          <Button type="button" variant="outline" className="h-10 rounded-lg" disabled={enviando} onClick={() => arquivo.current?.click()}>
            {enviando ? <Loader2 className="animate-spin" /> : <Upload />}
            {enviando ? 'Enviando…' : 'Enviar arquivo'}
          </Button>
          {url && (
            <Button type="button" variant="ghost" className="h-10 rounded-lg text-muted-foreground" onClick={() => onChange(null, tipo)}>
              <X /> Remover
            </Button>
          )}
          <input
            ref={arquivo}
            type="file"
            accept="image/*,video/mp4,video/webm,video/quicktime"
            className="hidden"
            onChange={(e) => enviar(e.target.files)}
          />
        </div>
        <div className="flex gap-2">
          <Input
            id={`${idBase}-url`}
            aria-label="URL da mídia"
            placeholder="ou cole uma URL"
            value={url ?? ''}
            onChange={(e) => onChange(e.target.value || null, tipo)}
            className="min-w-0 flex-1 rounded-lg"
          />
          <Select value={tipo} onValueChange={(v) => onChange(url, v as TipoMidia)}>
            <SelectTrigger className="w-28 rounded-lg" aria-label="Tipo de mídia">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="imagem">Imagem</SelectItem>
              <SelectItem value="video">Vídeo</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>
    </div>
  );
}
