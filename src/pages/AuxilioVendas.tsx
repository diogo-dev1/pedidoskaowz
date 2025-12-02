import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Card, CardContent } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Copy, Download, Upload, X, Loader2, Search, Video } from 'lucide-react';

interface Modelo {
  id: string;
  nome_modelo: string;
  preco_base: number;
  imagem_modelo: string | null;
  apresentacao_venda: string | null;
  categoria: string;
  video_url: string | null;
}

type Categoria = 'Todas' | 'EDC' | 'Adaga' | 'Campo' | 'Cozinha' | 'Defesa' | 'KZR' | 'Upsell';

interface Midia {
  name: string;
  url: string;
}

export default function Catalogo() {
  const [modelos, setModelos] = useState<Modelo[]>([]);
  const [categoriaAtiva, setCategoriaAtiva] = useState<Categoria>('Todas');
  const [buscaTexto, setBuscaTexto] = useState('');
  const [modeloSelecionado, setModeloSelecionado] = useState<Modelo | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [preco, setPreco] = useState('');
  const [apresentacao, setApresentacao] = useState('');
  const [videoUrl, setVideoUrl] = useState('');
  const [videoFile, setVideoFile] = useState<File | null>(null);
  const [midias, setMidias] = useState<Midia[]>([]);
  const [salvando, setSalvando] = useState(false);
  const [carregandoMidias, setCarregandoMidias] = useState(false);
  const [uploadandoMidia, setUploadandoMidia] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    carregarModelos();
  }, []);

  const carregarModelos = async () => {
    const { data, error } = await supabase
      .from('catalogo_modelos')
      .select('*')
      .order('nome_modelo');

    if (error) {
      toast({
        title: 'Erro ao carregar modelos',
        description: error.message,
        variant: 'destructive',
      });
      return;
    }

    setModelos(data || []);
  };

  const carregarMidias = async (modeloId: string) => {
    setCarregandoMidias(true);
    const { data, error } = await supabase.storage
      .from('catalogo-midias')
      .list(modeloId);

    if (error) {
      console.error('Erro ao carregar mídias:', error);
      setMidias([]);
    } else {
      const midiasComUrl = await Promise.all(
        (data || []).map(async (file) => {
          const { data: urlData } = supabase.storage
            .from('catalogo-midias')
            .getPublicUrl(`${modeloId}/${file.name}`);
          return {
            name: file.name,
            url: urlData.publicUrl,
          };
        })
      );
      setMidias(midiasComUrl);
    }
    setCarregandoMidias(false);
  };

  const abrirModal = (modelo: Modelo) => {
    setModeloSelecionado(modelo);
    setPreco(modelo.preco_base.toString());
    setApresentacao(modelo.apresentacao_venda || '');
    setVideoUrl(modelo.video_url || '');
    setModalOpen(true);
    carregarMidias(modelo.id);
  };

  const fecharModal = () => {
    setModalOpen(false);
    setModeloSelecionado(null);
    setPreco('');
    setApresentacao('');
    setVideoUrl('');
    setVideoFile(null);
    setMidias([]);
  };

  const salvarAlteracoes = async () => {
    if (!modeloSelecionado) return;

    setSalvando(true);
    
    let finalVideoUrl = videoUrl || null;
    
    // Upload video file if selected
    if (videoFile) {
      const fileExt = videoFile.name.split('.').pop();
      const fileName = `videos/${modeloSelecionado.id}-${Date.now()}.${fileExt}`;
      
      const { error: uploadError } = await supabase.storage
        .from('catalogo-midias')
        .upload(fileName, videoFile);
      
      if (uploadError) {
        toast({
          title: 'Erro ao fazer upload do vídeo',
          description: uploadError.message,
          variant: 'destructive',
        });
        setSalvando(false);
        return;
      }
      
      const { data: urlData } = supabase.storage
        .from('catalogo-midias')
        .getPublicUrl(fileName);
      
      finalVideoUrl = urlData.publicUrl;
    }
    
    const { error } = await supabase
      .from('catalogo_modelos')
      .update({
        preco_base: parseFloat(preco),
        apresentacao_venda: apresentacao,
        video_url: finalVideoUrl,
      })
      .eq('id', modeloSelecionado.id);

    setSalvando(false);

    if (error) {
      toast({
        title: 'Erro ao salvar',
        description: error.message,
        variant: 'destructive',
      });
      return;
    }

    toast({
      title: 'Salvo com sucesso!',
      description: 'As alterações foram salvas.',
    });

    carregarModelos();
    fecharModal();
  };

  const copiarApresentacao = () => {
    navigator.clipboard.writeText(apresentacao);
    toast({
      title: 'Copiado!',
      description: 'Texto copiado para a área de transferência.',
    });
  };

  const handleUploadMidia = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!modeloSelecionado || !e.target.files?.length) return;

    const file = e.target.files[0];
    const fileName = `${modeloSelecionado.id}/${Date.now()}-${file.name}`;

    setUploadandoMidia(true);
    
    try {
      const { error } = await supabase.storage
        .from('catalogo-midias')
        .upload(fileName, file);

      if (error) {
        toast({
          title: 'Erro ao fazer upload',
          description: error.message,
          variant: 'destructive',
        });
        return;
      }

      toast({
        title: 'Upload realizado!',
        description: 'Mídia adicionada com sucesso.',
      });

      carregarMidias(modeloSelecionado.id);
    } catch (err) {
      console.error('Upload error:', err);
      toast({
        title: 'Erro ao fazer upload',
        description: 'Ocorreu um erro inesperado.',
        variant: 'destructive',
      });
    } finally {
      setUploadandoMidia(false);
      // Reset input
      e.target.value = '';
    }
  };

  const downloadMidia = (url: string, nome: string) => {
    const link = document.createElement('a');
    link.href = url;
    link.download = nome;
    link.click();
  };

  const copiarLinkMidia = (url: string) => {
    navigator.clipboard.writeText(url);
    toast({
      title: 'Link copiado!',
      description: 'Link da mídia copiado para a área de transferência.',
    });
  };

  const deletarMidia = async (nome: string) => {
    if (!modeloSelecionado) return;

    const { error } = await supabase.storage
      .from('catalogo-midias')
      .remove([`${modeloSelecionado.id}/${nome}`]);

    if (error) {
      toast({
        title: 'Erro ao deletar',
        description: error.message,
        variant: 'destructive',
      });
      return;
    }

    toast({
      title: 'Mídia deletada',
      description: 'A mídia foi removida com sucesso.',
    });

    carregarMidias(modeloSelecionado.id);
  };

  const categorias: Categoria[] = ['Todas', 'EDC', 'Adaga', 'Campo', 'Cozinha', 'Defesa', 'KZR', 'Upsell'];

  const modelosFiltrados = modelos
    .filter(m => categoriaAtiva === 'Todas' || m.categoria === categoriaAtiva)
    .filter(m => m.nome_modelo.toLowerCase().includes(buscaTexto.toLowerCase()));

  return (
    <div className="container mx-auto py-8 px-4">
      <h1 className="text-3xl font-bold mb-6 text-foreground">Catálogo de Lâminas</h1>
      
      {/* Campo de Busca */}
      <div className="relative mb-6">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          type="text"
          placeholder="Buscar modelos..."
          value={buscaTexto}
          onChange={(e) => setBuscaTexto(e.target.value)}
          className="pl-10"
        />
      </div>

      {/* Botões de Filtro */}
      <div className="flex flex-wrap gap-3 mb-6">
        {categorias.map((categoria) => (
          <Button
            key={categoria}
            variant={categoriaAtiva === categoria ? 'default' : 'outline'}
            onClick={() => setCategoriaAtiva(categoria)}
            className="min-w-[100px]"
          >
            {categoria}
          </Button>
        ))}
      </div>
      
      <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3 sm:gap-6">
        {modelosFiltrados.map((modelo) => (
          <Card
            key={modelo.id}
            className="cursor-pointer hover:shadow-lg transition-all"
            onClick={() => abrirModal(modelo)}
          >
            {modelo.imagem_modelo && (
              <div className="relative aspect-square bg-muted overflow-hidden">
                <img
                  src={modelo.imagem_modelo}
                  alt={modelo.nome_modelo}
                  className="w-full h-full object-cover"
                />
              </div>
            )}
            <CardContent className="p-2 sm:p-4">
              <div className="flex items-center gap-1">
                <h3 className="font-semibold text-xs sm:text-lg text-card-foreground truncate flex-1">
                  {modelo.nome_modelo}
                </h3>
                {modelo.video_url && (
                  <Video className="h-3 w-3 sm:h-4 sm:w-4 text-accent flex-shrink-0" />
                )}
              </div>
              <div className="flex flex-col sm:flex-row items-start sm:items-center sm:justify-between gap-1 mt-1 sm:mt-2">
                <p className="text-accent font-bold text-sm sm:text-base">
                  R$ {modelo.preco_base.toFixed(2)}
                </p>
                <span className="text-[10px] sm:text-xs bg-secondary text-secondary-foreground px-1.5 sm:px-2 py-0.5 sm:py-1 rounded">
                  {modelo.categoria}
                </span>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <Dialog open={modalOpen} onOpenChange={setModalOpen}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{modeloSelecionado?.nome_modelo}</DialogTitle>
          </DialogHeader>

          <div className="space-y-6">
            {/* Campo de Preço */}
            <div>
              <Label htmlFor="preco">Valor (R$)</Label>
              <Input
                id="preco"
                type="number"
                step="0.01"
                value={preco}
                onChange={(e) => setPreco(e.target.value)}
                placeholder="0.00"
              />
            </div>

            {/* Campo de Vídeo */}
            <div>
              <Label>Vídeo de Apresentação</Label>
              <div className="mt-2">
                <Button variant="outline" size="sm" asChild>
                  <label className="cursor-pointer">
                    <Video className="h-4 w-4 mr-2" />
                    {videoFile ? 'Trocar Vídeo' : videoUrl ? 'Substituir Vídeo' : 'Upload de Vídeo'}
                    <input
                      type="file"
                      className="hidden"
                      accept="video/*,.mov,.MOV,.mp4,.MP4,.webm,.WEBM"
                      onChange={(e) => {
                        if (e.target.files?.[0]) {
                          setVideoFile(e.target.files[0]);
                        }
                      }}
                    />
                  </label>
                </Button>
                {videoFile && (
                  <span className="ml-2 text-sm text-muted-foreground">
                    {videoFile.name}
                  </span>
                )}
              </div>
              {(videoUrl || videoFile) && (
                <div className="mt-2 rounded-lg overflow-hidden border max-w-[200px] mx-auto">
                  <div className="aspect-[9/16]">
                    <video
                      src={videoFile ? URL.createObjectURL(videoFile) : videoUrl}
                      controls
                      className="w-full h-full object-cover"
                    />
                  </div>
                </div>
              )}
            </div>

            {/* Campo de Apresentação */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <Label htmlFor="apresentacao">Apresentação de Venda</Label>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={copiarApresentacao}
                  disabled={!apresentacao}
                >
                  <Copy className="h-4 w-4 mr-2" />
                  Copiar
                </Button>
              </div>
              <Textarea
                id="apresentacao"
                value={apresentacao}
                onChange={(e) => setApresentacao(e.target.value)}
                placeholder="Escreva aqui a apresentação de venda..."
                rows={6}
              />
            </div>

            {/* Mídias */}
            <div>
              <div className="flex items-center justify-between mb-3">
                <Label>Mídias</Label>
                <Button variant="outline" size="sm" asChild disabled={uploadandoMidia}>
                  <label className="cursor-pointer">
                    {uploadandoMidia ? (
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    ) : (
                      <Upload className="h-4 w-4 mr-2" />
                    )}
                    {uploadandoMidia ? 'Enviando...' : 'Adicionar Mídia'}
                    <input
                      type="file"
                      className="hidden"
                      accept="image/*,video/*,.mov,.MOV,.mp4,.MP4"
                      onChange={handleUploadMidia}
                      disabled={uploadandoMidia}
                    />
                  </label>
                </Button>
              </div>

              {carregandoMidias ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                </div>
              ) : midias.length === 0 ? (
                <p className="text-sm text-muted-foreground py-4 text-center">
                  Nenhuma mídia adicionada ainda
                </p>
              ) : (
                <div className="grid grid-cols-2 gap-4">
              {midias.map((midia) => {
                    const isVideo = midia.name.match(/\.(mp4|webm|mov|avi)$/i);
                    return (
                      <div
                        key={midia.name}
                        className={`relative group border rounded-lg overflow-hidden bg-muted ${isVideo ? 'aspect-[9/16]' : ''}`}
                      >
                        {isVideo ? (
                          <video
                            src={midia.url}
                            className="w-full h-full object-cover"
                            muted
                          />
                        ) : (
                          <img
                            src={midia.url}
                            alt={midia.name}
                            className="w-full h-32 object-cover"
                          />
                        )}
                        <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                          <Button
                            size="sm"
                            variant="secondary"
                            onClick={() => downloadMidia(midia.url, midia.name)}
                          >
                            <Download className="h-4 w-4" />
                          </Button>
                          <Button
                            size="sm"
                            variant="secondary"
                            onClick={() => copiarLinkMidia(midia.url)}
                          >
                            <Copy className="h-4 w-4" />
                          </Button>
                          <Button
                            size="sm"
                            variant="destructive"
                            onClick={() => deletarMidia(midia.name)}
                          >
                            <X className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Botões de Ação */}
            <div className="flex justify-end gap-3 pt-4">
              <Button variant="outline" onClick={fecharModal}>
                Cancelar
              </Button>
              <Button onClick={salvarAlteracoes} disabled={salvando}>
                {salvando && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                Salvar Alterações
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
