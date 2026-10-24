// Página de vendas da Push Dagger SLS para disparo no WhatsApp.
// Preços, brindes e ficha técnica vêm ao vivo da campanha "push-dagger-sls" (admin de campanhas).
import { useEffect, useMemo, useRef, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { ArrowDown, ArrowRight, Check, Clock, Loader2, ShieldCheck, X } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { useCampanhaOferta } from '@/hooks/useCampanhaOferta';
import { type CampanhaItem, moeda, ofertaDoItem } from '@/lib/campanhas';
import { type OpcaoCombo, comboDestaque, mensagemCombo, opcoesCombos, valoresCombo } from '@/lib/campanhaCombos';
import { conteudoDoItem, fichaDaCampanha, nomesDistintos } from '@/lib/campanhaConteudo';
import { dataPorExtenso, prontaAte } from '@/lib/pushDaggerLanding';
import { type Oferta, midiasDaOferta } from '@/components/ofertas/OfertaVisual';
import { GaleriaCampanha, MiniaturasBrindes, WhatsAppIcon, wa } from '@/components/ofertas/CampanhaVisual';
import { FichaComparativa, TituloSecao } from '@/components/ofertas/CampanhaLanding';
import { cn } from '@/lib/utils';
import kaowzLogo from '@/assets/kaowz-logo.png';
import imgAcetinada from '@/assets/sls/push-dagger-acetinada-thumb.webp';
import imgStoneWashed from '@/assets/sls/push-dagger-stone-washed-thumb.webp';
import imgTactical from '@/assets/sls/push-dagger-tactical-thumb.webp';

const SLUG = 'push-dagger-sls';
const PRAZO_SLS = 15;
const PRAZO_SOB_ENCOMENDA = 65;
const LINK_CONFIGURADOR = '/push-dagger-kaowz';

const BORDA = 'border-[hsl(var(--oferta-borda))]';
const APOIO = 'text-[hsl(var(--oferta-detalhe))]';
const MUTED = 'text-[hsl(var(--oferta-muted))]';
const BOTAO = 'h-12 rounded-full px-8 text-base font-semibold active:scale-[0.97] transition-transform duration-150';
const BOTAO_WHATS = cn(BOTAO, 'gap-2 bg-[hsl(var(--oferta-whatsapp))] text-[hsl(var(--oferta-texto))] hover:bg-[hsl(var(--oferta-whatsapp)/0.85)]');

/** Pede ao CDN da Shopify uma versão menor da foto; outras URLs passam direto. */
const naLargura = (url: string, w: number) => url.includes('cdn.shopify.com') ? `${url}${url.includes('?') ? '&' : '?'}width=${w}` : url;

const irPara = (id: string) => document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' });

function Secao({ id, children, className }: { id?: string; children: React.ReactNode; className?: string }) {
  return <section id={id} className={cn('scroll-mt-14 border-t', BORDA)}>
    <div className={cn('mx-auto max-w-6xl px-4 py-14 md:py-20', className)}>{children}</div>
  </section>;
}

function BarraPrazo({ dataPronta }: { dataPronta: string }) {
  return <div className="sticky top-0 z-40 border-b border-accent/30 bg-[hsl(var(--oferta-preto))] px-4 py-2.5 text-center text-xs sm:text-sm">
    <Clock className="mr-1.5 inline h-3.5 w-3.5 -translate-y-px text-accent"/>
    Feche hoje e sua SLS fica pronta até <strong className="text-accent">{dataPronta}</strong>
  </div>;
}

interface HeroProps { carregando: boolean; imagem: string | null; aPartirDe: number | null; parcelamento: string | null; brindesAte: number }
function Hero({ carregando, imagem, aPartirDe, parcelamento, brindesAte }: HeroProps) {
  return <section className="mx-auto grid max-w-6xl items-center gap-8 px-4 pt-6 pb-12 md:grid-cols-[1.1fr_1fr] md:gap-14 md:pt-14 md:pb-20">
    <div className="min-w-0">
      <img src={kaowzLogo} alt="Kaowz" className="mb-8 h-7 w-auto opacity-90"/>
      <h1 className="font-bebas text-6xl leading-[0.9] tracking-wide md:text-8xl">
        A Push Dagger que fica pronta em <span className="text-primary">{PRAZO_SLS} dias úteis.</span>
      </h1>
      <p className={cn('mt-5 max-w-lg text-lg leading-snug md:text-xl', APOIO)}>
        Lâmina em aço sueco usinada em CNC, empunhadura em Nylon 12 sinterizada a laser
        {brindesAte > 0 && <> e <strong className="text-[hsl(var(--oferta-texto))]">até {moeda(brindesAte)} em brindes</strong></>}.
        Sem esperar {PRAZO_SOB_ENCOMENDA} dias úteis.
      </p>
      {carregando && <div aria-hidden className="mt-6 h-9 w-56 animate-pulse rounded bg-[hsl(var(--oferta-superficie))]"/>}
      {aPartirDe != null && <p className={cn('mt-6 text-sm', MUTED)}>
        a partir de <strong className="text-3xl font-black tabular-nums text-[hsl(var(--oferta-texto))]">{moeda(aPartirDe)}</strong>
        {parcelamento && <span className="ml-2">{parcelamento}</span>}
      </p>}
      <div className="mt-6 flex flex-col gap-3 sm:flex-row">
        <Button size="lg" onClick={() => irPara('oferta')} className={BOTAO}>Quero a minha SLS<ArrowDown className="ml-2 h-4 w-4"/></Button>
        <Button asChild size="lg" variant="outline" className={cn(BOTAO, BORDA, 'bg-transparent text-[hsl(var(--oferta-texto))] hover:bg-[hsl(var(--oferta-superficie))] hover:text-[hsl(var(--oferta-texto))]')}>
          <Link to={LINK_CONFIGURADOR}>Montar do meu jeito</Link>
        </Button>
      </div>
      <p className={cn('mt-4 flex items-center gap-2 text-xs', MUTED)}><ShieldCheck className="h-4 w-4 shrink-0"/>Garantia vitalícia de qualidade e afiação</p>
    </div>
    {(carregando || imagem) && <div className={cn('aspect-square overflow-hidden rounded-lg', imagem ? 'bg-[hsl(var(--campanha-selo-fundo))]' : 'animate-pulse bg-[hsl(var(--oferta-superficie))]')}>
      {imagem && <img
        src={naLargura(imagem, 800)}
        srcSet={[400, 800, 1200].map(w => `${naLargura(imagem, w)} ${w}w`).join(', ')}
        sizes="(min-width: 768px) 50vw, 100vw"
        width={800}
        height={800}
        alt="Push Dagger SLS"
        className="h-full w-full object-contain p-4"
        fetchPriority="high"
      />}
    </div>}
  </section>;
}

function Dor() {
  return <Secao className="max-w-3xl">
    <h2 className="font-bebas text-4xl leading-none tracking-wide md:text-5xl">Uma lâmina feita à mão leva tempo.</h2>
    <div className={cn('mt-5 space-y-4 text-base leading-relaxed md:text-lg', APOIO)}>
      <p>Toda Kaowz sob encomenda passa por tratamento térmico, lixamento manual e montagem peça por peça. São <strong className="text-[hsl(var(--oferta-texto))]">{PRAZO_SOB_ENCOMENDA} dias úteis</strong> entre o pedido e a bancada de envio.</p>
      <p>Para quem precisa da lâmina agora, são três meses de espera.</p>
      <p className="text-[hsl(var(--oferta-texto))]">A série SLS foi criada para resolver exatamente isso.</p>
    </div>
  </Secao>;
}

function Mecanismo({ pilares }: { pilares: { titulo: string; texto: string }[] }) {
  return <Secao>
    <TituloSecao apoio="Não simplificamos o produto para reduzir o prazo. Evoluímos o processo.">Como chegamos a {PRAZO_SLS} dias úteis</TituloSecao>
    <ol className="grid gap-x-10 gap-y-8 sm:grid-cols-2">
      {pilares.map((p, i) => <li key={p.titulo} className="min-w-0 border-l-2 border-accent pl-4">
        <span className={cn('text-xs tabular-nums', MUTED)}>{String(i + 1).padStart(2, '0')}</span>
        <h3 className="mt-1 font-bebas text-2xl leading-tight tracking-wide break-words">{p.titulo}</h3>
        <p className={cn('mt-1.5 text-sm leading-relaxed', APOIO)}>{p.texto}</p>
      </li>)}
    </ol>
  </Secao>;
}

interface ItemPagina { item: CampanhaItem; oferta: Oferta; combo: OpcaoCombo; inclusos: string[] }

interface OfertaProps { itens: ItemPagina[]; nomes: Record<string, string>; campanha: string; parcelamento: string | null; origem: string }
function Oferta({ itens, nomes, campanha, parcelamento, origem }: OfertaProps) {
  const [escolhido, setId] = useState(itens[itens.length - 1].item.id);
  // Se a campanha for editada e o item sumir, volta para o último (maior) tamanho.
  const id = itens.some(i => i.item.id === escolhido) ? escolhido : itens[itens.length - 1].item.id;
  const atual = itens.find(i => i.item.id === id) ?? itens[0];
  const { valorDe, economia } = valoresCombo(atual.item, atual.combo);
  const parcelas = /sem juros/i.test(parcelamento ?? '') ? Number(parcelamento?.match(/(\d+)\s*x/i)?.[1] ?? 0) : 0;
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
          {itens.map((i, n) => <button key={i.item.id} ref={el => { tamanhos.current[n] = el; }} type="button" role="radio" aria-checked={i.item.id === id} tabIndex={i.item.id === id ? 0 : -1} onKeyDown={e => setas(e, n)} onClick={() => setId(i.item.id)} className={cn('h-12 rounded-lg border-2 font-bebas text-xl tracking-wide transition-colors duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring', i.item.id === id ? 'border-accent bg-accent/10' : cn(BORDA, 'bg-[hsl(var(--campanha-barra))]'))}>{nomes[i.item.id]}</button>)}
        </div>

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
          <p className={cn('mt-3 text-center text-xs', MUTED)}>Você fala direto com a equipe Kaowz. PIX, cartão ou Pix parcelado.</p>
        </div>
      </div>
    </div>
  </Secao>;
}

function ParaQuem() {
  const sim = ['Quer uma lâmina compacta para porte velado no dia a dia', `Não quer esperar ${PRAZO_SOB_ENCOMENDA} dias úteis por uma peça Kaowz`, 'Valoriza aço Sandvik 14C28N com 60 HRC e acabamento Stone Washed'];
  const nao = ['Quer escolher aço, acabamento e cor da empunhadura', 'Procura uma faca de cozinha ou de campo'];
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

function Customizar() {
  const fotos = [{ src: imgAcetinada, nome: 'Acetinada' }, { src: imgStoneWashed, nome: 'Stone Washed' }, { src: imgTactical, nome: 'Tactical' }];
  return <Secao id="customizar">
    <div className="grid items-center gap-8 md:grid-cols-2 md:gap-14">
      <div className="min-w-0">
        <h2 className="font-bebas text-5xl leading-none tracking-wide md:text-6xl">Prefere uma Push Dagger com a sua cara?</h2>
        <p className={cn('mt-4 text-lg leading-snug', APOIO)}>No configurador você escolhe tamanho, aço, acabamento, empunhadura e bainha, e vê o preço mudar na hora. Quando terminar, envia a montagem direto para o nosso WhatsApp.</p>
        <Button asChild size="lg" className={cn(BOTAO, 'mt-6 w-full sm:w-auto')}>
          <Link to={LINK_CONFIGURADOR}>Montar minha Push Dagger<ArrowRight className="ml-2 h-4 w-4"/></Link>
        </Button>
      </div>
      <ul className="grid grid-cols-3 gap-2">
        {fotos.map(f => <li key={f.nome} className="min-w-0">
          <img src={f.src} alt={`Push Dagger ${f.nome}`} loading="lazy" className="aspect-[3/4] w-full rounded-lg object-cover"/>
          <p className={cn('mt-2 text-center text-xs', MUTED)}>{f.nome}</p>
        </li>)}
      </ul>
    </div>
  </Secao>;
}

function Garantia() {
  return <Secao className="flex max-w-2xl flex-col items-center text-center">
    <ShieldCheck className="h-10 w-10 text-accent"/>
    <h2 className="mt-4 font-bebas text-5xl leading-none tracking-wide md:text-6xl">Garantia vitalícia</h2>
    <p className={cn('mt-4 text-base leading-relaxed', APOIO)}>Garantia vitalícia de qualidade e manutenção de afiação, como em todas as lâminas Kaowz. Você compra uma vez.</p>
  </Secao>;
}

function Perguntas({ prazo, parcelamento }: { prazo: string | null; parcelamento: string | null }) {
  const lista = [
    { p: 'Como faço o pedido?', r: 'Toque no botão verde, escolha o tamanho e a mensagem já vai pronta para o nosso WhatsApp. A equipe confirma os dados de entrega e envia o link de pagamento.' },
    { p: 'Quando ela fica pronta?', r: `${prazo?.replace(/[.\s]+$/, '') || `Em até ${PRAZO_SLS} dias úteis`}, contados a partir da confirmação do pedido. Depois vem o envio pelos Correios, com código de rastreio.` },
    { p: 'Quais as formas de pagamento?', r: `PIX, cartão de crédito${parcelamento ? ` (${parcelamento})` : ''} ou Pix parcelado.` },
    { p: 'Qual tamanho eu escolho?', r: 'A Micro some no bolso, a Compact é o equilíbrio para o dia a dia e a Standard tem a maior pegada e lâmina. Compare as medidas na tabela acima ou pergunte no WhatsApp.' },
    { p: 'Os brindes valem para todos os tamanhos?', r: 'Sim, cada tamanho tem o seu pacote de brindes, mostrado na seção "Tudo o que você leva". Eles valem enquanto a campanha estiver no ar.' },
    { p: 'Posso mudar a cor ou o acabamento da SLS?', r: 'A SLS tem configuração fixa, é isso que permite o prazo curto. Para escolher cada detalhe, use o configurador.' },
  ];
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

function Fechamento({ dataPronta, origem }: { dataPronta: string; origem: string }) {
  return <Secao className="flex max-w-2xl flex-col items-center text-center">
    <h2 className="font-bebas text-5xl leading-none tracking-wide md:text-6xl">Pronta até {dataPronta}.</h2>
    <p className={cn('mt-4 text-base', APOIO)}>Se fechar hoje, essa é a data. Cada dia que passa, ela anda junto.</p>
    <div className="mt-8 flex w-full flex-col gap-3 sm:w-auto sm:flex-row">
      <Button size="lg" onClick={() => irPara('oferta')} className={BOTAO}>Escolher meu tamanho</Button>
      <Button asChild size="lg" className={BOTAO_WHATS}>
        <a href={wa(`Olá! Tenho uma dúvida sobre a Push Dagger SLS [${origem}]`)} target="_blank" rel="noopener noreferrer"><WhatsAppIcon/>Tirar dúvida</a>
      </Button>
    </div>
    <p className={cn('mt-12 max-w-xl text-left text-sm leading-relaxed', APOIO)}>
      <strong className="text-[hsl(var(--oferta-texto))]">P.S.</strong> Pela primeira vez na história da Kaowz uma Push Dagger sai da bancada em {PRAZO_SLS} dias úteis, com os brindes desta campanha. Quando a campanha sair do ar, os brindes saem junto.
    </p>
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

  const [feriados, setFeriados] = useState<Set<string>>(new Set());
  useEffect(() => {
    document.title = 'Push Dagger SLS | Pronta em 15 dias úteis | Kaowz';
    void supabase.from('feriados').select('data').then(({ data }) => {
      if (data?.length) setFeriados(new Set(data.map(f => f.data as string)));
    });
  }, []);
  const dataPronta = useMemo(() => dataPorExtenso(prontaAte(PRAZO_SLS, feriados)), [feriados]);

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
      itens: itens.map(i => ({ ...i, inclusos: i.conteudo.inclusos })),
      nomes,
      ficha: fichaDaCampanha(itens.map(i => ({ id: i.item.id, specs: i.conteudo.specs }))),
      pilares: (itens.find(i => i.conteudo.pilares.length) ?? itens[0]).conteudo.pilares,
      aPartirDe: Math.min(...itens.map(i => i.combo.preco)),
      brindesAte: Math.max(0, ...itens.map(i => i.combo.brindes.reduce((t, e) => t + (e.preco ?? 0), 0))),
      imagem: midiasDaOferta(itens[itens.length - 1].oferta).find(m => m.tipo === 'imagem')?.url ?? null,
      inclusos: [...new Set(itens.flatMap(i => i.conteudo.inclusos))],
    };
  }, [campanha, ofertas, combos, extras]);

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
  }, [pagina]);

  return <div className="oferta-publica min-h-dvh overflow-x-clip bg-[hsl(var(--oferta-fundo))] text-[hsl(var(--oferta-texto))]">
    {!loading && (erro || !campanha || !pagina) ? <div className="flex min-h-dvh flex-col items-center justify-center gap-4 px-4 text-center">
        <p>{erro ? 'Não foi possível carregar a oferta. Verifique sua conexão.' : 'Esta oferta não está mais disponível.'}</p>
        <div className="flex flex-col gap-3 sm:flex-row">
          {erro && <Button onClick={() => window.location.reload()}>Tentar novamente</Button>}
          <Button asChild variant={erro ? 'outline' : 'default'}><Link to={LINK_CONFIGURADOR}>Montar minha Push Dagger</Link></Button>
        </div>
      </div>
    : <>
      <BarraPrazo dataPronta={dataPronta}/>
      <div ref={heroRef}>
        <Hero carregando={loading} imagem={pagina?.imagem ?? null} aPartirDe={pagina?.aPartirDe ?? null} parcelamento={campanha?.texto_parcelamento_padrao ?? null} brindesAte={pagina?.brindesAte ?? 0}/>
      </div>
      {loading || !campanha || !pagina ? <div className={cn('flex justify-center py-16', MUTED)}><Loader2 className="h-5 w-5 animate-spin" aria-label="Carregando oferta"/></div> : <>
      <Dor/>
      {pagina.pilares.length > 0 && <Mecanismo pilares={pagina.pilares}/>}
      <Oferta itens={pagina.itens} nomes={pagina.nomes} campanha={campanha.titulo} parcelamento={campanha.texto_parcelamento_padrao} origem={origem}/>
      <FichaComparativa ficha={pagina.ficha} nomes={pagina.itens.map(i => ({ id: i.item.id, nome: pagina.nomes[i.item.id] }))} inclusos={pagina.inclusos}/>
      <ParaQuem/>
      <Customizar/>
      <Garantia/>
      <Perguntas prazo={campanha.aviso_prazo} parcelamento={campanha.texto_parcelamento_padrao}/>
      <Fechamento dataPronta={dataPronta} origem={origem}/>
      <div className="h-20 md:hidden" aria-hidden/>
      <BarraFixa visivel={!heroVisivel && !ofertaVisivel} aPartirDe={pagina.aPartirDe}/>
      </>}
    </>}
  </div>;
}
