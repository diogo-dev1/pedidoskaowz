import { useEffect, useState } from 'react';

interface Props { fotos: string[]; alt: string; className?: string; primeiraDobra?: boolean; onUnavailable?: () => void }
function Foto({ fotos, alt, className, primeiraDobra, onUnavailable }: Props) {
  const [indice, setIndice] = useState(0);
  const [carregada, setCarregada] = useState(false);
  const src = fotos[indice];
  useEffect(() => { if (!src) onUnavailable?.(); }, [src, onUnavailable]);
  if (!src) return null;
  return <>
    {!carregada && <span aria-hidden="true" className="absolute inset-0 bg-[hsl(var(--campanha-barra))]" />}
    <img src={src} alt={alt} className={className} loading={primeiraDobra ? 'eager' : 'lazy'} fetchPriority={primeiraDobra ? 'high' : 'auto'} onLoad={() => setCarregada(true)} onError={() => { setCarregada(false); setIndice(i => i + 1); }} />
  </>;
}
/** Only the selected model's own photos are eligible as fallbacks. */
export default function FotoChurrasco(props: Props) {
  return <Foto key={props.fotos.join('|')} {...props} />;
}
