CREATE TABLE public.ofertas (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  titulo text NOT NULL,
  descricao text,
  etiqueta text,
  valor numeric,
  valor_de numeric,
  condicoes text,
  link_produto text,
  imagens text[] NOT NULL DEFAULT '{}',
  ordem integer NOT NULL DEFAULT 0,
  ativo boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT ON public.ofertas TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.ofertas TO authenticated;
GRANT ALL ON public.ofertas TO service_role;

ALTER TABLE public.ofertas ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Ofertas são públicas para leitura" ON public.ofertas FOR SELECT USING (true);
CREATE POLICY "Autenticados criam ofertas" ON public.ofertas FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Autenticados editam ofertas" ON public.ofertas FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Autenticados excluem ofertas" ON public.ofertas FOR DELETE TO authenticated USING (true);