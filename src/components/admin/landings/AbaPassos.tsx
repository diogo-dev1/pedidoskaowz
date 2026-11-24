import { AlertTriangle, ArrowDown, ArrowUp, Plus, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Campo } from './Campo';
import { MidiaCampo } from './MidiaCampo';
import { novoPasso, type PassoEdicao } from './tipos';

interface Props {
  passos: PassoEdicao[];
  setPassos: (fn: (atual: PassoEdicao[]) => PassoEdicao[]) => void;
  pasta: string;
}

const LIMITE_RECOMENDADO = 6;

export function AbaPassos({ passos, setPassos, pasta }: Props) {
  const alterar = (id: string, campos: Partial<PassoEdicao>) =>
    setPassos((lista) => lista.map((p) => (p.id === id ? { ...p, ...campos } : p)));

  const mover = (indice: number, direcao: -1 | 1) =>
    setPassos((lista) => {
      const alvo = indice + direcao;
      if (alvo < 0 || alvo >= lista.length) return lista;
      const nova = [...lista];
      [nova[indice], nova[alvo]] = [nova[alvo], nova[indice]];
      return nova;
    });

  return (
    <div className="space-y-4">
      <p className="text-sm text-muted-foreground">
        Cada passo é uma tela da rolagem: a mídia fica fixa e o texto passa por cima. Passo sem mídia usa a capa.
      </p>

      {passos.length > LIMITE_RECOMENDADO && (
        <div className="flex items-start gap-2 rounded-lg border border-warning/40 bg-warning/10 p-3 text-sm text-warning">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
          Mais de {LIMITE_RECOMENDADO} passos deixa a rolagem longa no celular. O ideal é de 3 a 6.
        </div>
      )}

      {passos.length === 0 && (
        <div className="rounded-lg border border-dashed p-8 text-center text-sm text-muted-foreground">
          Sem passos, a página vai direto da abertura para as lâminas.
        </div>
      )}

      {passos.map((p, i) => (
        <div key={p.id} className="rounded-lg border bg-card p-4">
          <div className="mb-4 flex items-center justify-between gap-2">
            <p className="text-sm font-medium tabular-nums">Passo {i + 1}</p>
            <div className="flex items-center gap-1">
              <Button type="button" variant="ghost" size="icon" className="h-9 w-9 rounded-lg" onClick={() => mover(i, -1)} disabled={i === 0} aria-label={`Subir passo ${i + 1}`}>
                <ArrowUp />
              </Button>
              <Button type="button" variant="ghost" size="icon" className="h-9 w-9 rounded-lg" onClick={() => mover(i, 1)} disabled={i === passos.length - 1} aria-label={`Descer passo ${i + 1}`}>
                <ArrowDown />
              </Button>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="h-9 w-9 rounded-lg text-muted-foreground hover:text-destructive"
                onClick={() => setPassos((lista) => lista.filter((x) => x.id !== p.id))}
                aria-label={`Remover passo ${i + 1}`}
              >
                <Trash2 />
              </Button>
            </div>
          </div>

          <div className="grid gap-4 lg:grid-cols-2">
            <div className="space-y-4">
              <Campo rotulo="Título" htmlFor={`passo-${p.id}-titulo`} ajuda="Curto, uma ideia só. Ex.: Some sob a roupa">
                <Input
                  id={`passo-${p.id}-titulo`}
                  value={p.titulo}
                  aria-invalid={!p.titulo.trim()}
                  onChange={(e) => alterar(p.id, { titulo: e.target.value })}
                />
              </Campo>
              <Campo rotulo="Texto" htmlFor={`passo-${p.id}-texto`} ajuda="Uma ou duas frases explicando o título.">
                <Textarea
                  id={`passo-${p.id}-texto`}
                  rows={3}
                  value={p.texto ?? ''}
                  onChange={(e) => alterar(p.id, { texto: e.target.value || null })}
                />
              </Campo>
            </div>
            <div className="space-y-4">
              <Campo rotulo="Mídia" ajuda="Imagem ou vídeo deste passo. Vídeo só toca enquanto o passo está na tela.">
                <MidiaCampo
                  idBase={`passo-${p.id}`}
                  url={p.midia_url}
                  tipo={p.midia_tipo}
                  pasta={`${pasta}/passos`}
                  onChange={(url, tipo) => alterar(p.id, { midia_url: url, midia_tipo: tipo })}
                />
              </Campo>
              <Campo rotulo="Foco (legenda)" htmlFor={`passo-${p.id}-foco`} ajuda="Opcional. Legenda curta sobre a mídia, ex.: Clipe em aço mola">
                <Input
                  id={`passo-${p.id}-foco`}
                  value={p.foco ?? ''}
                  onChange={(e) => alterar(p.id, { foco: e.target.value || null })}
                />
              </Campo>
            </div>
          </div>
        </div>
      ))}

      <Button type="button" variant="outline" className="h-11 w-full rounded-lg sm:w-auto" onClick={() => setPassos((lista) => [...lista, novoPasso()])}>
        <Plus /> Adicionar passo
      </Button>
    </div>
  );
}
