import { useEffect, useMemo, useRef, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { ofertaDoItem } from '@/lib/campanhas';
import { useCampanhaOferta } from '@/hooks/useCampanhaOferta';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Loader2, Search } from 'lucide-react';
import { extrasDoItem } from '@/lib/campanhaExtras';
import { comboDestaque, opcoesCombos } from '@/lib/campanhaCombos';
import { conteudoDoItem, fichaDaCampanha, medidaChave, nomesDistintos } from '@/lib/campanhaConteudo';
import { midiasDaOferta } from '@/components/ofertas/OfertaVisual';
import { CampanhaCard, CampanhaModal } from '@/components/ofertas/CampanhaVisual';
import { BarraFixaCampanha, FechamentoCampanha, FichaComparativa, HeroCampanha, PilaresCampanha, TituloSecao } from '@/components/ofertas/CampanhaLanding';

// Busca só aparece quando a campanha tem itens demais para ver de uma vez.
const LIMITE_BUSCA = 6;

export default function CampanhaOferta() {
  const { slug } = useParams();
  const { campanha, ofertas, extras, combos, loading, erro } = useCampanhaOferta(slug);
  const [busca, setBusca] = useState('');
  const [selecionadaId, setSelecionadaId] = useState<string | null>(null);
  useEffect(() => { setSelecionadaId(null); }, [slug]);
  useEffect(() => {
    if (loading) return;
    document.title = campanha ? `${campanha.titulo} | Kaowz` : 'Campanha indisponível | Kaowz';
    setSelecionadaId(prev => prev && ofertas.some(i => i.id === prev) ? prev : null);
  }, [loading, campanha, ofertas]);

  const pagina = useMemo(() => {
    if (!campanha || !ofertas.length) return null;
    const itens = ofertas.map(item => {
      const oferta = ofertaDoItem(item, campanha);
      const opcoes = opcoesCombos(item, combos, extras);
      return { item, oferta, opcoes, combo: comboDestaque(opcoes), conteudo: conteudoDoItem(item.descricao) };
    });
    const nomes = nomesDistintos(ofertas);
    const ficha = fichaDaCampanha(itens.map(i => ({ id: i.item.id, specs: i.conteudo.specs })));
    const medida = medidaChave(ficha.comparar);
    const base = itens.find(i => i.conteudo.pilares.length) ?? itens[0];
    const precos = itens.flatMap(i => i.combo ? [i.combo.preco] : []);
    const destaque = itens[itens.length - 1];
    return {
      itens, nomes, ficha, medida, base,
      aPartirDe: precos.length ? Math.min(...precos) : null,
      brindesAte: Math.max(0, ...itens.map(i => i.combo?.brindes.reduce((t, e) => t + (e.preco ?? 0), 0) ?? 0)),
      imagem: midiasDaOferta(destaque.oferta).find(m => m.tipo === 'imagem')?.url ?? null,
      inclusos: [...new Set(itens.flatMap(i => i.conteudo.inclusos))],
    };
  }, [campanha, ofertas, combos, extras]);

  // Barra fixa no celular: aparece depois do hero e some quando os modelos estão na tela.
  const heroRef = useRef<HTMLDivElement>(null);
  const modelosRef = useRef<HTMLElement>(null);
  const [heroVisivel, setHeroVisivel] = useState(true);
  const [modelosVisiveis, setModelosVisiveis] = useState(false);
  useEffect(() => {
    if (!pagina || !heroRef.current || !modelosRef.current) return;
    const obs = new IntersectionObserver(entradas => entradas.forEach(e => {
      if (e.target === heroRef.current) setHeroVisivel(e.isIntersecting);
      else setModelosVisiveis(e.isIntersecting);
    }), { threshold: 0.1 });
    obs.observe(heroRef.current); obs.observe(modelosRef.current);
    return () => obs.disconnect();
  }, [pagina]);

  const selecionada = pagina?.itens.find(i => i.item.id === selecionadaId);
  const termo = busca.trim().toLowerCase();
  const visiveis = pagina?.itens.filter(({ item }) => `${item.titulo} ${item.titulo_curto ?? ''}`.toLowerCase().includes(termo)) ?? [];

  return <div className="oferta-publica min-h-dvh overflow-x-clip bg-[hsl(var(--oferta-fundo))] text-[hsl(var(--oferta-texto))]">
    {loading ? <div className="flex min-h-dvh items-center justify-center gap-2 text-sm text-[hsl(var(--oferta-muted))]"><Loader2 className="h-4 w-4 animate-spin"/>Carregando campanha…</div>
    : erro ? <div className="flex min-h-dvh flex-col items-center justify-center gap-3 px-4 text-center"><p>Não foi possível carregar a campanha. Verifique sua conexão.</p><Button onClick={() => window.location.reload()}>Tentar novamente</Button></div>
    : !campanha ? <div className="flex min-h-dvh flex-col items-center justify-center gap-4 px-4 text-center"><p>Esta campanha não está disponível no momento.</p><Button asChild><Link to="/ofertas">Ver novidades e ofertas</Link></Button></div>
    : !pagina ? <div className="flex min-h-dvh flex-col items-center justify-center px-4 text-center"><h1 className="font-bebas text-5xl tracking-wide">{campanha.titulo}</h1><p className="mt-2 text-sm text-[hsl(var(--oferta-muted))]">Em breve, novos produtos nesta campanha.</p></div>
    : <>
      <div ref={heroRef}>
        <HeroCampanha
          titulo={campanha.titulo}
          chamada={pagina.base.conteudo.chamada ?? campanha.subtitulo}
          imagem={pagina.imagem}
          aPartirDe={pagina.aPartirDe}
          parcelamento={campanha.texto_parcelamento_padrao}
          prazo={campanha.aviso_prazo}
          brindesAte={pagina.brindesAte}
        />
      </div>

      <section id="modelos" ref={modelosRef} className="scroll-mt-4 border-t border-[hsl(var(--oferta-borda))]">
        <div className="mx-auto max-w-6xl px-4 py-14 md:py-20">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
            <TituloSecao apoio={pagina.brindesAte > 0 ? 'Todos saem com brindes inclusos.' : undefined}>Escolha seu tamanho</TituloSecao>
            {ofertas.length > LIMITE_BUSCA && <div className="relative mb-6 w-full sm:w-72 md:mb-8">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 opacity-40"/>
              <Input aria-label="Buscar modelo" placeholder="Buscar modelo..." value={busca} onChange={e => setBusca(e.target.value)} className="h-11 pl-9 text-base md:text-sm bg-[hsl(var(--oferta-texto)/0.05)] border-[hsl(var(--oferta-borda))] text-[hsl(var(--oferta-texto))] placeholder:text-[hsl(var(--oferta-texto)/0.4)]"/>
            </div>}
          </div>
          {visiveis.length ? <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 md:gap-6">
            {visiveis.map(({ item, oferta, opcoes }) => <CampanhaCard
              key={item.id}
              item={item}
              oferta={oferta}
              opcoes={opcoes}
              campanha={campanha.titulo}
              nome={pagina.nomes[item.id]}
              medida={pagina.medida?.valores[item.id]}
              onOpen={() => setSelecionadaId(item.id)}
            />)}
          </div> : <p className="py-10 text-center text-sm text-[hsl(var(--oferta-muted))]">Nenhum modelo encontrado para “{busca}”.</p>}
        </div>
      </section>

      <PilaresCampanha titulo={pagina.base.conteudo.manchete} pilares={pagina.base.conteudo.pilares}/>
      <FichaComparativa ficha={pagina.ficha} nomes={pagina.itens.map(i => ({ id: i.item.id, nome: pagina.nomes[i.item.id] }))} inclusos={pagina.inclusos}/>
      <FechamentoCampanha campanha={campanha.titulo}/>
      <div className="h-20 md:hidden" aria-hidden/>
      <BarraFixaCampanha visivel={!heroVisivel && !modelosVisiveis && !selecionada} aPartirDe={pagina.aPartirDe}/>
    </>}

    {selecionada && campanha && <CampanhaModal
      key={selecionada.item.id}
      item={selecionada.item}
      oferta={selecionada.oferta}
      opcoes={selecionada.opcoes}
      campanha={campanha.titulo}
      nome={pagina?.nomes[selecionada.item.id] ?? selecionada.item.titulo}
      conteudo={selecionada.conteudo}
      upsells={extrasDoItem(extras, selecionada.item.id, 'upsell')}
      onClose={() => setSelecionadaId(null)}
    />}
  </div>;
}
