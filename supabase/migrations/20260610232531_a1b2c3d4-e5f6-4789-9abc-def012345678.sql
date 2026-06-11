-- ============================================================
-- Sprint 1: tabelas core de pedidos, lotes, expedição,
-- certificados, insumos e financeiro + RLS + funções auxiliares
-- ============================================================

-- 1. Expandir profiles.cargo: admin, dono, gestor, vendedor
ALTER TABLE public.profiles DROP CONSTRAINT IF EXISTS profiles_cargo_check;
ALTER TABLE public.profiles ADD CONSTRAINT profiles_cargo_check
  CHECK (cargo IN ('admin', 'dono', 'gestor', 'vendedor'));

-- Funções auxiliares de RLS (security definer evita recursão de RLS em profiles)
CREATE OR REPLACE FUNCTION public.has_gestor_access(_user_id uuid)
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles
    WHERE user_id = _user_id AND cargo IN ('admin', 'dono', 'gestor')
  )
$$;

CREATE OR REPLACE FUNCTION public.has_dono_access(_user_id uuid)
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles
    WHERE user_id = _user_id AND cargo IN ('admin', 'dono')
  )
$$;

CREATE OR REPLACE FUNCTION public.current_profile_id()
RETURNS uuid
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT id FROM public.profiles WHERE user_id = auth.uid()
$$;

-- ============================================================
-- 2. Tabelas core
-- ============================================================

CREATE TABLE public.pedidos (
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

CREATE INDEX idx_pedidos_vendedor_id ON public.pedidos(vendedor_id);
CREATE INDEX idx_pedidos_status ON public.pedidos(status);
CREATE INDEX idx_pedidos_lote_id ON public.pedidos(lote_id);

CREATE TABLE public.pedido_itens (
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

CREATE INDEX idx_pedido_itens_pedido_id ON public.pedido_itens(pedido_id);

CREATE TABLE public.lotes (
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

CREATE TABLE public.expedicao (
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

CREATE TABLE public.certificados (
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

CREATE INDEX idx_certificados_pedido_item_id ON public.certificados(pedido_item_id);

CREATE TABLE public.insumos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nome TEXT NOT NULL,
  categoria TEXT,
  cor TEXT,
  unidade TEXT DEFAULT 'unidade',
  qtd_disponivel DECIMAL(10,2) DEFAULT 0,
  qtd_minima DECIMAL(10,2) DEFAULT 0,
  local_compra TEXT,
  observacoes TEXT,
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE public.financeiro_recebimentos (
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

CREATE INDEX idx_financeiro_recebimentos_pedido_id ON public.financeiro_recebimentos(pedido_id);

-- ============================================================
-- 3. RLS
-- ============================================================

-- pedidos: vendedor vê só seus pedidos; gestor e dono (e admin) veem todos
GRANT SELECT, INSERT, UPDATE, DELETE ON public.pedidos TO authenticated;
GRANT ALL ON public.pedidos TO service_role;
ALTER TABLE public.pedidos ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Vendedores veem seus pedidos, gestores veem todos" ON public.pedidos
  FOR SELECT TO authenticated
  USING (public.has_gestor_access(auth.uid()) OR vendedor_id = public.current_profile_id());

CREATE POLICY "Autenticados criam pedidos" ON public.pedidos
  FOR INSERT TO authenticated
  WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Vendedores atualizam seus pedidos, gestores atualizam todos" ON public.pedidos
  FOR UPDATE TO authenticated
  USING (public.has_gestor_access(auth.uid()) OR vendedor_id = public.current_profile_id());

CREATE POLICY "Gestores deletam pedidos" ON public.pedidos
  FOR DELETE TO authenticated
  USING (public.has_gestor_access(auth.uid()));

-- pedido_itens: segue acesso do pedido pai
GRANT SELECT, INSERT, UPDATE, DELETE ON public.pedido_itens TO authenticated;
GRANT ALL ON public.pedido_itens TO service_role;
ALTER TABLE public.pedido_itens ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Itens seguem acesso do pedido pai (select)" ON public.pedido_itens
  FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.pedidos p WHERE p.id = pedido_itens.pedido_id
      AND (public.has_gestor_access(auth.uid()) OR p.vendedor_id = public.current_profile_id())
  ));

CREATE POLICY "Itens seguem acesso do pedido pai (insert)" ON public.pedido_itens
  FOR INSERT TO authenticated
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.pedidos p WHERE p.id = pedido_itens.pedido_id
      AND (public.has_gestor_access(auth.uid()) OR p.vendedor_id = public.current_profile_id())
  ));

CREATE POLICY "Itens seguem acesso do pedido pai (update)" ON public.pedido_itens
  FOR UPDATE TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.pedidos p WHERE p.id = pedido_itens.pedido_id
      AND (public.has_gestor_access(auth.uid()) OR p.vendedor_id = public.current_profile_id())
  ));

CREATE POLICY "Itens seguem acesso do pedido pai (delete)" ON public.pedido_itens
  FOR DELETE TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.pedidos p WHERE p.id = pedido_itens.pedido_id
      AND (public.has_gestor_access(auth.uid()) OR p.vendedor_id = public.current_profile_id())
  ));

-- lotes, expedicao, certificados, insumos: gestor e dono (e admin)
GRANT SELECT, INSERT, UPDATE, DELETE ON public.lotes TO authenticated;
GRANT ALL ON public.lotes TO service_role;
ALTER TABLE public.lotes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Gestores acessam lotes" ON public.lotes
  FOR ALL TO authenticated
  USING (public.has_gestor_access(auth.uid()))
  WITH CHECK (public.has_gestor_access(auth.uid()));

GRANT SELECT, INSERT, UPDATE, DELETE ON public.expedicao TO authenticated;
GRANT ALL ON public.expedicao TO service_role;
ALTER TABLE public.expedicao ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Gestores acessam expedicao" ON public.expedicao
  FOR ALL TO authenticated
  USING (public.has_gestor_access(auth.uid()))
  WITH CHECK (public.has_gestor_access(auth.uid()));

GRANT SELECT, INSERT, UPDATE, DELETE ON public.certificados TO authenticated;
GRANT ALL ON public.certificados TO service_role;
ALTER TABLE public.certificados ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Gestores acessam certificados" ON public.certificados
  FOR ALL TO authenticated
  USING (public.has_gestor_access(auth.uid()))
  WITH CHECK (public.has_gestor_access(auth.uid()));

GRANT SELECT, INSERT, UPDATE, DELETE ON public.insumos TO authenticated;
GRANT ALL ON public.insumos TO service_role;
ALTER TABLE public.insumos ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Gestores acessam insumos" ON public.insumos
  FOR ALL TO authenticated
  USING (public.has_gestor_access(auth.uid()))
  WITH CHECK (public.has_gestor_access(auth.uid()));

-- financeiro_recebimentos: dono (e admin)
GRANT SELECT, INSERT, UPDATE, DELETE ON public.financeiro_recebimentos TO authenticated;
GRANT ALL ON public.financeiro_recebimentos TO service_role;
ALTER TABLE public.financeiro_recebimentos ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Donos acessam financeiro" ON public.financeiro_recebimentos
  FOR ALL TO authenticated
  USING (public.has_dono_access(auth.uid()))
  WITH CHECK (public.has_dono_access(auth.uid()));

-- ============================================================
-- 4. Funções de negócio
-- ============================================================

-- Calcula uma data futura pulando sábados e domingos
CREATE OR REPLACE FUNCTION public.calcular_prazo_uteis(dias INT)
RETURNS DATE AS $$
DECLARE
  data DATE := CURRENT_DATE;
  contador INT := 0;
BEGIN
  WHILE contador < dias LOOP
    data := data + INTERVAL '1 day';
    IF EXTRACT(DOW FROM data) NOT IN (0, 6) THEN
      contador := contador + 1;
    END IF;
  END LOOP;
  RETURN data;
END;
$$ LANGUAGE plpgsql;

-- Gera o próximo número de pedido sequencial por ano: KWZ-AAAA-XXXX
-- security definer + search_path fixo: garante numeração correta independente da RLS de quem chama
CREATE OR REPLACE FUNCTION public.gerar_numero_pedido()
RETURNS TEXT
SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  ano TEXT := EXTRACT(YEAR FROM NOW())::TEXT;
  seq INT;
BEGIN
  SELECT COALESCE(MAX(
    CAST(SPLIT_PART(numero_pedido, '-', 3) AS INTEGER)
  ), 0) + 1
  INTO seq
  FROM public.pedidos
  WHERE numero_pedido LIKE 'KWZ-' || ano || '-%';
  RETURN 'KWZ-' || ano || '-' || LPAD(seq::TEXT, 4, '0');
END;
$$ LANGUAGE plpgsql;

-- ============================================================
-- 5. Triggers de updated_at
-- ============================================================

CREATE TRIGGER trg_pedidos_updated BEFORE UPDATE ON public.pedidos
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER trg_expedicao_updated BEFORE UPDATE ON public.expedicao
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
