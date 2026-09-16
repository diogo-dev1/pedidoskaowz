ALTER TABLE public.ofertas
  ADD COLUMN IF NOT EXISTS midias jsonb NOT NULL DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS bordao_modal text;

UPDATE public.ofertas
SET midias = COALESCE(
  (
    SELECT jsonb_agg(
      jsonb_build_object('url', imagem_url, 'tipo', 'imagem')
      ORDER BY posicao
    )
    FROM unnest(imagens) WITH ORDINALITY AS item(imagem_url, posicao)
  ),
  '[]'::jsonb
)
WHERE midias = '[]'::jsonb
  AND COALESCE(array_length(imagens, 1), 0) > 0;

ALTER TABLE public.ofertas
  ADD CONSTRAINT ofertas_midias_array_check
  CHECK (jsonb_typeof(midias) = 'array'),
  ADD CONSTRAINT ofertas_bordao_modal_length_check
  CHECK (bordao_modal IS NULL OR char_length(bordao_modal) <= 300);