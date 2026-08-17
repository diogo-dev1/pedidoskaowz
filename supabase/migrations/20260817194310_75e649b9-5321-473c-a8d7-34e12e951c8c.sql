update public.simulador_precos_config set dados = jsonb_set(
  jsonb_set(dados, '{bainhas}', '[{"nome":"Velada","precos":{"P":0,"M":0,"G":0},"incluso":true,"cores":["Preto","Coyote","Vermelho","Azul","Verde"]},{"nome":"Multifuncional","precos":{"P":0,"M":0,"G":0},"incluso":true,"cores":["Preto","Coyote","Vermelho","Azul","Verde"]}]'::jsonb),
  '{empunhaduras,2,cores}', '["Preto","Vermelho","Azul","Verde","Coyote"]'::jsonb)
where chave = 'default';