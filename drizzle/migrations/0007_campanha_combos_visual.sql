ALTER TABLE public.campanha_extras ADD COLUMN descricao_curta text;
ALTER TABLE public.campanha_itens ADD COLUMN titulo_curto text, ADD COLUMN categoria_linha text;
CREATE TABLE public.campanha_combos (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), campanha_item_id uuid NOT NULL REFERENCES public.campanha_itens(id) ON DELETE CASCADE, nome text NOT NULL, descricao_curta text, preco numeric NOT NULL DEFAULT 0 CHECK (preco >= 0), destaque boolean NOT NULL DEFAULT false, ordem integer NOT NULL DEFAULT 0, created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.campanha_combos TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.campanha_combos TO authenticated;
GRANT ALL ON public.campanha_combos TO service_role;
ALTER TABLE public.campanha_combos ENABLE ROW LEVEL SECURITY;
CREATE POLICY combos_publicos ON public.campanha_combos FOR SELECT TO anon, authenticated USING (EXISTS (SELECT 1 FROM public.campanha_itens i JOIN public.campanhas_oferta c ON c.id=i.campanha_id WHERE i.id=campanha_item_id AND i.ativo AND c.ativo));
CREATE POLICY combos_admin ON public.campanha_combos FOR ALL TO authenticated USING (public.is_admin(auth.uid())) WITH CHECK (public.is_admin(auth.uid()));
CREATE TRIGGER campanha_combos_updated BEFORE UPDATE ON public.campanha_combos FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();
CREATE TABLE public.campanha_combo_extras (
 combo_id uuid NOT NULL REFERENCES public.campanha_combos(id) ON DELETE CASCADE, extra_id uuid NOT NULL REFERENCES public.campanha_extras(id) ON DELETE CASCADE, ordem integer NOT NULL DEFAULT 0, PRIMARY KEY(combo_id,extra_id)
);
GRANT SELECT ON public.campanha_combo_extras TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.campanha_combo_extras TO authenticated;
GRANT ALL ON public.campanha_combo_extras TO service_role;
ALTER TABLE public.campanha_combo_extras ENABLE ROW LEVEL SECURITY;
CREATE POLICY combo_extras_publicos ON public.campanha_combo_extras FOR SELECT TO anon, authenticated USING (EXISTS (SELECT 1 FROM public.campanha_combos co JOIN public.campanha_itens i ON i.id=co.campanha_item_id JOIN public.campanhas_oferta c ON c.id=i.campanha_id WHERE co.id=combo_id AND i.ativo AND c.ativo));
CREATE POLICY combo_extras_admin ON public.campanha_combo_extras FOR ALL TO authenticated USING (public.is_admin(auth.uid())) WITH CHECK (public.is_admin(auth.uid()));
CREATE INDEX campanha_combos_item_idx ON public.campanha_combos(campanha_item_id);
CREATE INDEX campanha_combo_extras_extra_idx ON public.campanha_combo_extras(extra_id);
ALTER PUBLICATION supabase_realtime ADD TABLE public.campanha_combos,public.campanha_combo_extras;