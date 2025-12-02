-- Create table for media metadata (visibility control)
CREATE TABLE public.midias_catalogo (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  modelo_id UUID NOT NULL REFERENCES public.catalogo_modelos(id) ON DELETE CASCADE,
  nome_arquivo TEXT NOT NULL,
  url TEXT NOT NULL,
  visivel_catalogo BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.midias_catalogo ENABLE ROW LEVEL SECURITY;

-- Policies
CREATE POLICY "Todos podem ver mídias visíveis" 
ON public.midias_catalogo 
FOR SELECT 
USING (true);

CREATE POLICY "Usuários autenticados podem inserir mídias" 
ON public.midias_catalogo 
FOR INSERT 
WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Usuários autenticados podem atualizar mídias" 
ON public.midias_catalogo 
FOR UPDATE 
USING (auth.uid() IS NOT NULL);

CREATE POLICY "Usuários autenticados podem deletar mídias" 
ON public.midias_catalogo 
FOR DELETE 
USING (auth.uid() IS NOT NULL);

-- Trigger for updated_at
CREATE TRIGGER update_midias_catalogo_updated_at
BEFORE UPDATE ON public.midias_catalogo
FOR EACH ROW
EXECUTE FUNCTION public.handle_updated_at();