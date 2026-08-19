import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { PublicoLayout, TituloPublico } from '@/components/publico/PublicoLayout';
import { carregarModelosPublicos, lerRespostas } from '@/lib/publico';
import {
  CASOS_USO,
  TIPOS_PORTE,
  labelDe,
  pesosDeCasoUso,
  pontuar,
  type ModeloRecomendavel,
} from '@/lib/recomendacao';
import { Loader2, Search, ExternalLink, Wrench } from 'lucide-react';

const BRL = (n: number) => n.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
const linkLoja = (nome: string) => `https://kaowz.com.br/search?q=${encodeURIComponent(nome)}`;

export default function Vitrine() {
  const [modelos, setModelos] = useState<ModeloRecomendavel[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [busca, setBusca] = useState('');
  const respostas = useMemo(() => lerRespostas(), []);
  const [usos, setUsos] = useState<string[]>(() => (respostas ? [] : []));
  const [portes, setPortes] = useState<string[]>(() => (respostas?.porte ? [respostas.porte] : []));

  useEffect(() => {
    carregarModelosPublicos().then((m) => { setModelos(m); setCarregando(false); });
  }, []);

  const toggle = (lista: string[], set: (v: string[]) => void, v: string) =>
    set(lista.includes(v) ? lista.filter((x) => x !== v) : [...lista, v]);

  const lista = useMemo(() => {
    const pesos = respostas ? pesosDeCasoUso(respostas) : null;
    return modelos
      .filter((m) => m.nome_modelo.toLowerCase().includes(busca.toLowerCase()))
      .filter((m) => (usos.length ? usos.some((u) => m.casos_uso.includes(u)) : true))
      .filter((m) => (portes.length ? portes.some((p) => m.tipo_porte.includes(p)) : true))
      .sort((a, b) =>
        pesos && respostas ? pontuar(b, respostas, pesos) - pontuar(a, respostas, pesos) : a.preco_base - b.preco_base,
      );
  }, [modelos, busca, usos, portes, respostas]);

  const Chip = ({ ativo, children, onClick }: any) => (
    <button
      type="button"
      onClick={onClick}
      className={`rounded-full border px-3 py-1 text-xs transition-colors ${
        ativo
          ? 'border-[hsl(42_72%_58%)] bg-[hsl(42_72%_58%/0.1)] text-[hsl(42_72%_58%)]'
          : 'border-[hsl(0_0%_20%)] text-[hsl(0_0%_60%)] hover:border-[hsl(0_72%_45%)]'
      }`}
    >
      {children}
    </button>
  );

  return (
    <PublicoLayout mostrarSaida={false}>
      <TituloPublico>Todas as lâminas</TituloPublico>
      {respostas && (
        <p className="mt-1 text-sm text-[hsl(0_0%_58%)]">Ordenadas pelo perfil que você respondeu no quiz.</p>
      )}

      <div className="mt-5 space-y-3">
        <div className="relative">
          <Search className="absolute left-3 top-3 h-4 w-4 text-[hsl(0_0%_45%)]" />
          <input
            value={busca}
            onChange={(e) => setBusca(e.target.value)}
            placeholder="Buscar lâmina..."
            className="w-full rounded border border-[hsl(0_0%_18%)] bg-[hsl(0_0%_8%)] py-2.5 pl-9 pr-3 text-sm outline-none focus:border-[hsl(42_72%_58%)]"
          />
        </div>
        <div className="flex flex-wrap gap-1.5">
          {CASOS_USO.map((c) => (
            <Chip key={c.valor} ativo={usos.includes(c.valor)} onClick={() => toggle(usos, setUsos, c.valor)}>
              {c.label}
            </Chip>
          ))}
        </div>
        <div className="flex flex-wrap gap-1.5">
          {TIPOS_PORTE.map((p) => (
            <Chip key={p.valor} ativo={portes.includes(p.valor)} onClick={() => toggle(portes, setPortes, p.valor)}>
              {p.label}
            </Chip>
          ))}
        </div>
      </div>

      {carregando ? (
        <div className="flex justify-center py-16">
          <Loader2 className="h-6 w-6 animate-spin text-[hsl(0_0%_40%)]" />
        </div>
      ) : (
        <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {lista.map((m) => (
            <div key={m.id} className="overflow-hidden rounded-lg border border-[hsl(0_0%_16%)] bg-[hsl(0_0%_8%)]">
              {m.imagem_modelo && (
                <img src={m.imagem_modelo} alt={m.nome_modelo} loading="lazy" className="h-44 w-full object-cover" />
              )}
              <div className="space-y-2 p-4">
                <h3 className="font-bebas text-2xl tracking-wide">{m.nome_modelo}</h3>
                {m.casos_uso.length > 0 && (
                  <p className="text-[11px] uppercase tracking-widest text-[hsl(0_0%_45%)]">
                    {m.casos_uso.map((c) => labelDe(CASOS_USO, c)).join(' · ')}
                  </p>
                )}
                <p className="font-bebas text-xl text-[hsl(42_72%_58%)]">a partir de {BRL(m.preco_base)}</p>
                <div className="grid grid-cols-2 gap-2 pt-1">
                  <a
                    href={linkLoja(m.nome_modelo)}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center justify-center gap-1.5 rounded border border-[hsl(0_0%_22%)] px-3 py-2 text-[11px] uppercase tracking-widest text-[hsl(0_0%_75%)]"
                  >
                    <ExternalLink className="h-3.5 w-3.5" /> Na loja
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
          ))}
          {lista.length === 0 && (
            <p className="col-span-full py-12 text-center text-sm text-[hsl(0_0%_55%)]">
              Nenhuma lâmina com esses filtros.
            </p>
          )}
        </div>
      )}
    </PublicoLayout>
  );
}
