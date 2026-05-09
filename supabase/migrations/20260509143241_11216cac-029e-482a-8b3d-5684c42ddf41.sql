
-- Tabela de solicitações de Cases Patola (público, sem auth)
CREATE TABLE public.cases_patola_solicitacoes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  nome text NOT NULL,
  telefone text,
  fabricante text,
  modelo_arma text,
  calibre text,
  customizacoes text,
  observacoes text,
  foto_arma_url text,
  foto_carregador_url text,
  fotos_extras jsonb NOT NULL DEFAULT '[]'::jsonb,
  status text NOT NULL DEFAULT 'novo',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.cases_patola_solicitacoes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Qualquer um pode criar solicitacao case patola"
ON public.cases_patola_solicitacoes FOR INSERT TO anon, authenticated WITH CHECK (true);

CREATE POLICY "Autenticados podem ver solicitacoes case patola"
ON public.cases_patola_solicitacoes FOR SELECT TO authenticated USING (true);

CREATE POLICY "Autenticados podem atualizar solicitacoes case patola"
ON public.cases_patola_solicitacoes FOR UPDATE TO authenticated USING (true);

CREATE POLICY "Autenticados podem deletar solicitacoes case patola"
ON public.cases_patola_solicitacoes FOR DELETE TO authenticated USING (true);

CREATE TRIGGER trg_cases_patola_solic_updated
BEFORE UPDATE ON public.cases_patola_solicitacoes
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Tabela de modelos de cases (referência exibida no formulário)
CREATE TABLE public.cases_patola_modelos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  nome text NOT NULL,
  horizontal_cm numeric,
  vertical_cm numeric,
  descricao text,
  imagem_url text,
  ordem integer NOT NULL DEFAULT 0,
  ativo boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.cases_patola_modelos ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Todos podem ver modelos cases patola"
ON public.cases_patola_modelos FOR SELECT USING (true);

CREATE POLICY "Autenticados gerenciam modelos cases patola"
ON public.cases_patola_modelos FOR ALL TO authenticated
USING (auth.uid() IS NOT NULL) WITH CHECK (auth.uid() IS NOT NULL);

CREATE TRIGGER trg_cases_patola_modelos_updated
BEFORE UPDATE ON public.cases_patola_modelos
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Tabela de configuração KV
CREATE TABLE public.cases_patola_config (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  chave text NOT NULL UNIQUE,
  valor text,
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.cases_patola_config ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Todos podem ver config cases patola"
ON public.cases_patola_config FOR SELECT USING (true);

CREATE POLICY "Autenticados gerenciam config cases patola"
ON public.cases_patola_config FOR ALL TO authenticated
USING (auth.uid() IS NOT NULL) WITH CHECK (auth.uid() IS NOT NULL);

CREATE TRIGGER trg_cases_patola_config_updated
BEFORE UPDATE ON public.cases_patola_config
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Bucket de storage público para fotos enviadas pelos clientes e referências
INSERT INTO storage.buckets (id, name, public)
VALUES ('cases-patola', 'cases-patola', true)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "Cases patola publico read"
ON storage.objects FOR SELECT USING (bucket_id = 'cases-patola');

CREATE POLICY "Cases patola public upload"
ON storage.objects FOR INSERT TO anon, authenticated
WITH CHECK (bucket_id = 'cases-patola');

CREATE POLICY "Cases patola autenticado update"
ON storage.objects FOR UPDATE TO authenticated USING (bucket_id = 'cases-patola');

CREATE POLICY "Cases patola autenticado delete"
ON storage.objects FOR DELETE TO authenticated USING (bucket_id = 'cases-patola');

-- Seeds: modelos padrão e configurações iniciais
INSERT INTO public.cases_patola_modelos (nome, horizontal_cm, vertical_cm, ordem) VALUES
  ('MP 0.930', 88.5, 34.8, 1),
  ('MP 0.039', 39.6, 31.6, 2),
  ('MP 0.010', 28.3, 13.1, 3);

INSERT INTO public.cases_patola_config (chave, valor) VALUES
  ('titulo', 'Case Patola Personalizada'),
  ('subtitulo', 'Solicite seu projeto exclusivo de case sob medida'),
  ('instrucoes_foto', 'Arma sobre superfície plana, vista de cima. Câmera a 50 cm de altura, apontada direto para baixo. Coloque uma moeda ao lado da arma como referência de tamanho. Arma inteira no quadro, sem cortes. Boa iluminação, sem sombras.'),
  ('instrucoes_customizacao', 'Informe se possui itens fora do padrão de fábrica: lanterna tática, mira laser/red dot, cano alongado/rosqueado, compensador, carregadores estendidos. Se for 100% original, escreva "Sem customizações".'),
  ('mensagem_pos_envio', 'Recebemos sua solicitação! Nossa equipe vai analisar as informações e retornar com orçamento e prazo em breve via WhatsApp.'),
  ('whatsapp_destino', '5511999999999');
