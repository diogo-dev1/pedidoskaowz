-- Create table for multiple media items per etapa
CREATE TABLE public.midias_info_etapas (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  etapa_key TEXT NOT NULL,
  tipo TEXT NOT NULL CHECK (tipo IN ('imagem', 'video')),
  url TEXT NOT NULL,
  nome_arquivo TEXT NOT NULL,
  ordem INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.midias_info_etapas ENABLE ROW LEVEL SECURITY;

-- RLS policies
CREATE POLICY "Todos podem ver mídias das etapas"
ON public.midias_info_etapas
FOR SELECT
USING (true);

CREATE POLICY "Usuários autenticados podem inserir mídias"
ON public.midias_info_etapas
FOR INSERT
WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Usuários autenticados podem deletar mídias"
ON public.midias_info_etapas
FOR DELETE
USING (auth.uid() IS NOT NULL);

-- Create storage bucket for info etapas media
INSERT INTO storage.buckets (id, name, public) VALUES ('info-etapas-midias', 'info-etapas-midias', true);

-- Storage policies
CREATE POLICY "Todos podem ver mídias info etapas"
ON storage.objects FOR SELECT
USING (bucket_id = 'info-etapas-midias');

CREATE POLICY "Autenticados podem inserir mídias info etapas"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'info-etapas-midias' AND auth.uid() IS NOT NULL);

CREATE POLICY "Autenticados podem deletar mídias info etapas"
ON storage.objects FOR DELETE
USING (bucket_id = 'info-etapas-midias' AND auth.uid() IS NOT NULL);