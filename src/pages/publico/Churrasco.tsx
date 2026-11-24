import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { motion, useReducedMotion, useScroll, useTransform } from 'framer-motion';
import { ArrowDown, ArrowUpRight, MessageCircle } from 'lucide-react';
import { PublicoLayout, TituloPublico } from '@/components/publico/PublicoLayout';
import { Button } from '@/components/ui/button';
import FamiliaCard from '@/components/churrasco/FamiliaCard';
import NarrativaChurrasco from '@/components/churrasco/NarrativaChurrasco';
import FotoChurrasco from '@/components/churrasco/FotoChurrasco';
import { supabase } from '@/integrations/supabase/client';
import { carregarModelosPublicos, linkWhatsApp } from '@/lib/publico';
import { agruparFamilias, CHURRASCO, comparativo, fotosDoModelo, pertenceChurrasco, type FamiliaChurrasco } from '@/lib/churrascoLanding';
import './churrasco.css';

async function carregarLinha() {
  const modelos = (await carregarModelosPublicos()).filter(pertenceChurrasco);
  if (!modelos.length) return [];
  const { data, error } = await supabase.from('midias_catalogo').select('modelo_id, nome_arquivo, url').in('modelo_id', modelos.map(m => m.id)).eq('visivel_catalogo', true).order('created_at');
  if (error) throw error;
  return modelos.map(m => ({ ...m, fotos: fotosDoModelo(m, data || []) }));
}
function Abertura({ familia }: { familia: FamiliaChurrasco }) {
  const ref = useRef<HTMLElement>(null);
  const reduzido = useReducedMotion();
  const { scrollYProgress } = useScroll({ target: ref, offset: ['start start', 'end start'] });
  const scale = useTransform(scrollYProgress, [0, 1], [1, 1.12]);
  return <section ref={ref} className="churrasco-hero relative isolate -mt-6 overflow-hidden">
    <motion.div className="absolute inset-0" style={reduzido ? undefined : { scale }}><FotoChurrasco fotos={familia.modelos[0]?.fotos || []} alt={familia.modelos[0]?.nome_modelo || familia.nome} primeiraDobra className="h-full w-full object-cover" /></motion.div>
    <div className="churrasco-hero-shade absolute inset-0" />
    <a href="#escada" className="absolute right-4 top-5 border-b border-accent pb-1 text-xs text-[hsl(var(--oferta-texto))] sm:right-8">Ver a linha completa</a>
    <div className="relative flex h-full flex-col justify-end px-4 pb-12 sm:px-8 md:pb-16">
      <p className="mb-4 text-xs uppercase text-accent">KAOWZ / LINHA DE CHURRASCO</p>
      <TituloPublico className="churrasco-manifesto max-w-2xl">{CHURRASCO.manifesto}</TituloPublico>
      <p className="mt-5 max-w-xs text-sm leading-relaxed md:max-w-lg md:text-lg">{CHURRASCO.subtitulo}</p>
      <a href="#historia" className="mt-8 flex w-fit items-center gap-2 text-[11px] uppercase"><ArrowDown className="h-4 w-4 text-accent" />role para baixo</a>
    </div>
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
export default function Churrasco() {
  const { data: modelos = [], isPending, isError, refetch } = useQuery({ queryKey: ['churrasco-publico'], queryFn: carregarLinha, staleTime: 300000 });
  const [tentando, setTentando] = useState(false);
  const familias = agruparFamilias(modelos);
  const picanheira = familias.find(f => f.id === 'picanheira') || familias[0];
  const comparacao = comparativo(modelos);
  return <PublicoLayout mostrarSaida={false}><Metadados /><div className="churrasco-page text-[hsl(var(--oferta-texto))]">
    {isPending ? <div role="status" aria-label="Carregando linha de churrasco" className="space-y-6 motion-safe:animate-pulse"><div className="h-[80svh] bg-[hsl(var(--campanha-barra))]" /><div className="grid grid-cols-2 gap-2">{[0, 1, 2, 3].map(i => <div key={i} className="aspect-[3/4] rounded-lg bg-[hsl(var(--oferta-superficie))]" />)}</div></div> : !picanheira || isError ? <div className="flex min-h-[60svh] flex-col items-center justify-center gap-5 px-4 text-center"><TituloPublico>Linha de churrasco Kaowz</TituloPublico><p className="text-sm text-[hsl(var(--oferta-muted))]">{isError ? 'Não conseguimos carregar a linha agora.' : 'Nossa linha de churrasco está sendo preparada por aqui.'}</p>{isError && <Button disabled={tentando} onClick={async () => { setTentando(true); await refetch(); setTentando(false); }}>Tentar novamente</Button>}<Button asChild variant="outline"><Link to="/vitrine">Ver todas as lâminas</Link></Button></div> : <>
      <Abertura familia={picanheira} />
      <div id="historia" className="scroll-mt-20"><NarrativaChurrasco familias={familias} /></div>
      <section id="escada" className="scroll-mt-20 px-2 py-16 sm:px-8">
        <p className="text-xs uppercase text-accent">Do primeiro corte ao legado</p><h2 className="mt-3 text-3xl font-bold md:text-5xl">O seu próximo ritual.</h2>
        {CHURRASCO.degraus.map((d, i) => {
          const grupos = agruparFamilias(modelos, d.id);
          return <section key={d.id} data-tier={d.id} className="border-b border-[hsl(var(--oferta-borda))] py-12 last:border-0">
            <div className="mb-6 flex items-start gap-4"><span className="pt-1 text-xs text-accent">0{i + 1}</span><div><p className="mb-1 text-[10px] uppercase text-[hsl(var(--oferta-muted))]">{d.titulo}</p><h3 className="text-2xl font-bold md:text-4xl">{d.material}</h3><p className="mt-3 text-sm text-[hsl(var(--oferta-detalhe))]">{d.apoio}</p></div></div>
            {grupos.length ? <div className={`grid gap-3 sm:gap-5 ${d.id === 'definitiva' ? 'sm:grid-cols-2' : 'sm:grid-cols-2 lg:grid-cols-4'}`}>{grupos.map(f => <FamiliaCard key={`${d.id}-${f.id}`} familia={f} definitiva={d.id === 'definitiva'} />)}</div> : <p className="py-6 text-sm text-[hsl(var(--oferta-muted))]">Novas peças deste degrau chegam em breve.</p>}
          </section>;
        })}
      </section>
      <section className="border-y border-[hsl(var(--oferta-borda))] px-2 py-12 sm:px-8"><p className="text-xs uppercase text-accent">Três caminhos. A mesma mesa.</p><h2 className="mb-8 mt-3 text-3xl font-bold">Escolha o seu aço.</h2>
        <div className="overflow-x-auto overscroll-x-contain" tabIndex={0} aria-label="Comparativo dos aços">
          <table className="w-full min-w-[700px] text-left text-xs"><thead><tr><th className="w-32 py-5 font-normal text-[hsl(var(--oferta-muted))]">Na sua mesa</th>{comparacao.map(c => <th key={c.nome} className="px-4 py-5 text-base text-accent">{c.nome}</th>)}</tr></thead><tbody>{[['Dureza', 'dureza'], ['Espessura', 'espessura'], ['Prazo de entrega', 'prazo'], ['Faixa de preço', 'preco']].map(([label, chave]) => <tr key={chave} className="border-t border-[hsl(var(--oferta-borda))]"><th className="py-5 font-normal text-[hsl(var(--oferta-muted))]">{label}</th>{comparacao.map(c => <td key={c.nome} className="px-4 py-5">{c[chave as 'dureza' | 'espessura' | 'prazo' | 'preco']}</td>)}</tr>)}</tbody></table>
        </div>
      </section>
      <section className="px-4 py-20 text-center sm:px-8"><p className="text-xs uppercase text-accent">KAOWZ / FEITA PARA SERVIR E DURAR</p><h2 className="my-6 text-4xl font-bold md:text-6xl">{CHURRASCO.fechamento}</h2><div className="mx-auto flex max-w-lg flex-col justify-center gap-3 sm:flex-row"><Button asChild className="h-12 bg-accent text-[hsl(var(--oferta-preto))] hover:bg-accent/90"><a href={linkWhatsApp(CHURRASCO.mensagemMesa)} target="_blank" rel="noopener noreferrer"><MessageCircle className="mr-2 h-4 w-4" />Falar com um vendedor</a></Button><Button asChild variant="outline" className="h-12 border-[hsl(var(--oferta-borda))] bg-transparent text-[hsl(var(--oferta-texto))] hover:bg-[hsl(var(--oferta-superficie))]"><Link to="/vitrine">Ver todas as lâminas<ArrowUpRight className="ml-2 h-4 w-4" /></Link></Button></div></section>
    </>}
  </div></PublicoLayout>;
}
