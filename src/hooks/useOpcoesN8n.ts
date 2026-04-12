import { useState, useEffect } from 'react';

const N8N_OPCOES_URL = 'https://kaows-pedidos-n8n.rkpi1k.easypanel.host/webhook/opcoes-kaowz';

export interface OpcoesN8n {
  modelos: string[];
  acos: string[];
  acabamentos: string[];
  empunhaduras: string[];
  coresBainha: string[];
}

export function useOpcoesN8n() {
  const [opcoes, setOpcoes] = useState<OpcoesN8n | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchOpcoes = async () => {
      try {
        const response = await fetch(N8N_OPCOES_URL);
        if (!response.ok) throw new Error(`Erro ${response.status}`);
        const data: OpcoesN8n = await response.json();
        setOpcoes(data);
      } catch (err) {
        console.error('Erro ao buscar opções do n8n:', err);
        setError(err instanceof Error ? err.message : 'Erro desconhecido');
      } finally {
        setLoading(false);
      }
    };

    fetchOpcoes();
  }, []);

  return { opcoes, loading, error };
}
