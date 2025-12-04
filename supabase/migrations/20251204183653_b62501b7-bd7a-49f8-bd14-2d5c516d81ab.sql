-- Add label column to info_etapas_customizacao for customizable button text
ALTER TABLE public.info_etapas_customizacao
ADD COLUMN label_botao TEXT DEFAULT 'Saiba mais';