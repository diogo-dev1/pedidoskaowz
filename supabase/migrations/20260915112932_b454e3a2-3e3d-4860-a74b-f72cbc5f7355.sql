ALTER TABLE public.ofertas
  ADD COLUMN IF NOT EXISTS texto_pix text,
  ADD COLUMN IF NOT EXISTS texto_parcelamento text,
  ADD COLUMN IF NOT EXISTS selos text[] NOT NULL DEFAULT '{}';

UPDATE public.ofertas
SET texto_pix = condicoes
WHERE texto_pix IS NULL
  AND condicoes IS NOT NULL;