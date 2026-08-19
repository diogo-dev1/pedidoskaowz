import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { PublicoLayout, TituloPublico } from '@/components/publico/PublicoLayout';
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
  type Recomendacao,
  type RespostasQuiz,
} from '@/lib/recomendacao';
import { Loader2, ExternalLink, Wrench, RotateCcw } from 'lucide-react';

const BRL = (n: number) => n.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

const linkLoja = (nome: string) =>
  `https://kaowz.com.br/search?q=${encodeURIComponent(nome)}`;

function CardRecomendacao({
  rec,
  destaque,
  etiqueta,
}: {
  rec: Recomendacao;
  destaque?: boolean;
  etiqueta?: string;
}) {
  const m = rec.modelo;
  return (
    <div
      className={`overflow-hidden rounded-lg border bg-[hsl(0_0%_8%)] transition-all ${
        destaque ? 'border-[hsl(42_72%_58%)]' : 'border-[hsl(0_0%_16%)]'
      }`}
    >
      {m.imagem_modelo && (
        <img src={m.imagem_modelo} alt={m.nome_modelo} loading="lazy" className="h-44 w-full object-cover" />
      )}
      <div className="space-y-2 p-4">
        {etiqueta && (
          <span className="text-[10px] uppercase tracking-widest text-[hsl(42_72%_58%)]">{etiqueta}</span>
        )}
        <h3 className="font-bebas text-2xl tracking-wide">{m.nome_modelo}</h3>
        <p className="text-sm leading-relaxed text-[hsl(0_0%_62%)]">{rec.porque}</p>
        <p className="font-bebas text-xl text-[hsl(42_72%_58%)]">a partir de {BRL(m.preco_base)}</p>
        <div className="grid grid-cols-2 gap-2 pt-1">
          <a
            href={linkLoja(m.nome_modelo)}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center justify-center gap-1.5 rounded border border-[hsl(0_0%_22%)] px-3 py-2 text-[11px] uppercase tracking-widest text-[hsl(0_0%_75%)] transition-colors hover:border-[hsl(42_72%_58%)]"
          >
            <ExternalLink className="h-3.5 w-3.5" /> Pronta entrega
          </a>
          <Link
            to={`/montar?modelo=${encodeURIComponent(m.nome_modelo)}`}
            className="flex items-center justify-center gap-1.5 rounded bg-[hsl(0_72%_45%)] px-3 py-2 text-[11px] font-semibold uppercase tracking-widest text-white"
          >
            <Wrench className="h-3.5 w-3.5" /> Monte a sua
          </Link>
        </div>
      </div>
    </div>
  );
}

export default function Resultado() {
  const navigate = useNavigate();
  const [modelos, setModelos] = useState<ModeloRecomendavel[]>([]);
  const [carregando, setCarregando] = useState(true);
  const respostas = useMemo<RespostasQuiz | null>(() => lerRespostas(), []);

  useEffect(() => {
    if (!respostas) { navigate('/descubra', { replace: true }); return; }
    carregarModelosPublicos().then((m) => { setModelos(m); setCarregando(false); });
  }, [respostas, navigate]);

  if (!respostas) return null;

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

  return (
    <PublicoLayout>
      <TituloPublico className="text-[hsl(42_72%_58%)]">{fraseDoPerfil(respostas)}</TituloPublico>
      <p className="mt-2 text-sm text-[hsl(0_0%_58%)]">
        {perfilMisto
          ? 'Seu perfil não cabe em uma peça só — abaixo vai um enxoval, uma lâmina por uso.'
          : 'Estas são as lâminas que fazem sentido para o seu uso.'}
      </p>

      {carregando ? (
        <div className="flex justify-center py-16">
          <Loader2 className="h-6 w-6 animate-spin text-[hsl(0_0%_40%)]" />
        </div>
      ) : principais.length === 0 ? (
        <p className="py-16 text-center text-sm text-[hsl(0_0%_55%)]">
          Ainda estamos cadastrando as lâminas. Veja a vitrine completa enquanto isso.
        </p>
      ) : (
        <>
          <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {principais.map((rec) => (
              <CardRecomendacao
                key={rec.modelo.id}
                rec={rec}
                destaque={rec === principais[0]}
                etiqueta={rec.casoUso ? labelDe(CASOS_USO, rec.casoUso) : undefined}
              />
            ))}
          </div>

          {escada.length > 1 && (
            <section className="mt-12">
              <h2 className="font-bebas text-2xl tracking-wide">Três caminhos para a mesma função</h2>
              <p className="mt-1 text-sm text-[hsl(0_0%_58%)]">
                Da porta de entrada à peça definitiva — todas resolvem, mudam o nível de acabamento e material.
              </p>
              <div className="mt-4 grid gap-4 sm:grid-cols-3">
                {escada.map((d, i) => (
                  <CardRecomendacao
                    key={d.modelo.id}
                    rec={{ modelo: d.modelo, score: 0, casoUso: null, porque: d.porque }}
                    destaque={i === 0}
                    etiqueta={labelDe(POSICOES_ESCADA, d.posicao)}
                  />
                ))}
              </div>
            </section>
          )}
        </>
      )}

      <div className="mt-12 flex flex-wrap items-center gap-4">
        <button
          type="button"
          onClick={() => navigate('/descubra')}
          className="flex items-center gap-2 text-xs uppercase tracking-widest text-[hsl(0_0%_50%)] hover:text-[hsl(42_72%_58%)]"
        >
          <RotateCcw className="h-4 w-4" /> Refazer
        </button>
        <Link to="/vitrine" className="text-xs uppercase tracking-widest text-[hsl(0_0%_50%)] hover:text-[hsl(42_72%_58%)]">
          Ver todas as lâminas
        </Link>
      </div>
    </PublicoLayout>
  );
}
