-- ============================================
-- Migration Segura: student → customer (v3)
-- Execute no SQL Editor do Supabase
-- ============================================

-- 1. Renomear colunas (só se existirem com nome antigo)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='customer_companies' AND column_name='student_id') THEN
    ALTER TABLE customer_companies RENAME COLUMN student_id TO customer_id;
  END IF;

  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='lessons' AND column_name='student_id') THEN
    ALTER TABLE lessons RENAME COLUMN student_id TO customer_id;
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='lessons' AND column_name='student_name') THEN
    ALTER TABLE lessons RENAME COLUMN student_name TO customer_name;
  END IF;

  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='invoices' AND column_name='student_id') THEN
    ALTER TABLE invoices RENAME COLUMN student_id TO customer_id;
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='invoices' AND column_name='student_name') THEN
    ALTER TABLE invoices RENAME COLUMN student_name TO customer_name;
  END IF;

  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='punch_cards' AND column_name='student_id') THEN
    ALTER TABLE punch_cards RENAME COLUMN student_id TO customer_id;
  END IF;
END $$;

-- 2. Recriar indexes
DROP INDEX IF EXISTS idx_lessons_student_id;
DROP INDEX IF EXISTS idx_invoices_student_id;
DROP INDEX IF EXISTS idx_student_companies_student_id;
DROP INDEX IF EXISTS idx_punch_cards_student;

CREATE INDEX IF NOT EXISTS idx_lessons_customer_id ON lessons(customer_id);
CREATE INDEX IF NOT EXISTS idx_invoices_customer_id ON invoices(customer_id);
CREATE INDEX IF NOT EXISTS idx_customer_companies_customer_id ON customer_companies(customer_id);
CREATE INDEX IF NOT EXISTS idx_punch_cards_customer ON punch_cards(customer_id);

-- 3. Atualizar foreign keys (drop + recreate seguro)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_constraint WHERE conname='lessons_student_id_fkey') THEN
    ALTER TABLE lessons DROP CONSTRAINT lessons_student_id_fkey;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname='lessons_customer_id_fkey') THEN
    ALTER TABLE lessons ADD CONSTRAINT lessons_customer_id_fkey
      FOREIGN KEY (customer_id) REFERENCES customers(id) ON DELETE CASCADE;
  END IF;

  IF EXISTS (SELECT 1 FROM pg_constraint WHERE conname='invoices_student_id_fkey') THEN
    ALTER TABLE invoices DROP CONSTRAINT invoices_student_id_fkey;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname='invoices_customer_id_fkey') THEN
    ALTER TABLE invoices ADD CONSTRAINT invoices_customer_id_fkey
      FOREIGN KEY (customer_id) REFERENCES customers(id) ON DELETE CASCADE;
  END IF;

  IF EXISTS (SELECT 1 FROM pg_constraint WHERE conname='customer_companies_student_id_fkey') THEN
    ALTER TABLE customer_companies DROP CONSTRAINT customer_companies_student_id_fkey;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname='customer_companies_customer_id_fkey') THEN
    ALTER TABLE customer_companies ADD CONSTRAINT customer_companies_customer_id_fkey
      FOREIGN KEY (customer_id) REFERENCES customers(id) ON DELETE CASCADE;
  END IF;

  IF EXISTS (SELECT 1 FROM pg_constraint WHERE conname='punch_cards_student_id_fkey') THEN
    ALTER TABLE punch_cards DROP CONSTRAINT punch_cards_student_id_fkey;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname='punch_cards_customer_id_fkey') THEN
    ALTER TABLE punch_cards ADD CONSTRAINT punch_cards_customer_id_fkey
      FOREIGN KEY (customer_id) REFERENCES customers(id) ON DELETE CASCADE;
  END IF;
END $$;

-- 4. Atualizar FK guardian_id
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_constraint WHERE conname='students_guardian_id_fkey') THEN
    ALTER TABLE customers DROP CONSTRAINT students_guardian_id_fkey;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname='customers_guardian_id_fkey') THEN
    ALTER TABLE customers ADD CONSTRAINT customers_guardian_id_fkey
      FOREIGN KEY (guardian_id) REFERENCES customers(id) ON DELETE SET NULL;
  END IF;
END $$;

-- 5. Primary Key de customer_companies
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_constraint WHERE conname='student_companies_pkey') THEN
    ALTER TABLE customer_companies DROP CONSTRAINT student_companies_pkey;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname='customer_companies_pkey') THEN
    ALTER TABLE customer_companies ADD PRIMARY KEY (customer_id, company_id);
  END IF;
END $$;

-- 6. Políticas RLS
DROP POLICY IF EXISTS "Student companies access" ON customer_companies;
DROP POLICY IF EXISTS "Customer companies access" ON customer_companies;
CREATE POLICY "Customer companies access" ON customer_companies
  FOR ALL USING (true);
