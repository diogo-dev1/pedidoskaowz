-- Cache table for Bling contacts
CREATE TABLE public.bling_contatos (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  bling_id bigint NOT NULL UNIQUE,
  nome text,
  fantasia text,
  tipo text,
  numero_documento text,
  email text,
  telefone text,
  celular text,
  endereco jsonb DEFAULT '{}'::jsonb,
  dados_completos jsonb DEFAULT '{}'::jsonb,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Cache table for Bling orders
CREATE TABLE public.bling_pedidos (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  bling_id bigint NOT NULL UNIQUE,
  contato_bling_id bigint,
  numero text,
  data date,
  total numeric DEFAULT 0,
  situacao text,
  itens jsonb DEFAULT '[]'::jsonb,
  dados_completos jsonb DEFAULT '{}'::jsonb,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Sync metadata table
CREATE TABLE public.bling_sync_log (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  tipo text NOT NULL,
  status text NOT NULL DEFAULT 'running',
  total_registros integer DEFAULT 0,
  erro text,
  started_at timestamp with time zone NOT NULL DEFAULT now(),
  finished_at timestamp with time zone
);

-- Indexes
CREATE INDEX idx_bling_contatos_bling_id ON public.bling_contatos(bling_id);
CREATE INDEX idx_bling_contatos_nome ON public.bling_contatos(nome);
CREATE INDEX idx_bling_pedidos_contato ON public.bling_pedidos(contato_bling_id);
CREATE INDEX idx_bling_pedidos_data ON public.bling_pedidos(data);

-- Enable RLS
ALTER TABLE public.bling_contatos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bling_pedidos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bling_sync_log ENABLE ROW LEVEL SECURITY;

-- Authenticated users can read all cached data
CREATE POLICY "Authenticated can read bling_contatos" ON public.bling_contatos FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated can read bling_pedidos" ON public.bling_pedidos FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated can read bling_sync_log" ON public.bling_sync_log FOR SELECT TO authenticated USING (true);

-- Service role (edge functions) can do everything
CREATE POLICY "Service role full access bling_contatos" ON public.bling_contatos FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY "Service role full access bling_pedidos" ON public.bling_pedidos FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY "Service role full access bling_sync_log" ON public.bling_sync_log FOR ALL TO service_role USING (true) WITH CHECK (true);

-- Triggers for updated_at
CREATE TRIGGER update_bling_contatos_updated_at BEFORE UPDATE ON public.bling_contatos FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_bling_pedidos_updated_at BEFORE UPDATE ON public.bling_pedidos FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Enable pg_cron and pg_net extensions for scheduled sync
CREATE EXTENSION IF NOT EXISTS pg_cron WITH SCHEMA pg_catalog;
CREATE EXTENSION IF NOT EXISTS pg_net WITH SCHEMA extensions;