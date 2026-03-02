
-- Add visivel_catalogo column to catalogo_modelos
ALTER TABLE public.catalogo_modelos 
ADD COLUMN visivel_catalogo boolean NOT NULL DEFAULT true;

-- Create table to store which categories are visible on the catalog landing page
CREATE TABLE public.categorias_catalogo_visiveis (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  categoria text NOT NULL UNIQUE,
  visivel boolean NOT NULL DEFAULT true,
  ordem integer NOT NULL DEFAULT 0,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.categorias_catalogo_visiveis ENABLE ROW LEVEL SECURITY;

-- Everyone can read
CREATE POLICY "Todos podem ver categorias" 
ON public.categorias_catalogo_visiveis 
FOR SELECT USING (true);

-- Only authenticated users can manage
CREATE POLICY "Autenticados podem inserir categorias" 
ON public.categorias_catalogo_visiveis 
FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Autenticados podem atualizar categorias" 
ON public.categorias_catalogo_visiveis 
FOR UPDATE USING (auth.uid() IS NOT NULL);

CREATE POLICY "Autenticados podem deletar categorias" 
ON public.categorias_catalogo_visiveis 
FOR DELETE USING (auth.uid() IS NOT NULL);

-- Seed with all categories visible by default
INSERT INTO public.categorias_catalogo_visiveis (categoria, visivel, ordem) VALUES
('Defesa', true, 1),
('EDCs', true, 2),
('EDC Mini', true, 3),
('Campo', true, 4),
('Cozinha', true, 5),
('Churrasco', true, 6),
('Kits', true, 7),
('Utensílios', true, 8),
('Vestuário', true, 9),
('Cafés', true, 10);
