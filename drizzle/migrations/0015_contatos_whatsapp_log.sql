CREATE TABLE public.contatos_whatsapp_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  telefone TEXT NOT NULL,
  origem TEXT NOT NULL,
  enviado_em TIMESTAMPTZ NOT NULL DEFAULT now(),
  enviado_por UUID DEFAULT auth.uid()
);
CREATE INDEX contatos_whatsapp_log_enviado_em_idx ON public.contatos_whatsapp_log (enviado_em DESC);
GRANT SELECT, INSERT, DELETE ON public.contatos_whatsapp_log TO authenticated;
GRANT ALL ON public.contatos_whatsapp_log TO service_role;
ALTER TABLE public.contatos_whatsapp_log ENABLE ROW LEVEL SECURITY;
CREATE POLICY "autenticados leem log" ON public.contatos_whatsapp_log FOR SELECT TO authenticated USING (true);
CREATE POLICY "autenticados gravam log" ON public.contatos_whatsapp_log FOR INSERT TO authenticated WITH CHECK (enviado_por = auth.uid());
CREATE POLICY "autor apaga log" ON public.contatos_whatsapp_log FOR DELETE TO authenticated USING (enviado_por = auth.uid());