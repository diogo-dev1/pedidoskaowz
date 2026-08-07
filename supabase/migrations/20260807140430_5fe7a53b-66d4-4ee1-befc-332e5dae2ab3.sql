CREATE TABLE public.upsell_clientes_templates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  nome text NOT NULL,
  mensagem text NOT NULL,
  ordem integer NOT NULL DEFAULT 0,
  ativo boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.upsell_clientes_templates TO authenticated;
GRANT ALL ON public.upsell_clientes_templates TO service_role;
ALTER TABLE public.upsell_clientes_templates ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Autenticados gerenciam templates upsell" ON public.upsell_clientes_templates FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE TRIGGER trg_upsell_templates_updated BEFORE UPDATE ON public.upsell_clientes_templates FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TABLE public.upsell_clientes_contatos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id text NOT NULL UNIQUE,
  status text NOT NULL DEFAULT 'pendente',
  contatado_em timestamptz,
  contatado_por uuid REFERENCES auth.users(id),
  observacoes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.upsell_clientes_contatos TO authenticated;
GRANT ALL ON public.upsell_clientes_contatos TO service_role;
ALTER TABLE public.upsell_clientes_contatos ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Autenticados gerenciam contatos upsell" ON public.upsell_clientes_contatos FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE TRIGGER trg_upsell_contatos_updated BEFORE UPDATE ON public.upsell_clientes_contatos FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

INSERT INTO public.upsell_clientes_templates (nome, mensagem, ordem) VALUES
('Pós-venda + upsell', 'Olá {nome}, aqui é {vendedor} da equipe Kaowz!

Vi aqui que você comprou {itens} com a gente. Como está sendo a experiência com a lâmina?

Queria te mostrar alguns itens que combinam muito com o que você já tem (bainha, clipe, strop e kits de churrasco) — posso te enviar as opções com condição especial de cliente?', 1),
('Cliente recorrente', 'Olá {nome}, tudo bem? Aqui é {vendedor} da Kaowz.

Você já faz parte da nossa base de clientes ({itens}) e liberamos condições exclusivas para quem já comprou.

Quer que eu te mostre os lançamentos e uma condição especial de upgrade?', 2),
('Kit complementar', 'Olá {nome}! {vendedor} aqui da Kaowz.

Como você levou {itens}, montei uma sugestão de kit complementar que fecha bem a sua coleção. Posso te mandar os valores e o parcelamento?', 3);