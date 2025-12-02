-- Drop existing restrictive policies for catalogo-midias
DROP POLICY IF EXISTS "Apenas admins podem inserir mídias" ON storage.objects;
DROP POLICY IF EXISTS "Apenas admins podem deletar mídias" ON storage.objects;
DROP POLICY IF EXISTS "Apenas admins podem atualizar mídias" ON storage.objects;

-- Create permissive policies for authenticated users
CREATE POLICY "Usuários autenticados podem inserir mídias" 
ON storage.objects 
FOR INSERT 
TO authenticated
WITH CHECK (bucket_id = 'catalogo-midias');

CREATE POLICY "Usuários autenticados podem atualizar mídias" 
ON storage.objects 
FOR UPDATE 
TO authenticated
USING (bucket_id = 'catalogo-midias');

CREATE POLICY "Usuários autenticados podem deletar mídias" 
ON storage.objects 
FOR DELETE 
TO authenticated
USING (bucket_id = 'catalogo-midias');