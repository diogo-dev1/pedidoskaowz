
CREATE TABLE IF NOT EXISTS public.push_dagger_config (
  chave TEXT PRIMARY KEY,
  valor TEXT,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT SELECT ON public.push_dagger_config TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.push_dagger_config TO authenticated;
GRANT ALL ON public.push_dagger_config TO service_role;

ALTER TABLE public.push_dagger_config ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public read push_dagger_config"
  ON public.push_dagger_config FOR SELECT
  USING (true);

CREATE POLICY "Authenticated manage push_dagger_config"
  ON public.push_dagger_config FOR ALL
  TO authenticated
  USING (true) WITH CHECK (true);
