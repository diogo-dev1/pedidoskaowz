import { useEffect, useRef, useState } from 'react';
import { AnimatePresence, motion, useInView, useReducedMotion, useScroll, useTransform } from 'framer-motion';
import { CHURRASCO, textoDoModelo, type FamiliaChurrasco } from '@/lib/churrascoLanding';
import FotoChurrasco from './FotoChurrasco';

function Fotos({ familia }: { familia: FamiliaChurrasco }) {
  const [indice, setIndice] = useState(0);
  const modelos = familia.id === 'complementos' ? [...new Map(familia.modelos.map(m => [m.nome_modelo.split(/[ -]/)[0].toLowerCase(), m])).values()].slice(0, 4) : familia.modelos.slice(indice, indice + 1);
  return <div className={`h-full w-full ${modelos.length > 1 ? 'grid grid-cols-2 gap-2' : ''}`}>
    {modelos.map(m => <div key={m.id} className="h-full min-h-0"><FotoChurrasco fotos={m.fotos} alt={m.nome_modelo} className="h-full w-full object-contain" onUnavailable={() => { if (familia.id !== 'complementos' && indice + 1 < familia.modelos.length) setIndice(i => i + 1); }} /></div>)}
  </div>;
}
function Passo({ familia, indice, ativar, estatico }: { familia: FamiliaChurrasco; indice: number; ativar: (i: number) => void; estatico: boolean }) {
  const ref = useRef<HTMLDivElement>(null);
  const visivel = useInView(ref, { margin: '-48% 0px -12% 0px' });
  useEffect(() => { if (visivel) ativar(indice); }, [visivel, indice, ativar]);
  const m = familia.modelos[0];
  return <div ref={ref} className={`churrasco-step ${estatico ? 'py-10' : 'flex min-h-[58svh] flex-col justify-center py-8 md:min-h-[85svh]'} px-2 sm:px-8`} data-step={familia.id}>
    {estatico && <div className="mb-6 aspect-[4/3]"><Fotos familia={familia} /></div>}
    <p className="mb-4 text-xs uppercase text-accent">{String(indice + 1).padStart(2, '0')} / {familia.nome}</p>
    <h2 className="max-w-lg text-3xl font-bold leading-tight md:text-5xl">{familia.titulo}</h2>
    <p className="mt-5 max-w-md text-sm leading-relaxed text-[hsl(var(--oferta-detalhe))] md:text-base">{m ? textoDoModelo(m, familia.apoio) : familia.apoio}</p>
    <a href="#escada" className="mt-6 w-fit border-b border-accent pb-1 text-xs text-accent">Conhecer as variações</a>
  </div>;
}
export default function NarrativaChurrasco({ familias }: { familias: FamiliaChurrasco[] }) {
  const reduzido = !!useReducedMotion();
  const [ativo, setAtivo] = useState(0);
  const ref = useRef<HTMLElement>(null);
  const { scrollYProgress } = useScroll({ target: ref, offset: ['start center', 'end end'] });
  const scale = useTransform(scrollYProgress, [0, 1], [1, 1.04]);
  const passos = CHURRASCO.passos.map(id => familias.find(f => f.id === id)).filter((f): f is FamiliaChurrasco => !!f);
  const atual = passos[ativo] || passos[0];
  if (!atual) return null;
  return <section ref={ref} aria-label="Conheça a linha de churrasco" className={`churrasco-story relative border-b border-[hsl(var(--oferta-borda))] ${reduzido ? '' : 'flex flex-col md:grid md:grid-cols-2 md:items-start'}`}>
    {!reduzido && <div className="churrasco-sticky sticky top-[65px] z-20 h-[42svh] shrink-0 overflow-hidden bg-[hsl(var(--oferta-fundo))] md:col-start-2 md:row-start-1 md:top-[85px] md:h-[75svh]">
      <AnimatePresence initial={false}>
        <motion.div key={atual.id} className="absolute inset-0 p-3 md:p-6" style={{ scale }} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: .55 }}><Fotos familia={atual} /></motion.div>
      </AnimatePresence>
      <div className="absolute bottom-0 left-0 right-0 bg-[hsl(var(--oferta-fundo))]/90 px-4 py-2">
        <div className="mb-2 flex justify-between text-[10px] uppercase"><span>{atual.nome}</span><span>{ativo + 1} / {passos.length}</span></div>
        <div className="flex gap-1" role="progressbar" aria-label="Progresso da apresentação" aria-valuemin={1} aria-valuemax={passos.length} aria-valuenow={ativo + 1}>{passos.map((p, i) => <span key={p.id} className={`h-0.5 flex-1 ${i <= ativo ? 'bg-accent' : 'bg-[hsl(var(--oferta-borda))]'}`} />)}</div>
      </div>
    </div>}
    <div className={reduzido ? '' : 'md:col-start-1 md:row-start-1'}>{passos.map((f, i) => <Passo key={f.id} familia={f} indice={i} ativar={setAtivo} estatico={reduzido} />)}</div>
  </section>;
}
