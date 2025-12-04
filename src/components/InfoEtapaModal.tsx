import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Info, Pencil, Save, X } from 'lucide-react';
import { toast } from 'sonner';
import { useAuth } from '@/contexts/AuthContext';

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

interface InfoEtapaModalProps {
  etapaKey: string;
  trigger?: React.ReactNode;
  showLabel?: boolean;
}

export function InfoEtapaModal({ etapaKey, trigger, showLabel = false }: InfoEtapaModalProps) {
  const { user } = useAuth();
  const [open, setOpen] = useState(false);
  const [info, setInfo] = useState<InfoEtapa | null>(null);
  const [midias, setMidias] = useState<MidiaEtapa[]>([]);
  const [loading, setLoading] = useState(false);
  const [editing, setEditing] = useState(false);
  
  // Form state
  const [titulo, setTitulo] = useState('');
  const [conteudo, setConteudo] = useState('');
  const [imagemUrl, setImagemUrl] = useState('');

  useEffect(() => {
    if (open) {
      carregarInfo();
    }
  }, [open, etapaKey]);

  // Pre-fetch label for display
  useEffect(() => {
    if (showLabel && !info) {
      fetchLabel();
    }
  }, [showLabel, etapaKey]);

  const fetchLabel = async () => {
    try {
      const { data } = await supabase
        .from('info_etapas_customizacao')
        .select('label_botao, cor_botao')
        .eq('etapa_key', etapaKey)
        .single();
      if (data) {
        setInfo(prev => prev ? { ...prev, label_botao: data.label_botao, cor_botao: data.cor_botao } : { 
          id: '', etapa_key: etapaKey, titulo: '', conteudo: null, imagem_url: null, label_botao: data.label_botao, cor_botao: data.cor_botao 
        });
      }
    } catch (error) {
      console.error('Erro ao buscar label:', error);
    }
  };

  const carregarInfo = async () => {
    setLoading(true);
    try {
      const [infoResult, midiasResult] = await Promise.all([
        supabase
          .from('info_etapas_customizacao')
          .select('*')
          .eq('etapa_key', etapaKey)
          .single(),
        supabase
          .from('midias_info_etapas')
          .select('*')
          .eq('etapa_key', etapaKey)
          .order('ordem')
      ]);

      if (infoResult.error) throw infoResult.error;
      
      setInfo(infoResult.data);
      setTitulo(infoResult.data.titulo || '');
      setConteudo(infoResult.data.conteudo || '');
      setImagemUrl(infoResult.data.imagem_url || '');
      
      if (midiasResult.data) {
        setMidias(midiasResult.data as MidiaEtapa[]);
      }
    } catch (error) {
      console.error('Erro ao carregar info:', error);
    } finally {
      setLoading(false);
    }
  };

  const salvarInfo = async () => {
    if (!info) return;
    
    try {
      const { error } = await supabase
        .from('info_etapas_customizacao')
        .update({
          titulo,
          conteudo,
          imagem_url: imagemUrl || null
        })
        .eq('id', info.id);

      if (error) throw error;
      
      setInfo({ ...info, titulo, conteudo, imagem_url: imagemUrl || null });
      setEditing(false);
      toast.success('Informações salvas!');
    } catch (error) {
      console.error('Erro ao salvar:', error);
      toast.error('Erro ao salvar informações');
    }
  };

  const cancelarEdicao = () => {
    if (info) {
      setTitulo(info.titulo || '');
      setConteudo(info.conteudo || '');
      setImagemUrl(info.imagem_url || '');
    }
    setEditing(false);
  };

  const imagens = midias.filter(m => m.tipo === 'imagem');
  const videos = midias.filter(m => m.tipo === 'video');

  const labelText = info?.label_botao || 'Saiba mais';
  const buttonColor = info?.cor_botao || '#3b82f6';

  return (
    <>
      {trigger ? (
        <div onClick={() => setOpen(true)}>{trigger}</div>
      ) : showLabel ? (
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            setOpen(true);
          }}
          className="text-xs underline underline-offset-2 transition-opacity hover:opacity-80"
          style={{ color: buttonColor }}
        >
          {labelText}
        </button>
      ) : (
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            setOpen(true);
          }}
          className="p-1 rounded-full hover:bg-muted/80 transition-colors"
          style={{ color: buttonColor }}
          aria-label="Saiba mais"
        >
          <Info className="h-3.5 w-3.5 md:h-4 md:w-4" />
        </button>
      )}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-[95vw] sm:max-w-lg max-h-[90vh] overflow-y-auto p-4 sm:p-6">
          {loading ? (
            <div className="py-8 text-center text-muted-foreground text-sm">
              Carregando...
            </div>
          ) : editing ? (
            <div className="space-y-4">
              <DialogHeader>
                <DialogTitle className="text-base sm:text-lg">Editar Informações</DialogTitle>
                <DialogDescription className="text-xs sm:text-sm">
                  Atualize as informações exibidas para os clientes.
                </DialogDescription>
              </DialogHeader>

              <div className="space-y-3">
                <div className="space-y-1.5">
                  <Label htmlFor="titulo" className="text-xs sm:text-sm">Título</Label>
                  <Input
                    id="titulo"
                    value={titulo}
                    onChange={(e) => setTitulo(e.target.value)}
                    placeholder="Título da seção"
                    className="text-sm"
                  />
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="conteudo" className="text-xs sm:text-sm">Conteúdo</Label>
                  <Textarea
                    id="conteudo"
                    value={conteudo}
                    onChange={(e) => setConteudo(e.target.value)}
                    placeholder="Escreva as informações aqui..."
                    rows={6}
                    className="text-sm resize-none"
                  />
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="imagem" className="text-xs sm:text-sm">URL da Imagem (opcional)</Label>
                  <Input
                    id="imagem"
                    value={imagemUrl}
                    onChange={(e) => setImagemUrl(e.target.value)}
                    placeholder="https://..."
                    className="text-sm"
                  />
                </div>
              </div>

              <div className="flex gap-2 pt-2">
                <Button
                  onClick={salvarInfo}
                  size="sm"
                  className="flex-1 text-xs sm:text-sm"
                >
                  <Save className="h-3.5 w-3.5 mr-1.5" />
                  Salvar
                </Button>
                <Button
                  onClick={cancelarEdicao}
                  variant="outline"
                  size="sm"
                  className="text-xs sm:text-sm"
                >
                  <X className="h-3.5 w-3.5 mr-1.5" />
                  Cancelar
                </Button>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              <DialogHeader>
                <DialogTitle className="text-base sm:text-lg pr-8">
                  {info?.titulo || 'Informações'}
                </DialogTitle>
              </DialogHeader>

              {imagens.length > 0 && (
                <div className="grid grid-cols-2 gap-2">
                  {imagens.map((midia) => (
                    <div key={midia.id} className="rounded-lg overflow-hidden border border-border">
                      <img
                        src={midia.url}
                        alt={midia.nome_arquivo}
                        className="w-full h-32 object-cover"
                      />
                    </div>
                  ))}
                </div>
              )}

              {imagens.length === 0 && info?.imagem_url && (
                <div className="w-full rounded-lg overflow-hidden border border-border">
                  <img
                    src={info.imagem_url}
                    alt={info.titulo}
                    className="w-full h-auto max-h-48 object-contain bg-muted"
                  />
                </div>
              )}

              {videos.length > 0 && (
                <div className="space-y-2">
                  {videos.map((midia) => (
                    <div key={midia.id} className="rounded-lg overflow-hidden border border-border">
                      <video
                        src={midia.url}
                        className="w-full aspect-video object-cover"
                        controls
                        playsInline
                      />
                    </div>
                  ))}
                </div>
              )}

              <div className="text-xs sm:text-sm text-muted-foreground whitespace-pre-wrap leading-relaxed">
                {info?.conteudo || 'Nenhuma informação disponível ainda.'}
              </div>

              {etapaKey === 'modelo' && (
                <a
                  href="/catalogo"
                  className="block w-full text-center py-3 px-4 bg-primary text-primary-foreground rounded-lg font-medium hover:bg-primary/90 transition-colors"
                >
                  Conhecer o Catálogo
                </a>
              )}

              {user && (
                <Button
                  onClick={() => setEditing(true)}
                  variant="outline"
                  size="sm"
                  className="w-full text-xs sm:text-sm"
                >
                  <Pencil className="h-3.5 w-3.5 mr-1.5" />
                  Editar Informações
                </Button>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
