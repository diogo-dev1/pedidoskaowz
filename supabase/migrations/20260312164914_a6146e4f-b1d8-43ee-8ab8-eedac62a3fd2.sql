
-- Table to store per-category product ordering (top 10)
CREATE TABLE public.ordem_categoria_modelos (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  categoria_id UUID NOT NULL REFERENCES public.categorias_catalogo_visiveis(id) ON DELETE CASCADE,
  modelo_id UUID NOT NULL REFERENCES public.catalogo_modelos(id) ON DELETE CASCADE,
  ordem INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(categoria_id, modelo_id)
);

-- Enable RLS
ALTER TABLE public.ordem_categoria_modelos ENABLE ROW LEVEL SECURITY;

-- Everyone can read (needed for public catalog ordering)
CREATE POLICY "Todos podem ver ordem de categorias"
  ON public.ordem_categoria_modelos FOR SELECT
  USING (true);

-- Authenticated users can manage
CREATE POLICY "Autenticados podem inserir ordem"
  ON public.ordem_categoria_modelos FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Autenticados podem atualizar ordem"
  ON public.ordem_categoria_modelos FOR UPDATE
  TO authenticated
  USING (auth.uid() IS NOT NULL);

CREATE POLICY "Autenticados podem deletar ordem"
  ON public.ordem_categoria_modelos FOR DELETE
  TO authenticated
  USING (auth.uid() IS NOT NULL);
