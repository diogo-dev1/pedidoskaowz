import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { PublicoLayout, TituloPublico } from '@/components/publico/PublicoLayout';
import { PERGUNTAS, opcoesDesempate, respostasVazias, type RespostasQuiz } from '@/lib/recomendacao';
import { salvarRespostas } from '@/lib/publico';
import { ArrowLeft, ArrowRight, Check } from 'lucide-react';

export default function Descubra() {
  const navigate = useNavigate();
  const [passo, setPasso] = useState(0);
  const [r, setR] = useState<RespostasQuiz>(respostasVazias());

  const pergunta = PERGUNTAS[passo];
  const opcoes = pergunta.id === 'desempate' ? opcoesDesempate(r) : pergunta.opcoes;
  const valorAtual = r[pergunta.id];
  const selecionadas = Array.isArray(valorAtual) ? valorAtual : valorAtual ? [valorAtual as string] : [];
  const podeAvancar = selecionadas.length > 0;
  const ultimo = passo === PERGUNTAS.length - 1;

  const escolher = (v: string) => {
    setR((prev) => {
      if (pergunta.multipla) {
        const atual = (prev[pergunta.id] as string[]) ?? [];
        return { ...prev, [pergunta.id]: atual.includes(v) ? atual.filter((x) => x !== v) : [...atual, v] };
      }
      return { ...prev, [pergunta.id]: v };
    });
    // Pergunta de escolha única avança sozinha — o gesto tem resposta imediata.
    if (!pergunta.multipla) {
      window.setTimeout(() => avancar(v), 180);
    }
  };

  const avancar = (valorForcado?: string) => {
    const proximas = { ...r } as RespostasQuiz;
    if (valorForcado && !pergunta.multipla) (proximas as any)[pergunta.id] = valorForcado;
    if (ultimo) {
      salvarRespostas(proximas);
      navigate('/descubra/resultado');
      return;
    }
    setPasso((p) => Math.min(p + 1, PERGUNTAS.length - 1));
  };

  const progresso = useMemo(() => ((passo + 1) / PERGUNTAS.length) * 100, [passo]);

  return (
    <PublicoLayout>
      <div className="mb-6">
        <div className="h-[3px] w-full overflow-hidden rounded bg-[hsl(0_0%_14%)]">
          <div
            className="h-full bg-[hsl(0_72%_45%)] transition-all duration-500"
            style={{ width: `${progresso}%` }}
          />
        </div>
        <p className="mt-2 text-[11px] uppercase tracking-widest text-[hsl(0_0%_45%)]">
          Pergunta {passo + 1} de {PERGUNTAS.length}
        </p>
      </div>

      <TituloPublico>{pergunta.titulo}</TituloPublico>
      {pergunta.ajuda && <p className="mt-1 text-sm text-[hsl(0_0%_58%)]">{pergunta.ajuda}</p>}

      <div className="mt-6 grid gap-3 sm:grid-cols-2">
        {opcoes.map((o) => {
          const ativo = selecionadas.includes(o.valor);
          return (
            <button
              key={o.valor}
              type="button"
              onClick={() => escolher(o.valor)}
              className={`group relative overflow-hidden rounded-lg border px-4 py-5 text-left transition-all duration-200 ${
                ativo
                  ? 'border-[hsl(42_72%_58%)] bg-[hsl(42_72%_58%/0.08)]'
                  : 'border-[hsl(0_0%_16%)] bg-[hsl(0_0%_8%)] hover:border-[hsl(0_72%_45%)]'
              }`}
            >
              <span className="font-bebas text-2xl tracking-wide">{o.titulo}</span>
              <span className="mt-1 block text-sm text-[hsl(0_0%_60%)]">{o.descricao}</span>
              {ativo && <Check className="absolute right-3 top-3 h-4 w-4 text-[hsl(42_72%_58%)]" />}
            </button>
          );
        })}
      </div>

      <div className="mt-8 flex items-center justify-between">
        <button
          type="button"
          onClick={() => setPasso((p) => Math.max(0, p - 1))}
          disabled={passo === 0}
          className="flex items-center gap-2 text-xs uppercase tracking-widest text-[hsl(0_0%_50%)] disabled:opacity-30"
        >
          <ArrowLeft className="h-4 w-4" /> Voltar
        </button>
        {pergunta.multipla && (
          <button
            type="button"
            onClick={() => avancar()}
            disabled={!podeAvancar}
            className="flex items-center gap-2 rounded bg-[hsl(0_72%_45%)] px-5 py-2.5 text-xs font-semibold uppercase tracking-widest text-white transition-opacity disabled:opacity-30"
          >
            {ultimo ? 'Ver resultado' : 'Continuar'} <ArrowRight className="h-4 w-4" />
          </button>
        )}
      </div>
    </PublicoLayout>
  );
}
