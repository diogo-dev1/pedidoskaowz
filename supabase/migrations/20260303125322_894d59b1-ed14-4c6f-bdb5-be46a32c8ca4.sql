
-- Create a settings table for catalog configuration
CREATE TABLE public.configuracoes_catalogo (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  chave TEXT NOT NULL UNIQUE,
  valor TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.configuracoes_catalogo ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Todos podem ver configuracoes catalogo"
ON public.configuracoes_catalogo FOR SELECT USING (true);

CREATE POLICY "Autenticados podem inserir configuracoes"
ON public.configuracoes_catalogo FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Autenticados podem atualizar configuracoes"
ON public.configuracoes_catalogo FOR UPDATE USING (auth.uid() IS NOT NULL);

-- Insert default: prices visible
INSERT INTO public.configuracoes_catalogo (chave, valor) VALUES ('exibir_precos', 'true');
