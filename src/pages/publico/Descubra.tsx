import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { PublicoLayout, TituloPublico } from '@/components/publico/PublicoLayout';
import { PERGUNTAS, opcoesDesempate, respostasVazias, type RespostasQuiz } from '@/lib/recomendacao';
import { salvarRespostas } from '@/lib/publico';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
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
      <div className="mx-auto max-w-4xl">
        <div className="mb-6">
          <div className="h-1.5 w-full overflow-hidden rounded-full bg-zinc-800">
            <div
              className="h-full rounded-full bg-accent shadow-[0_0_20px_rgba(251,146,60,0.5)] transition-all duration-500"
              style={{ width: `${progresso}%` }}
            />
          </div>
          <div className="mt-2 flex items-center justify-between">
            <p className="text-[11px] font-semibold uppercase tracking-[0.3em] text-zinc-500">
              Pergunta {passo + 1} de {PERGUNTAS.length}
            </p>
            {selecionadas.length > 0 && pergunta.multipla && (
              <Badge className="border-0 bg-accent text-[10px] text-white">{selecionadas.length} selecionada(s)</Badge>
            )}
          </div>
        </div>

        <TituloPublico>{pergunta.titulo}</TituloPublico>
        {pergunta.ajuda && <p className="mt-1 text-sm text-zinc-400">{pergunta.ajuda}</p>}

        <div className="mt-6 grid gap-3 sm:grid-cols-2">
          {opcoes.map((o) => {
            const ativo = selecionadas.includes(o.valor);
            return (
              <button
                key={o.valor}
                type="button"
                onClick={() => escolher(o.valor)}
                className={`group relative overflow-hidden rounded-xl border p-5 text-left transition-all duration-300 ${
                  ativo
                    ? 'border-accent bg-zinc-800 shadow-[0_0_30px_rgba(251,146,60,0.15)]'
                    : 'border-zinc-800 bg-zinc-900 hover:-translate-y-1 hover:border-accent hover:bg-zinc-800'
                }`}
              >
                <div className="absolute right-0 top-0 h-1 w-full bg-gradient-to-r from-transparent via-accent/40 to-accent opacity-0 transition-opacity group-hover:opacity-100" />
                <span className="block text-base font-bold tracking-wide text-white md:text-lg">{o.titulo}</span>
                <span className="mt-1 block text-xs text-zinc-400 md:text-sm">{o.descricao}</span>
                {ativo && (
                  <span className="absolute right-3 top-3 flex h-6 w-6 items-center justify-center rounded-full bg-accent">
                    <Check className="h-3.5 w-3.5 text-white" />
                  </span>
                )}
              </button>
            );
          })}
        </div>

        <div className="mt-8 flex items-center justify-between">
          <button
            type="button"
            onClick={() => setPasso((p) => Math.max(0, p - 1))}
            disabled={passo === 0}
            className="flex items-center gap-2 text-xs font-semibold uppercase tracking-widest text-zinc-500 transition-colors hover:text-accent disabled:opacity-30"
          >
            <ArrowLeft className="h-4 w-4" /> Voltar
          </button>
          {pergunta.multipla && (
            <Button
              onClick={() => avancar()}
              disabled={!podeAvancar}
              className="h-11 rounded-xl bg-accent px-6 text-xs font-bold uppercase tracking-widest text-white shadow-[0_0_30px_rgba(251,146,60,0.3)] hover:bg-accent/90"
            >
              {ultimo ? 'Ver resultado' : 'Continuar'} <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          )}
        </div>
      </div>
    </PublicoLayout>
  );
}
