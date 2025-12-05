-- Remove o check constraint existente
ALTER TABLE opcoes_componentes DROP CONSTRAINT IF EXISTS opcoes_componentes_tipo_opcao_check;

-- Adiciona o novo check constraint com os tipos atualizados
ALTER TABLE opcoes_componentes ADD CONSTRAINT opcoes_componentes_tipo_opcao_check 
CHECK (tipo_opcao IN ('Aço', 'Empunhadura', 'Acabamento', 'Bainha', 'Espaçador', 'Variação', 'Cor de Bainha', 'Embalagem'));