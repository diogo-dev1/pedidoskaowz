
ALTER TABLE public.catalogo_modelos
  ADD COLUMN IF NOT EXISTS visivel_publico BOOLEAN NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS visivel_revendedor BOOLEAN NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS visivel_internacional BOOLEAN NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS visivel_publico_internacional BOOLEAN NOT NULL DEFAULT true;
