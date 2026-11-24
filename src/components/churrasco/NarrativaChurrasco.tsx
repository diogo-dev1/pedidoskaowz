import { useEffect, useRef, useState } from 'react';
import { AnimatePresence, motion, useInView, useReducedMotion, useScroll, useTransform } from 'framer-motion';
import { CHURRASCO, escolherHeroi, type FamiliaChurrasco, type ModeloChurrasco } from '@/lib/churrascoLanding';
import FotoChurrasco from './FotoChurrasco';

function Fotos({ familia, onUnavailable }: { familia: FamiliaChurrasco; onUnavailable: (id: string) => void }) {
  const melhor = escolherHeroi(familia.modelos);
  const modelos = familia.id === 'complementos' ? [...new Map(familia.modelos.map(m => [m.nome_modelo.split(/[ -]/)[0].toLowerCase(), m])).values()].slice(0, 3) : melhor ? [melhor] : [];
  return <div className={`churrasco-story-photos ${modelos.length > 1 ? 'churrasco-mosaic' : ''}`}>
    {modelos.map(m => <div key={m.id} className="relative min-h-0 overflow-hidden"><FotoChurrasco fotos={m.fotos} alt={m.nome_modelo} className="h-full w-full object-cover" onUnavailable={() => onUnavailable(m.id)} /></div>)}
  </div>;
}
function Passo({ familia, indice, ativar, estatico, onUnavailable }: { familia: FamiliaChurrasco; indice: number; ativar: (i: number) => void; estatico: boolean; onUnavailable: (id: string) => void }) {
  const ref = useRef<HTMLDivElement>(null);
  const visivel = useInView(ref, { margin: '-52% 0px -8% 0px' });
  useEffect(() => { if (visivel) ativar(indice); }, [visivel, indice, ativar]);
  return <div ref={ref} className={`churrasco-step ${estatico ? 'churrasco-step-static' : ''}`} data-step={familia.id} data-visible-piece={estatico ? escolherHeroi(familia.modelos)?.id : undefined}>
    {estatico && <div className="churrasco-static-photo"><Fotos familia={familia} onUnavailable={onUnavailable} /></div>}
    <div className="churrasco-step-copy"><h2>{familia.titulo}</h2>{familia.apoio && <p>{familia.apoio}</p>}</div>
  </div>;
}
interface Props { familias: FamiliaChurrasco[]; onVisible: (m: ModeloChurrasco | null) => void; onUnavailable: (id: string) => void }
export default function NarrativaChurrasco({ familias, onVisible, onUnavailable }: Props) {
  const reduzido = !!useReducedMotion();
  const [ativo, setAtivo] = useState(0);
  const ref = useRef<HTMLElement>(null);
  const visivel = useInView(ref, { margin: '-20% 0px -30% 0px' });
  const { scrollYProgress } = useScroll({ target: ref, offset: ['start start', 'end end'] });
  const scale = useTransform(scrollYProgress, [0, 1], [1, 1.045]);
  const passos = CHURRASCO.passos.map(id => familias.find(f => f.id === id)).filter((f): f is FamiliaChurrasco => !!f);
  const atual = passos[ativo] || passos[0];
  const modelo = atual ? escolherHeroi(atual.modelos) : undefined;
  useEffect(() => { if (visivel) onVisible(modelo || null); }, [visivel, modelo?.id, onVisible]);
  if (!atual) return null;
  return <section ref={ref} aria-label="Conheça a linha de churrasco" className={`churrasco-story ${reduzido ? 'churrasco-story-static' : ''}`}>
    {!reduzido && <div className="churrasco-sticky" data-visible-piece={modelo?.id}>
      <AnimatePresence initial={false}>
        <motion.div key={atual.id} className="absolute inset-0" style={{ scale }} initial={{ opacity: 0, scale: 1.025 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0 }} transition={{ duration: .65 }}><Fotos familia={atual} onUnavailable={onUnavailable} /></motion.div>
      </AnimatePresence>
      <div className="churrasco-progress" role="progressbar" aria-label="Progresso da apresentação" aria-valuemin={1} aria-valuemax={passos.length} aria-valuenow={ativo + 1}><span style={{ height: `${((ativo + 1) / passos.length) * 100}%` }} /></div>
    </div>}
    <div className="churrasco-story-steps">{passos.map((f, i) => <Passo key={f.id} familia={f} indice={i} ativar={setAtivo} estatico={reduzido} onUnavailable={onUnavailable} />)}</div>
  </section>;
}
