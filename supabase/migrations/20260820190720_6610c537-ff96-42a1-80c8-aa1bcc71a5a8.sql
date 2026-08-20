ALTER TABLE public.catalogo_modelos
  ALTER COLUMN manutencao TYPE text[]
  USING CASE WHEN manutencao IS NULL OR manutencao = '' THEN '{}'::text[] ELSE ARRAY[manutencao] END,
  ALTER COLUMN manutencao SET DEFAULT '{}'::text[];

UPDATE public.catalogo_modelos SET manutencao = '{}'::text[] WHERE manutencao IS NULL;