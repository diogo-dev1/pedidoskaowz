-- ============================================================
-- SPRINT 1: Tabelas core do sistema Kaowz Gestão
-- ============================================================

-- PEDIDOS
CREATE TABLE IF NOT EXISTS public.pedidos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  numero_pedido TEXT UNIQUE NOT NULL,
  vendedor_id UUID REFERENCES public.profiles(id),
  canal TEXT,
  cliente_nome TEXT NOT NULL,
  cliente_cpf TEXT,
  cliente_email TEXT,
  cliente_celular TEXT,
  cliente_cep TEXT,
  cliente_estado TEXT,
  cliente_cidade TEXT,
  cliente_bairro TEXT,
  cliente_endereco TEXT,
  cliente_numero TEXT,
  cliente_complemento TEXT,
  cliente_nascimento DATE,
  bling_contato_id BIGINT,
  valor_total DECIMAL(10,2),
  forma_pagamento TEXT,
  cupom TEXT,
  desconto DECIMAL(10,2) DEFAULT 0,
  status TEXT DEFAULT 'aguardando_triagem',
  lote_id UUID,
  prazo_entrega DATE,
  nome_certificado TEXT,
  embalagem TEXT,
  brindes TEXT,
  observacao TEXT,
  bloqueado_expedicao BOOLEAN DEFAULT false,
  motivo_bloqueio TEXT,
  bling_pedido_id BIGINT,
  bling_nfe_id BIGINT,
  aprovado_por UUID REFERENCES public.profiles(id),
  aprovado_em TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- PEDIDO_ITENS
CREATE TABLE IF NOT EXISTS public.pedido_itens (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  pedido_id UUID REFERENCES public.pedidos(id) ON DELETE CASCADE,
  modelo TEXT,
  aco TEXT,
  acabamento TEXT,
  empunhadura TEXT,
  bainha TEXT,
  cor_bainha TEXT,
  brute_forge BOOLEAN DEFAULT false,
  dragon_scale BOOLEAN DEFAULT false,
  texto_laser TEXT,
  posicao_laser TEXT,
  embalagem_item TEXT,
  observacoes_item TEXT,
  preco_unitario DECIMAL(10,2),
  quantidade INT DEFAULT 1,
  status_lamina TEXT DEFAULT 'pendente',
  status_empunhadura TEXT DEFAULT 'pendente',
  status_bainha TEXT DEFAULT 'pendente',
  status_laser TEXT DEFAULT 'nao_aplicavel',
  certificado_id UUID,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- LOTES
CREATE TABLE IF NOT EXISTS public.lotes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  numero_lote INT UNIQUE NOT NULL,
  lote_id_semana TEXT,
  capacidade_max INT DEFAULT 45,
  total_pedidos INT DEFAULT 0,
  prazo_envio DATE,
  status TEXT DEFAULT 'aberto',
  exportado_sheets BOOLEAN DEFAULT false,
  data_exportacao TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- FK lote_id em pedidos (criada após tabela lotes existir)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_name = 'pedidos_lote_id_fkey'
  ) THEN
    ALTER TABLE public.pedidos
      ADD CONSTRAINT pedidos_lote_id_fkey
      FOREIGN KEY (lote_id) REFERENCES public.lotes(id);
  END IF;
END $$;

-- EXPEDICAO
CREATE TABLE IF NOT EXISTS public.expedicao (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  pedido_id UUID REFERENCES public.pedidos(id) UNIQUE,
  nome_destinatario TEXT,
  cep_destino TEXT,
  endereco_completo TEXT,
  tipo_caixa TEXT,
  espuma_cortada BOOLEAN DEFAULT false,
  transportadora TEXT DEFAULT 'Correios',
  codigo_rastreio TEXT,
  data_postagem DATE,
  prazo_previsto DATE,
  data_entrega DATE,
  status TEXT DEFAULT 'aguardando',
  brindes TEXT,
  observacoes TEXT,
  data_mesa TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- CERTIFICADOS
CREATE TABLE IF NOT EXISTS public.certificados (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  numero INT UNIQUE NOT NULL,
  pedido_item_id UUID REFERENCES public.pedido_itens(id),
  nome_proprietario TEXT NOT NULL,
  modelo TEXT NOT NULL,
  categoria TEXT,
  data_emissao DATE DEFAULT CURRENT_DATE,
  observacoes TEXT,
  arquivo_gerado BOOLEAN DEFAULT false,
  arquivo_gravado BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- FK certificado_id em pedido_itens
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_name = 'pedido_itens_certificado_id_fkey'
  ) THEN
    ALTER TABLE public.pedido_itens
      ADD CONSTRAINT pedido_itens_certificado_id_fkey
      FOREIGN KEY (certificado_id) REFERENCES public.certificados(id);
  END IF;
END $$;

-- FINANCEIRO_RECEBIMENTOS
CREATE TABLE IF NOT EXISTS public.financeiro_recebimentos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  pedido_id UUID REFERENCES public.pedidos(id),
  valor DECIMAL(10,2),
  forma_pagamento TEXT,
  status TEXT DEFAULT 'pendente',
  data_vencimento DATE,
  data_recebimento DATE,
  parcela INT DEFAULT 1,
  total_parcelas INT DEFAULT 1,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- ============================================================
-- FUNÇÕES RPC
-- ============================================================

-- Gerar número de pedido sequencial: KWZ-AAAA-XXXX
CREATE OR REPLACE FUNCTION public.gerar_numero_pedido()
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  ano_atual TEXT;
  ultimo_seq INT;
  novo_seq INT;
BEGIN
  ano_atual := EXTRACT(YEAR FROM now())::TEXT;

  SELECT COALESCE(
    MAX(
      CAST(SPLIT_PART(numero_pedido, '-', 3) AS INT)
    ), 0
  ) INTO ultimo_seq
  FROM public.pedidos
  WHERE numero_pedido LIKE 'KWZ-' || ano_atual || '-%';

  novo_seq := ultimo_seq + 1;

  RETURN 'KWZ-' || ano_atual || '-' || LPAD(novo_seq::TEXT, 4, '0');
END;
$$;

-- Calcular prazo em dias úteis (pula sábado e domingo)
CREATE OR REPLACE FUNCTION public.calcular_prazo_uteis(dias INT)
RETURNS DATE
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  data_atual DATE := CURRENT_DATE;
  dias_contados INT := 0;
BEGIN
  WHILE dias_contados < dias LOOP
    data_atual := data_atual + 1;
    IF EXTRACT(DOW FROM data_atual) NOT IN (0, 6) THEN
      dias_contados := dias_contados + 1;
    END IF;
  END LOOP;
  RETURN data_atual;
END;
$$;

-- Próximo número de certificado (sequencial a partir do maior existente ou 1090)
CREATE OR REPLACE FUNCTION public.proximo_numero_certificado()
RETURNS INT
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  ultimo INT;
BEGIN
  SELECT COALESCE(MAX(numero), 1089) INTO ultimo FROM public.certificados;
  RETURN ultimo + 1;
END;
$$;

-- ============================================================
-- INDEXES
-- ============================================================
CREATE INDEX IF NOT EXISTS idx_pedidos_status ON public.pedidos(status);
CREATE INDEX IF NOT EXISTS idx_pedidos_vendedor ON public.pedidos(vendedor_id);
CREATE INDEX IF NOT EXISTS idx_pedidos_created ON public.pedidos(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_pedido_itens_pedido ON public.pedido_itens(pedido_id);
CREATE INDEX IF NOT EXISTS idx_expedicao_status ON public.expedicao(status);
CREATE INDEX IF NOT EXISTS idx_certificados_pedido_item ON public.certificados(pedido_item_id);
CREATE INDEX IF NOT EXISTS idx_financeiro_pedido ON public.financeiro_recebimentos(pedido_id);
CREATE INDEX IF NOT EXISTS idx_lotes_status ON public.lotes(status);

-- ============================================================
-- RLS (básico — Sprint 7 refina com dono/gestor/vendedor)
-- ============================================================
ALTER TABLE public.pedidos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pedido_itens ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.lotes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.expedicao ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.certificados ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.financeiro_recebimentos ENABLE ROW LEVEL SECURITY;

-- Policies permissivas para admin/vendedor (Sprint 7 refina)
CREATE POLICY "Acesso total autenticado" ON public.pedidos FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Acesso total autenticado" ON public.pedido_itens FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Acesso total autenticado" ON public.lotes FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Acesso total autenticado" ON public.expedicao FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Acesso total autenticado" ON public.certificados FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Acesso total autenticado" ON public.financeiro_recebimentos FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- Service role precisa de acesso (edge functions usam service_role_key)
CREATE POLICY "Service role acesso total" ON public.pedidos FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY "Service role acesso total" ON public.pedido_itens FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY "Service role acesso total" ON public.lotes FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY "Service role acesso total" ON public.expedicao FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY "Service role acesso total" ON public.certificados FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY "Service role acesso total" ON public.financeiro_recebimentos FOR ALL TO service_role USING (true) WITH CHECK (true);
