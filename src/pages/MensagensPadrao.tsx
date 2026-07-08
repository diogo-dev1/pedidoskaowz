import { useRef, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { Copy, Plus, Trash2, X, Wrench, Package, GripVertical } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { cn } from "@/lib/utils";

interface MensagemPadrao {
  id: string;
  titulo: string;
  conteudo: string;
}

// Categorias = abas. Mesma funcionalidade, apenas separando os tipos de mensagem.
// A chave (categoria no banco) permanece 'padrao'; muda só o rótulo para "Utilidades".
const CATEGORIAS = {
  padrao: { label: "Utilidades", icon: Wrench },
  apresentacao_produtos: { label: "Apresentação Produtos", icon: Package },
} as const;

type Categoria = keyof typeof CATEGORIAS;

const DND_MIME = "application/x-mensagem-id";
const LONG_PRESS_MS = 400; // segurar ~0,4s para "pegar" o card no toque
const MOVE_TOLERANCE = 12; // px de folga antes de considerar rolagem

interface DragApi {
  draggingId: string | null;
  onCardPointerDown: (id: string, titulo: string, e: React.PointerEvent) => void;
}

/** CRUD de mensagens de uma categoria específica — reaproveitado por cada aba. */
function MensagensLista({ categoria, drag }: { categoria: Categoria; drag: DragApi }) {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [showForm, setShowForm] = useState(false);
  const [titulo, setTitulo] = useState("");
  const [conteudo, setConteudo] = useState("");

  const { data: mensagens = [], isLoading } = useQuery({
    queryKey: ["mensagens-padrao", categoria],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("mensagens_padrao")
        .select("*")
        .eq("categoria", categoria)
        .order("created_at", { ascending: false });

      if (error) throw error;
      return data as MensagemPadrao[];
    },
  });

  const createMutation = useMutation({
    mutationFn: async () => {
      if (!user) throw new Error("Usuário não autenticado");

      const { error } = await supabase.from("mensagens_padrao").insert({
        user_id: user.id,
        titulo,
        conteudo,
        categoria,
      });

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["mensagens-padrao", categoria] });
      toast({
        title: "Mensagem criada",
        description: "Sua mensagem foi salva com sucesso.",
      });
      setTitulo("");
      setConteudo("");
      setShowForm(false);
    },
    onError: () => {
      toast({
        title: "Erro",
        description: "Não foi possível salvar a mensagem.",
        variant: "destructive",
      });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("mensagens_padrao")
        .delete()
        .eq("id", id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["mensagens-padrao", categoria] });
      toast({
        title: "Mensagem deletada",
        description: "A mensagem foi removida com sucesso.",
      });
    },
    onError: () => {
      toast({
        title: "Erro",
        description: "Não foi possível deletar a mensagem.",
        variant: "destructive",
      });
    },
  });

  const handleCopy = async (conteudo: string, titulo: string) => {
    try {
      await navigator.clipboard.writeText(conteudo);
      toast({
        title: "Copiado!",
        description: `"${titulo}" foi copiado para a área de transferência.`,
      });
    } catch (error) {
      toast({
        title: "Erro",
        description: "Não foi possível copiar a mensagem.",
        variant: "destructive",
      });
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!titulo.trim() || !conteudo.trim()) {
      toast({
        title: "Campos obrigatórios",
        description: "Preencha o título e o conteúdo da mensagem.",
        variant: "destructive",
      });
      return;
    }
    createMutation.mutate();
  };

  const fecharForm = () => {
    setShowForm(false);
    setTitulo("");
    setConteudo("");
  };

  return (
    <div className="space-y-4 w-full min-w-0 overflow-hidden">
      <div className="flex items-center justify-between gap-2">
        <p className="text-xs text-muted-foreground">
          <span className="md:hidden">Segure um card e arraste até a outra aba para movê-lo.</span>
          <span className="hidden md:inline">
            Arraste um card <GripVertical className="inline h-3 w-3 align-middle" /> até a outra aba para movê-lo.
          </span>
        </p>
        {!showForm && (
          <Button onClick={() => setShowForm(true)} size="sm" className="gap-2 shrink-0">
            <Plus className="w-4 h-4" />
            Nova
          </Button>
        )}
      </div>

      {showForm && (
        <Card className="p-4 border-accent/20">
          <form onSubmit={handleSubmit} className="space-y-3">
            <div className="flex items-center justify-between">
              <h2 className="text-base font-semibold">Nova Mensagem</h2>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="h-7 w-7"
                onClick={fecharForm}
              >
                <X className="w-4 h-4" />
              </Button>
            </div>
            <div>
              <label className="text-xs font-medium mb-1 block">Título</label>
              <Input
                value={titulo}
                onChange={(e) => setTitulo(e.target.value)}
                placeholder="Ex: Saudação inicial"
                className="h-8 text-sm"
              />
            </div>
            <div>
              <label className="text-xs font-medium mb-1 block">Conteúdo</label>
              <Textarea
                value={conteudo}
                onChange={(e) => setConteudo(e.target.value)}
                placeholder="Digite a mensagem que deseja salvar..."
                rows={4}
                className="text-sm resize-none"
              />
            </div>
            <div className="flex gap-2 justify-end">
              <Button type="button" variant="outline" onClick={fecharForm}>
                Cancelar
              </Button>
              <Button type="submit" disabled={createMutation.isPending}>
                {createMutation.isPending ? "Salvando..." : "Salvar"}
              </Button>
            </div>
          </form>
        </Card>
      )}

      {isLoading ? (
        <div className="text-center py-8 text-muted-foreground text-sm">
          Carregando mensagens...
        </div>
      ) : mensagens.length === 0 ? (
        <Card className="p-8 text-center border-dashed">
          <p className="text-muted-foreground mb-3 text-sm">
            Você ainda não tem mensagens salvas aqui
          </p>
          <Button onClick={() => setShowForm(true)} variant="outline" size="sm" className="gap-2">
            <Plus className="w-4 h-4" />
            Criar primeira mensagem
          </Button>
        </Card>
      ) : (
        <div className="grid grid-cols-1 gap-3">
          {mensagens.map((mensagem) => (
            <Card
              key={mensagem.id}
              draggable
              onDragStart={(e) => {
                e.dataTransfer.setData(DND_MIME, mensagem.id);
                e.dataTransfer.setData("text/plain", mensagem.id);
                e.dataTransfer.effectAllowed = "move";
              }}
              onPointerDown={(e) => drag.onCardPointerDown(mensagem.id, mensagem.titulo, e)}
              className={cn(
                "p-3 hover:border-accent/40 transition-all cursor-grab active:cursor-grabbing select-none [-webkit-touch-callout:none]",
                drag.draggingId === mensagem.id && "opacity-40 ring-2 ring-accent"
              )}
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-start gap-2 flex-1 min-w-0">
                  <GripVertical className="w-4 h-4 text-muted-foreground/40 shrink-0 mt-0.5" />
                  <div className="flex-1 min-w-0">
                    <h3 className="font-semibold text-sm mb-1">{mensagem.titulo}</h3>
                    <p className="text-xs text-muted-foreground whitespace-pre-wrap break-words">
                      {mensagem.conteudo}
                    </p>
                  </div>
                </div>
                <div className="flex gap-1.5 flex-shrink-0">
                  <Button
                    size="icon"
                    variant="outline"
                    className="h-7 w-7"
                    onClick={() => handleCopy(mensagem.conteudo, mensagem.titulo)}
                    title="Copiar mensagem"
                  >
                    <Copy className="w-3.5 h-3.5" />
                  </Button>
                  <Button
                    size="icon"
                    variant="outline"
                    className="h-7 w-7"
                    onClick={() => deleteMutation.mutate(mensagem.id)}
                    disabled={deleteMutation.isPending}
                    title="Deletar mensagem"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </Button>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}

const MensagensPadrao = () => {
  const [aba, setAba] = useState<Categoria>("padrao");
  const [dragOverCat, setDragOverCat] = useState<Categoria | null>(null);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // ── Estado do arraste por toque (long-press) ─────────────────────
  const [touchDragId, setTouchDragId] = useState<string | null>(null);
  const [ghost, setGhost] = useState<{ x: number; y: number; titulo: string } | null>(null);
  // Dados transitórios do gesto — em ref para não re-renderizar a cada movimento
  const press = useRef<{
    id: string;
    titulo: string;
    startX: number;
    startY: number;
    timer: number | null;
    dragging: boolean;
    pointerId: number;
  } | null>(null);
  const preventScrollRef = useRef<((e: TouchEvent) => void) | null>(null);

  const abaRef = useRef(aba);
  abaRef.current = aba;

  // Move uma mensagem para outra categoria (arrastar de uma aba para outra)
  const moveMutation = useMutation({
    mutationFn: async ({ id, destino }: { id: string; destino: Categoria }) => {
      const { error } = await supabase
        .from("mensagens_padrao")
        .update({ categoria: destino })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: (_data, { destino }) => {
      queryClient.invalidateQueries({ queryKey: ["mensagens-padrao"] });
      toast({
        title: "Mensagem movida",
        description: `Movida para "${CATEGORIAS[destino].label}".`,
      });
    },
    onError: () => {
      toast({
        title: "Erro",
        description: "Não foi possível mover a mensagem.",
        variant: "destructive",
      });
    },
  });

  const moverMensagem = (id: string, destino: Categoria) => {
    if (destino !== abaRef.current) moveMutation.mutate({ id, destino });
  };

  // Categoria sob um ponto da tela (aba-alvo) — usa os data-drop-cat dos triggers
  const catSobPonto = (x: number, y: number): Categoria | null => {
    const el = document.elementFromPoint(x, y)?.closest("[data-drop-cat]");
    const c = el?.getAttribute("data-drop-cat");
    return c === "padrao" || c === "apresentacao_produtos" ? (c as Categoria) : null;
  };

  // ── Desktop (mouse): drag-and-drop nativo HTML5 ──────────────────
  const handleNativeDrop = (destino: Categoria, e: React.DragEvent) => {
    e.preventDefault();
    setDragOverCat(null);
    const id = e.dataTransfer.getData(DND_MIME) || e.dataTransfer.getData("text/plain");
    if (id) moverMensagem(id, destino);
  };

  // ── Mobile (toque): segurar para pegar, arrastar, soltar ─────────
  const limparGesto = () => {
    const p = press.current;
    if (p?.timer) clearTimeout(p.timer);
    window.removeEventListener("pointermove", onWindowPointerMove);
    window.removeEventListener("pointerup", onWindowPointerUp);
    window.removeEventListener("pointercancel", onWindowPointerUp);
    if (preventScrollRef.current) {
      document.removeEventListener("touchmove", preventScrollRef.current);
      preventScrollRef.current = null;
    }
    document.body.style.userSelect = "";
    press.current = null;
    setTouchDragId(null);
    setGhost(null);
    setDragOverCat(null);
  };

  const iniciarDrag = () => {
    const p = press.current;
    if (!p) return;
    p.dragging = true;
    if (navigator.vibrate) navigator.vibrate(25);
    document.body.style.userSelect = "none";
    // Bloqueia a rolagem da página enquanto o card está "pego"
    const prevent = (e: TouchEvent) => e.preventDefault();
    preventScrollRef.current = prevent;
    document.addEventListener("touchmove", prevent, { passive: false });
    setTouchDragId(p.id);
    setGhost({ x: p.startX, y: p.startY, titulo: p.titulo });
  };

  const onWindowPointerMove = (e: PointerEvent) => {
    const p = press.current;
    if (!p) return;
    if (!p.dragging) {
      // Antes de "pegar": se mexeu demais, é rolagem → cancela o long-press
      const dx = Math.abs(e.clientX - p.startX);
      const dy = Math.abs(e.clientY - p.startY);
      if (dx > MOVE_TOLERANCE || dy > MOVE_TOLERANCE) limparGesto();
      return;
    }
    // Já pegou: acompanha o dedo e destaca a aba-alvo
    setGhost({ x: e.clientX, y: e.clientY, titulo: p.titulo });
    const alvo = catSobPonto(e.clientX, e.clientY);
    setDragOverCat(alvo && alvo !== abaRef.current ? alvo : null);
  };

  const onWindowPointerUp = (e: PointerEvent) => {
    const p = press.current;
    const estavaArrastando = p?.dragging;
    const id = p?.id;
    if (estavaArrastando && id) {
      const alvo = catSobPonto(e.clientX, e.clientY);
      if (alvo) moverMensagem(id, alvo);
    }
    limparGesto();
  };

  const onCardPointerDown = (id: string, titulo: string, e: React.PointerEvent) => {
    // Só toque/caneta usam long-press; mouse continua no drag nativo HTML5
    if (e.pointerType === "mouse") return;
    limparGesto();
    press.current = {
      id,
      titulo,
      startX: e.clientX,
      startY: e.clientY,
      timer: window.setTimeout(iniciarDrag, LONG_PRESS_MS),
      dragging: false,
      pointerId: e.pointerId,
    };
    window.addEventListener("pointermove", onWindowPointerMove);
    window.addEventListener("pointerup", onWindowPointerUp);
    window.addEventListener("pointercancel", onWindowPointerUp);
  };

  const dragApi: DragApi = { draggingId: touchDragId, onCardPointerDown };

  return (
    <div className="space-y-4 w-full min-w-0 overflow-hidden">
      <div className="min-w-0">
        <h1 className="text-xl font-bold text-accent">Mensagens</h1>
        <p className="text-muted-foreground text-sm">
          Salve e copie suas mensagens mais usadas com um clique
        </p>
      </div>

      <Tabs value={aba} onValueChange={(v) => setAba(v as Categoria)} className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          {(Object.keys(CATEGORIAS) as Categoria[]).map((cat) => {
            const { label, icon: Icon } = CATEGORIAS[cat];
            const isDropTarget = cat !== aba;
            return (
              <TabsTrigger
                key={cat}
                value={cat}
                data-drop-cat={cat}
                onDragOver={(e) => {
                  if (isDropTarget) {
                    e.preventDefault();
                    e.dataTransfer.dropEffect = "move";
                    setDragOverCat(cat);
                  }
                }}
                onDragLeave={() => setDragOverCat((c) => (c === cat ? null : c))}
                onDrop={(e) => handleNativeDrop(cat, e)}
                className={cn(
                  "gap-1.5 text-xs sm:text-sm transition-colors",
                  dragOverCat === cat && "ring-2 ring-accent ring-inset bg-accent/10"
                )}
              >
                <Icon className="w-3.5 h-3.5 shrink-0" />
                <span className="truncate">{label}</span>
              </TabsTrigger>
            );
          })}
        </TabsList>

        {(Object.keys(CATEGORIAS) as Categoria[]).map((cat) => (
          <TabsContent key={cat} value={cat} className="mt-4">
            <MensagensLista categoria={cat} drag={dragApi} />
          </TabsContent>
        ))}
      </Tabs>

      {/* Fantasma que segue o dedo enquanto arrasta no toque */}
      {ghost && (
        <div
          className="fixed z-[100] pointer-events-none -translate-x-1/2 -translate-y-1/2 max-w-[70vw]"
          style={{ left: ghost.x, top: ghost.y }}
        >
          <div className="rounded-lg border-2 border-accent bg-card shadow-xl px-3 py-2 text-sm font-medium flex items-center gap-2">
            <GripVertical className="w-4 h-4 text-accent shrink-0" />
            <span className="truncate">{ghost.titulo}</span>
          </div>
        </div>
      )}
    </div>
  );
};

export default MensagensPadrao;
