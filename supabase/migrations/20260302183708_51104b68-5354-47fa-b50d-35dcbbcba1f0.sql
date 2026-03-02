
-- Add categorias array column to modelos table
ALTER TABLE public.modelos ADD COLUMN IF NOT EXISTS categorias text[] DEFAULT '{}';

-- Migrate existing categoria values into the new array column
UPDATE public.modelos SET categorias = ARRAY[categoria] WHERE categoria IS NOT NULL AND (categorias IS NULL OR categorias = '{}');
