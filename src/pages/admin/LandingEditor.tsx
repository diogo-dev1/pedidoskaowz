import { useEffect, useMemo, useRef, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { toast } from 'sonner';
import { ArrowLeft, Eye, Loader2, Lock, Save } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  carregarLandingAdmin,
  carregarModelosPublicosLanding,
  nivelEfetivo,
  salvarLaminas,
  salvarLanding,
  salvarPassos,
  slugValido,
  type Landing,
  type LandingEdicao,
  type ModeloLanding,
} from '@/lib/landings';
import { AbaGeral } from '@/components/admin/landings/AbaGeral';
import { AbaPassos } from '@/components/admin/landings/AbaPassos';
import { AbaLaminas } from '@/components/admin/landings/AbaLaminas';
import { AbaEscada } from '@/components/admin/landings/AbaEscada';
import { MetricasLanding } from '@/components/admin/landings/MetricasLanding';
import { landingVazia, type AtualizarLanding, type LaminaEditor, type PassoEdicao } from '@/components/admin/landings/tipos';

const paraEdicao = (row: Landing): LandingEdicao => {
  const { id: _id, created_at: _c, updated_at: _u, ...campos } = row;
  return {
    ...landingVazia(),
    ...campos,
    filtro_casos_uso: campos.filtro_casos_uso ?? [],
    filtro_tipo_porte: campos.filtro_tipo_porte ?? [],
  };
};

/** Traduz o erro do Supabase numa frase que diz o que fazer. */
function mensagemDeErro(erro: unknown, slug: string) {
  const e = erro as { code?: string; message?: string } | null;
  if (e?.code === '23505') return `Já existe uma landing no endereço /categoria/${slug}. Escolha outro endereço.`;
  if (e?.code === '42501' || /row-level security/i.test(e?.message ?? '')) return 'Sem permissão para salvar. Só administradores editam landings.';
  if (e?.code === '42P01' || e?.code === 'PGRST205') return 'As tabelas de landings ainda não existem no banco. Aplique o SQL da migration.';
  return 'Não foi possível salvar. Confira a conexão e tente de novo.';
}

export default function LandingEditor() {
  const { id } = useParams();
  const nova = id === 'nova';
  const navigate = useNavigate();
  const { profile } = useAuth();
  const somenteLeitura = profile?.cargo !== 'admin';

  const [landingId, setLandingId] = useState<string | null>(null);
  const [landing, setLanding] = useState<LandingEdicao>(landingVazia);
  const [passos, setPassosEstado] = useState<PassoEdicao[]>([]);
  const [laminas, setLaminasEstado] = useState<LaminaEditor[]>([]);
  const [slugManual, setSlugManual] = useState(false);
  const [slugSalvo, setSlugSalvo] = useState<string | null>(null);
  const [carregando, setCarregando] = useState(!nova);
  const [falhaCarregar, setFalhaCarregar] = useState<'nao_encontrada' | 'erro' | null>(null);
  const [salvando, setSalvando] = useState(false);
  const [alterado, setAlterado] = useState(false);
  const [modelos, setModelos] = useState<ModeloLanding[]>([]);
  const [carregandoModelos, setCarregandoModelos] = useState(true);
  const [aba, setAba] = useState('geral');
  /** Evita recarregar por cima do estado quando a URL muda para o id recém-criado. */
  const idCarregado = useRef<string | null>(null);

  useEffect(() => {
    if (nova || !id || idCarregado.current === id) return;
    let ativo = true;
    setCarregando(true);
    setFalhaCarregar(null);
    carregarLandingAdmin(id)
      .then((r) => {
        if (!ativo) return;
        if (!r) {
          setFalhaCarregar('nao_encontrada');
          return;
        }
        idCarregado.current = id;
        setLandingId(r.landing.id);
        setLanding(paraEdicao(r.landing));
        setSlugSalvo(r.landing.slug);
        setSlugManual(true);
        setPassosEstado(
          r.passos.map((p) => ({ id: p.id, titulo: p.titulo, texto: p.texto, midia_url: p.midia_url, midia_tipo: p.midia_tipo, foco: p.foco })),
        );
        setLaminasEstado(
          r.laminas.map((l) => ({
            modelo_id: l.modelo_id,
            modelo: l.modelo,
            nivel_override: l.nivel_override,
            texto_categoria: l.texto_categoria,
            preco_override: l.preco_override,
            cta_override: l.cta_override,
            url_compra: l.url_compra,
            destaque: l.destaque,
          })),
        );
        setAlterado(false);
      })
      .catch(() => ativo && setFalhaCarregar('erro'))
      .finally(() => ativo && setCarregando(false));
    return () => {
      ativo = false;
    };
  }, [id, nova]);

  useEffect(() => {
    carregarModelosPublicosLanding()
      .then(setModelos)
      .catch(() => toast.error('Não foi possível carregar o catálogo de modelos.'))
      .finally(() => setCarregandoModelos(false));
  }, []);

  useEffect(() => {
    if (!alterado) return;
    const avisar = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      e.returnValue = '';
    };
    window.addEventListener('beforeunload', avisar);
    return () => window.removeEventListener('beforeunload', avisar);
  }, [alterado]);

  const atualizar: AtualizarLanding = (campo, valor) => {
    setLanding((atual) => ({ ...atual, [campo]: valor }));
    setAlterado(true);
  };
  const setPassos = (fn: (atual: PassoEdicao[]) => PassoEdicao[]) => {
    setPassosEstado(fn);
    setAlterado(true);
  };
  const setLaminas = (fn: (atual: LaminaEditor[]) => LaminaEditor[]) => {
    setLaminasEstado(fn);
    setAlterado(true);
  };

  const contagemNiveis = useMemo(() => {
    const c: Record<string, number> = {};
    laminas.forEach((l) => {
      const n = nivelEfetivo(l, { posicao_escada: l.modelo?.posicao_escada ?? null });
      c[n] = (c[n] ?? 0) + 1;
    });
    return c;
  }, [laminas]);

  const validar = (): string | null => {
    if (!landing.titulo.trim()) {
      setAba('geral');
      return 'Dê um título para a landing.';
    }
    if (!slugValido(landing.slug)) {
      setAba('geral');
      return 'O endereço precisa ter só letras minúsculas, números e hífen.';
    }
    const semTitulo = passos.findIndex((p) => !p.titulo.trim());
    if (semTitulo >= 0) {
      setAba('passos');
      return `O passo ${semTitulo + 1} está sem título.`;
    }
    return null;
  };

  const salvar = async () => {
    if (somenteLeitura || salvando) return;
    const erro = validar();
    if (erro) {
      toast.error(erro);
      return;
    }
    setSalvando(true);
    try {
      const salva = await salvarLanding({ ...landing, titulo: landing.titulo.trim(), id: landingId ?? undefined });
      idCarregado.current = salva.id;
      setLandingId(salva.id);
      setSlugSalvo(salva.slug);
      if (nova) navigate(`/admin/landings/${salva.id}`, { replace: true });
      await salvarPassos(salva.id, passos);
      await salvarLaminas(salva.id, laminas);
      setAlterado(false);
      toast.success(salva.publicada ? 'Landing salva e publicada' : 'Rascunho salvo');
    } catch (e) {
      toast.error(mensagemDeErro(e, landing.slug));
    } finally {
      setSalvando(false);
    }
  };

  if (carregando) {
    return (
      <div className="flex items-center gap-2 py-20 text-sm text-muted-foreground">
        <Loader2 className="h-4 w-4 animate-spin" aria-hidden /> Carregando landing…
      </div>
    );
  }

  if (falhaCarregar) {
    return (
      <div className="space-y-4 py-16 text-center">
        <p className="text-sm text-muted-foreground">
          {falhaCarregar === 'nao_encontrada'
            ? 'Esta landing não existe ou é um rascunho que só administradores podem abrir.'
            : 'Não foi possível carregar a landing. Confira a conexão e tente de novo.'}
        </p>
        <Button asChild variant="outline" className="rounded-lg">
          <Link to="/admin/landings">Voltar para landings</Link>
        </Button>
      </div>
    );
  }

  const botaoSalvar = !somenteLeitura && (
    <Button className="h-10 rounded-lg" onClick={salvar} disabled={salvando || (!alterado && !nova)}>
      {salvando ? <Loader2 className="animate-spin" /> : <Save />}
      {salvando ? 'Salvando…' : 'Salvar'}
    </Button>
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <Link
            to="/admin/landings"
            className="inline-flex items-center gap-1 rounded text-sm text-muted-foreground transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            <ArrowLeft className="h-4 w-4" aria-hidden /> Landings
          </Link>
          <h1 className="mt-1 truncate text-xl font-semibold sm:text-2xl">{landing.titulo.trim() || 'Nova landing'}</h1>
          <div className="mt-2 flex flex-wrap items-center gap-2 text-sm">
            <Badge variant={landing.publicada ? 'default' : 'secondary'} className="rounded-md">
              {landing.publicada ? 'Publicada' : 'Rascunho'}
            </Badge>
            {alterado && <span className="text-warning">Alterações não salvas</span>}
          </div>
        </div>
        <div className="flex shrink-0 gap-2">
          <Button
            variant="outline"
            className="h-10 rounded-lg"
            disabled={!slugSalvo}
            title={slugSalvo ? undefined : 'Salve a landing para ver a prévia'}
            onClick={() => window.open(`/categoria/${slugSalvo}?preview=1`, '_blank', 'noopener')}
          >
            <Eye /> Ver prévia
          </Button>
          {botaoSalvar}
        </div>
      </div>

      {somenteLeitura && (
        <div className="flex items-start gap-2 rounded-lg border bg-muted p-3 text-sm">
          <Lock className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" aria-hidden />
          <p>
            Somente leitura. Só administradores editam landings; você vê aqui o que está publicado.
          </p>
        </div>
      )}

      {landingId && !somenteLeitura && <MetricasLanding landingId={landingId} />}

      <Tabs value={aba} onValueChange={setAba}>
        <TabsList className="grid h-auto w-full grid-cols-4 sm:inline-grid sm:w-auto">
          <TabsTrigger value="geral" className="h-9">Geral</TabsTrigger>
          <TabsTrigger value="passos" className="h-9">
            Passos <span className="ml-1 tabular-nums text-muted-foreground">{passos.length}</span>
          </TabsTrigger>
          <TabsTrigger value="laminas" className="h-9">
            Lâminas <span className="ml-1 tabular-nums text-muted-foreground">{laminas.length}</span>
          </TabsTrigger>
          <TabsTrigger value="escada" className="h-9">Escada</TabsTrigger>
        </TabsList>

        <fieldset disabled={somenteLeitura} className="mt-6 min-w-0">
          <TabsContent value="geral" className="mt-0">
            <AbaGeral
              landing={landing}
              atualizar={atualizar}
              slugManual={slugManual}
              setSlugManual={setSlugManual}
              slugSalvo={slugSalvo}
            />
          </TabsContent>
          <TabsContent value="passos" className="mt-0">
            <AbaPassos passos={passos} setPassos={setPassos} pasta={landing.slug || 'nova'} />
          </TabsContent>
          <TabsContent value="laminas" className="mt-0">
            <AbaLaminas
              landing={landing}
              atualizar={atualizar}
              laminas={laminas}
              setLaminas={setLaminas}
              modelos={modelos}
              carregandoModelos={carregandoModelos}
            />
          </TabsContent>
          <TabsContent value="escada" className="mt-0">
            <AbaEscada landing={landing} atualizar={atualizar} contagem={contagemNiveis} />
          </TabsContent>
        </fieldset>
      </Tabs>

      {botaoSalvar && <div className="flex justify-end border-t pt-4">{botaoSalvar}</div>}
    </div>
  );
}
