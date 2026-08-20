import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { PublicoLayout, TituloPublico } from '@/components/publico/PublicoLayout';
import LaminaCard from '@/components/publico/LaminaCard';
import { carregarModelosPublicos, lerRespostas } from '@/lib/publico';
import {
  casosRelevantes,
  fraseDoPerfil,
  labelDe,
  montarEnxoval,
  montarEscada,
  recomendar,
  CASOS_USO,
  POSICOES_ESCADA,
  type ModeloRecomendavel,
  respostasVazias,
  type RespostasQuiz,
} from '@/lib/recomendacao';
import { RotateCcw } from 'lucide-react';

const CHAVE_FRASE = 'kaowz_frase_perfil_exibida';

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
  const perfilMisto = casosRelevantes(respostas).length >= 2 && enxoval.length >= 2;
  const principais = perfilMisto ? enxoval : ranking;
  const ancora = principais[0]?.modelo;
  const escada = useMemo(
    () => (ancora ? montarEscada(modelos, ancora, respostas) : []),
    [modelos, ancora, respostas],
  );

  if (!respostasSalvas) return null;

  return (
    <PublicoLayout>
      <section className="relative overflow-hidden rounded-xl border border-zinc-800 bg-zinc-900 p-5 md:p-8">
        <div className="absolute inset-0 bg-gradient-to-b from-accent/10 via-transparent to-transparent" />
        <div className="relative">
          <span className="text-[10px] font-semibold uppercase tracking-[0.3em] text-accent">Seu perfil</span>
          <TituloPublico className="mt-2"><FrasePerfil frase={fraseDoPerfil(respostas)} /></TituloPublico>
          <p className="mt-2 text-sm text-zinc-400 md:text-base">
            {perfilMisto
              ? 'Seu perfil não cabe em uma peça só — abaixo vai um enxoval, uma lâmina por uso.'
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
          <div className="mt-6 grid grid-cols-2 gap-1.5 md:gap-4 lg:grid-cols-3">
            {principais.map((rec, i) => (
              <div key={rec.modelo.id} className="quiz-cascata" style={{ animationDelay: `${i * 80}ms` }}>
              <LaminaCard
                modelo={rec.modelo}
                porque={rec.porque}
                destaque={rec === principais[0]}
                etiqueta={rec.casoUso ? labelDe(CASOS_USO, rec.casoUso) : undefined}
              />
              </div>
            ))}
          </div>

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
                    etiqueta={labelDe(POSICOES_ESCADA, d.posicao)}
                  />
                  </div>
                ))}
              </div>
            </section>
          )}
        </>
      )}

      <div className="mt-12 flex flex-wrap items-center gap-4 border-t border-zinc-800/60 pt-6">
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
