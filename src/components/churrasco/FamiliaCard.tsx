import { useState } from 'react';
import { Link } from 'react-router-dom';
import { motion, useReducedMotion } from 'framer-motion';
import { ArrowUpRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import FotoChurrasco from './FotoChurrasco';
import { linkWhatsApp } from '@/lib/publico';
import { brl, CHURRASCO, chipDoModelo, textoDoModelo, type FamiliaChurrasco } from '@/lib/churrascoLanding';

export default function FamiliaCard({ familia, definitiva = false }: { familia: FamiliaChurrasco; definitiva?: boolean }) {
  const [indice, setIndice] = useState(0);
  const [indisponiveis, setIndisponiveis] = useState<string[]>([]);
  const reduzido = useReducedMotion();
  const m = familia.modelos[indice] || familia.modelos[0];
  if (!m) return null;
  const pater = familia.id === 'pater';
  const destino = pater ? '/kits-pater' : definitiva ? linkWhatsApp(CHURRASCO.mensagem + m.nome_modelo) : `/catalogo/${m.id}`;
  const cta = pater ? 'Conhecer o Kit Pater' : definitiva ? 'Falar com um vendedor' : 'Ver detalhes';
  return <motion.article className="churrasco-card flex h-full min-w-0 flex-col overflow-hidden rounded-lg border border-[hsl(var(--oferta-borda))] bg-[hsl(var(--campanha-barra))]" initial={reduzido ? false : { opacity: 0, y: 24 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true, amount: .15 }} transition={{ duration: reduzido ? 0 : definitiva ? .85 : .45 }} data-family={familia.id}>
    <div className={`relative overflow-hidden ${definitiva ? 'aspect-[4/3]' : 'aspect-[3/4]'}`}>
      <FotoChurrasco fotos={m.fotos} alt={m.nome_modelo} className="h-full w-full object-contain" onUnavailable={() => {
        if (indisponiveis.includes(m.id)) return;
        const falhas = [...indisponiveis, m.id];
        setIndisponiveis(falhas);
        const proximo = familia.modelos.findIndex(v => !falhas.includes(v.id));
        if (proximo >= 0) setIndice(proximo);
      }} />
      <span className="absolute left-3 top-3 bg-[hsl(var(--oferta-fundo))]/90 px-2 py-1 text-[10px] uppercase text-accent">{pater ? 'Kit Pater' : definitiva ? 'Tactical' : 'Kaowz'}</span>
    </div>
    <div className="flex flex-1 flex-col gap-3 p-3 sm:p-5">
      <h3 className="text-xl font-bold">{familia.nome}</h3>
      <p className="text-xs leading-relaxed text-[hsl(var(--oferta-muted))]">{pater ? CHURRASCO.familias.find(f => f.id === 'pater')?.titulo : textoDoModelo(m, familia.apoio)}</p>
      <div className="flex flex-wrap gap-1.5" aria-label={`Variações de ${familia.nome}`}>
        {familia.modelos.map((v, i) => <Button key={v.id} size="sm" variant="ghost" disabled={indisponiveis.includes(v.id)} aria-pressed={i === indice} title={v.nome_modelo} onClick={() => setIndice(i)} className={`h-auto min-h-8 max-w-full whitespace-normal rounded-full px-2.5 py-1 text-[11px] focus-visible:ring-accent ${i === indice ? 'bg-accent text-[hsl(var(--oferta-preto))] hover:bg-accent/90' : 'bg-[hsl(var(--oferta-superficie))] text-[hsl(var(--oferta-detalhe))] hover:bg-accent hover:text-[hsl(var(--oferta-preto))]'}`}>{chipDoModelo(v)}</Button>)}
      </div>
      <div className="mt-auto pt-2"><p className="text-[10px] uppercase text-[hsl(var(--oferta-muted))]">{indice === 0 ? 'a partir de' : 'esta variação'}</p><p className="text-2xl font-bold text-accent" data-price>{brl(m.preco_base)}</p></div>
      <Button asChild variant="outline" className="w-full justify-between border-[hsl(var(--oferta-borda))] bg-transparent text-[hsl(var(--oferta-texto))] hover:bg-accent hover:text-[hsl(var(--oferta-preto))]">
        {definitiva && !pater ? <a href={destino} target="_blank" rel="noopener noreferrer">{cta}<ArrowUpRight className="h-4 w-4" /></a> : <Link to={destino}>{cta}<ArrowUpRight className="h-4 w-4" /></Link>}
      </Button>
    </div>
  </motion.article>;
}
