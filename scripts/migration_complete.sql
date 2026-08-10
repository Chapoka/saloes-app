-- ============================================
-- MIGRAÇÃO COMPLETA: Funções e permissões para gestão de usuários
-- Executar no SQL Editor do Supabase Dashboard
-- ============================================

-- 1. Função para setar senha de qualquer usuário (SEM checar permissão,
--    pois o servidor Express já autentica o chamador como super_admin)
CREATE OR REPLACE FUNCTION public.admin_set_user_password(user_id uuid, new_password text)
RETURNS void
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE auth.users
  SET encrypted_password = crypt(new_password, gen_salt('bf')),
      email_confirmed_at = COALESCE(email_confirmed_at, now()),
      updated_at = now()
  WHERE id = user_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'User not found in auth.users';
  END IF;
END;
$$ LANGUAGE plpgsql;

GRANT EXECUTE ON FUNCTION public.admin_set_user_password TO authenticated;

-- 2. Função para deletar usuário de auth.users + identities + sessões
CREATE OR REPLACE FUNCTION public.delete_user_direct(p_user_id UUID)
RETURNS BOOLEAN
SECURITY DEFINER
SET search_path = extensions, public, auth
AS $$
BEGIN
  DELETE FROM auth.sessions WHERE user_id = p_user_id;
  DELETE FROM auth.mfa_factors WHERE user_id = p_user_id;
  DELETE FROM auth.mfa_challenges WHERE user_id = p_user_id;
  DELETE FROM auth.identities WHERE user_id = p_user_id;
  DELETE FROM auth.users WHERE id = p_user_id;
  RETURN FOUND;
END;
$$ LANGUAGE plpgsql;

GRANT EXECUTE ON FUNCTION public.delete_user_direct TO authenticated;

-- 3. Função auxiliar para verificar se dois usuários compartilham empresa
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

-- 4. Atualizar RLS da tabela users para permitir admins verem usuários da mesma empresa
DROP POLICY IF EXISTS "users_read_own" ON users;
DROP POLICY IF EXISTS "users_update_own" ON users;
DROP POLICY IF EXISTS "users_delete_own" ON users;

CREATE POLICY "users_read_own" ON users
  FOR SELECT
  USING (
    auth.uid() = id
    OR public.is_super_admin()
    OR (SELECT public.users_share_company(auth.uid(), users.id))
  );

CREATE POLICY "users_update_own" ON users
  FOR UPDATE
  USING (
    auth.uid() = id
    OR public.is_super_admin()
    OR (SELECT public.users_share_company(auth.uid(), users.id))
  )
  WITH CHECK (
    auth.uid() = id
    OR public.is_super_admin()
    OR (SELECT public.users_share_company(auth.uid(), users.id))
  );

CREATE POLICY "users_delete_own" ON users
  FOR DELETE
  USING (auth.uid() = id OR public.is_super_admin());
