ALTER TABLE public.categorias_catalogo_visiveis 
ADD COLUMN categoria_pai_id uuid REFERENCES public.categorias_catalogo_visiveis(id) ON DELETE SET NULL DEFAULT NULL;