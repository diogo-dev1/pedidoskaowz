import { useMemo, useState } from 'react';
import { toast } from 'sonner';
import { Loader2, Plus, Search, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { CASOS_USO, TIPOS_PORTE, POSICOES_ESCADA, labelDe } from '@/lib/recomendacao';
import { agruparPorGrupo, bateComFiltros, formatarBRL, type ModeloLanding } from '@/lib/landings';
import { ChipFiltro } from './ChipFiltro';

interface Props {
  modelos: ModeloLanding[];
  carregando: boolean;
  /** Modelos que já estão na landing (aparecem marcados e travados). */
  jaAdicionados: Set<string>;
  filtrosLanding: { casosUso: string[]; tiposPorte: string[] };
  onAdicionar: (modelos: ModeloLanding[]) => void;
}

const alternar = (lista: string[], valor: string) =>
  lista.includes(valor) ? lista.filter((x) => x !== valor) : [...lista, valor];

export function SeletorModelos({ modelos, carregando, jaAdicionados, filtrosLanding, onAdicionar }: Props) {
  const [busca, setBusca] = useState('');
  const [usos, setUsos] = useState<string[]>([]);
  const [portes, setPortes] = useState<string[]>([]);
  const [marcados, setMarcados] = useState<Set<string>>(new Set());

  const grupos = useMemo(() => {
    const termo = busca.trim().toLowerCase();
    return agruparPorGrupo(
      modelos
        .filter((m) => !termo || m.nome_modelo.toLowerCase().includes(termo))
        .filter((m) => bateComFiltros(m, { casosUso: usos, tiposPorte: portes })),
    );
  }, [modelos, busca, usos, portes]);

  const total = grupos.reduce((n, g) => n + g.modelos.length, 0);

  const sugerir = () => {
    if (!filtrosLanding.casosUso.length && !filtrosLanding.tiposPorte.length) {
      toast.info('Marque os filtros desta landing (acima) para receber sugestões.');
      return;
    }
    setBusca('');
    setUsos(filtrosLanding.casosUso);
    setPortes(filtrosLanding.tiposPorte);
  };

  const adicionar = () => {
    const escolhidos = modelos.filter((m) => marcados.has(m.id) && !jaAdicionados.has(m.id));
    if (!escolhidos.length) return;
    onAdicionar(escolhidos);
    setMarcados(new Set());
  };

  const marcar = (id: string, valor: boolean) =>
    setMarcados((atual) => {
      const novo = new Set(atual);
      if (valor) novo.add(id);
      else novo.delete(id);
      return novo;
    });

  return (
    <div className="space-y-3 rounded-lg border bg-card p-4">
      <div className="flex flex-col gap-2 sm:flex-row">
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" aria-hidden />
          <Input
            type="search"
            aria-label="Buscar modelo"
            placeholder="Buscar modelo"
            value={busca}
            onChange={(e) => setBusca(e.target.value)}
            className="h-10 pl-9 text-base md:text-sm"
          />
        </div>
        <Button type="button" variant="outline" className="h-10 rounded-lg" onClick={sugerir}>
          <Sparkles /> Sugerir pelo filtro
        </Button>
      </div>

      <div className="space-y-2">
        <div className="flex flex-wrap gap-1.5" role="group" aria-label="Caso de uso">
          {CASOS_USO.map((c) => (
            <ChipFiltro key={c.valor} ativo={usos.includes(c.valor)} onClick={() => setUsos((l) => alternar(l, c.valor))}>
              {c.label}
            </ChipFiltro>
          ))}
        </div>
        <div className="flex flex-wrap gap-1.5" role="group" aria-label="Tipo de porte">
          {TIPOS_PORTE.map((p) => (
            <ChipFiltro key={p.valor} ativo={portes.includes(p.valor)} onClick={() => setPortes((l) => alternar(l, p.valor))}>
              {p.label}
            </ChipFiltro>
          ))}
        </div>
      </div>

      <div className="max-h-[420px] overflow-y-auto rounded-lg border">
        {carregando ? (
          <div className="flex items-center gap-2 p-4 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" aria-hidden /> Carregando catálogo…
          </div>
        ) : total === 0 ? (
          <p className="p-4 text-sm text-muted-foreground">Nenhum modelo público com esses filtros.</p>
        ) : (
          grupos.map((g) => (
            <div key={g.grupo}>
              <p className="sticky top-0 z-10 border-b bg-muted px-3 py-1.5 text-xs font-medium text-muted-foreground">
                {g.grupo} <span className="tabular-nums">· {g.modelos.length}</span>
              </p>
              <ul>
                {g.modelos.map((m) => {
                  const ja = jaAdicionados.has(m.id);
                  const id = `seletor-${m.id}`;
                  return (
                    <li key={m.id} className="border-b last:border-b-0">
                      <label htmlFor={id} className={`flex min-h-14 items-center gap-3 px-3 py-2 ${ja ? 'opacity-60' : 'cursor-pointer hover:bg-muted/60'}`}>
                        <Checkbox id={id} checked={ja || marcados.has(m.id)} disabled={ja} onCheckedChange={(v) => marcar(m.id, v === true)} />
                        <div className="h-10 w-8 shrink-0 overflow-hidden rounded bg-muted">
                          {m.imagem_modelo && <img src={m.imagem_modelo} alt="" loading="lazy" className="h-full w-full object-cover" />}
                        </div>
                        <span className="min-w-0 flex-1">
                          <span className="block truncate text-sm">{m.nome_modelo}</span>
                          <span className="block text-xs text-muted-foreground">
                            {m.posicao_escada ? labelDe(POSICOES_ESCADA, m.posicao_escada) : 'Sem posição na escada'}
                            {ja && ' · já está na landing'}
                          </span>
                        </span>
                        <span className="shrink-0 text-sm tabular-nums text-muted-foreground">{formatarBRL(Number(m.preco_base))}</span>
                      </label>
                    </li>
                  );
                })}
              </ul>
            </div>
          ))
        )}
      </div>

      <div className="flex items-center justify-between gap-3">
        <p className="text-xs text-muted-foreground tabular-nums">{total} modelos</p>
        <Button type="button" className="h-10 rounded-lg" disabled={marcados.size === 0} onClick={adicionar}>
          <Plus /> Adicionar {marcados.size > 0 ? marcados.size : ''} {marcados.size === 1 ? 'selecionada' : 'selecionadas'}
        </Button>
      </div>
    </div>
  );
}
