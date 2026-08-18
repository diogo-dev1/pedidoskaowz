-- Atributos de recomendação nos modelos do catálogo
ALTER TABLE public.catalogo_modelos
  ADD COLUMN IF NOT EXISTS casos_uso text[] NOT NULL DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS tipo_porte text[] NOT NULL DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS nivel_envolvimento text[] NOT NULL DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS posicao_escada text,
  ADD COLUMN IF NOT EXISTS grupo_escada text,
  ADD COLUMN IF NOT EXISTS forma_enxoval uuid[] NOT NULL DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS manutencao text,
  ADD COLUMN IF NOT EXISTS porque_texto text;

-- Arsenal público (sem login) — acessado por token via edge function
CREATE TABLE IF NOT EXISTS public.arsenais (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  token text UNIQUE NOT NULL,
  nome_cliente text,
  whatsapp text,
  perfil jsonb,
  visitas integer NOT NULL DEFAULT 0,
  ultima_visita timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.arsenal_projetos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  arsenal_id uuid NOT NULL REFERENCES public.arsenais(id) ON DELETE CASCADE,
  nome text NOT NULL,
  modelo_id uuid,
  modelo_nome text,
  configuracao jsonb NOT NULL DEFAULT '{}'::jsonb,
  preco numeric,
  resumo text,
  tirar_do_papel boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_arsenal_projetos_arsenal ON public.arsenal_projetos(arsenal_id);

GRANT SELECT ON public.arsenais TO authenticated;
GRANT SELECT ON public.arsenal_projetos TO authenticated;
GRANT ALL ON public.arsenais TO service_role;
GRANT ALL ON public.arsenal_projetos TO service_role;

ALTER TABLE public.arsenais ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.arsenal_projetos ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Equipe pode ver arsenais" ON public.arsenais;
CREATE POLICY "Equipe pode ver arsenais" ON public.arsenais FOR SELECT TO authenticated USING (true);
DROP POLICY IF EXISTS "Equipe pode ver projetos" ON public.arsenal_projetos;
CREATE POLICY "Equipe pode ver projetos" ON public.arsenal_projetos FOR SELECT TO authenticated USING (true);

DROP TRIGGER IF EXISTS trg_arsenais_updated ON public.arsenais;
CREATE TRIGGER trg_arsenais_updated BEFORE UPDATE ON public.arsenais
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
DROP TRIGGER IF EXISTS trg_arsenal_projetos_updated ON public.arsenal_projetos;
CREATE TRIGGER trg_arsenal_projetos_updated BEFORE UPDATE ON public.arsenal_projetos
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();