-- Drop existing restrictive policies
DROP POLICY IF EXISTS "Apenas admins podem atualizar catálogo" ON public.catalogo_modelos;
DROP POLICY IF EXISTS "Apenas admins podem inserir no catálogo" ON public.catalogo_modelos;
DROP POLICY IF EXISTS "Apenas admins podem deletar do catálogo" ON public.catalogo_modelos;

-- Create new policies allowing authenticated users to manage catalog
CREATE POLICY "Usuários autenticados podem atualizar catálogo" 
ON public.catalogo_modelos 
FOR UPDATE 
USING (auth.uid() IS NOT NULL);

CREATE POLICY "Usuários autenticados podem inserir no catálogo" 
ON public.catalogo_modelos 
FOR INSERT 
WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Usuários autenticados podem deletar do catálogo" 
ON public.catalogo_modelos 
FOR DELETE 
USING (auth.uid() IS NOT NULL);