-- =============================================
-- DIAGNÓSTICO: Rodar no Supabase SQL Editor
-- =============================================

-- 1. Verificar políticas RLS na tabela companies
SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual
FROM pg_policies
WHERE tablename = 'companies';

-- 2. Verificar se a tabela companies tem dados
SELECT COUNT(*) as total_companies FROM companies;

-- 3. Listar todas as empresas existentes
SELECT id, name, active FROM companies;

-- 4. Verificar o company_id do usuário logado (Rodrigo)
SELECT id, full_name, email, role, company_id, company_ids
FROM users
WHERE email = 'rodrigo.rocha@morumbisolucoes.com.br';

-- 5. Testar query direta como usuário autenticado
-- (Isso simula o que o app faz)
SELECT * FROM companies LIMIT 5;
