-- ════════════════════════════════════════════════════════════════
-- Landings por categoria (scrollytelling) — tabelas, RLS, bucket,
-- métricas e semente "Porte velado".
--
-- ATENÇÃO: esta migration NÃO roda sozinha no banco do Lovable.
-- Depois do merge, aplique este SQL manualmente no banco do projeto.
-- ════════════════════════════════════════════════════════════════

-- ─────────── Tabelas ───────────

CREATE TABLE public.landings_categoria (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slug text NOT NULL UNIQUE,
  titulo text NOT NULL,
  frase_abertura text,
  subtitulo text,
  capa_url text,
  capa_tipo text NOT NULL DEFAULT 'imagem',
  publicada boolean NOT NULL DEFAULT false,
  ordem integer NOT NULL DEFAULT 0,
  -- Filtros só servem para SUGERIR lâminas no admin; a página usa landing_laminas.
  filtro_casos_uso text[] NOT NULL DEFAULT '{}',
  filtro_tipo_porte text[] NOT NULL DEFAULT '{}',
  texto_nivel_entrada text,
  texto_nivel_ideal text,
  texto_nivel_definitiva text,
  preco_entrada text NOT NULL DEFAULT 'mostrar',
  preco_ideal text NOT NULL DEFAULT 'a_partir',
  preco_definitiva text NOT NULL DEFAULT 'consulta',
  cta_entrada text NOT NULL DEFAULT 'detalhes',
  cta_ideal text NOT NULL DEFAULT 'montar',
  cta_definitiva text NOT NULL DEFAULT 'vendedor',
  mensagem_whatsapp text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT landings_categoria_slug_formato CHECK (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  CONSTRAINT landings_categoria_titulo_tamanho CHECK (char_length(titulo) BETWEEN 1 AND 120),
  CONSTRAINT landings_categoria_capa_tipo_check CHECK (capa_tipo IN ('imagem', 'video')),
  CONSTRAINT landings_categoria_preco_check CHECK (
    preco_entrada IN ('mostrar', 'a_partir', 'consulta')
    AND preco_ideal IN ('mostrar', 'a_partir', 'consulta')
    AND preco_definitiva IN ('mostrar', 'a_partir', 'consulta')
  ),
  CONSTRAINT landings_categoria_cta_check CHECK (
    cta_entrada IN ('detalhes', 'montar', 'vendedor')
    AND cta_ideal IN ('detalhes', 'montar', 'vendedor')
    AND cta_definitiva IN ('detalhes', 'montar', 'vendedor')
  )
);

CREATE TABLE public.landing_passos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  landing_id uuid NOT NULL REFERENCES public.landings_categoria(id) ON DELETE CASCADE,
  ordem integer NOT NULL DEFAULT 0,
  titulo text NOT NULL,
  texto text,
  midia_url text,
  midia_tipo text NOT NULL DEFAULT 'imagem',
  foco text, -- legenda opcional sobre a mídia
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT landing_passos_midia_tipo_check CHECK (midia_tipo IN ('imagem', 'video'))
);

CREATE TABLE public.landing_laminas (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  landing_id uuid NOT NULL REFERENCES public.landings_categoria(id) ON DELETE CASCADE,
  modelo_id uuid NOT NULL REFERENCES public.catalogo_modelos(id) ON DELETE CASCADE,
  ordem integer NOT NULL DEFAULT 0,
  nivel_override text,
  texto_categoria text,
  preco_override text,
  cta_override text,
  url_compra text, -- link do produto na loja Shopify (opcional)
  destaque boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT landing_laminas_landing_modelo_key UNIQUE (landing_id, modelo_id),
  CONSTRAINT landing_laminas_nivel_check CHECK (nivel_override IS NULL OR nivel_override IN ('entrada', 'ideal', 'definitiva')),
  CONSTRAINT landing_laminas_preco_check CHECK (preco_override IS NULL OR preco_override IN ('mostrar', 'a_partir', 'consulta')),
  CONSTRAINT landing_laminas_cta_check CHECK (cta_override IS NULL OR cta_override IN ('detalhes', 'montar', 'vendedor'))
);

CREATE TABLE public.landing_eventos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  landing_id uuid NOT NULL REFERENCES public.landings_categoria(id) ON DELETE CASCADE,
  evento text NOT NULL,
  modelo_id uuid REFERENCES public.catalogo_modelos(id) ON DELETE SET NULL,
  cta text,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT landing_eventos_evento_check CHECK (evento IN ('visita', 'fim_scroll', 'clique_cta')),
  -- 'quiz' é o botão "Fazer o quiz" do fechamento.
  CONSTRAINT landing_eventos_cta_check CHECK (cta IS NULL OR cta IN ('detalhes', 'montar', 'vendedor', 'quiz'))
);

CREATE INDEX landing_passos_landing_ordem_idx ON public.landing_passos (landing_id, ordem);
CREATE INDEX landing_laminas_landing_ordem_idx ON public.landing_laminas (landing_id, ordem);
CREATE INDEX landing_eventos_landing_created_idx ON public.landing_eventos (landing_id, created_at);

CREATE TRIGGER landings_categoria_updated_at
BEFORE UPDATE ON public.landings_categoria
FOR EACH ROW
EXECUTE FUNCTION public.handle_updated_at();

-- ─────────── Permissões ───────────

GRANT SELECT ON public.landings_categoria, public.landing_passos, public.landing_laminas TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.landings_categoria, public.landing_passos, public.landing_laminas TO authenticated;
GRANT ALL ON public.landings_categoria, public.landing_passos, public.landing_laminas TO service_role;

GRANT INSERT ON public.landing_eventos TO anon;
GRANT SELECT, INSERT ON public.landing_eventos TO authenticated;
GRANT ALL ON public.landing_eventos TO service_role;

ALTER TABLE public.landings_categoria ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.landing_passos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.landing_laminas ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.landing_eventos ENABLE ROW LEVEL SECURITY;

-- landings_categoria: público vê só publicadas; admin vê e edita tudo (inclusive rascunhos).
CREATE POLICY "Landings publicadas são públicas"
  ON public.landings_categoria FOR SELECT
  USING (publicada = true);

CREATE POLICY "Admins gerenciam landings"
  ON public.landings_categoria FOR ALL
  TO authenticated
  USING (public.is_admin(auth.uid()))
  WITH CHECK (public.is_admin(auth.uid()));

-- landing_passos e landing_laminas: público vê só se a landing dona estiver publicada.
CREATE POLICY "Passos de landings publicadas são públicos"
  ON public.landing_passos FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM public.landings_categoria l
    WHERE l.id = landing_passos.landing_id AND l.publicada = true
  ));

CREATE POLICY "Admins gerenciam passos de landings"
  ON public.landing_passos FOR ALL
  TO authenticated
  USING (public.is_admin(auth.uid()))
  WITH CHECK (public.is_admin(auth.uid()));

CREATE POLICY "Lâminas de landings publicadas são públicas"
  ON public.landing_laminas FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM public.landings_categoria l
    WHERE l.id = landing_laminas.landing_id AND l.publicada = true
  ));

CREATE POLICY "Admins gerenciam lâminas de landings"
  ON public.landing_laminas FOR ALL
  TO authenticated
  USING (public.is_admin(auth.uid()))
  WITH CHECK (public.is_admin(auth.uid()));

-- landing_eventos: qualquer visitante registra (só em landing publicada); só admin lê.
CREATE POLICY "Visitantes registram eventos de landings publicadas"
  ON public.landing_eventos FOR INSERT
  TO anon, authenticated
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.landings_categoria l
    WHERE l.id = landing_eventos.landing_id AND l.publicada = true
  ));

CREATE POLICY "Admins leem eventos de landings"
  ON public.landing_eventos FOR SELECT
  TO authenticated
  USING (public.is_admin(auth.uid()));

-- ─────────── Métricas (usadas no admin) ───────────
-- SECURITY INVOKER: respeita a RLS acima, então só admin recebe linhas.

CREATE OR REPLACE FUNCTION public.landing_metricas(_desde timestamptz DEFAULT now() - interval '30 days')
RETURNS TABLE (
  landing_id uuid,
  visitas bigint,
  fins bigint,
  cliques_detalhes bigint,
  cliques_montar bigint,
  cliques_vendedor bigint,
  cliques_quiz bigint
)
LANGUAGE sql
STABLE
SECURITY INVOKER
SET search_path = public
AS $$
  SELECT
    e.landing_id,
    count(*) FILTER (WHERE e.evento = 'visita'),
    count(*) FILTER (WHERE e.evento = 'fim_scroll'),
    count(*) FILTER (WHERE e.evento = 'clique_cta' AND e.cta = 'detalhes'),
    count(*) FILTER (WHERE e.evento = 'clique_cta' AND e.cta = 'montar'),
    count(*) FILTER (WHERE e.evento = 'clique_cta' AND e.cta = 'vendedor'),
    count(*) FILTER (WHERE e.evento = 'clique_cta' AND e.cta = 'quiz')
  FROM public.landing_eventos e
  WHERE e.created_at >= _desde
  GROUP BY e.landing_id
$$;

-- Sem REVOKE de propósito: quem não é admin executa, mas a RLS de landing_eventos
-- devolve zero linhas. (Revogar EXECUTE do anon derruba o Postgres em algumas
-- imagens locais do Supabase ao negar a chamada.)
GRANT EXECUTE ON FUNCTION public.landing_metricas(timestamptz) TO authenticated;

-- ─────────── Storage: bucket "landings" ───────────

INSERT INTO storage.buckets (id, name, public)
VALUES ('landings', 'landings', true)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "Public read landings"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'landings');

CREATE POLICY "Authenticated upload landings"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (bucket_id = 'landings');

CREATE POLICY "Authenticated update landings"
  ON storage.objects FOR UPDATE
  TO authenticated
  USING (bucket_id = 'landings');

CREATE POLICY "Authenticated delete landings"
  ON storage.objects FOR DELETE
  TO authenticated
  USING (bucket_id = 'landings');

-- ─────────── Semente: "Porte velado" (rascunho, textos provisórios) ───────────

WITH nova AS (
  INSERT INTO public.landings_categoria (
    slug, titulo, frase_abertura, subtitulo, publicada, filtro_tipo_porte,
    texto_nivel_entrada, texto_nivel_ideal, texto_nivel_definitiva, mensagem_whatsapp
  )
  VALUES (
    'porte-velado',
    'Porte velado',
    'Ninguém precisa saber. Mas você precisa ter.',
    'Lâminas feitas para andar com você sem aparecer.',
    false,
    '{velado}',
    'O primeiro passo no porte velado.',
    'O equilíbrio para quem já usa todo dia.',
    'A peça definitiva, para quem não abre mão de nada.',
    'Olá! Vi a página de porte velado da Kaowz e quero saber mais'
  )
  ON CONFLICT (slug) DO NOTHING
  RETURNING id
)
INSERT INTO public.landing_passos (landing_id, ordem, titulo, texto)
SELECT nova.id, p.ordem, p.titulo, p.texto
FROM nova
CROSS JOIN (VALUES
  (0, 'Some sob a roupa', 'Lâmina curta, perfil baixo, nenhum volume aparente na cintura.'),
  (1, 'Fica no lugar', 'Bainha e clipe pensados para o corpo: firme o dia inteiro, livre quando você precisa.'),
  (2, 'Encontra a mão sem olhar', 'Empunhadura, anel e textura que dão aderência mesmo sob suor.'),
  (3, 'Discreta até no metal', 'Acabamentos foscos que não refletem luz nem chamam atenção.')
) AS p(ordem, titulo, texto);
