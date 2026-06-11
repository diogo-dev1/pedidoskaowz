-- Lançamento Push Dagger 11/06: os preços por aço/empunhadura já refletem o
-- desconto de lançamento. Desativa o desconto extra por quantidade para não
-- duplicar o desconto em cima dos novos preços.
UPDATE public.push_dagger_config
SET valor = '{"1":0,"2":0,"3":0}'
WHERE chave = 'discount_by_qty';
