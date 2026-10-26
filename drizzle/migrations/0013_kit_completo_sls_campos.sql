ALTER TABLE public.campanhas_oferta ADD COLUMN imagem_kit_url text;
ALTER TABLE public.campanha_itens ADD COLUMN inclusos text[];
COMMENT ON COLUMN public.campanha_itens.inclusos IS 'Optional explicit included items; NULL keeps description-derived inclusions.';