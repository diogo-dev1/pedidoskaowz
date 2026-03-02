
-- Add categorias (text array) column to catalogo_modelos
ALTER TABLE public.catalogo_modelos ADD COLUMN IF NOT EXISTS categorias text[] DEFAULT '{}';

-- Populate categorias from existing categoria
UPDATE public.catalogo_modelos SET categorias = ARRAY[categoria] WHERE categoria IS NOT NULL AND categorias = '{}';
