-- Adicionar campo de apresentação de vendas na tabela modelos_base
ALTER TABLE public.modelos_base
ADD COLUMN IF NOT EXISTS apresentacao_venda TEXT;

-- Criar bucket para mídias do catálogo
INSERT INTO storage.buckets (id, name, public)
VALUES ('catalogo-midias', 'catalogo-midias', true)
ON CONFLICT (id) DO NOTHING;

-- Criar políticas para o bucket de mídias do catálogo
CREATE POLICY "Todos podem ver mídias do catálogo"
ON storage.objects FOR SELECT
USING (bucket_id = 'catalogo-midias');

CREATE POLICY "Apenas admins podem fazer upload de mídias"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'catalogo-midias' AND
  EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.user_id = auth.uid() AND profiles.cargo = 'admin'
  )
);

CREATE POLICY "Apenas admins podem deletar mídias"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'catalogo-midias' AND
  EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.user_id = auth.uid() AND profiles.cargo = 'admin'
  )
);