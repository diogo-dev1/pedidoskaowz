export interface Comentario {
  id: string;
  texto: string;
  criadoEm: string;
}

export interface TarefaKanban {
  id: string;
  titulo: string;
  colunaId: string;
  ordem: number;
  concluida: boolean;
  comentarios: Comentario[];
  criadoEm: string;
}

export interface ColunaKanban {
  id: string;
  nome: string;
  ordem: number;
  cor?: string;
}

export interface BoardKanban {
  id: string;
  nome: string;
  colunas: ColunaKanban[];
  tarefas: TarefaKanban[];
  criadoEm: string;
}
