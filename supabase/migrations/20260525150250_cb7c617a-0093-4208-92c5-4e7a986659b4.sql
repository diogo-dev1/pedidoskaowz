
CREATE TABLE public.parcelamento_taxas (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  parcelas integer NOT NULL UNIQUE,
  taxa_percentual numeric NOT NULL DEFAULT 0,
  rotulo text,
  ativo boolean NOT NULL DEFAULT true,
  ordem integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.parcelamento_taxas ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Todos podem ver taxas parcelamento"
  ON public.parcelamento_taxas FOR SELECT USING (true);

CREATE POLICY "Autenticados gerenciam taxas parcelamento"
  ON public.parcelamento_taxas FOR ALL TO authenticated
  USING (auth.uid() IS NOT NULL) WITH CHECK (auth.uid() IS NOT NULL);

CREATE TRIGGER trg_parcelamento_taxas_updated
  BEFORE UPDATE ON public.parcelamento_taxas
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TABLE public.parcelamento_orcamentos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slug text NOT NULL UNIQUE,
  descricao text NOT NULL,
  valor numeric NOT NULL,
  parcelas_sem_juros_max integer NOT NULL DEFAULT 0,
  parcelas_max integer NOT NULL DEFAULT 12,
  observacao text,
  ativo boolean NOT NULL DEFAULT true,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.parcelamento_orcamentos ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Todos podem ver orcamentos ativos"
  ON public.parcelamento_orcamentos FOR SELECT USING (ativo = true);

CREATE POLICY "Autenticados gerenciam orcamentos"
  ON public.parcelamento_orcamentos FOR ALL TO authenticated
  USING (auth.uid() IS NOT NULL) WITH CHECK (auth.uid() IS NOT NULL);

CREATE TRIGGER trg_parcelamento_orcamentos_updated
  BEFORE UPDATE ON public.parcelamento_orcamentos
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE INDEX idx_parcelamento_orcamentos_slug ON public.parcelamento_orcamentos(slug);

INSERT INTO public.parcelamento_taxas (parcelas, taxa_percentual, rotulo, ordem) VALUES
  (1, 3.41, 'Crédito à vista', 1),
  (2, 5.02, 'Parcelado em 2x', 2),
  (3, 5.80, 'Parcelado em 3x', 3),
  (4, 6.58, 'Parcelado em 4x', 4),
  (5, 7.36, 'Parcelado em 5x', 5),
  (6, 8.13, 'Parcelado em 6x', 6),
  (7, 9.10, 'Parcelado em 7x', 7),
  (8, 9.88, 'Parcelado em 8x', 8),
  (9, 10.65, 'Parcelado em 9x', 9),
  (10, 11.43, 'Parcelado em 10x', 10),
  (11, 12.21, 'Parcelado em 11x', 11),
  (12, 12.98, 'Parcelado em 12x', 12);
