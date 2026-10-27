import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import { Award, Check, ChevronDown, ChevronLeft, ChevronRight, Gift } from 'lucide-react';
import { Midia, midiasDaOferta, type Oferta } from './OfertaVisual';
import { type CampanhaItem, moeda } from '@/lib/campanhas';
import { comboDestaque, limparDescricao, mensagemCombo, valoresCombo, type OpcaoCombo } from '@/lib/campanhaCombos';
import { nomeCurtoExtra, type Extra, type ItemExtra } from '@/lib/campanhaExtras';
import { ehCoin, textoIncluso, type ConteudoItem } from '@/lib/campanhaConteudo';
import { CampanhaExtrasPublicos } from './CampanhaExtrasPublicos';

export const wa = (msg: string) => `https://wa.me/5528999025695?text=${encodeURIComponent(msg)}`;
export function WhatsAppIcon() {
  return <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true" className="h-4 w-4 shrink-0"><path d="M20.5 3.5A11.8 11.8 0 0 0 12.1 0C5.5 0 .2 5.3.2 11.9c0 2.1.5 4.1 1.6 5.9L0 24l6.4-1.7a12 12 0 0 0 5.7 1.4h.1c6.5 0 11.8-5.3 11.8-11.9 0-3.1-1.2-6.1-3.5-8.3ZM12.1 21.7c-1.8 0-3.5-.5-5-1.4l-.4-.2-3.8 1 1-3.7-.2-.4a9.8 9.8 0 1 1 8.4 4.7Zm5.4-7.3c-.3-.1-1.8-.9-2-.9-.3-.1-.5-.1-.7.2-.2.3-.8.9-1 1-.2.2-.4.2-.7.1-.3-.2-1.3-.5-2.5-1.6-.9-.8-1.5-1.8-1.7-2.1-.2-.3 0-.4.1-.6l.5-.6.3-.5c.1-.2 0-.4 0-.6l-.9-2.1c-.2-.5-.4-.5-.6-.5h-.6c-.2 0-.5.1-.7.3-.3.3-.9.9-.9 2.1s.9 2.4 1 2.6c.1.2 1.8 2.8 4.4 3.9.6.3 1.1.4 1.5.5.6.2 1.1.2 1.6.1.5-.1 1.8-.7 2-1.4.3-.7.3-1.3.2-1.4-.1-.2-.3-.3-.6-.4Z"/></svg>;
}

export function MiniaturasBrindes({ brindes, variante = 'padrao' }: { brindes: Extra[]; variante?: 'padrao' | 'pequeno' | 'cartao' }) {
  const tamanho = variante === 'cartao' ? 'h-9 w-9 md:h-11 md:w-11' : variante === 'pequeno' ? 'h-7 w-7' : 'h-8 w-8';
  const borda = variante === 'cartao' ? 'border-2' : 'border';
  return <div className="flex shrink-0 items-center -space-x-2">{brindes.map(e => <div key={e.id} title={e.nome} className={`${tamanho} ${borda} relative shrink-0 overflow-hidden rounded-full border-[hsl(var(--campanha-circulo-borda))] bg-[hsl(var(--campanha-selo-fundo))] text-[hsl(var(--campanha-selo-texto))] flex items-center justify-center`}>{e.imagem_url?.trim() ? <img src={e.imagem_url} alt={e.nome} loading="lazy" className="h-full w-full object-contain"/> : <Gift className="h-3.5 w-3.5"/>}</div>)}</div>;
}

export function GaleriaCampanha({ oferta, detalhe = false, preco = null }: { oferta: Oferta; detalhe?: boolean; preco?: number | null }) {
  const midias = midiasDaOferta(oferta);
  const [idx, setIdx] = useState(0);
  const [touch, setTouch] = useState<number | null>(null);
  useEffect(() => setIdx(0), [oferta.id]);
  const mover = (d: number) => { if (midias.length) setIdx(i => (i + d + midias.length) % midias.length); };
  return <div className={`relative overflow-hidden ${detalhe ? 'bg-[hsl(var(--oferta-superficie))] aspect-square md:aspect-auto md:h-[650px] md:sticky md:top-0' : 'bg-[hsl(var(--campanha-selo-fundo))] aspect-square'}`} onTouchStart={e => setTouch(e.touches[0].clientX)} onTouchEnd={e => { if (touch != null && Math.abs(e.changedTouches[0].clientX - touch) > 40) mover(e.changedTouches[0].clientX < touch ? 1 : -1); setTouch(null); }} onMouseEnter={() => { if (!detalhe && midias.length > 1) setIdx(1); }} onMouseLeave={() => { if (!detalhe) setIdx(0); }}>
    {preco != null && preco > 0 && <span className="absolute right-2 top-2 z-10 rounded-full bg-accent px-2.5 py-1 text-xs font-bold tabular-nums text-accent-foreground shadow-sm">{moeda(preco)}</span>}
    {midias.length ? midias.map((m, i) => <div key={`${m.url}-${i}`} className={`absolute inset-0 transition-opacity duration-300 ${i === idx ? 'opacity-100' : 'opacity-0 pointer-events-none'} ${detalhe ? '' : 'p-3'}`}><Midia item={m} titulo={oferta.titulo} ativa={i === idx} className="h-full w-full object-contain"/></div>) : <div className="absolute inset-0 flex items-center justify-center text-xs text-[hsl(var(--oferta-muted))]">Sem imagem</div>}
    {midias.length > 1 && detalhe && <><Button size="icon" variant="secondary" aria-label="Mídia anterior" className="absolute left-2 top-1/2 bg-[hsl(var(--campanha-barra)/0.9)] text-[hsl(var(--oferta-texto))]" onClick={() => mover(-1)}><ChevronLeft className="h-5 w-5"/></Button><Button size="icon" variant="secondary" aria-label="Próxima mídia" className="absolute right-2 top-1/2 bg-[hsl(var(--campanha-barra)/0.9)] text-[hsl(var(--oferta-texto))]" onClick={() => mover(1)}><ChevronRight className="h-5 w-5"/></Button></>}
    {midias.length > 1 && detalhe && <div className="absolute bottom-2 left-3 right-3 flex flex-wrap justify-center gap-1">{midias.map((_, i) => <span key={i} className={`h-1 w-1 rounded-full ${i === idx ? 'bg-accent' : 'bg-[hsl(var(--oferta-muted))]'}`}/>)}</div>}
  </div>;
}

function AcaoCampanha({ item, combo, campanha }: { item: CampanhaItem; combo: OpcaoCombo; campanha: string }) {
  return <Button asChild className="w-full min-w-0 h-12 rounded-full px-3 gap-2 text-sm font-semibold bg-[hsl(var(--oferta-whatsapp))] text-[hsl(var(--oferta-texto))] hover:bg-[hsl(var(--oferta-whatsapp)/0.85)] active:scale-[0.97] transition-[transform,background-color] duration-150"><a href={wa(mensagemCombo(item.titulo, combo, campanha))} target="_blank" rel="noopener noreferrer"><WhatsAppIcon/>{combo.brindes.length ? 'Garantir com brindes' : 'Comprar pelo WhatsApp'}</a></Button>;
}

function Preco({ item, combo, parcelamento }: { item: CampanhaItem; combo: OpcaoCombo; parcelamento: string | null }) {
  const { valorDe, economia } = valoresCombo(item, combo);
  return <div className="min-w-0">
    <div className="flex flex-wrap items-baseline gap-x-2">
      <strong className="text-3xl font-black tabular-nums whitespace-nowrap">{moeda(combo.preco)}</strong>
      {valorDe > combo.preco && <span className="text-sm tabular-nums line-through text-[hsl(var(--oferta-suporte))]">{moeda(valorDe)}</span>}
    </div>
    <p className="mt-1 text-xs text-[hsl(var(--oferta-muted))]">
      {parcelamento}
      {economia > 0 && <>{parcelamento && ' · '}<span className="text-[hsl(var(--campanha-economia))]">economize {moeda(economia)}</span></>}
    </p>
  </div>;
}

function LinhaBrindes({ brindes }: { brindes: Extra[] }) {
  if (!brindes.length) return null;
  return <div className="flex min-w-0 items-center gap-2.5">
    <MiniaturasBrindes brindes={brindes} variante="pequeno"/>
    <p className="min-w-0 text-xs leading-snug">
      <strong className="font-semibold text-[hsl(var(--campanha-economia))]">+{brindes.length} {brindes.length === 1 ? 'brinde grátis' : 'brindes grátis'}</strong>
      <span className="block truncate text-[hsl(var(--oferta-muted))]">{brindes.map(nomeCurtoExtra).join(', ')}</span>
    </p>
  </div>;
}

interface CardProps { item: CampanhaItem; oferta: Oferta; opcoes: OpcaoCombo[]; campanha: string; nome: string; medida?: string; onOpen: () => void }
export function CampanhaCard({ item, oferta, opcoes, campanha, nome, medida, onOpen }: CardProps) {
  const combo = comboDestaque(opcoes);
  if (!combo) return null;
  return <article className="min-w-0 flex flex-col overflow-hidden rounded-lg border border-[hsl(var(--oferta-borda))] bg-[hsl(var(--campanha-barra))] text-[hsl(var(--oferta-texto))] transition-colors duration-200 [@media(hover:hover)]:hover:border-accent">
    <button type="button" aria-label={`Ver detalhes de ${oferta.titulo}`} className="relative block text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-accent" onClick={onOpen}>
      <GaleriaCampanha oferta={oferta}/>
      {item.selos.includes('MELHOR OFERTA') && <span className="absolute left-3 top-3 rounded bg-accent px-2 py-1 text-[10px] font-bold text-accent-foreground">MELHOR OFERTA</span>}
    </button>
    <div className="flex min-w-0 flex-1 flex-col gap-4 p-4 md:p-5">
      <div className="min-w-0">
        <div className="flex items-baseline justify-between gap-3">
          <h3 className="font-bebas text-4xl leading-none tracking-wide break-words">{nome}</h3>
          {medida && <span className="shrink-0 text-xs tabular-nums text-[hsl(var(--oferta-muted))]">{medida}</span>}
        </div>
        {nome !== item.titulo && <p className="mt-1 truncate text-xs text-[hsl(var(--oferta-muted))]">{item.titulo}</p>}
      </div>
      <Preco item={item} combo={combo} parcelamento={oferta.texto_parcelamento}/>
      <LinhaBrindes brindes={combo.brindes}/>
      <div className="mt-auto space-y-1 pt-1">
        <AcaoCampanha item={item} combo={combo} campanha={campanha}/>
        <button type="button" onClick={onOpen} className="h-11 w-full text-xs text-[hsl(var(--oferta-muted))] underline-offset-4 [@media(hover:hover)]:hover:text-[hsl(var(--oferta-texto))] [@media(hover:hover)]:hover:underline">Ver detalhes e ficha técnica</button>
      </div>
    </div>
  </article>;
}

interface ModalProps { item: CampanhaItem; oferta: Oferta; opcoes: OpcaoCombo[]; campanha: string; nome: string; conteudo: ConteudoItem; upsells: ItemExtra[]; onClose: () => void }
export function CampanhaModal({ item, oferta, opcoes, campanha, nome, conteudo, upsells, onClose }: ModalProps) {
  const [selecionado, setSelecionado] = useState(comboDestaque(opcoes)?.id ?? '');
  const combo = opcoes.find(c => c.id === selecionado) ?? comboDestaque(opcoes);
  if (!combo) return null;
  const descricao = limparDescricao(oferta.descricao);
  return <Dialog open onOpenChange={v => !v && onClose()}>
    <DialogContent className="w-[calc(100%-1rem)] max-w-5xl max-h-[94dvh] overflow-y-auto grid-cols-[minmax(0,1fr)] p-0 border-[hsl(var(--oferta-borda))] bg-[hsl(var(--oferta-modal))] text-[hsl(var(--oferta-texto))]">
      <DialogTitle className="sr-only">{oferta.titulo}</DialogTitle>
      <div className="grid min-w-0 md:grid-cols-2">
        <GaleriaCampanha oferta={oferta} detalhe/>
        <div className="p-5 md:p-7 space-y-6 min-w-0">
          <div className="pr-6">
            <h2 className="font-bebas text-5xl leading-none tracking-wide break-words">{nome}</h2>
            {nome !== item.titulo && <p className="mt-1.5 text-sm text-[hsl(var(--oferta-muted))]">{item.titulo}</p>}
            {oferta.bordao_modal && <p className="mt-3 font-semibold">{oferta.bordao_modal}</p>}
          </div>

          {opcoes.length > 1 && <RadioGroup value={combo.id} onValueChange={setSelecionado} className="gap-2" aria-label="Escolha seu combo">
            {opcoes.map(c => <Label key={c.id} htmlFor={`combo-${c.id}`} className={`flex items-center gap-3 rounded-lg border-2 p-3 cursor-pointer min-w-0 bg-[hsl(var(--campanha-barra))] transition-colors duration-150 ${c.id === combo.id ? 'border-accent' : 'border-[hsl(var(--oferta-borda))]'}`}>
              <RadioGroupItem id={`combo-${c.id}`} value={c.id} className="shrink-0 border-[hsl(var(--oferta-muted))] text-accent"/>
              <span className="min-w-0 flex-1 font-semibold text-sm break-words">{c.nome}</span>
              <strong className="shrink-0 tabular-nums">{moeda(c.preco)}</strong>
            </Label>)}
          </RadioGroup>}

          <div className="space-y-4">
            <Preco item={item} combo={combo} parcelamento={oferta.texto_parcelamento}/>
            {combo.brindes.length > 0 && <ul className="space-y-2">
              {combo.brindes.map(e => <li key={e.id} className="flex items-center gap-2.5 text-sm">
                <MiniaturasBrindes brindes={[e]}/>
                <span className="min-w-0 flex-1 break-words">{e.nome}</span>
                <span className="shrink-0 text-xs"><span className="mr-1.5 tabular-nums line-through text-[hsl(var(--oferta-suporte))]">{e.preco ? moeda(e.preco) : ''}</span><strong className="text-[hsl(var(--campanha-economia))]">grátis</strong></span>
              </li>)}
            </ul>}
            <AcaoCampanha item={item} combo={combo} campanha={campanha}/>
            {oferta.texto_pix && <p className="text-center text-xs text-[hsl(var(--oferta-muted))]">{oferta.texto_pix}</p>}
          </div>

          {(conteudo.specs.length > 0 || conteudo.inclusos.length > 0) && <section className="space-y-3 border-t border-[hsl(var(--oferta-borda))] pt-5">
            <h3 className="text-sm font-semibold">Ficha técnica</h3>
            <dl className="grid grid-cols-[auto_minmax(0,1fr)] gap-x-4 gap-y-1.5 text-sm">
              {conteudo.specs.map(s => <div key={s.rotulo} className="contents"><dt className="text-[hsl(var(--oferta-muted))]">{s.rotulo}</dt><dd className="text-right tabular-nums break-words">{s.valor}</dd></div>)}
            </dl>
            {conteudo.inclusos.map(t => <p key={t} className="flex items-start gap-2 text-sm">{ehCoin(t) ? <Award className="mt-0.5 h-4 w-4 shrink-0 text-accent"/> : <Check className="mt-0.5 h-4 w-4 shrink-0 text-[hsl(var(--campanha-economia))]"/>}{textoIncluso(t)}</p>)}
          </section>}

          {descricao && <details className="group border-t border-[hsl(var(--oferta-borda))] pt-5">
            <summary className="flex min-h-11 cursor-pointer list-none items-center justify-between text-sm font-semibold [&::-webkit-details-marker]:hidden">Sobre o produto<ChevronDown className="h-4 w-4 transition-transform duration-200 group-open:rotate-180"/></summary>
            <p className="mt-2 text-sm leading-relaxed whitespace-pre-line text-[hsl(var(--oferta-detalhe))]">{descricao}</p>
          </details>}

          {oferta.link_produto && <a href={oferta.link_produto} target="_blank" rel="noopener noreferrer" className="block text-center text-xs text-[hsl(var(--oferta-muted))] underline underline-offset-4 hover:text-[hsl(var(--oferta-texto))]">Ver na loja</a>}
          <CampanhaExtrasPublicos brindes={[]} upsells={upsells} produto={item.titulo}/>
        </div>
      </div>
    </DialogContent>
  </Dialog>;
}
