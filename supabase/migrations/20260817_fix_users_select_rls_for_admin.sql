-- Fix: admin pode ver e editar profissionais/usuarios vinculados às suas empresas
DROP POLICY IF EXISTS "users_select" ON users;
DROP POLICY IF EXISTS "users_update" ON users;

CREATE POLICY "users_select" ON users
  FOR SELECT USING (
    auth.uid() = id
    OR public.is_super_admin()
    OR public.user_owns_company(users.company_id)
  );

CREATE POLICY "users_update" ON users
  FOR UPDATE USING (
    auth.uid() = id
    OR public.is_super_admin()
    OR public.user_owns_company(users.company_id)
  )
  WITH CHECK (
    auth.uid() = id
    OR public.is_super_admin()
    OR public.user_owns_company(users.company_id)
  );
