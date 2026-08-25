-- 1) upsell_clientes_contatos: order_id -> contato_bling_id
ALTER TABLE public.upsell_clientes_contatos
  ADD COLUMN IF NOT EXISTS contato_bling_id BIGINT;

WITH mapa AS (
  SELECT DISTINCT c.id AS contato_row_id, p.contato_bling_id
  FROM public.upsell_clientes_contatos c
  JOIN public.bling_pedidos p
    ON NULLIF(p.dados_completos->>'numeroLoja','') = c.order_id
  WHERE p.contato_bling_id IS NOT NULL
)
UPDATE public.upsell_clientes_contatos c
SET contato_bling_id = m.contato_bling_id
FROM mapa m
WHERE m.contato_row_id = c.id;

DELETE FROM public.upsell_clientes_contatos WHERE contato_bling_id IS NULL;

-- deduplica mantendo o status mais avançado / contato mais recente
WITH ranked AS (
  SELECT id, contato_bling_id,
         ROW_NUMBER() OVER (
           PARTITION BY contato_bling_id
           ORDER BY CASE status
                      WHEN 'vendeu' THEN 4
                      WHEN 'contatado' THEN 3
                      WHEN 'sem_interesse' THEN 2
                      ELSE 1 END DESC,
                    contatado_em DESC NULLS LAST,
                    updated_at DESC
         ) AS rn
  FROM public.upsell_clientes_contatos
)
DELETE FROM public.upsell_clientes_contatos c
USING ranked r
WHERE r.id = c.id AND r.rn > 1;

ALTER TABLE public.upsell_clientes_contatos
  ALTER COLUMN contato_bling_id SET NOT NULL;

ALTER TABLE public.upsell_clientes_contatos DROP COLUMN IF EXISTS order_id;

CREATE UNIQUE INDEX IF NOT EXISTS upsell_contatos_cliente_uidx
  ON public.upsell_clientes_contatos (contato_bling_id);

-- 2) Segmentos salvos
CREATE TABLE IF NOT EXISTS public.upsell_segmentos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL DEFAULT auth.uid(),
  nome TEXT NOT NULL,
  filtros JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.upsell_segmentos TO authenticated;
GRANT ALL ON public.upsell_segmentos TO service_role;

ALTER TABLE public.upsell_segmentos ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Usuario gerencia seus segmentos" ON public.upsell_segmentos;
CREATE POLICY "Usuario gerencia seus segmentos"
  ON public.upsell_segmentos FOR ALL TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

DROP TRIGGER IF EXISTS trg_upsell_segmentos_updated ON public.upsell_segmentos;
CREATE TRIGGER trg_upsell_segmentos_updated
  BEFORE UPDATE ON public.upsell_segmentos
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 3) Consulta paginada de clientes para o upsell
CREATE OR REPLACE FUNCTION public.buscar_clientes_upsell(
  p_busca TEXT DEFAULT NULL,
  p_ufs TEXT[] DEFAULT NULL,
  p_tipo_pessoa TEXT DEFAULT NULL,
  p_gasto_min NUMERIC DEFAULT NULL,
  p_gasto_max NUMERIC DEFAULT NULL,
  p_comprou_ha_dias INT DEFAULT NULL,
  p_sem_comprar_ha_dias INT DEFAULT NULL,
  p_min_pedidos INT DEFAULT NULL,
  p_canais TEXT[] DEFAULT NULL,
  p_produtos_incluir TEXT[] DEFAULT NULL,
  p_produtos_excluir TEXT[] DEFAULT NULL,
  p_so_whatsapp BOOLEAN DEFAULT FALSE,
  p_status TEXT DEFAULT 'todos',
  p_ordem TEXT DEFAULT 'maior_gasto',
  p_limite INT DEFAULT 50,
  p_offset INT DEFAULT 0
)
RETURNS TABLE (
  contato_bling_id BIGINT,
  nome TEXT,
  documento TEXT,
  tipo_pessoa TEXT,
  email TEXT,
  total_gasto NUMERIC,
  qtd_pedidos INT,
  ticket_medio NUMERIC,
  primeiro_pedido_em DATE,
  ultimo_pedido_em DATE,
  cidade TEXT,
  uf TEXT,
  telefone_whatsapp TEXT,
  whatsapp_valido BOOLEAN,
  canais TEXT[],
  produtos TEXT[],
  status TEXT,
  contatado_em TIMESTAMPTZ,
  observacoes TEXT
)
LANGUAGE sql
STABLE
SET search_path = public
AS $$
  SELECT
    m.contato_bling_id, m.nome, m.documento, m.tipo_pessoa, m.email,
    m.total_gasto, m.qtd_pedidos, m.ticket_medio,
    m.primeiro_pedido_em, m.ultimo_pedido_em,
    m.cidade, m.uf, m.telefone_whatsapp, m.whatsapp_valido,
    m.canais, m.produtos,
    COALESCE(u.status, 'pendente') AS status,
    u.contatado_em, u.observacoes
  FROM public.clientes_metricas m
  LEFT JOIN public.upsell_clientes_contatos u ON u.contato_bling_id = m.contato_bling_id
  WHERE
    (p_busca IS NULL OR btrim(p_busca) = '' OR
       m.nome ILIKE '%' || p_busca || '%' OR
       COALESCE(m.documento,'') ILIKE '%' || regexp_replace(p_busca, '\D', '', 'g') || '%' AND regexp_replace(p_busca, '\D', '', 'g') <> '' OR
       COALESCE(m.email,'') ILIKE '%' || p_busca || '%' OR
       COALESCE(m.telefone_whatsapp,'') ILIKE '%' || regexp_replace(p_busca, '\D', '', 'g') || '%' AND regexp_replace(p_busca, '\D', '', 'g') <> '')
    AND (p_ufs IS NULL OR array_length(p_ufs,1) IS NULL OR m.uf = ANY(p_ufs))
    AND (p_tipo_pessoa IS NULL OR m.tipo_pessoa = p_tipo_pessoa)
    AND (p_gasto_min IS NULL OR m.total_gasto >= p_gasto_min)
    AND (p_gasto_max IS NULL OR m.total_gasto <= p_gasto_max)
    AND (p_min_pedidos IS NULL OR m.qtd_pedidos >= p_min_pedidos)
    AND (p_comprou_ha_dias IS NULL OR (m.ultimo_pedido_em IS NOT NULL AND m.ultimo_pedido_em >= CURRENT_DATE - p_comprou_ha_dias))
    AND (p_sem_comprar_ha_dias IS NULL OR (m.ultimo_pedido_em IS NOT NULL AND m.ultimo_pedido_em < CURRENT_DATE - p_sem_comprar_ha_dias))
    AND (p_canais IS NULL OR array_length(p_canais,1) IS NULL OR m.canais && p_canais)
    AND (p_produtos_incluir IS NULL OR array_length(p_produtos_incluir,1) IS NULL OR m.produtos && p_produtos_incluir)
    AND (p_produtos_excluir IS NULL OR array_length(p_produtos_excluir,1) IS NULL OR NOT EXISTS (
          SELECT 1 FROM public.clientes_produtos cp
          WHERE cp.contato_bling_id = m.contato_bling_id
            AND cp.produto_normalizado = ANY(p_produtos_excluir)))
    AND (p_so_whatsapp IS NOT TRUE OR m.whatsapp_valido)
    AND (p_status IS NULL OR p_status = 'todos' OR COALESCE(u.status,'pendente') = p_status)
  ORDER BY
    CASE WHEN p_ordem = 'maior_gasto' THEN m.total_gasto END DESC NULLS LAST,
    CASE WHEN p_ordem = 'mais_pedidos' THEN m.qtd_pedidos END DESC NULLS LAST,
    CASE WHEN p_ordem = 'recente' THEN m.ultimo_pedido_em END DESC NULLS LAST,
    CASE WHEN p_ordem = 'antigo' THEN m.ultimo_pedido_em END ASC NULLS LAST,
    m.contato_bling_id
  LIMIT GREATEST(COALESCE(p_limite, 50), 1)
  OFFSET GREATEST(COALESCE(p_offset, 0), 0)
$$;

-- 4) Resumo do segmento + contagens por status
CREATE OR REPLACE FUNCTION public.resumo_clientes_upsell(
  p_busca TEXT DEFAULT NULL,
  p_ufs TEXT[] DEFAULT NULL,
  p_tipo_pessoa TEXT DEFAULT NULL,
  p_gasto_min NUMERIC DEFAULT NULL,
  p_gasto_max NUMERIC DEFAULT NULL,
  p_comprou_ha_dias INT DEFAULT NULL,
  p_sem_comprar_ha_dias INT DEFAULT NULL,
  p_min_pedidos INT DEFAULT NULL,
  p_canais TEXT[] DEFAULT NULL,
  p_produtos_incluir TEXT[] DEFAULT NULL,
  p_produtos_excluir TEXT[] DEFAULT NULL,
  p_so_whatsapp BOOLEAN DEFAULT FALSE,
  p_status TEXT DEFAULT 'todos'
)
RETURNS TABLE (
  total_clientes BIGINT,
  com_whatsapp BIGINT,
  soma_gasto NUMERIC,
  ticket_medio NUMERIC,
  qtd_todos BIGINT,
  qtd_pendente BIGINT,
  qtd_contatado BIGINT,
  qtd_vendeu BIGINT,
  qtd_sem_interesse BIGINT
)
LANGUAGE sql
STABLE
SET search_path = public
AS $$
  WITH base AS (
    SELECT m.*, COALESCE(u.status,'pendente') AS st
    FROM public.clientes_metricas m
    LEFT JOIN public.upsell_clientes_contatos u ON u.contato_bling_id = m.contato_bling_id
    WHERE
      (p_busca IS NULL OR btrim(p_busca) = '' OR
         m.nome ILIKE '%' || p_busca || '%' OR
         COALESCE(m.documento,'') ILIKE '%' || regexp_replace(p_busca, '\D', '', 'g') || '%' AND regexp_replace(p_busca, '\D', '', 'g') <> '' OR
         COALESCE(m.email,'') ILIKE '%' || p_busca || '%' OR
         COALESCE(m.telefone_whatsapp,'') ILIKE '%' || regexp_replace(p_busca, '\D', '', 'g') || '%' AND regexp_replace(p_busca, '\D', '', 'g') <> '')
      AND (p_ufs IS NULL OR array_length(p_ufs,1) IS NULL OR m.uf = ANY(p_ufs))
      AND (p_tipo_pessoa IS NULL OR m.tipo_pessoa = p_tipo_pessoa)
      AND (p_gasto_min IS NULL OR m.total_gasto >= p_gasto_min)
      AND (p_gasto_max IS NULL OR m.total_gasto <= p_gasto_max)
      AND (p_min_pedidos IS NULL OR m.qtd_pedidos >= p_min_pedidos)
      AND (p_comprou_ha_dias IS NULL OR (m.ultimo_pedido_em IS NOT NULL AND m.ultimo_pedido_em >= CURRENT_DATE - p_comprou_ha_dias))
      AND (p_sem_comprar_ha_dias IS NULL OR (m.ultimo_pedido_em IS NOT NULL AND m.ultimo_pedido_em < CURRENT_DATE - p_sem_comprar_ha_dias))
      AND (p_canais IS NULL OR array_length(p_canais,1) IS NULL OR m.canais && p_canais)
      AND (p_produtos_incluir IS NULL OR array_length(p_produtos_incluir,1) IS NULL OR m.produtos && p_produtos_incluir)
      AND (p_produtos_excluir IS NULL OR array_length(p_produtos_excluir,1) IS NULL OR NOT EXISTS (
            SELECT 1 FROM public.clientes_produtos cp
            WHERE cp.contato_bling_id = m.contato_bling_id
              AND cp.produto_normalizado = ANY(p_produtos_excluir)))
      AND (p_so_whatsapp IS NOT TRUE OR m.whatsapp_valido)
  ), filtrado AS (
    SELECT * FROM base
    WHERE p_status IS NULL OR p_status = 'todos' OR st = p_status
  )
  SELECT
    (SELECT COUNT(*) FROM filtrado),
    (SELECT COUNT(*) FROM filtrado WHERE whatsapp_valido),
    (SELECT COALESCE(SUM(total_gasto),0) FROM filtrado),
    (SELECT CASE WHEN COUNT(*) > 0 THEN ROUND(COALESCE(SUM(total_gasto),0) / COUNT(*), 2) ELSE 0 END FROM filtrado),
    (SELECT COUNT(*) FROM base),
    (SELECT COUNT(*) FROM base WHERE st = 'pendente'),
    (SELECT COUNT(*) FROM base WHERE st = 'contatado'),
    (SELECT COUNT(*) FROM base WHERE st = 'vendeu'),
    (SELECT COUNT(*) FROM base WHERE st = 'sem_interesse')
$$;

-- 5) Lista de produtos para os filtros
CREATE OR REPLACE FUNCTION public.listar_produtos_upsell()
RETURNS TABLE (produto TEXT, exemplo TEXT, clientes BIGINT)
LANGUAGE sql
STABLE
SET search_path = public
AS $$
  SELECT cp.produto_normalizado,
         (ARRAY_AGG(cp.produto_original ORDER BY cp.ultima_compra_em DESC NULLS LAST))[1],
         COUNT(DISTINCT cp.contato_bling_id)
  FROM public.clientes_produtos cp
  GROUP BY cp.produto_normalizado
  ORDER BY COUNT(DISTINCT cp.contato_bling_id) DESC
$$;

GRANT EXECUTE ON FUNCTION public.buscar_clientes_upsell(TEXT,TEXT[],TEXT,NUMERIC,NUMERIC,INT,INT,INT,TEXT[],TEXT[],TEXT[],BOOLEAN,TEXT,TEXT,INT,INT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.resumo_clientes_upsell(TEXT,TEXT[],TEXT,NUMERIC,NUMERIC,INT,INT,INT,TEXT[],TEXT[],TEXT[],BOOLEAN,TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.listar_produtos_upsell() TO authenticated;