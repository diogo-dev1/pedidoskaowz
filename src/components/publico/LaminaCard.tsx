import { Link } from 'react-router-dom';
import { ArrowRight, ExternalLink, Wrench, Zap } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import type { ModeloRecomendavel } from '@/lib/recomendacao';

const BRL = (n: number) => n.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
const linkLoja = (nome: string) => `https://kaowz.com.br/search?q=${encodeURIComponent(nome)}`;

interface Props {
  modelo: ModeloRecomendavel;
  /** Texto curto explicando por que a peça aparece (recomendação). */
  porque?: string;
  /** Etiqueta acima do nome (caso de uso / degrau da escada). */
  etiqueta?: string;
  /** F3 — todas as funções que a peça cobre, num cartão único. */
  etiquetas?: string[];
  destaque?: boolean;
  /** G2 — esconde o caminho para o configurador (usado na tela de resultado). */
  semConfigurador?: boolean;
}

/** Card de lâmina no mesmo padrão visual do catálogo público. */
export default function LaminaCard({ modelo: m, porque, etiqueta, etiquetas, destaque, semConfigurador }: Props) {
  const marcas = etiquetas?.length ? etiquetas : etiqueta ? [etiqueta] : [];
  return (
    <div
      className={`group relative overflow-hidden rounded-lg transition-all ${
        destaque ? 'ring-2 ring-accent ring-offset-2 ring-offset-zinc-950' : ''
      }`}
    >
      <div className="absolute right-0 top-0 z-10 h-1 w-full bg-gradient-to-r from-transparent via-accent/50 to-accent" />

      <div className="flex h-full flex-col overflow-hidden rounded-lg border border-zinc-700 bg-zinc-800 transition-all hover:border-accent hover:shadow-lg">
        <div className="relative">
          <div className="aspect-[3/4] overflow-hidden bg-zinc-700">
            {m.video_url ? (
              <video src={m.video_url} className="h-full w-full bg-zinc-800 object-cover" muted loop autoPlay playsInline />
            ) : m.imagem_modelo ? (
              <img
                src={m.imagem_modelo}
                alt={m.nome_modelo}
                loading="lazy"
                className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
              />
            ) : (
              <div className="flex h-full w-full items-center justify-center text-zinc-500">Sem imagem</div>
            )}
          </div>

          {m.pronta_entrega && (
            <Badge className="absolute left-3 top-3 z-20 gap-0.5 border-0 bg-emerald-600 text-[10px] text-white">
              <Zap className="h-3 w-3" />
              Pronta Entrega
            </Badge>
          )}

          {marcas.length > 0 && (
            <div className="absolute bottom-3 left-3 right-3 flex flex-wrap gap-1">
              {marcas.map((t) => (
                <Badge key={t} className="border-0 bg-accent text-[10px] text-white">{t}</Badge>
              ))}
            </div>
          )}
        </div>

        <div className="flex flex-1 flex-col gap-1 p-2 md:p-4">
          <h3 className="line-clamp-1 text-sm font-bold text-white md:text-base">{m.nome_modelo}</h3>
          {porque && <p className="line-clamp-3 text-[10px] text-zinc-400 md:text-xs">{porque}</p>}
          <div className="flex-1">
            <p className="mt-1 truncate text-base font-black text-accent drop-shadow-[0_2px_10px_rgba(251,146,60,0.3)] md:text-2xl">
              {BRL(m.preco_base)}
            </p>
            <p className="text-[10px] text-zinc-400 md:text-xs">a partir de</p>
          </div>

          <div className={`mt-1.5 grid gap-1.5 ${semConfigurador ? 'grid-cols-1' : 'grid-cols-2'}`}>
            <Button
              asChild
              size="sm"
              variant="outline"
              className="h-8 border-zinc-600 bg-transparent text-[10px] font-semibold text-zinc-300 hover:border-accent hover:bg-transparent hover:text-accent md:h-10 md:text-xs"
            >
              <a href={linkLoja(m.nome_modelo)} target="_blank" rel="noopener noreferrer">
                <ExternalLink className="mr-1 h-3 w-3" /> Na loja
              </a>
            </Button>
            {!semConfigurador && (
              <Button
                asChild
                size="sm"
                className="h-8 rounded-lg bg-accent text-[10px] font-semibold text-white shadow-[0_4px_15px_rgba(251,146,60,0.25)] hover:bg-accent/90 md:h-10 md:text-xs"
              >
                <Link to={`/montar?modelo=${encodeURIComponent(m.nome_modelo)}`}>
                  <Wrench className="mr-1 h-3 w-3" /> Monte a sua
                  <ArrowRight className="ml-1 hidden h-3 w-3 md:inline" />
                </Link>
              </Button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
