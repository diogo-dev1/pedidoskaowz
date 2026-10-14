ALTER TABLE public.pedidos_pronta_entrega
 ADD COLUMN IF NOT EXISTS visualizado boolean NOT NULL DEFAULT false,
 ADD COLUMN IF NOT EXISTS visualizado_em timestamptz,
 ADD COLUMN IF NOT EXISTS case_pronta boolean NOT NULL DEFAULT false,
 ADD COLUMN IF NOT EXISTS case_pronta_em timestamptz,
 ADD COLUMN IF NOT EXISTS certificado_pronto boolean NOT NULL DEFAULT false,
 ADD COLUMN IF NOT EXISTS certificado_pronto_em timestamptz,
 ADD COLUMN IF NOT EXISTS detalhes jsonb,
 ADD COLUMN IF NOT EXISTS observacao_pedido text,
 ADD COLUMN IF NOT EXISTS certificados text[] NOT NULL DEFAULT '{}',
 ADD COLUMN IF NOT EXISTS embalagens text[] NOT NULL DEFAULT '{}',
 ADD COLUMN IF NOT EXISTS bling_pedido_id text,
 ADD COLUMN IF NOT EXISTS rastreio_servico text,
 ADD COLUMN IF NOT EXISTS rastreio_buscado_em timestamptz,
 ADD COLUMN IF NOT EXISTS rastreio_origem text;
UPDATE public.pedidos_pronta_entrega SET visualizado = true, visualizado_em = now();
UPDATE public.pedidos_pronta_entrega SET rastreio_origem = 'manual' WHERE nullif(btrim(rastreio), '') IS NOT NULL AND rastreio_origem IS NULL;
CREATE INDEX IF NOT EXISTS pedidos_pe_fluxo_idx ON public.pedidos_pronta_entrega (visualizado, data_pagamento DESC);
CREATE INDEX IF NOT EXISTS pedidos_pe_rastreio_idx ON public.pedidos_pronta_entrega (enviado_em DESC, rastreio_buscado_em);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.pedidos_pronta_entrega TO authenticated;
GRANT ALL ON public.pedidos_pronta_entrega TO service_role;