import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Card, CardContent } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Copy, Download, Upload, X, Loader2, Search, Video, Share2, Eye, EyeOff, ImageIcon, Star } from 'lucide-react';

interface Modelo {
  id: string;
  nome_modelo: string;
  preco_base: number;
  imagem_modelo: string | null;
  apresentacao_venda: string | null;
  categoria: string;
  video_url: string | null;
  garantia: string | null;
  prazo_entrega: string | null;
}

type Categoria = 'Todas' | 'EDC' | 'Adaga' | 'Campo' | 'Cozinha' | 'Defesa' | 'KZR' | 'Upsell';

interface Midia {
  id: string;
  nome_arquivo: string;
  url: string;
  visivel_catalogo: boolean;
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
  const [nomeModelo, setNomeModelo] = useState('');
  const [imagemModelo, setImagemModelo] = useState('');
  const [categoria, setCategoria] = useState('');
  const [garantia, setGarantia] = useState('');
  const [prazoEntrega, setPrazoEntrega] = useState('');
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
    
    const { data, error } = await supabase
      .from('midias_catalogo')
      .select('*')
      .eq('modelo_id', modeloId)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Erro ao carregar mídias:', error);
      setMidias([]);
    } else {
      setMidias(data || []);
    }
    
    setCarregandoMidias(false);
  };

  const abrirModal = (modelo: Modelo) => {
    setModeloSelecionado(modelo);
    setPreco(modelo.preco_base.toString());
    setApresentacao(modelo.apresentacao_venda || '');
    setVideoUrl(modelo.video_url || '');
    setNomeModelo(modelo.nome_modelo);
    setImagemModelo(modelo.imagem_modelo || '');
    setCategoria(modelo.categoria);
    setGarantia(modelo.garantia || '');
    setPrazoEntrega(modelo.prazo_entrega || '');
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
    setNomeModelo('');
    setImagemModelo('');
    setCategoria('');
    setGarantia('');
    setPrazoEntrega('');
  };

  const salvarAlteracoes = async () => {
    if (!modeloSelecionado) return;

    setSalvando(true);
    
    let finalVideoUrl = videoUrl || null;
    
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
        nome_modelo: nomeModelo,
        preco_base: parseFloat(preco),
        apresentacao_venda: apresentacao,
        video_url: finalVideoUrl,
        imagem_modelo: imagemModelo || null,
        categoria: categoria,
        garantia: garantia || null,
        prazo_entrega: prazoEntrega || null,
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
      const { error: uploadError } = await supabase.storage
        .from('catalogo-midias')
        .upload(fileName, file);

      if (uploadError) {
        toast({
          title: 'Erro ao fazer upload',
          description: uploadError.message,
          variant: 'destructive',
        });
        return;
      }

      const { data: urlData } = supabase.storage
        .from('catalogo-midias')
        .getPublicUrl(fileName);

      // Salvar na tabela de metadados
      const { error: dbError } = await supabase
        .from('midias_catalogo')
        .insert({
          modelo_id: modeloSelecionado.id,
          nome_arquivo: fileName,
          url: urlData.publicUrl,
          visivel_catalogo: true
        });

      if (dbError) {
        console.error('Erro ao salvar metadados:', dbError);
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
      e.target.value = '';
    }
  };

  const toggleVisibilidade = async (midia: Midia) => {
    const { error } = await supabase
      .from('midias_catalogo')
      .update({ visivel_catalogo: !midia.visivel_catalogo })
      .eq('id', midia.id);

    if (error) {
      toast({
        title: 'Erro ao atualizar',
        description: error.message,
        variant: 'destructive',
      });
      return;
    }

    setMidias(prev => 
      prev.map(m => m.id === midia.id ? { ...m, visivel_catalogo: !m.visivel_catalogo } : m)
    );

    toast({
      title: midia.visivel_catalogo ? 'Mídia ocultada' : 'Mídia visível',
      description: midia.visivel_catalogo 
        ? 'Esta mídia não será exibida no catálogo público.'
        : 'Esta mídia será exibida no catálogo público.',
    });
  };

  const definirComoCapa = async (midia: Midia) => {
    if (!modeloSelecionado) return;

    const isVideo = midia.nome_arquivo.match(/\.(mp4|webm|mov|avi)$/i);
    
    const updateData: Record<string, string | null> = {};
    
    if (isVideo) {
      updateData.video_url = midia.url;
      updateData.imagem_modelo = null;
      setVideoUrl(midia.url);
      setImagemModelo('');
    } else {
      updateData.imagem_modelo = midia.url;
      updateData.video_url = null;
      setImagemModelo(midia.url);
      setVideoUrl('');
    }

    const { error } = await supabase
      .from('catalogo_modelos')
      .update(updateData)
      .eq('id', modeloSelecionado.id);

    if (error) {
      toast({
        title: 'Erro ao definir capa',
        description: error.message,
        variant: 'destructive',
      });
      return;
    }

    toast({
      title: 'Capa definida!',
      description: isVideo 
        ? 'Este vídeo será exibido no card de apresentação.'
        : 'Esta imagem será exibida no card de apresentação.',
    });

    carregarModelos();
  };

  const downloadMidia = (url: string, nome: string) => {
    const link = document.createElement('a');
    link.href = url;
    link.download = nome;
    link.click();
  };

  const copiarLinkMidia = async (url: string) => {
    await navigator.clipboard.writeText(url);
    toast({
      title: 'Link copiado!',
      description: 'Link da mídia copiado para a área de transferência.',
    });
  };

  const compartilharMidia = async (url: string, nome: string) => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: nome,
          url: url
        });
      } catch (err) {
        // User cancelled or error
        copiarLinkMidia(url);
      }
    } else {
      copiarLinkMidia(url);
    }
  };

  const deletarMidia = async (midia: Midia) => {
    // Deletar do storage
    const { error: storageError } = await supabase.storage
      .from('catalogo-midias')
      .remove([midia.nome_arquivo]);

    if (storageError) {
      console.error('Erro ao deletar do storage:', storageError);
    }

    // Deletar da tabela
    const { error: dbError } = await supabase
      .from('midias_catalogo')
      .delete()
      .eq('id', midia.id);

    if (dbError) {
      toast({
        title: 'Erro ao deletar',
        description: dbError.message,
        variant: 'destructive',
      });
      return;
    }

    toast({
      title: 'Mídia deletada',
      description: 'A mídia foi removida com sucesso.',
    });

    setMidias(prev => prev.filter(m => m.id !== midia.id));
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
        {categorias.map((cat) => (
          <Button
            key={cat}
            variant={categoriaAtiva === cat ? 'default' : 'outline'}
            onClick={() => setCategoriaAtiva(cat)}
            className="min-w-[100px]"
          >
            {cat}
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
            {/* Campo de Nome */}
            <div>
              <Label htmlFor="nome">Nome do Modelo</Label>
              <Input
                id="nome"
                type="text"
                value={nomeModelo}
                onChange={(e) => setNomeModelo(e.target.value)}
                placeholder="Nome do modelo"
              />
            </div>

            {/* Campo de Categoria */}
            <div>
              <Label htmlFor="categoria">Categoria</Label>
              <select
                id="categoria"
                value={categoria}
                onChange={(e) => setCategoria(e.target.value)}
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
              >
                <option value="EDC">EDC</option>
                <option value="Adaga">Adaga</option>
                <option value="Campo">Campo</option>
                <option value="Cozinha">Cozinha</option>
                <option value="Defesa">Defesa</option>
                <option value="KZR">KZR</option>
                <option value="Upsell">Upsell</option>
              </select>
            </div>

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

            {/* Campo de Imagem */}
            <div>
              <Label htmlFor="imagem">URL da Imagem Principal</Label>
              <Input
                id="imagem"
                type="text"
                value={imagemModelo}
                onChange={(e) => setImagemModelo(e.target.value)}
                placeholder="https://..."
              />
              {imagemModelo && (
                <div className="mt-2 max-w-[150px]">
                  <img src={imagemModelo} alt="Preview" className="rounded-lg w-full h-auto" />
                </div>
              )}
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

            {/* Garantia e Prazo de Entrega */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="garantia">Garantia</Label>
                <Input
                  id="garantia"
                  type="text"
                  value={garantia}
                  onChange={(e) => setGarantia(e.target.value)}
                  placeholder="Ex: Vitalícia"
                />
              </div>
              <div>
                <Label htmlFor="prazoEntrega">Prazo de Entrega</Label>
                <Input
                  id="prazoEntrega"
                  type="text"
                  value={prazoEntrega}
                  onChange={(e) => setPrazoEntrega(e.target.value)}
                  placeholder="Ex: 45 dias úteis"
                />
              </div>
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
                    const isVideo = midia.nome_arquivo.match(/\.(mp4|webm|mov|avi)$/i);
                    const isCapa = isVideo 
                      ? videoUrl === midia.url 
                      : imagemModelo === midia.url;
                    return (
                      <div
                        key={midia.id}
                        className={`relative border rounded-lg overflow-hidden bg-muted aspect-[9/16] ${
                          isCapa ? 'ring-2 ring-accent' : ''
                        }`}
                      >
                        {/* Indicador de visibilidade */}
                        <div className={`absolute top-2 left-2 z-10 px-2 py-1 rounded-full text-xs flex items-center gap-1 ${
                          midia.visivel_catalogo 
                            ? 'bg-green-500/80 text-white' 
                            : 'bg-zinc-500/80 text-white'
                        }`}>
                          {midia.visivel_catalogo ? (
                            <>
                              <Eye className="h-3 w-3" />
                              <span className="hidden sm:inline">Visível</span>
                            </>
                          ) : (
                            <>
                              <EyeOff className="h-3 w-3" />
                              <span className="hidden sm:inline">Oculta</span>
                            </>
                          )}
                        </div>

                        {/* Indicador de capa */}
                        {isCapa && (
                          <div className="absolute top-2 right-2 z-10 px-2 py-1 rounded-full text-xs flex items-center gap-1 bg-accent text-accent-foreground">
                            <Star className="h-3 w-3 fill-current" />
                            <span className="hidden sm:inline">Capa</span>
                          </div>
                        )}

                        {isVideo ? (
                          <video
                            src={midia.url}
                            className="w-full h-full object-cover"
                            muted
                            autoPlay
                            loop
                            playsInline
                          />
                        ) : (
                          <img
                            src={midia.url}
                            alt={midia.nome_arquivo}
                            className="w-full h-full object-cover"
                          />
                        )}
                        
                        {/* Botões de ação sempre visíveis na parte inferior */}
                        <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent p-2">
                          <div className="flex items-center justify-center gap-1">
                            <Button
                              size="sm"
                              variant={isCapa ? 'default' : 'secondary'}
                              className="h-8 w-8 p-0"
                              onClick={() => definirComoCapa(midia)}
                              title="Definir como capa"
                              disabled={isCapa}
                            >
                              <Star className={`h-4 w-4 ${isCapa ? 'fill-current' : ''}`} />
                            </Button>
                            <Button
                              size="sm"
                              variant="secondary"
                              className="h-8 w-8 p-0"
                              onClick={() => toggleVisibilidade(midia)}
                              title={midia.visivel_catalogo ? 'Ocultar do catálogo' : 'Mostrar no catálogo'}
                            >
                              {midia.visivel_catalogo ? (
                                <EyeOff className="h-4 w-4" />
                              ) : (
                                <Eye className="h-4 w-4" />
                              )}
                            </Button>
                            <Button
                              size="sm"
                              variant="secondary"
                              className="h-8 w-8 p-0"
                              onClick={() => compartilharMidia(midia.url, midia.nome_arquivo)}
                              title="Compartilhar"
                            >
                              <Share2 className="h-4 w-4" />
                            </Button>
                            <Button
                              size="sm"
                              variant="secondary"
                              className="h-8 w-8 p-0"
                              onClick={() => copiarLinkMidia(midia.url)}
                              title="Copiar link"
                            >
                              <Copy className="h-4 w-4" />
                            </Button>
                            <Button
                              size="sm"
                              variant="secondary"
                              className="h-8 w-8 p-0"
                              onClick={() => downloadMidia(midia.url, midia.nome_arquivo)}
                              title="Baixar"
                            >
                              <Download className="h-4 w-4" />
                            </Button>
                            <Button
                              size="sm"
                              variant="destructive"
                              className="h-8 w-8 p-0"
                              onClick={() => deletarMidia(midia)}
                              title="Deletar"
                            >
                              <X className="h-4 w-4" />
                            </Button>
                          </div>
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
