CREATE TABLE public.pedidos_pronta_entrega (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  pedido_numero text NOT NULL UNIQUE,
  shopify_order_id text,
  origem text NOT NULL DEFAULT 'site',
  cliente_nome text,
  cliente_telefone text,
  vendedor text,
  data_pagamento timestamptz,
  itens jsonb NOT NULL DEFAULT '[]'::jsonb,
  classificacao text NOT NULL DEFAULT 'pronta',
  modo_envio text,
  prazo_limite date,
  status text NOT NULL DEFAULT 'pendente',
  enviado_em timestamptz,
  enviado_por text,
  rastreio text,
  observacao text,
  synced_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT ppe_origem_chk CHECK (origem IN ('site','simulador','manual')),
  CONSTRAINT ppe_class_chk CHECK (classificacao IN ('pronta','misto')),
  CONSTRAINT ppe_modo_chk CHECK (modo_envio IS NULL OR modo_envio IN ('junto','parcial','a_definir')),
  CONSTRAINT ppe_status_chk CHECK (status IN ('pendente','enviado_parcial','enviado'))
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.pedidos_pronta_entrega TO authenticated;
GRANT ALL ON public.pedidos_pronta_entrega TO service_role;
ALTER TABLE public.pedidos_pronta_entrega ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Autenticados gerenciam pronta entrega" ON public.pedidos_pronta_entrega FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE INDEX idx_ppe_status_prazo ON public.pedidos_pronta_entrega (status, prazo_limite);

CREATE TABLE public.feriados (
  data date PRIMARY KEY,
  descricao text
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.feriados TO authenticated;
GRANT ALL ON public.feriados TO service_role;
ALTER TABLE public.feriados ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Autenticados gerenciam feriados" ON public.feriados FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE TABLE public.equipe_expedicao (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  nome text NOT NULL,
  ativo boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.equipe_expedicao TO authenticated;
GRANT ALL ON public.equipe_expedicao TO service_role;
ALTER TABLE public.equipe_expedicao ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Autenticados gerenciam equipe expedicao" ON public.equipe_expedicao FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE TABLE public.config_expedicao (
  chave text PRIMARY KEY,
  valor text,
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.config_expedicao TO authenticated;
GRANT ALL ON public.config_expedicao TO service_role;
ALTER TABLE public.config_expedicao ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Autenticados gerenciam config expedicao" ON public.config_expedicao FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE TRIGGER trg_config_expedicao_updated BEFORE UPDATE ON public.config_expedicao FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();