// Página de vendas da Push Dagger SLS para disparo no WhatsApp.
// Preços, brindes e ficha técnica vêm ao vivo da campanha "push-dagger-sls" (admin de campanhas).
import { useEffect, useMemo, useRef, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { ArrowDown, ArrowRight, Check, Gift, Loader2, Plus, ShieldCheck, X, Layers, Link2, EyeOff } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { useCampanhaOferta } from '@/hooks/useCampanhaOferta';
import { type CampanhaItem, moeda, ofertaDoItem } from '@/lib/campanhas';
import { type OpcaoCombo, comboDestaque, mensagemCombo, opcoesCombos, valoresCombo } from '@/lib/campanhaCombos';
import { conteudoDoItem, fichaDaCampanha, nomesDistintos } from '@/lib/campanhaConteudo';
import { fonteVideo } from '@/lib/pushDaggerLanding';
import { type ConteudoSls, type VideoPagina, type BlocoSls, PADRAO_SLS, SLUG_PAGINA_SLS, mesclarConteudoSls, preencher, PAGAMENTO_SLS, pilaresSls, imagemDaPagina } from '@/lib/paginaSls';
import { type Extra, nomeCurtoExtra } from '@/lib/campanhaExtras';
import { type Oferta, midiasDaOferta } from '@/components/ofertas/OfertaVisual';
import { GaleriaCampanha, MiniaturasBrindes, WhatsAppIcon, wa } from '@/components/ofertas/CampanhaVisual';
import { FichaComparativa, TituloSecao } from '@/components/ofertas/CampanhaLanding';
import { cn } from '@/lib/utils';
import { SlsVideoTeste } from '@/components/ofertas/SlsVideoTeste';
import kaowzLogo from '@/assets/kaowz-logo.png';
import imgAcetinada from '@/assets/sls/push-dagger-acetinada-thumb.webp';
import imgStoneWashed from '@/assets/sls/push-dagger-stone-washed-thumb.webp';
import imgTactical from '@/assets/sls/push-dagger-tactical-thumb.webp';

const SLUG = 'push-dagger-sls';
const LINK_CONFIGURADOR = '/push-dagger-kaowz';

const BORDA = 'border-[hsl(var(--oferta-borda))]';
const APOIO = 'text-[hsl(var(--oferta-detalhe))]';
const MUTED = 'text-[hsl(var(--oferta-muted))]';
const BOTAO = 'h-12 rounded-full px-8 text-base font-semibold active:scale-[0.97] transition-transform duration-150';
const BOTAO_WHATS = cn(BOTAO, 'gap-2 bg-[hsl(var(--oferta-whatsapp))] text-[hsl(var(--oferta-texto))] hover:bg-[hsl(var(--oferta-whatsapp)/0.85)]');

/** Pede ao CDN da Shopify uma versão menor da foto; outras URLs passam direto. */
const naLargura = (url: string, w: number) => url.includes('cdn.shopify.com') ? `${url}${url.includes('?') ? '&' : '?'}width=${w}` : url;

const irPara = (id: string) => document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' });

/** Foto da faca acima dos brindes no hero ("a faca + os brindes"); sem moldura, do tamanho da tela. */
function FotoHero({ imagem, carregando }: { imagem: string | null; carregando: boolean }) {
  if (carregando && !imagem) return <div aria-hidden className="mx-auto aspect-[2/3] h-[46vh] max-w-full animate-pulse rounded-lg bg-[hsl(var(--oferta-superficie))]"/>;
  if (!imagem) return null;
  return <img
    src={naLargura(imagem, 800)}
    srcSet={[400, 800, 1200].map(w => `${naLargura(imagem, w)} ${w}w`).join(', ')}
    sizes="(min-width: 768px) 420px, 100vw"
    alt="Push Dagger SLS"
    className="mx-auto block max-h-[46vh] w-auto max-w-full rounded-lg object-contain md:max-h-[440px]"
  />;
}

function Secao({ id, children, className }: { id?: string; children: React.ReactNode; className?: string }) {
  return <section id={id} className={cn('scroll-mt-14 border-t', BORDA)}>
    <div className={cn('mx-auto max-w-6xl px-4 py-14 md:py-20', className)}>{children}</div>
  </section>;
}

function BarraPrazo({ brindesAte }: { brindesAte: number }) {
  return <div className="sticky top-0 z-40 border-b border-accent/30 bg-[hsl(var(--oferta-preto))] px-4 py-2.5 text-center text-xs sm:text-sm">
    {brindesAte > 0 && <><Gift className="mr-1.5 inline h-3.5 w-3.5 -translate-y-px text-accent"/>Até {moeda(brindesAte)} em brindes · </>}Produção em até 15 dias úteis
  </div>;
}

function Video({ v, topo }: { v: VideoPagina; topo?: boolean }) {
  const f = fonteVideo(v.url);
  if (f.tipo === 'instagram') return <iframe src={f.embed} title={v.legenda || 'Vídeo Kaowz'} loading={topo ? 'eager' : 'lazy'} allow="autoplay; encrypted-media" className="h-full w-full border-0 bg-[hsl(var(--oferta-superficie))]"/>;
  return <video src={f.url} autoPlay={topo} muted={topo} loop={topo} playsInline controls={!topo} preload={topo ? 'auto' : 'metadata'} className="h-full w-full object-cover"/>;
}

function Videos({ titulo, videos }: { titulo: string; videos: VideoPagina[] }) {
  return <Secao>
    <TituloSecao>{titulo}</TituloSecao>
    <ul className="-mx-4 flex snap-x snap-mandatory gap-3 overflow-x-auto px-4 pb-2 md:mx-0 md:grid md:grid-cols-3 md:overflow-visible md:px-0">
      {videos.map((v, i) => <li key={`${i}-${v.url}`} className="w-[70%] shrink-0 snap-start md:w-auto">
        <div className="aspect-[9/16] overflow-hidden rounded-lg"><Video v={v}/></div>
        {v.legenda && <p className={cn('mt-2 text-sm', APOIO)}>{v.legenda}</p>}
      </li>)}
    </ul>
  </Secao>;
}

interface HeroProps { c: ConteudoSls; video: VideoPagina | null; carregando: boolean; imagem: string | null; aPartirDe: number | null; parcelamento: string | null; brindesAte: number; brindes: Extra[] }
function Hero({ c, video, carregando, imagem, aPartirDe, parcelamento, brindesAte, brindes }: HeroProps) {
  return <section className="mx-auto grid max-w-6xl items-center gap-8 px-4 pt-6 pb-12 md:grid-cols-[1.1fr_1fr] md:gap-x-14 md:gap-y-0 md:pt-14 md:pb-20">
    <div className="order-1 min-w-0 md:col-start-1 md:row-start-1">
      <img src={kaowzLogo} alt="Kaowz" className="mb-8 h-7 w-auto opacity-90"/>
      <h1 className="font-bebas text-6xl leading-[0.9] tracking-wide md:text-8xl">
        {c.heroTitulo} <span className="text-primary">{c.prazoSls} dias úteis.</span>
      </h1>
    </div>
    {video ? <div className="order-2 mx-auto aspect-[9/16] max-h-[46vh] w-full max-w-sm overflow-hidden rounded-lg md:col-start-2 md:row-start-1 md:row-span-2 md:max-h-[640px]"><Video v={video} topo/></div> : (carregando || imagem) && <div className="order-2 mx-auto w-full max-w-sm md:col-start-2 md:row-start-1 md:row-span-2 md:max-w-none">
      {imagem ? <img
        src={naLargura(imagem, 800)}
        srcSet={[400, 800, 1200].map(w => `${naLargura(imagem, w)} ${w}w`).join(', ')}
        sizes="(min-width: 768px) 50vw, 100vw"
        alt="Push Dagger SLS"
        className="mx-auto block max-h-[46vh] w-auto max-w-full rounded-lg object-contain md:max-h-[640px]"
        fetchPriority="high"
      /> : <div aria-hidden className="aspect-square w-full animate-pulse rounded-lg bg-[hsl(var(--oferta-superficie))]"/>}
    </div>}
    <div className="order-3 min-w-0 md:col-start-1 md:row-start-2">
      <p className={cn('max-w-lg text-lg leading-snug md:mt-5 md:text-xl', APOIO)}>
        {preencher(c.heroTexto, c, parcelamento)}
      </p>
      {brindes.length > 0 ? <div className="mt-6 border-l-2 border-accent pl-4">
        <FotoHero imagem={imagem} carregando={carregando}/>
        {imagem && <Plus className="mt-2 h-4 w-4 text-accent" aria-hidden/>}
        <MiniaturasBrindes brindes={brindes} variante="cartao"/>
        <p className="mt-3 text-2xl font-bold leading-tight md:text-3xl">Até {moeda(brindesAte)} em brindes</p>
        <p className={cn('mt-2 text-sm', APOIO)}>Cinto tático, multitool e case Patola, conforme o tamanho</p>
      </div> : (imagem || carregando) && <div className="mt-6"><FotoHero imagem={imagem} carregando={carregando}/></div>}
      {carregando && <div aria-hidden className="mt-6 h-9 w-56 animate-pulse rounded bg-[hsl(var(--oferta-superficie))]"/>}
      {aPartirDe != null && <p className={cn('mt-6 text-sm', MUTED)}>
        a partir de <strong className="text-3xl font-black tabular-nums text-[hsl(var(--oferta-texto))]">{moeda(aPartirDe)}</strong>
        <span className="ml-2">· em até 10x sem juros</span>
      </p>}
      <div className="mt-6 flex flex-col gap-3 sm:flex-row">
        {c.blocos.some(b => b.tipo === 'oferta') && <Button size="lg" onClick={() => irPara('oferta')} className={BOTAO}>Quero a minha SLS<ArrowDown className="ml-2 h-4 w-4"/></Button>}
        <Button asChild size="lg" variant="outline" className={cn(BOTAO, BORDA, 'bg-transparent text-[hsl(var(--oferta-texto))] hover:bg-[hsl(var(--oferta-superficie))] hover:text-[hsl(var(--oferta-texto))]')}>
          <Link to={LINK_CONFIGURADOR}>Montar do meu jeito</Link>
        </Button>
      </div>
      <p className={cn('mt-4 flex items-center gap-2 text-xs', MUTED)}><ShieldCheck className="h-4 w-4 shrink-0"/>Garantia vitalícia de qualidade e afiação</p>
    </div>
  </section>;
}

function Dor({ c }: { c: ConteudoSls }) {
  if (!c.dorTitulo && !c.dorParagrafos.length) return null;
  return <Secao className="max-w-3xl">
    <h2 className="font-bebas text-4xl leading-none tracking-wide md:text-5xl">{c.dorTitulo}</h2>
    <div className={cn('mt-5 space-y-4 text-base leading-relaxed md:text-lg', APOIO)}>
      {c.dorParagrafos.map((t, i) => <p key={i} className={i === c.dorParagrafos.length - 1 ? 'text-[hsl(var(--oferta-texto))]' : undefined}>{preencher(t, c)}</p>)}
    </div>
  </Secao>;
}

function Mecanismo({ pilares, prazo }: { pilares: { titulo: string; texto: string }[]; prazo: number }) {
  return <Secao>
    <TituloSecao apoio="Não simplificamos o produto para reduzir o prazo. Evoluímos o processo.">Como chegamos a {prazo} dias úteis</TituloSecao>
    <ol className="grid gap-x-10 gap-y-8 sm:grid-cols-2">
      {pilares.map((p, i) => <li key={p.titulo} className="min-w-0 border-l-2 border-accent pl-4">
        <span className={cn('text-xs tabular-nums', MUTED)}>{String(i + 1).padStart(2, '0')}</span>
        <h3 className="mt-1 font-bebas text-2xl leading-tight tracking-wide break-words">{p.titulo}</h3>
        <p className={cn('mt-1.5 text-sm leading-relaxed', APOIO)}>{p.texto}</p>
      </li>)}
    </ol>
  </Secao>;
}

function Porte({ imagem }: { imagem: string | null }) {
  return <Secao id="porte"><div className="grid items-center gap-8 md:grid-cols-2 md:gap-14">
    <div className="min-w-0"><h2 className="font-bebas text-4xl leading-none tracking-wide md:text-5xl">Pronta para o porte desde o primeiro dia</h2>
      <p className={cn('mt-5 text-lg leading-relaxed', APOIO)}>Bainha em Kydex para porte velado e clipe em aço inox temperado inclusos. Abriu a caixa, está pronta para o dia a dia.</p>
      <ul className="mt-6 space-y-3">{[{ Icon: Layers, texto: 'Bainha Kydex' }, { Icon: Link2, texto: 'Clipe inox temperado' }, { Icon: EyeOff, texto: 'Porte velado discreto' }].map(({ Icon, texto }) => <li key={texto} className="flex items-center gap-3"><Icon className="h-5 w-5 shrink-0 text-accent"/>{texto}</li>)}</ul>
    </div>
    {imagem ? <img src={imagem} alt="Bainha em Kydex com clipe em aço inox temperado" loading="lazy" className="mx-auto aspect-[4/5] w-full max-w-md rounded-lg object-contain"/> : <div className={cn('mx-auto flex aspect-[4/5] w-full max-w-md items-center justify-center rounded-lg border border-dashed px-6 text-center text-sm', BORDA, MUTED)}>Foto da bainha com clipe em breve</div>}
  </div></Secao>;
}

function Teste({ url, ofertaDisponivel }: { url: string; ofertaDisponivel: boolean }) {
  return <Secao id="video-teste"><div className="grid items-center gap-8 md:grid-cols-[380px_1fr] md:gap-14">
    <SlsVideoTeste key={url} url={url}/>
    <div className="min-w-0">
      <h2 className="font-bebas text-4xl leading-none tracking-wide md:text-5xl">Não é só tecnologia. É resistência.</h2>
      <p className={cn('mt-5 text-lg leading-relaxed', APOIO)}>Teste real com a Push Dagger SLS.</p>
      <ul className="mt-6 space-y-3">{['Teste em chapa de aço', 'Teste em boneco de impacto', 'Empunhadura SLS firme na mão'].map(texto => <li key={texto} className="flex items-center gap-3"><Check className="h-5 w-5 shrink-0 text-[hsl(var(--campanha-economia))]"/>{texto}</li>)}</ul>
      {ofertaDisponivel && <Button size="lg" onClick={() => irPara('oferta')} className={cn(BOTAO, 'mt-8 w-full sm:w-auto')}>Quero a minha SLS<ArrowDown className="ml-2 h-4 w-4"/></Button>}
    </div>
  </div></Secao>;
}

function DestaqueBrindes({ brindes }: { brindes: Extra[] }) {
  if (!brindes.length) return null;
  const total = brindes.reduce((t, b) => t + (b.preco ?? 0), 0);
  return <div className="mt-5 rounded-lg border border-accent/50 bg-accent/5 p-4">
    <h3 className="flex items-center gap-2 text-lg font-bold"><Gift className="h-5 w-5 shrink-0 text-accent"/>{total > 0 ? `Você ganha ${moeda(total)} em brindes` : 'Você ganha estes brindes'}</h3>
    <ul className="mt-4 grid grid-cols-3 gap-3">{brindes.map(b => <li key={b.id} className="flex min-w-0 flex-col items-center gap-2 text-center"><MiniaturasBrindes brindes={[b]} variante="cartao"/><span className={cn('text-xs leading-snug', APOIO)}>{nomeCurtoExtra(b)}</span></li>)}</ul>
    <p className="mt-4 text-sm">{total > 0 && <span className={cn('mr-2 tabular-nums line-through', MUTED)}>{moeda(total)}</span>}<strong className="text-[hsl(var(--campanha-economia))]">grátis</strong></p>
  </div>;
}

interface ItemPagina { item: CampanhaItem; oferta: Oferta; combo: OpcaoCombo; inclusos: string[] }

interface OfertaProps { itens: ItemPagina[]; nomes: Record<string, string>; campanha: string; parcelamento: string | null; origem: string }
function Oferta({ itens, nomes, campanha, parcelamento, origem }: OfertaProps) {
  const [escolhido, setId] = useState(itens[itens.length - 1].item.id);
  // Se a campanha for editada e o item sumir, volta para o último (maior) tamanho.
  const id = itens.some(i => i.item.id === escolhido) ? escolhido : itens[itens.length - 1].item.id;
  const atual = itens.find(i => i.item.id === id) ?? itens[0];
  const { valorDe, economia } = valoresCombo(atual.item, atual.combo);
  const parcelas = PAGAMENTO_SLS.maxParcelasSemJuros;
  const tamanhos = useRef<(HTMLButtonElement | null)[]>([]);
  const setas = (e: React.KeyboardEvent, i: number) => {
    const passo = e.key === 'ArrowRight' || e.key === 'ArrowDown' ? 1 : e.key === 'ArrowLeft' || e.key === 'ArrowUp' ? -1 : 0;
    if (!passo) return;
    e.preventDefault();
    const j = (i + passo + itens.length) % itens.length;
    setId(itens[j].item.id);
    tamanhos.current[j]?.focus();
  };
  const mensagem = `${mensagemCombo(atual.item.titulo, atual.combo, campanha)} [${origem}]`;
  return <Secao id="oferta">
    <TituloSecao apoio="Escolha o tamanho e veja tudo o que vai na caixa.">Tudo o que você leva</TituloSecao>
    <div className="grid gap-8 md:grid-cols-2 md:gap-14">
      <div className="min-w-0 overflow-hidden rounded-lg">
        <GaleriaCampanha key={atual.item.id} oferta={atual.oferta} detalhe/>
      </div>
      <div className="min-w-0">
        <div role="radiogroup" aria-label="Tamanho" className="grid grid-cols-[repeat(auto-fit,minmax(0,1fr))] gap-2">
          {itens.map((i, n) => <Button variant="outline" key={i.item.id} ref={el => { tamanhos.current[n] = el; }} type="button" role="radio" aria-checked={i.item.id === id} tabIndex={i.item.id === id ? 0 : -1} onKeyDown={e => setas(e, n)} onClick={() => setId(i.item.id)} className={cn('h-12 rounded-lg border-2 font-bebas text-xl tracking-wide transition-colors duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring', i.item.id === id ? 'border-accent bg-accent/10' : cn(BORDA, 'bg-[hsl(var(--campanha-barra))]'))}>{nomes[i.item.id]}</Button>)}
        </div>

        <DestaqueBrindes brindes={atual.combo.brindes}/>

        <ul className={cn('mt-6 divide-y border-y text-sm', BORDA, '[&>li]:border-[hsl(var(--oferta-borda))]')}>
          <li className="flex items-center justify-between gap-3 py-3">
            <span className="flex items-center gap-2 font-semibold"><Check className="h-4 w-4 shrink-0 text-[hsl(var(--campanha-economia))]"/>{atual.item.titulo}</span>
            <span className="shrink-0 tabular-nums">{moeda(atual.item.valor_de ?? atual.item.valor ?? 0)}</span>
          </li>
          {atual.inclusos.map(t => <li key={t} className="flex items-center justify-between gap-3 py-3">
            <span className="flex items-center gap-2"><Check className="h-4 w-4 shrink-0 text-[hsl(var(--campanha-economia))]"/>{t}</span>
            <span className={cn('shrink-0', MUTED)}>incluso</span>
          </li>)}
          {atual.combo.brindes.map(b => <li key={b.id} className="flex items-center justify-between gap-3 py-3">
            <span className="flex min-w-0 items-center gap-2"><MiniaturasBrindes brindes={[b]} variante="pequeno"/><span className="min-w-0 break-words">{b.nome}</span></span>
            <span className="shrink-0 text-right text-xs">
              {b.preco ? <span className="mr-1.5 tabular-nums line-through text-[hsl(var(--oferta-suporte))]">{moeda(b.preco)}</span> : null}
              <strong className="text-[hsl(var(--campanha-economia))]">grátis</strong>
            </span>
          </li>)}
        </ul>

        <div className="mt-6">
          {valorDe > atual.combo.preco && <p className={cn('text-sm', MUTED)}>Valor de tudo isso: <span className="tabular-nums line-through">{moeda(valorDe)}</span></p>}
          <p className="mt-1 text-sm">Hoje você leva por</p>
          <strong className="block text-5xl font-black tabular-nums leading-tight">{moeda(atual.combo.preco)}</strong>
          <p className={cn('mt-1 text-sm', MUTED)}>
            {parcelas > 0 ? <>ou {parcelas}x de <span className="tabular-nums">{moeda(atual.combo.preco / Number(parcelas))}</span> sem juros</> : parcelamento}
            {economia > 0 && <span className="block text-[hsl(var(--campanha-economia))]">Você economiza {moeda(economia)}</span>}
          </p>
          <Button asChild size="lg" className={cn(BOTAO_WHATS, 'mt-6 w-full')}>
            <a href={wa(mensagem)} target="_blank" rel="noopener noreferrer"><WhatsAppIcon/>Garantir minha SLS {nomes[atual.item.id]}</a>
          </Button>
          <p className={cn('mt-3 text-center text-xs', MUTED)}>Você fala direto com a equipe Kaowz. PIX ou cartão em até 10x sem juros.</p>
        </div>
      </div>
    </div>
  </Secao>;
}

function ParaQuem({ c }: { c: ConteudoSls }) {
  const sim = c.paraQuemSim.map(t => preencher(t, c));
  const nao = c.paraQuemNao.map(t => preencher(t, c));
  if (!sim.length && !nao.length) return null;
  return <Secao>
    <div className="grid gap-10 md:grid-cols-2 md:gap-16">
      <div>
        <h2 className="font-bebas text-4xl leading-none tracking-wide">A SLS é para você se</h2>
        <ul className="mt-5 space-y-3">{sim.map(t => <li key={t} className={cn('flex gap-3', APOIO)}><Check className="mt-0.5 h-5 w-5 shrink-0 text-[hsl(var(--campanha-economia))]"/>{t}</li>)}</ul>
      </div>
      <div>
        <h2 className="font-bebas text-4xl leading-none tracking-wide">Não é para você se</h2>
        <ul className="mt-5 space-y-3">{nao.map(t => <li key={t} className={cn('flex gap-3', APOIO)}><X className={cn('mt-0.5 h-5 w-5 shrink-0', MUTED)}/>{t}</li>)}</ul>
        <p className={cn('mt-5 text-sm', MUTED)}>Nesse caso, a próxima seção é para você.</p>
      </div>
    </div>
  </Secao>;
}

function Customizar({ c }: { c: ConteudoSls }) {
  const fotos = [{ src: imagemDaPagina(c, 'acetinada', imgAcetinada), nome: 'Acetinada' }, { src: imagemDaPagina(c, 'stoneWashed', imgStoneWashed), nome: 'Stone Washed' }, { src: imagemDaPagina(c, 'tactical', imgTactical), nome: 'Tactical' }].filter(f => f.src);
  return <Secao id="customizar">
    <div className="grid items-center gap-8 md:grid-cols-2 md:gap-14">
      <div className="min-w-0">
        <h2 className="font-bebas text-5xl leading-none tracking-wide md:text-6xl">{c.customizarTitulo}</h2>
        <p className={cn('mt-4 text-lg leading-snug', APOIO)}>{preencher(c.customizarTexto, c)}</p>
        <Button asChild size="lg" className={cn(BOTAO, 'mt-6 w-full sm:w-auto')}>
          <Link to={LINK_CONFIGURADOR}>Montar minha Push Dagger<ArrowRight className="ml-2 h-4 w-4"/></Link>
        </Button>
      </div>
      {fotos.length > 0 && <ul className="grid grid-cols-3 gap-2">
        {fotos.map(f => <li key={f.nome} className="min-w-0">
          <img src={f.src ?? undefined} alt={`Push Dagger ${f.nome}`} loading="lazy" className="aspect-[3/4] w-full rounded-lg object-contain"/>
          <p className={cn('mt-2 text-center text-xs', MUTED)}>{f.nome}</p>
        </li>)}
      </ul>}
    </div>
  </Secao>;
}

function Garantia({ c }: { c: ConteudoSls }) {
  return <Secao className="flex max-w-2xl flex-col items-center text-center">
    <ShieldCheck className="h-10 w-10 text-accent"/>
    <h2 className="mt-4 font-bebas text-5xl leading-none tracking-wide md:text-6xl">{c.garantiaTitulo}</h2>
    <p className={cn('mt-4 text-base leading-relaxed', APOIO)}>{preencher(c.garantiaTexto, c)}</p>
  </Secao>;
}

function Perguntas({ c, prazo, parcelamento }: { c: ConteudoSls; prazo: string | null; parcelamento: string | null }) {
  const lista = c.perguntas.map(q => ({ p: q.p, r: preencher(q.r, c, parcelamento) }));
  void prazo;
  if (!lista.length) return null;
  return <Secao className="max-w-3xl">
    <TituloSecao>Perguntas frequentes</TituloSecao>
    <Accordion type="single" collapsible>
      {lista.map(q => <AccordionItem key={q.p} value={q.p} className={BORDA}>
        <AccordionTrigger className="min-h-11 text-left text-base hover:no-underline">{q.p}</AccordionTrigger>
        <AccordionContent className={cn('text-sm leading-relaxed', APOIO)}>{q.r}</AccordionContent>
      </AccordionItem>)}
    </Accordion>
  </Secao>;
}

function Fechamento({ c, origem }: { c: ConteudoSls; origem: string }) {
  return <Secao className="flex max-w-2xl flex-col items-center text-center">
    <h2 className="font-bebas text-5xl leading-none tracking-wide md:text-6xl">Sua SLS em até 15 dias úteis.</h2>
    <p className={cn('mt-4 text-base', APOIO)}>Os brindes valem enquanto a campanha estiver no ar.</p>
    <div className="mt-8 flex w-full flex-col gap-3 sm:w-auto sm:flex-row">
      {c.blocos.some(b => b.tipo === 'oferta') && <Button size="lg" onClick={() => irPara('oferta')} className={BOTAO}>Escolher meu tamanho</Button>}
      <Button asChild size="lg" className={BOTAO_WHATS}>
        <a href={wa(`Olá! Tenho uma dúvida sobre a Push Dagger SLS [${origem}]`)} target="_blank" rel="noopener noreferrer"><WhatsAppIcon/>Tirar dúvida</a>
      </Button>
    </div>
    {c.ps && <p className={cn('mt-12 max-w-xl text-left text-sm leading-relaxed', APOIO)}>
      <strong className="text-[hsl(var(--oferta-texto))]">P.S.</strong> {preencher(c.ps, c)}
    </p>}
  </Secao>;
}

function BarraFixa({ visivel, aPartirDe }: { visivel: boolean; aPartirDe: number | null }) {
  return <div aria-hidden={!visivel} className={cn('fixed inset-x-0 bottom-0 z-40 border-t bg-[hsl(var(--oferta-preto)/0.95)] px-4 pt-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] md:hidden transition-[transform,opacity] duration-300 [transition-timing-function:cubic-bezier(0.23,1,0.32,1)] motion-reduce:transition-opacity', BORDA, visivel ? 'translate-y-0 opacity-100' : 'pointer-events-none translate-y-full opacity-0')}>
    <div className="flex items-center justify-between gap-3">
      {aPartirDe != null && <p className={cn('text-xs', MUTED)}>a partir de<strong className="block text-lg font-black tabular-nums text-[hsl(var(--oferta-texto))]">{moeda(aPartirDe)}</strong></p>}
      <Button tabIndex={visivel ? 0 : -1} onClick={() => irPara('oferta')} className="h-11 flex-1 rounded-full font-semibold active:scale-[0.97] transition-transform duration-150">Quero a minha SLS</Button>
    </div>
  </div>;
}

export default function PushDaggerSlsVendas() {
  const { campanha, ofertas, extras, combos, loading, erro } = useCampanhaOferta(SLUG, { aoVivo: false });
  const [params] = useSearchParams();
  const origem = params.get('utm_source') ?? params.get('origem') ?? 'página SLS';

  const [c, setC] = useState<ConteudoSls>(PADRAO_SLS);
  useEffect(() => {
    void supabase.from('paginas_venda_config').select('conteudo').eq('slug', SLUG_PAGINA_SLS).maybeSingle()
      .then(({ data }) => { if (data) setC(mesclarConteudoSls(data.conteudo)); });
  }, []);
  useEffect(() => {
    const anterior = document.title;
    document.title = 'Push Dagger SLS | Produção em 15 dias úteis | Kaowz';
    return () => { document.title = anterior; };
  }, []);

  const pagina = useMemo(() => {
    if (!campanha || !ofertas.length) return null;
    const itens = ofertas.flatMap(item => {
      const oferta = ofertaDoItem(item, campanha);
      const combo = comboDestaque(opcoesCombos(item, combos, extras));
      // Item sem preço cadastrado não entra na oferta (evita "R$ 0,00").
      return combo && combo.preco > 0 ? [{ item, oferta, combo, conteudo: conteudoDoItem(item.descricao) }] : [];
    });
    if (!itens.length) return null;
    const nomes = nomesDistintos(ofertas);
    return {
      itens: itens.map(i => ({ ...i, inclusos: [...new Set([...i.conteudo.inclusos, ...c.inclusosExtras])] })),
      nomes,
      ficha: fichaDaCampanha(itens.map(i => ({ id: i.item.id, specs: i.conteudo.specs }))),
      pilares: pilaresSls((itens.find(i => i.conteudo.pilares.length) ?? itens[0]).conteudo.pilares),
      aPartirDe: Math.min(...itens.map(i => i.combo.preco)),
      brindesAte: Math.max(0, ...itens.map(i => i.combo.brindes.reduce((t, e) => t + (e.preco ?? 0), 0))),
      brindes: [...itens].sort((a, b) => b.combo.brindes.reduce((t, e) => t + (e.preco ?? 0), 0) - a.combo.brindes.reduce((t, e) => t + (e.preco ?? 0), 0))[0].combo.brindes,
      imagem: midiasDaOferta(itens[itens.length - 1].oferta).find(m => m.tipo === 'imagem')?.url ?? null,
      inclusos: [...new Set([...itens.flatMap(i => i.conteudo.inclusos), ...c.inclusosExtras])],
    };
  }, [campanha, ofertas, combos, extras, c.inclusosExtras]);

  // Barra fixa no celular: aparece depois do topo e some quando a oferta está na tela.
  const heroRef = useRef<HTMLDivElement>(null);
  const [heroVisivel, setHeroVisivel] = useState(true);
  const [ofertaVisivel, setOfertaVisivel] = useState(false);
  useEffect(() => {
    const oferta = document.getElementById('oferta');
    if (!pagina || !heroRef.current || !oferta) return;
    const obs = new IntersectionObserver(es => es.forEach(e => {
      if (e.target === heroRef.current) setHeroVisivel(e.isIntersecting);
      else setOfertaVisivel(e.isIntersecting);
    }), { threshold: 0.1 });
    obs.observe(heroRef.current); obs.observe(oferta);
    return () => obs.disconnect();
  }, [pagina, c.blocos]);

  function renderBloco(b: BlocoSls) {
    if (b.tipo === 'hero') return <div ref={heroRef}><Hero c={c} video={c.videos[0] ?? null} carregando={loading} imagem={imagemDaPagina(c, 'hero', pagina?.imagem ?? null)} aPartirDe={pagina?.aPartirDe ?? null} parcelamento="em até 10x sem juros" brindesAte={pagina?.brindesAte ?? 0} brindes={pagina?.brindes ?? []}/></div>;
    if (!campanha || !pagina) return null;
    switch (b.tipo) {
      case 'videos': return c.videos.length > 1 ? <Videos titulo={c.videosTitulo} videos={c.videos.slice(1)}/> : null;
      case 'dor': return <Dor c={c}/>;
      case 'mecanismo': return <>{pagina.pilares.length > 0 && <Mecanismo pilares={pagina.pilares} prazo={c.prazoSls}/>} {campanha.video_teste_url?.trim() && <Teste url={campanha.video_teste_url.trim()} ofertaDisponivel={c.blocos.some(bloco => bloco.tipo === 'oferta')}/>}</>;
      case 'porte': return <Porte imagem={imagemDaPagina(c, 'porte', campanha.imagem_porte_url)}/>;
      case 'oferta': return <Oferta itens={pagina.itens} nomes={pagina.nomes} campanha={campanha.titulo} parcelamento="em até 10x sem juros" origem={origem}/>;
      case 'ficha': return <FichaComparativa ficha={pagina.ficha} nomes={pagina.itens.map(i => ({ id: i.item.id, nome: pagina.nomes[i.item.id] }))} inclusos={pagina.inclusos}/>;
      case 'paraQuem': return <ParaQuem c={c}/>;
      case 'customizar': return <Customizar c={c}/>;
      case 'garantia': return <Garantia c={c}/>;
      case 'perguntas': return <Perguntas c={c} prazo={null} parcelamento="em até 10x sem juros"/>;
      case 'fechamento': return <Fechamento c={c} origem={origem}/>;
      case 'livre': return <Secao id={`bloco-${b.id}`}><div className={cn('grid items-center gap-8', b.imagem && 'md:grid-cols-2')}><div className="min-w-0">{b.titulo && <TituloSecao>{preencher(b.titulo, c)}</TituloSecao>}{b.texto && <p className={cn('whitespace-pre-line break-words text-base leading-relaxed', APOIO)}>{preencher(b.texto, c)}</p>}</div>{b.imagem && <img src={b.imagem} alt={b.titulo || 'Push Dagger SLS'} loading="lazy" className="mx-auto max-h-[600px] w-full rounded-lg object-contain"/>}</div></Secao>;
    }
  }

  return <div className="oferta-publica min-h-dvh overflow-x-clip bg-[hsl(var(--oferta-fundo))] text-[hsl(var(--oferta-texto))]">
    {!loading && (erro || !campanha || !pagina) ? <div className="flex min-h-dvh flex-col items-center justify-center gap-4 px-4 text-center">
        <p>{erro ? 'Não foi possível carregar a oferta. Verifique sua conexão.' : 'Esta oferta não está mais disponível.'}</p>
        <div className="flex flex-col gap-3 sm:flex-row">
          {erro && <Button onClick={() => window.location.reload()}>Tentar novamente</Button>}
          <Button asChild variant={erro ? 'outline' : 'default'}><Link to={LINK_CONFIGURADOR}>Montar minha Push Dagger</Link></Button>
        </div>
      </div>
    : <>
      <BarraPrazo brindesAte={pagina?.brindesAte ?? 0}/>
      {c.blocos.map(b => <div key={b.id} data-bloco-sls={b.tipo}>{renderBloco(b)}</div>)}
      {loading || !campanha || !pagina ? <div className={cn('flex justify-center py-16', MUTED)}><Loader2 className="h-5 w-5 animate-spin" aria-label="Carregando oferta"/></div> : <>
      <div className="h-20 md:hidden" aria-hidden/>
      {c.blocos.some(b => b.tipo === 'oferta') && <BarraFixa visivel={(!c.blocos.some(b => b.tipo === 'hero') || !heroVisivel) && !ofertaVisivel} aPartirDe={pagina.aPartirDe}/>}
      </>}
    </>}
  </div>;
}
