-- Adicionar categoria 'Upsell' ao check constraint da tabela modelos_base
ALTER TABLE modelos_base 
DROP CONSTRAINT IF EXISTS modelos_base_categoria_check;

ALTER TABLE modelos_base
ADD CONSTRAINT modelos_base_categoria_check 
CHECK (categoria IN ('EDC', 'Campo', 'Cozinha', 'KZR', 'Upsell'));