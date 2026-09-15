CREATE TABLE public.upsell_lista_avulsa (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  telefone text NOT NULL UNIQUE,
  nome text,
  origem text,
  enviado boolean NOT NULL DEFAULT false,
  enviado_em timestamptz,
  observacao text,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT upsell_lista_avulsa_telefone_formato CHECK (telefone ~ '^55[0-9]{10,11}$'),
  CONSTRAINT upsell_lista_avulsa_nome_tamanho CHECK (nome IS NULL OR char_length(nome) <= 150),
  CONSTRAINT upsell_lista_avulsa_origem_tamanho CHECK (origem IS NULL OR char_length(origem) <= 200),
  CONSTRAINT upsell_lista_avulsa_observacao_tamanho CHECK (observacao IS NULL OR char_length(observacao) <= 1000)
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.upsell_lista_avulsa TO authenticated;
GRANT ALL ON public.upsell_lista_avulsa TO service_role;

ALTER TABLE public.upsell_lista_avulsa ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Autenticados gerenciam lista avulsa upsell"
ON public.upsell_lista_avulsa
FOR ALL
TO authenticated
USING (true)
WITH CHECK (true);

CREATE INDEX upsell_lista_avulsa_enviado_created_at_idx
ON public.upsell_lista_avulsa (enviado, created_at);