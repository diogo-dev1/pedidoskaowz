import { useState, useEffect } from 'react';
import { Plus, X } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import { Button } from '@/components/ui/button';

interface Tarefa {
  id: string;
  texto: string;
}

export default function Tarefas() {
  const [tarefas, setTarefas] = useState<Tarefa[]>(() => {
    const saved = localStorage.getItem('tarefas');
    return saved ? JSON.parse(saved) : [];
  });
  const [novaTarefa, setNovaTarefa] = useState('');
  const [editandoId, setEditandoId] = useState<string | null>(null);
  const [textoEdicao, setTextoEdicao] = useState('');

  useEffect(() => {
    localStorage.setItem('tarefas', JSON.stringify(tarefas));
  }, [tarefas]);

  const adicionarTarefa = () => {
    if (!novaTarefa.trim()) return;
    setTarefas([...tarefas, { id: crypto.randomUUID(), texto: novaTarefa.trim() }]);
    setNovaTarefa('');
  };

  const removerTarefa = (id: string) => {
    setTarefas(tarefas.filter(t => t.id !== id));
  };

  const iniciarEdicao = (tarefa: Tarefa) => {
    setEditandoId(tarefa.id);
    setTextoEdicao(tarefa.texto);
  };

  const salvarEdicao = () => {
    if (!textoEdicao.trim() || !editandoId) return;
    setTarefas(tarefas.map(t => 
      t.id === editandoId ? { ...t, texto: textoEdicao.trim() } : t
    ));
    setEditandoId(null);
    setTextoEdicao('');
  };

  const cancelarEdicao = () => {
    setEditandoId(null);
    setTextoEdicao('');
  };

  return (
    <div className="p-4 max-w-lg mx-auto">
      <h1 className="text-xl font-semibold mb-4">Tarefas</h1>
      
      {/* Adicionar nova tarefa */}
      <div className="flex gap-2 mb-6">
        <Input
          placeholder="Nova tarefa..."
          value={novaTarefa}
          onChange={(e) => setNovaTarefa(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && adicionarTarefa()}
          className="flex-1"
        />
        <Button size="icon" onClick={adicionarTarefa} disabled={!novaTarefa.trim()}>
          <Plus className="h-4 w-4" />
        </Button>
      </div>

      {/* Lista de tarefas */}
      <div className="space-y-2">
        {tarefas.map((tarefa) => (
          <div key={tarefa.id} className="flex items-center gap-3 p-2 rounded-lg hover:bg-muted/50 group">
            <Checkbox
              onCheckedChange={() => removerTarefa(tarefa.id)}
              className="shrink-0"
            />
            
            {editandoId === tarefa.id ? (
              <div className="flex-1 flex gap-2">
                <Input
                  value={textoEdicao}
                  onChange={(e) => setTextoEdicao(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') salvarEdicao();
                    if (e.key === 'Escape') cancelarEdicao();
                  }}
                  autoFocus
                  className="flex-1 h-8"
                />
                <Button size="sm" variant="ghost" onClick={salvarEdicao}>
                  OK
                </Button>
                <Button size="icon" variant="ghost" onClick={cancelarEdicao} className="h-8 w-8">
                  <X className="h-3 w-3" />
                </Button>
              </div>
            ) : (
              <span
                onClick={() => iniciarEdicao(tarefa)}
                className="flex-1 cursor-pointer text-sm"
              >
                {tarefa.texto}
              </span>
            )}
          </div>
        ))}
        
        {tarefas.length === 0 && (
          <p className="text-center text-muted-foreground text-sm py-8">
            Nenhuma tarefa. Adicione uma acima.
          </p>
        )}
      </div>
    </div>
  );
}
