-- ============================================
-- MIGRAÇÃO: Recriar função create_user_direct
-- Necessária para cadastro de usuários via RPC (sem Edge Functions)
-- ============================================

CREATE OR REPLACE FUNCTION public.create_user_direct(
  p_email TEXT,
  p_password TEXT,
  p_full_name TEXT DEFAULT '',
  p_role TEXT DEFAULT 'aluno'
)
RETURNS UUID
SECURITY DEFINER
SET search_path = extensions, public, auth
AS $$
DECLARE
  v_user_id UUID;
BEGIN
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

  INSERT INTO auth.identities (
    id,
    user_id,
    identity_data,
    provider,
    provider_id,
    last_sign_in_at,
    created_at,
    updated_at
  ) VALUES (
    v_user_id,
    v_user_id,
    jsonb_build_object('sub', v_user_id, 'email', p_email),
    'email',
    v_user_id::text,
    now(),
    now(),
    now()
  );

  RETURN v_user_id;
END;
$$ LANGUAGE plpgsql;

GRANT EXECUTE ON FUNCTION public.create_user_direct TO authenticated;

-- ============================================
-- Função para deletar usuário de auth.users
-- ============================================
CREATE OR REPLACE FUNCTION public.delete_user_direct(p_user_id UUID)
RETURNS BOOLEAN
SECURITY DEFINER
SET search_path = extensions, public, auth
AS $$
BEGIN
  DELETE FROM auth.identities WHERE user_id = p_user_id;
  DELETE FROM auth.users WHERE id = p_user_id;
  RETURN FOUND;
END;
$$ LANGUAGE plpgsql;

GRANT EXECUTE ON FUNCTION public.delete_user_direct TO authenticated;

-- ============================================
-- Função para enviar e-mail via Resend (pelo banco, sem Edge Function)
-- ============================================
CREATE OR REPLACE FUNCTION public.send_invitation_email(
  p_email TEXT,
  p_temp_password TEXT,
  p_full_name TEXT DEFAULT ''
)
RETURNS BOOLEAN
SECURITY DEFINER
SET search_path = extensions, public, supabase_functions
AS $$
DECLARE
  v_api_key TEXT;
  v_from_email TEXT;
  v_app_url TEXT;
  v_login_url TEXT;
  v_html TEXT;
  v_body JSONB;
  v_result JSONB;
BEGIN
  SELECT value INTO v_api_key FROM settings WHERE key = 'resend_api_key';
  SELECT value INTO v_from_email FROM settings WHERE key = 'resend_from_email';
  SELECT value INTO v_app_url FROM settings WHERE key = 'app_url';

  IF v_api_key IS NULL OR v_from_email IS NULL THEN
    RETURN FALSE;
  END IF;

  v_login_url := COALESCE(v_app_url, '') || '/login';
  IF v_login_url = '/login' THEN
    v_login_url := 'http://localhost:5173/login';
  END IF;

  v_html := format(
    '<h2>Bem-vindo ao Salões!</h2>
     <p>Sua conta foi criada. Use a senha abaixo para acessar:</p>
     <p><strong>Senha tempor&aacute;ria:</strong> %s</p>
     <p><a href="%s" style="display:inline-block;padding:12px 24px;background:#0077b6;color:#fff;text-decoration:none;border-radius:8px;">Acessar o sistema</a></p>
     <p>Recomendamos trocar a senha ap&oacute;s o primeiro login.</p>',
    p_temp_password, v_login_url
  );

  v_body := jsonb_build_object(
    'from', v_from_email,
    'to', jsonb_build_array(p_email),
    'subject', 'Convite de acesso - Salões',
    'html', v_html
  );

  SELECT * INTO v_result FROM supabase_functions.http_request(
    url := 'https://api.resend.com/emails',
    method := 'POST',
    headers := jsonb_build_object(
      'Authorization', 'Bearer ' || v_api_key,
      'Content-Type', 'application/json'
    ),
    body := v_body::text
  );

  RETURN TRUE;
END;
$$ LANGUAGE plpgsql;

GRANT EXECUTE ON FUNCTION public.send_invitation_email TO authenticated;
