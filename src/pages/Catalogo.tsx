import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Card, CardContent } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Copy, Download, Upload, X, Loader2 } from 'lucide-react';

interface Modelo {
  id: string;
  nome_modelo: string;
  preco_base: number;
  imagem_modelo: string | null;
  apresentacao_venda: string | null;
}

interface Midia {
  name: string;
  url: string;
}

export default function Catalogo() {
  const [modelos, setModelos] = useState<Modelo[]>([]);
  const [modeloSelecionado, setModeloSelecionado] = useState<Modelo | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [preco, setPreco] = useState('');
  const [apresentacao, setApresentacao] = useState('');
  const [midias, setMidias] = useState<Midia[]>([]);
  const [salvando, setSalvando] = useState(false);
  const [carregandoMidias, setCarregandoMidias] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    carregarModelos();
  }, []);

  const carregarModelos = async () => {
    const { data, error } = await supabase
      .from('modelos_base')
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
    setModalOpen(true);
    carregarMidias(modelo.id);
  };

  const fecharModal = () => {
    setModalOpen(false);
    setModeloSelecionado(null);
    setPreco('');
    setApresentacao('');
    setMidias([]);
  };

  const salvarAlteracoes = async () => {
    if (!modeloSelecionado) return;

    setSalvando(true);
    const { error } = await supabase
      .from('modelos_base')
      .update({
        preco_base: parseFloat(preco),
        apresentacao_venda: apresentacao,
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

  return (
    <div className="container mx-auto py-8 px-4">
      <h1 className="text-3xl font-bold mb-6 text-foreground">Catálogo de Lâminas</h1>
      
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
        {modelos.map((modelo) => (
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
            <CardContent className="p-4">
              <h3 className="font-semibold text-lg text-card-foreground truncate">
                {modelo.nome_modelo}
              </h3>
              <p className="text-accent font-bold mt-2">
                R$ {modelo.preco_base.toFixed(2)}
              </p>
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
                <Button variant="outline" size="sm" asChild>
                  <label className="cursor-pointer">
                    <Upload className="h-4 w-4 mr-2" />
                    Adicionar Mídia
                    <input
                      type="file"
                      className="hidden"
                      accept="image/*,video/*"
                      onChange={handleUploadMidia}
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
                  {midias.map((midia) => (
                    <div
                      key={midia.name}
                      className="relative group border rounded-lg overflow-hidden bg-muted"
                    >
                      <img
                        src={midia.url}
                        alt={midia.name}
                        className="w-full h-32 object-cover"
                      />
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
                  ))}
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
