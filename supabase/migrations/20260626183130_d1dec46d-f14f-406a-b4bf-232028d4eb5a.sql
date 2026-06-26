GRANT SELECT, INSERT, UPDATE, DELETE ON public.pedidos TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.pedido_itens TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.expedicao TO authenticated;

DROP POLICY IF EXISTS "Autenticados atualizam pedidos" ON public.pedidos;
CREATE POLICY "Autenticados atualizam pedidos" ON public.pedidos
  FOR UPDATE TO authenticated
  USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Autenticados atualizam pedido_itens" ON public.pedido_itens;
CREATE POLICY "Autenticados atualizam pedido_itens" ON public.pedido_itens
  FOR UPDATE TO authenticated
  USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Autenticados inserem expedicao" ON public.expedicao;
CREATE POLICY "Autenticados inserem expedicao" ON public.expedicao
  FOR INSERT TO authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "Autenticados atualizam expedicao" ON public.expedicao;
CREATE POLICY "Autenticados atualizam expedicao" ON public.expedicao
  FOR UPDATE TO authenticated
  USING (true) WITH CHECK (true);