-- Criar tabela catalogo_modelos com mesma estrutura de modelos_base
CREATE TABLE public.catalogo_modelos (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  nome_modelo TEXT NOT NULL,
  preco_base NUMERIC NOT NULL,
  imagem_modelo TEXT,
  apresentacao_venda TEXT,
  categoria TEXT DEFAULT 'EDC',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  CONSTRAINT catalogo_modelos_categoria_check CHECK (categoria IN ('EDC', 'Campo', 'Cozinha', 'KZR', 'Upsell', 'Customização'))
);

-- Habilitar RLS na tabela catalogo_modelos
ALTER TABLE public.catalogo_modelos ENABLE ROW LEVEL SECURITY;

-- Políticas RLS para catalogo_modelos
CREATE POLICY "Todos podem ver modelos do catálogo"
ON public.catalogo_modelos
FOR SELECT
USING (true);

CREATE POLICY "Apenas admins podem inserir no catálogo"
ON public.catalogo_modelos
FOR INSERT
WITH CHECK (EXISTS (
  SELECT 1 FROM profiles
  WHERE profiles.user_id = auth.uid()
  AND profiles.cargo = 'admin'
));

CREATE POLICY "Apenas admins podem atualizar catálogo"
ON public.catalogo_modelos
FOR UPDATE
USING (EXISTS (
  SELECT 1 FROM profiles
  WHERE profiles.user_id = auth.uid()
  AND profiles.cargo = 'admin'
));

CREATE POLICY "Apenas admins podem deletar do catálogo"
ON public.catalogo_modelos
FOR DELETE
USING (EXISTS (
  SELECT 1 FROM profiles
  WHERE profiles.user_id = auth.uid()
  AND profiles.cargo = 'admin'
));

-- Criar trigger para updated_at na nova tabela
CREATE TRIGGER update_catalogo_modelos_updated_at
BEFORE UPDATE ON public.catalogo_modelos
FOR EACH ROW
EXECUTE FUNCTION public.handle_updated_at();

-- Copiar todos os dados de modelos_base para catalogo_modelos
INSERT INTO public.catalogo_modelos (id, nome_modelo, preco_base, imagem_modelo, apresentacao_venda, categoria, created_at, updated_at)
SELECT id, nome_modelo, preco_base, imagem_modelo, apresentacao_venda, categoria, created_at, updated_at
FROM public.modelos_base;

-- Remover produtos de categoria 'Customização' da tabela modelos_base (simulador)
DELETE FROM public.modelos_base
WHERE categoria = 'Customização';