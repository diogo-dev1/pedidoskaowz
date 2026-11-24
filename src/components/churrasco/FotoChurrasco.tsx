import { useEffect, useState } from 'react';

interface Props { fotos: string[]; alt: string; className?: string; primeiraDobra?: boolean; onUnavailable?: () => void }
function Foto({ fotos, alt, className, primeiraDobra, onUnavailable }: Props) {
  const [indice, setIndice] = useState(0);
  const src = fotos[indice];
  useEffect(() => { if (!src) onUnavailable?.(); }, [src, onUnavailable]);
  if (!src) return <div className="flex h-full items-center justify-center text-xs text-[hsl(var(--oferta-muted))]">Foto indisponível</div>;
  return <img src={src} alt={alt} className={className} loading={primeiraDobra ? 'eager' : 'lazy'} fetchPriority={primeiraDobra ? 'high' : 'auto'} onError={() => setIndice(i => i + 1)} />;
}
/** Fall back only through the selected model's gallery; never borrow another variant's photo. */
export default function FotoChurrasco(props: Props) {
  return <Foto key={props.fotos.join('|')} {...props} />;
}
