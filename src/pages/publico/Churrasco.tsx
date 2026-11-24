import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { motion, useInView, useReducedMotion, useScroll, useTransform } from 'framer-motion';
import { PublicoLayout, TituloPublico } from '@/components/publico/PublicoLayout';
import { Button } from '@/components/ui/button';
import FamiliaCard from '@/components/churrasco/FamiliaCard';
import NarrativaChurrasco from '@/components/churrasco/NarrativaChurrasco';
import FotoChurrasco from '@/components/churrasco/FotoChurrasco';
import { supabase } from '@/integrations/supabase/client';
import { carregarModelosPublicos, linkWhatsApp } from '@/lib/publico';
import { agruparFamilias, brl, CHURRASCO, escolherHeroi, fotosDoModelo, menorPreco, pertenceChurrasco, type ModeloChurrasco } from '@/lib/churrascoLanding';
import './churrasco.css';

async function carregarLinha() {
  const modelos = (await carregarModelosPublicos()).filter(pertenceChurrasco);
  if (!modelos.length) return [];
  const { data, error } = await supabase.from('midias_catalogo').select('modelo_id, nome_arquivo, url').in('modelo_id', modelos.map(m => m.id)).eq('visivel_catalogo', true).order('created_at');
  if (error) throw error;
  return modelos.map(m => ({ ...m, fotos: fotosDoModelo(m, data || []) }));
}
function Abertura({ modelo, onUnavailable }: { modelo: ModeloChurrasco; onUnavailable: (id: string) => void }) {
  const ref = useRef<HTMLElement>(null);
  const reduzido = useReducedMotion();
  const { scrollYProgress } = useScroll({ target: ref, offset: ['start start', 'end start'] });
  const scale = useTransform(scrollYProgress, [0, 1], [1, 1.1]);
  return <section ref={ref} className="churrasco-hero">
    <motion.div className="absolute inset-0" style={reduzido ? undefined : { scale }}><FotoChurrasco fotos={modelo.fotos} alt={modelo.nome_modelo} primeiraDobra className="h-full w-full object-cover" onUnavailable={() => onUnavailable(modelo.id)} /></motion.div>
    <div className="churrasco-hero-shade absolute inset-0" />
    <a href="#escada" className="churrasco-top-link">Ver a linha</a>
    <div className="churrasco-cover-copy"><TituloPublico className="churrasco-manifesto">{CHURRASCO.manifesto}</TituloPublico><p>{CHURRASCO.subtitulo}</p><a href="#historia" aria-label="Conhecer a linha" className="churrasco-scroll-line" /></div>
  </section>;
}
function Metadados() {
  useEffect(() => {
    const tituloAnterior = document.title;
    document.title = CHURRASCO.titulo;
    const campos = [['name', 'description', CHURRASCO.descricao], ['property', 'og:title', CHURRASCO.titulo], ['property', 'og:description', CHURRASCO.descricao], ['property', 'og:type', 'website'], ['name', 'twitter:card', 'summary_large_image']];
    const restaurar = campos.map(([atributo, chave, valor]) => {
      const existente = document.head.querySelector<HTMLMetaElement>(`meta[${atributo}="${chave}"]`);
      const meta = existente || document.createElement('meta');
      const anterior = meta.getAttribute('content');
      meta.setAttribute(atributo, chave); meta.setAttribute('content', valor);
      if (!existente) document.head.appendChild(meta);
      return () => { if (!existente) meta.remove(); else if (anterior !== null) meta.setAttribute('content', anterior); else meta.removeAttribute('content'); };
    });
    return () => { document.title = tituloAnterior; restaurar.forEach(fn => fn()); };
  }, []);
  return null;
}
function Apresentacao({ modelos: originais }: { modelos: ModeloChurrasco[] }) {
  const [indisponiveis, setIndisponiveis] = useState<string[]>([]);
  const [peca, setPeca] = useState<ModeloChurrasco | null>(null);
  const modelos = useMemo(() => originais.filter(m => m.fotos.length && !indisponiveis.includes(m.id)), [originais, indisponiveis]);
  const familias = agruparFamilias(modelos);
  const capa = escolherHeroi(familias.find(f => f.id === 'picanheira')?.modelos || []) || modelos[0];
  const complementos = escolherHeroi(familias.find(f => f.id === 'complementos')?.modelos || []);
  const pater = escolherHeroi(familias.find(f => f.id === 'pater')?.modelos || []);
  const heroRef = useRef<HTMLDivElement>(null);
  const fimRef = useRef<HTMLElement>(null);
  const capaVisivel = useInView(heroRef);
  const fimVisivel = useInView(fimRef);
  const onUnavailable = useCallback((id: string) => setIndisponiveis(ids => ids.includes(id) ? ids : [...ids, id]), []);
  const onVisible = useCallback((m: ModeloChurrasco | null) => setPeca(m), []);
  useEffect(() => {
    let quadro = 0;
    const atualizar = () => {
      quadro = 0;
      let melhor: ModeloChurrasco | null = null;
      let area = 0;
      document.querySelectorAll<HTMLElement>('[data-visible-piece]').forEach(el => {
        const r = el.getBoundingClientRect();
        const intersecao = Math.max(0, Math.min(r.bottom, innerHeight - 90) - Math.max(r.top, 70));
        if (intersecao > area) { area = intersecao; melhor = modelos.find(m => m.id === el.dataset.visiblePiece) || null; }
      });
      setPeca(melhor);
    };
    const rolar = () => { if (!quadro) quadro = requestAnimationFrame(atualizar); };
    window.addEventListener('scroll', rolar, { passive: true });
    window.addEventListener('resize', rolar);
    atualizar();
    return () => { window.removeEventListener('scroll', rolar); window.removeEventListener('resize', rolar); cancelAnimationFrame(quadro); };
  }, [modelos]);
  if (!capa) return <EstadoVazio />;
  const preco = peca?.preco_base ?? menorPreco(modelos);
  const mensagem = peca ? CHURRASCO.mensagem + peca.nome_modelo : CHURRASCO.mensagemMesa;
  return <>
    <div ref={heroRef}><Abertura modelo={capa} onUnavailable={onUnavailable} /></div>
    <p className="churrasco-trust">{CHURRASCO.confianca}</p>
    <div id="historia"><NarrativaChurrasco familias={familias} onVisible={onVisible} onUnavailable={onUnavailable} /></div>
    <section id="escada" className="churrasco-ladder" aria-label="Escolha a sua peça">
      {CHURRASCO.degraus.map(d => {
        const grupos = agruparFamilias(modelos, d.id);
        if (!grupos.length) return null;
        return <div key={d.id}>
          {d.id === 'definitiva' && pater && <section className="churrasco-pater" aria-label="Kit Pater" data-visible-piece={pater.id}><FotoChurrasco fotos={pater.fotos} alt={pater.nome_modelo} className="h-full w-full object-cover" onUnavailable={() => onUnavailable(pater.id)} /><div className="churrasco-pater-shade" /><h2>{CHURRASCO.familias.find(f => f.id === 'pater')?.titulo}</h2></section>}
          <FamiliaCard familias={grupos} degrau={d} onVisible={onVisible} onUnavailable={onUnavailable} />
        </div>;
      })}
    </section>
    <section className="churrasco-steels"><h2>Escolha o seu aço.</h2><div className="churrasco-steels-list">
      {CHURRASCO.acos.map(aco => {
        const preco = menorPreco(agruparFamilias(modelos, aco.id).flatMap(f => f.modelos));
        return <div key={aco.id}><h3>{aco.nome}</h3><p>{aco.frase}</p>{preco !== null && <small>a partir de {brl(preco)}</small>}</div>;
      })}
    </div></section>
    <section ref={fimRef} className="churrasco-closing" id="fechamento">
      {(complementos || pater) && <div className="absolute inset-0"><FotoChurrasco fotos={(complementos || pater)?.fotos || []} alt={(complementos || pater)?.nome_modelo || 'Mesa Kaowz'} className="h-full w-full object-cover" onUnavailable={() => { const m = complementos || pater; if (m) onUnavailable(m.id); }} /></div>}
      <div className="churrasco-closing-shade" /><div className="churrasco-closing-copy"><h2>{CHURRASCO.fechamento}</h2><Button asChild className="churrasco-cta"><a href={linkWhatsApp(CHURRASCO.mensagemMesa)} target="_blank" rel="noopener noreferrer">Falar com um vendedor</a></Button><Link to="/vitrine">Ver todas as lâminas</Link></div>
    </section>
    {!capaVisivel && !fimVisivel && <aside className="churrasco-mobile-bar" aria-label="Falar sobre a peça"><div><p>{peca?.nome_modelo || 'Linha de churrasco'}</p>{preco !== null && <small>a partir de {brl(preco)}</small>}</div><Button asChild className="churrasco-cta"><a href={linkWhatsApp(mensagem)} target="_blank" rel="noopener noreferrer">Falar com um vendedor</a></Button></aside>}
  </>;
}
function EstadoVazio() {
  return <div className="churrasco-empty"><TituloPublico>Linha de churrasco Kaowz</TituloPublico><p>Nossas peças chegam por aqui em breve.</p><Link to="/vitrine">Ver todas as lâminas</Link></div>;
}
export default function Churrasco() {
  const { data: modelos = [], isPending, isError, refetch } = useQuery({ queryKey: ['churrasco-publico'], queryFn: carregarLinha, staleTime: 300000 });
  return <PublicoLayout mostrarSaida={false}><Metadados /><div className="churrasco-page">
    {isPending ? <div role="status" aria-label="Carregando linha de churrasco" className="churrasco-loading" /> : isError ? <div className="churrasco-empty"><p>Não conseguimos carregar a linha agora.</p><Button onClick={() => refetch()} className="churrasco-cta">Tentar novamente</Button><Link to="/vitrine">Ver todas as lâminas</Link></div> : <Apresentacao modelos={modelos} />}
  </div></PublicoLayout>;
}
