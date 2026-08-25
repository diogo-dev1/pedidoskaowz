-- ============ Tarefa 1: canal de origem ============
ALTER TABLE public.bling_pedidos ADD COLUMN IF NOT EXISTS loja_id BIGINT;
ALTER TABLE public.bling_pedidos ADD COLUMN IF NOT EXISTS canal TEXT;

CREATE TABLE IF NOT EXISTS public.bling_lojas (
  id BIGINT PRIMARY KEY,
  nome TEXT,
  canal_normalizado TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT ON public.bling_lojas TO authenticated;
GRANT ALL ON public.bling_lojas TO service_role;
ALTER TABLE public.bling_lojas ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "bling_lojas_select_auth" ON public.bling_lojas;
CREATE POLICY "bling_lojas_select_auth" ON public.bling_lojas FOR SELECT TO authenticated USING (true);

-- ============ Tarefa 2: watermark ============
CREATE TABLE IF NOT EXISTS public.bling_sync_state (
  chave TEXT PRIMARY KEY,
  ultimo_sync_em TIMESTAMPTZ,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT ON public.bling_sync_state TO authenticated;
GRANT ALL ON public.bling_sync_state TO service_role;
ALTER TABLE public.bling_sync_state ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "bling_sync_state_select_auth" ON public.bling_sync_state;
CREATE POLICY "bling_sync_state_select_auth" ON public.bling_sync_state FOR SELECT TO authenticated USING (true);
INSERT INTO public.bling_sync_state (chave) VALUES ('contatos'), ('pedidos')
ON CONFLICT (chave) DO NOTHING;

-- progresso no log
ALTER TABLE public.bling_sync_log ADD COLUMN IF NOT EXISTS progresso JSONB;

-- ============ Tarefa 4: métricas ============
CREATE TABLE IF NOT EXISTS public.clientes_metricas (
  contato_bling_id BIGINT PRIMARY KEY,
  nome TEXT,
  documento TEXT,
  tipo_pessoa TEXT,
  email TEXT,
  total_gasto NUMERIC NOT NULL DEFAULT 0,
  qtd_pedidos INTEGER NOT NULL DEFAULT 0,
  ticket_medio NUMERIC NOT NULL DEFAULT 0,
  primeiro_pedido_em DATE,
  ultimo_pedido_em DATE,
  cidade TEXT,
  uf TEXT,
  telefone_whatsapp TEXT,
  whatsapp_valido BOOLEAN NOT NULL DEFAULT false,
  canais TEXT[] NOT NULL DEFAULT '{}',
  produtos TEXT[] NOT NULL DEFAULT '{}',
  atualizado_em TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT ON public.clientes_metricas TO authenticated;
GRANT ALL ON public.clientes_metricas TO service_role;
ALTER TABLE public.clientes_metricas ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "clientes_metricas_select_auth" ON public.clientes_metricas;
CREATE POLICY "clientes_metricas_select_auth" ON public.clientes_metricas FOR SELECT TO authenticated USING (true);

CREATE TABLE IF NOT EXISTS public.clientes_produtos (
  contato_bling_id BIGINT NOT NULL,
  produto_normalizado TEXT NOT NULL,
  produto_original TEXT,
  qtd_total NUMERIC NOT NULL DEFAULT 0,
  valor_total NUMERIC NOT NULL DEFAULT 0,
  ultima_compra_em DATE,
  PRIMARY KEY (contato_bling_id, produto_normalizado)
);
GRANT SELECT ON public.clientes_produtos TO authenticated;
GRANT ALL ON public.clientes_produtos TO service_role;
ALTER TABLE public.clientes_produtos ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "clientes_produtos_select_auth" ON public.clientes_produtos;
CREATE POLICY "clientes_produtos_select_auth" ON public.clientes_produtos FOR SELECT TO authenticated USING (true);

-- ============ Funções auxiliares ============
CREATE OR REPLACE FUNCTION public.normalizar_telefone_wpp(tel TEXT)
RETURNS TEXT
LANGUAGE plpgsql
IMMUTABLE
SET search_path = public
AS $$
DECLARE d TEXT;
BEGIN
  IF tel IS NULL THEN RETURN NULL; END IF;
  d := regexp_replace(tel, '\D', '', 'g');
  IF left(d, 2) = '00' THEN d := substr(d, 3); END IF;
  IF left(d, 2) <> '55' AND length(d) IN (10, 11) THEN d := '55' || d; END IF;
  IF length(d) >= 12 THEN RETURN d; ELSE RETURN NULL; END IF;
END;
$$;

CREATE OR REPLACE FUNCTION public.normalizar_nome_produto(nome TEXT)
RETURNS TEXT
LANGUAGE sql
IMMUTABLE
SET search_path = public
AS $$
  SELECT NULLIF(regexp_replace(lower(trim(coalesce(nome, ''))), '\s+', ' ', 'g'), '')
$$;

-- ============ Recalculo de métricas ============
CREATE OR REPLACE FUNCTION public.recalcular_metricas_clientes(p_contato_ids BIGINT[] DEFAULT NULL)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE afetados INTEGER;
BEGIN
  CREATE TEMP TABLE _alvo ON COMMIT DROP AS
  SELECT DISTINCT c.bling_id
  FROM public.bling_contatos c
  WHERE p_contato_ids IS NULL OR c.bling_id = ANY(p_contato_ids);

  -- Métricas agregadas dos pedidos
  WITH ped AS (
    SELECT p.*
    FROM public.bling_pedidos p
    JOIN _alvo a ON a.bling_id = p.contato_bling_id
  ),
  agg AS (
    SELECT
      contato_bling_id,
      COALESCE(SUM(total), 0) AS total_gasto,
      COUNT(*)::int AS qtd_pedidos,
      MIN(data) AS primeiro,
      MAX(data) AS ultimo,
      ARRAY(SELECT DISTINCT x FROM unnest(array_agg(canal)) AS x WHERE x IS NOT NULL) AS canais
    FROM ped GROUP BY contato_bling_id
  ),
  endr AS (
    SELECT DISTINCT ON (contato_bling_id)
      contato_bling_id,
      NULLIF(dados_completos->'transporte'->'etiqueta'->>'municipio', '') AS cidade,
      NULLIF(dados_completos->'transporte'->'etiqueta'->>'uf', '') AS uf
    FROM ped
    WHERE NULLIF(dados_completos->'transporte'->'etiqueta'->>'uf', '') IS NOT NULL
    ORDER BY contato_bling_id, data DESC NULLS LAST
  ),
  tipop AS (
    SELECT DISTINCT ON (contato_bling_id)
      contato_bling_id,
      NULLIF(dados_completos->'contato'->>'tipoPessoa', '') AS tipo_pessoa
    FROM ped
    WHERE NULLIF(dados_completos->'contato'->>'tipoPessoa', '') IS NOT NULL
    ORDER BY contato_bling_id, data DESC NULLS LAST
  ),
  prods AS (
    SELECT contato_bling_id, ARRAY_AGG(DISTINCT pn) AS produtos
    FROM (
      SELECT p.contato_bling_id,
             public.normalizar_nome_produto(i->>'descricao') AS pn
      FROM ped p, LATERAL jsonb_array_elements(COALESCE(p.itens, '[]'::jsonb)) i
    ) s
    WHERE pn IS NOT NULL
    GROUP BY contato_bling_id
  )
  INSERT INTO public.clientes_metricas AS m (
    contato_bling_id, nome, documento, tipo_pessoa, email,
    total_gasto, qtd_pedidos, ticket_medio, primeiro_pedido_em, ultimo_pedido_em,
    cidade, uf, telefone_whatsapp, whatsapp_valido, canais, produtos, atualizado_em
  )
  SELECT
    c.bling_id,
    c.nome,
    NULLIF(regexp_replace(COALESCE(c.numero_documento, ''), '\D', '', 'g'), ''),
    CASE
      WHEN COALESCE(t.tipo_pessoa, c.tipo) = 'J' THEN 'PJ'
      WHEN COALESCE(t.tipo_pessoa, c.tipo) = 'F' THEN 'PF'
      WHEN length(regexp_replace(COALESCE(c.numero_documento, ''), '\D', '', 'g')) = 14 THEN 'PJ'
      WHEN length(regexp_replace(COALESCE(c.numero_documento, ''), '\D', '', 'g')) = 11 THEN 'PF'
      ELSE NULL
    END,
    c.email,
    COALESCE(g.total_gasto, 0),
    COALESCE(g.qtd_pedidos, 0),
    CASE WHEN COALESCE(g.qtd_pedidos, 0) > 0 THEN ROUND(g.total_gasto / g.qtd_pedidos, 2) ELSE 0 END,
    g.primeiro,
    g.ultimo,
    e.cidade,
    e.uf,
    public.normalizar_telefone_wpp(COALESCE(NULLIF(c.celular, ''), c.telefone)),
    public.normalizar_telefone_wpp(COALESCE(NULLIF(c.celular, ''), c.telefone)) IS NOT NULL,
    COALESCE(g.canais, '{}'),
    COALESCE(pr.produtos, '{}'),
    now()
  FROM public.bling_contatos c
  JOIN _alvo a ON a.bling_id = c.bling_id
  LEFT JOIN agg g ON g.contato_bling_id = c.bling_id
  LEFT JOIN endr e ON e.contato_bling_id = c.bling_id
  LEFT JOIN tipop t ON t.contato_bling_id = c.bling_id
  LEFT JOIN prods pr ON pr.contato_bling_id = c.bling_id
  ON CONFLICT (contato_bling_id) DO UPDATE SET
    nome = EXCLUDED.nome,
    documento = EXCLUDED.documento,
    tipo_pessoa = EXCLUDED.tipo_pessoa,
    email = EXCLUDED.email,
    total_gasto = EXCLUDED.total_gasto,
    qtd_pedidos = EXCLUDED.qtd_pedidos,
    ticket_medio = EXCLUDED.ticket_medio,
    primeiro_pedido_em = EXCLUDED.primeiro_pedido_em,
    ultimo_pedido_em = EXCLUDED.ultimo_pedido_em,
    cidade = COALESCE(EXCLUDED.cidade, m.cidade),
    uf = COALESCE(EXCLUDED.uf, m.uf),
    telefone_whatsapp = EXCLUDED.telefone_whatsapp,
    whatsapp_valido = EXCLUDED.whatsapp_valido,
    canais = EXCLUDED.canais,
    produtos = EXCLUDED.produtos,
    atualizado_em = now();

  GET DIAGNOSTICS afetados = ROW_COUNT;

  -- Produtos por cliente
  DELETE FROM public.clientes_produtos cp
  USING _alvo a WHERE a.bling_id = cp.contato_bling_id;

  INSERT INTO public.clientes_produtos (
    contato_bling_id, produto_normalizado, produto_original, qtd_total, valor_total, ultima_compra_em
  )
  SELECT
    s.contato_bling_id,
    s.pn,
    (ARRAY_AGG(s.descricao ORDER BY s.data DESC NULLS LAST))[1],
    SUM(s.quantidade),
    SUM(s.valor * s.quantidade),
    MAX(s.data)
  FROM (
    SELECT p.contato_bling_id,
           p.data,
           i->>'descricao' AS descricao,
           public.normalizar_nome_produto(i->>'descricao') AS pn,
           COALESCE((i->>'quantidade')::numeric, 1) AS quantidade,
           COALESCE((i->>'valor')::numeric, 0) AS valor
    FROM public.bling_pedidos p
    JOIN _alvo a ON a.bling_id = p.contato_bling_id,
    LATERAL jsonb_array_elements(COALESCE(p.itens, '[]'::jsonb)) i
  ) s
  WHERE s.pn IS NOT NULL
  GROUP BY s.contato_bling_id, s.pn;

  DROP TABLE IF EXISTS _alvo;
  RETURN afetados;
END;
$$;

-- ============ Índices ============
CREATE INDEX IF NOT EXISTS idx_bling_pedidos_canal ON public.bling_pedidos (canal);
CREATE INDEX IF NOT EXISTS idx_bling_pedidos_contato ON public.bling_pedidos (contato_bling_id);
CREATE INDEX IF NOT EXISTS idx_bling_pedidos_data ON public.bling_pedidos (data DESC);
CREATE INDEX IF NOT EXISTS idx_cm_uf ON public.clientes_metricas (uf);
CREATE INDEX IF NOT EXISTS idx_cm_tipo ON public.clientes_metricas (tipo_pessoa);
CREATE INDEX IF NOT EXISTS idx_cm_total ON public.clientes_metricas (total_gasto DESC);
CREATE INDEX IF NOT EXISTS idx_cm_ultimo ON public.clientes_metricas (ultimo_pedido_em DESC);
CREATE INDEX IF NOT EXISTS idx_cm_canais ON public.clientes_metricas USING GIN (canais);
CREATE INDEX IF NOT EXISTS idx_cm_produtos ON public.clientes_metricas USING GIN (produtos);
CREATE INDEX IF NOT EXISTS idx_cm_nome ON public.clientes_metricas (lower(nome));
CREATE INDEX IF NOT EXISTS idx_cp_produto ON public.clientes_produtos (produto_normalizado);
CREATE INDEX IF NOT EXISTS idx_cp_contato ON public.clientes_produtos (contato_bling_id);

-- ============ Backfill ============
UPDATE public.bling_pedidos SET
  loja_id = NULLIF(dados_completos->'loja'->>'id', '')::bigint,
  canal = CASE
    WHEN COALESCE(NULLIF(dados_completos->'loja'->>'id', '')::bigint, 0) = 0 THEN 'manual'
    ELSE COALESCE(
      (SELECT l.canal_normalizado FROM public.bling_lojas l
        WHERE l.id = (dados_completos->'loja'->>'id')::bigint),
      'site'
    )
  END
WHERE dados_completos IS NOT NULL;

SELECT public.recalcular_metricas_clientes();