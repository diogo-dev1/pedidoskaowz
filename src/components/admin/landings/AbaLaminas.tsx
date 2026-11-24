import { useMemo } from 'react';
import { CASOS_USO, TIPOS_PORTE } from '@/lib/recomendacao';
import { NIVEIS, NIVEL_LABEL, nivelEfetivo, type LandingEdicao, type ModeloLanding, type NivelLanding } from '@/lib/landings';
import { ChipFiltro } from './ChipFiltro';
import { LaminaEscolhida } from './LaminaEscolhida';
import { SeletorModelos } from './SeletorModelos';
import type { AtualizarLanding, LaminaEditor } from './tipos';

interface Props {
  landing: LandingEdicao;
  atualizar: AtualizarLanding;
  laminas: LaminaEditor[];
  setLaminas: (fn: (atual: LaminaEditor[]) => LaminaEditor[]) => void;
  modelos: ModeloLanding[];
  carregandoModelos: boolean;
}

const nivelDe = (l: LaminaEditor): NivelLanding => nivelEfetivo(l, { posicao_escada: l.modelo?.posicao_escada ?? null });

const alternar = (lista: string[], valor: string) =>
  lista.includes(valor) ? lista.filter((x) => x !== valor) : [...lista, valor];

export function AbaLaminas({ landing, atualizar, laminas, setLaminas, modelos, carregandoModelos }: Props) {
  const jaAdicionados = useMemo(() => new Set(laminas.map((l) => l.modelo_id)), [laminas]);

  const adicionar = (novos: ModeloLanding[]) =>
    setLaminas((lista) => [
      ...lista,
      ...novos.map((m) => ({
        modelo_id: m.id,
        modelo: m,
        nivel_override: null,
        texto_categoria: null,
        preco_override: null,
        cta_override: null,
        url_compra: null,
        destaque: false,
      })),
    ]);

  const alterar = (modeloId: string, campos: Partial<LaminaEditor>) =>
    setLaminas((lista) => lista.map((l) => (l.modelo_id === modeloId ? { ...l, ...campos } : l)));

  /** Troca de lugar com a vizinha do mesmo nível (a ordem vale dentro de cada nível). */
  const mover = (modeloId: string, direcao: -1 | 1) =>
    setLaminas((lista) => {
      const i = lista.findIndex((l) => l.modelo_id === modeloId);
      if (i < 0) return lista;
      const nivel = nivelDe(lista[i]);
      let j = i + direcao;
      while (j >= 0 && j < lista.length && nivelDe(lista[j]) !== nivel) j += direcao;
      if (j < 0 || j >= lista.length) return lista;
      const nova = [...lista];
      [nova[i], nova[j]] = [nova[j], nova[i]];
      return nova;
    });

  return (
    <div className="space-y-6">
      <section className="space-y-3">
        <div>
          <h2 className="text-base font-medium">Filtros desta landing</h2>
          <p className="text-xs text-muted-foreground">Servem só para o botão "Sugerir pelo filtro". Não mudam o que aparece na página.</p>
        </div>
        <div className="flex flex-wrap gap-1.5" role="group" aria-label="Casos de uso da landing">
          {CASOS_USO.map((c) => (
            <ChipFiltro
              key={c.valor}
              ativo={landing.filtro_casos_uso.includes(c.valor)}
              onClick={() => atualizar('filtro_casos_uso', alternar(landing.filtro_casos_uso, c.valor))}
            >
              {c.label}
            </ChipFiltro>
          ))}
        </div>
        <div className="flex flex-wrap gap-1.5" role="group" aria-label="Tipos de porte da landing">
          {TIPOS_PORTE.map((p) => (
            <ChipFiltro
              key={p.valor}
              ativo={landing.filtro_tipo_porte.includes(p.valor)}
              onClick={() => atualizar('filtro_tipo_porte', alternar(landing.filtro_tipo_porte, p.valor))}
            >
              {p.label}
            </ChipFiltro>
          ))}
        </div>
      </section>

      <section className="space-y-3">
        <div>
          <h2 className="text-base font-medium">Escolher lâminas do catálogo</h2>
          <p className="text-xs text-muted-foreground">
            Agrupadas por família: o catálogo tem várias versões do mesmo modelo, escolha uma por família.
          </p>
        </div>
        <SeletorModelos
          modelos={modelos}
          carregando={carregandoModelos}
          jaAdicionados={jaAdicionados}
          filtrosLanding={{ casosUso: landing.filtro_casos_uso, tiposPorte: landing.filtro_tipo_porte }}
          onAdicionar={adicionar}
        />
      </section>

      <section className="space-y-4">
        <div>
          <h2 className="text-base font-medium">
            Lâminas desta landing <span className="tabular-nums text-muted-foreground">· {laminas.length}</span>
          </h2>
          <p className="text-xs text-muted-foreground">Toque numa lâmina para editar nível, preço, botão e texto.</p>
        </div>

        {laminas.length === 0 ? (
          <div className="rounded-lg border border-dashed p-8 text-center text-sm text-muted-foreground">
            Nenhuma lâmina escolhida. Use a lista acima para adicionar.
          </div>
        ) : (
          NIVEIS.map((nivel) => {
            const doNivel = laminas.filter((l) => nivelDe(l) === nivel);
            if (!doNivel.length) return null;
            return (
              <div key={nivel} className="space-y-2">
                <p className="text-sm font-medium">
                  {NIVEL_LABEL[nivel]} <span className="tabular-nums text-muted-foreground">· {doNivel.length}</span>
                </p>
                {doNivel.map((l, i) => (
                  <LaminaEscolhida
                    key={l.modelo_id}
                    lamina={l}
                    landing={landing}
                    alterar={(campos) => alterar(l.modelo_id, campos)}
                    remover={() => setLaminas((lista) => lista.filter((x) => x.modelo_id !== l.modelo_id))}
                    subir={i > 0 ? () => mover(l.modelo_id, -1) : undefined}
                    descer={i < doNivel.length - 1 ? () => mover(l.modelo_id, 1) : undefined}
                  />
                ))}
              </div>
            );
          })
        )}
      </section>
    </div>
  );
}
