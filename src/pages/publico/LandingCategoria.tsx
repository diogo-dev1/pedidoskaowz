import { useEffect, useState } from 'react';
import { useParams, useSearchParams } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { PublicoLayout } from '@/components/publico/PublicoLayout';
import { carregarLanding, mensagemVendedor, type ResultadoLanding } from '@/lib/landings';
import { linkWhatsApp } from '@/lib/publico';
import { Abertura } from '@/components/publico/landing/Abertura';
import { PassosLista } from '@/components/publico/landing/PassosLista';
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
        <>
          <Abertura landing={resultado.landing} preview={preview} />
          <PassosLista passos={resultado.passos} landing={resultado.landing} />
          <EscadaValor landing={resultado.landing} laminas={resultado.laminas} />
          <Comparativo laminas={resultado.laminas} />
          <Fechamento linkVendedor={linkWhatsApp(mensagemVendedor(resultado.landing.mensagem_whatsapp))} />
        </>
      )}
    </PublicoLayout>
  );
}
