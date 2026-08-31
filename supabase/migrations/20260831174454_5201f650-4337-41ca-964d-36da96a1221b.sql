CREATE TABLE public.pedidos_lancados_planilha (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  shopify_order_id TEXT NOT NULL UNIQUE,
  shopify_order_name TEXT,
  marcado_por UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.pedidos_lancados_planilha TO authenticated;
GRANT ALL ON public.pedidos_lancados_planilha TO service_role;

ALTER TABLE public.pedidos_lancados_planilha ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Autenticados gerenciam pedidos lancados"
ON public.pedidos_lancados_planilha FOR ALL TO authenticated
USING (true) WITH CHECK (true);

CREATE TRIGGER update_pedidos_lancados_planilha_updated_at
BEFORE UPDATE ON public.pedidos_lancados_planilha
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();