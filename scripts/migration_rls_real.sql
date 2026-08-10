-- ============================================
-- MIGRAÇÃO: RLS Políticas Reais por company_id + user_id
-- Substitui políticas "USING (true)" por validação real de multi-tenancy
-- ============================================

-- Função auxiliar: verifica se usuário atual é super_admin
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

-- Função auxiliar: verifica se usuário atual pertence à empresa
CREATE OR REPLACE FUNCTION public.user_belongs_to_company(company_uuid UUID)
RETURNS BOOLEAN
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.user_companies
    WHERE user_id = auth.uid() AND company_id = company_uuid
  );
END;
$$ LANGUAGE plpgsql;

-- Função auxiliar: obtém company_ids do usuário atual
CREATE OR REPLACE FUNCTION public.get_user_company_ids()
RETURNS UUID[]
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  ids UUID[];
BEGIN
  SELECT ARRAY_AGG(company_id) INTO ids
  FROM public.user_companies
  WHERE user_id = auth.uid();
  RETURN COALESCE(ids, ARRAY[]::UUID[]);
END;
$$ LANGUAGE plpgsql;

-- ============================================
-- 1. COMPANIES
-- ============================================
DROP POLICY IF EXISTS "Companies per user" ON companies;
CREATE POLICY "Companies per user" ON companies
  FOR ALL
  USING (
    public.is_super_admin()
    OR public.user_belongs_to_company(id)
  );

-- ============================================
-- 2. USERS
-- ============================================
DROP POLICY IF EXISTS "users_read_own" ON users;
DROP POLICY IF EXISTS "users_update_own" ON users;
DROP POLICY IF EXISTS "users_delete_own" ON users;

CREATE POLICY "users_read_own" ON users
  FOR SELECT
  USING (
    auth.uid() = id
    OR public.is_super_admin()
    OR public.user_belongs_to_company(company_id)
  );

CREATE POLICY "users_update_own" ON users
  FOR UPDATE
  USING (
    auth.uid() = id
    OR public.is_super_admin()
    OR public.user_belongs_to_company(company_id)
  )
  WITH CHECK (
    auth.uid() = id
    OR public.is_super_admin()
    OR public.user_belongs_to_company(company_id)
  );

CREATE POLICY "users_delete_own" ON users
  FOR DELETE
  USING (
    auth.uid() = id
    OR public.is_super_admin()
  );

-- ============================================
-- 3. USER_COMPANIES (N:N)
-- ============================================
DROP POLICY IF EXISTS "User companies access" ON user_companies;
CREATE POLICY "User companies access" ON user_companies
  FOR ALL
  USING (
    user_id = auth.uid()
    OR public.is_super_admin()
    OR public.user_belongs_to_company(company_id)
  );

-- ============================================
-- 4. STUDENTS (clients)
-- ============================================
DROP POLICY IF EXISTS "Students per company" ON students;
CREATE POLICY "Students per company" ON students
  FOR ALL
  USING (
    public.is_super_admin()
    OR company_id = ANY(public.get_user_company_ids())
  );

-- ============================================
-- 5. PLANS
-- ============================================
DROP POLICY IF EXISTS "Plans per company" ON plans;
CREATE POLICY "Plans per company" ON plans
  FOR ALL
  USING (
    public.is_super_admin()
    OR company_id = ANY(public.get_user_company_ids())
  );

-- ============================================
-- 6. LESSONS
-- ============================================
DROP POLICY IF EXISTS "Lessons per company" ON lessons;
CREATE POLICY "Lessons per company" ON lessons
  FOR ALL
  USING (
    public.is_super_admin()
    OR company_id = ANY(public.get_user_company_ids())
  );

-- ============================================
-- 7. INVOICES
-- ============================================
DROP POLICY IF EXISTS "Invoices per company" ON invoices;
CREATE POLICY "Invoices per company" ON invoices
  FOR ALL
  USING (
    public.is_super_admin()
    OR company_id = ANY(public.get_user_company_ids())
  );

-- ============================================
-- 8. PUNCH_CARDS
-- ============================================
DROP POLICY IF EXISTS "Punch cards per company" ON punch_cards;
CREATE POLICY "Punch cards per company" ON punch_cards
  FOR ALL
  USING (
    public.is_super_admin()
    OR company_id = ANY(public.get_user_company_ids())
  );

-- ============================================
-- 9. WAITING_LIST
-- ============================================
DROP POLICY IF EXISTS "Waiting list per company" ON waiting_list;
CREATE POLICY "Waiting list per company" ON waiting_list
  FOR ALL
  USING (
    public.is_super_admin()
    OR company_id = ANY(public.get_user_company_ids())
  );

-- ============================================
-- 10. TEMPLATES
-- ============================================
DROP POLICY IF EXISTS "Templates per company" ON templates;
CREATE POLICY "Templates per company" ON templates
  FOR ALL
  USING (
    public.is_super_admin()
    OR company_id = ANY(public.get_user_company_ids())
  );

-- ============================================
-- 11. SERVICES
-- ============================================
DROP POLICY IF EXISTS "Services per company" ON services;
CREATE POLICY "Services per company" ON services
  FOR ALL
  USING (
    public.is_super_admin()
    OR company_id = ANY(public.get_user_company_ids())
  );

-- ============================================
-- 12. SERVICE_COMBOS
-- ============================================
DROP POLICY IF EXISTS "Service combos per company" ON service_combos;
CREATE POLICY "Service combos per company" ON service_combos
  FOR ALL
  USING (
    public.is_super_admin()
    OR company_id = ANY(public.get_user_company_ids())
  );

-- ============================================
-- 13. STYLIST_LEVELS
-- ============================================
DROP POLICY IF EXISTS "Stylist levels per company" ON stylist_levels;
CREATE POLICY "Stylist levels per company" ON stylist_levels
  FOR ALL
  USING (
    public.is_super_admin()
    OR company_id = ANY(public.get_user_company_ids())
  );

-- ============================================
-- 14. MODALITIES
-- ============================================
DROP POLICY IF EXISTS "Modalities per company" ON modalities;
CREATE POLICY "Modalities per company" ON modalities
  FOR ALL
  USING (
    public.is_super_admin()
    OR company_id = ANY(public.get_user_company_ids())
  );

-- ============================================
-- 15. COMPANY_INTEGRATIONS
-- ============================================
DROP POLICY IF EXISTS "Integrations per company" ON company_integrations;
CREATE POLICY "Integrations per company" ON company_integrations
  FOR ALL
  USING (
    public.is_super_admin()
    OR company_id = ANY(public.get_user_company_ids())
  );

-- ============================================
-- 16. SETTINGS (global, super_admin only)
-- ============================================
DROP POLICY IF EXISTS "Settings access" ON settings;
CREATE POLICY "Settings access" ON settings
  FOR ALL
  USING (public.is_super_admin());

-- ============================================
-- 17. AUDIT_LOGS (super_admin only)
-- ============================================
DROP POLICY IF EXISTS "Audit logs access" ON audit_logs;
CREATE POLICY "Audit logs access" ON audit_logs
  FOR ALL
  USING (public.is_super_admin());

-- ============================================
-- 18. STUDENT_COMPANIES (N:N)
-- ============================================
DROP POLICY IF EXISTS "Student companies access" ON student_companies;
CREATE POLICY "Student companies access" ON student_companies
  FOR ALL
  USING (
    public.is_super_admin()
    OR company_id = ANY(public.get_user_company_ids())
  );

-- ============================================
-- HABILITAR RLS EM TODAS AS TABELAS
-- ============================================
ALTER TABLE companies ENABLE ROW LEVEL SECURITY;
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_companies ENABLE ROW LEVEL SECURITY;
ALTER TABLE students ENABLE ROW LEVEL SECURITY;
ALTER TABLE plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE lessons ENABLE ROW LEVEL SECURITY;
ALTER TABLE invoices ENABLE ROW LEVEL SECURITY;
ALTER TABLE punch_cards ENABLE ROW LEVEL SECURITY;
ALTER TABLE waiting_list ENABLE ROW LEVEL SECURITY;
ALTER TABLE templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE services ENABLE ROW LEVEL SECURITY;
ALTER TABLE service_combos ENABLE ROW LEVEL SECURITY;
ALTER TABLE service_combo_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE stylist_levels ENABLE ROW LEVEL SECURITY;
ALTER TABLE modalities ENABLE ROW LEVEL SECURITY;
ALTER TABLE company_integrations ENABLE ROW LEVEL SECURITY;
ALTER TABLE settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE student_companies ENABLE ROW LEVEL SECURITY;