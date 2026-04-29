
-- 1) Adiciona campos EN à tabela de produtos (sem alterar campos existentes)
ALTER TABLE public.catalogo_modelos
  ADD COLUMN IF NOT EXISTS nome_modelo_en text,
  ADD COLUMN IF NOT EXISTS descricao_html_en text;

-- 2) Tabela de configuração do Catálogo Multinacional
CREATE TABLE IF NOT EXISTS public.international_catalog_config (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,

  -- Visibilidade
  show_prices boolean NOT NULL DEFAULT true,
  show_stock boolean NOT NULL DEFAULT false,

  -- Moeda
  base_currency text NOT NULL DEFAULT 'BRL',
  default_currency text NOT NULL DEFAULT 'USD',
  margin_percent numeric NOT NULL DEFAULT 0,
  show_currency_selector boolean NOT NULL DEFAULT true,
  available_currencies text[] NOT NULL DEFAULT ARRAY['USD','BRL']::text[],

  -- Idioma
  default_language text NOT NULL DEFAULT 'en',
  show_language_selector boolean NOT NULL DEFAULT true,
  available_languages text[] NOT NULL DEFAULT ARRAY['en','pt']::text[],

  -- Cotação
  exchange_mode text NOT NULL DEFAULT 'auto', -- 'auto' | 'manual'
  manual_rates jsonb NOT NULL DEFAULT '{}'::jsonb,
  manual_rates_updated_at timestamptz,

  -- Aparência
  show_logo boolean NOT NULL DEFAULT true,
  show_banner boolean NOT NULL DEFAULT true,
  banner_content text,
  contact_email text,
  contact_whatsapp text,

  -- Produtos
  visible_product_ids uuid[] NOT NULL DEFAULT ARRAY[]::uuid[],

  -- Controle
  updated_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.international_catalog_config ENABLE ROW LEVEL SECURITY;

-- Leitura pública (catálogo é público)
CREATE POLICY "Todos podem ver config internacional"
ON public.international_catalog_config
FOR SELECT
USING (true);

-- Apenas admins podem inserir/atualizar/deletar
CREATE POLICY "Admins podem inserir config internacional"
ON public.international_catalog_config
FOR INSERT
WITH CHECK (EXISTS (
  SELECT 1 FROM public.profiles
  WHERE profiles.user_id = auth.uid() AND profiles.cargo = 'admin'
));

CREATE POLICY "Admins podem atualizar config internacional"
ON public.international_catalog_config
FOR UPDATE
USING (EXISTS (
  SELECT 1 FROM public.profiles
  WHERE profiles.user_id = auth.uid() AND profiles.cargo = 'admin'
));

CREATE POLICY "Admins podem deletar config internacional"
ON public.international_catalog_config
FOR DELETE
USING (EXISTS (
  SELECT 1 FROM public.profiles
  WHERE profiles.user_id = auth.uid() AND profiles.cargo = 'admin'
));

-- Trigger de updated_at
CREATE TRIGGER trg_international_catalog_config_updated_at
BEFORE UPDATE ON public.international_catalog_config
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Seed do registro padrão
INSERT INTO public.international_catalog_config DEFAULT VALUES;
