
-- Create banners table for catalog promotions
CREATE TABLE public.banners_catalogo (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  titulo TEXT,
  subtitulo TEXT,
  imagem_url TEXT NOT NULL,
  link TEXT,
  ordem INTEGER NOT NULL DEFAULT 0,
  ativo BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.banners_catalogo ENABLE ROW LEVEL SECURITY;

-- Public read for active banners
CREATE POLICY "Todos podem ver banners ativos"
ON public.banners_catalogo
FOR SELECT
USING (true);

-- Auth users can manage banners
CREATE POLICY "Autenticados podem inserir banners"
ON public.banners_catalogo
FOR INSERT
WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Autenticados podem atualizar banners"
ON public.banners_catalogo
FOR UPDATE
USING (auth.uid() IS NOT NULL);

CREATE POLICY "Autenticados podem deletar banners"
ON public.banners_catalogo
FOR DELETE
USING (auth.uid() IS NOT NULL);

-- Create storage bucket for banner images
INSERT INTO storage.buckets (id, name, public) VALUES ('banners-catalogo', 'banners-catalogo', true);

CREATE POLICY "Todos podem ver banners storage"
ON storage.objects FOR SELECT
USING (bucket_id = 'banners-catalogo');

CREATE POLICY "Autenticados podem upload banners"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'banners-catalogo' AND auth.uid() IS NOT NULL);

CREATE POLICY "Autenticados podem deletar banners storage"
ON storage.objects FOR DELETE
USING (bucket_id = 'banners-catalogo' AND auth.uid() IS NOT NULL);
