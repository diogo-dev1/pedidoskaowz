import { useEffect, useMemo, useState } from 'react';
import { PublicoLayout, TituloPublico } from '@/components/publico/PublicoLayout';
import LaminaCard from '@/components/publico/LaminaCard';
import { carregarModelosPublicos, lerRespostas } from '@/lib/publico';
import {
  CASOS_USO,
  TIPOS_PORTE,
  labelDe,
  pesosDeCasoUso,
  pontuar,
  type ModeloRecomendavel,
} from '@/lib/recomendacao';
import { Badge } from '@/components/ui/badge';
import { Loader2, Search } from 'lucide-react';

export default function Vitrine() {
  const [modelos, setModelos] = useState<ModeloRecomendavel[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [busca, setBusca] = useState('');
  const respostas = useMemo(() => lerRespostas(), []);
  const [usos, setUsos] = useState<string[]>([]);
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
      className={`rounded-full px-2.5 py-1 text-[11px] font-medium transition-colors ${
        ativo ? 'bg-accent text-white' : 'bg-zinc-800 text-zinc-300 hover:bg-zinc-700'
      }`}
    >
      {children}
    </button>
  );

  return (
    <PublicoLayout mostrarSaida={false}>
      <TituloPublico>
        TODAS AS <span className="text-accent">LÂMINAS</span>
      </TituloPublico>
      {respostas && (
        <p className="mt-1 text-sm text-zinc-400">Ordenadas pelo perfil que você respondeu no quiz.</p>
      )}

      <div className="mt-5 space-y-3 rounded-lg border border-zinc-800 bg-zinc-900 p-3">
        <div className="relative">
          <Search className="absolute left-3 top-3 h-4 w-4 text-zinc-500" />
          <input
            value={busca}
            onChange={(e) => setBusca(e.target.value)}
            placeholder="Buscar lâminas..."
            className="w-full rounded-lg border border-zinc-700 bg-zinc-800 py-2.5 pl-9 pr-3 text-sm text-white outline-none placeholder:text-zinc-500 focus:border-accent"
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
        <div className="mt-6 grid grid-cols-2 gap-1.5 md:gap-4 lg:grid-cols-3">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="animate-pulse rounded-lg border border-zinc-700 bg-zinc-800 p-3">
              <div className="mb-2 aspect-[3/4] rounded-lg bg-zinc-700" />
              <div className="mb-1.5 h-3 rounded bg-zinc-700" />
              <div className="h-5 w-1/2 rounded bg-zinc-700" />
            </div>
          ))}
        </div>
      ) : (
        <>
          <div className="mt-5 flex items-center justify-between">
            <p className="text-sm text-zinc-400">
              Mostrando {lista.length} {lista.length === 1 ? 'lâmina' : 'lâminas'}
            </p>
            {(usos.length > 0 || portes.length > 0) && (
              <Badge className="border-0 bg-accent text-white">{usos.length + portes.length} filtro(s)</Badge>
            )}
          </div>

          <div className="mt-3 grid grid-cols-2 gap-1.5 md:gap-4 lg:grid-cols-3">
            {lista.map((m) => (
              <LaminaCard
                key={m.id}
                modelo={m}
                etiqueta={m.casos_uso.length ? labelDe(CASOS_USO, m.casos_uso[0]) : undefined}
              />
            ))}
          </div>
          {lista.length === 0 && (
            <div className="py-12 text-center">
              <p className="text-zinc-400">Nenhuma lâmina com esses filtros.</p>
            </div>
          )}
        </>
      )}
    </PublicoLayout>
  );
}
