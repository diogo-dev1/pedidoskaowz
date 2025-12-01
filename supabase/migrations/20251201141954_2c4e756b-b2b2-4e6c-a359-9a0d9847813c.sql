-- Remover o check constraint antigo
ALTER TABLE public.modelos DROP CONSTRAINT IF EXISTS modelos_categoria_check;

-- Adicionar novo check constraint com todas as categorias
ALTER TABLE public.modelos ADD CONSTRAINT modelos_categoria_check 
CHECK (categoria IN ('EDC', 'Campo', 'Cozinha', 'KZR', 'Upsell', 'Customização', 'Adaga', 'Defesa'));