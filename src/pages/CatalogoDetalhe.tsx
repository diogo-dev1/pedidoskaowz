import { useState, useEffect, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ArrowLeft, MessageCircle, Zap } from 'lucide-react';
import { toast } from 'sonner';

interface Modelo {
  id: string;
  nome_modelo: string;
  preco_base: number;
  imagem_modelo: string | null;
  categorias: string[];
  categoria: string | null;
  apresentacao_venda: string | null;
  descricao_html: string | null;
  video_url: string | null;
  garantia: string | null;
  prazo_entrega: string | null;
  aspect_ratio: string;
  pronta_entrega: boolean;
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
  const [exibirPrecos, setExibirPrecos] = useState(true);
  const [exibirFormasPagamento, setExibirFormasPagamento] = useState(true);
  const [descontoPix, setDescontoPix] = useState(5);
  const [textoPix, setTextoPix] = useState('no PIX');
  const [textoParcelamento, setTextoParcelamento] = useState('3x sem juros ou até 12x no cartão');

  useEffect(() => {
    if (id) {
      carregarModelo();
      carregarMidias();
      carregarConfigs();
    }
  }, [id]);

  const carregarConfigs = async () => {
    const { data } = await supabase
      .from('configuracoes_catalogo')
      .select('*')
      .in('chave', ['exibir_precos', 'exibir_formas_pagamento', 'desconto_pix', 'texto_pix', 'texto_parcelamento']);
    if (data) {
      data.forEach(d => {
        if (d.chave === 'exibir_precos') setExibirPrecos(d.valor === 'true');
        if (d.chave === 'exibir_formas_pagamento') setExibirFormasPagamento(d.valor === 'true');
        if (d.chave === 'desconto_pix') setDescontoPix(parseFloat(d.valor) || 5);
        if (d.chave === 'texto_pix') setTextoPix(d.valor);
        if (d.chave === 'texto_parcelamento') setTextoParcelamento(d.valor);
      });
    }
  };

  const carregarModelo = async () => {
    try {
      const { data, error } = await (supabase
        .from('catalogo_modelos')
        .select('*') as any)
        .eq('id', id)
        .maybeSingle();

      if (error) throw error;
      setModelo(data as Modelo | null);
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
    const imagemPrincipal = modelo.imagem_modelo || (imagensDisponiveis.length > 0 ? imagensDisponiveis[0] : null);
    let mensagem = exibirPrecos
      ? `Olá! Gostaria de saber mais sobre:\n\n${modelo.nome_modelo}\nR$ ${modelo.preco_base.toFixed(2)}`
      : `Olá! Gostaria de saber mais sobre:\n\n${modelo.nome_modelo}`;
    if (imagemPrincipal) {
      mensagem += `\n\n${imagemPrincipal}`;
    }
    const url = `https://wa.me/5528999025695?text=${encodeURIComponent(mensagem)}`;
    window.open(url, '_blank');
  };

  const videoUrl = modelo?.video_url;

  const imagensDisponiveis = useMemo(() => [
    ...(modelo?.imagem_modelo ? [modelo.imagem_modelo] : []),
    ...midias.filter(m => !m.nome_arquivo.match(/\.(mp4|webm|mov|avi)$/i)).map(m => m.url)
  ], [modelo, midias]);

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
    <div className="min-h-screen bg-zinc-900 overflow-x-hidden">
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

      <div className="w-full max-w-full overflow-hidden px-4 py-6 mx-auto" style={{ maxWidth: '100vw' }}>
        <div className="grid md:grid-cols-2 gap-6 max-w-5xl mx-auto">
          {/* Mídia */}
          <div className="space-y-4 min-w-0 overflow-hidden">
            {videoUrl && (
              <div className="bg-zinc-800 rounded-lg overflow-hidden aspect-[3/4] max-h-[70vh]">
                <video
                  src={videoUrl}
                  autoPlay
                  loop
                  muted
                  playsInline
                  className="w-full h-full object-contain"
                />
              </div>
            )}

            {imagensDisponiveis.length > 0 && (
              <div className="relative bg-zinc-800 rounded-lg overflow-hidden flex items-center justify-center aspect-[3/4] max-h-[70vh]">
                <img
                  src={imagensDisponiveis[imagemAtual]}
                  alt={modelo.nome_modelo}
                  className="w-full h-full object-contain"
                />
              </div>
            )}

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
          <div className="space-y-6 min-w-0 overflow-hidden">
            {/* Nome, categoria e pronta entrega */}
            <div>
              <div className="flex flex-wrap gap-1 mb-2">
                {modelo.pronta_entrega && (
                  <Badge className="bg-emerald-600 text-white border-0 gap-0.5">
                    <Zap className="h-3 w-3" />
                    Pronta Entrega
                  </Badge>
                )}
                {modelo.categorias && modelo.categorias.length > 0 && modelo.categorias.map((cat: string) => (
                  <Badge key={cat} className="bg-zinc-800 text-zinc-300 border-zinc-700">
                    {cat}
                  </Badge>
                ))}
              </div>
              <h1 className="text-2xl md:text-3xl font-bold text-white break-words">
                {modelo.nome_modelo}
              </h1>
            </div>

            {/* Preço */}
            {exibirPrecos && (
              <div className="bg-zinc-800 rounded-lg p-4">
                <p className="text-3xl font-bold text-accent mb-1">
                  R$ {modelo.preco_base.toFixed(2)}
                </p>
                {exibirFormasPagamento && (
                  <p className="text-sm text-zinc-400">
                    {textoParcelamento} ou{' '}
                    <span className="text-accent font-semibold">
                      R$ {(modelo.preco_base * (1 - descontoPix / 100)).toFixed(2)} {textoPix}
                    </span>
                  </p>
                )}
              </div>
            )}

            {/* Botão WhatsApp */}
            <Button
              size="lg"
              className="w-full bg-accent hover:bg-accent/90 text-white"
              onClick={enviarWhatsApp}
            >
              <MessageCircle className="h-5 w-5 mr-2" />
              Consultar no WhatsApp
            </Button>

            {/* Descrição completa HTML da Shopify */}
            {modelo.descricao_html && (
              <div className="bg-zinc-800/50 rounded-lg p-4">
                <h2 className="text-sm font-medium text-zinc-400 uppercase tracking-wide mb-3">
                  Descrição completa
                </h2>
                <div
                  className="text-zinc-300 text-sm leading-relaxed break-words prose prose-sm prose-invert max-w-none
                    [&_h1]:text-lg [&_h1]:font-bold [&_h1]:text-white [&_h1]:mt-4 [&_h1]:mb-2
                    [&_h2]:text-base [&_h2]:font-bold [&_h2]:text-white [&_h2]:mt-4 [&_h2]:mb-2
                    [&_h3]:text-sm [&_h3]:font-bold [&_h3]:text-white [&_h3]:mt-3 [&_h3]:mb-1
                    [&_p]:mb-2 [&_p]:text-zinc-300
                    [&_ul]:list-disc [&_ul]:pl-5 [&_ul]:mb-3 [&_ul]:space-y-1
                    [&_ol]:list-decimal [&_ol]:pl-5 [&_ol]:mb-3 [&_ol]:space-y-1
                    [&_li]:text-zinc-300
                    [&_strong]:text-white [&_strong]:font-semibold
                    [&_em]:italic
                    [&_table]:w-full [&_table]:border-collapse [&_table]:mb-3
                    [&_th]:bg-zinc-700 [&_th]:text-white [&_th]:p-2 [&_th]:text-left [&_th]:text-xs [&_th]:font-semibold
                    [&_td]:border-b [&_td]:border-zinc-700 [&_td]:p-2 [&_td]:text-xs [&_td]:text-zinc-300
                    [&_tr:hover]:bg-zinc-700/30
                    [&_a]:text-accent [&_a]:underline [&_a]:hover:text-accent/80
                    [&_img]:rounded-lg [&_img]:my-2 [&_img]:max-w-full
                    [&_br]:block [&_br]:mb-1"
                  dangerouslySetInnerHTML={{ __html: modelo.descricao_html }}
                />
              </div>
            )}

            {/* Descrição texto simples (fallback) */}
            {!modelo.descricao_html && modelo.apresentacao_venda && (
              <div className="bg-zinc-800/50 rounded-lg p-4">
                <h2 className="text-sm font-medium text-zinc-400 uppercase tracking-wide mb-3">
                  Sobre o produto
                </h2>
                <p className="text-zinc-300 text-sm leading-relaxed whitespace-pre-line break-words">
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
              {modelo.pronta_entrega && (
                <span className="bg-emerald-900/50 text-emerald-300 px-3 py-1.5 rounded-full">
                  ⚡ Entrega imediata
                </span>
              )}
              <span className="bg-zinc-800 text-zinc-300 px-3 py-1.5 rounded-full">
                ✓ Compra segura
              </span>
              {exibirFormasPagamento && (
                <span className="bg-zinc-800 text-zinc-300 px-3 py-1.5 rounded-full">
                  ✓ {textoParcelamento.split(' ou')[0] || 'Parcelamento'}
                </span>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
