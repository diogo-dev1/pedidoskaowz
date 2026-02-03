import { useState, useEffect } from 'react';
import { Plus, MoreVertical, Pencil, Trash2, LayoutGrid } from 'lucide-react';
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
} from '@/components/ui/dropdown-menu';
import type { BoardKanban } from '@/types/kanban';

const BOARDS_STORAGE_KEY = 'kanban-boards';

const defaultBoards: BoardKanban[] = [
  {
    id: crypto.randomUUID(),
    nome: 'Envios de hoje',
    colunas: [
      { id: crypto.randomUUID(), nome: 'A fazer', ordem: 0 },
      { id: crypto.randomUUID(), nome: 'Em progresso', ordem: 1 },
      { id: crypto.randomUUID(), nome: 'Concluído', ordem: 2 },
    ],
    tarefas: [],
    criadoEm: new Date().toISOString(),
  },
  {
    id: crypto.randomUUID(),
    nome: 'Tarefas Urgentes',
    colunas: [
      { id: crypto.randomUUID(), nome: 'A fazer', ordem: 0 },
      { id: crypto.randomUUID(), nome: 'Em progresso', ordem: 1 },
      { id: crypto.randomUUID(), nome: 'Concluído', ordem: 2 },
    ],
    tarefas: [],
    criadoEm: new Date().toISOString(),
  },
  {
    id: crypto.randomUUID(),
    nome: 'Clientes para avisar',
    colunas: [
      { id: crypto.randomUUID(), nome: 'A fazer', ordem: 0 },
      { id: crypto.randomUUID(), nome: 'Em progresso', ordem: 1 },
      { id: crypto.randomUUID(), nome: 'Concluído', ordem: 2 },
    ],
    tarefas: [],
    criadoEm: new Date().toISOString(),
  },
];

export default function Dashboard() {
  const navigate = useNavigate();
  const [boards, setBoards] = useState<BoardKanban[]>(() => {
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
  const [editingBoard, setEditingBoard] = useState<BoardKanban | null>(null);
  const [boardNome, setBoardNome] = useState('');

  useEffect(() => {
    localStorage.setItem(BOARDS_STORAGE_KEY, JSON.stringify(boards));
  }, [boards]);

  const abrirNovoBoard = () => {
    setEditingBoard(null);
    setBoardNome('');
    setDialogOpen(true);
  };

  const abrirEditarBoard = (board: BoardKanban) => {
    setEditingBoard(board);
    setBoardNome(board.nome);
    setDialogOpen(true);
  };

  const salvarBoard = () => {
    if (!boardNome.trim()) return;

    if (editingBoard) {
      setBoards(boards.map(b => 
        b.id === editingBoard.id ? { ...b, nome: boardNome.trim() } : b
      ));
    } else {
      const novoBoard: BoardKanban = {
        id: crypto.randomUUID(),
        nome: boardNome.trim(),
        colunas: [
          { id: crypto.randomUUID(), nome: 'A fazer', ordem: 0 },
          { id: crypto.randomUUID(), nome: 'Em progresso', ordem: 1 },
          { id: crypto.randomUUID(), nome: 'Concluído', ordem: 2 },
        ],
        tarefas: [],
        criadoEm: new Date().toISOString(),
      };
      setBoards([...boards, novoBoard]);
    }

    setDialogOpen(false);
    setBoardNome('');
    setEditingBoard(null);
  };

  const excluirBoard = (id: string) => {
    setBoards(boards.filter(b => b.id !== id));
  };

  const contarTarefas = (board: BoardKanban) => {
    return board.tarefas.filter(t => !t.concluida).length;
  };

  return (
    <div className="p-4 max-w-4xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-xl font-semibold">Dashboard</h1>
        <Button size="sm" onClick={abrirNovoBoard}>
          <Plus className="h-4 w-4 mr-1" />
          Novo Board
        </Button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {boards.map((board) => (
          <Card 
            key={board.id} 
            className="cursor-pointer hover:shadow-md transition-shadow group"
          >
            <CardHeader className="pb-2">
              <div className="flex items-start justify-between">
                <CardTitle 
                  className="text-base font-medium flex items-center gap-2"
                  onClick={() => navigate(`/tarefas/${board.id}`)}
                >
                  <LayoutGrid className="h-4 w-4 text-muted-foreground" />
                  {board.nome}
                </CardTitle>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button 
                      variant="ghost" 
                      size="icon" 
                      className="h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity"
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
            <CardContent onClick={() => navigate(`/tarefas/${board.id}`)}>
              <p className="text-sm text-muted-foreground">
                {contarTarefas(board)} tarefa(s) pendente(s)
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                {board.colunas.length} coluna(s)
              </p>
            </CardContent>
          </Card>
        ))}
      </div>

      {boards.length === 0 && (
        <div className="text-center py-12">
          <LayoutGrid className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
          <p className="text-muted-foreground">Nenhum board criado ainda.</p>
          <Button className="mt-4" onClick={abrirNovoBoard}>
            Criar primeiro board
          </Button>
        </div>
      )}

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>
              {editingBoard ? 'Editar Board' : 'Novo Board'}
            </DialogTitle>
          </DialogHeader>
          <div className="py-4">
            <Input
              placeholder="Nome do board..."
              value={boardNome}
              onChange={(e) => setBoardNome(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && salvarBoard()}
              autoFocus
            />
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
