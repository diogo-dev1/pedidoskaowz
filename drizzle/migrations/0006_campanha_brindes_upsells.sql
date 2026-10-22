CREATE TABLE public.campanha_extras (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), nome text NOT NULL, descricao text, imagem_url text, preco numeric, link text, shopify_produto_id text, origem text NOT NULL DEFAULT 'manual' CHECK (origem IN ('shopify','manual')), created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now(), CHECK (preco IS NULL OR preco >= 0)
);
GRANT SELECT ON public.campanha_extras TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.campanha_extras TO authenticated;
GRANT ALL ON public.campanha_extras TO service_role;
ALTER TABLE public.campanha_extras ENABLE ROW LEVEL SECURITY;
CREATE POLICY extras_publicos ON public.campanha_extras FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY extras_admin ON public.campanha_extras FOR ALL TO authenticated USING (public.is_admin(auth.uid())) WITH CHECK (public.is_admin(auth.uid()));
CREATE UNIQUE INDEX campanha_extras_shopify_unico ON public.campanha_extras (shopify_produto_id) WHERE shopify_produto_id IS NOT NULL;
CREATE TRIGGER campanha_extras_updated BEFORE UPDATE ON public.campanha_extras FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();
CREATE TABLE public.campanha_item_extras (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), campanha_item_id uuid NOT NULL REFERENCES public.campanha_itens(id) ON DELETE CASCADE, extra_id uuid NOT NULL REFERENCES public.campanha_extras(id) ON DELETE CASCADE, tipo text NOT NULL CHECK (tipo IN ('brinde','upsell')), preco_campanha numeric, ordem integer NOT NULL DEFAULT 0, created_at timestamptz NOT NULL DEFAULT now(), UNIQUE(campanha_item_id, extra_id, tipo), CHECK (preco_campanha IS NULL OR (tipo = 'upsell' AND preco_campanha >= 0))
);
GRANT SELECT ON public.campanha_item_extras TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.campanha_item_extras TO authenticated;
GRANT ALL ON public.campanha_item_extras TO service_role;
ALTER TABLE public.campanha_item_extras ENABLE ROW LEVEL SECURITY;
CREATE POLICY item_extras_publicos ON public.campanha_item_extras FOR SELECT TO anon, authenticated USING (EXISTS (SELECT 1 FROM public.campanha_itens i JOIN public.campanhas_oferta c ON c.id = i.campanha_id WHERE i.id = campanha_item_id AND i.ativo AND c.ativo));
CREATE POLICY item_extras_admin ON public.campanha_item_extras FOR ALL TO authenticated USING (public.is_admin(auth.uid())) WITH CHECK (public.is_admin(auth.uid()));
CREATE INDEX campanha_item_extras_extra_idx ON public.campanha_item_extras(extra_id);
ALTER PUBLICATION supabase_realtime ADD TABLE public.campanha_extras, public.campanha_item_extras;