CREATE TABLE public.push_dagger_galeria (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  titulo TEXT NOT NULL,
  descricao TEXT,
  imagem_url TEXT NOT NULL,
  ordem INT NOT NULL DEFAULT 0,
  ativo BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT SELECT ON public.push_dagger_galeria TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.push_dagger_galeria TO authenticated;
GRANT ALL ON public.push_dagger_galeria TO service_role;

ALTER TABLE public.push_dagger_galeria ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Galeria push dagger é pública"
  ON public.push_dagger_galeria FOR SELECT
  USING (true);

CREATE POLICY "Admins gerenciam galeria push dagger"
  ON public.push_dagger_galeria FOR ALL
  TO authenticated
  USING (public.is_admin(auth.uid()))
  WITH CHECK (public.is_admin(auth.uid()));

CREATE TRIGGER trg_push_dagger_galeria_updated
  BEFORE UPDATE ON public.push_dagger_galeria
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();