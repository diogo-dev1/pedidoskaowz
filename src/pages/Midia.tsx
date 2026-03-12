import { useState, useRef } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { toast } from 'sonner';
import { Plus, ArrowLeft, Trash2, Edit2, ImagePlus, FolderOpen, X, Loader2 } from 'lucide-react';

type Album = {
  id: string;
  nome: string;
  descricao: string | null;
  capa_url: string | null;
  ordem: number;
  user_id: string;
  created_at: string;
  updated_at: string;
};

type ImagemAlbum = {
  id: string;
  album_id: string;
  url: string;
  nome_arquivo: string;
  legenda: string | null;
  ordem: number;
  created_at: string;
};

export default function Midia() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [albumAberto, setAlbumAberto] = useState<Album | null>(null);
  const [dialogAberto, setDialogAberto] = useState(false);
  const [editando, setEditando] = useState<Album | null>(null);
  const [nomeAlbum, setNomeAlbum] = useState('');
  const [descricaoAlbum, setDescricaoAlbum] = useState('');
  const [uploading, setUploading] = useState(false);
  const [deletandoAlbum, setDeletandoAlbum] = useState<string | null>(null);

  // Fetch albums
  const { data: albuns = [], isLoading: loadingAlbuns } = useQuery({
    queryKey: ['albuns_midia'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('albuns_midia')
        .select('*')
        .order('ordem', { ascending: true });
      if (error) throw error;
      return data as Album[];
    },
    enabled: !!user,
  });

  // Fetch images of open album
  const { data: imagens = [], isLoading: loadingImagens } = useQuery({
    queryKey: ['imagens_album', albumAberto?.id],
    queryFn: async () => {
      if (!albumAberto) return [];
      const { data, error } = await supabase
        .from('imagens_album')
        .select('*')
        .eq('album_id', albumAberto.id)
        .order('ordem', { ascending: true });
      if (error) throw error;
      return data as ImagemAlbum[];
    },
    enabled: !!albumAberto,
  });

  // Create/Update album
  const salvarAlbum = useMutation({
    mutationFn: async () => {
      if (!user) throw new Error('Não autenticado');
      if (editando) {
        const { error } = await supabase
          .from('albuns_midia')
          .update({ nome: nomeAlbum, descricao: descricaoAlbum || null })
          .eq('id', editando.id);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('albuns_midia')
          .insert({ nome: nomeAlbum, descricao: descricaoAlbum || null, user_id: user.id });
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['albuns_midia'] });
      toast.success(editando ? 'Álbum atualizado!' : 'Álbum criado!');
      fecharDialog();
    },
    onError: () => toast.error('Erro ao salvar álbum'),
  });

  // Delete album
  const deletarAlbum = useMutation({
    mutationFn: async (albumId: string) => {
      const { error } = await supabase.from('albuns_midia').delete().eq('id', albumId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['albuns_midia'] });
      toast.success('Álbum excluído!');
      setDeletandoAlbum(null);
      if (albumAberto) setAlbumAberto(null);
    },
    onError: () => toast.error('Erro ao excluir álbum'),
  });

  // Upload images
  const uploadImagens = async (files: FileList) => {
    if (!albumAberto || !user) return;
    setUploading(true);
    try {
      for (const file of Array.from(files)) {
        const ext = file.name.split('.').pop();
        const path = `${user.id}/${albumAberto.id}/${crypto.randomUUID()}.${ext}`;
        const { error: uploadError } = await supabase.storage
          .from('album-midias')
          .upload(path, file);
        if (uploadError) throw uploadError;

        const { data: urlData } = supabase.storage.from('album-midias').getPublicUrl(path);

        const { error: insertError } = await supabase.from('imagens_album').insert({
          album_id: albumAberto.id,
          url: urlData.publicUrl,
          nome_arquivo: file.name,
        });
        if (insertError) throw insertError;

        // Set first image as album cover if none
        if (!albumAberto.capa_url) {
          await supabase
            .from('albuns_midia')
            .update({ capa_url: urlData.publicUrl })
            .eq('id', albumAberto.id);
          setAlbumAberto({ ...albumAberto, capa_url: urlData.publicUrl });
          queryClient.invalidateQueries({ queryKey: ['albuns_midia'] });
        }
      }
      queryClient.invalidateQueries({ queryKey: ['imagens_album', albumAberto.id] });
      toast.success('Imagens enviadas!');
    } catch {
      toast.error('Erro ao enviar imagens');
    } finally {
      setUploading(false);
    }
  };

  // Delete image
  const deletarImagem = useMutation({
    mutationFn: async (img: ImagemAlbum) => {
      const { error } = await supabase.from('imagens_album').delete().eq('id', img.id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['imagens_album', albumAberto?.id] });
      toast.success('Imagem removida!');
    },
    onError: () => toast.error('Erro ao remover imagem'),
  });

  const abrirCriar = () => {
    setEditando(null);
    setNomeAlbum('');
    setDescricaoAlbum('');
    setDialogAberto(true);
  };

  const abrirEditar = (album: Album) => {
    setEditando(album);
    setNomeAlbum(album.nome);
    setDescricaoAlbum(album.descricao || '');
    setDialogAberto(true);
  };

  const fecharDialog = () => {
    setDialogAberto(false);
    setEditando(null);
    setNomeAlbum('');
    setDescricaoAlbum('');
  };

  // --- Album listing view ---
  if (!albumAberto) {
    return (
      <div className="p-4 md:p-6 space-y-6 max-w-5xl mx-auto">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold text-foreground">Mídia</h1>
          <Button onClick={abrirCriar} size="sm" className="gap-2">
            <Plus className="h-4 w-4" /> Novo Álbum
          </Button>
        </div>

        {loadingAlbuns ? (
          <div className="flex justify-center py-20">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : albuns.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-muted-foreground gap-3">
            <FolderOpen className="h-12 w-12" />
            <p>Nenhum álbum criado ainda</p>
            <Button onClick={abrirCriar} variant="outline" size="sm" className="gap-2">
              <Plus className="h-4 w-4" /> Criar primeiro álbum
            </Button>
          </div>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
            {albuns.map((album) => (
              <Card
                key={album.id}
                className="group cursor-pointer overflow-hidden border-border hover:border-accent/50 transition-all hover:shadow-md"
                onClick={() => setAlbumAberto(album)}
              >
                <div className="relative aspect-square bg-muted">
                  {album.capa_url ? (
                    <img
                      src={album.capa_url}
                      alt={album.nome}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <FolderOpen className="h-10 w-10 text-muted-foreground/40" />
                    </div>
                  )}
                  {/* Action buttons */}
                  <div className="absolute top-2 right-2 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button
                      onClick={(e) => { e.stopPropagation(); abrirEditar(album); }}
                      className="p-1.5 rounded-full bg-background/80 backdrop-blur-sm hover:bg-background text-foreground"
                    >
                      <Edit2 className="h-3.5 w-3.5" />
                    </button>
                    <button
                      onClick={(e) => { e.stopPropagation(); setDeletandoAlbum(album.id); }}
                      className="p-1.5 rounded-full bg-destructive/80 backdrop-blur-sm hover:bg-destructive text-destructive-foreground"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>
                <CardContent className="p-3">
                  <p className="font-medium text-sm text-foreground truncate">{album.nome}</p>
                  {album.descricao && (
                    <p className="text-xs text-muted-foreground truncate mt-0.5">{album.descricao}</p>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        {/* Create/Edit dialog */}
        <Dialog open={dialogAberto} onOpenChange={setDialogAberto}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>{editando ? 'Editar Álbum' : 'Novo Álbum'}</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label>Nome</Label>
                <Input
                  value={nomeAlbum}
                  onChange={(e) => setNomeAlbum(e.target.value)}
                  placeholder="Nome do álbum"
                />
              </div>
              <div>
                <Label>Descrição (opcional)</Label>
                <Textarea
                  value={descricaoAlbum}
                  onChange={(e) => setDescricaoAlbum(e.target.value)}
                  placeholder="Descrição breve"
                  rows={2}
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={fecharDialog}>Cancelar</Button>
              <Button
                onClick={() => salvarAlbum.mutate()}
                disabled={!nomeAlbum.trim() || salvarAlbum.isPending}
              >
                {salvarAlbum.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Salvar'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Delete confirmation */}
        <Dialog open={!!deletandoAlbum} onOpenChange={() => setDeletandoAlbum(null)}>
          <DialogContent className="sm:max-w-sm">
            <DialogHeader>
              <DialogTitle>Excluir álbum?</DialogTitle>
            </DialogHeader>
            <p className="text-sm text-muted-foreground">Todas as imagens do álbum serão excluídas permanentemente.</p>
            <DialogFooter>
              <Button variant="outline" onClick={() => setDeletandoAlbum(null)}>Cancelar</Button>
              <Button
                variant="destructive"
                onClick={() => deletandoAlbum && deletarAlbum.mutate(deletandoAlbum)}
                disabled={deletarAlbum.isPending}
              >
                {deletarAlbum.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Excluir'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    );
  }

  // --- Album detail / images view ---
  return (
    <div className="p-4 md:p-6 space-y-4 max-w-5xl mx-auto">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" onClick={() => setAlbumAberto(null)}>
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div className="flex-1 min-w-0">
          <h1 className="text-xl font-bold text-foreground truncate">{albumAberto.nome}</h1>
          {albumAberto.descricao && (
            <p className="text-sm text-muted-foreground truncate">{albumAberto.descricao}</p>
          )}
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            className="gap-2"
            onClick={() => abrirEditar(albumAberto)}
          >
            <Edit2 className="h-4 w-4" /> Editar
          </Button>
          <Button
            size="sm"
            className="gap-2"
            onClick={() => fileInputRef.current?.click()}
            disabled={uploading}
          >
            {uploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <ImagePlus className="h-4 w-4" />}
            Adicionar
          </Button>
        </div>
      </div>

      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        multiple
        className="hidden"
        onChange={(e) => e.target.files && uploadImagens(e.target.files)}
      />

      {/* Images grid */}
      {loadingImagens ? (
        <div className="flex justify-center py-20">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      ) : imagens.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-muted-foreground gap-3">
          <ImagePlus className="h-12 w-12" />
          <p>Nenhuma imagem neste álbum</p>
          <Button
            variant="outline"
            size="sm"
            className="gap-2"
            onClick={() => fileInputRef.current?.click()}
          >
            <Plus className="h-4 w-4" /> Adicionar imagens
          </Button>
        </div>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
          {imagens.map((img) => (
            <div key={img.id} className="group relative aspect-square rounded-lg overflow-hidden border border-border bg-muted">
              <img
                src={img.url}
                alt={img.nome_arquivo}
                className="w-full h-full object-cover"
                loading="lazy"
              />
              <button
                onClick={() => deletarImagem.mutate(img)}
                className="absolute top-2 right-2 p-1.5 rounded-full bg-destructive/80 backdrop-blur-sm hover:bg-destructive text-destructive-foreground opacity-0 group-hover:opacity-100 transition-opacity"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Reuse create/edit dialog */}
      <Dialog open={dialogAberto} onOpenChange={setDialogAberto}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{editando ? 'Editar Álbum' : 'Novo Álbum'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Nome</Label>
              <Input
                value={nomeAlbum}
                onChange={(e) => setNomeAlbum(e.target.value)}
                placeholder="Nome do álbum"
              />
            </div>
            <div>
              <Label>Descrição (opcional)</Label>
              <Textarea
                value={descricaoAlbum}
                onChange={(e) => setDescricaoAlbum(e.target.value)}
                placeholder="Descrição breve"
                rows={2}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={fecharDialog}>Cancelar</Button>
            <Button
              onClick={() => salvarAlbum.mutate()}
              disabled={!nomeAlbum.trim() || salvarAlbum.isPending}
            >
              {salvarAlbum.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Salvar'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
