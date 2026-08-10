-- ============================================
-- MIGRAÇÃO: Super Admin + RLS Fix + Google Login
-- ============================================

-- 1. FUNÇÃO PARA CRIAR USUÁRIO DIRETAMENTE (bypass email confirmation)
CREATE OR REPLACE FUNCTION public.create_user_direct(
  p_email TEXT,
  p_password TEXT,
  p_full_name TEXT,
  p_role TEXT DEFAULT 'aluno'
)
RETURNS UUID
SECURITY DEFINER
SET search_path = extensions, public, auth
AS $$
DECLARE
  v_user_id UUID;
BEGIN
  -- Insert into auth.users with email already confirmed
  INSERT INTO auth.users (
    instance_id,
    id,
    aud,
    role,
    email,
    encrypted_password,
    email_confirmed_at,
    confirmation_sent_at,
    raw_app_meta_data,
    raw_user_meta_data,
    created_at,
    updated_at,
    confirmation_token,
    email_change,
    email_change_token_new,
    recovery_token
  ) VALUES (
    '00000000-0000-0000-0000-000000000000',
    gen_random_uuid(),
    'authenticated',
    'authenticated',
    p_email,
    crypt(p_password, gen_salt('bf')),
    now(),
    now(),
    '{"provider":"email","providers":["email"]}',
    jsonb_build_object('full_name', p_full_name, 'role', p_role),
    now(),
    now(),
    '',
    '',
    '',
    ''
  )
  RETURNING id INTO v_user_id;

  -- Insert into auth.identities
  INSERT INTO auth.identities (
    id,
    user_id,
    identity_data,
    provider,
    last_sign_in_at,
    created_at,
    updated_at
  ) VALUES (
    v_user_id,
    v_user_id,
    jsonb_build_object('sub', v_user_id, 'email', p_email),
    'email',
    now(),
    now(),
    now()
  );

  RETURN v_user_id;
END;
$$ LANGUAGE plpgsql;

-- 2. CRIAR SUPER ADMIN
SELECT public.create_user_direct(
  'rodrigo.rocha@morumbisolutions.com.br',
  'Analyse01@!',
  'Rodrigo Rocha',
  'super_admin'
);

-- 3. FUNÇÃO is_super_admin (evita recursão nas RLS policies)
CREATE OR REPLACE FUNCTION public.is_super_admin()
RETURNS BOOLEAN
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.users
    WHERE id = auth.uid() AND role = 'super_admin'
  );
END;
$$ LANGUAGE plpgsql;

-- 4. CORRIGIR RLS POLICIES DA TABELA users (remove recursão + adiciona delete)
DROP POLICY IF EXISTS "users_read_own" ON users;
DROP POLICY IF EXISTS "users_update_own" ON users;

CREATE POLICY "users_read_own" ON users
  FOR SELECT
  USING (auth.uid() = id OR public.is_super_admin());

CREATE POLICY "users_update_own" ON users
  FOR UPDATE
  USING (auth.uid() = id OR public.is_super_admin())
  WITH CHECK (auth.uid() = id OR public.is_super_admin());

-- Apenas o próprio usuário pode se deletar (master só deletado por ele mesmo)
CREATE POLICY "users_delete_own" ON users
  FOR DELETE
  USING (auth.uid() = id);

-- 5. ATUALIZAR handle_new_user para não forçar 'aluno'
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.users (id, full_name, email, role)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email),
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'role', 'aluno')
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 6. REMOVER FUNÇÃO create_user_direct (não é mais necessária após uso)
DROP FUNCTION IF EXISTS public.create_user_direct;
