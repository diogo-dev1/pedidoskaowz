CREATE TABLE public.campanhas_oferta (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), slug text NOT NULL UNIQUE, titulo text NOT NULL, subtitulo text, aviso_prazo text, texto_pix_padrao text, texto_parcelamento_padrao text, ativo boolean NOT NULL DEFAULT true, created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.campanhas_oferta TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.campanhas_oferta TO authenticated;
GRANT ALL ON public.campanhas_oferta TO service_role;
ALTER TABLE public.campanhas_oferta ENABLE ROW LEVEL SECURITY;
CREATE POLICY campanhas_publicas ON public.campanhas_oferta FOR SELECT TO anon, authenticated USING (ativo);
CREATE POLICY campanhas_admin ON public.campanhas_oferta FOR ALL TO authenticated USING (public.is_admin(auth.uid())) WITH CHECK (public.is_admin(auth.uid()));
CREATE TABLE public.campanha_itens (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), campanha_id uuid NOT NULL REFERENCES public.campanhas_oferta(id) ON DELETE CASCADE, shopify_produto_id text NOT NULL, titulo text NOT NULL, descricao text, midias jsonb NOT NULL DEFAULT '[]', valor numeric, valor_de numeric, texto_pix text, texto_parcelamento text, selos text[] NOT NULL DEFAULT '{}', link_produto text, bordao_modal text, ordem integer NOT NULL DEFAULT 0, ativo boolean NOT NULL DEFAULT true, created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now(), UNIQUE(campanha_id, shopify_produto_id)
);
GRANT SELECT ON public.campanha_itens TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.campanha_itens TO authenticated;
GRANT ALL ON public.campanha_itens TO service_role;
ALTER TABLE public.campanha_itens ENABLE ROW LEVEL SECURITY;
CREATE POLICY itens_publicos ON public.campanha_itens FOR SELECT TO anon, authenticated USING (ativo AND EXISTS (SELECT 1 FROM public.campanhas_oferta c WHERE c.id=campanha_id AND c.ativo));
CREATE POLICY itens_admin ON public.campanha_itens FOR ALL TO authenticated USING (public.is_admin(auth.uid())) WITH CHECK (public.is_admin(auth.uid()));
CREATE INDEX campanha_itens_ordem ON public.campanha_itens(campanha_id, ordem);
CREATE TRIGGER campanhas_updated BEFORE UPDATE ON public.campanhas_oferta FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER campanha_itens_updated BEFORE UPDATE ON public.campanha_itens FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
ALTER PUBLICATION supabase_realtime ADD TABLE public.campanhas_oferta, public.campanha_itens;