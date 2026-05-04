-- Restrict catalogo_modelos write access to admin users only

-- Create security definer function to check admin role (avoid RLS recursion)
CREATE OR REPLACE FUNCTION public.is_admin(_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles
    WHERE user_id = _user_id AND cargo = 'admin'
  )
$$;

-- Drop overly permissive write policies
DROP POLICY IF EXISTS "Usuários autenticados podem atualizar catálogo" ON public.catalogo_modelos;
DROP POLICY IF EXISTS "Usuários autenticados podem deletar do catálogo" ON public.catalogo_modelos;
DROP POLICY IF EXISTS "Usuários autenticados podem inserir no catálogo" ON public.catalogo_modelos;

-- Recreate as admin-only
CREATE POLICY "Admins can insert into catalog"
ON public.catalogo_modelos FOR INSERT TO authenticated
WITH CHECK (public.is_admin(auth.uid()));

CREATE POLICY "Admins can update catalog"
ON public.catalogo_modelos FOR UPDATE TO authenticated
USING (public.is_admin(auth.uid()));

CREATE POLICY "Admins can delete from catalog"
ON public.catalogo_modelos FOR DELETE TO authenticated
USING (public.is_admin(auth.uid()));