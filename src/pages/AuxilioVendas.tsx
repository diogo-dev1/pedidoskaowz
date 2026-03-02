import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import { 
  Copy, Download, Upload, X, Loader2, Search, Video, Share2, 
  Eye, EyeOff, Star, FileText, Package, Clock, Shield, 
  ChevronRight, ImageIcon, Play, Edit2, Save, Info, RefreshCw
} from 'lucide-react';

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

export default function AuxilioVendas() {
  const [modelos, setModelos] = useState<Modelo[]>([]);
  const [categoriaAtiva, setCategoriaAtiva] = useState<Categoria>('Todas');
  const [buscaTexto, setBuscaTexto] = useState('');
  const [modeloSelecionado, setModeloSelecionado] = useState<Modelo | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [editMode, setEditMode] = useState(false);
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
  const [sincronizando, setSincronizando] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    carregarModelos();
  }, []);

  const sincronizarShopify = async () => {
    setSincronizando(true);
    try {
      const { data, error } = await supabase.functions.invoke('sync-shopify');
      if (error) throw error;
      toast({
        title: 'Sincronização concluída!',
        description: `${data.synced} produtos sincronizados${data.errors > 0 ? `, ${data.errors} erros` : ''}.`,
      });
      carregarModelos();
    } catch (err: any) {
      toast({ title: 'Erro na sincronização', description: err.message, variant: 'destructive' });
    } finally {
      setSincronizando(false);
    }
  };

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
    setEditMode(false);
    carregarMidias(modelo.id);
  };

  const fecharModal = () => {
    setModalOpen(false);
    setModeloSelecionado(null);
    setEditMode(false);
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

    setEditMode(false);
    carregarModelos();
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

  const downloadMidia = async (url: string, nome: string) => {
    try {
      const response = await fetch(url);
      const blob = await response.blob();
      const blobUrl = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = blobUrl;
      link.download = nome.split('/').pop() || nome;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(blobUrl);
      toast({
        title: 'Download iniciado!',
        description: 'A mídia está sendo baixada.',
      });
    } catch (err) {
      console.error('Erro no download:', err);
      window.open(url, '_blank');
    }
  };

  const downloadTodasMidias = async () => {
    if (midias.length === 0) return;
    
    toast({
      title: 'Iniciando downloads...',
      description: `Baixando ${midias.length} arquivo(s).`,
    });

    for (const midia of midias) {
      await downloadMidia(midia.url, midia.nome_arquivo);
      await new Promise(resolve => setTimeout(resolve, 500));
    }
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
        copiarLinkMidia(url);
      }
    } else {
      copiarLinkMidia(url);
    }
  };

  const deletarMidia = async (midia: Midia) => {
    const { error: storageError } = await supabase.storage
      .from('catalogo-midias')
      .remove([midia.nome_arquivo]);

    if (storageError) {
      console.error('Erro ao deletar do storage:', storageError);
    }

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

  const midiasImagens = midias.filter(m => !m.nome_arquivo.match(/\.(mp4|webm|mov|avi)$/i));
  const midiasVideos = midias.filter(m => m.nome_arquivo.match(/\.(mp4|webm|mov|avi)$/i));

  return (
    <div className="container mx-auto py-6 px-4">
      <div className="mb-6 flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-foreground">Material de Apoio ao Vendedor</h1>
          <p className="text-muted-foreground mt-1">Acesse informações e mídias das lâminas para auxiliar nas vendas</p>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={sincronizarShopify}
          disabled={sincronizando}
          className="flex-shrink-0"
        >
          <RefreshCw className={`mr-2 h-4 w-4 ${sincronizando ? 'animate-spin' : ''}`} />
          {sincronizando ? 'Sincronizando...' : 'Sync Shopify'}
        </Button>
      </div>
      
      {/* Campo de Busca */}
      <div className="relative mb-4">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          type="text"
          placeholder="Buscar lâminas..."
          value={buscaTexto}
          onChange={(e) => setBuscaTexto(e.target.value)}
          className="pl-10"
        />
      </div>

      {/* Botões de Filtro */}
      <ScrollArea className="w-full whitespace-nowrap pb-2">
        <div className="flex gap-2 mb-6">
          {categorias.map((cat) => (
            <Button
              key={cat}
              variant={categoriaAtiva === cat ? 'default' : 'outline'}
              onClick={() => setCategoriaAtiva(cat)}
              size="sm"
              className="flex-shrink-0"
            >
              {cat}
            </Button>
          ))}
        </div>
      </ScrollArea>
      
      {/* Lista de Modelos */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {modelosFiltrados.map((modelo) => (
          <Card
            key={modelo.id}
            className="cursor-pointer hover:shadow-lg transition-all group"
            onClick={() => abrirModal(modelo)}
          >
            <div className="flex items-center gap-4 p-4">
              {/* Thumbnail */}
              <div className="relative w-20 h-20 flex-shrink-0 rounded-lg overflow-hidden bg-muted">
                {modelo.imagem_modelo ? (
                  <img
                    src={modelo.imagem_modelo}
                    alt={modelo.nome_modelo}
                    className="w-full h-full object-cover"
                  />
                ) : modelo.video_url ? (
                  <div className="w-full h-full flex items-center justify-center bg-accent/10">
                    <Play className="h-8 w-8 text-accent" />
                  </div>
                ) : (
                  <div className="w-full h-full flex items-center justify-center">
                    <Package className="h-8 w-8 text-muted-foreground" />
                  </div>
                )}
              </div>

              {/* Info */}
              <div className="flex-1 min-w-0">
                <h3 className="font-semibold text-card-foreground truncate">
                  {modelo.nome_modelo}
                </h3>
                <p className="text-accent font-bold text-lg">
                  R$ {modelo.preco_base.toFixed(2)}
                </p>
                <div className="flex items-center gap-2 mt-1">
                  <Badge variant="secondary" className="text-xs">
                    {modelo.categoria}
                  </Badge>
                  {modelo.video_url && (
                    <Badge variant="outline" className="text-xs">
                      <Video className="h-3 w-3 mr-1" />
                      Vídeo
                    </Badge>
                  )}
                </div>
              </div>

              {/* Arrow */}
              <ChevronRight className="h-5 w-5 text-muted-foreground group-hover:text-foreground transition-colors" />
            </div>
          </Card>
        ))}
      </div>

      {modelosFiltrados.length === 0 && (
        <div className="text-center py-12">
          <Package className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
          <p className="text-muted-foreground">Nenhuma lâmina encontrada</p>
        </div>
      )}

      {/* Modal de Detalhes */}
      <Dialog open={modalOpen} onOpenChange={setModalOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden flex flex-col p-0">
          <DialogHeader className="px-6 pt-6 pb-4 border-b">
            <div className="flex items-center justify-between">
              <div>
                <DialogTitle className="text-xl">{modeloSelecionado?.nome_modelo}</DialogTitle>
                <div className="flex items-center gap-2 mt-1">
                  <Badge>{categoria}</Badge>
                  <span className="text-accent font-bold">R$ {parseFloat(preco || '0').toFixed(2)}</span>
                </div>
              </div>
              <Button
                variant={editMode ? 'default' : 'outline'}
                size="sm"
                onClick={() => setEditMode(!editMode)}
              >
                {editMode ? <Save className="h-4 w-4 mr-2" /> : <Edit2 className="h-4 w-4 mr-2" />}
                {editMode ? 'Editando' : 'Editar'}
              </Button>
            </div>
          </DialogHeader>

          <Tabs defaultValue="info" className="flex-1 overflow-hidden flex flex-col">
            <TabsList className="mx-6 mt-4 grid w-auto grid-cols-2">
              <TabsTrigger value="info" className="flex items-center gap-2">
                <Info className="h-4 w-4" />
                Informações
              </TabsTrigger>
              <TabsTrigger value="midias" className="flex items-center gap-2">
                <ImageIcon className="h-4 w-4" />
                Mídias ({midias.length})
              </TabsTrigger>
            </TabsList>

            <ScrollArea className="flex-1 px-6 pb-6">
              {/* Tab Informações */}
              <TabsContent value="info" className="mt-4 space-y-6">
                {/* Cards de Info Rápida */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  <Card className="p-3">
                    <div className="flex items-center gap-2 text-muted-foreground mb-1">
                      <Package className="h-4 w-4" />
                      <span className="text-xs">Preço Base</span>
                    </div>
                    {editMode ? (
                      <Input
                        type="number"
                        step="0.01"
                        value={preco}
                        onChange={(e) => setPreco(e.target.value)}
                        className="h-8"
                      />
                    ) : (
                      <p className="font-bold text-lg">R$ {parseFloat(preco || '0').toFixed(2)}</p>
                    )}
                  </Card>

                  <Card className="p-3">
                    <div className="flex items-center gap-2 text-muted-foreground mb-1">
                      <Shield className="h-4 w-4" />
                      <span className="text-xs">Garantia</span>
                    </div>
                    {editMode ? (
                      <Input
                        value={garantia}
                        onChange={(e) => setGarantia(e.target.value)}
                        placeholder="Ex: Vitalícia"
                        className="h-8"
                      />
                    ) : (
                      <p className="font-semibold">{garantia || '-'}</p>
                    )}
                  </Card>

                  <Card className="p-3">
                    <div className="flex items-center gap-2 text-muted-foreground mb-1">
                      <Clock className="h-4 w-4" />
                      <span className="text-xs">Prazo</span>
                    </div>
                    {editMode ? (
                      <Input
                        value={prazoEntrega}
                        onChange={(e) => setPrazoEntrega(e.target.value)}
                        placeholder="Ex: 45 dias"
                        className="h-8"
                      />
                    ) : (
                      <p className="font-semibold">{prazoEntrega || '-'}</p>
                    )}
                  </Card>

                  <Card className="p-3">
                    <div className="flex items-center gap-2 text-muted-foreground mb-1">
                      <FileText className="h-4 w-4" />
                      <span className="text-xs">Categoria</span>
                    </div>
                    {editMode ? (
                      <select
                        value={categoria}
                        onChange={(e) => setCategoria(e.target.value)}
                        className="flex h-8 w-full rounded-md border border-input bg-background px-2 text-sm"
                      >
                        {['EDC', 'Adaga', 'Campo', 'Cozinha', 'Defesa', 'KZR', 'Upsell'].map(cat => (
                          <option key={cat} value={cat}>{cat}</option>
                        ))}
                      </select>
                    ) : (
                      <p className="font-semibold">{categoria}</p>
                    )}
                  </Card>
                </div>

                {/* Nome do Modelo */}
                {editMode && (
                  <div>
                    <Label htmlFor="nome">Nome do Modelo</Label>
                    <Input
                      id="nome"
                      value={nomeModelo}
                      onChange={(e) => setNomeModelo(e.target.value)}
                      className="mt-1"
                    />
                  </div>
                )}

                {/* Apresentação de Venda */}
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <Label className="text-base font-semibold">Apresentação de Venda</Label>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={copiarApresentacao}
                      disabled={!apresentacao}
                    >
                      <Copy className="h-4 w-4 mr-2" />
                      Copiar
                    </Button>
                  </div>
                  {editMode ? (
                    <Textarea
                      value={apresentacao}
                      onChange={(e) => setApresentacao(e.target.value)}
                      placeholder="Escreva aqui a apresentação de venda..."
                      rows={6}
                    />
                  ) : (
                    <Card className="p-4 bg-muted/50">
                      {apresentacao ? (
                        <p className="whitespace-pre-wrap text-sm">{apresentacao}</p>
                      ) : (
                        <p className="text-muted-foreground text-sm italic">Nenhuma apresentação cadastrada</p>
                      )}
                    </Card>
                  )}
                </div>

                {/* Vídeo de Apresentação */}
                {editMode && (
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
                  </div>
                )}

                {/* URL da Imagem Principal */}
                {editMode && (
                  <div>
                    <Label htmlFor="imagem">URL da Imagem Principal</Label>
                    <Input
                      id="imagem"
                      value={imagemModelo}
                      onChange={(e) => setImagemModelo(e.target.value)}
                      placeholder="https://..."
                      className="mt-1"
                    />
                  </div>
                )}

                {/* Botão Salvar */}
                {editMode && (
                  <div className="flex justify-end gap-3 pt-4 border-t">
                    <Button variant="outline" onClick={() => setEditMode(false)}>
                      Cancelar
                    </Button>
                    <Button onClick={salvarAlteracoes} disabled={salvando}>
                      {salvando && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                      Salvar Alterações
                    </Button>
                  </div>
                )}
              </TabsContent>

              {/* Tab Mídias */}
              <TabsContent value="midias" className="mt-4 space-y-6">
                {/* Barra de Ações */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
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
                  {midias.length > 0 && (
                    <Button variant="outline" size="sm" onClick={downloadTodasMidias}>
                      <Download className="h-4 w-4 mr-2" />
                      Baixar Todas
                    </Button>
                  )}
                </div>

                {carregandoMidias ? (
                  <div className="flex items-center justify-center py-12">
                    <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                  </div>
                ) : midias.length === 0 ? (
                  <Card className="p-8 text-center">
                    <ImageIcon className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                    <p className="text-muted-foreground">Nenhuma mídia adicionada ainda</p>
                    <p className="text-sm text-muted-foreground mt-1">
                      Clique em "Adicionar Mídia" para enviar fotos e vídeos
                    </p>
                  </Card>
                ) : (
                  <div className="space-y-6">
                    {/* Imagens */}
                    {midiasImagens.length > 0 && (
                      <div>
                        <h3 className="font-semibold mb-3 flex items-center gap-2">
                          <ImageIcon className="h-4 w-4" />
                          Fotos ({midiasImagens.length})
                        </h3>
                        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                          {midiasImagens.map((midia) => {
                            const isCapa = imagemModelo === midia.url;
                            return (
                              <div
                                key={midia.id}
                                className={`relative border rounded-lg overflow-hidden bg-muted aspect-square group ${
                                  isCapa ? 'ring-2 ring-accent' : ''
                                }`}
                              >
                                {/* Badges */}
                                <div className="absolute top-2 left-2 right-2 z-10 flex items-center justify-between">
                                  <div className={`px-2 py-1 rounded-full text-xs flex items-center gap-1 ${
                                    midia.visivel_catalogo 
                                      ? 'bg-green-500/80 text-white' 
                                      : 'bg-zinc-500/80 text-white'
                                  }`}>
                                    {midia.visivel_catalogo ? <Eye className="h-3 w-3" /> : <EyeOff className="h-3 w-3" />}
                                  </div>
                                  {isCapa && (
                                    <div className="px-2 py-1 rounded-full text-xs flex items-center gap-1 bg-accent text-accent-foreground">
                                      <Star className="h-3 w-3 fill-current" />
                                    </div>
                                  )}
                                </div>

                                <img
                                  src={midia.url}
                                  alt={midia.nome_arquivo}
                                  className="w-full h-full object-cover"
                                />
                                
                                {/* Ações */}
                                <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent p-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                  <div className="flex items-center justify-center gap-1">
                                    <Button
                                      size="sm"
                                      variant={isCapa ? 'default' : 'secondary'}
                                      className="h-7 w-7 p-0"
                                      onClick={() => definirComoCapa(midia)}
                                      title="Definir como capa"
                                      disabled={isCapa}
                                    >
                                      <Star className={`h-3 w-3 ${isCapa ? 'fill-current' : ''}`} />
                                    </Button>
                                    <Button
                                      size="sm"
                                      variant="secondary"
                                      className="h-7 w-7 p-0"
                                      onClick={() => toggleVisibilidade(midia)}
                                    >
                                      {midia.visivel_catalogo ? <EyeOff className="h-3 w-3" /> : <Eye className="h-3 w-3" />}
                                    </Button>
                                    <Button
                                      size="sm"
                                      variant="secondary"
                                      className="h-7 w-7 p-0"
                                      onClick={() => downloadMidia(midia.url, midia.nome_arquivo)}
                                    >
                                      <Download className="h-3 w-3" />
                                    </Button>
                                    <Button
                                      size="sm"
                                      variant="secondary"
                                      className="h-7 w-7 p-0"
                                      onClick={() => compartilharMidia(midia.url, midia.nome_arquivo)}
                                    >
                                      <Share2 className="h-3 w-3" />
                                    </Button>
                                    <Button
                                      size="sm"
                                      variant="destructive"
                                      className="h-7 w-7 p-0"
                                      onClick={() => deletarMidia(midia)}
                                    >
                                      <X className="h-3 w-3" />
                                    </Button>
                                  </div>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    )}

                    {/* Vídeos */}
                    {midiasVideos.length > 0 && (
                      <div>
                        <h3 className="font-semibold mb-3 flex items-center gap-2">
                          <Video className="h-4 w-4" />
                          Vídeos ({midiasVideos.length})
                        </h3>
                        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                          {midiasVideos.map((midia) => {
                            const isCapa = videoUrl === midia.url;
                            return (
                              <div
                                key={midia.id}
                                className={`relative border rounded-lg overflow-hidden bg-muted aspect-[9/16] group ${
                                  isCapa ? 'ring-2 ring-accent' : ''
                                }`}
                              >
                                {/* Badges */}
                                <div className="absolute top-2 left-2 right-2 z-10 flex items-center justify-between">
                                  <div className={`px-2 py-1 rounded-full text-xs flex items-center gap-1 ${
                                    midia.visivel_catalogo 
                                      ? 'bg-green-500/80 text-white' 
                                      : 'bg-zinc-500/80 text-white'
                                  }`}>
                                    {midia.visivel_catalogo ? <Eye className="h-3 w-3" /> : <EyeOff className="h-3 w-3" />}
                                  </div>
                                  {isCapa && (
                                    <div className="px-2 py-1 rounded-full text-xs flex items-center gap-1 bg-accent text-accent-foreground">
                                      <Star className="h-3 w-3 fill-current" />
                                    </div>
                                  )}
                                </div>

                                <video
                                  src={midia.url}
                                  className="w-full h-full object-cover"
                                  muted
                                  autoPlay
                                  loop
                                  playsInline
                                />
                                
                                {/* Ações */}
                                <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent p-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                  <div className="flex items-center justify-center gap-1">
                                    <Button
                                      size="sm"
                                      variant={isCapa ? 'default' : 'secondary'}
                                      className="h-7 w-7 p-0"
                                      onClick={() => definirComoCapa(midia)}
                                      title="Definir como capa"
                                      disabled={isCapa}
                                    >
                                      <Star className={`h-3 w-3 ${isCapa ? 'fill-current' : ''}`} />
                                    </Button>
                                    <Button
                                      size="sm"
                                      variant="secondary"
                                      className="h-7 w-7 p-0"
                                      onClick={() => toggleVisibilidade(midia)}
                                    >
                                      {midia.visivel_catalogo ? <EyeOff className="h-3 w-3" /> : <Eye className="h-3 w-3" />}
                                    </Button>
                                    <Button
                                      size="sm"
                                      variant="secondary"
                                      className="h-7 w-7 p-0"
                                      onClick={() => downloadMidia(midia.url, midia.nome_arquivo)}
                                    >
                                      <Download className="h-3 w-3" />
                                    </Button>
                                    <Button
                                      size="sm"
                                      variant="secondary"
                                      className="h-7 w-7 p-0"
                                      onClick={() => compartilharMidia(midia.url, midia.nome_arquivo)}
                                    >
                                      <Share2 className="h-3 w-3" />
                                    </Button>
                                    <Button
                                      size="sm"
                                      variant="destructive"
                                      className="h-7 w-7 p-0"
                                      onClick={() => deletarMidia(midia)}
                                    >
                                      <X className="h-3 w-3" />
                                    </Button>
                                  </div>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </TabsContent>
            </ScrollArea>
          </Tabs>
        </DialogContent>
      </Dialog>
    </div>
  );
}
