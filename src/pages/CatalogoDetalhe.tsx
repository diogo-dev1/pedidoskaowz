import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ArrowLeft, MessageCircle, ChevronLeft, ChevronRight } from 'lucide-react';
import { toast } from 'sonner';

interface Modelo {
  id: string;
  nome_modelo: string;
  preco_base: number;
  imagem_modelo: string | null;
  categoria: string | null;
  apresentacao_venda: string | null;
  video_url: string | null;
  garantia: string | null;
  prazo_entrega: string | null;
}

interface Midia {
  id: string;
  nome_arquivo: string;
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
        .maybeSingle();

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
        .from('midias_catalogo')
        .select('id, nome_arquivo, url')
        .eq('modelo_id', id)
        .eq('visivel_catalogo', true);

      if (error) throw error;

      setMidias(data || []);
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

  // Separar vídeo principal das imagens
  const videoUrl = modelo?.video_url;
  
  const imagensDisponiveis = [
    ...(modelo?.imagem_modelo ? [modelo.imagem_modelo] : []),
    ...midias.filter(m => !m.nome_arquivo.match(/\.(mp4|webm|mov|avi)$/i)).map(m => m.url)
  ];

  const proximaImagem = () => {
    setImagemAtual((prev) => (prev + 1) % imagensDisponiveis.length);
  };

  const imagemAnterior = () => {
    setImagemAtual((prev) => (prev - 1 + imagensDisponiveis.length) % imagensDisponiveis.length);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-zinc-900 flex items-center justify-center">
        <div className="animate-pulse text-zinc-400">Carregando...</div>
      </div>
    );
  }

  if (!modelo) {
    return (
      <div className="min-h-screen bg-zinc-900 flex items-center justify-center">
        <div className="text-center">
          <p className="text-zinc-400 mb-4">Produto não encontrado</p>
          <Button onClick={() => navigate('/catalogo')} className="bg-accent hover:bg-accent/90">
            Voltar ao catálogo
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-zinc-900">
      {/* Header */}
      <header className="bg-black sticky top-0 z-50">
        <div className="container mx-auto px-4 py-3">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => navigate('/catalogo')}
            className="text-zinc-400 hover:text-white hover:bg-white/10"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Voltar
          </Button>
        </div>
      </header>

      <div className="container mx-auto px-4 py-6">
        <div className="grid md:grid-cols-2 gap-6 max-w-5xl mx-auto">
          {/* Mídia */}
          <div className="space-y-4">
            {/* Vídeo */}
            {videoUrl && (
              <div className="aspect-[9/16] bg-zinc-800 rounded-lg overflow-hidden">
                <video
                  src={videoUrl}
                  autoPlay
                  loop
                  muted
                  playsInline
                  className="w-full h-full object-cover"
                />
              </div>
            )}

            {/* Imagem principal */}
            {imagensDisponiveis.length > 0 && (
              <div className="relative aspect-[9/16] bg-zinc-800 rounded-lg overflow-hidden flex items-center justify-center">
                <img
                  src={imagensDisponiveis[imagemAtual]}
                  alt={modelo.nome_modelo}
                  className="w-full h-full object-contain"
                />
              </div>
            )}

            {/* Miniaturas horizontais */}
            {imagensDisponiveis.length > 1 && (
              <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-thin justify-center">
                {imagensDisponiveis.map((img, idx) => (
                  <button
                    key={idx}
                    onClick={() => setImagemAtual(idx)}
                    className={`flex-shrink-0 w-16 h-16 md:w-20 md:h-20 rounded-lg overflow-hidden transition-all ${
                      idx === imagemAtual ? 'ring-2 ring-accent' : 'opacity-50 hover:opacity-100'
                    }`}
                  >
                    <img src={img} alt="" className="w-full h-full object-cover" />
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Informações */}
          <div className="space-y-6">
            {/* Nome e categoria */}
            <div>
              {modelo.categoria && (
                <Badge className="bg-zinc-800 text-zinc-300 border-zinc-700 mb-2">
                  {modelo.categoria}
                </Badge>
              )}
              <h1 className="text-2xl md:text-3xl font-bold text-white">
                {modelo.nome_modelo}
              </h1>
            </div>

            {/* Preço */}
            <div className="bg-zinc-800 rounded-lg p-4">
              <p className="text-3xl font-bold text-accent mb-1">
                R$ {modelo.preco_base.toFixed(2)}
              </p>
              <p className="text-sm text-zinc-400">
                12x de R$ {(modelo.preco_base / 12).toFixed(2)} ou{' '}
                <span className="text-accent font-semibold">
                  R$ {(modelo.preco_base * 0.95).toFixed(2)} no PIX
                </span>
              </p>
            </div>

            {/* Botão WhatsApp */}
            <Button
              size="lg"
              className="w-full bg-accent hover:bg-accent/90 text-white"
              onClick={enviarWhatsApp}
            >
              <MessageCircle className="h-5 w-5 mr-2" />
              Consultar no WhatsApp
            </Button>

            {/* Descrição */}
            {modelo.apresentacao_venda && (
              <div className="bg-zinc-800/50 rounded-lg p-4">
                <h2 className="text-sm font-medium text-zinc-400 uppercase tracking-wide mb-3">
                  Sobre o produto
                </h2>
                <p className="text-zinc-300 text-sm leading-relaxed whitespace-pre-line">
                  {modelo.apresentacao_venda}
                </p>
              </div>
            )}

            {/* Dados técnicos */}
            {(modelo.prazo_entrega || modelo.garantia) && (
              <div className="space-y-2">
                <h2 className="text-sm font-medium text-zinc-400 uppercase tracking-wide">
                  Informações
                </h2>
                <div className="bg-zinc-800/50 rounded-lg divide-y divide-zinc-700/50">
                  {modelo.prazo_entrega && (
                    <div className="flex justify-between p-3 text-sm">
                      <span className="text-zinc-400">Prazo de entrega</span>
                      <span className="text-white">{modelo.prazo_entrega}</span>
                    </div>
                  )}
                  {modelo.garantia && (
                    <div className="flex justify-between p-3 text-sm">
                      <span className="text-zinc-400">Garantia</span>
                      <span className="text-white">{modelo.garantia}</span>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Benefícios */}
            <div className="flex flex-wrap gap-2 text-xs">
              <span className="bg-zinc-800 text-zinc-300 px-3 py-1.5 rounded-full">
                ✓ Frete grátis +R$999
              </span>
              <span className="bg-zinc-800 text-zinc-300 px-3 py-1.5 rounded-full">
                ✓ 3x sem juros
              </span>
              <span className="bg-zinc-800 text-zinc-300 px-3 py-1.5 rounded-full">
                ✓ Compra segura
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
