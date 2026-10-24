import { ArrowDown, Check, Clock, Gift, ShieldCheck } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { moeda } from '@/lib/campanhas';
import type { FichaCampanha, Pilar } from '@/lib/campanhaConteudo';
import { WhatsAppIcon, wa } from './CampanhaVisual';

const irParaModelos = () => document.getElementById('modelos')?.scrollIntoView({ behavior: 'smooth', block: 'start' });

interface HeroProps { titulo: string; chamada: string | null; imagem: string | null; aPartirDe: number | null; parcelamento: string | null; prazo: string | null; brindesAte: number }
export function HeroCampanha({ titulo, chamada, imagem, aPartirDe, parcelamento, prazo, brindesAte }: HeroProps) {
  return <section className="mx-auto grid max-w-6xl items-center gap-6 px-4 pt-8 pb-10 md:grid-cols-2 md:gap-12 md:pt-16 md:pb-20">
    <div className="order-2 min-w-0 md:order-1">
      <h1 className="font-bebas text-6xl leading-[0.9] tracking-wide break-words md:text-8xl">{titulo}</h1>
      {chamada && <p className="mt-4 max-w-md text-lg leading-snug text-[hsl(var(--oferta-detalhe))] md:text-xl">{chamada}</p>}
      {aPartirDe != null && <p className="mt-6 text-sm text-[hsl(var(--oferta-muted))]">
        a partir de <strong className="text-2xl font-black tabular-nums text-[hsl(var(--oferta-texto))]">{moeda(aPartirDe)}</strong>
        {parcelamento && <span className="block sm:inline sm:ml-2">{parcelamento}</span>}
      </p>}
      <Button size="lg" onClick={irParaModelos} className="mt-6 h-12 w-full rounded-full px-8 text-base font-semibold sm:w-auto active:scale-[0.97] transition-transform duration-150">
        Escolher meu tamanho<ArrowDown className="ml-2 h-4 w-4"/>
      </Button>
      <ul className="mt-6 flex flex-col gap-2 text-sm text-[hsl(var(--oferta-detalhe))] sm:flex-row sm:flex-wrap sm:gap-x-5">
        {prazo && <li className="flex items-center gap-2"><Clock className="h-4 w-4 shrink-0 text-accent"/>{prazo}</li>}
        {brindesAte > 0 && <li className="flex items-center gap-2"><Gift className="h-4 w-4 shrink-0 text-accent"/>Até {moeda(brindesAte)} em brindes</li>}
        <li className="flex items-center gap-2"><ShieldCheck className="h-4 w-4 shrink-0 text-accent"/>Garantia vitalícia</li>
      </ul>
    </div>
    {imagem && <div className="order-1 aspect-square overflow-hidden rounded-lg bg-[hsl(var(--campanha-selo-fundo))] md:order-2">
      <img src={imagem} alt={titulo} className="h-full w-full object-contain p-4" fetchPriority="high"/>
    </div>}
  </section>;
}

export function TituloSecao({ children, apoio }: { children: React.ReactNode; apoio?: string }) {
  return <div className="mb-6 md:mb-8">
    <h2 className="font-bebas text-4xl leading-none tracking-wide md:text-5xl">{children}</h2>
    {apoio && <p className="mt-2 text-sm text-[hsl(var(--oferta-muted))]">{apoio}</p>}
  </div>;
}

export function PilaresCampanha({ titulo, pilares }: { titulo: string | null; pilares: Pilar[] }) {
  if (!pilares.length) return null;
  return <section className="border-t border-[hsl(var(--oferta-borda))]">
    <div className="mx-auto max-w-6xl px-4 py-14 md:py-20">
      <TituloSecao>{titulo ?? 'Por que escolher'}</TituloSecao>
      <ol className="grid gap-x-10 gap-y-8 sm:grid-cols-2">
        {pilares.map((p, i) => <li key={p.titulo} className="min-w-0 border-l-2 border-accent pl-4">
          <span className="text-xs tabular-nums text-[hsl(var(--oferta-muted))]">{String(i + 1).padStart(2, '0')}</span>
          <h3 className="mt-1 font-bebas text-2xl leading-tight tracking-wide break-words">{p.titulo}</h3>
          <p className="mt-1.5 text-sm leading-relaxed text-[hsl(var(--oferta-detalhe))]">{p.texto}</p>
        </li>)}
      </ol>
    </div>
  </section>;
}

export function FichaComparativa({ ficha, nomes, inclusos }: { ficha: FichaCampanha; nomes: { id: string; nome: string }[]; inclusos: string[] }) {
  if (!ficha.comparar.length && !ficha.comuns.length) return null;
  return <section className="border-t border-[hsl(var(--oferta-borda))]">
    <div className="mx-auto grid max-w-6xl gap-10 px-4 py-14 md:grid-cols-[3fr_2fr] md:gap-16 md:py-20">
      {ficha.comparar.length > 0 && <div className="min-w-0">
        <TituloSecao apoio="Mesma construção, medidas diferentes. Escolha pelo seu uso.">Compare os tamanhos</TituloSecao>
        <table className="w-full table-fixed text-sm">
          <thead><tr className="border-b border-[hsl(var(--oferta-borda))]">
            <th className="w-[40%] py-2 text-left font-normal text-[hsl(var(--oferta-muted))]"><span className="sr-only">Medida</span></th>
            {nomes.map(n => <th key={n.id} className="py-2 text-right font-semibold break-words">{n.nome}</th>)}
          </tr></thead>
          <tbody>{ficha.comparar.map(c => <tr key={c.rotulo} className="border-b border-[hsl(var(--oferta-borda)/0.5)]">
            <th scope="row" className="py-2.5 pr-2 text-left font-normal text-[hsl(var(--oferta-muted))]">{c.rotulo}</th>
            {nomes.map(n => <td key={n.id} className="py-2.5 text-right tabular-nums">{c.valores[n.id]}</td>)}
          </tr>)}</tbody>
        </table>
      </div>}
      {ficha.comuns.length > 0 && <div className="min-w-0">
        <TituloSecao>{ficha.comparar.length ? 'Em todos os modelos' : 'Ficha técnica'}</TituloSecao>
        <dl className="grid grid-cols-[auto_minmax(0,1fr)] gap-x-4 gap-y-2 text-sm">
          {ficha.comuns.map(s => <div key={s.rotulo} className="contents"><dt className="text-[hsl(var(--oferta-muted))]">{s.rotulo}</dt><dd className="text-right break-words">{s.valor}</dd></div>)}
        </dl>
        {inclusos.length > 0 && <ul className="mt-5 space-y-2 text-sm">
          {inclusos.map(t => <li key={t} className="flex items-start gap-2"><Check className="mt-0.5 h-4 w-4 shrink-0 text-[hsl(var(--campanha-economia))]"/>{t}</li>)}
        </ul>}
      </div>}
    </div>
  </section>;
}

export function FechamentoCampanha({ campanha }: { campanha: string }) {
  return <section className="border-t border-[hsl(var(--oferta-borda))]">
    <div className="mx-auto flex max-w-2xl flex-col items-center px-4 py-16 text-center md:py-24">
      <ShieldCheck className="h-8 w-8 text-accent"/>
      <h2 className="mt-4 font-bebas text-4xl leading-none tracking-wide md:text-5xl">Garantia vitalícia</h2>
      <p className="mt-3 text-sm leading-relaxed text-[hsl(var(--oferta-detalhe))]">Qualidade e manutenção de afiação em todas as nossas lâminas, para sempre.</p>
      <div className="mt-8 flex w-full flex-col gap-3 sm:w-auto sm:flex-row">
        <Button size="lg" onClick={irParaModelos} className="h-12 rounded-full px-8 font-semibold active:scale-[0.97] transition-transform duration-150">Escolher meu tamanho</Button>
        <Button asChild size="lg" variant="outline" className="h-12 gap-2 rounded-full border-[hsl(var(--oferta-borda))] bg-transparent px-8 text-[hsl(var(--oferta-texto))] hover:bg-[hsl(var(--oferta-superficie))] hover:text-[hsl(var(--oferta-texto))]">
          <a href={wa(`Olá! Tenho uma dúvida sobre a campanha ${campanha}`)} target="_blank" rel="noopener noreferrer"><WhatsAppIcon/>Tirar dúvida</a>
        </Button>
      </div>
    </div>
  </section>;
}

export function BarraFixaCampanha({ visivel, aPartirDe }: { visivel: boolean; aPartirDe: number | null }) {
  return <div aria-hidden={!visivel} className={`fixed inset-x-0 bottom-0 z-40 border-t border-[hsl(var(--oferta-borda))] bg-[hsl(var(--oferta-preto)/0.95)] px-4 pt-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] md:hidden transition-[transform,opacity] duration-300 [transition-timing-function:cubic-bezier(0.23,1,0.32,1)] motion-reduce:transition-opacity ${visivel ? 'translate-y-0 opacity-100' : 'pointer-events-none translate-y-full opacity-0'}`}>
    <div className="flex items-center justify-between gap-3">
      {aPartirDe != null && <p className="text-xs text-[hsl(var(--oferta-muted))]">a partir de<strong className="block text-lg font-black tabular-nums text-[hsl(var(--oferta-texto))]">{moeda(aPartirDe)}</strong></p>}
      <Button tabIndex={visivel ? 0 : -1} onClick={irParaModelos} className="h-11 flex-1 rounded-full font-semibold active:scale-[0.97] transition-transform duration-150">Escolher meu tamanho</Button>
    </div>
  </div>;
}
