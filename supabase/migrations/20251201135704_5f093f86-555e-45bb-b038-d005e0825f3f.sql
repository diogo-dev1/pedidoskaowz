-- Criar tabela modelos apenas com nomes puros (sem configurações)
CREATE TABLE IF NOT EXISTS public.modelos (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  nome_modelo TEXT NOT NULL,
  categoria TEXT DEFAULT 'EDC',
  preco_base NUMERIC NOT NULL,
  imagem_modelo TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  CONSTRAINT modelos_categoria_check CHECK (categoria IN ('EDC', 'Campo', 'Cozinha', 'KZR', 'Upsell', 'Customização'))
);

-- Habilitar RLS
ALTER TABLE public.modelos ENABLE ROW LEVEL SECURITY;

-- Políticas RLS: Todos podem ver, apenas admins podem modificar
CREATE POLICY "Todos podem ver modelos"
ON public.modelos
FOR SELECT
USING (true);

CREATE POLICY "Apenas admins podem inserir modelos"
ON public.modelos
FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.user_id = auth.uid()
    AND profiles.cargo = 'admin'
  )
);

CREATE POLICY "Apenas admins podem atualizar modelos"
ON public.modelos
FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.user_id = auth.uid()
    AND profiles.cargo = 'admin'
  )
);

CREATE POLICY "Apenas admins podem deletar modelos"
ON public.modelos
FOR DELETE
USING (
  EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.user_id = auth.uid()
    AND profiles.cargo = 'admin'
  )
);

-- Trigger para updated_at
CREATE TRIGGER update_modelos_updated_at
BEFORE UPDATE ON public.modelos
FOR EACH ROW
EXECUTE FUNCTION public.handle_updated_at();

-- Inserir modelos puros iniciais
INSERT INTO public.modelos (nome_modelo, categoria, preco_base) VALUES
('Adaga EDC', 'EDC', 450.00),
('Adaga Full Size', 'Campo', 550.00),
('Jagunço', 'Campo', 780.00),
('KZR-NIMBUS', 'KZR', 850.00),
('KZR-STRATUS', 'KZR', 920.00),
('Big Camp Knife', 'Campo', 1200.00),
('EDC Compact', 'EDC', 380.00),
('Churrasco Pro', 'Cozinha', 450.00),
('Churrasco Master', 'Cozinha', 580.00),
('Tático Alpha', 'Campo', 950.00);