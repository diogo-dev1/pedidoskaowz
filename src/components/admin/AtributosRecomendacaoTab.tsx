import { useEffect, useMemo, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { Search, Loader2, Save, ChevronDown } from 'lucide-react';
import {
  CASOS_USO,
  TIPOS_PORTE,
  NIVEIS_ENVOLVIMENTO,
  POSICOES_ESCADA,
  MANUTENCOES,
} from '@/lib/recomendacao';

interface Linha {
  id: string;
  nome_modelo: string;
  imagem_modelo: string | null;
  casos_uso: string[];
  tipo_porte: string[];
  nivel_envolvimento: string[];
  posicao_escada: string | null;
  grupo_escada: string | null;
  forma_enxoval: string[];
  manutencao: string | null;
  porque_texto: string | null;
}

const Chips = ({
  opcoes,
  valores,
  onToggle,
}: {
  opcoes: readonly { valor: string; label: string }[];
  valores: string[];
  onToggle: (v: string) => void;
}) => (
  <div className="flex flex-wrap gap-1.5">
    {opcoes.map((o) => {
      const ativo = valores.includes(o.valor);
      return (
        <button
          key={o.valor}
          type="button"
          onClick={() => onToggle(o.valor)}
          className={`rounded-full border px-2.5 py-1 text-xs transition-colors ${
            ativo
              ? 'border-primary bg-primary text-primary-foreground'
              : 'border-border bg-background text-muted-foreground hover:border-primary/50'
          }`}
        >
          {o.label}
        </button>
      );
    })}
  </div>
);

export function AtributosRecomendacaoTab() {
  const [linhas, setLinhas] = useState<Linha[]>([]);
  const [busca, setBusca] = useState('');
  const [loading, setLoading] = useState(true);
  const [aberto, setAberto] = useState<string | null>(null);
  const [salvando, setSalvando] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      const { data, error } = await supabase
        .from('catalogo_modelos')
        .select(
          'id, nome_modelo, imagem_modelo, casos_uso, tipo_porte, nivel_envolvimento, posicao_escada, grupo_escada, forma_enxoval, manutencao, porque_texto',
        )
        .eq('visivel_catalogo', true)
        .order('nome_modelo');
      if (error) toast.error('Erro ao carregar lâminas');
      else
        setLinhas(
          (data as any[]).map((m) => ({
            ...m,
            casos_uso: m.casos_uso ?? [],
            tipo_porte: m.tipo_porte ?? [],
            nivel_envolvimento: m.nivel_envolvimento ?? [],
            forma_enxoval: m.forma_enxoval ?? [],
          })),
        );
      setLoading(false);
    })();
  }, []);

  const filtradas = useMemo(
    () => linhas.filter((l) => l.nome_modelo.toLowerCase().includes(busca.toLowerCase())),
    [linhas, busca],
  );

  const patch = (id: string, campo: keyof Linha, valor: any) =>
    setLinhas((prev) => prev.map((l) => (l.id === id ? { ...l, [campo]: valor } : l)));

  const toggle = (id: string, campo: 'casos_uso' | 'tipo_porte' | 'nivel_envolvimento' | 'forma_enxoval', v: string) =>
    setLinhas((prev) =>
      prev.map((l) =>
        l.id === id
          ? { ...l, [campo]: l[campo].includes(v) ? l[campo].filter((x) => x !== v) : [...l[campo], v] }
          : l,
      ),
    );

  const salvar = async (l: Linha) => {
    setSalvando(l.id);
    const { error } = await supabase
      .from('catalogo_modelos')
      .update({
        casos_uso: l.casos_uso,
        tipo_porte: l.tipo_porte,
        nivel_envolvimento: l.nivel_envolvimento,
        posicao_escada: l.posicao_escada,
        grupo_escada: l.grupo_escada,
        forma_enxoval: l.forma_enxoval,
        manutencao: l.manutencao,
        porque_texto: l.porque_texto,
      } as any)
      .eq('id', l.id);
    setSalvando(null);
    if (error) toast.error('Erro ao salvar atributos');
    else toast.success(`${l.nome_modelo} atualizada`);
  };

  const cadastradas = linhas.filter((l) => l.casos_uso.length > 0).length;

  if (loading)
    return (
      <div className="flex justify-center py-10">
        <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
      </div>
    );

  return (
    <div className="space-y-3">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div className="relative flex-1">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar lâmina..."
            value={busca}
            onChange={(e) => setBusca(e.target.value)}
            className="pl-8"
          />
        </div>
        <Badge variant="secondary" className="self-start sm:self-auto">
          {cadastradas}/{linhas.length} com atributos
        </Badge>
      </div>

      <p className="text-xs text-muted-foreground">
        Esses atributos alimentam o quiz de descoberta público. Lâmina sem caso de uso não é recomendada.
      </p>

      {filtradas.map((l) => {
        const expandido = aberto === l.id;
        return (
          <Card key={l.id}>
            <CardContent className="p-3">
              <button
                type="button"
                className="flex w-full items-center gap-3 text-left"
                onClick={() => setAberto(expandido ? null : l.id)}
              >
                {l.imagem_modelo && (
                  <img src={l.imagem_modelo} alt={l.nome_modelo} className="h-10 w-10 rounded object-cover" />
                )}
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium">{l.nome_modelo}</p>
                  <p className="truncate text-xs text-muted-foreground">
                    {l.casos_uso.length
                      ? l.casos_uso.map((c) => CASOS_USO.find((x) => x.valor === c)?.label ?? c).join(' · ')
                      : 'Sem atributos'}
                  </p>
                </div>
                <ChevronDown className={`h-4 w-4 shrink-0 transition-transform ${expandido ? 'rotate-180' : ''}`} />
              </button>

              {expandido && (
                <div className="mt-4 space-y-4 border-t pt-4">
                  <div className="space-y-1.5">
                    <Label className="text-xs">Casos de uso</Label>
                    <Chips opcoes={CASOS_USO} valores={l.casos_uso} onToggle={(v) => toggle(l.id, 'casos_uso', v)} />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs">Tipo de porte</Label>
                    <Chips opcoes={TIPOS_PORTE} valores={l.tipo_porte} onToggle={(v) => toggle(l.id, 'tipo_porte', v)} />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs">Nível de envolvimento</Label>
                    <Chips
                      opcoes={NIVEIS_ENVOLVIMENTO}
                      valores={l.nivel_envolvimento}
                      onToggle={(v) => toggle(l.id, 'nivel_envolvimento', v)}
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs">Manutenção</Label>
                    <Chips
                      opcoes={MANUTENCOES}
                      valores={l.manutencao ? [l.manutencao] : []}
                      onToggle={(v) => patch(l.id, 'manutencao', l.manutencao === v ? null : v)}
                    />
                  </div>
                  <div className="grid gap-3 sm:grid-cols-2">
                    <div className="space-y-1.5">
                      <Label className="text-xs">Posição na escada</Label>
                      <Chips
                        opcoes={POSICOES_ESCADA}
                        valores={l.posicao_escada ? [l.posicao_escada] : []}
                        onToggle={(v) => patch(l.id, 'posicao_escada', l.posicao_escada === v ? null : v)}
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-xs">Grupo da escada</Label>
                      <Input
                        value={l.grupo_escada ?? ''}
                        placeholder="ex: edc-urbano"
                        onChange={(e) => patch(l.id, 'grupo_escada', e.target.value)}
                      />
                    </div>
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs">Compõe enxoval com</Label>
                    <div className="max-h-40 overflow-y-auto rounded border p-2">
                      <Chips
                        opcoes={linhas
                          .filter((o) => o.id !== l.id)
                          .map((o) => ({ valor: o.id, label: o.nome_modelo }))}
                        valores={l.forma_enxoval}
                        onToggle={(v) => toggle(l.id, 'forma_enxoval', v)}
                      />
                    </div>
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs">Porquê exibido na recomendação</Label>
                    <Textarea
                      rows={2}
                      value={l.porque_texto ?? ''}
                      placeholder="Texto curto que substitui o atendimento humano."
                      onChange={(e) => patch(l.id, 'porque_texto', e.target.value)}
                    />
                  </div>
                  <Button size="sm" onClick={() => salvar(l)} disabled={salvando === l.id}>
                    {salvando === l.id ? (
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    ) : (
                      <Save className="mr-2 h-4 w-4" />
                    )}
                    Salvar
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
