-- Adiciona colunas para suporte a senha temporária / troca obrigatória
ALTER TABLE users ADD COLUMN IF NOT EXISTS temp_password TEXT;
ALTER TABLE users ADD COLUMN IF NOT EXISTS must_change_password BOOLEAN DEFAULT false;

-- Função para super_admin redefinir senha de qualquer usuário no auth.users
CREATE OR REPLACE FUNCTION public.admin_reset_user_password(user_id uuid, new_password text)
RETURNS void
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT public.is_super_admin() THEN
    RAISE EXCEPTION 'Permission denied';
  END IF;

  UPDATE auth.users
  SET encrypted_password = crypt(new_password, gen_salt('bf')),
      email_confirmed_at = COALESCE(email_confirmed_at, now()),
      confirmed_at = COALESCE(confirmed_at, now()),
      updated_at = now()
  WHERE id = user_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'User not found in auth.users';
  END IF;
END;
$$ LANGUAGE plpgsql;
