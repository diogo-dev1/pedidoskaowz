import { useState, useEffect, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ArrowLeft, MessageCircle, Zap } from 'lucide-react';
import { toast } from 'sonner';

function convertPlainToHtml(text: string): string {
  const sectionHeaders = [
    'Itens Inclusos', 'Itens inclusos',
    'Especificações técnicas', 'Especificações Técnicas',
    'Especificações', 'Diferenciais',
    'Descrição do produto', 'Descrição do Produto',
    'Descrição', 'Características', 'Detalhes',
    'Material', 'Dimensões', 'Composição',
  ];
  let html = text;
  for (const header of sectionHeaders) {
    const regex = new RegExp(`^(${header}):?\\s*`, 'gmi');
    html = html.replace(regex, `</p><h2 class="theme-title">${header}</h2><p>`);
  }
  html = html.replace(/^([📌✔️🔪⚡🔥💎✅🎯📋🛡️])\s*([^:\n]+):?\s*$/gm, '</p><h2 class="theme-title">$2</h2><p>');
  html = html.replace(/^([✔️✅📌🔪⚡•●▪➤➜→])\s*(.+)$/gm, '<li>$2</li>');
  html = html.replace(/((?:<li>.*<\/li>\s*)+)/g, '<ul>$1</ul>');
  html = html.replace(/\n\n+/g, '</p><p>');
  html = html.replace(/\n/g, '<br>');
  html = `<p>${html}</p>`;
  html = html.replace(/<p>\s*<\/p>/g, '');
  html = html.replace(/<p>\s*<br>\s*<\/p>/g, '');
  return html;
}

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

interface CatalogoDetalheProps {
  isRevendedor?: boolean;
}

export default function CatalogoDetalhe({ isRevendedor = false }: CatalogoDetalheProps) {
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
  const [margemGlobal, setMargemGlobal] = useState(30);
  const [margemProduto, setMargemProduto] = useState<number | null>(null);

  useEffect(() => {
    if (id) {
      carregarModelo();
      carregarMidias();
      if (isRevendedor) {
        carregarConfigRevendedor();
        carregarMargemProduto();
      } else {
        carregarConfigs();
      }
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

  const carregarConfigRevendedor = async () => {
    const { data } = await supabase
      .from('config_revendedor' as any)
      .select('*')
      .in('chave', ['margem_global']);
    if (data) {
      (data as any[]).forEach((d: any) => {
        if (d.chave === 'margem_global') setMargemGlobal(parseFloat(d.valor) || 30);
      });
    }
  };

  const carregarMargemProduto = async () => {
    const { data } = await supabase
      .from('margem_revendedor_produto' as any)
      .select('margem_percentual')
      .eq('modelo_id', id)
      .maybeSingle();
    if (data) {
      setMargemProduto(Number((data as any).margem_percentual));
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

  const imagensDisponiveis = useMemo(() => {
    const urls: string[] = [];
    const seen = new Set<string>();
    const add = (url: string) => {
      if (!seen.has(url)) { seen.add(url); urls.push(url); }
    };
    if (modelo?.imagem_modelo) add(modelo.imagem_modelo);
    midias
      .filter(m => !m.nome_arquivo.match(/\.(mp4|webm|mov|avi)$/i))
      .forEach(m => add(m.url));
    return urls;
  }, [modelo, midias]);

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
          <Button onClick={() => navigate(-1)} className="bg-accent hover:bg-accent/90">
            Voltar ao catálogo
          </Button>
        </div>
      </div>
    );
  }

  const descriptionHtml = modelo.descricao_html
    || (modelo.apresentacao_venda && /Itens Inclusos|Especificações|Diferenciais|Características|Detalhes|[✔️📌🔪⚡✅]/i.test(modelo.apresentacao_venda)
      ? convertPlainToHtml(modelo.apresentacao_venda)
      : null);

  return (
    <div className="min-h-screen bg-zinc-900 overflow-x-hidden">
      {/* Header minimal */}
      <header className="sticky top-0 z-50 bg-zinc-900/80 backdrop-blur-md border-b border-zinc-800/50">
        <div className="max-w-5xl mx-auto px-4 py-3">
          <button
            onClick={() => navigate(-1)}
            className="text-zinc-500 hover:text-white transition-colors text-sm flex items-center gap-1.5"
          >
            <ArrowLeft className="h-4 w-4" />
            Catálogo
          </button>
        </div>
      </header>

      <div className="max-w-5xl mx-auto px-4 py-8">
        <div className="grid md:grid-cols-2 gap-8 lg:gap-12">
          {/* Mídia */}
          <div className="space-y-3 min-w-0">
            {videoUrl && (
              <div className="rounded-2xl overflow-hidden aspect-[3/4] max-h-[75vh] bg-zinc-950">
                <video src={videoUrl} autoPlay loop muted playsInline className="w-full h-full object-contain" />
              </div>
            )}

            {imagensDisponiveis.length > 0 && (
              <div className="rounded-2xl overflow-hidden aspect-[3/4] max-h-[75vh] bg-zinc-950">
                <img
                  src={imagensDisponiveis[imagemAtual]}
                  alt={modelo.nome_modelo}
                  className="w-full h-full object-contain"
                />
              </div>
            )}

            {imagensDisponiveis.length > 1 && (
              <div className="flex gap-2 py-1 overflow-x-auto justify-center scrollbar-none">
                {imagensDisponiveis.map((img, idx) => (
                  <button
                    key={idx}
                    onClick={() => setImagemAtual(idx)}
                    className={`flex-shrink-0 w-16 h-16 rounded-lg overflow-hidden border-2 transition-all ${
                      idx === imagemAtual
                        ? 'border-accent opacity-100'
                        : 'border-transparent opacity-50 hover:opacity-80'
                    }`}
                  >
                    <img src={img} alt="" className="w-full h-full object-cover" />
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Info */}
          <div className="space-y-5 min-w-0">
            {/* Badges */}
            <div className="flex flex-wrap items-center gap-2">
              {modelo.pronta_entrega && (
                <span className="inline-flex items-center gap-1 text-xs font-medium text-emerald-400">
                  <Zap className="h-3 w-3" />
                  Pronta Entrega
                </span>
              )}
              {modelo.categorias?.map((cat: string) => (
                <span key={cat} className="text-xs text-zinc-500">{cat}</span>
              ))}
            </div>

            {/* Nome */}
            <h1 className="text-2xl md:text-3xl font-semibold text-white tracking-tight leading-tight break-words">
              {modelo.nome_modelo}
            </h1>

            {/* Preço */}
            {isRevendedor && modelo ? (() => {
              const margem = margemProduto ?? margemGlobal;
              const precoRevenda = modelo.preco_base * (1 - margem / 100);
              const lucro = modelo.preco_base * (margem / 100);
              return (
                <div className="space-y-2">
                  <div>
                    <p className="text-[10px] text-zinc-500 uppercase tracking-wider">Preço de Venda</p>
                    <p className="text-2xl font-black text-accent">
                      R$ {modelo.preco_base.toFixed(2)}
                    </p>
                  </div>
                  <div>
                    <p className="text-[10px] text-zinc-500 uppercase tracking-wider">Custo Revendedor</p>
                    <p className="text-lg font-bold text-zinc-200">
                      R$ {precoRevenda.toFixed(2)}
                    </p>
                  </div>
                  <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-xl px-4 py-2.5">
                    <p className="text-[10px] text-emerald-400/70 uppercase tracking-wider">Lucro</p>
                    <div className="flex items-center justify-between gap-2">
                      <p className="text-lg font-black text-emerald-400">
                        R$ {lucro.toFixed(2)}
                      </p>
                      <Badge className="bg-emerald-500/20 text-emerald-400 border-emerald-500/30 text-xs font-bold">
                        {margem.toFixed(0)}%
                      </Badge>
                    </div>
                  </div>
                </div>
              );
            })() : exibirPrecos && (
              <div className="space-y-1">
                <p className="text-2xl font-semibold text-white">
                  R$ {modelo.preco_base.toFixed(2)}
                </p>
                {exibirFormasPagamento && (
                  <p className="text-sm text-zinc-500">
                    {textoParcelamento} · <span className="text-accent">R$ {(modelo.preco_base * (1 - descontoPix / 100)).toFixed(2)} {textoPix}</span>
                  </p>
                )}
              </div>
            )}

            {/* WhatsApp */}
            {!isRevendedor && (
              <Button
                size="lg"
                className="w-full bg-accent hover:bg-accent/90 text-white rounded-xl h-12"
                onClick={enviarWhatsApp}
              >
                <MessageCircle className="h-5 w-5 mr-2" />
                Consultar no WhatsApp
              </Button>
            )}

            {/* Garantia destaque */}
            {modelo.garantia && /vital[ií]cia/i.test(modelo.garantia) ? (
              <div className="flex items-center gap-2.5 bg-emerald-500/10 border border-emerald-500/20 rounded-xl px-4 py-2.5">
                <span className="text-emerald-400 text-base">🛡️</span>
                <div>
                  <p className="text-emerald-400 text-xs font-semibold tracking-wide uppercase">Garantia Vitalícia</p>
                  <p className="text-zinc-500 text-[11px]">Qualidade que dura para sempre</p>
                </div>
              </div>
            ) : modelo.garantia ? (
              <div className="flex gap-4 text-xs text-zinc-500 pt-1">
                <span>Garantia: {modelo.garantia}</span>
              </div>
            ) : null}

            {/* Prazo entrega */}
            {modelo.prazo_entrega && (
              <p className="text-xs text-zinc-500">Entrega: {modelo.prazo_entrega}</p>
            )}

            {/* Separador */}
            <div className="border-t border-zinc-800/60" />

            {/* Descrição */}
            {descriptionHtml ? (
              <div>
                <div
                  className="shopify-description max-w-none text-zinc-400 text-[14px] leading-7 break-words"
                  dangerouslySetInnerHTML={{ __html: descriptionHtml }}
                />
              </div>
            ) : modelo.apresentacao_venda ? (
              <p className="text-zinc-400 text-sm leading-relaxed whitespace-pre-line break-words">
                {modelo.apresentacao_venda}
              </p>
            ) : null}
          </div>
        </div>
      </div>
    </div>
  );
}
