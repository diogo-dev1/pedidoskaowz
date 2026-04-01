
CREATE TABLE public.bling_tokens (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  access_token text NOT NULL,
  refresh_token text NOT NULL,
  expires_at timestamp with time zone NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.bling_tokens ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins podem ver tokens bling" ON public.bling_tokens
  FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM profiles WHERE profiles.user_id = auth.uid() AND profiles.cargo = 'admin'));

CREATE POLICY "Admins podem inserir tokens bling" ON public.bling_tokens
  FOR INSERT TO authenticated
  WITH CHECK (EXISTS (SELECT 1 FROM profiles WHERE profiles.user_id = auth.uid() AND profiles.cargo = 'admin'));

CREATE POLICY "Admins podem atualizar tokens bling" ON public.bling_tokens
  FOR UPDATE TO authenticated
  USING (EXISTS (SELECT 1 FROM profiles WHERE profiles.user_id = auth.uid() AND profiles.cargo = 'admin'));

CREATE POLICY "Admins podem deletar tokens bling" ON public.bling_tokens
  FOR DELETE TO authenticated
  USING (EXISTS (SELECT 1 FROM profiles WHERE profiles.user_id = auth.uid() AND profiles.cargo = 'admin'));
