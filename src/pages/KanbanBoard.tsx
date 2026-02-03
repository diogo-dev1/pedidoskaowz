import { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { 
  Plus, 
  MoreVertical, 
  Pencil, 
  Trash2, 
  Check, 
  X, 
  ArrowLeft,
  GripVertical,
  MessageSquare,
  ChevronDown,
  ChevronUp
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { ScrollArea } from '@/components/ui/scroll-area';
import type { BoardKanban, ColunaKanban, TarefaKanban, Comentario } from '@/types/kanban';

const BOARDS_STORAGE_KEY = 'kanban-boards';

export default function KanbanBoard() {
  const { boardId } = useParams<{ boardId: string }>();
  const navigate = useNavigate();
  
  const [boards, setBoards] = useState<BoardKanban[]>(() => {
    const saved = localStorage.getItem(BOARDS_STORAGE_KEY);
    return saved ? JSON.parse(saved) : [];
  });

  const board = boards.find(b => b.id === boardId);

  const [novaTarefaColuna, setNovaTarefaColuna] = useState<string | null>(null);
  const [novaTarefaTitulo, setNovaTarefaTitulo] = useState('');
  
  const [editandoTarefa, setEditandoTarefa] = useState<TarefaKanban | null>(null);
  const [editTarefaTitulo, setEditTarefaTitulo] = useState('');
  
  const [novaColunaNome, setNovaColunaNome] = useState('');
  const [adicionandoColuna, setAdicionandoColuna] = useState(false);
  
  const [editandoColuna, setEditandoColuna] = useState<string | null>(null);
  const [editColunaNome, setEditColunaNome] = useState('');
  
  const [tarefaExpandida, setTarefaExpandida] = useState<string | null>(null);
  const [novoComentario, setNovoComentario] = useState('');
  
  const [draggingTarefa, setDraggingTarefa] = useState<TarefaKanban | null>(null);
  const [dragOverColuna, setDragOverColuna] = useState<string | null>(null);

  useEffect(() => {
    localStorage.setItem(BOARDS_STORAGE_KEY, JSON.stringify(boards));
  }, [boards]);

  const atualizarBoard = (novoBoard: BoardKanban) => {
    setBoards(boards.map(b => b.id === novoBoard.id ? novoBoard : b));
  };

  if (!board) {
    return (
      <div className="p-4 text-center">
        <p className="text-muted-foreground mb-4">Board não encontrado</p>
        <Button onClick={() => navigate('/tarefas')}>
          <ArrowLeft className="h-4 w-4 mr-2" />
          Voltar
        </Button>
      </div>
    );
  }

  const colunasOrdenadas = [...board.colunas].sort((a, b) => a.ordem - b.ordem);

  // === Colunas ===
  const adicionarColuna = () => {
    if (!novaColunaNome.trim()) return;
    const novaColuna: ColunaKanban = {
      id: crypto.randomUUID(),
      nome: novaColunaNome.trim(),
      ordem: board.colunas.length,
    };
    atualizarBoard({ ...board, colunas: [...board.colunas, novaColuna] });
    setNovaColunaNome('');
    setAdicionandoColuna(false);
  };

  const editarColuna = (colunaId: string) => {
    if (!editColunaNome.trim()) return;
    const novasColunas = board.colunas.map(c => 
      c.id === colunaId ? { ...c, nome: editColunaNome.trim() } : c
    );
    atualizarBoard({ ...board, colunas: novasColunas });
    setEditandoColuna(null);
    setEditColunaNome('');
  };

  const excluirColuna = (colunaId: string) => {
    const novasColunas = board.colunas.filter(c => c.id !== colunaId);
    const novasTarefas = board.tarefas.filter(t => t.colunaId !== colunaId);
    atualizarBoard({ ...board, colunas: novasColunas, tarefas: novasTarefas });
  };

  // === Tarefas ===
  const adicionarTarefa = (colunaId: string) => {
    if (!novaTarefaTitulo.trim()) return;
    const tarefasColuna = board.tarefas.filter(t => t.colunaId === colunaId);
    const novaTarefa: TarefaKanban = {
      id: crypto.randomUUID(),
      titulo: novaTarefaTitulo.trim(),
      colunaId,
      ordem: tarefasColuna.length,
      concluida: false,
      comentarios: [],
      criadoEm: new Date().toISOString(),
    };
    atualizarBoard({ ...board, tarefas: [...board.tarefas, novaTarefa] });
    setNovaTarefaTitulo('');
    setNovaTarefaColuna(null);
  };

  const salvarEdicaoTarefa = () => {
    if (!editandoTarefa || !editTarefaTitulo.trim()) return;
    const novasTarefas = board.tarefas.map(t => 
      t.id === editandoTarefa.id ? { ...t, titulo: editTarefaTitulo.trim() } : t
    );
    atualizarBoard({ ...board, tarefas: novasTarefas });
    setEditandoTarefa(null);
    setEditTarefaTitulo('');
  };

  const excluirTarefa = (tarefaId: string) => {
    atualizarBoard({ ...board, tarefas: board.tarefas.filter(t => t.id !== tarefaId) });
  };

  const toggleConcluida = (tarefa: TarefaKanban) => {
    const novasTarefas = board.tarefas.map(t => 
      t.id === tarefa.id ? { ...t, concluida: !t.concluida } : t
    );
    atualizarBoard({ ...board, tarefas: novasTarefas });
  };

  // === Comentários ===
  const adicionarComentario = (tarefaId: string) => {
    if (!novoComentario.trim()) return;
    const novoComent: Comentario = {
      id: crypto.randomUUID(),
      texto: novoComentario.trim(),
      criadoEm: new Date().toISOString(),
    };
    const novasTarefas = board.tarefas.map(t => 
      t.id === tarefaId 
        ? { ...t, comentarios: [...t.comentarios, novoComent] } 
        : t
    );
    atualizarBoard({ ...board, tarefas: novasTarefas });
    setNovoComentario('');
  };

  const excluirComentario = (tarefaId: string, comentarioId: string) => {
    const novasTarefas = board.tarefas.map(t => 
      t.id === tarefaId 
        ? { ...t, comentarios: t.comentarios.filter(c => c.id !== comentarioId) } 
        : t
    );
    atualizarBoard({ ...board, tarefas: novasTarefas });
  };

  // === Drag and Drop ===
  const handleDragStart = (e: React.DragEvent, tarefa: TarefaKanban) => {
    setDraggingTarefa(tarefa);
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragOver = (e: React.DragEvent, colunaId: string) => {
    e.preventDefault();
    setDragOverColuna(colunaId);
  };

  const handleDragLeave = () => {
    setDragOverColuna(null);
  };

  const handleDrop = (e: React.DragEvent, colunaId: string) => {
    e.preventDefault();
    if (!draggingTarefa) return;
    
    const novasTarefas = board.tarefas.map(t => 
      t.id === draggingTarefa.id ? { ...t, colunaId } : t
    );
    atualizarBoard({ ...board, tarefas: novasTarefas });
    setDraggingTarefa(null);
    setDragOverColuna(null);
  };

  const handleDragEnd = () => {
    setDraggingTarefa(null);
    setDragOverColuna(null);
  };

  const getTarefasColuna = (colunaId: string) => {
    return board.tarefas
      .filter(t => t.colunaId === colunaId)
      .sort((a, b) => a.ordem - b.ordem);
  };

  return (
    <div className="p-4">
      <div className="flex items-center gap-3 mb-4">
        <Button variant="ghost" size="icon" onClick={() => navigate('/tarefas')}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <h1 className="text-xl font-semibold">{board.nome}</h1>
      </div>

      <ScrollArea className="w-full">
        <div className="flex gap-4 pb-4 min-w-max">
          {colunasOrdenadas.map((coluna) => (
            <div 
              key={coluna.id}
              className={`w-72 shrink-0 bg-muted/50 rounded-lg p-3 ${
                dragOverColuna === coluna.id ? 'ring-2 ring-primary' : ''
              }`}
              onDragOver={(e) => handleDragOver(e, coluna.id)}
              onDragLeave={handleDragLeave}
              onDrop={(e) => handleDrop(e, coluna.id)}
            >
              {/* Header da coluna */}
              <div className="flex items-center justify-between mb-3">
                {editandoColuna === coluna.id ? (
                  <div className="flex items-center gap-1 flex-1">
                    <Input
                      value={editColunaNome}
                      onChange={(e) => setEditColunaNome(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') editarColuna(coluna.id);
                        if (e.key === 'Escape') setEditandoColuna(null);
                      }}
                      className="h-7 text-sm"
                      autoFocus
                    />
                    <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => editarColuna(coluna.id)}>
                      <Check className="h-3 w-3" />
                    </Button>
                    <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => setEditandoColuna(null)}>
                      <X className="h-3 w-3" />
                    </Button>
                  </div>
                ) : (
                  <>
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-sm">{coluna.nome}</span>
                      <Badge variant="secondary" className="text-xs">
                        {getTarefasColuna(coluna.id).length}
                      </Badge>
                    </div>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-7 w-7">
                          <MoreVertical className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => {
                          setEditandoColuna(coluna.id);
                          setEditColunaNome(coluna.nome);
                        }}>
                          <Pencil className="h-4 w-4 mr-2" />
                          Editar
                        </DropdownMenuItem>
                        <DropdownMenuItem 
                          onClick={() => excluirColuna(coluna.id)}
                          className="text-destructive"
                        >
                          <Trash2 className="h-4 w-4 mr-2" />
                          Excluir
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </>
                )}
              </div>

              {/* Tarefas da coluna */}
              <div className="space-y-2 min-h-[100px]">
                {getTarefasColuna(coluna.id).map((tarefa) => (
                  <Card 
                    key={tarefa.id}
                    draggable
                    onDragStart={(e) => handleDragStart(e, tarefa)}
                    onDragEnd={handleDragEnd}
                    className={`cursor-grab active:cursor-grabbing ${
                      draggingTarefa?.id === tarefa.id ? 'opacity-50' : ''
                    } ${tarefa.concluida ? 'opacity-60' : ''}`}
                  >
                    <CardContent className="p-3">
                      <div className="flex items-start gap-2">
                        <GripVertical className="h-4 w-4 text-muted-foreground shrink-0 mt-0.5" />
                        <Checkbox
                          checked={tarefa.concluida}
                          onCheckedChange={() => toggleConcluida(tarefa)}
                          className="shrink-0 mt-0.5"
                        />
                        <div className="flex-1 min-w-0">
                          <p className={`text-sm break-words ${tarefa.concluida ? 'line-through text-muted-foreground' : ''}`}>
                            {tarefa.titulo}
                          </p>
                          
                          {/* Botão expandir comentários */}
                          <button
                            onClick={() => setTarefaExpandida(
                              tarefaExpandida === tarefa.id ? null : tarefa.id
                            )}
                            className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground mt-2"
                          >
                            <MessageSquare className="h-3 w-3" />
                            <span>{tarefa.comentarios.length}</span>
                            {tarefaExpandida === tarefa.id ? (
                              <ChevronUp className="h-3 w-3" />
                            ) : (
                              <ChevronDown className="h-3 w-3" />
                            )}
                          </button>

                          {/* Seção de comentários expandida */}
                          {tarefaExpandida === tarefa.id && (
                            <div className="mt-2 space-y-2 border-t pt-2">
                              {tarefa.comentarios.map((coment) => (
                                <div key={coment.id} className="group flex items-start gap-2 text-xs bg-muted/50 rounded p-2">
                                  <p className="flex-1 break-words">{coment.texto}</p>
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    className="h-5 w-5 opacity-0 group-hover:opacity-100 shrink-0"
                                    onClick={() => excluirComentario(tarefa.id, coment.id)}
                                  >
                                    <X className="h-3 w-3" />
                                  </Button>
                                </div>
                              ))}
                              <div className="flex gap-1">
                                <Input
                                  placeholder="Adicionar comentário..."
                                  value={tarefaExpandida === tarefa.id ? novoComentario : ''}
                                  onChange={(e) => setNovoComentario(e.target.value)}
                                  onKeyDown={(e) => {
                                    if (e.key === 'Enter') {
                                      adicionarComentario(tarefa.id);
                                    }
                                  }}
                                  className="h-7 text-xs"
                                />
                                <Button 
                                  size="icon" 
                                  className="h-7 w-7 shrink-0"
                                  onClick={() => adicionarComentario(tarefa.id)}
                                  disabled={!novoComentario.trim()}
                                >
                                  <Plus className="h-3 w-3" />
                                </Button>
                              </div>
                            </div>
                          )}
                        </div>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-6 w-6 shrink-0">
                              <MoreVertical className="h-3 w-3" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => {
                              setEditandoTarefa(tarefa);
                              setEditTarefaTitulo(tarefa.titulo);
                            }}>
                              <Pencil className="h-4 w-4 mr-2" />
                              Editar
                            </DropdownMenuItem>
                            <DropdownMenuItem 
                              onClick={() => excluirTarefa(tarefa.id)}
                              className="text-destructive"
                            >
                              <Trash2 className="h-4 w-4 mr-2" />
                              Excluir
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>

              {/* Adicionar tarefa */}
              {novaTarefaColuna === coluna.id ? (
                <div className="mt-2 space-y-2">
                  <Input
                    placeholder="Título da tarefa..."
                    value={novaTarefaTitulo}
                    onChange={(e) => setNovaTarefaTitulo(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') adicionarTarefa(coluna.id);
                      if (e.key === 'Escape') setNovaTarefaColuna(null);
                    }}
                    autoFocus
                    className="h-8"
                  />
                  <div className="flex gap-1">
                    <Button size="sm" onClick={() => adicionarTarefa(coluna.id)} disabled={!novaTarefaTitulo.trim()}>
                      Adicionar
                    </Button>
                    <Button size="sm" variant="ghost" onClick={() => {
                      setNovaTarefaColuna(null);
                      setNovaTarefaTitulo('');
                    }}>
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ) : (
                <Button 
                  variant="ghost" 
                  className="w-full mt-2 justify-start text-muted-foreground"
                  onClick={() => setNovaTarefaColuna(coluna.id)}
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Adicionar tarefa
                </Button>
              )}
            </div>
          ))}

          {/* Adicionar nova coluna */}
          <div className="w-72 shrink-0">
            {adicionandoColuna ? (
              <div className="bg-muted/50 rounded-lg p-3 space-y-2">
                <Input
                  placeholder="Nome da coluna..."
                  value={novaColunaNome}
                  onChange={(e) => setNovaColunaNome(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') adicionarColuna();
                    if (e.key === 'Escape') setAdicionandoColuna(false);
                  }}
                  autoFocus
                />
                <div className="flex gap-1">
                  <Button size="sm" onClick={adicionarColuna} disabled={!novaColunaNome.trim()}>
                    Adicionar
                  </Button>
                  <Button size="sm" variant="ghost" onClick={() => {
                    setAdicionandoColuna(false);
                    setNovaColunaNome('');
                  }}>
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            ) : (
              <Button 
                variant="outline" 
                className="w-full justify-start"
                onClick={() => setAdicionandoColuna(true)}
              >
                <Plus className="h-4 w-4 mr-2" />
                Adicionar coluna
              </Button>
            )}
          </div>
        </div>
      </ScrollArea>

      {/* Dialog editar tarefa */}
      <Dialog open={!!editandoTarefa} onOpenChange={(open) => !open && setEditandoTarefa(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Editar Tarefa</DialogTitle>
          </DialogHeader>
          <div className="py-4">
            <Input
              placeholder="Título da tarefa..."
              value={editTarefaTitulo}
              onChange={(e) => setEditTarefaTitulo(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && salvarEdicaoTarefa()}
              autoFocus
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditandoTarefa(null)}>
              Cancelar
            </Button>
            <Button onClick={salvarEdicaoTarefa} disabled={!editTarefaTitulo.trim()}>
              Salvar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
