CREATE TABLE public.checkouts_abandonados_contatos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  checkout_id TEXT UNIQUE NOT NULL,
  status TEXT NOT NULL DEFAULT 'pendente',
  contatado_em TIMESTAMPTZ,
  contatado_por UUID REFERENCES auth.users(id),
  observacoes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.checkouts_abandonados_contatos TO authenticated;
GRANT ALL ON public.checkouts_abandonados_contatos TO service_role;

ALTER TABLE public.checkouts_abandonados_contatos ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Usuarios autenticados gerenciam contatos de checkout"
ON public.checkouts_abandonados_contatos FOR ALL TO authenticated
USING (true) WITH CHECK (true);

CREATE TRIGGER trg_checkouts_contatos_updated
BEFORE UPDATE ON public.checkouts_abandonados_contatos
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TABLE public.checkouts_abandonados_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nome TEXT NOT NULL,
  mensagem TEXT NOT NULL,
  ordem INT NOT NULL DEFAULT 0,
  ativo BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.checkouts_abandonados_templates TO authenticated;
GRANT ALL ON public.checkouts_abandonados_templates TO service_role;

ALTER TABLE public.checkouts_abandonados_templates ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Usuarios autenticados gerenciam templates de checkout"
ON public.checkouts_abandonados_templates FOR ALL TO authenticated
USING (true) WITH CHECK (true);

CREATE TRIGGER trg_checkouts_templates_updated
BEFORE UPDATE ON public.checkouts_abandonados_templates
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

INSERT INTO public.checkouts_abandonados_templates (nome, mensagem, ordem) VALUES
('Primeiro contato', 'Olá {nome}, aqui é da Kaowz! 👋
Vi que você começou a finalizar seu pedido ({itens}) mas não concluiu.
Posso te ajudar com alguma dúvida sobre a lâmina, prazo ou pagamento?
Se quiser retomar, é só clicar aqui: {link}', 1),
('Lembrete com urgência', 'Oi {nome}, tudo bem?
Seu carrinho na Kaowz ainda está reservado ({total}), mas o estoque das lâminas é limitado.
Quer que eu garanta a sua? Retome aqui: {link}', 2),
('Oferta / condição especial', 'Olá {nome}! Aqui é da Kaowz.
Consegui uma condição especial de pagamento para o seu pedido ({itens}).
Me chama aqui que te passo os detalhes — o link do seu carrinho segue ativo: {link}', 3);