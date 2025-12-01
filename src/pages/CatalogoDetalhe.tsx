import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { ArrowLeft, MessageCircle, ChevronLeft, ChevronRight } from 'lucide-react';
import { toast } from 'sonner';

interface Modelo {
  id: string;
  nome_modelo: string;
  preco_base: number;
  imagem_modelo: string | null;
  categoria: string | null;
  apresentacao_venda: string | null;
}

interface Midia {
  name: string;
  url: string;
}

export default function CatalogoDetalhe() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [modelo, setModelo] = useState<Modelo | null>(null);
  const [midias, setMidias] = useState<Midia[]>([]);
  const [imagemAtual, setImagemAtual] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (id) {
      carregarModelo();
      carregarMidias();
    }
  }, [id]);

  const carregarModelo = async () => {
    try {
      const { data, error } = await supabase
        .from('catalogo_modelos')
        .select('*')
        .eq('id', id)
        .single();

      if (error) throw error;
      setModelo(data);
    } catch (error) {
      console.error('Erro ao carregar modelo:', error);
      toast.error('Erro ao carregar detalhes');
    } finally {
      setLoading(false);
    }
  };

  const carregarMidias = async () => {
    try {
      const { data, error } = await supabase
        .storage
        .from('catalogo-midias')
        .list(id);

      if (error) throw error;

      const midiasComUrl = await Promise.all(
        (data || []).map(async (arquivo) => {
          const { data: urlData } = supabase
            .storage
            .from('catalogo-midias')
            .getPublicUrl(`${id}/${arquivo.name}`);

          return {
            name: arquivo.name,
            url: urlData.publicUrl,
          };
        })
      );

      setMidias(midiasComUrl);
    } catch (error) {
      console.error('Erro ao carregar mídias:', error);
    }
  };

  const enviarWhatsApp = () => {
    if (!modelo) return;

    const mensagem = `Olá! Gostaria de saber mais sobre:\n\n${modelo.nome_modelo}\nR$ ${modelo.preco_base.toFixed(2)}`;
    const url = `https://wa.me/5528999025695?text=${encodeURIComponent(mensagem)}`;
    window.open(url, '_blank');
  };

  const imagensDisponiveis = [
    ...(modelo?.imagem_modelo ? [modelo.imagem_modelo] : []),
    ...midias.map(m => m.url)
  ];

  const proximaImagem = () => {
    setImagemAtual((prev) => (prev + 1) % imagensDisponiveis.length);
  };

  const imagemAnterior = () => {
    setImagemAtual((prev) => (prev - 1 + imagensDisponiveis.length) % imagensDisponiveis.length);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="animate-pulse text-muted-foreground">Carregando...</div>
      </div>
    );
  }

  if (!modelo) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <p className="text-muted-foreground mb-4">Produto não encontrado</p>
          <Button onClick={() => navigate('/catalogo')}>
            Voltar ao catálogo
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="bg-[#262626] text-white sticky top-0 z-50 shadow-lg">
        <div className="container mx-auto px-4 py-4">
          <Button
            variant="ghost"
            onClick={() => navigate('/catalogo')}
            className="text-white hover:bg-white/10"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Voltar ao catálogo
          </Button>
        </div>
      </header>

      <div className="container mx-auto px-4 py-8">
        <div className="grid md:grid-cols-2 gap-8">
          {/* Galeria de Imagens */}
          <div>
            <Card className="overflow-hidden">
              {imagensDisponiveis.length > 0 ? (
                <div className="relative aspect-square bg-muted">
                  <img
                    src={imagensDisponiveis[imagemAtual]}
                    alt={modelo.nome_modelo}
                    className="w-full h-full object-cover"
                  />
                  
                  {imagensDisponiveis.length > 1 && (
                    <>
                      <button
                        onClick={imagemAnterior}
                        className="absolute left-2 top-1/2 -translate-y-1/2 bg-background/80 hover:bg-background rounded-full p-2 transition-colors"
                      >
                        <ChevronLeft className="h-5 w-5" />
                      </button>
                      <button
                        onClick={proximaImagem}
                        className="absolute right-2 top-1/2 -translate-y-1/2 bg-background/80 hover:bg-background rounded-full p-2 transition-colors"
                      >
                        <ChevronRight className="h-5 w-5" />
                      </button>
                    </>
                  )}

                  {/* Indicador de imagens */}
                  {imagensDisponiveis.length > 1 && (
                    <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex gap-2">
                      {imagensDisponiveis.map((_, idx) => (
                        <button
                          key={idx}
                          onClick={() => setImagemAtual(idx)}
                          className={`w-2 h-2 rounded-full transition-all ${
                            idx === imagemAtual
                              ? 'bg-accent w-6'
                              : 'bg-background/60 hover:bg-background/80'
                          }`}
                        />
                      ))}
                    </div>
                  )}
                </div>
              ) : (
                <div className="aspect-square bg-muted flex items-center justify-center">
                  <p className="text-muted-foreground">Sem imagens disponíveis</p>
                </div>
              )}
            </Card>

            {/* Miniaturas */}
            {imagensDisponiveis.length > 1 && (
              <div className="grid grid-cols-4 gap-2 mt-4">
                {imagensDisponiveis.slice(0, 4).map((img, idx) => (
                  <button
                    key={idx}
                    onClick={() => setImagemAtual(idx)}
                    className={`aspect-square rounded-lg overflow-hidden transition-all ${
                      idx === imagemAtual ? 'ring-2 ring-accent' : 'opacity-60 hover:opacity-100'
                    }`}
                  >
                    <img src={img} alt="" className="w-full h-full object-cover" />
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Informações do Produto */}
          <div>
            <div className="flex items-center gap-2 mb-2">
              {modelo.categoria && (
                <Badge variant="secondary">{modelo.categoria}</Badge>
              )}
              <Badge>Produto Sob Encomenda</Badge>
            </div>

            <h1 className="text-3xl font-bold mb-4">{modelo.nome_modelo}</h1>

            <div className="mb-6">
              <p className="text-4xl font-bold text-accent mb-1">
                R$ {modelo.preco_base.toFixed(2)}
              </p>
              <p className="text-sm text-muted-foreground">
                em 12x de R$ {(modelo.preco_base / 12).toFixed(2)} ou{' '}
                <span className="font-semibold text-foreground">
                  R$ {(modelo.preco_base * 0.95).toFixed(2)}
                </span>{' '}
                via PIX (5% de desconto)
              </p>
            </div>

            <Button
              size="lg"
              className="w-full mb-6"
              onClick={enviarWhatsApp}
            >
              <MessageCircle className="h-5 w-5 mr-2" />
              Consultar no WhatsApp
            </Button>

            <Separator className="my-6" />

            {/* Descrição do produto */}
            {modelo.apresentacao_venda && (
              <div className="mb-6">
                <h2 className="text-xl font-semibold mb-3">Descrição do produto</h2>
                <div className="prose prose-sm max-w-none text-muted-foreground whitespace-pre-line">
                  {modelo.apresentacao_venda}
                </div>
              </div>
            )}

            <Separator className="my-6" />

            {/* Informações técnicas - placeholder para expansão futura */}
            <div>
              <h2 className="text-xl font-semibold mb-3">Dados técnicos</h2>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between py-2 border-b">
                  <span className="text-muted-foreground">Categoria</span>
                  <span className="font-medium">{modelo.categoria || 'N/A'}</span>
                </div>
                <div className="flex justify-between py-2 border-b">
                  <span className="text-muted-foreground">Prazo de entrega</span>
                  <span className="font-medium">Até 45 dias úteis</span>
                </div>
                <div className="flex justify-between py-2 border-b">
                  <span className="text-muted-foreground">Garantia</span>
                  <span className="font-medium">90 dias</span>
                </div>
              </div>
            </div>

            <Separator className="my-6" />

            {/* Informações adicionais */}
            <div className="bg-muted/50 rounded-lg p-4 space-y-2 text-sm">
              <p className="flex items-start gap-2">
                <span className="text-accent">✓</span>
                <span>Frete grátis para compras acima de R$ 999,00</span>
              </p>
              <p className="flex items-start gap-2">
                <span className="text-accent">✓</span>
                <span>Parcele em até 3x sem juros</span>
              </p>
              <p className="flex items-start gap-2">
                <span className="text-accent">✓</span>
                <span>Compra 100% segura</span>
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
