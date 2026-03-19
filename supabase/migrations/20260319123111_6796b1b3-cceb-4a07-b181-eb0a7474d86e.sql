
-- Table for reseller config
CREATE TABLE public.config_revendedor (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  chave text NOT NULL UNIQUE,
  valor text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.config_revendedor ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Todos podem ver config revendedor" ON public.config_revendedor
  FOR SELECT TO public USING (true);

CREATE POLICY "Autenticados podem inserir config revendedor" ON public.config_revendedor
  FOR INSERT TO public WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Autenticados podem atualizar config revendedor" ON public.config_revendedor
  FOR UPDATE TO public USING (auth.uid() IS NOT NULL);

INSERT INTO public.config_revendedor (chave, valor) VALUES
  ('margem_global', '30'),
  ('exibir_precos', 'true'),
  ('exibir_formas_pagamento', 'true'),
  ('desconto_pix', '5'),
  ('texto_pix', 'no PIX'),
  ('texto_parcelamento', '3x sem juros ou até 12x no cartão'),
  ('filtro_preco_ativo', 'true'),
  ('filtro_tamanho_ativo', 'true'),
  ('filtro_lamina_ativo', 'true');

-- Table for per-product margin overrides
CREATE TABLE public.margem_revendedor_produto (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  modelo_id uuid NOT NULL REFERENCES public.catalogo_modelos(id) ON DELETE CASCADE,
  margem_percentual numeric NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (modelo_id)
);

ALTER TABLE public.margem_revendedor_produto ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Todos podem ver margem revendedor" ON public.margem_revendedor_produto
  FOR SELECT TO public USING (true);

CREATE POLICY "Autenticados podem inserir margem revendedor" ON public.margem_revendedor_produto
  FOR INSERT TO authenticated WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Autenticados podem atualizar margem revendedor" ON public.margem_revendedor_produto
  FOR UPDATE TO authenticated USING (auth.uid() IS NOT NULL);

CREATE POLICY "Autenticados podem deletar margem revendedor" ON public.margem_revendedor_produto
  FOR DELETE TO authenticated USING (auth.uid() IS NOT NULL);

-- Revendedor highlights order table
CREATE TABLE public.ordem_categoria_revendedor (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  categoria_id uuid NOT NULL REFERENCES public.categorias_catalogo_visiveis(id) ON DELETE CASCADE,
  modelo_id uuid NOT NULL REFERENCES public.catalogo_modelos(id) ON DELETE CASCADE,
  ordem integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.ordem_categoria_revendedor ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Todos podem ver ordem revendedor" ON public.ordem_categoria_revendedor
  FOR SELECT TO public USING (true);

CREATE POLICY "Autenticados podem inserir ordem revendedor" ON public.ordem_categoria_revendedor
  FOR INSERT TO authenticated WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Autenticados podem atualizar ordem revendedor" ON public.ordem_categoria_revendedor
  FOR UPDATE TO authenticated USING (auth.uid() IS NOT NULL);

CREATE POLICY "Autenticados podem deletar ordem revendedor" ON public.ordem_categoria_revendedor
  FOR DELETE TO authenticated USING (auth.uid() IS NOT NULL);
