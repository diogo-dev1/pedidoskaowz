ALTER TABLE public.mensagens_padrao
  ADD COLUMN IF NOT EXISTS categoria TEXT NOT NULL DEFAULT 'padrao';

CREATE INDEX IF NOT EXISTS idx_mensagens_padrao_categoria
  ON public.mensagens_padrao (categoria, created_at DESC);