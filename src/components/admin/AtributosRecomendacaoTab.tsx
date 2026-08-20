import { useEffect, useMemo, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { toast } from 'sonner';
import { Search, Loader2, Save, ChevronDown, Wand2, AlertTriangle, EyeOff } from 'lucide-react';
import {
  CASOS_USO,
  TIPOS_PORTE,
  NIVEIS_ENVOLVIMENTO,
  POSICOES_ESCADA,
  MANUTENCOES,
  GRUPOS_ESCADA,
} from '@/lib/recomendacao';

interface Linha {
  id: string;
  nome_modelo: string;
  imagem_modelo: string | null;
  video_url: string | null;
  categoria: string | null;
  categorias: string[];
  preco_base: number;
  created_at: string | null;
  midias: number;
  casos_uso: string[];
  tipo_porte: string[];
  nivel_envolvimento: string[];
  posicao_escada: string | null;
  grupo_escada: string | null;
  forma_enxoval: string[];
  manutencao: string[];
  porque_texto: string | null;
}

interface RegistroDiag {
  id: string;
  nome_modelo: string;
  temMidia: boolean;
  visivel_catalogo: boolean;
  visivel_publico: boolean;
  casos_uso: string[];
  categoria: string | null;
  categorias: string[];
}

/* ═══════════ PARTE A — filtros da listagem ═══════════ */

const CATEGORIAS_EXCLUIDAS = ['vestuário', 'vestuario', 'utensílios', 'utensilios', 'cafés', 'cafes', 'kits', 'upsell'];

const NOMES_EXCLUIDOS = [
  'boné', 'bone', 'bucket hat', 'camiseta', 'moletom', 'cinto', 'chaira', 'afiador',
  'garfo', 'tábua', 'tabua', 'strop', 'bainha', 'clipe', 'ulticlip', 'passador',
  'patch', 'café', 'cafe', 'personalização', 'personalizacao', 'produto sob encomenda',
];

const semAcento = (s: string) =>
  s.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();

/** minúsculas, sem acento, hífen e espaço como o mesmo separador, espaços colapsados */
const normalizarNome = (s: string) =>
  semAcento(s).replace(/[-_]+/g, ' ').replace(/[^a-z0-9 ]+/g, ' ').replace(/\s+/g, ' ').trim();

const ehLamina = (l: Linha): boolean => {
  // A1 — precisa de mídia
  if (!l.imagem_modelo && !l.video_url && l.midias === 0) return false;
  // A4 — preço zerado fora
  if (!l.preco_base || Number(l.preco_base) === 0) return false;
  // A2 — categorias excluídas
  const cats = [l.categoria ?? '', ...(l.categorias ?? [])].map((c) => semAcento(c));
  if (cats.some((c) => c && CATEGORIAS_EXCLUIDAS.includes(c))) return false;
  // A3 — nomes excluídos
  const nome = semAcento(l.nome_modelo);
  if (NOMES_EXCLUIDOS.some((t) => nome.includes(semAcento(t)))) return false;
  return true;
};

/** A5 — esconde duplicatas: fica quem tem mais mídias; empate, o mais recente. */
const removerDuplicatas = (linhas: Linha[]): Linha[] => {
  const mapa = new Map<string, Linha>();
  linhas.forEach((l) => {
    const chave = normalizarNome(l.nome_modelo);
    const atual = mapa.get(chave);
    if (!atual) { mapa.set(chave, l); return; }
    const midiasL = l.midias + (l.imagem_modelo ? 1 : 0) + (l.video_url ? 1 : 0);
    const midiasA = atual.midias + (atual.imagem_modelo ? 1 : 0) + (atual.video_url ? 1 : 0);
    if (midiasL > midiasA) { mapa.set(chave, l); return; }
    if (midiasL === midiasA && (l.created_at ?? '') > (atual.created_at ?? '')) mapa.set(chave, l);
  });
  return [...mapa.values()];
};

/* ═══════════ PARTE B — inferência de atributos ═══════════ */

const CASOS_POR_CATEGORIA: Record<string, string[]> = {
  'defesa': ['defesa', 'edc_urbano'],
  'campo': ['campo', 'caca', 'pesca'],
  'cozinha': ['churrasco'],
  'churrasco': ['churrasco'],
  'edc': ['edc_urbano'],
  'edcs': ['edc_urbano'],
  'edc mini': ['edc_urbano'],
  'canivetes': ['edc_urbano'],
  'kzr': ['tatico', 'defesa'],
  'adaga': ['defesa', 'tatico'],
  'porte velado': ['defesa', 'edc_urbano'],
};

const casosPorCategoria = (l: Linha): string[] => {
  const arr = (l.categorias ?? []).filter(Boolean);
  // O array `categorias` vale mais que a coluna singular.
  const principal = semAcento(arr[0] ?? l.categoria ?? '');
  if (principal === 'novidades') {
    const segunda = semAcento(arr[1] ?? '');
    return CASOS_POR_CATEGORIA[segunda] ?? [];
  }
  return CASOS_POR_CATEGORIA[principal] ?? [];
};

const contemAlgum = (nome: string, termos: string[]) =>
  termos.some((t) => semAcento(nome).includes(semAcento(t)));

const inferirPorte = (l: Linha): string[] => {
  const n = l.nome_modelo;
  const cat = semAcento((l.categorias ?? [])[0] ?? l.categoria ?? '');
  if (contemAlgum(n, ['Velad'])) return ['velado'];
  if (contemAlgum(n, ['Multi'])) return ['velado', 'ostensivo_cintura', 'mochila_colete'];
  if (contemAlgum(n, ['Ring', 'Mini'])) return ['velado', 'ostensivo_cintura'];
  if (contemAlgum(n, ['Full Size', 'Full-Size', 'Camp', 'Nimbowie', 'Big']))
    return ['ostensivo_cintura', 'mochila_colete'];
  if (cat === 'cozinha' || cat === 'churrasco') return ['nao_se_aplica'];
  return ['ostensivo_cintura'];
};

const inferirPosicao = (l: Linha): string => {
  const n = l.nome_modelo;
  if (contemAlgum(n, ['Inox'])) return 'entrada';
  if (contemAlgum(n, ['Sandvik'])) return 'ideal';
  if (contemAlgum(n, ['High Carbon', 'HC', 'Carbon', '52100', 'San Mai', 'Brute Forge'])) return 'definitiva';
  return 'entrada';
};

const FAMILIAS: { chave: string[]; nome: string }[] = [
  { chave: ['Nimbowie'], nome: 'Nimbowie' },
  { chave: ['Nimbus'], nome: 'Nimbus' },
  { chave: ['Jagunço', 'Jagunco'], nome: 'Jagunço' },
  { chave: ['Adaga'], nome: 'Adaga' },
  { chave: ['Defcon'], nome: 'Defcon' },
  { chave: ['Camp Knife'], nome: 'Camp Knife' },
  { chave: ['Ring'], nome: 'Ring' },
  { chave: ['Tantô', 'Tantō', 'Tanto'], nome: 'Tantô' },
  { chave: ['Wharncliffe', 'Warncliffe'], nome: 'Wharncliffe' },
  { chave: ['EDC Mini'], nome: 'EDC Mini' },
  { chave: ['EDC'], nome: 'EDC' },
  { chave: ['Canivete'], nome: 'Canivete' },
  { chave: ['Butcher'], nome: 'Butcher' },
  { chave: ['Chef Royal'], nome: 'Chef Royal' },
  { chave: ['Picanheira'], nome: 'Picanheira' },
  { chave: ['Kiritsuke'], nome: 'Kiritsuke' },
];

const inferirGrupo = (l: Linha): string | null =>
  FAMILIAS.find((f) => contemAlgum(l.nome_modelo, f.chave))?.nome ?? null;

const inferirNivel = (l: Linha): string[] => {
  const n = l.nome_modelo;
  if (contemAlgum(n, ['Tactical', 'Dragon Scale', 'Signature', 'Espaçador', 'Espacador', 'Cerakote', 'Vintage']))
    return ['experiente', 'colecionador'];
  if (contemAlgum(n, ['Inox'])) return ['iniciante', 'usuario'];
  if (contemAlgum(n, ['Canivete']) || /k-[1-5]\b/i.test(n)) return ['iniciante', 'usuario'];
  return ['usuario', 'experiente'];
};

const inferirManutencao = (l: Linha): string[] => {
  const n = l.nome_modelo;
  if (contemAlgum(n, ['Inox', 'Sandvik'])) return ['resistente'];
  if (contemAlgum(n, ['High Carbon', 'HC', 'Carbon', '52100'])) return ['corte_extremo'];
  return ['resistente'];
};

interface Sugestao {
  id: string;
  nome: string;
  campos: Partial<Pick<Linha, 'casos_uso' | 'tipo_porte' | 'nivel_envolvimento' | 'posicao_escada' | 'grupo_escada' | 'manutencao'>>;
}

/** Só sugere para campo vazio — nunca sobrescreve trabalho manual. */
const sugerirPara = (l: Linha): Sugestao | null => {
  const campos: Sugestao['campos'] = {};
  if (!l.casos_uso.length) {
    const c = casosPorCategoria(l);
    if (c.length) campos.casos_uso = c;
  }
  if (!l.tipo_porte.length) campos.tipo_porte = inferirPorte(l);
  if (!l.nivel_envolvimento.length) campos.nivel_envolvimento = inferirNivel(l);
  if (!l.posicao_escada) campos.posicao_escada = inferirPosicao(l);
  if (!l.grupo_escada) {
    const g = inferirGrupo(l);
    if (g) campos.grupo_escada = g;
  }
  if (!l.manutencao.length) campos.manutencao = inferirManutencao(l);
  // Camada 6 (forma_enxoval): não infere.
  return Object.keys(campos).length ? { id: l.id, nome: l.nome_modelo, campos } : null;
};

const rotuloCampos = (c: Sugestao['campos']) =>
  [
    c.casos_uso && `casos: ${c.casos_uso.join(', ')}`,
    c.tipo_porte && `porte: ${c.tipo_porte.join(', ')}`,
    c.nivel_envolvimento && `nível: ${c.nivel_envolvimento.join(', ')}`,
    c.posicao_escada && `escada: ${c.posicao_escada}`,
    c.grupo_escada && `grupo: ${c.grupo_escada}`,
    c.manutencao && `manutenção: ${c.manutencao.join(', ')}`,
  ]
    .filter(Boolean)
    .join(' · ');

/* ═══════════ UI ═══════════ */

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

const CAMPOS_SALVOS = [
  'casos_uso', 'tipo_porte', 'nivel_envolvimento', 'posicao_escada',
  'grupo_escada', 'forma_enxoval', 'manutencao', 'porque_texto',
] as const;

export function AtributosRecomendacaoTab() {
  const [linhas, setLinhas] = useState<Linha[]>([]);
  const [busca, setBusca] = useState('');
  const [loading, setLoading] = useState(true);
  const [aberto, setAberto] = useState<string | null>(null);
  const [salvando, setSalvando] = useState<string | null>(null);
  const [mostrarTodos, setMostrarTodos] = useState(false);
  const [filtroAtributos, setFiltroAtributos] = useState<'todas' | 'sem' | 'com'>('todas');
  const [sujos, setSujos] = useState<Set<string>>(new Set());
  const [previa, setPrevia] = useState<Sugestao[] | null>(null);
  const [salvandoLote, setSalvandoLote] = useState(false);
  /* H2 — diagnóstico das lâminas que ficam fora da recomendação */
  const [todosRegistros, setTodosRegistros] = useState<RegistroDiag[]>([]);
  const [motivoAberto, setMotivoAberto] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      const [{ data: midias }, { data, error }] = await Promise.all([
        supabase.from('midias_catalogo').select('modelo_id'),
        supabase
          .from('catalogo_modelos')
          .select(
            'id, nome_modelo, imagem_modelo, video_url, categoria, categorias, preco_base, created_at, casos_uso, tipo_porte, nivel_envolvimento, posicao_escada, grupo_escada, forma_enxoval, manutencao, porque_texto',
          )
          .eq('visivel_catalogo', true)
          .order('nome_modelo'),
      ]);
      if (error) toast.error('Erro ao carregar lâminas');
      else {
        const contagem = new Map<string, number>();
        (midias || []).forEach((m: any) => contagem.set(m.modelo_id, (contagem.get(m.modelo_id) ?? 0) + 1));
        setLinhas(
          (data as any[]).map((m) => ({
            ...m,
            categorias: m.categorias ?? [],
            preco_base: Number(m.preco_base ?? 0),
            midias: contagem.get(m.id) ?? 0,
            casos_uso: m.casos_uso ?? [],
            tipo_porte: m.tipo_porte ?? [],
            nivel_envolvimento: m.nivel_envolvimento ?? [],
            forma_enxoval: m.forma_enxoval ?? [],
            manutencao: Array.isArray(m.manutencao) ? m.manutencao : m.manutencao ? [m.manutencao] : [],
          })),
        );
      }
      setLoading(false);

      const { data: todos } = await supabase
        .from('catalogo_modelos')
        .select('id, nome_modelo, imagem_modelo, video_url, categoria, categorias, casos_uso, visivel_catalogo, visivel_publico')
        .order('nome_modelo');
      const cont = new Map<string, number>();
      (midias || []).forEach((m: any) => cont.set(m.modelo_id, (cont.get(m.modelo_id) ?? 0) + 1));
      setTodosRegistros(
        ((todos as any[]) || []).map((m) => ({
          id: m.id,
          nome_modelo: m.nome_modelo,
          temMidia: !!(m.imagem_modelo || m.video_url || cont.get(m.id)),
          visivel_catalogo: m.visivel_catalogo !== false,
          visivel_publico: m.visivel_publico === true,
          casos_uso: m.casos_uso ?? [],
          categoria: m.categoria,
          categorias: m.categorias ?? [],
        })),
      );
    })();
  }, []);

  /* H2 — agrupamento por motivo de exclusão */
  const diagnostico = useMemo(() => {
    const grupos: Record<string, RegistroDiag[]> = {
      'sem mídia': [],
      'sem "visível no catálogo"': [],
      'sem "visível ao público"': [],
      'sem casos_uso cadastrados': [],
      'categoria excluída': [],
    };
    todosRegistros.forEach((r) => {
      const cats = [r.categoria ?? '', ...(r.categorias ?? [])].map((c) => semAcento(c));
      if (!r.temMidia) grupos['sem mídia'].push(r);
      if (!r.visivel_catalogo) grupos['sem "visível no catálogo"'].push(r);
      if (!r.visivel_publico) grupos['sem "visível ao público"'].push(r);
      if (!r.casos_uso.length) grupos['sem casos_uso cadastrados'].push(r);
      if (cats.some((c) => c && CATEGORIAS_EXCLUIDAS.includes(c))) grupos['categoria excluída'].push(r);
    });
    return grupos;
  }, [todosRegistros]);

  const marcarVisivel = async (id: string, campo: 'visivel_catalogo' | 'visivel_publico') => {
    const { error } = await supabase.from('catalogo_modelos').update({ [campo]: true } as any).eq('id', id);
    if (error) { toast.error('Não foi possível atualizar'); return; }
    setTodosRegistros((prev) => prev.map((r) => (r.id === id ? { ...r, [campo]: true } : r)));
    toast.success('Visibilidade atualizada');
  };

  /* Aviso ao sair com alterações não salvas (D1) */
  useEffect(() => {
    if (!sujos.size) return;
    const handler = (e: BeforeUnloadEvent) => { e.preventDefault(); e.returnValue = ''; };
    window.addEventListener('beforeunload', handler);
    return () => window.removeEventListener('beforeunload', handler);
  }, [sujos]);

  const visiveis = useMemo(
    () => (mostrarTodos ? linhas : removerDuplicatas(linhas.filter(ehLamina))),
    [linhas, mostrarTodos],
  );

  const filtradas = useMemo(
    () =>
      visiveis
        .filter((l) => l.nome_modelo.toLowerCase().includes(busca.toLowerCase()))
        .filter((l) =>
          filtroAtributos === 'todas'
            ? true
            : filtroAtributos === 'sem'
              ? l.casos_uso.length === 0
              : l.casos_uso.length > 0,
        ),
    [visiveis, busca, filtroAtributos],
  );

  const marcarSujo = (id: string) => setSujos((p) => new Set(p).add(id));

  const patch = (id: string, campo: keyof Linha, valor: any) => {
    marcarSujo(id);
    setLinhas((prev) => prev.map((l) => (l.id === id ? { ...l, [campo]: valor } : l)));
  };

  const toggle = (
    id: string,
    campo: 'casos_uso' | 'tipo_porte' | 'nivel_envolvimento' | 'forma_enxoval' | 'manutencao',
    v: string,
  ) => {
    marcarSujo(id);
    setLinhas((prev) =>
      prev.map((l) =>
        l.id === id
          ? { ...l, [campo]: l[campo].includes(v) ? l[campo].filter((x) => x !== v) : [...l[campo], v] }
          : l,
      ),
    );
  };

  /* C9 — forma_enxoval recíproco: marcar A↔B grava dos dois lados. */
  const toggleEnxoval = (id: string, outroId: string) => {
    setSujos((p) => new Set(p).add(id).add(outroId));
    setLinhas((prev) => {
      const alvo = prev.find((l) => l.id === id);
      if (!alvo) return prev;
      const ligar = !alvo.forma_enxoval.includes(outroId);
      return prev.map((l) => {
        if (l.id === id)
          return { ...l, forma_enxoval: ligar ? [...l.forma_enxoval, outroId] : l.forma_enxoval.filter((x) => x !== outroId) };
        if (l.id === outroId)
          return { ...l, forma_enxoval: ligar ? [...new Set([...l.forma_enxoval, id])] : l.forma_enxoval.filter((x) => x !== id) };
        return l;
      });
    });
  };

  const payload = (l: Linha) =>
    Object.fromEntries(CAMPOS_SALVOS.map((c) => [c, (l as any)[c]])) as Record<string, unknown>;

  const salvar = async (l: Linha) => {
    setSalvando(l.id);
    const { error } = await supabase.from('catalogo_modelos').update(payload(l) as any).eq('id', l.id);
    setSalvando(null);
    if (error) { toast.error('Erro ao salvar atributos'); return; }
    setSujos((p) => { const n = new Set(p); n.delete(l.id); return n; });
    toast.success(`${l.nome_modelo} atualizada`);
  };

  /* D1 — salvar tudo o que foi editado na sessão */
  const salvarTudo = async () => {
    const alvos = linhas.filter((l) => sujos.has(l.id));
    if (!alvos.length) return;
    setSalvandoLote(true);
    const resultados = await Promise.all(
      alvos.map((l) => supabase.from('catalogo_modelos').update(payload(l) as any).eq('id', l.id)),
    );
    setSalvandoLote(false);
    const erros = resultados.filter((r) => r.error).length;
    if (erros) toast.error(`${erros} lâmina(s) não foram salvas`);
    else { setSujos(new Set()); toast.success(`${alvos.length} lâmina(s) salvas`); }
  };

  /* PARTE B — prévia e confirmação */
  const gerarPrevia = () => {
    const s = visiveis.map(sugerirPara).filter(Boolean) as Sugestao[];
    if (!s.length) { toast.info('Nada a pré-preencher — todos os campos já têm valor.'); return; }
    setPrevia(s);
  };

  const confirmarPrevia = async () => {
    if (!previa) return;
    setSalvandoLote(true);
    const resultados = await Promise.all(
      previa.map((s) => supabase.from('catalogo_modelos').update(s.campos as any).eq('id', s.id)),
    );
    setSalvandoLote(false);
    const erros = resultados.filter((r) => r.error).length;
    setLinhas((prev) =>
      prev.map((l) => {
        const s = previa.find((x) => x.id === l.id);
        return s ? ({ ...l, ...s.campos } as Linha) : l;
      }),
    );
    setPrevia(null);
    if (erros) toast.error(`${erros} lâmina(s) não foram preenchidas`);
    else toast.success('Atributos pré-preenchidos — revise peça por peça.');
  };

  const cadastradas = visiveis.filter((l) => l.casos_uso.length > 0).length;

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
          {cadastradas}/{visiveis.length} com atributos
        </Badge>
      </div>

      {/* A6 — contador e switch de filtro */}
      <div className="flex flex-col gap-2 rounded-lg border p-3 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-xs text-muted-foreground">
          <span className="font-medium text-foreground">{visiveis.length}</span> lâminas exibidas de{' '}
          <span className="font-medium text-foreground">{linhas.length}</span> registros no catálogo
        </p>
        <div className="flex items-center gap-2">
          <Label className="text-xs">Mostrar todos os registros</Label>
          <Switch checked={mostrarTodos} onCheckedChange={setMostrarTodos} />
        </div>
      </div>

      {/* H2 — painel de lâminas fora da recomendação */}
      <div className="space-y-2 rounded-lg border p-3">
        <p className="flex items-center gap-2 text-xs font-medium">
          <EyeOff className="h-4 w-4 text-muted-foreground" /> Lâminas fora da recomendação
        </p>
        <div className="flex flex-wrap gap-1.5">
          {Object.entries(diagnostico).map(([motivo, lista]) => (
            <button
              key={motivo}
              type="button"
              onClick={() => setMotivoAberto(motivoAberto === motivo ? null : motivo)}
              className={`rounded-full border px-3 py-1 text-xs transition-colors ${
                motivoAberto === motivo
                  ? 'border-primary bg-primary text-primary-foreground'
                  : 'border-border bg-background text-muted-foreground hover:border-primary/50'
              }`}
            >
              {motivo} · {lista.length}
            </button>
          ))}
        </div>
        {motivoAberto && (
          <div className="max-h-60 space-y-1 overflow-y-auto rounded-md border bg-muted/30 p-2">
            {(diagnostico[motivoAberto] ?? []).length === 0 ? (
              <p className="text-xs text-muted-foreground">Nenhuma lâmina neste motivo.</p>
            ) : (
              diagnostico[motivoAberto].map((r) => (
                <div key={r.id} className="flex items-center justify-between gap-2 text-xs">
                  <span className="truncate">{r.nome_modelo}</span>
                  {motivoAberto === 'sem \"visível no catálogo\"' ? (
                    <Button size="sm" variant="outline" className="h-6 px-2 text-[11px]" onClick={() => marcarVisivel(r.id, 'visivel_catalogo')}>
                      Tornar visível
                    </Button>
                  ) : motivoAberto === 'sem \"visível ao público\"' ? (
                    <Button size="sm" variant="outline" className="h-6 px-2 text-[11px]" onClick={() => marcarVisivel(r.id, 'visivel_publico')}>
                      Tornar visível
                    </Button>
                  ) : motivoAberto === 'sem casos_uso cadastrados' ? (
                    <Button
                      size="sm"
                      variant="outline"
                      className="h-6 px-2 text-[11px]"
                      onClick={() => { setMostrarTodos(true); setBusca(r.nome_modelo); setAberto(r.id); }}
                    >
                      Corrigir
                    </Button>
                  ) : null}
                </div>
              ))
            )}
          </div>
        )}
      </div>

      {/* D2 — filtro rápido */}
      <div className="flex flex-wrap items-center gap-1.5">
        {([
          { v: 'sem', l: 'Sem atributos' },
          { v: 'com', l: 'Com atributos' },
          { v: 'todas', l: 'Todas' },
        ] as const).map((f) => (
          <button
            key={f.v}
            type="button"
            onClick={() => setFiltroAtributos(f.v)}
            className={`rounded-full border px-3 py-1 text-xs transition-colors ${
              filtroAtributos === f.v
                ? 'border-primary bg-primary text-primary-foreground'
                : 'border-border bg-background text-muted-foreground hover:border-primary/50'
            }`}
          >
            {f.l}
          </button>
        ))}
      </div>

      {/* PARTE B — aviso + botão + salvar em lote */}
      <div className="space-y-2 rounded-lg border border-amber-500/40 bg-amber-500/5 p-3">
        <p className="flex gap-2 text-xs text-muted-foreground">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-amber-500" />
          Pré-preenchimento é rascunho. A inferência acerta o óbvio e erra no que diferencia a Kaowz —
          geometria, espessura e comprimento de lâmina não aparecem no nome. Revise peça por peça.
        </p>
        <div className="flex flex-wrap items-center gap-2">
          <Button size="sm" variant="outline" onClick={gerarPrevia}>
            <Wand2 className="mr-1.5 h-4 w-4" /> Pré-preencher atributos
          </Button>
          <Button size="sm" onClick={salvarTudo} disabled={!sujos.size || salvandoLote}>
            {salvandoLote ? <Loader2 className="mr-1.5 h-4 w-4 animate-spin" /> : <Save className="mr-1.5 h-4 w-4" />}
            Salvar todas as alterações
          </Button>
          {sujos.size > 0 && (
            <Badge variant="destructive">{sujos.size} pendente(s)</Badge>
          )}
        </div>
      </div>

      <p className="text-xs text-muted-foreground">
        Esses atributos alimentam o quiz de descoberta público. Lâmina sem caso de uso não é recomendada.
      </p>

      {filtradas.map((l) => {
        const expandido = aberto === l.id;
        return (
          <Card key={l.id} className={sujos.has(l.id) ? 'border-amber-500/60' : ''}>
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
                {sujos.has(l.id) && <Badge variant="outline" className="shrink-0 text-[10px]">não salvo</Badge>}
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
                    <Label className="text-xs">Manutenção (pode marcar as duas)</Label>
                    <Chips
                      opcoes={MANUTENCOES}
                      valores={l.manutencao}
                      onToggle={(v) => toggle(l.id, 'manutencao', v)}
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
                      {/* C8 — lista fixa, sem texto livre */}
                      <Select
                        value={l.grupo_escada ?? '__nenhum__'}
                        onValueChange={(v) => patch(l.id, 'grupo_escada', v === '__nenhum__' ? null : v)}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="(nenhum)" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="__nenhum__">(nenhum)</SelectItem>
                          {GRUPOS_ESCADA.map((g) => (
                            <SelectItem key={g} value={g}>{g}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs">Compõe enxoval com (recíproco)</Label>
                    <div className="max-h-40 overflow-y-auto rounded border p-2">
                      <Chips
                        opcoes={visiveis
                          .filter((o) => o.id !== l.id)
                          .map((o) => ({ valor: o.id, label: o.nome_modelo }))}
                        valores={l.forma_enxoval}
                        onToggle={(v) => toggleEnxoval(l.id, v)}
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

      {/* Prévia do pré-preenchimento */}
      <Dialog open={!!previa} onOpenChange={(o) => !o && setPrevia(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Prévia do pré-preenchimento</DialogTitle>
            <DialogDescription>
              {previa?.length} lâmina(s) serão preenchidas. Só campos vazios são alterados — nada já cadastrado
              à mão é sobrescrito.
            </DialogDescription>
          </DialogHeader>
          <div className="max-h-[50vh] overflow-y-auto rounded border">
            <table className="w-full text-xs">
              <thead className="sticky top-0 bg-muted">
                <tr>
                  <th className="p-2 text-left font-medium">Lâmina</th>
                  <th className="p-2 text-left font-medium">Será preenchido</th>
                </tr>
              </thead>
              <tbody>
                {previa?.map((s) => (
                  <tr key={s.id} className="border-t align-top">
                    <td className="p-2 font-medium">{s.nome}</td>
                    <td className="p-2 text-muted-foreground">{rotuloCampos(s.campos)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setPrevia(null)}>Cancelar</Button>
            <Button onClick={confirmarPrevia} disabled={salvandoLote}>
              {salvandoLote && <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />}
              Confirmar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
