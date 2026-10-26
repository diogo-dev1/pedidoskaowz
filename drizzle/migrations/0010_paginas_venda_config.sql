CREATE TABLE public.paginas_venda_config (
  slug text PRIMARY KEY,
  conteudo jsonb NOT NULL DEFAULT '{}'::jsonb,
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.paginas_venda_config TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.paginas_venda_config TO authenticated;
GRANT ALL ON public.paginas_venda_config TO service_role;
ALTER TABLE public.paginas_venda_config ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Leitura pública" ON public.paginas_venda_config FOR SELECT USING (true);
CREATE POLICY "Admin insere" ON public.paginas_venda_config FOR INSERT TO authenticated WITH CHECK (public.is_admin(auth.uid()));
CREATE POLICY "Admin atualiza" ON public.paginas_venda_config FOR UPDATE TO authenticated USING (public.is_admin(auth.uid())) WITH CHECK (public.is_admin(auth.uid()));
CREATE POLICY "Admin remove" ON public.paginas_venda_config FOR DELETE TO authenticated USING (public.is_admin(auth.uid()));
CREATE TRIGGER paginas_venda_config_updated BEFORE UPDATE ON public.paginas_venda_config FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();