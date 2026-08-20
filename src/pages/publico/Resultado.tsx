import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { PublicoLayout, TituloPublico } from '@/components/publico/PublicoLayout';
import LaminaCard from '@/components/publico/LaminaCard';
import {
  carregarModelosPublicos,
  lerRespostas,
  lerToken,
  gravarToken,
  linkWhatsApp,
  salvarProjeto,
} from '@/lib/publico';
import {
  casosRelevantes,
  etiquetasDoPerfil,
  fraseDoPerfil,
  labelDe,
  montarEnxoval,
  montarEscada,
  recomendar,
  ETIQUETA_FUNCAO,
  POSICOES_ESCADA,
  type CasoUso,
  type ModeloRecomendavel,
  respostasVazias,
  type RespostasQuiz,
} from '@/lib/recomendacao';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { Copy, Loader2, MessageCircle, RotateCcw, Save } from 'lucide-react';

const CHAVE_FRASE = 'kaowz_frase_perfil_exibida';
const BRL = (n: number) => n.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

/** Frase do perfil montada palavra por palavra — só na primeira exibição da sessão. */
function FrasePerfil({ frase }: { frase: string }) {
  const palavras = useMemo(() => frase.split(' '), [frase]);
  const jaExibiu = useMemo(() => {
    try { return sessionStorage.getItem(CHAVE_FRASE) === '1'; } catch { return true; }
  }, []);
  const semMovimento = useMemo(
    () =>
      typeof window !== 'undefined' &&
      typeof window.matchMedia === 'function' &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches,
    [],
  );
  const animar = !jaExibiu && !semMovimento;
  const [visiveis, setVisiveis] = useState(animar ? 0 : palavras.length);

  useEffect(() => {
    if (!animar) return;
    try { sessionStorage.setItem(CHAVE_FRASE, '1'); } catch { /* ignore */ }
    const id = window.setInterval(() => {
      setVisiveis((n) => {
        if (n >= palavras.length) { window.clearInterval(id); return n; }
        return n + 1;
      });
    }, 45);
    return () => window.clearInterval(id);
  }, [animar, palavras.length]);

  return (
    <>
      {palavras.map((p, i) => (
        <span key={`${p}-${i}`} className={i < visiveis ? 'opacity-100' : 'opacity-0'}>
          {p}{i < palavras.length - 1 ? ' ' : ''}
        </span>
      ))}
    </>
  );
}

export default function Resultado() {
  const navigate = useNavigate();
  const [modelos, setModelos] = useState<ModeloRecomendavel[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [salvando, setSalvando] = useState(false);
  const [linkArsenal, setLinkArsenal] = useState<string | null>(null);
  const respostasSalvas = useMemo<RespostasQuiz | null>(() => lerRespostas(), []);
  const respostas = respostasSalvas ?? respostasVazias();

  useEffect(() => {
    if (!respostasSalvas) { navigate('/descubra', { replace: true }); return; }
    carregarModelosPublicos().then((m) => { setModelos(m); setCarregando(false); });
  }, [respostasSalvas, navigate]);

  const enxoval = useMemo(
    () => (modelos.length ? montarEnxoval(modelos, respostas) : []),
    [modelos, respostas],
  );
  const ranking = useMemo(
    () => (modelos.length ? recomendar(modelos, respostas, 3) : []),
    [modelos, respostas],
  );
  // F1/F2 — o enxoval é o padrão: só cai no ranking com um único caso relevante.
  const conjunto = casosRelevantes(respostas).length >= 2 && enxoval.length > 0;
  const principais = conjunto ? enxoval : ranking;
  const ancora = principais[0]?.modelo;
  const escada = useMemo(
    () => (ancora ? montarEscada(modelos, ancora, respostas) : []),
    [modelos, ancora, respostas],
  );

  const total = principais.reduce((s, rec) => s + (rec.modelo.preco_base ?? 0), 0);
  const varias = principais.length > 1;

  const salvarNoArsenal = async () => {
    if (!principais.length) return;
    setSalvando(true);
    try {
      const resumo = principais
        .map((rec) => {
          const etq = rec.casoUso ? ETIQUETA_FUNCAO[rec.casoUso as CasoUso] : 'Indicação';
          return `• ${etq}: ${rec.modelo.nome_modelo} — ${BRL(rec.modelo.preco_base ?? 0)}`;
        })
        .join('\n');
      const res = await salvarProjeto({
        token: lerToken(),
        nome: varias ? 'Meu conjunto Kaowz' : 'Minha lâmina Kaowz',
        modeloNome: principais.map((r) => r.modelo.nome_modelo).join(' + '),
        preco: total,
        resumo,
        configuracao: {
          origem: 'quiz',
          pecas: principais.map((rec) => ({
            id: rec.modelo.id,
            nome: rec.modelo.nome_modelo,
            preco: rec.modelo.preco_base ?? 0,
            funcao: rec.casoUso ? ETIQUETA_FUNCAO[rec.casoUso as CasoUso] : null,
            porque: rec.porque,
          })),
          respostas,
        },
        perfil: respostas,
        etiquetas: etiquetasDoPerfil(respostas),
      });
      gravarToken(res.token);
      setLinkArsenal(`${window.location.origin}/arsenal/${res.token}`);
      toast.success('Salvo no seu arsenal');
    } catch {
      toast.error('Não foi possível salvar agora');
    } finally {
      setSalvando(false);
    }
  };

  const copiarLink = async () => {
    if (!linkArsenal) return;
    try { await navigator.clipboard.writeText(linkArsenal); toast.success('Link copiado'); }
    catch { toast.error('Não foi possível copiar'); }
  };

  const enviarWhatsApp = () => {
    if (!linkArsenal) return;
    const msg = [
      'Olá! Fiz o quiz da Kaowz e guardei o meu arsenal:',
      '',
      ...principais.map((rec) => `• ${rec.modelo.nome_modelo}`),
      '',
      `Total do conjunto: ${BRL(total)}`,
      linkArsenal,
    ].join('\n');
    window.open(linkWhatsApp(msg), '_blank');
  };

  if (!respostasSalvas) return null;

  return (
    <PublicoLayout>
      <section className="relative overflow-hidden rounded-xl border border-zinc-800 bg-zinc-900 p-5 md:p-8">
        <div className="absolute inset-0 bg-gradient-to-b from-accent/10 via-transparent to-transparent" />
        <div className="relative">
          <span className="text-[10px] font-semibold uppercase tracking-[0.3em] text-accent">Seu perfil</span>
          <TituloPublico className="mt-2"><FrasePerfil frase={fraseDoPerfil(respostas)} /></TituloPublico>
          <p className="mt-2 text-sm text-zinc-400 md:text-base">
            {conjunto
              ? 'Seu perfil não cabe em uma peça só — abaixo vai um conjunto, uma lâmina por função.'
              : 'Estas são as lâminas que fazem sentido para o seu uso.'}
          </p>
        </div>
      </section>

      {carregando ? (
        <div className="mt-6 grid grid-cols-2 gap-1.5 md:gap-4 lg:grid-cols-3">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="animate-pulse rounded-lg border border-zinc-700 bg-zinc-800 p-3">
              <div className="mb-2 aspect-[3/4] rounded-lg bg-zinc-700" />
              <div className="mb-1.5 h-3 rounded bg-zinc-700" />
              <div className="h-5 w-1/2 rounded bg-zinc-700" />
            </div>
          ))}
        </div>
      ) : principais.length === 0 ? (
        <p className="py-16 text-center text-sm text-zinc-400">
          Ainda estamos cadastrando as lâminas. Veja a vitrine completa enquanto isso.
        </p>
      ) : (
        <>
          {/* F5 — título do bloco */}
          <section className="mt-8">
            <h2 className="text-xl font-black tracking-tight text-white md:text-2xl">
              {varias ? <>SEU <span className="text-accent">CONJUNTO</span></> : <>SUA <span className="text-accent">LÂMINA</span></>}
            </h2>
            {varias && (
              <p className="mt-1 text-sm text-zinc-400">
                Cada peça cobre uma função diferente do seu dia — juntas, fecham o seu uso.
              </p>
            )}

            <div className="mt-4 grid grid-cols-2 gap-1.5 md:gap-4 lg:grid-cols-3">
              {principais.map((rec, i) => (
                <div key={rec.modelo.id} className="quiz-cascata" style={{ animationDelay: `${i * 80}ms` }}>
                  <LaminaCard
                    modelo={rec.modelo}
                    porque={rec.porque}
                    destaque={i === 0}
                    semConfigurador
                    etiqueta={rec.casoUso ? ETIQUETA_FUNCAO[rec.casoUso as CasoUso] : undefined}
                  />
                </div>
              ))}
            </div>

            {/* F6 — soma do conjunto */}
            {varias && (
              <div className="mt-4 flex flex-wrap items-baseline justify-between gap-2 rounded-xl border border-zinc-800 bg-zinc-900 p-4">
                <div>
                  <p className="text-[11px] font-semibold uppercase tracking-[0.3em] text-zinc-500">Valor do conjunto</p>
                  <p className="text-xs text-zinc-500">
                    As peças podem ser adquiridas separadamente, no seu tempo.
                  </p>
                </div>
                <p className="text-2xl font-black text-accent md:text-3xl">{BRL(total)}</p>
              </div>
            )}
          </section>

          {escada.length > 1 && (
            <section className="mt-12">
              <h2 className="text-xl font-black tracking-tight text-white md:text-2xl">
                TRÊS CAMINHOS PARA A <span className="text-accent">MESMA FUNÇÃO</span>
              </h2>
              <p className="mt-1 text-sm text-zinc-400">
                Da porta de entrada à peça definitiva — todas resolvem, mudam o nível de acabamento e material.
              </p>
              <div className="mt-4 grid grid-cols-2 gap-1.5 md:gap-4 lg:grid-cols-3">
                {escada.map((d, i) => (
                  <div key={d.modelo.id} className="quiz-cascata" style={{ animationDelay: `${i * 80}ms` }}>
                    <LaminaCard
                      modelo={d.modelo}
                      porque={d.porque}
                      destaque={i === 0}
                      semConfigurador
                      etiqueta={labelDe(POSICOES_ESCADA, d.posicao)}
                    />
                  </div>
                ))}
              </div>
            </section>
          )}
        </>
      )}

      {/* G1/G3 — saída principal: arsenal */}
      <section className="mt-12 rounded-xl border border-zinc-800 bg-zinc-900 p-5">
        {linkArsenal ? (
          <>
            <p className="text-[11px] font-semibold uppercase tracking-[0.3em] text-accent">Seu arsenal</p>
            <p className="mt-2 break-all text-sm text-zinc-300">{linkArsenal}</p>
            <p className="mt-1 text-xs text-zinc-500">Este link é seu e não expira. Guarde para voltar quando quiser.</p>
            <div className="mt-4 flex flex-wrap gap-2">
              <Button onClick={copiarLink} variant="outline" className="h-11 rounded-xl border-zinc-700 text-xs font-bold uppercase tracking-widest text-zinc-200">
                <Copy className="mr-2 h-4 w-4" /> Copiar link
              </Button>
              <Button onClick={enviarWhatsApp} className="h-11 rounded-xl bg-accent text-xs font-bold uppercase tracking-widest text-white hover:bg-accent/90">
                <MessageCircle className="mr-2 h-4 w-4" /> Enviar no WhatsApp
              </Button>
              <Button asChild variant="ghost" className="h-11 rounded-xl text-xs font-bold uppercase tracking-widest text-zinc-400">
                <Link to={linkArsenal.replace(window.location.origin, '')}>Abrir arsenal</Link>
              </Button>
            </div>
          </>
        ) : (
          <>
            <p className="text-sm text-zinc-400">
              Guarde {varias ? 'este conjunto' : 'esta indicação'} num link só seu — com as peças e o seu perfil.
            </p>
            <Button
              onClick={salvarNoArsenal}
              disabled={salvando || !principais.length}
              className="mt-4 h-12 w-full rounded-xl bg-accent text-xs font-bold uppercase tracking-widest text-white shadow-[0_0_30px_rgba(251,146,60,0.3)] hover:bg-accent/90 sm:w-auto sm:px-8"
            >
              {salvando ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
              Salvar no meu arsenal
            </Button>
          </>
        )}
      </section>

      {/* G4 — ações secundárias discretas */}
      <div className="mt-6 flex flex-wrap items-center gap-4 border-t border-zinc-800/60 pt-6">
        <button
          type="button"
          onClick={() => navigate('/descubra')}
          className="flex items-center gap-2 text-xs font-semibold uppercase tracking-widest text-zinc-500 transition-colors hover:text-accent"
        >
          <RotateCcw className="h-4 w-4" /> Refazer
        </button>
        <Link
          to="/vitrine"
          className="text-xs font-semibold uppercase tracking-widest text-zinc-500 transition-colors hover:text-accent"
        >
          Ver todas as lâminas
        </Link>
      </div>
    </PublicoLayout>
  );
}
