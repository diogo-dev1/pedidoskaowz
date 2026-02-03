import { useState, useEffect } from 'react';
import { Plus, MoreVertical, Pencil, Trash2, LayoutGrid, Palette } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
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
  DropdownMenuSeparator,
  DropdownMenuLabel,
} from '@/components/ui/dropdown-menu';
import type { BoardKanban } from '@/types/kanban';

const BOARDS_STORAGE_KEY = 'kanban-boards';

const CORES_BOARD = [
  { nome: 'Padrão', valor: '', bg: 'bg-card', text: 'text-card-foreground' },
  { nome: 'Azul', valor: 'blue', bg: 'bg-blue-500/10', text: 'text-blue-600' },
  { nome: 'Verde', valor: 'green', bg: 'bg-green-500/10', text: 'text-green-600' },
  { nome: 'Amarelo', valor: 'yellow', bg: 'bg-yellow-500/10', text: 'text-yellow-600' },
  { nome: 'Vermelho', valor: 'red', bg: 'bg-red-500/10', text: 'text-red-600' },
  { nome: 'Roxo', valor: 'purple', bg: 'bg-purple-500/10', text: 'text-purple-600' },
  { nome: 'Rosa', valor: 'pink', bg: 'bg-pink-500/10', text: 'text-pink-600' },
  { nome: 'Laranja', valor: 'orange', bg: 'bg-orange-500/10', text: 'text-orange-600' },
];

interface BoardKanbanWithCor extends BoardKanban {
  cor?: string;
}

const defaultBoards: BoardKanbanWithCor[] = [
  {
    id: crypto.randomUUID(),
    nome: 'Envios de hoje',
    cor: 'blue',
    colunas: [
      { id: crypto.randomUUID(), nome: 'A fazer', ordem: 0, cor: 'bg-muted/50' },
      { id: crypto.randomUUID(), nome: 'Em progresso', ordem: 1, cor: 'bg-yellow-500/10' },
      { id: crypto.randomUUID(), nome: 'Concluído', ordem: 2, cor: 'bg-green-500/10' },
    ],
    tarefas: [],
    criadoEm: new Date().toISOString(),
  },
  {
    id: crypto.randomUUID(),
    nome: 'Tarefas Urgentes',
    cor: 'red',
    colunas: [
      { id: crypto.randomUUID(), nome: 'A fazer', ordem: 0, cor: 'bg-muted/50' },
      { id: crypto.randomUUID(), nome: 'Em progresso', ordem: 1, cor: 'bg-yellow-500/10' },
      { id: crypto.randomUUID(), nome: 'Concluído', ordem: 2, cor: 'bg-green-500/10' },
    ],
    tarefas: [],
    criadoEm: new Date().toISOString(),
  },
  {
    id: crypto.randomUUID(),
    nome: 'Clientes para avisar',
    cor: 'purple',
    colunas: [
      { id: crypto.randomUUID(), nome: 'A fazer', ordem: 0, cor: 'bg-muted/50' },
      { id: crypto.randomUUID(), nome: 'Em progresso', ordem: 1, cor: 'bg-yellow-500/10' },
      { id: crypto.randomUUID(), nome: 'Concluído', ordem: 2, cor: 'bg-green-500/10' },
    ],
    tarefas: [],
    criadoEm: new Date().toISOString(),
  },
];

export default function Dashboard() {
  const navigate = useNavigate();
  const [boards, setBoards] = useState<BoardKanbanWithCor[]>(() => {
    const saved = localStorage.getItem(BOARDS_STORAGE_KEY);
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch {
        return defaultBoards;
      }
    }
    return defaultBoards;
  });

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingBoard, setEditingBoard] = useState<BoardKanbanWithCor | null>(null);
  const [boardNome, setBoardNome] = useState('');
  const [boardCor, setBoardCor] = useState('');

  useEffect(() => {
    localStorage.setItem(BOARDS_STORAGE_KEY, JSON.stringify(boards));
  }, [boards]);

  const abrirNovoBoard = () => {
    setEditingBoard(null);
    setBoardNome('');
    setBoardCor('');
    setDialogOpen(true);
  };

  const abrirEditarBoard = (board: BoardKanbanWithCor) => {
    setEditingBoard(board);
    setBoardNome(board.nome);
    setBoardCor(board.cor || '');
    setDialogOpen(true);
  };

  const alterarCorBoard = (boardId: string, cor: string) => {
    setBoards(boards.map(b => 
      b.id === boardId ? { ...b, cor } : b
    ));
  };

  const salvarBoard = () => {
    if (!boardNome.trim()) return;

    if (editingBoard) {
      setBoards(boards.map(b => 
        b.id === editingBoard.id ? { ...b, nome: boardNome.trim(), cor: boardCor } : b
      ));
    } else {
      const novoBoard: BoardKanbanWithCor = {
        id: crypto.randomUUID(),
        nome: boardNome.trim(),
        cor: boardCor,
        colunas: [
          { id: crypto.randomUUID(), nome: 'A fazer', ordem: 0, cor: 'bg-muted/50' },
          { id: crypto.randomUUID(), nome: 'Em progresso', ordem: 1, cor: 'bg-yellow-500/10' },
          { id: crypto.randomUUID(), nome: 'Concluído', ordem: 2, cor: 'bg-green-500/10' },
        ],
        tarefas: [],
        criadoEm: new Date().toISOString(),
      };
      setBoards([...boards, novoBoard]);
    }

    setDialogOpen(false);
    setBoardNome('');
    setBoardCor('');
    setEditingBoard(null);
  };

  const excluirBoard = (id: string) => {
    setBoards(boards.filter(b => b.id !== id));
  };

  const contarTarefas = (board: BoardKanbanWithCor) => {
    return board.tarefas.filter(t => !t.concluida).length;
  };

  const getCorInfo = (cor?: string) => {
    return CORES_BOARD.find(c => c.valor === cor) || CORES_BOARD[0];
  };

  return (
    <div className="p-3 md:p-4 max-w-4xl mx-auto">
      <div className="flex items-center justify-between mb-4 md:mb-6">
        <h1 className="text-lg md:text-xl font-semibold">Boards</h1>
        <Button size="sm" onClick={abrirNovoBoard}>
          <Plus className="h-4 w-4 mr-1" />
          <span className="hidden sm:inline">Novo Board</span>
          <span className="sm:hidden">Novo</span>
        </Button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 md:gap-4">
        {boards.map((board) => {
          const corInfo = getCorInfo(board.cor);
          return (
            <Card 
              key={board.id} 
              className={`cursor-pointer hover:shadow-md transition-shadow group ${corInfo.bg}`}
            >
              <CardHeader className="pb-2 p-3 md:p-4 md:pb-2">
                <div className="flex items-start justify-between gap-2">
                  <CardTitle 
                    className={`text-sm md:text-base font-medium flex items-center gap-2 flex-1 min-w-0 ${corInfo.text}`}
                    onClick={() => navigate(`/tarefas/${board.id}`)}
                  >
                    <LayoutGrid className="h-4 w-4 shrink-0" />
                    <span className="truncate">{board.nome}</span>
                  </CardTitle>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button 
                        variant="ghost" 
                        size="icon" 
                        className="h-7 w-7 md:h-8 md:w-8 md:opacity-0 md:group-hover:opacity-100 transition-opacity shrink-0"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <MoreVertical className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onClick={() => abrirEditarBoard(board)}>
                        <Pencil className="h-4 w-4 mr-2" />
                        Editar
                      </DropdownMenuItem>
                      <DropdownMenuSeparator />
                      <DropdownMenuLabel className="text-xs font-normal text-muted-foreground flex items-center gap-1">
                        <Palette className="h-3 w-3" />
                        Cor do board
                      </DropdownMenuLabel>
                      <div className="grid grid-cols-4 gap-1 p-2">
                        {CORES_BOARD.map((cor) => (
                          <button
                            key={cor.valor}
                            className={`w-6 h-6 rounded ${cor.bg} border border-border ${
                              board.cor === cor.valor ? 'ring-2 ring-primary ring-offset-1' : ''
                            }`}
                            onClick={(e) => {
                              e.stopPropagation();
                              alterarCorBoard(board.id, cor.valor);
                            }}
                            title={cor.nome}
                          />
                        ))}
                      </div>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem 
                        onClick={() => excluirBoard(board.id)}
                        className="text-destructive"
                      >
                        <Trash2 className="h-4 w-4 mr-2" />
                        Excluir
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </CardHeader>
              <CardContent className="p-3 pt-0 md:p-4 md:pt-0" onClick={() => navigate(`/tarefas/${board.id}`)}>
                <p className="text-xs md:text-sm text-muted-foreground">
                  {contarTarefas(board)} tarefa(s) pendente(s)
                </p>
                <p className="text-[10px] md:text-xs text-muted-foreground mt-1">
                  {board.colunas.length} coluna(s)
                </p>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {boards.length === 0 && (
        <div className="text-center py-8 md:py-12">
          <LayoutGrid className="h-10 w-10 md:h-12 md:w-12 text-muted-foreground mx-auto mb-3 md:mb-4" />
          <p className="text-sm md:text-base text-muted-foreground">Nenhum board criado ainda.</p>
          <Button className="mt-3 md:mt-4" size="sm" onClick={abrirNovoBoard}>
            Criar primeiro board
          </Button>
        </div>
      )}

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-[90vw] sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>
              {editingBoard ? 'Editar Board' : 'Novo Board'}
            </DialogTitle>
          </DialogHeader>
          <div className="py-4 space-y-4">
            <div>
              <label className="text-sm text-muted-foreground mb-1.5 block">Nome</label>
              <Input
                placeholder="Nome do board..."
                value={boardNome}
                onChange={(e) => setBoardNome(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && salvarBoard()}
                autoFocus
              />
            </div>
            <div>
              <label className="text-sm text-muted-foreground mb-1.5 block flex items-center gap-1">
                <Palette className="h-3 w-3" />
                Cor
              </label>
              <div className="grid grid-cols-4 gap-2">
                {CORES_BOARD.map((cor) => (
                  <button
                    key={cor.valor}
                    className={`h-8 rounded ${cor.bg} border border-border text-xs ${cor.text} ${
                      boardCor === cor.valor ? 'ring-2 ring-primary ring-offset-1' : ''
                    }`}
                    onClick={() => setBoardCor(cor.valor)}
                    type="button"
                  >
                    {cor.nome}
                  </button>
                ))}
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={salvarBoard} disabled={!boardNome.trim()}>
              {editingBoard ? 'Salvar' : 'Criar'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
