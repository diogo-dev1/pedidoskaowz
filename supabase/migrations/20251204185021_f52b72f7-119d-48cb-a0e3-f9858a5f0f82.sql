-- Add color field for button text
ALTER TABLE public.info_etapas_customizacao 
ADD COLUMN IF NOT EXISTS cor_botao text DEFAULT '#3b82f6';