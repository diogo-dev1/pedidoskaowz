ALTER TABLE public.push_dagger_sls ADD COLUMN IF NOT EXISTS origem_chave text;
CREATE UNIQUE INDEX IF NOT EXISTS push_dagger_sls_origem_chave_key ON public.push_dagger_sls(origem_chave);
CREATE TABLE public.push_dagger_sls_ignorados (
  origem_chave text PRIMARY KEY,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.push_dagger_sls_ignorados TO authenticated;
GRANT ALL ON public.push_dagger_sls_ignorados TO service_role;
ALTER TABLE public.push_dagger_sls_ignorados ENABLE ROW LEVEL SECURITY;
CREATE POLICY "auth all" ON public.push_dagger_sls_ignorados FOR ALL TO authenticated USING (true) WITH CHECK (true);