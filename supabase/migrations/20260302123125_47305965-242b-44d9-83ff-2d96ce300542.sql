-- Add unique constraint on nome_modelo for upsert from Shopify
ALTER TABLE public.catalogo_modelos ADD CONSTRAINT catalogo_modelos_nome_modelo_key UNIQUE (nome_modelo);

-- Add unique constraint on modelo_id + url for media upsert
ALTER TABLE public.midias_catalogo ADD CONSTRAINT midias_catalogo_modelo_id_url_key UNIQUE (modelo_id, url);
