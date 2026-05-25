import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Check, Loader2, AlertCircle, MessageCircle } from 'lucide-react';

interface Orcamento {
  descricao: string;
  valor: number;
  parcelas_sem_juros_max: number;
  parcelas_max: number;
  observacao: string | null;
  whatsapp: string | null;
  ativo: boolean;
}

interface Taxa {
  parcelas: number;
  taxa_percentual: number;
  rotulo: string | null;
  ativo: boolean;
}

interface Opcao {
  parcelas: number;
  rotulo: string;
  valorParcela: number;
  semJuros: boolean;
}

function fmt(v: number) {
  return v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

export default function ParcelamentoPublico() {
  const { slug } = useParams<{ slug: string }>();
  const [orc, setOrc] = useState<Orcamento | null>(null);
  const [opcoes, setOpcoes] = useState<Opcao[]>([]);
  const [selecionada, setSelecionada] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [erro, setErro] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      if (!slug) return;
      const { data: o, error } = await supabase
        .from('parcelamento_orcamentos')
        .select('*')
        .eq('slug', slug)
        .eq('ativo', true)
        .maybeSingle();
      if (error || !o) {
        setErro('Orçamento não encontrado ou expirado.');
        setLoading(false);
        return;
      }
      const orcData = o as Orcamento;
      setOrc(orcData);

      const { data: ts } = await supabase
        .from('parcelamento_taxas')
        .select('*')
        .eq('ativo', true)
        .order('parcelas');
      const taxas = (ts as Taxa[]) || [];

      const list: Opcao[] = [];
      for (const t of taxas) {
        if (t.parcelas > orcData.parcelas_max) continue;
        const semJuros = t.parcelas <= orcData.parcelas_sem_juros_max;
        const totalCobrado = semJuros
          ? Number(orcData.valor)
          : Number(orcData.valor) / (1 - Number(t.taxa_percentual) / 100);
        list.push({
          parcelas: t.parcelas,
          rotulo: t.rotulo || (t.parcelas === 1 ? 'À vista' : `${t.parcelas}x`),
          valorParcela: totalCobrado / t.parcelas,
          semJuros,
        });
      }
      setOpcoes(list);
      setLoading(false);
    })();
  }, [slug]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
      </div>
    );
  }

  if (erro || !orc) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-background p-6 text-center gap-3">
        <AlertCircle className="h-10 w-10 text-muted-foreground" />
        <h1 className="text-lg font-semibold">Link indisponível</h1>
        <p className="text-sm text-muted-foreground">{erro}</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-lg mx-auto p-4 space-y-5">
        <header className="text-center space-y-1 pt-4">
          <p className="text-xs uppercase tracking-wider text-muted-foreground">Simulação de parcelamento</p>
          <h1 className="text-xl font-bold text-foreground">{orc.descricao}</h1>
          <p className="text-3xl font-bold text-primary mt-2">{fmt(Number(orc.valor))}</p>
          <p className="text-xs text-muted-foreground">Valor total à vista</p>
        </header>

        {orc.observacao && (
          <div className="bg-muted/50 rounded-lg p-3 text-sm text-foreground/80 text-center">
            {orc.observacao}
          </div>
        )}

        <div className="space-y-2">
          <p className="text-sm font-medium text-foreground px-1">
            Escolha como prefere pagar:
          </p>

          {opcoes.map((op) => {
            const sel = selecionada === op.parcelas;
            const total = op.valorParcela * op.parcelas;
            return (
              <button
                key={op.parcelas}
                onClick={() => setSelecionada(op.parcelas)}
                className={`w-full text-left rounded-xl border-2 p-4 transition-all ${
                  sel
                    ? 'border-primary bg-primary/5 shadow-sm'
                    : 'border-border bg-card hover:border-primary/40'
                }`}
              >
                <div className="flex items-center justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-sm font-semibold text-foreground">{op.rotulo}</span>
                      {op.semJuros && (
                        <span className="text-[10px] font-bold uppercase tracking-wider bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 px-1.5 py-0.5 rounded">
                          Sem juros
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {op.parcelas}x de
                    </p>
                    <p className="text-lg font-bold text-foreground mt-0.5">
                      {fmt(op.valorParcela)}
                    </p>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      Total: <span className="font-medium text-foreground/80">{fmt(total)}</span>
                    </p>
                  </div>
                  <div
                    className={`w-6 h-6 rounded-full flex items-center justify-center shrink-0 ${
                      sel ? 'bg-primary' : 'border-2 border-muted-foreground/30'
                    }`}
                  >
                    {sel && <Check className="h-4 w-4 text-primary-foreground" />}
                  </div>
                </div>
              </button>
            );
          })}
        </div>

        {selecionada !== null && (() => {
          const op = opcoes.find((o) => o.parcelas === selecionada)!;
          const msg =
            `Olá! Quero seguir com a compra de *${orc.descricao}* (${fmt(Number(orc.valor))}).\n\n` +
            `Forma de pagamento escolhida: *${op.parcelas}x de ${fmt(op.valorParcela)}*` +
            (op.semJuros ? ' (sem juros)' : '') + '.';
          const numero = (orc.whatsapp || '').replace(/\D/g, '');
          const waUrl = numero
            ? `https://wa.me/${numero}?text=${encodeURIComponent(msg)}`
            : `https://wa.me/?text=${encodeURIComponent(msg)}`;
          return (
            <div className="bg-primary/5 border border-primary/20 rounded-xl p-4 text-center space-y-3 sticky bottom-3">
              <div>
                <p className="text-xs text-muted-foreground uppercase tracking-wider">Sua escolha</p>
                <p className="text-base font-semibold text-foreground">
                  {op.parcelas}x de {fmt(op.valorParcela)}
                </p>
              </div>
              <a
                href={waUrl}
                target="_blank"
                rel="noreferrer"
                className="inline-flex w-full items-center justify-center gap-2 bg-emerald-500 hover:bg-emerald-600 text-white font-semibold rounded-lg px-4 py-3 transition-colors"
              >
                <MessageCircle className="h-5 w-5" />
                Confirmar pelo WhatsApp
              </a>
            </div>
          );
        })()}

        <p className="text-[10px] text-center text-muted-foreground pt-4 pb-6">
          Valores sujeitos à confirmação no momento do pagamento.
        </p>
      </div>
    </div>
  );
}
