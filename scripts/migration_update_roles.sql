-- ============================================
-- MIGRAÇÃO: Atualizar roles existentes + nova constraint
-- Execute ANTES de recriar a constraint
-- ============================================

-- 1. Atualizar roles existentes para novos valores
UPDATE public.users 
SET role = CASE 
  WHEN role = 'professor' THEN 'profissional'
  WHEN role = 'teacher' THEN 'profissional'
  WHEN role = 'aluno' THEN 'cliente'
  WHEN role = 'user' THEN 'cliente'
  ELSE role
END
WHERE role IN ('professor', 'teacher', 'aluno', 'user');

-- 2. Verificar se há rows inválidos restantes
SELECT role, COUNT(*) 
FROM public.users 
GROUP BY role 
HAVING role NOT IN ('super_admin', 'admin', 'profissional', 'cliente');

-- 3. Se query acima retornar 0 rows, pode dropar e recriar constraint:
-- ALTER TABLE public.users DROP CONSTRAINT IF EXISTS users_role_check;
-- ALTER TABLE public.users ADD CONSTRAINT users_role_check 
--   CHECK (role IN ('super_admin', 'admin', 'profissional', 'cliente'));

-- 4. Também atualizar o DEFAULT
ALTER TABLE public.users ALTER COLUMN role SET DEFAULT 'cliente';