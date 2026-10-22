import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import { ChevronLeft, ChevronRight, Gift } from 'lucide-react';
import { Midia, midiasDaOferta, type Oferta } from './OfertaVisual';
import { type CampanhaItem, moeda } from '@/lib/campanhas';
import { comboDestaque, limparDescricao, mensagemCombo, valoresCombo, type OpcaoCombo } from '@/lib/campanhaCombos';
import { nomeCurtoExtra, type Extra, type ItemExtra } from '@/lib/campanhaExtras';
import { CampanhaExtrasPublicos } from './CampanhaExtrasPublicos';

const wa = (msg: string) => `https://wa.me/5528999025695?text=${encodeURIComponent(msg)}`;
function WhatsAppIcon() {
  return <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true" className="h-4 w-4 shrink-0"><path d="M20.5 3.5A11.8 11.8 0 0 0 12.1 0C5.5 0 .2 5.3.2 11.9c0 2.1.5 4.1 1.6 5.9L0 24l6.4-1.7a12 12 0 0 0 5.7 1.4h.1c6.5 0 11.8-5.3 11.8-11.9 0-3.1-1.2-6.1-3.5-8.3ZM12.1 21.7c-1.8 0-3.5-.5-5-1.4l-.4-.2-3.8 1 1-3.7-.2-.4a9.8 9.8 0 1 1 8.4 4.7Zm5.4-7.3c-.3-.1-1.8-.9-2-.9-.3-.1-.5-.1-.7.2-.2.3-.8.9-1 1-.2.2-.4.2-.7.1-.3-.2-1.3-.5-2.5-1.6-.9-.8-1.5-1.8-1.7-2.1-.2-.3 0-.4.1-.6l.5-.6.3-.5c.1-.2 0-.4 0-.6l-.9-2.1c-.2-.5-.4-.5-.6-.5h-.6c-.2 0-.5.1-.7.3-.3.3-.9.9-.9 2.1s.9 2.4 1 2.6c.1.2 1.8 2.8 4.4 3.9.6.3 1.1.4 1.5.5.6.2 1.1.2 1.6.1.5-.1 1.8-.7 2-1.4.3-.7.3-1.3.2-1.4-.1-.2-.3-.3-.6-.4Z"/></svg>;
}

export function MiniaturasBrindes({ brindes, variante = 'padrao' }: { brindes: Extra[]; variante?: 'padrao' | 'pequeno' | 'cartao' }) {
  const tamanho = variante === 'cartao' ? 'h-9 w-9 md:h-11 md:w-11' : variante === 'pequeno' ? 'h-6 w-6 md:h-8 md:w-8' : 'h-8 w-8';
  const borda = variante === 'cartao' ? 'border-2' : 'border';
  return <div className="flex min-w-0 flex-wrap items-center -space-x-2 gap-y-1">{brindes.map(e => <div key={e.id} title={e.nome} className={`${tamanho} ${borda} relative shrink-0 overflow-hidden rounded-full border-[hsl(var(--campanha-circulo-borda))] bg-[hsl(var(--campanha-selo-fundo))] text-[hsl(var(--campanha-selo-texto))] shadow-[var(--campanha-circulo-sombra)] flex items-center justify-center`}>{e.imagem_url?.trim() ? <img src={e.imagem_url} alt={e.nome} loading="lazy" className="h-full w-full object-contain"/> : <Gift className="h-4 w-4"/>}</div>)}</div>;
}

function GaleriaCampanha({ oferta, brindes = [], detalhe = false }: { oferta: Oferta; brindes?: Extra[]; detalhe?: boolean }) {
  const midias = midiasDaOferta(oferta);
  const [idx, setIdx] = useState(0);
  const [touch, setTouch] = useState<number | null>(null);
  useEffect(() => setIdx(0), [oferta.id]);
  const mover = (d: number) => { if (midias.length) setIdx(i => (i + d + midias.length) % midias.length); };
  return <div className={`relative overflow-hidden bg-[hsl(var(--oferta-superficie))] ${detalhe ? 'aspect-square md:aspect-auto md:h-[650px] md:sticky md:top-0' : 'aspect-[3/4]'}`} onTouchStart={e => setTouch(e.touches[0].clientX)} onTouchEnd={e => { if (touch != null && Math.abs(e.changedTouches[0].clientX - touch) > 40) mover(e.changedTouches[0].clientX < touch ? 1 : -1); setTouch(null); }} onMouseEnter={() => { if (!detalhe && midias.length > 1) setIdx(1); }} onMouseLeave={() => { if (!detalhe) setIdx(0); }}>
    {midias.length ? midias.map((m, i) => <div key={`${m.url}-${i}`} className={`absolute inset-0 transition-opacity ${i === idx ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}><Midia item={m} titulo={oferta.titulo} ativa={i === idx} className={`h-full w-full ${detalhe ? 'object-contain' : 'object-cover'}`}/></div>) : <div className="absolute inset-0 flex items-center justify-center text-xs text-[hsl(var(--oferta-muted))]">Sem imagem</div>}
    {midias.length > 1 && detalhe && <><Button size="icon" variant="secondary" aria-label="Mídia anterior" className="absolute left-2 top-1/2 bg-[hsl(var(--campanha-barra)/0.9)] text-[hsl(var(--oferta-texto))]" onClick={() => mover(-1)}><ChevronLeft className="h-5 w-5"/></Button><Button size="icon" variant="secondary" aria-label="Próxima mídia" className="absolute right-2 top-1/2 bg-[hsl(var(--campanha-barra)/0.9)] text-[hsl(var(--oferta-texto))]" onClick={() => mover(1)}><ChevronRight className="h-5 w-5"/></Button></>}
    {brindes.length > 0 && <span className="absolute top-2 left-2 rounded-[2px] bg-[hsl(var(--campanha-selo-fundo)/0.8)] text-[hsl(var(--campanha-selo-texto))] backdrop-blur-sm px-1 py-0.5 text-[10px] md:text-[11px] font-semibold uppercase tracking-widest">Brinde incluso</span>}
    {midias.length > 1 && <div className="absolute bottom-2 left-3 right-3 flex flex-wrap justify-center gap-1">{midias.map((_, i) => <span key={i} className={`h-1 w-1 rounded-full ${i === idx ? 'bg-accent' : 'bg-[hsl(var(--oferta-muted))]'}`}/>)}</div>}
  </div>;
}

function AcaoCampanha({ item, combo, campanha }: { item: CampanhaItem; combo: OpcaoCombo; campanha: string }) {
  return <Button asChild className="w-full min-w-0 h-11 rounded-full px-2 gap-1.5 text-[11px] md:text-sm font-semibold bg-[hsl(var(--oferta-whatsapp))] text-[hsl(var(--oferta-texto))] hover:bg-[hsl(var(--oferta-whatsapp)/0.85)]"><a href={wa(mensagemCombo(item.titulo, combo, campanha))} target="_blank" rel="noopener noreferrer"><WhatsAppIcon/>{combo.brindes.length ? 'Resgatar brindes' : 'Falar no WhatsApp'}</a></Button>;
}
function LinkLoja({ link }: { link: string | null | undefined }) {
  return link ? <a href={link} target="_blank" rel="noopener noreferrer" className="block text-center text-xs text-[hsl(var(--oferta-muted))] underline underline-offset-4 hover:text-[hsl(var(--oferta-texto))]">Ver na loja</a> : null;
}
export function CampanhaCard({ item, oferta, opcoes, campanha, onOpen }: { item: CampanhaItem; oferta: Oferta; opcoes: OpcaoCombo[]; campanha: string; onOpen: () => void }) {
  const combo = comboDestaque(opcoes);
  if (!combo) return null;
  const { valorDe, valorBrindes, economia } = valoresCombo(item, combo);
  return <article className="min-w-0 flex flex-col overflow-hidden rounded-lg border border-[hsl(var(--oferta-borda))] bg-[hsl(var(--campanha-barra))] text-[hsl(var(--oferta-texto))] hover:border-accent transition-colors">
    <div role="button" tabIndex={0} aria-label={`Ver detalhes de ${oferta.titulo}`} className="cursor-pointer focus-visible:ring-2 focus-visible:ring-accent" onClick={onOpen} onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onOpen(); } }}><GaleriaCampanha oferta={oferta} brindes={combo.brindes}/></div>
    <div className="flex flex-1 min-w-0 flex-col gap-2 p-2 md:p-4">
      {item.categoria_linha?.trim() && <p className="text-[10px] md:text-[11px] uppercase tracking-widest text-[hsl(var(--oferta-muted))] truncate">{item.categoria_linha}</p>}
      <h2 className="text-[15px] md:text-lg font-bold leading-snug line-clamp-2 break-words cursor-pointer" onClick={onOpen}>{item.titulo_curto?.trim() || item.titulo}</h2>
      {combo.brindes.length > 0 && <section aria-label="Brindes inclusos" className="min-w-0 rounded-lg border border-[hsl(var(--campanha-brindes-borda))] p-2 md:px-3 md:py-2.5">
        <div className="flex min-w-0 items-baseline justify-between gap-1">
          <span className="flex min-w-0 items-baseline gap-1 text-[11px] font-semibold uppercase leading-snug"><Gift className="h-3 w-3 shrink-0 self-center text-accent"/><span>GANHE {combo.brindes.length} {combo.brindes.length === 1 ? 'BRINDE' : 'BRINDES'}</span></span>
          <span className="flex shrink-0 flex-col items-end text-xs leading-snug md:flex-row md:gap-1">{valorBrindes > 0 && <span className="whitespace-nowrap line-through text-[hsl(var(--oferta-suporte))]">{moeda(valorBrindes)}</span>}<strong className="font-semibold text-[hsl(var(--campanha-economia))]">grátis</strong></span>
        </div>
        <div className="mt-2.5 grid min-w-0 grid-cols-3 gap-1.5 text-center">{combo.brindes.map(e => <div key={e.id} className="min-w-0" title={e.nome}>
          <div className="mx-auto flex h-10 w-10 items-center justify-center overflow-hidden rounded-full border border-[hsl(var(--campanha-circulo-borda))] bg-[hsl(var(--campanha-selo-fundo))] text-[hsl(var(--campanha-selo-texto))] shadow-[var(--campanha-circulo-sombra)] md:h-12 md:w-12">{e.imagem_url?.trim() ? <img src={e.imagem_url} alt={e.nome} loading="lazy" className="h-full w-full object-contain"/> : <Gift className="h-4 w-4"/>}</div>
          <p className="mt-1 line-clamp-1 break-all text-[10px] leading-relaxed text-[hsl(var(--oferta-muted))] md:text-[11px]">{nomeCurtoExtra(e)}</p>
        </div>)}</div>
      </section>}
      <div className="min-w-0"><div className="flex min-w-0 items-baseline gap-1 md:gap-2"><strong className="text-[22px] md:text-[28px] font-black whitespace-nowrap">{moeda(combo.preco)}</strong>{valorDe > combo.preco && <span className="min-w-0 break-words text-[9px] leading-snug line-through text-[hsl(var(--oferta-suporte))] md:text-xs">de {moeda(valorDe)}</span>}</div>
      <p className="mt-2 text-xs leading-relaxed break-words text-[hsl(var(--oferta-muted))] md:mt-2.5">{[oferta.texto_parcelamento, economia > 0 ? `economize ${moeda(economia)}` : ''].filter(Boolean).join(' · ')}{oferta.texto_pix && <span className="block">{oferta.texto_pix}</span>}</p></div>
      <div className="mt-auto space-y-2.5 pt-1.5"><AcaoCampanha item={item} combo={combo} campanha={campanha}/><LinkLoja link={oferta.link_produto}/></div>
    </div>
  </article>;
}

export function CampanhaModal({ item, oferta, opcoes, campanha, upsells, onClose }: { item: CampanhaItem; oferta: Oferta; opcoes: OpcaoCombo[]; campanha: string; upsells: ItemExtra[]; onClose: () => void }) {
  const [selecionado, setSelecionado] = useState(comboDestaque(opcoes)?.id ?? '');
  const combo = opcoes.find(c => c.id === selecionado) ?? comboDestaque(opcoes);
  if (!combo) return null;
  return <Dialog open onOpenChange={v => !v && onClose()}><DialogContent className="w-[calc(100%-1rem)] max-w-5xl max-h-[94dvh] overflow-y-auto grid-cols-[minmax(0,1fr)] p-0 border-[hsl(var(--oferta-borda))] bg-[hsl(var(--oferta-modal))] text-[hsl(var(--oferta-texto))]"><DialogTitle className="sr-only">{oferta.titulo}</DialogTitle><div className="grid min-w-0 md:grid-cols-2"><GaleriaCampanha oferta={oferta} detalhe/><div className="p-4 md:p-6 space-y-5 min-w-0">
    {item.categoria_linha && <p className="text-[11px] uppercase tracking-widest text-[hsl(var(--oferta-muted))] pr-6">{item.categoria_linha}</p>}
    <h2 className="text-2xl md:text-3xl font-bold pr-6 break-words">{item.titulo_curto?.trim() || item.titulo}</h2>
    {oferta.bordao_modal && <p className="border-l-2 border-accent pl-3 font-semibold">{oferta.bordao_modal}</p>}
    {limparDescricao(oferta.descricao) && <p className="text-sm leading-relaxed whitespace-pre-line text-[hsl(var(--oferta-detalhe))]">{limparDescricao(oferta.descricao)}</p>}
    <section className="space-y-3"><h3 className="text-base font-bold">Escolha seu combo</h3><RadioGroup value={combo.id} onValueChange={setSelecionado} className="gap-2">{opcoes.map(c => { const { valorDe } = valoresCombo(item, c); return <Label key={c.id} htmlFor={`combo-${c.id}`} className={`block rounded-lg border-2 p-3 cursor-pointer min-w-0 bg-[hsl(var(--campanha-barra))] ${c.id === combo.id ? 'border-accent' : 'border-[hsl(var(--oferta-borda))]'}`}><div className="flex items-start gap-2"><RadioGroupItem id={`combo-${c.id}`} value={c.id} aria-label={c.nome} className="mt-0.5 shrink-0 border-[hsl(var(--oferta-muted))] text-accent"/><div className="flex-1 min-w-0 space-y-1.5"><p className="font-bold text-sm break-words">{c.nome}</p>{c.descricao_curta && <p className="text-xs text-[hsl(var(--oferta-muted))] truncate">{c.descricao_curta}</p>}<div className="flex flex-wrap items-baseline gap-2"><strong className="text-lg whitespace-nowrap">{moeda(c.preco)}</strong>{valorDe > c.preco && <span className="text-xs line-through text-[hsl(var(--oferta-suporte))]">de {moeda(valorDe)}</span>}</div>{c.brindes.length > 0 && <div className="flex flex-wrap gap-2 items-center"><MiniaturasBrindes brindes={c.brindes}/><p className="text-xs min-w-0 flex-1 basis-24 break-words text-[hsl(var(--oferta-detalhe))]">{c.brindes.map(e => e.nome).join(' + ')}</p><strong className="text-xs text-[hsl(var(--campanha-economia))]">grátis</strong></div>}</div></div></Label>; })}</RadioGroup></section>
    <div className="space-y-3">{oferta.texto_parcelamento && <p className="text-xs text-[hsl(var(--oferta-muted))]">{oferta.texto_parcelamento}</p>}{oferta.texto_pix && <p className="text-xs text-[hsl(var(--oferta-muted))]">{oferta.texto_pix}</p>}<AcaoCampanha item={item} combo={combo} campanha={campanha}/><LinkLoja link={oferta.link_produto}/></div>
    <CampanhaExtrasPublicos brindes={[]} upsells={upsells} produto={item.titulo}/>
  </div></div></DialogContent></Dialog>;
}
