
CREATE TABLE public.kit_laminas_config (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  chave text NOT NULL UNIQUE,
  valor text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT ON public.kit_laminas_config TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.kit_laminas_config TO authenticated;
GRANT ALL ON public.kit_laminas_config TO service_role;

ALTER TABLE public.kit_laminas_config ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Todos veem config kit laminas" ON public.kit_laminas_config FOR SELECT USING (true);
CREATE POLICY "Autenticados inserem config kit laminas" ON public.kit_laminas_config FOR INSERT TO authenticated WITH CHECK (auth.uid() IS NOT NULL);
CREATE POLICY "Autenticados atualizam config kit laminas" ON public.kit_laminas_config FOR UPDATE TO authenticated USING (auth.uid() IS NOT NULL);
CREATE POLICY "Autenticados deletam config kit laminas" ON public.kit_laminas_config FOR DELETE TO authenticated USING (auth.uid() IS NOT NULL);

CREATE TABLE public.kit_laminas_combos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  nome text NOT NULL,
  descricao text,
  modelo_ids uuid[] NOT NULL DEFAULT '{}',
  desconto_percentual numeric NOT NULL DEFAULT 0,
  imagem_url text,
  ativo boolean NOT NULL DEFAULT true,
  ordem integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT ON public.kit_laminas_combos TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.kit_laminas_combos TO authenticated;
GRANT ALL ON public.kit_laminas_combos TO service_role;

ALTER TABLE public.kit_laminas_combos ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Todos veem combos ativos kit laminas" ON public.kit_laminas_combos FOR SELECT USING (true);
CREATE POLICY "Autenticados inserem combos kit laminas" ON public.kit_laminas_combos FOR INSERT TO authenticated WITH CHECK (auth.uid() IS NOT NULL);
CREATE POLICY "Autenticados atualizam combos kit laminas" ON public.kit_laminas_combos FOR UPDATE TO authenticated USING (auth.uid() IS NOT NULL);
CREATE POLICY "Autenticados deletam combos kit laminas" ON public.kit_laminas_combos FOR DELETE TO authenticated USING (auth.uid() IS NOT NULL);

CREATE TRIGGER trg_kit_laminas_config_updated BEFORE UPDATE ON public.kit_laminas_config FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER trg_kit_laminas_combos_updated BEFORE UPDATE ON public.kit_laminas_combos FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

INSERT INTO public.kit_laminas_config (chave, valor) VALUES
  ('whatsapp_phone', '5528999025695'),
  ('discount_by_qty', '{"2":10,"3":15,"4":20,"5":25}'),
  ('cupom_message', 'Aproveite {pct}% de desconto montando seu Kit'),
  ('custom_kit_message', 'Olá! Quero montar um Kit personalizado de lâminas. Pode me ajudar?'),
  ('hero_eyebrow', '— Kaowz Ferramentas de Corte —'),
  ('hero_title', 'MONTE SEU {KIT}'),
  ('hero_desc', 'Escolha quantas lâminas quer no seu Kit e ganhe descontos progressivos.');
