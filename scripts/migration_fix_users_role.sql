-- ============================================
-- MIGRAÇÃO COMPLETA: Fix users role constraint
-- Execute no SQL Editor do Supabase (um por um)
-- ============================================

-- PASSO 1: Verificar roles atuais
SELECT role, COUNT(*) FROM public.users GROUP BY role;

-- PASSO 2: Atualizar TODAS as rows para valores válidos
UPDATE public.users 
SET role = CASE 
  WHEN role = 'professor' THEN 'profissional'
  WHEN role = 'teacher' THEN 'profissional'
  WHEN role = 'aluno' THEN 'cliente'
  WHEN role = 'user' THEN 'cliente'
  WHEN role = 'cliente' THEN 'cliente'  -- já correto
  WHEN role = 'profissional' THEN 'profissional'  -- já correto
  WHEN role = 'admin' THEN 'admin'
  WHEN role = 'super_admin' THEN 'super_admin'
  ELSE 'cliente'  -- fallback para qualquer valor inesperado
END;

-- PASSO 3: Verificar se todas as rows estão corretas agora
SELECT role, COUNT(*) FROM public.users GROUP BY role;

-- PASSO 4: Só execute se o PASSO 3 mostrar apenas: super_admin, admin, profissional, cliente
ALTER TABLE public.users DROP CONSTRAINT IF EXISTS users_role_check;
ALTER TABLE public.users ADD CONSTRAINT users_role_check 
  CHECK (role IN ('super_admin', 'admin', 'profissional', 'cliente'));

-- PASSO 5: Atualizar DEFAULT
ALTER TABLE public.users ALTER COLUMN role SET DEFAULT 'cliente';