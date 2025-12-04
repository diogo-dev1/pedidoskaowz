-- Criar função para updated_at se não existir
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- Criar tabela para informações detalhadas das etapas de customização
CREATE TABLE public.info_etapas_customizacao (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  etapa_key TEXT NOT NULL UNIQUE,
  titulo TEXT NOT NULL,
  conteudo TEXT,
  imagem_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Ativar RLS
ALTER TABLE public.info_etapas_customizacao ENABLE ROW LEVEL SECURITY;

-- Todos podem ler
CREATE POLICY "Todos podem ver informações das etapas"
ON public.info_etapas_customizacao
FOR SELECT
USING (true);

-- Usuários autenticados podem gerenciar
CREATE POLICY "Usuários autenticados podem inserir info"
ON public.info_etapas_customizacao
FOR INSERT
WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Usuários autenticados podem atualizar info"
ON public.info_etapas_customizacao
FOR UPDATE
USING (auth.uid() IS NOT NULL);

CREATE POLICY "Usuários autenticados podem deletar info"
ON public.info_etapas_customizacao
FOR DELETE
USING (auth.uid() IS NOT NULL);

-- Trigger para updated_at
CREATE TRIGGER update_info_etapas_updated_at
BEFORE UPDATE ON public.info_etapas_customizacao
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Inserir registros padrão para cada etapa
INSERT INTO public.info_etapas_customizacao (etapa_key, titulo, conteudo) VALUES
('modelo', 'Sobre os Modelos', 'Informações sobre os modelos disponíveis.'),
('aco', 'Sobre os Tipos de Aço', 'Informações sobre os tipos de aço disponíveis.'),
('acabamento', 'Sobre os Acabamentos', 'Informações sobre os acabamentos disponíveis.'),
('empunhadura', 'Sobre as Empunhaduras', 'Informações sobre as empunhaduras disponíveis.'),
('bainha', 'Sobre as Bainhas', 'Informações sobre as bainhas disponíveis.'),
('laser', 'Sobre Personalização à Laser', 'Informações sobre a personalização à laser.');