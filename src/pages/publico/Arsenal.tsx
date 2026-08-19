import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { PublicoLayout, TituloPublico } from '@/components/publico/PublicoLayout';
import { abrirArsenal, gravarToken, linkWhatsApp, removerProjeto, tirarDoPapel } from '@/lib/publico';
import { toast } from 'sonner';
import { Loader2, MessageCircle, Share2, Trash2, Plus, Copy } from 'lucide-react';

const BRL = (n: number) => n.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

interface Projeto {
  id: string;
  nome: string;
  modelo_nome: string | null;
  preco: number | null;
  resumo: string | null;
  tirar_do_papel: boolean;
  created_at: string;
}

export default function Arsenal() {
  const { token = '' } = useParams();
  const [projetos, setProjetos] = useState<Projeto[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState(false);

  const carregar = async () => {
    try {
      const res = await abrirArsenal(token);
      setProjetos(res.projetos as Projeto[]);
      gravarToken(token);
    } catch {
      setErro(true);
    } finally {
      setCarregando(false);
    }
  };

  useEffect(() => { carregar(); /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, [token]);

  const link = `${window.location.origin}/arsenal/${token}`;

  const copiarLink = async () => {
    try { await navigator.clipboard.writeText(link); toast.success('Link copiado — guarde no seu WhatsApp'); }
    catch { toast.error('Não foi possível copiar'); }
  };

  const compartilhar = async (p: Projeto) => {
    const texto = `${p.nome} · Kaowz\n${p.modelo_nome ?? ''}\n${p.resumo ?? ''}`;
    if (navigator.share) {
      try { await navigator.share({ title: `${p.nome} · Kaowz`, text: texto, url: link }); return; } catch { /* cancelado */ }
    }
    try { await navigator.clipboard.writeText(`${texto}\n${link}`); toast.success('Projeto copiado'); }
    catch { toast.error('Não foi possível compartilhar'); }
  };

  const falar = async (p: Projeto) => {
    try { await tirarDoPapel(token, p.id); } catch { /* segue mesmo assim */ }
    const msg = [
      'Olá! Tenho um projeto guardado no meu arsenal Kaowz e quero tirar do papel:',
      '',
      `Projeto: ${p.nome}`,
      p.modelo_nome ?? '',
      p.resumo ?? '',
      p.preco ? `\nValor estimado: ${BRL(p.preco)}` : '',
      `\n${link}`,
    ].join('\n');
    window.open(linkWhatsApp(msg), '_blank');
    carregar();
  };

  const remover = async (p: Projeto) => {
    try {
      await removerProjeto(token, p.id);
      setProjetos((prev) => prev.filter((x) => x.id !== p.id));
    } catch { toast.error('Não foi possível remover'); }
  };

  return (
    <PublicoLayout>
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <TituloPublico>Meu arsenal</TituloPublico>
          <p className="mt-1 text-sm text-[hsl(0_0%_58%)]">
            Este link é seu e não expira. Guarde no seu WhatsApp para voltar quando quiser.
          </p>
        </div>
        <button
          type="button"
          onClick={copiarLink}
          className="flex items-center gap-2 rounded border border-[hsl(0_0%_22%)] px-3 py-2 text-[11px] uppercase tracking-widest text-[hsl(0_0%_75%)]"
        >
          <Copy className="h-3.5 w-3.5" /> Copiar link
        </button>
      </div>

      {carregando ? (
        <div className="flex justify-center py-16">
          <Loader2 className="h-6 w-6 animate-spin text-[hsl(0_0%_40%)]" />
        </div>
      ) : erro ? (
        <p className="py-16 text-center text-sm text-[hsl(0_0%_55%)]">Arsenal não encontrado.</p>
      ) : (
        <div className="mt-6 grid gap-4 sm:grid-cols-2">
          {projetos.map((p) => (
            <div key={p.id} className="rounded-lg border border-[hsl(0_0%_16%)] bg-[hsl(0_0%_8%)] p-4">
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <h3 className="font-bebas text-2xl tracking-wide">{p.nome}</h3>
                  <p className="text-xs uppercase tracking-widest text-[hsl(0_0%_45%)]">{p.modelo_nome}</p>
                </div>
                <button type="button" onClick={() => remover(p)} className="text-[hsl(0_0%_35%)] hover:text-[hsl(0_72%_45%)]">
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
              <pre className="mt-3 whitespace-pre-wrap font-sans text-xs leading-relaxed text-[hsl(0_0%_62%)]">
                {p.resumo}
              </pre>
              {p.preco != null && (
                <p className="mt-3 font-bebas text-2xl text-[hsl(42_72%_58%)]">{BRL(p.preco)}</p>
              )}
              <div className="mt-4 grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => compartilhar(p)}
                  className="flex items-center justify-center gap-1.5 rounded border border-[hsl(0_0%_22%)] px-3 py-2 text-[11px] uppercase tracking-widest text-[hsl(0_0%_75%)]"
                >
                  <Share2 className="h-3.5 w-3.5" /> Compartilhar
                </button>
                <button
                  type="button"
                  onClick={() => falar(p)}
                  className="flex items-center justify-center gap-1.5 rounded bg-[hsl(0_72%_45%)] px-3 py-2 text-[11px] font-semibold uppercase tracking-widest text-white"
                >
                  <MessageCircle className="h-3.5 w-3.5" /> Tirar do papel
                </button>
              </div>
            </div>
          ))}

          <Link
            to="/montar"
            className="flex min-h-[160px] items-center justify-center gap-2 rounded-lg border border-dashed border-[hsl(0_0%_20%)] text-xs uppercase tracking-widest text-[hsl(0_0%_50%)] transition-colors hover:border-[hsl(42_72%_58%)] hover:text-[hsl(42_72%_58%)]"
          >
            <Plus className="h-4 w-4" /> Montar outra
          </Link>
        </div>
      )}
    </PublicoLayout>
  );
}
