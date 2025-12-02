-- Adicionar campo de vídeo na tabela catalogo_modelos
ALTER TABLE public.catalogo_modelos 
ADD COLUMN video_url TEXT;