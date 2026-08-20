import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { PublicoLayout, TituloPublico } from '@/components/publico/PublicoLayout';
import { PERGUNTAS, opcoesDesempate, respostasVazias, type PerguntaQuiz, type RespostasQuiz } from '@/lib/recomendacao';
import {
  carregarQuizConfig,
  perguntasDoConfig,
  salvarRespostas,
  salvarProgressoQuiz,
  lerProgressoQuiz,
  limparProgressoQuiz,
} from '@/lib/publico';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ArrowLeft, ArrowRight, Check } from 'lucide-react';

/** 'desempate' é montado a partir destas respostas — mudou uma, o desempate morre. */
const DEPENDENCIAS_DESEMPATE: (keyof RespostasQuiz)[] = ['quem', 'onde', 'funcao'];

const reduzMovimento = () =>
  typeof window !== 'undefined' &&
  typeof window.matchMedia === 'function' &&
  window.matchMedia('(prefers-reduced-motion: reduce)').matches;

const vibrar = () => {
  try {
    if (typeof navigator !== 'undefined' && typeof navigator.vibrate === 'function') navigator.vibrate(10);
  } catch { /* ignore */ }
};

export default function Descubra() {
  const navigate = useNavigate();
  const [passo, setPasso] = useState(0);
  const [r, setR] = useState<RespostasQuiz>(respostasVazias());
  const [perguntas, setPerguntas] = useState<PerguntaQuiz[]>(PERGUNTAS);
  const [pronto, setPronto] = useState(false);
  const [retomar, setRetomar] = useState<{ passo: number; respostas: RespostasQuiz } | null>(null);
  const [direcao, setDirecao] = useState<'frente' | 'tras'>('frente');
  const [animKey, setAnimKey] = useState(0);
  const [desempateVisitado, setDesempateVisitado] = useState(false);
  const iniciado = useRef(false);

  const assinatura = useMemo(() => perguntas.map((p) => p.id).join('|'), [perguntas]);

  // Etapas configuradas no painel admin (textos, ordem e opções visíveis).
  useEffect(() => {
    let vivo = true;
    carregarQuizConfig()
      .then((cfg) => {
        if (!vivo) return;
        const lista = perguntasDoConfig(cfg);
        if (lista.length) setPerguntas(lista);
      })
      .catch(() => { /* mantém o padrão */ })
      .finally(() => { if (vivo) setPronto(true); });
    return () => { vivo = false; };
  }, []);

  // Retomada: só vale se a lista de perguntas for exatamente a mesma da sessão anterior.
  useEffect(() => {
    if (!pronto || iniciado.current) return;
    iniciado.current = true;
    const salvo = lerProgressoQuiz();
    if (!salvo) return;
    if (salvo.assinatura !== assinatura) { limparProgressoQuiz(); return; }
    if (salvo.passo <= 0) return;
    setRetomar({ passo: Math.min(salvo.passo, perguntas.length - 1), respostas: salvo.respostas });
  }, [pronto, assinatura, perguntas.length]);

  // A4 — clamp do passo ao tamanho real da lista.
  const passoValido = Math.max(0, Math.min(passo, perguntas.length - 1));
  useEffect(() => { if (passo !== passoValido) setPasso(passoValido); }, [passo, passoValido]);

  const pergunta = perguntas[passoValido];
  const opcoes = pergunta.id === 'desempate' ? opcoesDesempate(r) : pergunta.opcoes;
  const valorAtual = r[pergunta.id];
  const selecionadas = Array.isArray(valorAtual) ? valorAtual : valorAtual ? [valorAtual as string] : [];
  const podeAvancar = selecionadas.length > 0;
  const ultimo = passoValido === perguntas.length - 1;

  useEffect(() => {
    if (pergunta.id === 'desempate') setDesempateVisitado(true);
  }, [pergunta.id]);

  const persistir = useCallback(
    (respostas: RespostasQuiz, novoPasso: number) => {
      salvarProgressoQuiz({ passo: novoPasso, respostas, assinatura, atualizadoEm: Date.now() });
    },
    [assinatura],
  );

  const escolher = (v: string) => {
    vibrar();
    setR((prev) => {
      let proximo: RespostasQuiz;
      if (pergunta.multipla) {
        const atual = (prev[pergunta.id] as string[]) ?? [];
        proximo = {
          ...prev,
          [pergunta.id]: atual.includes(v) ? atual.filter((x) => x !== v) : [...atual, v],
        } as RespostasQuiz;
      } else {
        proximo = { ...prev, [pergunta.id]: v } as RespostasQuiz;
      }
      // A1 — invalidação em cascata.
      if (DEPENDENCIAS_DESEMPATE.includes(pergunta.id)) {
        proximo = { ...proximo, desempate: null };
        setDesempateVisitado(false);
      }
      persistir(proximo, passoValido);
      return proximo;
    });
  };

  const indiceDesempate = perguntas.findIndex((p) => p.id === 'desempate');

  const irPara = (destino: number, dir: 'frente' | 'tras') => {
    setDirecao(dir);
    setAnimKey((k) => k + 1);
    const alvo = Math.max(0, Math.min(destino, perguntas.length - 1));
    setPasso(alvo);
    persistir(r, alvo);
  };

  const avancar = () => {
    if (!podeAvancar) return;
    if (!ultimo) { irPara(passoValido + 1, 'frente'); return; }

    // A2 — validação na saída: o desempate precisa existir nas opções atuais.
    if (indiceDesempate >= 0) {
      const validas = opcoesDesempate(r).map((o) => o.valor);
      const ok = !!r.desempate && validas.includes(r.desempate);
      if (!ok && validas.length > 0) { irPara(indiceDesempate, 'tras'); return; }
      if (!ok && validas.length === 0 && r.desempate) {
        // Sem opções possíveis: limpa em vez de mandar lixo para o motor.
        const limpo = { ...r, desempate: null };
        setR(limpo);
        salvarRespostas(limpo);
        limparProgressoQuiz();
        navigate('/descubra/resultado');
        return;
      }
    }
    salvarRespostas(r);
    limparProgressoQuiz();
    navigate('/descubra/resultado');
  };

  const voltar = () => { if (passoValido > 0) irPara(passoValido - 1, 'tras'); };

  const progresso = ((passoValido + 1) / perguntas.length) * 100;
  const semMovimento = reduzMovimento();
  const classeEtapa = semMovimento
    ? ''
    : direcao === 'frente'
      ? 'quiz-entra-direita'
      : 'quiz-entra-esquerda';

  if (retomar) {
    return (
      <PublicoLayout>
        <div className="mx-auto max-w-xl rounded-xl border border-zinc-800 bg-zinc-900 p-6">
          <TituloPublico>Você já tinha começado</TituloPublico>
          <p className="mt-2 text-sm text-zinc-400">
            Retomamos na pergunta {retomar.passo + 1} de {perguntas.length}, ou você recomeça do zero.
          </p>
          <div className="mt-6 flex flex-col gap-3 sm:flex-row">
            <Button
              onClick={() => { setR(retomar.respostas); setPasso(retomar.passo); setRetomar(null); }}
              className="h-11 rounded-xl bg-accent px-6 text-xs font-bold uppercase tracking-widest text-white hover:bg-accent/90"
            >
              Continuar de onde parou
            </Button>
            <Button
              variant="outline"
              onClick={() => { limparProgressoQuiz(); setR(respostasVazias()); setPasso(0); setRetomar(null); }}
              className="h-11 rounded-xl border-zinc-700 px-6 text-xs font-bold uppercase tracking-widest text-zinc-300"
            >
              Começar de novo
            </Button>
          </div>
        </div>
      </PublicoLayout>
    );
  }

  return (
    <PublicoLayout>
      <div className="mx-auto max-w-4xl overflow-hidden">
        <div className="mb-6">
          <div className="relative h-1.5 w-full overflow-hidden rounded-full bg-zinc-800">
            <div
              className="h-full rounded-full bg-accent shadow-[0_0_20px_rgba(251,146,60,0.5)]"
              style={{
                width: `${progresso}%`,
                transition: semMovimento ? 'none' : 'width 500ms cubic-bezier(0.16, 1, 0.3, 1)',
              }}
            />
            {!semMovimento && (
              <div key={`brilho-${animKey}`} className="quiz-brilho pointer-events-none absolute inset-y-0 left-0 w-1/3" />
            )}
          </div>
          <div className="mt-2 flex items-center justify-between">
            <p className="text-[11px] font-semibold uppercase tracking-[0.3em] text-zinc-500">
              Pergunta {passoValido + 1} de {perguntas.length}
            </p>
            {selecionadas.length > 0 && pergunta.multipla && (
              <Badge className="border-0 bg-accent text-[10px] text-white">{selecionadas.length} selecionada(s)</Badge>
            )}
          </div>
        </div>

        <div key={`${pergunta.id}-${animKey}`} className={classeEtapa}>
          <TituloPublico>{pergunta.titulo}</TituloPublico>
          {pergunta.ajuda && <p className="mt-1 text-sm text-zinc-400">{pergunta.ajuda}</p>}

          <div className="mt-6 grid gap-3 sm:grid-cols-2">
            {opcoes.map((o, i) => {
              const ativo = selecionadas.includes(o.valor);
              return (
                <button
                  key={o.valor}
                  type="button"
                  onClick={() => escolher(o.valor)}
                  style={semMovimento ? undefined : { animationDelay: `${i * 40}ms` }}
                  className={`group relative overflow-hidden rounded-xl border p-5 text-left transition-all duration-300 ${
                    semMovimento ? '' : 'quiz-cascata'
                  } ${ativo ? 'quiz-toque' : ''} ${
                    ativo
                      ? 'border-accent bg-zinc-800 shadow-[0_0_30px_rgba(251,146,60,0.15)]'
                      : 'border-zinc-800 bg-zinc-900 hover:-translate-y-1 hover:border-accent hover:bg-zinc-800'
                  }`}
                >
                  <div className="absolute right-0 top-0 h-1 w-full bg-gradient-to-r from-transparent via-accent/40 to-accent opacity-0 transition-opacity group-hover:opacity-100" />
                  <span className="block text-base font-bold tracking-wide text-white md:text-lg">{o.titulo}</span>
                  <span className="mt-1 block text-xs text-zinc-400 md:text-sm">{o.descricao}</span>
                  {ativo && (
                    <span className="quiz-check absolute right-3 top-3 flex h-6 w-6 items-center justify-center rounded-full bg-accent">
                      <Check className="h-3.5 w-3.5 text-white" />
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </div>

        <div className="mt-8 flex items-center justify-between">
          <button
            type="button"
            onClick={voltar}
            disabled={passoValido === 0}
            className="flex items-center gap-2 text-xs font-semibold uppercase tracking-widest text-zinc-500 transition-colors hover:text-accent disabled:opacity-30"
          >
            <ArrowLeft className="h-4 w-4" /> Voltar
          </button>
          <Button
            onClick={avancar}
            disabled={!podeAvancar}
            className="h-11 rounded-xl bg-accent px-6 text-xs font-bold uppercase tracking-widest text-white shadow-[0_0_30px_rgba(251,146,60,0.3)] transition-opacity hover:bg-accent/90 disabled:opacity-30 disabled:shadow-none"
          >
            {ultimo ? 'Ver resultado' : 'Continuar'} <ArrowRight className="ml-2 h-4 w-4" />
          </Button>
        </div>
      </div>
    </PublicoLayout>
  );
}
