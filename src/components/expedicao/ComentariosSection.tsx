import { useState, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Send, Loader2, MessageCircle } from 'lucide-react';
import { useComentarios } from '@/hooks/useComentarios';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

interface Props {
  pedidoId: string;
}

export function ComentariosSection({ pedidoId }: Props) {
  const { user, profile } = useAuth();
  const { comentarios, isLoading, addComentario, isAdding } = useComentarios(pedidoId);
  const [texto, setTexto] = useState('');
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [comentarios.length]);

  const enviar = async () => {
    const t = texto.trim();
    if (!t) return;
    try {
      await addComentario({
        pedidoId,
        autorId: user?.id ?? null,
        autorNome: profile?.nome_vendedor || user?.email || 'Anônimo',
        texto: t,
      });
      setTexto('');
    } catch {
      toast.error('Erro ao enviar comentário');
    }
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <MessageCircle className="h-4 w-4 text-muted-foreground" />
        <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Comentários</p>
      </div>

      <div className="max-h-64 overflow-y-auto space-y-2 p-3 rounded-lg bg-muted/30 border">
        {isLoading ? (
          <p className="text-xs text-muted-foreground text-center py-4">Carregando...</p>
        ) : comentarios.length === 0 ? (
          <p className="text-xs text-muted-foreground text-center py-4">Nenhum comentário ainda</p>
        ) : (
          comentarios.map((c) => (
            <div key={c.id} className="flex gap-2">
              <div className="w-7 h-7 rounded-full bg-primary/10 text-primary flex items-center justify-center text-[10px] font-bold flex-shrink-0 mt-0.5">
                {c.autor_nome.charAt(0).toUpperCase()}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-baseline gap-2">
                  <span className="text-xs font-semibold">{c.autor_nome}</span>
                  <span className="text-[10px] text-muted-foreground">
                    {new Date(c.created_at).toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })}
                  </span>
                </div>
                <p className="text-sm mt-0.5 whitespace-pre-wrap break-words">{c.texto}</p>
              </div>
            </div>
          ))
        )}
        <div ref={endRef} />
      </div>

      <div className="flex gap-2">
        <Input
          placeholder="Escrever comentário..."
          value={texto}
          onChange={(e) => setTexto(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && enviar()}
          disabled={isAdding}
          className="flex-1"
        />
        <Button size="icon" onClick={enviar} disabled={isAdding || !texto.trim()}>
          {isAdding ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
        </Button>
      </div>
    </div>
  );
}
