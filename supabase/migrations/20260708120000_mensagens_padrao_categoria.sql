-- Separa as mensagens padrão por tipo (aba) na tela de Comunicação → Mensagens.
-- 'padrao' = Mensagens Padrão (comportamento atual)
-- 'apresentacao_produtos' = Apresentação de Produtos
ALTER TABLE public.mensagens_padrao
  ADD COLUMN IF NOT EXISTS categoria TEXT NOT NULL DEFAULT 'padrao';

-- Índice para o filtro por categoria + ordenação por data
CREATE INDEX IF NOT EXISTS idx_mensagens_padrao_categoria
  ON public.mensagens_padrao (categoria, created_at DESC);
