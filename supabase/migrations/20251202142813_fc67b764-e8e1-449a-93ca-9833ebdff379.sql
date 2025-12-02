-- Add warranty and delivery time columns to catalogo_modelos
ALTER TABLE public.catalogo_modelos 
ADD COLUMN IF NOT EXISTS garantia TEXT,
ADD COLUMN IF NOT EXISTS prazo_entrega TEXT;