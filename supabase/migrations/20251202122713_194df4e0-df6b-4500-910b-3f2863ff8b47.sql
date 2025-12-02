-- Add UPDATE policy for catalogo-midias bucket
CREATE POLICY "Apenas admins podem atualizar mídias" 
ON storage.objects 
FOR UPDATE 
USING (
  bucket_id = 'catalogo-midias' AND 
  EXISTS (
    SELECT 1 FROM profiles 
    WHERE profiles.user_id = auth.uid() AND profiles.cargo = 'admin'
  )
);