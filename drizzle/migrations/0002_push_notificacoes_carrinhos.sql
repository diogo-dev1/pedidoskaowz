CREATE TABLE IF NOT EXISTS public.push_aparelhos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  nome text NOT NULL,
  endpoint text NOT NULL UNIQUE,
  p256dh text NOT NULL,
  auth text NOT NULL,
  plataforma text,
  user_agent text,
  tipos text[] NOT NULL DEFAULT '{carrinho_perdido}',
  ativo boolean NOT NULL DEFAULT true,
  falhas int NOT NULL DEFAULT 0,
  ultimo_envio_em timestamptz,
  ultimo_erro text,
  created_at timestamptz DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.push_aparelhos TO authenticated;
GRANT ALL ON public.push_aparelhos TO service_role;
ALTER TABLE public.push_aparelhos ENABLE ROW LEVEL SECURITY;
CREATE POLICY "push_aparelhos select" ON public.push_aparelhos FOR SELECT TO authenticated USING (true);
CREATE POLICY "push_aparelhos insert" ON public.push_aparelhos FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "push_aparelhos update" ON public.push_aparelhos FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "push_aparelhos delete" ON public.push_aparelhos FOR DELETE TO authenticated USING (true);

CREATE TABLE IF NOT EXISTS public.push_config (
  chave text PRIMARY KEY,
  valor text NOT NULL
);
GRANT ALL ON public.push_config TO service_role;
ALTER TABLE public.push_config ENABLE ROW LEVEL SECURITY;

CREATE TABLE IF NOT EXISTS public.carrinhos_notificados (
  checkout_id text PRIMARY KEY,
  situacao text NOT NULL,
  nome text,
  total numeric,
  criado_no_shopify timestamptz,
  notificado_em timestamptz DEFAULT now(),
  aparelhos int NOT NULL DEFAULT 0
);
GRANT SELECT ON public.carrinhos_notificados TO authenticated;
GRANT ALL ON public.carrinhos_notificados TO service_role;
ALTER TABLE public.carrinhos_notificados ENABLE ROW LEVEL SECURITY;
CREATE POLICY "carrinhos_notificados select" ON public.carrinhos_notificados FOR SELECT TO authenticated USING (true);