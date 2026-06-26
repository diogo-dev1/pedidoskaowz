CREATE TABLE IF NOT EXISTS public.urban_edc_config (
  chave TEXT PRIMARY KEY,
  valor TEXT,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT SELECT ON public.urban_edc_config TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.urban_edc_config TO authenticated;
GRANT ALL ON public.urban_edc_config TO service_role;

ALTER TABLE public.urban_edc_config ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public can read urban edc config"
  ON public.urban_edc_config FOR SELECT
  USING (true);

CREATE POLICY "Admins manage urban edc config"
  ON public.urban_edc_config FOR ALL
  TO authenticated
  USING (public.is_admin(auth.uid()))
  WITH CHECK (public.is_admin(auth.uid()));

CREATE TRIGGER trg_urban_edc_config_updated_at
  BEFORE UPDATE ON public.urban_edc_config
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();