-- Kit Urban EDC: tabela de configuração chave/valor (mesmo padrão de push_dagger_config)
CREATE TABLE public.urban_edc_config (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  chave text NOT NULL UNIQUE,
  valor text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT ON public.urban_edc_config TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.urban_edc_config TO authenticated;
GRANT ALL ON public.urban_edc_config TO service_role;

ALTER TABLE public.urban_edc_config ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Todos veem config urban edc" ON public.urban_edc_config FOR SELECT USING (true);
CREATE POLICY "Autenticados inserem config urban edc" ON public.urban_edc_config FOR INSERT TO authenticated WITH CHECK (auth.uid() IS NOT NULL);
CREATE POLICY "Autenticados atualizam config urban edc" ON public.urban_edc_config FOR UPDATE TO authenticated USING (auth.uid() IS NOT NULL);
CREATE POLICY "Autenticados deletam config urban edc" ON public.urban_edc_config FOR DELETE TO authenticated USING (auth.uid() IS NOT NULL);

CREATE TRIGGER trg_urban_edc_config_updated BEFORE UPDATE ON public.urban_edc_config FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Valores padrão (textos, aço/empunhadura, canivetes K1, multitool, case, desconto)
INSERT INTO public.urban_edc_config (chave, valor) VALUES
  ('whatsapp_phone', '5528999025695'),
  ('push_aco', 'sandvik'),
  ('push_empunhadura', 'g10'),
  ('canivete_ids', '["4ebaad04-6e2b-45ee-b641-b2c534a9014f","862d07a7-8e86-4710-8dd6-822a8d9e40b8","b62876de-1843-4a3c-92a3-c325850409bb"]'),
  ('multitool_id', '1b6cf9e3-96d8-403f-8119-25cf4888d935'),
  ('multitool_price', '75'),
  ('case_price', '50'),
  ('kit_discount', '0');
