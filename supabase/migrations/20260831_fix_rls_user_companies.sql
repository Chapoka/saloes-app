-- Migration: Corrigir RLS de user_companies para permitir gerenciamento por admin
-- Execute no SQL Editor do Supabase

-- =============================================
-- 1. CORRIGIR RLS: user_companies
-- Admin precisa poder ver, inserir e deletar user_companies dos usuários das suas empresas
-- =============================================

-- SELECT: super_admin vê tudo, admin vê vinculações de usuários das suas empresas
DROP POLICY IF EXISTS "user_companies_select" ON user_companies;
CREATE POLICY "user_companies_select" ON user_companies
  FOR SELECT USING (
    public.is_super_admin()
    OR user_id = auth.uid()
    OR public.user_owns_company(company_id)
  );

-- INSERT: super_admin e admin podem vincular (admin só às suas empresas)
DROP POLICY IF EXISTS "user_companies_insert" ON user_companies;
CREATE POLICY "user_companies_insert" ON user_companies
  FOR INSERT WITH CHECK (
    public.is_super_admin()
    OR public.user_owns_company(company_id)
  );

-- DELETE: super_admin e admin podem desvincular (admin só das suas empresas)
DROP POLICY IF EXISTS "user_companies_delete" ON user_companies;
CREATE POLICY "user_companies_delete" ON user_companies
  FOR DELETE USING (
    public.is_super_admin()
    OR public.user_owns_company(company_id)
  );

-- =============================================
-- 2. CORRIGIR RLS: users
-- Admin precisa poder ver outros admins/profissionais das suas empresas
-- =============================================
DROP POLICY IF EXISTS "users_select" ON users;
CREATE POLICY "users_select" ON users
  FOR SELECT USING (
    auth.uid() = id
    OR public.is_super_admin()
    OR (
      role IN ('admin', 'profissional')
      AND EXISTS (
        SELECT 1 FROM public.user_companies uc
        WHERE uc.user_id = users.id
          AND public.user_owns_company(uc.company_id)
      )
    )
  );

-- Admin pode atualizar profissionais vinculados às suas empresas
DROP POLICY IF EXISTS "users_update" ON users;
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
  );

-- Admin pode criar usuários vinculados às suas empresas (via trigger/service_role)
DROP POLICY IF EXISTS "users_insert" ON users;
CREATE POLICY "users_insert" ON users
  FOR INSERT WITH CHECK (
    auth.uid() = id
    OR public.is_super_admin()
  );
