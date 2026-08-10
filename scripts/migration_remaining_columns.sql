-- ============================================
-- Migração: renomear colunas restantes
-- Execute no SQL Editor do Supabase
-- ============================================

-- 1. waiting_list: student_name → customer_name
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='waiting_list' AND column_name='student_name') THEN
    ALTER TABLE waiting_list RENAME COLUMN student_name TO customer_name;
  END IF;
END $$;

-- 2. Verificar se existe alguma tabela "students" que não foi renomeada
-- (caso exista, renomear para customers)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name='students' AND table_schema='public') THEN
    ALTER TABLE students RENAME TO customers;
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name='student_companies' AND table_schema='public') THEN
    ALTER TABLE student_companies RENAME TO customer_companies;
  END IF;
END $$;
