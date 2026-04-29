-- Config key-value para Catálogo Público Internacional (clone independente)
CREATE TABLE IF NOT EXISTS public.config_publico_internacional (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  chave text NOT NULL UNIQUE,
  valor text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.config_publico_internacional ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Todos podem ver config publico intl" ON public.config_publico_internacional FOR SELECT USING (true);
CREATE POLICY "Autenticados podem inserir config publico intl" ON public.config_publico_internacional FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);
CREATE POLICY "Autenticados podem atualizar config publico intl" ON public.config_publico_internacional FOR UPDATE USING (auth.uid() IS NOT NULL);

-- Margem por produto (oculta, aplicada silenciosamente)
CREATE TABLE IF NOT EXISTS public.margem_publico_internacional (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  modelo_id uuid NOT NULL UNIQUE,
  margem_percentual numeric NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.margem_publico_internacional ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Todos podem ver margem publico intl" ON public.margem_publico_internacional FOR SELECT USING (true);
CREATE POLICY "Autenticados gerenciam margem publico intl" ON public.margem_publico_internacional FOR ALL TO authenticated USING (auth.uid() IS NOT NULL) WITH CHECK (auth.uid() IS NOT NULL);

-- Ordem de destaques por categoria
CREATE TABLE IF NOT EXISTS public.ordem_categoria_publico_internacional (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  categoria_id uuid NOT NULL,
  modelo_id uuid NOT NULL,
  ordem integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(categoria_id, modelo_id)
);
ALTER TABLE public.ordem_categoria_publico_internacional ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Todos podem ver ordem publico intl" ON public.ordem_categoria_publico_internacional FOR SELECT USING (true);
CREATE POLICY "Autenticados gerenciam ordem publico intl" ON public.ordem_categoria_publico_internacional FOR ALL TO authenticated USING (auth.uid() IS NOT NULL) WITH CHECK (auth.uid() IS NOT NULL);

-- Triggers para updated_at
CREATE TRIGGER update_config_publico_internacional_updated_at BEFORE UPDATE ON public.config_publico_internacional FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_margem_publico_internacional_updated_at BEFORE UPDATE ON public.margem_publico_internacional FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Seed defaults
INSERT INTO public.config_publico_internacional (chave, valor) VALUES
  ('default_language', 'en'),
  ('default_currency', 'USD'),
  ('exchange_mode', 'auto'),
  ('margin_percent', '0'),
  ('show_language_selector', 'true'),
  ('show_currency_selector', 'true'),
  ('available_languages', 'en,pt'),
  ('available_currencies', 'USD,BRL,EUR')
ON CONFLICT (chave) DO NOTHING;