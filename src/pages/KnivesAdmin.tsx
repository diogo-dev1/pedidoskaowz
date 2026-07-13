import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { Loader2, Trash2, Upload } from "lucide-react";
import KnifeViewer360 from "@/components/KnifeViewer360";

interface Knife {
  id: string;
  name: string;
  video_url: string; // storage path
  created_at: string;
}

const BUCKET = "knife-videos";

export default function KnivesAdmin() {
  const [name, setName] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [knives, setKnives] = useState<Knife[]>([]);
  const [loading, setLoading] = useState(true);
  const [signedUrls, setSignedUrls] = useState<Record<string, string>>({});

  const fetchKnives = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("knives" as any)
      .select("*")
      .order("created_at", { ascending: false });
    if (error) {
      toast.error("Erro ao carregar facas: " + error.message);
      setLoading(false);
      return;
    }
    const list = (data || []) as unknown as Knife[];
    setKnives(list);
    // gera signed urls
    const map: Record<string, string> = {};
    await Promise.all(
      list.map(async (k) => {
        const { data: s } = await supabase.storage
          .from(BUCKET)
          .createSignedUrl(k.video_url, 60 * 60);
        if (s?.signedUrl) map[k.id] = s.signedUrl;
      })
    );
    setSignedUrls(map);
    setLoading(false);
  };

  useEffect(() => {
    fetchKnives();
  }, []);

  const handleUpload = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !file) {
      toast.error("Informe o nome e selecione um vídeo.");
      return;
    }
    setUploading(true);
    try {
      const ext = file.name.split(".").pop() || "mp4";
      const path = `${crypto.randomUUID()}.${ext}`;
      const { error: upErr } = await supabase.storage
        .from(BUCKET)
        .upload(path, file, {
          contentType: file.type || "video/mp4",
          upsert: false,
        });
      if (upErr) throw upErr;

      const { error: insErr } = await supabase
        .from("knives" as any)
        .insert({ name: name.trim(), video_url: path });
      if (insErr) throw insErr;

      toast.success("Faca cadastrada com sucesso!");
      setName("");
      setFile(null);
      (document.getElementById("knife-file") as HTMLInputElement | null)?.value &&
        ((document.getElementById("knife-file") as HTMLInputElement).value = "");
      await fetchKnives();
    } catch (err: any) {
      toast.error("Falha no upload: " + (err.message || String(err)));
    } finally {
      setUploading(false);
    }
  };

  const handleDelete = async (k: Knife) => {
    if (!confirm(`Excluir "${k.name}"?`)) return;
    const { error: sErr } = await supabase.storage.from(BUCKET).remove([k.video_url]);
    if (sErr) {
      toast.error("Erro ao remover arquivo: " + sErr.message);
      return;
    }
    const { error: dErr } = await supabase.from("knives" as any).delete().eq("id", k.id);
    if (dErr) {
      toast.error("Erro ao remover registro: " + dErr.message);
      return;
    }
    toast.success("Faca removida.");
    fetchKnives();
  };

  return (
    <div className="max-w-4xl mx-auto p-4 space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Visualizador 360° — Admin</h1>
        <p className="text-sm text-muted-foreground">
          Faça upload dos vídeos 360° das facas. Eles aparecerão no showroom público.
        </p>
      </div>

      <Card className="p-4">
        <form onSubmit={handleUpload} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="knife-name">Nome da Faca</Label>
            <Input
              id="knife-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Ex.: EDC Tantō"
              disabled={uploading}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="knife-file">Vídeo 360°</Label>
            <Input
              id="knife-file"
              type="file"
              accept="video/*"
              onChange={(e) => setFile(e.target.files?.[0] || null)}
              disabled={uploading}
            />
          </div>
          <Button type="submit" disabled={uploading} className="w-full sm:w-auto">
            {uploading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Enviando...
              </>
            ) : (
              <>
                <Upload className="mr-2 h-4 w-4" /> Enviar
              </>
            )}
          </Button>
        </form>
      </Card>

      <div>
        <h2 className="text-lg font-semibold mb-3">Facas cadastradas</h2>
        {loading ? (
          <div className="flex items-center gap-2 text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" /> Carregando...
          </div>
        ) : knives.length === 0 ? (
          <p className="text-sm text-muted-foreground">Nenhuma faca cadastrada.</p>
        ) : (
          <div className="space-y-2">
            {knives.map((k) => (
              <Card key={k.id} className="p-3 flex items-center justify-between gap-3">
                <div className="flex items-center gap-3 min-w-0">
                  {signedUrls[k.id] ? (
                    <video
                      src={signedUrls[k.id]}
                      className="h-14 w-14 rounded object-cover bg-zinc-900"
                      muted
                      playsInline
                    />
                  ) : (
                    <div className="h-14 w-14 rounded bg-zinc-900" />
                  )}
                  <div className="min-w-0">
                    <p className="font-medium truncate">{k.name}</p>
                    <p className="text-xs text-muted-foreground truncate">
                      {new Date(k.created_at).toLocaleString("pt-BR")}
                    </p>
                  </div>
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => handleDelete(k)}
                  aria-label={`Excluir ${k.name}`}
                >
                  <Trash2 className="h-4 w-4 text-red-500" />
                </Button>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
