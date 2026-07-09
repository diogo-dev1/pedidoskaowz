CREATE TABLE IF NOT EXISTS public.simulador_precos_config (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  chave TEXT UNIQUE NOT NULL DEFAULT 'default',
  dados JSONB NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_by UUID REFERENCES public.profiles(id)
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.simulador_precos_config TO authenticated;
GRANT ALL ON public.simulador_precos_config TO service_role;

ALTER TABLE public.simulador_precos_config ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "sim_precos_select" ON public.simulador_precos_config;
DROP POLICY IF EXISTS "sim_precos_insert" ON public.simulador_precos_config;
DROP POLICY IF EXISTS "sim_precos_update" ON public.simulador_precos_config;

CREATE POLICY "sim_precos_select" ON public.simulador_precos_config
  FOR SELECT TO authenticated USING (true);
CREATE POLICY "sim_precos_insert" ON public.simulador_precos_config
  FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "sim_precos_update" ON public.simulador_precos_config
  FOR UPDATE TO authenticated USING (true) WITH CHECK (true);

INSERT INTO public.simulador_precos_config (chave, dados)
VALUES ('default', '{"modelos":[{"nome":"Adaga Edc","tamanho":"P","preco":705},{"nome":"Edc","tamanho":"P","preco":575},{"nome":"Edc - Mini","tamanho":"P","preco":475},{"nome":"Edc Mini Reverse Tanto","tamanho":"P","preco":475},{"nome":"Edc Mini Tanto","tamanho":"P","preco":590},{"nome":"Edc Mini Wharncliffe","tamanho":"P","preco":590},{"nome":"Edc Reverse Tanto","tamanho":"P","preco":575},{"nome":"Edc Ring","tamanho":"P","preco":610},{"nome":"Edc Ring Tanto","tamanho":"P","preco":725},{"nome":"Edc Tanto","tamanho":"P","preco":690},{"nome":"Edc Wharncliffe","tamanho":"P","preco":690},{"nome":"Karambit","tamanho":"P","preco":720},{"nome":"Push Dagger Compact","tamanho":"P","preco":470},{"nome":"Push Dagger Micro","tamanho":"P","preco":340},{"nome":"Push Dagger Standard","tamanho":"P","preco":610},{"nome":"Ring Tanto","tamanho":"P","preco":585},{"nome":"Wharncliffe","tamanho":"P","preco":585},{"nome":"Shank","tamanho":"P","preco":0},{"nome":"Shiv","tamanho":"P","preco":0},{"nome":"Adaga Full Size","tamanho":"M","preco":805},{"nome":"Butcher","tamanho":"M","preco":715},{"nome":"Chef Royal","tamanho":"M","preco":715},{"nome":"Defcon 1","tamanho":"M","preco":790},{"nome":"Defcon 2","tamanho":"M","preco":835},{"nome":"Garfo 8\"","tamanho":"M","preco":325},{"nome":"Garfo 10\"","tamanho":"M","preco":370},{"nome":"Jagunço","tamanho":"M","preco":760},{"nome":"Jagunço Tanto","tamanho":"M","preco":875},{"nome":"Kiritsuke 8,5\"","tamanho":"M","preco":620},{"nome":"Kiritsuke 10\"","tamanho":"M","preco":650},{"nome":"Kzr Elite Knight","tamanho":"M","preco":780},{"nome":"Kzr Nimbus","tamanho":"M","preco":720},{"nome":"Kzr Nimbus Tanto","tamanho":"M","preco":835},{"nome":"Picanheira 9\"","tamanho":"M","preco":650},{"nome":"Picanheira 10\"","tamanho":"M","preco":680},{"nome":"Mini Camp","tamanho":"M","preco":0},{"nome":"Camp","tamanho":"G","preco":800},{"nome":"Kzr Full Size","tamanho":"G","preco":750},{"nome":"Kzr Nimbowie","tamanho":"G","preco":1555},{"nome":"Big Camp","tamanho":"G","preco":1430},{"nome":"Kzr Big Nimbowie","tamanho":"G","preco":1710},{"nome":"Big Camp 40 cm","tamanho":"G","preco":0},{"nome":"Kzr Big Nimbowie 40 cm","tamanho":"G","preco":0},{"nome":"Chaira 8\"","tamanho":"-","preco":300},{"nome":"Chaira 10\"","tamanho":"-","preco":350}],"acos":[{"nome":"Inox","precos":{"P":0,"M":0,"G":0},"incluso":true},{"nome":"Sandvik 14C28N","precos":{"P":165,"M":195,"G":350}},{"nome":"52100","precos":{"P":165,"M":175,"G":195}}],"bruteForge":{"P":125,"M":125,"G":300},"empunhaduras":[{"nome":"Grafite","precos":{"P":0,"M":0,"G":0},"incluso":true},{"nome":"G10","precos":{"P":115,"M":145}},{"nome":"Espaçador","precos":{"P":70,"M":70,"G":90}},{"nome":"Imbuia","precos":{"P":80,"M":80,"G":100}}],"dragonScale":{"P":70,"M":70,"G":90},"acabamentos":[{"nome":"Acetinado","precos":{"P":0,"M":0,"G":0},"incluso":true},{"nome":"Stone Washed","precos":{"P":25,"M":25,"G":35}},{"nome":"Tactical","precos":{"P":90,"M":90,"G":125}}],"bainhas":[{"nome":"Preta","precos":{"P":0,"M":0,"G":0},"incluso":true},{"nome":"Colorida","precos":{"P":195,"M":195,"G":250}},{"nome":"Bainha adicional","precos":{"P":195,"M":195,"G":250}}],"adicionais":[{"nome":"Strop","preco":95},{"nome":"Café Médio ou Escuro","preco":45},{"nome":"Clipe Extra","preco":25},{"nome":"Clipe Lateral","preco":75},{"nome":"Patch Fluorescente","preco":55},{"nome":"Patch Cão Pastor","preco":45},{"nome":"Patch K","preco":35},{"nome":"BC Churrasco","preco":200},{"nome":"BC Churrasco Dupla","preco":270},{"nome":"BC Churrasco Tripla","preco":370},{"nome":"Passador de Couro","preco":95},{"nome":"Bainha Couro EDC","preco":200},{"nome":"Bainha Couro Camp","preco":350},{"nome":"Bainha Couro Jagunço","preco":290},{"nome":"Boné","preco":75},{"nome":"Camisa Kaowz","preco":170},{"nome":"Moletom","preco":240}]}'::jsonb)
ON CONFLICT (chave) DO NOTHING;