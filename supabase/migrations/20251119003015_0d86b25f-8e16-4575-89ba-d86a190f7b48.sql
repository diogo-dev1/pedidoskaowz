-- Adicionar coluna de categoria na tabela modelos_base
ALTER TABLE public.modelos_base
ADD COLUMN IF NOT EXISTS categoria TEXT DEFAULT 'EDC' CHECK (categoria IN ('EDC', 'Campo', 'Cozinha', 'KZR'));