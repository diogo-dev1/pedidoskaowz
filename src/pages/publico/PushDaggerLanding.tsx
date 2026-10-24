import { useEffect, useMemo, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, CalendarCheck, Check, Volume2, VolumeX } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { WhatsAppIcon } from '@/components/ofertas/CampanhaVisual';
import { moeda } from '@/lib/campanhas';
import { cn } from '@/lib/utils';
import {
  GUIA_TAMANHO, INCLUSOS, LINK_CONFIGURADOR, LINK_SLS, PERGUNTAS, PRAZO_PUSH_DAGGER, PRAZO_SOB_ENCOMENDA, VIDEOS,
  dataPorExtenso, fonteVideo, precosMetalica, prontaAte,
} from '@/lib/pushDaggerLanding';
import { DEFAULT_CONFIG, SIZE_LIST, loadKitConfig, type KitConfig } from '@/pages/ConfiguradorKit';
import kaowzLogo from '@/assets/kaowz-logo.png';
import imgTactical from '@/assets/push-dagger-tactical.jpeg';

const BORDA = 'border-[hsl(var(--oferta-borda))]';
const TEXTO_APOIO = 'text-[hsl(var(--oferta-detalhe))]';
const TEXTO_MUTED = 'text-[hsl(var(--oferta-muted))]';
const BOTAO = 'h-12 w-full rounded-full px-8 text-base font-semibold active:scale-[0.97] transition-transform duration-150 sm:w-auto';
const BOTAO_CONTORNO = cn(BOTAO, BORDA, 'bg-transparent text-[hsl(var(--oferta-texto))] hover:bg-[hsl(var(--oferta-superficie))] hover:text-[hsl(var(--oferta-texto))]');

const linkWhatsApp = (telefone: string, msg: string) => `https://wa.me/${telefone}?text=${encodeURIComponent(msg)}`;

function Secao({ titulo, children, className }: { titulo?: string; children: React.ReactNode; className?: string }) {
  return (
    <section className={cn('border-t', BORDA)}>
      <div className={cn('mx-auto max-w-xl px-4 py-12 md:max-w-5xl md:py-16', className)}>
        {titulo && <h2 className="mb-6 font-bebas text-4xl leading-none tracking-wide md:text-5xl">{titulo}</h2>}
        {children}
      </div>
    </section>
  );
}

/** Vídeo em loop e mudo, como no Reels. Um toque liga o som. Link do Instagram vira o embed oficial. */
function Video({ url, poster, className, prioridade = false }: { url: string; poster?: string; className?: string; prioridade?: boolean }) {
  const ref = useRef<HTMLVideoElement>(null);
  const [mudo, setMudo] = useState(true);
  const fonte = fonteVideo(url);

  if (fonte.tipo === 'instagram') {
    return (
      <div className={cn('overflow-hidden bg-[hsl(var(--oferta-texto))]', className)}>
        <iframe src={fonte.embed} title="Vídeo da Push Dagger no Instagram" loading={prioridade ? 'eager' : 'lazy'} className="h-full w-full border-0" allowFullScreen />
      </div>
    );
  }

  const alternarSom = () => {
    if (!ref.current) return;
    ref.current.muted = !mudo;
    setMudo(!mudo);
  };

  return (
    <div className={cn('relative overflow-hidden bg-[hsl(var(--oferta-modal))]', className)}>
      <video
        ref={ref}
        src={url}
        poster={poster}
        autoPlay
        muted
        loop
        playsInline
        preload={prioridade ? 'auto' : 'metadata'}
        className="h-full w-full object-cover"
      />
      <button
        type="button"
        onClick={alternarSom}
        aria-label={mudo ? 'Ligar o som' : 'Desligar o som'}
        className="absolute bottom-3 right-3 flex h-11 w-11 items-center justify-center rounded-full bg-[hsl(var(--oferta-preto)/0.6)] text-[hsl(var(--oferta-texto))] active:scale-[0.94] transition-transform duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
      >
        {mudo ? <VolumeX className="h-5 w-5" /> : <Volume2 className="h-5 w-5" />}
      </button>
    </div>
  );
}

function Hero({ aPartirDe, dataPronta }: { aPartirDe: number | null; dataPronta: string }) {
  const [abertura] = VIDEOS;
  const midia = 'aspect-square w-full rounded-lg md:aspect-[9/16] md:max-h-[80dvh]';
  return (
    <section className="mx-auto grid max-w-xl gap-6 px-4 pb-12 md:max-w-5xl md:grid-cols-[1fr_auto] md:items-center md:gap-14 md:pb-16">
      <div className="order-2 min-w-0 md:order-1">
        <h1 className="font-bebas text-6xl leading-[0.9] tracking-wide md:text-8xl">
          Pronta em <span className="text-primary">{PRAZO_PUSH_DAGGER} dias úteis.</span>
        </h1>
        <p className={cn('mt-4 text-lg leading-snug', TEXTO_APOIO)}>
          Push Dagger Kaowz feita à mão, do seu jeito. Fecha a mão e a lâmina está firme, alinhada ao punho.
        </p>
        <p className={cn('mt-5 text-sm', TEXTO_MUTED)}>
          a partir de{' '}
          <strong className="text-3xl font-black tabular-nums text-[hsl(var(--oferta-texto))]">{aPartirDe != null ? moeda(aPartirDe) : '—'}</strong>
        </p>
        <Button asChild size="lg" className={cn(BOTAO, 'mt-5')}>
          <Link to={LINK_CONFIGURADOR}>Montar minha Push Dagger<ArrowRight className="ml-2 h-4 w-4" /></Link>
        </Button>
        <p className={cn('mt-4 flex items-start gap-2 text-sm', TEXTO_APOIO)}>
          <CalendarCheck className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
          <span>Confirmando hoje, fica pronta até <strong className="text-[hsl(var(--oferta-texto))]">{dataPorExtenso(dataPronta)}</strong>.</span>
        </p>
      </div>
      <div className="order-1 md:order-2 md:w-[min(26rem,40vw)]">
        {abertura
          ? <Video url={abertura.url} poster={imgTactical} prioridade className={midia} />
          : <img src={imgTactical} alt="Push Dagger Kaowz com acabamento Tactical" fetchPriority="high" className={cn(midia, 'object-cover object-[center_55%]')} />}
      </div>
    </section>
  );
}

/** Carrossel de vídeos curtos: no celular desliza com o dedo, um por vez. */
function VejaNaMao() {
  const outros = VIDEOS.slice(1);
  if (!outros.length) return null;
  return (
    <Secao titulo="Veja na mão" className="md:max-w-6xl">
      <ul className="-mx-4 flex snap-x snap-mandatory gap-3 overflow-x-auto px-4 pb-2 [scrollbar-width:none] md:mx-0 md:grid md:grid-cols-3 md:overflow-visible md:px-0">
        {outros.map((v) => (
          <li key={v.url} className="w-[78%] shrink-0 snap-center md:w-auto">
            <Video url={v.url} className="aspect-[9/16] w-full rounded-lg" />
            {v.legenda && <p className={cn('mt-2 text-sm', TEXTO_APOIO)}>{v.legenda}</p>}
          </li>
        ))}
      </ul>
    </Secao>
  );
}

function Tamanhos({ precos }: { precos: Record<string, number> | null }) {
  return (
    <Secao titulo="Escolha o tamanho">
      <ul className={cn('divide-y border-y', BORDA, 'divide-[hsl(var(--oferta-borda))]')}>
        {SIZE_LIST.map((t) => (
          <li key={t.key}>
            <Link
              to={LINK_CONFIGURADOR}
              className="flex min-h-16 items-center gap-4 py-4 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring [@media(hover:hover)]:hover:bg-[hsl(var(--oferta-superficie)/0.5)]"
            >
              <div className="min-w-0 flex-1">
                <h3 className="font-bebas text-3xl leading-none tracking-wide">{t.name}</h3>
                <p className={cn('mt-1 text-sm', TEXTO_APOIO)}>{GUIA_TAMANHO[t.key]}</p>
              </div>
              <p className={cn('text-right text-xs', TEXTO_MUTED)}>
                a partir de
                <strong className="block text-lg font-black tabular-nums text-[hsl(var(--oferta-texto))]">{precos ? moeda(precos[t.key]) : '—'}</strong>
              </p>
              <ArrowRight className="h-4 w-4 shrink-0 text-primary" />
            </Link>
          </li>
        ))}
      </ul>
      <ul className="mt-6 grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
        {INCLUSOS.map((t) => (
          <li key={t} className="flex items-start gap-2"><Check className="mt-0.5 h-4 w-4 shrink-0 text-[hsl(var(--campanha-economia))]" />{t}</li>
        ))}
      </ul>
    </Secao>
  );
}

/** Atalho para quem não quer configurar: a linha SLS, com o mesmo prazo. */
function AtalhoSLS() {
  return (
    <Secao>
      <div className={cn('rounded-lg border p-5', BORDA)}>
        <h2 className="font-bebas text-3xl leading-none tracking-wide">Quer decidir em um clique?</h2>
        <p className={cn('mt-2 text-sm', TEXTO_APOIO)}>
          A linha SLS tem configurações prontas para escolher pelo tamanho. Mesmo prazo de {PRAZO_PUSH_DAGGER} dias úteis — os demais modelos Kaowz levam {PRAZO_SOB_ENCOMENDA}.
        </p>
        <Button asChild size="lg" variant="outline" className={cn(BOTAO_CONTORNO, 'mt-5')}>
          <Link to={LINK_SLS}>Ver linha SLS<ArrowRight className="ml-2 h-4 w-4" /></Link>
        </Button>
      </div>
    </Secao>
  );
}

function Perguntas({ telefone }: { telefone: string }) {
  return (
    <Secao titulo="Dúvidas">
      <Accordion type="single" collapsible className={cn('border-t', BORDA)}>
        {PERGUNTAS.map((p) => (
          <AccordionItem key={p.pergunta} value={p.pergunta} className={BORDA}>
            <AccordionTrigger className="min-h-11 text-left text-base hover:no-underline">{p.pergunta}</AccordionTrigger>
            <AccordionContent className={cn('text-sm leading-relaxed', TEXTO_APOIO)}>{p.resposta}</AccordionContent>
          </AccordionItem>
        ))}
      </Accordion>
      <Button asChild size="lg" variant="outline" className={cn(BOTAO_CONTORNO, 'mt-6 gap-2')}>
        <a href={linkWhatsApp(telefone, 'Olá! Quero tirar uma dúvida sobre a Push Dagger.')} target="_blank" rel="noopener noreferrer">
          <WhatsAppIcon />Falar no WhatsApp
        </a>
      </Button>
      <p className={cn('mt-8 text-xs', TEXTO_MUTED)}>Venda exclusiva para maiores de 18 anos.</p>
    </Secao>
  );
}

function BarraFixa({ visivel, aPartirDe }: { visivel: boolean; aPartirDe: number | null }) {
  return (
    <div
      aria-hidden={!visivel}
      className={cn(
        'fixed inset-x-0 bottom-0 z-40 border-t bg-[hsl(var(--oferta-preto)/0.95)] px-4 pt-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] md:hidden',
        'transition-[transform,opacity] duration-300 [transition-timing-function:cubic-bezier(0.23,1,0.32,1)] motion-reduce:transition-opacity',
        BORDA,
        visivel ? 'translate-y-0 opacity-100' : 'pointer-events-none translate-y-full opacity-0',
      )}
    >
      <div className="flex items-center justify-between gap-3">
        <p className={cn('text-xs', TEXTO_MUTED)}>
          {PRAZO_PUSH_DAGGER} dias úteis · a partir de
          <strong className="block text-lg font-black tabular-nums text-[hsl(var(--oferta-texto))]">{aPartirDe != null ? moeda(aPartirDe) : '—'}</strong>
        </p>
        <Button asChild tabIndex={visivel ? 0 : -1} className="h-11 flex-1 rounded-full font-semibold active:scale-[0.97] transition-transform duration-150">
          <Link to={LINK_CONFIGURADOR}>Montar a minha</Link>
        </Button>
      </div>
    </div>
  );
}

export default function PushDaggerLanding() {
  const [config, setConfig] = useState<KitConfig | null>(null);
  const [feriados, setFeriados] = useState<Set<string>>(new Set());

  useEffect(() => {
    document.title = `Push Dagger Kaowz — pronta em ${PRAZO_PUSH_DAGGER} dias úteis`;
    void loadKitConfig().then(setConfig);
    void supabase.from('feriados').select('data').then(({ data }) => {
      if (data?.length) setFeriados(new Set(data.map((f) => f.data as string)));
    });
  }, []);

  const precos = useMemo(() => (config ? precosMetalica(config) : null), [config]);
  const aPartirDe = precos ? Math.min(...Object.values(precos)) : null;
  const dataPronta = useMemo(() => prontaAte(PRAZO_PUSH_DAGGER, feriados), [feriados]);
  const telefone = (config ?? DEFAULT_CONFIG).whatsappPhone;

  // Barra fixa no celular: aparece depois do hero e some quando a escolha de tamanho está na tela.
  const heroRef = useRef<HTMLDivElement>(null);
  const tamanhosRef = useRef<HTMLDivElement>(null);
  const [visiveis, setVisiveis] = useState<Set<Element>>(new Set());
  const [observado, setObservado] = useState(false);
  useEffect(() => {
    const alvos = [heroRef.current, tamanhosRef.current].filter(Boolean) as Element[];
    const obs = new IntersectionObserver((entradas) => {
      setObservado(true);
      setVisiveis((atual) => {
        const novo = new Set(atual);
        entradas.forEach((e) => (e.isIntersecting ? novo.add(e.target) : novo.delete(e.target)));
        return novo;
      });
    }, { threshold: 0.15 });
    alvos.forEach((a) => obs.observe(a));
    return () => obs.disconnect();
  }, []);

  return (
    <div className="oferta-publica min-h-dvh overflow-x-clip bg-[hsl(var(--oferta-fundo))] text-[hsl(var(--oferta-texto))]">
      <header className="mx-auto flex max-w-xl items-center px-4 py-4 md:max-w-5xl">
        <img src={kaowzLogo} alt="Kaowz" className="h-8 w-auto object-contain" />
      </header>

      <div ref={heroRef}><Hero aPartirDe={aPartirDe} dataPronta={dataPronta} /></div>
      <VejaNaMao />
      <div ref={tamanhosRef}><Tamanhos precos={precos} /></div>
      <AtalhoSLS />
      <Perguntas telefone={telefone} />

      <div className="h-20 md:hidden" aria-hidden />
      <BarraFixa visivel={observado && visiveis.size === 0} aPartirDe={aPartirDe} />
    </div>
  );
}
