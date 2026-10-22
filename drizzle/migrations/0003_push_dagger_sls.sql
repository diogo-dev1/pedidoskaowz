CREATE TABLE public.push_dagger_sls (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  cliente text NOT NULL, item text NOT NULL, aco text, acabamento text, empunhadura text, bainha text, cor_bainha text,
  prazo date, observacoes text, embalagem text, personalizacao text, certificado text, pedido_shopify text,
  status text NOT NULL DEFAULT 'Aguardando',
  created_at timestamptz DEFAULT now(), updated_at timestamptz DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.push_dagger_sls TO authenticated;
GRANT ALL ON public.push_dagger_sls TO service_role;
ALTER TABLE public.push_dagger_sls ENABLE ROW LEVEL SECURITY;
CREATE POLICY "auth all" ON public.push_dagger_sls FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE TRIGGER push_dagger_sls_updated BEFORE UPDATE ON public.push_dagger_sls FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TABLE public.push_dagger_sls_opcoes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  campo text NOT NULL CHECK (campo IN ('item','aco','acabamento','empunhadura','bainha','cor_bainha','embalagem','status')),
  valor text NOT NULL, ordem int DEFAULT 0, ativo boolean DEFAULT true,
  UNIQUE (campo, valor)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.push_dagger_sls_opcoes TO authenticated;
GRANT ALL ON public.push_dagger_sls_opcoes TO service_role;
ALTER TABLE public.push_dagger_sls_opcoes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "auth all" ON public.push_dagger_sls_opcoes FOR ALL TO authenticated USING (true) WITH CHECK (true);

INSERT INTO public.push_dagger_sls_opcoes (campo, valor, ordem) VALUES
 ('status','Aguardando',0),('status','Em produção',1),('status','Pronta',2),('status','Enviada',3),
 ('embalagem','Comum',0),('embalagem','Patola Padrão',1),('embalagem','Patola KIT',2)
ON CONFLICT DO NOTHING;
INSERT INTO public.config_expedicao (chave, valor) VALUES ('push_dagger_sls_prazo_dias_uteis','30') ON CONFLICT (chave) DO NOTHING;