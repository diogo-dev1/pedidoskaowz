import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { PublicoLayout, TituloPublico } from '@/components/publico/PublicoLayout';
import {
  PERGUNTAS,
  TITULOS_PRESENTE,
  respostasVazias,
  type PerguntaQuiz,
  type RespostasQuiz,
} from '@/lib/recomendacao';
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
import { ArrowLeft, ArrowRight, Check, Gift, User } from 'lucide-react';

/** D2 — caminho de cozinha: marcou apenas "casa e churrasco". */
const ehCaminhoCozinha = (r: RespostasQuiz) => r.onde.length === 1 && r.onde[0] === 'casa_churrasco';

/** D2 — na cozinha, só estas funções fazem sentido. */
const FUNCOES_COZINHA = ['corte_utilitario', 'preparo_animal'];

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
  const [iniciouQuiz, setIniciouQuiz] = useState(false); // C2 — tela zero
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
    setRetomar({ passo: salvo.passo, respostas: salvo.respostas });
  }, [pronto, assinatura]);

  // D2/D3 — o caminho real deste cliente define a lista, a numeração e a barra.
  const cozinha = ehCaminhoCozinha(r);
  const caminho = useMemo(() => {
    return perguntas
      .filter((p) => !(cozinha && p.id === 'porte'))
      .map((p) => {
        const titulo = r.presente ? (TITULOS_PRESENTE[p.id as string] ?? p.titulo) : p.titulo;
        const opcoes =
          cozinha && p.id === 'funcao' ? p.opcoes.filter((o) => FUNCOES_COZINHA.includes(o.valor)) : p.opcoes;
        return { ...p, titulo, opcoes };
      });
  }, [perguntas, cozinha, r.presente]);

  const passoValido = Math.max(0, Math.min(passo, caminho.length - 1));
  useEffect(() => { if (passo !== passoValido) setPasso(passoValido); }, [passo, passoValido]);

  const pergunta = caminho[passoValido];
  const opcoes = pergunta.opcoes;
  const valorAtual = r[pergunta.id];
  const selecionadas = Array.isArray(valorAtual) ? valorAtual : valorAtual ? [valorAtual as string] : [];
  const podeAvancar = selecionadas.length > 0;
  const ultimo = passoValido === caminho.length - 1;

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
        let atual = (prev[pergunta.id] as string[]) ?? [];
        let lista = atual.includes(v) ? atual.filter((x) => x !== v) : [...atual, v];
        // D1 — "não porto" é exclusivo.
        if (pergunta.id === 'porte') {
          if (v === 'nao_se_aplica' && lista.includes('nao_se_aplica')) lista = ['nao_se_aplica'];
          else lista = lista.filter((x) => x !== 'nao_se_aplica');
        }
        proximo = { ...prev, [pergunta.id]: lista } as RespostasQuiz;
      } else {
        proximo = { ...prev, [pergunta.id]: v } as RespostasQuiz;
      }

      // D2 — entrar/sair do caminho de cozinha ajusta porte e funções.
      if (pergunta.id === 'onde') {
        if (ehCaminhoCozinha(proximo)) {
          proximo = {
            ...proximo,
            porte: ['nao_se_aplica'],
            funcao: proximo.funcao.filter((f) => FUNCOES_COZINHA.includes(f)),
          };
        } else if (proximo.porte.length === 1 && proximo.porte[0] === 'nao_se_aplica' && ehCaminhoCozinha(prev)) {
          proximo = { ...proximo, porte: [] };
        }
      }

      persistir(proximo, passoValido);
      return proximo;
    });
  };

  const irPara = (destino: number, dir: 'frente' | 'tras') => {
    setDirecao(dir);
    setAnimKey((k) => k + 1);
    const alvo = Math.max(0, Math.min(destino, caminho.length - 1));
    setPasso(alvo);
    persistir(r, alvo);
  };

  const avancar = () => {
    if (!podeAvancar) return;
    if (!ultimo) { irPara(passoValido + 1, 'frente'); return; }
    salvarRespostas(r);
    limparProgressoQuiz();
    navigate('/descubra/resultado');
  };

  const voltar = () => { if (passoValido > 0) irPara(passoValido - 1, 'tras'); };

  const progresso = ((passoValido + 1) / caminho.length) * 100;
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
            Retomamos de onde você parou, ou você recomeça do zero.
          </p>
          <div className="mt-6 flex flex-col gap-3 sm:flex-row">
            <Button
              onClick={() => {
                setR(retomar.respostas);
                setPasso(retomar.passo);
                setIniciouQuiz(true);
                setRetomar(null);
              }}
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

  /* C2 — TELA ZERO: bifurcação, fora da numeração. */
  if (!iniciouQuiz) {
    const comecar = (presente: boolean) => {
      vibrar();
      const inicial = { ...respostasVazias(), presente };
      setR(inicial);
      setPasso(0);
      setIniciouQuiz(true);
      persistir(inicial, 0);
    };
    return (
      <PublicoLayout>
        <div className="mx-auto max-w-3xl">
          <TituloPublico>Para quem é a lâmina?</TituloPublico>
          <p className="mt-1 text-sm text-zinc-400">
            Isso muda tudo o que vem depois — as perguntas passam a ser sobre quem vai usar.
          </p>
          <div className="mt-6 grid gap-3 sm:grid-cols-2">
            {[
              { presente: false, titulo: 'É para mim', desc: 'Eu vou usar a peça', Icone: User },
              { presente: true, titulo: 'É presente', desc: 'Outra pessoa vai usar', Icone: Gift },
            ].map(({ presente, titulo, desc, Icone }) => (
              <button
                key={titulo}
                type="button"
                onClick={() => comecar(presente)}
                className="group relative overflow-hidden rounded-xl border border-zinc-800 bg-zinc-900 p-8 text-left transition-all duration-300 hover:-translate-y-1 hover:border-accent hover:bg-zinc-800"
              >
                <Icone className="h-7 w-7 text-accent" />
                <span className="mt-4 block text-xl font-bold tracking-wide text-white">{titulo}</span>
                <span className="mt-1 block text-sm text-zinc-400">{desc}</span>
              </button>
            ))}
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
              Pergunta {passoValido + 1} de {caminho.length}
            </p>
            <div className="flex items-center gap-2">
              {r.presente && (
                <Badge variant="outline" className="border-zinc-700 text-[10px] text-zinc-300">Presente</Badge>
              )}
              {selecionadas.length > 0 && pergunta.multipla && (
                <Badge className="border-0 bg-accent text-[10px] text-white">{selecionadas.length} selecionada(s)</Badge>
              )}
            </div>
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
