import { useEffect, useMemo, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { useInView } from 'framer-motion';
import { Button } from '@/components/ui/button';
import FotoChurrasco from './FotoChurrasco';
import { linkWhatsApp } from '@/lib/publico';
import { brl, CHURRASCO, chipDoModelo, escolherHeroi, type DegrauChurrasco, type FamiliaChurrasco, type ModeloChurrasco } from '@/lib/churrascoLanding';

interface Props { familias: FamiliaChurrasco[]; degrau: DegrauChurrasco; onVisible: (modelo: ModeloChurrasco | null) => void; onUnavailable: (id: string) => void }
/** One unframed showcase per tier; the existing family variants stay together. */
export default function FamiliaCard({ familias, degrau, onVisible, onUnavailable }: Props) {
  const modelos = useMemo(() => familias?.flatMap(f => f.modelos) ?? [], [familias]);
  const padrao = escolherHeroi(modelos, degrau?.heroiId);
  const [selecionado, setSelecionado] = useState<string | null>(null);
  const m = modelos.find(m => m.id === selecionado) || padrao;
  const ref = useRef<HTMLDivElement>(null);
  const visivel = useInView(ref, { amount: .25 });
  useEffect(() => { if (visivel && m) onVisible?.(m); }, [visivel, m?.id, onVisible]);
  if (!m || !degrau) return null;
  const familia = familias.find(f => f.modelos.some(v => v.id === m.id));
  const pater = familia?.id === 'pater';
  const definitiva = degrau.id === 'definitiva';
  const destino = pater ? '/kits-pater' : definitiva ? linkWhatsApp(CHURRASCO.mensagem + m.nome_modelo) : `/catalogo/${m.id}`;
  const cta = pater ? 'Conhecer o Kit Pater' : definitiva ? 'Falar com um vendedor' : 'Ver detalhes';
  return <div className="churrasco-showcase" data-tier={degrau.id} data-hero-id={m.id}>
    <div className="churrasco-tier-title"><h2>{degrau.titulo}</h2><p>{degrau.material}</p></div>
    <div ref={ref} className="churrasco-piece" data-piece={m.nome_modelo} data-visible-piece={m.id}>
      <div className="churrasco-piece-photo"><FotoChurrasco fotos={m.fotos} alt={m.nome_modelo} className="h-full w-full object-cover" onUnavailable={() => onUnavailable(m.id)} /></div>
      <div className="churrasco-piece-details">
        <h3>{m.nome_modelo}</h3>
        <div className="churrasco-variants" aria-label={`Variações de ${familia?.nome}`}>
          {familia?.modelos.map(v => <Button key={v.id} size="sm" variant="ghost" aria-pressed={v.id === m.id} title={v.nome_modelo} onClick={() => setSelecionado(v.id)} className={`churrasco-chip ${v.id === m.id ? 'churrasco-chip-active' : ''}`}>{chipDoModelo(v)}</Button>)}
        </div>
        <div className={`churrasco-price ${definitiva ? 'churrasco-price-subtle' : ''}`}><p data-price>{degrau.id === 'ideal' ? 'a partir de ' : ''}{brl(m.preco_base)}</p><small>ou em até {CHURRASCO.parcelasSemJuros}x sem juros</small></div>
        <Button asChild className="churrasco-cta">
          {definitiva && !pater ? <a href={destino} target="_blank" rel="noopener noreferrer">{cta}</a> : <Link to={destino}>{cta}</Link>}
        </Button>
      </div>
    </div>
    <div className="churrasco-thumbnails" aria-label={`Outras peças — ${degrau.material}`}>
      {modelos.filter(v => v.id !== m.id).map(v => <Button key={v.id} variant="ghost" className="churrasco-thumbnail" onClick={() => setSelecionado(v.id)} title={v.nome_modelo} aria-label={`Escolher ${v.nome_modelo}`}>
        <span className="churrasco-thumbnail-photo"><FotoChurrasco fotos={v.fotos} alt={v.nome_modelo} className="h-full w-full object-cover" onUnavailable={() => onUnavailable(v.id)} /></span>
        <span className="churrasco-thumbnail-name">{v.nome_modelo}</span><span className="churrasco-thumbnail-price">{brl(v.preco_base)}</span><small className="churrasco-thumbnail-installments">ou em até {CHURRASCO.parcelasSemJuros}x sem juros</small>
      </Button>)}
    </div>
  </div>;
}
