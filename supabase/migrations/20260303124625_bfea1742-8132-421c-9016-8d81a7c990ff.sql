
-- Add per-product control for "Todas" view and ordering
ALTER TABLE public.catalogo_modelos 
ADD COLUMN visivel_todas BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN ordem_catalogo INTEGER NOT NULL DEFAULT 999;
