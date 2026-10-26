CREATE TABLE public.upsell_contatos_site (
  telefone text PRIMARY KEY,
  status text NOT NULL DEFAULT 'pendente',
  contatado_em timestamptz,
  contatado_por uuid,
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.upsell_contatos_site TO authenticated;
GRANT ALL ON public.upsell_contatos_site TO service_role;
ALTER TABLE public.upsell_contatos_site ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Autenticados gerenciam contatos do site" ON public.upsell_contatos_site FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE TRIGGER upsell_contatos_site_updated BEFORE UPDATE ON public.upsell_contatos_site FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Segredos de servidor (ex.: chave do cron do Bling). Sem acesso para visitantes ou usuários.
CREATE TABLE public.config_servidor (
  chave text PRIMARY KEY,
  valor text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
REVOKE ALL ON public.config_servidor FROM PUBLIC, anon, authenticated;
GRANT ALL ON public.config_servidor TO service_role;
ALTER TABLE public.config_servidor ENABLE ROW LEVEL SECURITY;
INSERT INTO public.config_servidor (chave, valor) VALUES ('bling_cron_secret', encode(extensions.gen_random_bytes(32), 'hex')) ON CONFLICT DO NOTHING;