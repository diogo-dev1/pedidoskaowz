-- Comentários/observações por pedido (chat de acompanhamento)
CREATE TABLE public.pedido_comentarios (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  pedido_id uuid NOT NULL REFERENCES public.pedidos(id) ON DELETE CASCADE,
  autor_id uuid REFERENCES public.profiles(id),
  autor_nome text NOT NULL,
  texto text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_comentarios_pedido ON public.pedido_comentarios(pedido_id, created_at);

GRANT SELECT, INSERT ON public.pedido_comentarios TO authenticated;
GRANT ALL ON public.pedido_comentarios TO service_role;

ALTER TABLE public.pedido_comentarios ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Autenticados veem comentarios" ON public.pedido_comentarios FOR SELECT TO authenticated USING (true);
CREATE POLICY "Autenticados inserem comentarios" ON public.pedido_comentarios FOR INSERT TO authenticated WITH CHECK (auth.uid() IS NOT NULL);
