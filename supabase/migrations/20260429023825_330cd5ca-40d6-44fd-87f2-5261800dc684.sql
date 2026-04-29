-- Tabela chave/valor para config do catálogo internacional (mesmo padrão de config_revendedor)
CREATE TABLE IF NOT EXISTS public.config_internacional (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  chave text NOT NULL UNIQUE,
  valor text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.config_internacional ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Todos podem ver config internacional kv"
  ON public.config_internacional FOR SELECT USING (true);
CREATE POLICY "Autenticados podem inserir config internacional kv"
  ON public.config_internacional FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);
CREATE POLICY "Autenticados podem atualizar config internacional kv"
  ON public.config_internacional FOR UPDATE USING (auth.uid() IS NOT NULL);

-- Margens individuais (espelha margem_revendedor_produto)
CREATE TABLE IF NOT EXISTS public.margem_internacional_produto (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  modelo_id uuid NOT NULL UNIQUE,
  margem_percentual numeric NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.margem_internacional_produto ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Todos podem ver margem internacional"
  ON public.margem_internacional_produto FOR SELECT USING (true);
CREATE POLICY "Autenticados podem inserir margem internacional"
  ON public.margem_internacional_produto FOR INSERT TO authenticated WITH CHECK (auth.uid() IS NOT NULL);
CREATE POLICY "Autenticados podem atualizar margem internacional"
  ON public.margem_internacional_produto FOR UPDATE TO authenticated USING (auth.uid() IS NOT NULL);
CREATE POLICY "Autenticados podem deletar margem internacional"
  ON public.margem_internacional_produto FOR DELETE TO authenticated USING (auth.uid() IS NOT NULL);

-- Ordem por categoria (espelha ordem_categoria_revendedor)
CREATE TABLE IF NOT EXISTS public.ordem_categoria_internacional (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  categoria_id uuid NOT NULL,
  modelo_id uuid NOT NULL,
  ordem integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.ordem_categoria_internacional ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Todos podem ver ordem internacional"
  ON public.ordem_categoria_internacional FOR SELECT USING (true);
CREATE POLICY "Autenticados podem inserir ordem internacional"
  ON public.ordem_categoria_internacional FOR INSERT TO authenticated WITH CHECK (auth.uid() IS NOT NULL);
CREATE POLICY "Autenticados podem atualizar ordem internacional"
  ON public.ordem_categoria_internacional FOR UPDATE TO authenticated USING (auth.uid() IS NOT NULL);
CREATE POLICY "Autenticados podem deletar ordem internacional"
  ON public.ordem_categoria_internacional FOR DELETE TO authenticated USING (auth.uid() IS NOT NULL);

-- Seed defaults (mesmas chaves do config_revendedor + mensagem padrão)
INSERT INTO public.config_internacional (chave, valor) VALUES
  ('exibir_precos', 'true'),
  ('filtro_preco_ativo', 'true'),
  ('filtro_tamanho_ativo', 'true'),
  ('filtro_lamina_ativo', 'true'),
  ('margem_global', '30'),
  ('mensagem_padrao_internacional', 'Check out our exclusive international catalog!')
ON CONFLICT (chave) DO NOTHING;