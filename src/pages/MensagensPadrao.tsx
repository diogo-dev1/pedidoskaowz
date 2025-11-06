import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { Copy, Plus, Trash2, X } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";

interface MensagemPadrao {
  id: string;
  titulo: string;
  conteudo: string;
}

const MensagensPadrao = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [showForm, setShowForm] = useState(false);
  const [titulo, setTitulo] = useState("");
  const [conteudo, setConteudo] = useState("");

  const { data: mensagens = [], isLoading } = useQuery({
    queryKey: ["mensagens-padrao"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("mensagens_padrao")
        .select("*")
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
      });

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["mensagens-padrao"] });
      toast({
        title: "Mensagem criada",
        description: "Sua mensagem padrão foi salva com sucesso.",
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
      queryClient.invalidateQueries({ queryKey: ["mensagens-padrao"] });
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

  return (
    <div className="min-h-screen bg-background p-6">
      <div className="max-w-4xl mx-auto space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-accent">Mensagens Padrão</h1>
            <p className="text-muted-foreground mt-1">
              Salve e copie suas mensagens mais usadas com um clique
            </p>
          </div>
          {!showForm && (
            <Button onClick={() => setShowForm(true)} className="gap-2">
              <Plus className="w-4 h-4" />
              Nova Mensagem
            </Button>
          )}
        </div>

        {showForm && (
          <Card className="p-6 border-accent/20">
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-semibold">Nova Mensagem</h2>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  onClick={() => {
                    setShowForm(false);
                    setTitulo("");
                    setConteudo("");
                  }}
                >
                  <X className="w-4 h-4" />
                </Button>
              </div>
              <div>
                <label className="text-sm font-medium mb-2 block">Título</label>
                <Input
                  value={titulo}
                  onChange={(e) => setTitulo(e.target.value)}
                  placeholder="Ex: Saudação inicial"
                  className="bg-background/50"
                />
              </div>
              <div>
                <label className="text-sm font-medium mb-2 block">Conteúdo</label>
                <Textarea
                  value={conteudo}
                  onChange={(e) => setConteudo(e.target.value)}
                  placeholder="Digite a mensagem que deseja salvar..."
                  rows={6}
                  className="bg-background/50 resize-none"
                />
              </div>
              <div className="flex gap-2 justify-end">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    setShowForm(false);
                    setTitulo("");
                    setConteudo("");
                  }}
                >
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
          <div className="text-center py-12 text-muted-foreground">
            Carregando mensagens...
          </div>
        ) : mensagens.length === 0 ? (
          <Card className="p-12 text-center border-dashed">
            <p className="text-muted-foreground mb-4">
              Você ainda não tem mensagens salvas
            </p>
            <Button onClick={() => setShowForm(true)} variant="outline" className="gap-2">
              <Plus className="w-4 h-4" />
              Criar primeira mensagem
            </Button>
          </Card>
        ) : (
          <div className="grid gap-4">
            {mensagens.map((mensagem) => (
              <Card
                key={mensagem.id}
                className="p-6 hover:border-accent/40 transition-colors"
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <h3 className="font-semibold text-lg mb-2">{mensagem.titulo}</h3>
                    <p className="text-sm text-muted-foreground whitespace-pre-wrap break-words">
                      {mensagem.conteudo}
                    </p>
                  </div>
                  <div className="flex gap-2 flex-shrink-0">
                    <Button
                      size="icon"
                      variant="outline"
                      onClick={() => handleCopy(mensagem.conteudo, mensagem.titulo)}
                      title="Copiar mensagem"
                    >
                      <Copy className="w-4 h-4" />
                    </Button>
                    <Button
                      size="icon"
                      variant="outline"
                      onClick={() => deleteMutation.mutate(mensagem.id)}
                      disabled={deleteMutation.isPending}
                      title="Deletar mensagem"
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default MensagensPadrao;
