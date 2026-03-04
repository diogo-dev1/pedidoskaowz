INSERT INTO public.configuracoes_catalogo (chave, valor)
VALUES 
  ('filtro_preco_ativo', 'true'),
  ('filtro_tamanho_ativo', 'true'),
  ('filtro_lamina_ativo', 'true')
ON CONFLICT DO NOTHING;