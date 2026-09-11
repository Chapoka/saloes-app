-- Fix: isola usuários por empresa - admin só vê outros admins da mesma empresa
-- Remove políticas permissivas antigas que vazavam todos os usuários
DO $$
DECLARE r RECORD;
BEGIN
  FOR r IN SELECT policyname FROM pg_policies WHERE schemaname='public' AND tablename='users' LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.users', r.policyname);
  END LOOP;
END $$;

-- SELECT: próprio, super_admin, ou admin/profissional da mesma empresa via user_companies
CREATE POLICY "users_select" ON users
  FOR SELECT USING (
    auth.uid() = id
    OR public.is_super_admin()
    OR (
      role IN ('admin','profissional')
      AND EXISTS (
        SELECT 1 FROM public.user_companies uc
        WHERE uc.user_id = users.id
          AND public.user_owns_company(uc.company_id)
      )
    )
  );

-- INSERT: só próprio ou super_admin (criação via API usa service_role que bypassa)
CREATE POLICY "users_insert" ON users
  FOR INSERT WITH CHECK (
    auth.uid() = id
    OR public.is_super_admin()
  );

-- UPDATE: próprio, super_admin, ou admin da mesma empresa (mesma regra do select)
CREATE POLICY "users_update" ON users
  FOR UPDATE USING (
    auth.uid() = id
    OR public.is_super_admin()
    OR (
      EXISTS (
        SELECT 1 FROM public.user_companies uc
        WHERE uc.user_id = users.id
          AND public.user_owns_company(uc.company_id)
      )
    )
  )
  WITH CHECK (
    auth.uid() = id
    OR public.is_super_admin()
    OR (
      EXISTS (
        SELECT 1 FROM public.user_companies uc
        WHERE uc.user_id = users.id
          AND public.user_owns_company(uc.company_id)
      )
    )
  );

-- DELETE: só super_admin (via API service_role)
CREATE POLICY "users_delete" ON users
  FOR DELETE USING (public.is_super_admin());

COMMENT ON POLICY "users_select" ON users IS '20260915: isola admin por empresa, super_admin vê todos';
