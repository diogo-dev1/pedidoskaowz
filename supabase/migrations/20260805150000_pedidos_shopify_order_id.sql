ALTER TABLE public.pedidos ADD COLUMN IF NOT EXISTS shopify_order_id BIGINT;
ALTER TABLE public.pedidos ADD COLUMN IF NOT EXISTS shopify_order_name TEXT;
