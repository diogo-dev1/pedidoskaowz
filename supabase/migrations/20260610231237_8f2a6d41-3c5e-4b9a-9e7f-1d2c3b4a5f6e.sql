CREATE TABLE public.push_dagger_config (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  chave text NOT NULL UNIQUE,
  valor text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT ON public.push_dagger_config TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.push_dagger_config TO authenticated;
GRANT ALL ON public.push_dagger_config TO service_role;

ALTER TABLE public.push_dagger_config ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Todos veem config push dagger" ON public.push_dagger_config FOR SELECT USING (true);
CREATE POLICY "Autenticados inserem config push dagger" ON public.push_dagger_config FOR INSERT TO authenticated WITH CHECK (auth.uid() IS NOT NULL);
CREATE POLICY "Autenticados atualizam config push dagger" ON public.push_dagger_config FOR UPDATE TO authenticated USING (auth.uid() IS NOT NULL);
CREATE POLICY "Autenticados deletam config push dagger" ON public.push_dagger_config FOR DELETE TO authenticated USING (auth.uid() IS NOT NULL);

CREATE TRIGGER trg_push_dagger_config_updated BEFORE UPDATE ON public.push_dagger_config FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Storage bucket for kit images (uploaded via admin painel)
INSERT INTO storage.buckets (id, name, public) VALUES ('push-dagger-kaowz', 'push-dagger-kaowz', true);

CREATE POLICY "Todos veem imagens push dagger" ON storage.objects FOR SELECT USING (bucket_id = 'push-dagger-kaowz');
CREATE POLICY "Autenticados sobem imagens push dagger" ON storage.objects FOR INSERT TO authenticated WITH CHECK (bucket_id = 'push-dagger-kaowz');
CREATE POLICY "Autenticados atualizam imagens push dagger" ON storage.objects FOR UPDATE TO authenticated USING (bucket_id = 'push-dagger-kaowz');
CREATE POLICY "Autenticados deletam imagens push dagger" ON storage.objects FOR DELETE TO authenticated USING (bucket_id = 'push-dagger-kaowz');

-- Valores globais padrão
INSERT INTO public.push_dagger_config (chave, valor) VALUES
  ('whatsapp_phone', '5528999025695'),
  ('discount_by_qty', '{"1":0,"2":5,"3":10}'),
  ('cupom_message', 'LANÇAMENTO 11/06 · 10% OFF + 10× sem juros nas configurações Micro e Compact (Sandvik 14C28N · G10 Black)');
