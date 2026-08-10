-- ============================================
-- MIGRAÇÃO: Corrigir RLS da tabela users
-- Permite que admins vejam/editem usuários
-- que compartilham pelo menos uma empresa
-- ============================================

-- 1. Remover políticas antigas
DROP POLICY IF EXISTS "users_read_own" ON users;
DROP POLICY IF EXISTS "users_update_own" ON users;
DROP POLICY IF EXISTS "users_delete_own" ON users;

-- 2. Criar função auxiliar para verificar se dois usuários compartilham empresa
CREATE OR REPLACE FUNCTION public.users_share_company(user_a UUID, user_b UUID)
RETURNS BOOLEAN
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM user_companies uca
    JOIN user_companies ucb ON uca.company_id = ucb.company_id
    WHERE uca.user_id = user_a AND ucb.user_id = user_b
  );
END;
$$ LANGUAGE plpgsql;

-- 3. Novas políticas
-- Super admin ou admin pode ver qualquer usuário da mesma empresa
CREATE POLICY "users_read_own" ON users
  FOR SELECT
  USING (
    auth.uid() = id
    OR public.is_super_admin()
    OR (
      SELECT public.users_share_company(auth.uid(), users.id)
    )
  );

-- Super admin pode editar qualquer um; admin só edita se compartilhar empresa
CREATE POLICY "users_update_own" ON users
  FOR UPDATE
  USING (
    auth.uid() = id
    OR public.is_super_admin()
    OR (
      SELECT public.users_share_company(auth.uid(), users.id)
    )
  )
  WITH CHECK (
    auth.uid() = id
    OR public.is_super_admin()
    OR (
      SELECT public.users_share_company(auth.uid(), users.id)
    )
  );

-- Apenas o próprio usuário pode se deletar
CREATE POLICY "users_delete_own" ON users
  FOR DELETE
  USING (auth.uid() = id);
