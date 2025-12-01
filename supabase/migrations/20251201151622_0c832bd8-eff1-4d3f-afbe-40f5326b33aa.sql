-- Atualizar constraints de categoria para incluir 'Adaga' e 'Defesa'

-- Remover constraints antigos
ALTER TABLE public.modelos_base DROP CONSTRAINT IF EXISTS modelos_base_categoria_check;
ALTER TABLE public.modelos DROP CONSTRAINT IF EXISTS modelos_categoria_check;
ALTER TABLE public.catalogo_modelos DROP CONSTRAINT IF EXISTS catalogo_modelos_categoria_check;

-- Adicionar novos constraints com todas as categorias
ALTER TABLE public.modelos_base 
ADD CONSTRAINT modelos_base_categoria_check 
CHECK (categoria IN ('EDC', 'Adaga', 'Campo', 'Cozinha', 'Defesa', 'KZR', 'Upsell', 'Customização'));

ALTER TABLE public.modelos 
ADD CONSTRAINT modelos_categoria_check 
CHECK (categoria IN ('EDC', 'Adaga', 'Campo', 'Cozinha', 'Defesa', 'KZR', 'Upsell', 'Customização'));

ALTER TABLE public.catalogo_modelos 
ADD CONSTRAINT catalogo_modelos_categoria_check 
CHECK (categoria IN ('EDC', 'Adaga', 'Campo', 'Cozinha', 'Defesa', 'KZR', 'Upsell', 'Customização'));