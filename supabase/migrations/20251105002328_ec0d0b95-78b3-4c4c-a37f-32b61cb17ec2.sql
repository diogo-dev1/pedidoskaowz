-- Criar tabela de produtos adicionais
CREATE TABLE IF NOT EXISTS public.produtos_adicionais (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  nome_produto TEXT NOT NULL,
  preco_unitario NUMERIC NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Habilitar RLS
ALTER TABLE public.produtos_adicionais ENABLE ROW LEVEL SECURITY;

-- Remover policies antigas se existirem
DROP POLICY IF EXISTS "Todos podem ver produtos adicionais" ON public.produtos_adicionais;
DROP POLICY IF EXISTS "Apenas admins podem inserir produtos adicionais" ON public.produtos_adicionais;
DROP POLICY IF EXISTS "Apenas admins podem atualizar produtos adicionais" ON public.produtos_adicionais;
DROP POLICY IF EXISTS "Apenas admins podem deletar produtos adicionais" ON public.produtos_adicionais;

-- Criar novas policies
CREATE POLICY "Todos podem ver produtos adicionais" 
ON public.produtos_adicionais 
FOR SELECT 
USING (true);

CREATE POLICY "Apenas admins podem inserir produtos adicionais" 
ON public.produtos_adicionais 
FOR INSERT 
WITH CHECK (EXISTS (
  SELECT 1 FROM profiles 
  WHERE user_id = auth.uid() AND cargo = 'admin'
));

CREATE POLICY "Apenas admins podem atualizar produtos adicionais" 
ON public.produtos_adicionais 
FOR UPDATE 
USING (EXISTS (
  SELECT 1 FROM profiles 
  WHERE user_id = auth.uid() AND cargo = 'admin'
));

CREATE POLICY "Apenas admins podem deletar produtos adicionais" 
ON public.produtos_adicionais 
FOR DELETE 
USING (EXISTS (
  SELECT 1 FROM profiles 
  WHERE user_id = auth.uid() AND cargo = 'admin'
));

-- Criar trigger para updated_at
DROP TRIGGER IF EXISTS update_produtos_adicionais_updated_at ON public.produtos_adicionais;
CREATE TRIGGER update_produtos_adicionais_updated_at
BEFORE UPDATE ON public.produtos_adicionais
FOR EACH ROW
EXECUTE FUNCTION public.handle_updated_at();

-- Atualizar tipos permitidos em opcoes_componentes
ALTER TABLE public.opcoes_componentes 
DROP CONSTRAINT IF EXISTS opcoes_componentes_tipo_opcao_check;

ALTER TABLE public.opcoes_componentes 
ADD CONSTRAINT opcoes_componentes_tipo_opcao_check 
CHECK (tipo_opcao IN ('Aço', 'Empunhadura', 'Acabamento', 'Bainha', 'Espaçador', 'Variação', 'Cor de Bainha'));