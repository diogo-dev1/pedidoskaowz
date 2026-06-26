GRANT SELECT, INSERT, UPDATE, DELETE ON public.pedido_comentarios TO authenticated;
GRANT ALL ON public.pedido_comentarios TO service_role;

DROP POLICY IF EXISTS "Autenticados inserem comentarios" ON public.pedido_comentarios;
CREATE POLICY "Autenticados inserem comentarios" ON public.pedido_comentarios
  FOR INSERT TO authenticated
  WITH CHECK (true);

DROP POLICY IF EXISTS "Autenticados veem comentarios" ON public.pedido_comentarios;
CREATE POLICY "Autenticados veem comentarios" ON public.pedido_comentarios
  FOR SELECT TO authenticated
  USING (true);