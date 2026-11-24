import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { Copy, ExternalLink, ImageIcon, Loader2, Pencil, Plus } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { listarLandings, type LandingResumo } from '@/lib/landings';

const linkPublico = (slug: string) => `${window.location.origin}/categoria/${slug}`;

export default function LandingsAdmin() {
  const navigate = useNavigate();
  const { profile } = useAuth();
  const somenteLeitura = profile?.cargo !== 'admin';
  const [landings, setLandings] = useState<LandingResumo[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState(false);

  useEffect(() => {
    listarLandings()
      .then(setLandings)
      .catch(() => setErro(true))
      .finally(() => setCarregando(false));
  }, []);

  const copiar = async (slug: string) => {
    try {
      await navigator.clipboard.writeText(linkPublico(slug));
      toast.success('Link copiado');
    } catch {
      toast.error('Não foi possível copiar. Copie pelo endereço da página.');
    }
  };

  const abrir = (l: LandingResumo) =>
    window.open(l.publicada ? `/categoria/${l.slug}` : `/categoria/${l.slug}?preview=1`, '_blank', 'noopener');

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-xl font-semibold sm:text-2xl">Landings por categoria</h1>
          <p className="text-sm text-muted-foreground">
            Páginas públicas por categoria de uso, com rolagem animada e a escada de valor.
          </p>
        </div>
        {!somenteLeitura && (
          <Button className="h-10 rounded-lg" onClick={() => navigate('/admin/landings/nova')}>
            <Plus /> Nova landing
          </Button>
        )}
      </div>

      {carregando ? (
        <div className="flex items-center gap-2 py-10 text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" aria-hidden /> Carregando landings…
        </div>
      ) : erro ? (
        <div className="rounded-lg border border-dashed p-8 text-center text-sm text-muted-foreground">
          Não foi possível carregar as landings. Se o recurso acabou de chegar, confira se o SQL da migration
          <code className="mx-1 rounded bg-muted px-1">landings_categoria</code>
          foi aplicado no banco.
        </div>
      ) : landings.length === 0 ? (
        <div className="rounded-lg border border-dashed p-8 text-center text-sm text-muted-foreground">
          {somenteLeitura
            ? 'Nenhuma landing publicada ainda.'
            : 'Nenhuma landing ainda. Clique em "Nova landing" para criar a primeira.'}
        </div>
      ) : (
        <ul className="space-y-2">
          {landings.map((l) => (
            <li key={l.id} className="flex flex-col gap-3 rounded-lg border bg-card p-3 sm:flex-row sm:items-center">
              <div className="flex min-w-0 flex-1 items-center gap-3">
                <div className="flex h-16 w-12 shrink-0 items-center justify-center overflow-hidden rounded bg-muted">
                  {l.capa_url && l.capa_tipo === 'imagem' ? (
                    <img src={l.capa_url} alt="" loading="lazy" className="h-full w-full object-cover" />
                  ) : l.capa_url ? (
                    <video src={l.capa_url} className="h-full w-full object-cover" muted playsInline preload="metadata" />
                  ) : (
                    <ImageIcon className="h-4 w-4 text-muted-foreground" aria-hidden />
                  )}
                </div>
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <Link
                      to={`/admin/landings/${l.id}`}
                      className="truncate font-medium hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                    >
                      {l.titulo}
                    </Link>
                    <Badge variant={l.publicada ? 'default' : 'secondary'} className="shrink-0 rounded-md">
                      {l.publicada ? 'Publicada' : 'Rascunho'}
                    </Badge>
                  </div>
                  <p className="truncate font-mono text-xs text-muted-foreground">/categoria/{l.slug}</p>
                  <p className="text-xs tabular-nums text-muted-foreground">
                    {l.total_laminas} {l.total_laminas === 1 ? 'lâmina' : 'lâminas'}
                  </p>
                </div>
              </div>
              <div className="flex gap-2">
                <Button asChild variant="outline" className="h-10 flex-1 rounded-lg sm:flex-none">
                  <Link to={`/admin/landings/${l.id}`}>
                    <Pencil /> {somenteLeitura ? 'Ver' : 'Editar'}
                  </Link>
                </Button>
                <Button variant="outline" size="icon" className="h-10 w-10 rounded-lg" onClick={() => abrir(l)} aria-label={`Ver página de ${l.titulo}`}>
                  <ExternalLink />
                </Button>
                <Button variant="outline" size="icon" className="h-10 w-10 rounded-lg" onClick={() => copiar(l.slug)} aria-label={`Copiar link de ${l.titulo}`}>
                  <Copy />
                </Button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
