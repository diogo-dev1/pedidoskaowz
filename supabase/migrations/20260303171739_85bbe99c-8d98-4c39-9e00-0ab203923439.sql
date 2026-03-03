
-- Add column for full HTML description from Shopify
ALTER TABLE public.catalogo_modelos ADD COLUMN IF NOT EXISTS descricao_html text;
