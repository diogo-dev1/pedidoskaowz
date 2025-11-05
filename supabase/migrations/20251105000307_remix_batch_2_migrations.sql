
-- Migration: 20251104231248
-- Criar tabela de perfis de usuários
CREATE TABLE public.profiles (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  nome_vendedor TEXT NOT NULL,
  cargo TEXT NOT NULL CHECK (cargo IN ('admin', 'vendedor')),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Habilitar RLS
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Políticas para profiles
CREATE POLICY "Usuários podem ver seu próprio perfil"
ON public.profiles FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Usuários podem atualizar seu próprio perfil"
ON public.profiles FOR UPDATE
USING (auth.uid() = user_id);

-- Criar tabela de modelos base (lâminas)
CREATE TABLE public.modelos_base (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  nome_modelo TEXT NOT NULL,
  preco_base DECIMAL(10, 2) NOT NULL,
  imagem_modelo TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Habilitar RLS
ALTER TABLE public.modelos_base ENABLE ROW LEVEL SECURITY;

-- Políticas para modelos_base (todos podem ver, só admin pode modificar)
CREATE POLICY "Todos podem ver modelos"
ON public.modelos_base FOR SELECT
USING (true);

CREATE POLICY "Apenas admins podem inserir modelos"
ON public.modelos_base FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.profiles
    WHERE user_id = auth.uid() AND cargo = 'admin'
  )
);

CREATE POLICY "Apenas admins podem atualizar modelos"
ON public.modelos_base FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM public.profiles
    WHERE user_id = auth.uid() AND cargo = 'admin'
  )
);

CREATE POLICY "Apenas admins podem deletar modelos"
ON public.modelos_base FOR DELETE
USING (
  EXISTS (
    SELECT 1 FROM public.profiles
    WHERE user_id = auth.uid() AND cargo = 'admin'
  )
);

-- Criar tabela de opções de componentes
CREATE TABLE public.opcoes_componentes (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  nome_opcao TEXT NOT NULL,
  tipo_opcao TEXT NOT NULL CHECK (tipo_opcao IN ('Aço', 'Empunhadura', 'Acabamento', 'Bainha')),
  preco_adicional DECIMAL(10, 2) NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Habilitar RLS
ALTER TABLE public.opcoes_componentes ENABLE ROW LEVEL SECURITY;

-- Políticas para opcoes_componentes
CREATE POLICY "Todos podem ver opções"
ON public.opcoes_componentes FOR SELECT
USING (true);

CREATE POLICY "Apenas admins podem inserir opções"
ON public.opcoes_componentes FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.profiles
    WHERE user_id = auth.uid() AND cargo = 'admin'
  )
);

CREATE POLICY "Apenas admins podem atualizar opções"
ON public.opcoes_componentes FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM public.profiles
    WHERE user_id = auth.uid() AND cargo = 'admin'
  )
);

CREATE POLICY "Apenas admins podem deletar opções"
ON public.opcoes_componentes FOR DELETE
USING (
  EXISTS (
    SELECT 1 FROM public.profiles
    WHERE user_id = auth.uid() AND cargo = 'admin'
  )
);

-- Função para atualizar timestamp
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- Triggers para atualizar timestamp
CREATE TRIGGER update_modelos_base_updated_at
BEFORE UPDATE ON public.modelos_base
FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

CREATE TRIGGER update_opcoes_componentes_updated_at
BEFORE UPDATE ON public.opcoes_componentes
FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- Função para criar perfil automaticamente ao registrar usuário
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (user_id, nome_vendedor, cargo)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'nome_vendedor', 'Novo Vendedor'),
    COALESCE(NEW.raw_user_meta_data->>'cargo', 'vendedor')
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Trigger para criar perfil automaticamente
CREATE TRIGGER on_auth_user_created
AFTER INSERT ON auth.users
FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Criar bucket de storage para imagens
INSERT INTO storage.buckets (id, name, public)
VALUES ('modelo-imagens', 'modelo-imagens', true);

-- Políticas de storage
CREATE POLICY "Todos podem ver imagens"
ON storage.objects FOR SELECT
USING (bucket_id = 'modelo-imagens');

CREATE POLICY "Admins podem fazer upload de imagens"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'modelo-imagens' AND
  EXISTS (
    SELECT 1 FROM public.profiles
    WHERE user_id = auth.uid() AND cargo = 'admin'
  )
);

CREATE POLICY "Admins podem atualizar imagens"
ON storage.objects FOR UPDATE
USING (
  bucket_id = 'modelo-imagens' AND
  EXISTS (
    SELECT 1 FROM public.profiles
    WHERE user_id = auth.uid() AND cargo = 'admin'
  )
);

CREATE POLICY "Admins podem deletar imagens"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'modelo-imagens' AND
  EXISTS (
    SELECT 1 FROM public.profiles
    WHERE user_id = auth.uid() AND cargo = 'admin'
  )
);

-- Migration: 20251105000143
-- Criar tabela de produtos adicionais
CREATE TABLE public.produtos_adicionais (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  nome_produto TEXT NOT NULL,
  preco_unitario NUMERIC NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.produtos_adicionais ENABLE ROW LEVEL SECURITY;

-- Policies para produtos_adicionais
CREATE POLICY "Todos podem ver produtos adicionais"
  ON public.produtos_adicionais
  FOR SELECT
  USING (true);

CREATE POLICY "Apenas admins podem inserir produtos adicionais"
  ON public.produtos_adicionais
  FOR INSERT
  WITH CHECK (EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.user_id = auth.uid()
    AND profiles.cargo = 'admin'
  ));

CREATE POLICY "Apenas admins podem atualizar produtos adicionais"
  ON public.produtos_adicionais
  FOR UPDATE
  USING (EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.user_id = auth.uid()
    AND profiles.cargo = 'admin'
  ));

CREATE POLICY "Apenas admins podem deletar produtos adicionais"
  ON public.produtos_adicionais
  FOR DELETE
  USING (EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.user_id = auth.uid()
    AND profiles.cargo = 'admin'
  ));

-- Trigger para updated_at
CREATE TRIGGER update_produtos_adicionais_updated_at
  BEFORE UPDATE ON public.produtos_adicionais
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_updated_at();
