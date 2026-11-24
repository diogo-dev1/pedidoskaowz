import { useEffect, useRef, useState } from 'react';
import { useParams, useSearchParams } from 'react-router-dom';
import { useInView } from 'framer-motion';
import { useAuth } from '@/contexts/AuthContext';
import { PublicoLayout } from '@/components/publico/PublicoLayout';
import {
  carregarLanding,
  mensagemVendedor,
  registrarEvento,
  type CtaEvento,
  type LaminaResolvida,
  type ResultadoLanding,
} from '@/lib/landings';
import { linkWhatsApp } from '@/lib/publico';
import { Abertura } from '@/components/publico/landing/Abertura';
import { PassosScrolly } from '@/components/publico/landing/PassosScrolly';
import { EscadaValor } from '@/components/publico/landing/EscadaValor';
import { Comparativo } from '@/components/publico/landing/Comparativo';
import { Fechamento } from '@/components/publico/landing/Fechamento';
import { LandingCarregando, LandingIndisponivel } from '@/components/publico/landing/LandingEstados';

/** Troca (ou cria) uma meta tag e devolve a função que restaura o valor anterior. */
function definirMeta(atributo: 'name' | 'property', chave: string, conteudo: string) {
  let el = document.head.querySelector<HTMLMetaElement>(`meta[${atributo}="${chave}"]`);
  const criada = !el;
  if (!el) {
    el = document.createElement('meta');
    el.setAttribute(atributo, chave);
    document.head.appendChild(el);
  }
  const anterior = el.content;
  el.content = conteudo;
  return () => {
    if (criada) el?.remove();
    else if (el) el.content = anterior;
  };
}

export default function LandingCategoria() {
  const { slug = '' } = useParams();
  const [params] = useSearchParams();
  const { profile, loading: carregandoAuth } = useAuth();
  const pediuPreview = params.get('preview') === '1';
  // A RLS só entrega rascunho para admin; aqui só evitamos pedir prévia sem ser admin.
  const preview = pediuPreview && profile?.cargo === 'admin';
  const [resultado, setResultado] = useState<ResultadoLanding | null>(null);
  const [tentativa, setTentativa] = useState(0);

  useEffect(() => {
    if (pediuPreview && carregandoAuth) return;
    let ativo = true;
    setResultado(null);
    carregarLanding(slug, { preview })
      .then((r) => ativo && setResultado(r))
      .catch(() => ativo && setResultado({ estado: 'erro' }));
    return () => {
      ativo = false;
    };
  }, [slug, preview, pediuPreview, carregandoAuth, tentativa]);

  const landing = resultado?.estado === 'ok' ? resultado.landing : null;

  useEffect(() => {
    if (!landing) return;
    const tituloAnterior = document.title;
    const descricao = landing.frase_abertura || landing.subtitulo || landing.titulo;
    document.title = `${landing.titulo} | Kaowz`;
    const restaurar = [
      definirMeta('name', 'description', descricao),
      definirMeta('property', 'og:title', `${landing.titulo} | Kaowz`),
      definirMeta('property', 'og:description', descricao),
    ];
    return () => {
      document.title = tituloAnterior;
      restaurar.forEach((fn) => fn());
    };
  }, [landing]);

  return (
    <PublicoLayout>
      {!resultado ? (
        <LandingCarregando />
      ) : resultado.estado !== 'ok' ? (
        <LandingIndisponivel erro={resultado.estado === 'erro'} onTentarDeNovo={() => setTentativa((t) => t + 1)} />
      ) : (
        <LandingConteudo resultado={resultado} preview={preview} />
      )}
    </PublicoLayout>
  );
}

/**
 * Seções da página + medição. Fica num componente próprio porque o useInView
 * só observa o elemento que existe na montagem (o conteúdo chega depois do carregamento).
 * Nada é registrado em modo preview.
 */
function LandingConteudo({ resultado, preview }: { resultado: Extract<ResultadoLanding, { estado: 'ok' }>; preview: boolean }) {
  const { landing, passos, laminas } = resultado;
  const fechamento = useRef<HTMLElement>(null);
  const chegouAoFim = useInView(fechamento, { once: true, amount: 0.4 });
  const visitaRegistrada = useRef<string | null>(null);

  useEffect(() => {
    if (preview || visitaRegistrada.current === landing.id) return;
    visitaRegistrada.current = landing.id;
    registrarEvento(landing.id, 'visita');
  }, [landing.id, preview]);

  useEffect(() => {
    if (preview || !chegouAoFim) return;
    // Uma vez por sessão: voltar ao fim da página no mesmo acesso não conta de novo.
    const chave = `kaowz_landing_fim_${landing.id}`;
    try {
      if (sessionStorage.getItem(chave)) return;
      sessionStorage.setItem(chave, '1');
    } catch {
      /* sem sessionStorage (aba anônima restrita): registra uma vez por visita à página */
    }
    registrarEvento(landing.id, 'fim_scroll');
  }, [chegouAoFim, landing.id, preview]);

  const clique = (cta: CtaEvento, modeloId?: string) =>
    registrarEvento(landing.id, 'clique_cta', { cta, modeloId }, { preview });
  const cliqueLamina = (l: LaminaResolvida) => clique(l.cta, l.modelo.id);

  return (
    <>
      <Abertura landing={landing} preview={preview} />
      <PassosScrolly passos={passos} landing={landing} />
      <EscadaValor landing={landing} laminas={laminas} onClique={cliqueLamina} />
      <Comparativo laminas={laminas} onClique={cliqueLamina} />
      <Fechamento
        ref={fechamento}
        linkVendedor={linkWhatsApp(mensagemVendedor(landing.mensagem_whatsapp))}
        onQuiz={() => clique('quiz')}
        onVendedor={() => clique('vendedor')}
      />
    </>
  );
}
