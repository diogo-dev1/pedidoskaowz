import { Button } from '@/components/ui/button';
import { ExternalLink, MessageCircle } from 'lucide-react';
import { type ItemExtra, precoExtra, nomesBrindes } from '@/lib/campanhaExtras';
import { moeda } from '@/lib/campanhas';

export function BrindesFaixa({ lista }: { lista: ItemExtra[] }) {
  if (!lista.length) return null;
  return <p className="mt-1 line-clamp-2 rounded bg-accent/10 p-1.5 text-[10px] font-semibold text-accent md:text-xs">🎁 + {nomesBrindes(lista)} de brinde</p>;
}
export function CampanhaExtrasPublicos({ brindes, upsells, produto }: { brindes: ItemExtra[]; upsells: ItemExtra[]; produto: string }) {
  return <>{([{ titulo: 'Você ganha', lista: brindes, brinde: true }, { titulo: 'Leve junto', lista: upsells, brinde: false }]).map(({ titulo, lista, brinde }) => lista.length > 0 && <section key={titulo} className="space-y-3 border-t border-accent/20 pt-4"><h3 className="font-semibold text-accent">{titulo}</h3>{lista.map(v => {
    const extra = v.campanha_extras;
    if (!extra) return null;
    const preco = precoExtra(v);
    const desconto = !brinde && extra.preco != null && preco != null && preco < extra.preco;
    const mensagem = `Olá! Tenho interesse na ${produto} e quero adicionar ${extra.nome}${preco != null ? ` - ${moeda(preco)}` : ''}`;
    return <div key={v.id} className="flex items-start gap-3 min-w-0">{extra.imagem_url && <img src={extra.imagem_url} alt={extra.nome} className="h-14 w-14 shrink-0 rounded object-cover"/>}<div className="min-w-0 flex-1 space-y-1"><h4 className="text-sm font-semibold break-words">{extra.nome}</h4>{extra.descricao && <p className="text-xs opacity-70 whitespace-pre-line break-words">{extra.descricao}</p>}<p className="text-sm">{(brinde || desconto) && extra.preco != null && <span className="mr-2 line-through opacity-60">{moeda(extra.preco)}</span>}{brinde ? <strong className="text-accent">GRÁTIS</strong> : preco != null ? <strong className="text-accent">{moeda(preco)}</strong> : null}</p>{!brinde && <div className="flex flex-wrap gap-2 pt-1">{extra.link && <Button asChild variant="outline" size="sm" className="bg-transparent text-inherit"><a href={extra.link} target="_blank" rel="noopener noreferrer"><ExternalLink className="mr-1 h-3 w-3"/>Ver na loja</a></Button>}<Button asChild size="sm"><a href={`https://wa.me/5528999025695?text=${encodeURIComponent(mensagem)}`} target="_blank" rel="noopener noreferrer"><MessageCircle className="mr-1 h-3 w-3"/>Quero adicionar</a></Button></div>}</div></div>;
  })}</section>)}</>;
}