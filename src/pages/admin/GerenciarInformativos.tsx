import { useState, useRef } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { toast } from 'sonner';
import { Save, Info, Upload, X, Image, Video, Loader2 } from 'lucide-react';

const ETAPAS = [
  { key: 'modelo', label: 'Modelo' },
  { key: 'aco', label: 'Aço' },
  { key: 'acabamento', label: 'Acabamento' },
  { key: 'empunhadura', label: 'Empunhadura' },
  { key: 'bainha', label: 'Bainha' },
  { key: 'laser', label: 'Personalização à Laser' },
];

interface InfoEtapa {
  id: string;
  etapa_key: string;
  titulo: string;
  conteudo: string | null;
  imagem_url: string | null;
  label_botao: string | null;
  cor_botao: string | null;
}

interface MidiaEtapa {
  id: string;
  etapa_key: string;
  tipo: 'imagem' | 'video';
  url: string;
  nome_arquivo: string;
  ordem: number;
}

export default function GerenciarInformativos() {
  const queryClient = useQueryClient();
  const [editingData, setEditingData] = useState<Record<string, Partial<InfoEtapa>>>({});
  const [uploadingEtapa, setUploadingEtapa] = useState<string | null>(null);
  const imageInputRefs = useRef<Record<string, HTMLInputElement | null>>({});
  const videoInputRefs = useRef<Record<string, HTMLInputElement | null>>({});

  const { data: infos, isLoading } = useQuery({
    queryKey: ['info-etapas'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('info_etapas_customizacao')
        .select('*')
        .order('created_at');
      if (error) throw error;
      return data as InfoEtapa[];
    },
  });

  const { data: midias } = useQuery({
    queryKey: ['midias-info-etapas'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('midias_info_etapas')
        .select('*')
        .order('ordem');
      if (error) throw error;
      return data as MidiaEtapa[];
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, updates }: { id: string; updates: Partial<InfoEtapa> }) => {
      const { error } = await supabase
        .from('info_etapas_customizacao')
        .update(updates)
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['info-etapas'] });
      toast.success('Informações salvas com sucesso!');
    },
    onError: () => {
      toast.error('Erro ao salvar informações');
    },
  });

  const deleteMidiaMutation = useMutation({
    mutationFn: async ({ id, url }: { id: string; url: string }) => {
      const urlParts = url.split('/');
      const fileName = urlParts[urlParts.length - 1];
      
      await supabase.storage
        .from('info-etapas-midias')
        .remove([fileName]);
      
      const { error } = await supabase
        .from('midias_info_etapas')
        .delete()
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['midias-info-etapas'] });
      toast.success('Mídia removida!');
    },
    onError: () => {
      toast.error('Erro ao remover mídia');
    },
  });

  const getInfoForEtapa = (etapaKey: string) => {
    return infos?.find((info) => info.etapa_key === etapaKey);
  };

  const getMidiasForEtapa = (etapaKey: string) => {
    return midias?.filter((midia) => midia.etapa_key === etapaKey) || [];
  };

  const getEditingValue = (etapaKey: string, field: keyof InfoEtapa) => {
    const info = getInfoForEtapa(etapaKey);
    const editing = editingData[etapaKey];
    if (editing && field in editing) {
      return editing[field] ?? '';
    }
    return info?.[field] ?? '';
  };

  const handleChange = (etapaKey: string, field: keyof InfoEtapa, value: string) => {
    setEditingData((prev) => ({
      ...prev,
      [etapaKey]: {
        ...prev[etapaKey],
        [field]: value,
      },
    }));
  };

  const handleSave = (etapaKey: string) => {
    const info = getInfoForEtapa(etapaKey);
    const updates = editingData[etapaKey];
    if (!info || !updates) return;

    updateMutation.mutate({ id: info.id, updates });
    setEditingData((prev) => {
      const newData = { ...prev };
      delete newData[etapaKey];
      return newData;
    });
  };

  const hasChanges = (etapaKey: string) => {
    return !!editingData[etapaKey] && Object.keys(editingData[etapaKey]).length > 0;
  };

  const handleFileUpload = async (etapaKey: string, file: File, tipo: 'imagem' | 'video') => {
    setUploadingEtapa(etapaKey);
    
    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `${etapaKey}-${Date.now()}.${fileExt}`;
      
      const { error: uploadError } = await supabase.storage
        .from('info-etapas-midias')
        .upload(fileName, file);
      
      if (uploadError) throw uploadError;
      
      const { data: urlData } = supabase.storage
        .from('info-etapas-midias')
        .getPublicUrl(fileName);
      
      const { error: insertError } = await supabase
        .from('midias_info_etapas')
        .insert({
          etapa_key: etapaKey,
          tipo,
          url: urlData.publicUrl,
          nome_arquivo: file.name,
          ordem: getMidiasForEtapa(etapaKey).length,
        });
      
      if (insertError) throw insertError;
      
      queryClient.invalidateQueries({ queryKey: ['midias-info-etapas'] });
      toast.success(`${tipo === 'imagem' ? 'Imagem' : 'Vídeo'} enviado com sucesso!`);
    } catch (error) {
      console.error('Upload error:', error);
      toast.error('Erro ao enviar arquivo');
    } finally {
      setUploadingEtapa(null);
    }
  };

  const handleImageSelect = (etapaKey: string, e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      Array.from(files).forEach(file => {
        handleFileUpload(etapaKey, file, 'imagem');
      });
    }
    e.target.value = '';
  };

  const handleVideoSelect = (etapaKey: string, e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      Array.from(files).forEach(file => {
        handleFileUpload(etapaKey, file, 'video');
      });
    }
    e.target.value = '';
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-8">
        <p className="text-muted-foreground">Carregando...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="min-w-0">
        <h1 className="text-lg sm:text-2xl font-bold flex items-center gap-2">
          <Info className="h-5 w-5 text-accent" />
          Informativos
        </h1>
        <p className="text-muted-foreground text-xs sm:text-sm">
          Conteúdo dos modais "Saiba mais" de cada etapa.
        </p>
      </div>

      <div className="grid gap-4">
        {ETAPAS.map((etapa) => {
          const etapaMidias = getMidiasForEtapa(etapa.key);
          const imagens = etapaMidias.filter(m => m.tipo === 'imagem');
          const videos = etapaMidias.filter(m => m.tipo === 'video');
          
          return (
            <Card key={etapa.key} className="bg-card border-border">
              <CardHeader className="pb-3">
                <CardTitle className="text-lg flex items-center justify-between">
                  <span>{etapa.label}</span>
                  {hasChanges(etapa.key) && (
                    <Button
                      size="sm"
                      onClick={() => handleSave(etapa.key)}
                      disabled={updateMutation.isPending}
                    >
                      <Save className="h-4 w-4 mr-1" />
                      Salvar
                    </Button>
                  )}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm font-medium text-foreground mb-1.5 block">
                      Texto do Botão
                    </label>
                    <Input
                      value={getEditingValue(etapa.key, 'label_botao') as string}
                      onChange={(e) => handleChange(etapa.key, 'label_botao', e.target.value)}
                      placeholder="Saiba mais"
                    />
                    <p className="text-xs text-muted-foreground mt-1">
                      Ex: "Saiba mais", "Conhecer mais"
                    </p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-foreground mb-1.5 block">
                      Cor do Botão
                    </label>
                    <div className="flex gap-2">
                      <Input
                        type="color"
                        value={(getEditingValue(etapa.key, 'cor_botao') as string) || '#3b82f6'}
                        onChange={(e) => handleChange(etapa.key, 'cor_botao', e.target.value)}
                        className="w-12 h-9 p-1 cursor-pointer"
                      />
                      <Input
                        value={(getEditingValue(etapa.key, 'cor_botao') as string) || '#3b82f6'}
                        onChange={(e) => handleChange(etapa.key, 'cor_botao', e.target.value)}
                        placeholder="#3b82f6"
                        className="flex-1"
                      />
                    </div>
                  </div>
                </div>

                <div>
                  <label className="text-sm font-medium text-foreground mb-1.5 block">
                    Título
                  </label>
                  <Input
                    value={getEditingValue(etapa.key, 'titulo') as string}
                    onChange={(e) => handleChange(etapa.key, 'titulo', e.target.value)}
                    placeholder="Título do informativo"
                  />
                </div>

                <div>
                  <label className="text-sm font-medium text-foreground mb-1.5 block">
                    Conteúdo
                  </label>
                  <Textarea
                    value={getEditingValue(etapa.key, 'conteudo') as string}
                    onChange={(e) => handleChange(etapa.key, 'conteudo', e.target.value)}
                    placeholder="Texto explicativo sobre esta etapa..."
                    rows={4}
                  />
                </div>

                {/* Imagens */}
                <div>
                  <label className="text-sm font-medium text-foreground mb-2 flex items-center gap-2">
                    <Image className="h-4 w-4" />
                    Imagens
                  </label>
                  
                  {imagens.length > 0 && (
                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2 mb-3">
                      {imagens.map((midia) => (
                        <div key={midia.id} className="relative group aspect-square">
                          <img
                            src={midia.url}
                            alt={midia.nome_arquivo}
                            className="w-full h-full object-cover rounded-md"
                          />
                          <button
                            onClick={() => deleteMidiaMutation.mutate({ id: midia.id, url: midia.url })}
                            className="absolute top-1 right-1 p-1 bg-destructive text-destructive-foreground rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                          >
                            <X className="h-3 w-3" />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                  
                  <input
                    type="file"
                    accept="image/*"
                    multiple
                    ref={(el) => (imageInputRefs.current[etapa.key] = el)}
                    onChange={(e) => handleImageSelect(etapa.key, e)}
                    className="hidden"
                  />
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => imageInputRefs.current[etapa.key]?.click()}
                    disabled={uploadingEtapa === etapa.key}
                  >
                    {uploadingEtapa === etapa.key ? (
                      <Loader2 className="h-4 w-4 mr-1 animate-spin" />
                    ) : (
                      <Upload className="h-4 w-4 mr-1" />
                    )}
                    Adicionar Imagens
                  </Button>
                </div>

                {/* Vídeos */}
                <div>
                  <label className="text-sm font-medium text-foreground mb-2 flex items-center gap-2">
                    <Video className="h-4 w-4" />
                    Vídeos
                  </label>
                  
                  {videos.length > 0 && (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mb-3">
                      {videos.map((midia) => (
                        <div key={midia.id} className="relative group">
                          <video
                            src={midia.url}
                            className="w-full aspect-video object-cover rounded-md"
                            controls
                          />
                          <button
                            onClick={() => deleteMidiaMutation.mutate({ id: midia.id, url: midia.url })}
                            className="absolute top-1 right-1 p-1 bg-destructive text-destructive-foreground rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                          >
                            <X className="h-3 w-3" />
                          </button>
                          <p className="text-xs text-muted-foreground mt-1 truncate">{midia.nome_arquivo}</p>
                        </div>
                      ))}
                    </div>
                  )}
                  
                  <input
                    type="file"
                    accept="video/*"
                    multiple
                    ref={(el) => (videoInputRefs.current[etapa.key] = el)}
                    onChange={(e) => handleVideoSelect(etapa.key, e)}
                    className="hidden"
                  />
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => videoInputRefs.current[etapa.key]?.click()}
                    disabled={uploadingEtapa === etapa.key}
                  >
                    {uploadingEtapa === etapa.key ? (
                      <Loader2 className="h-4 w-4 mr-1 animate-spin" />
                    ) : (
                      <Upload className="h-4 w-4 mr-1" />
                    )}
                    Adicionar Vídeos
                  </Button>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
