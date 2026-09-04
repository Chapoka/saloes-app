-- =============================================
-- FIX: Remove permissive policies that bypass multi-tenant isolation
-- and add missing policies for appointments, professional_services, blocked_times
--
-- ROOT CAUSE: fix_rls_policies.sql created "authenticated_read_all" etc. on ALL tables
-- which overrides multi-tenant restrictions via PostgreSQL OR logic.
-- In RLS, if ANY permissive policy grants access, the row is visible.
-- =============================================

-- 1. Drop ALL permissive "authenticated_*" policies that bypass isolation
DO $$
DECLARE
  t TEXT;
BEGIN
  FOR t IN
    SELECT DISTINCT tablename FROM pg_policies
    WHERE schemaname = 'public'
      AND policyname LIKE 'authenticated_%'
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS "authenticated_read_all" ON %I', t);
    EXECUTE format('DROP POLICY IF EXISTS "authenticated_insert_all" ON %I', t);
    EXECUTE format('DROP POLICY IF EXISTS "authenticated_update_all" ON %I', t);
    EXECUTE format('DROP POLICY IF EXISTS "authenticated_delete_all" ON %I', t);
    EXECUTE format('DROP POLICY IF EXISTS "authenticated_all" ON %I', t);
  END LOOP;
END;
$$ LANGUAGE plpgsql;

-- 2. Also drop old named policies that may have leaked through
DO $$
DECLARE
  t TEXT;
BEGIN
  FOR t IN
    SELECT DISTINCT tablename FROM pg_policies
    WHERE schemaname = 'public'
      AND policyname IN (
        'Services per company', 'Combos per company',
        'Combo items per company', 'Stylist levels per company',
        'Punch cards per company'
      )
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS "Services per company" ON %I', t);
    EXECUTE format('DROP POLICY IF EXISTS "Combos per company" ON %I', t);
    EXECUTE format('DROP POLICY IF EXISTS "Combo items per company" ON %I', t);
    EXECUTE format('DROP POLICY IF EXISTS "Stylist levels per company" ON %I', t);
    EXECUTE format('DROP POLICY IF EXISTS "Punch cards per company" ON %I', t);
  END LOOP;
END;
$$ LANGUAGE plpgsql;

-- 3. Ensure get_user_company_ids() uses user_companies as single source of truth
CREATE OR REPLACE FUNCTION public.get_user_company_ids()
RETURNS SETOF UUID
VOLATILE
SECURITY DEFINER
SET search_path = public, auth, pg_temp
AS $$
BEGIN
  IF public.is_super_admin() THEN
    RETURN QUERY SELECT c.id FROM public.companies c;
    RETURN;
  END IF;

  RETURN QUERY
  SELECT uc.company_id FROM public.user_companies uc WHERE uc.user_id = auth.uid();
END;
$$ LANGUAGE plpgsql;

-- 4. Ensure user_owns_company() works correctly
CREATE OR REPLACE FUNCTION public.user_owns_company(p_company_id UUID)
RETURNS BOOLEAN
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF public.is_super_admin() THEN
    RETURN TRUE;
  END IF;
  IF p_company_id IS NULL THEN
    RETURN TRUE;
  END IF;
  RETURN EXISTS (
    SELECT 1 FROM public.get_user_company_ids() AS cid WHERE cid = p_company_id
  );
END;
$$ LANGUAGE plpgsql;

-- =============================================
-- 5. APPOINTMENTS: Add multi-tenant policies (were missing!)
-- =============================================
DROP POLICY IF EXISTS "appointments_select" ON appointments;
DROP POLICY IF EXISTS "appointments_insert" ON appointments;
DROP POLICY IF EXISTS "appointments_update" ON appointments;
DROP POLICY IF EXISTS "appointments_delete" ON appointments;

CREATE POLICY "appointments_select" ON appointments
  FOR SELECT USING (
    public.is_super_admin()
    OR public.user_owns_company(company_id)
    OR EXISTS (
      SELECT 1 FROM public.customers c
      WHERE c.id = customer_id
        AND public.user_owns_company(c.company_id)
    )
  );

CREATE POLICY "appointments_insert" ON appointments
  FOR INSERT WITH CHECK (
    public.user_owns_company(company_id)
  );

CREATE POLICY "appointments_update" ON appointments
  FOR UPDATE USING (
    public.is_super_admin()
    OR public.user_owns_company(company_id)
  );

CREATE POLICY "appointments_delete" ON appointments
  FOR DELETE USING (
    public.is_super_admin()
    OR public.user_owns_company(company_id)
  );

-- =============================================
-- 6. PROFESSIONAL_SERVICES: Add multi-tenant policies (were missing!)
-- =============================================
DROP POLICY IF EXISTS "professional_services_select" ON professional_services;
DROP POLICY IF EXISTS "professional_services_insert" ON professional_services;
DROP POLICY IF EXISTS "professional_services_update" ON professional_services;
DROP POLICY IF EXISTS "professional_services_delete" ON professional_services;

CREATE POLICY "professional_services_select" ON professional_services
  FOR SELECT USING (
    public.is_super_admin()
    OR public.user_owns_company(company_id)
  );

CREATE POLICY "professional_services_insert" ON professional_services
  FOR INSERT WITH CHECK (
    public.user_owns_company(company_id)
  );

CREATE POLICY "professional_services_update" ON professional_services
  FOR UPDATE USING (
    public.user_owns_company(company_id)
  );

CREATE POLICY "professional_services_delete" ON professional_services
  FOR DELETE USING (
    public.user_owns_company(company_id)
  );

-- =============================================
-- 7. BLOCKED_TIMES: Add multi-tenant policies (were missing!)
-- =============================================
DROP POLICY IF EXISTS "blocked_times_select" ON blocked_times;
DROP POLICY IF EXISTS "blocked_times_insert" ON blocked_times;
DROP POLICY IF EXISTS "blocked_times_update" ON blocked_times;
DROP POLICY IF EXISTS "blocked_times_delete" ON blocked_times;

CREATE POLICY "blocked_times_select" ON blocked_times
  FOR SELECT USING (
    public.is_super_admin()
    OR public.user_owns_company(company_id)
  );

CREATE POLICY "blocked_times_insert" ON blocked_times
  FOR INSERT WITH CHECK (
    public.user_owns_company(company_id)
  );

CREATE POLICY "blocked_times_update" ON blocked_times
  FOR UPDATE USING (
    public.user_owns_company(company_id)
  );

CREATE POLICY "blocked_times_delete" ON blocked_times
  FOR DELETE USING (
    public.user_owns_company(company_id)
  );

-- =============================================
-- 8. PROFESSIONAL_SERVICES may not have company_id column; add if missing
-- =============================================
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'professional_services'
      AND column_name = 'company_id'
  ) THEN
    ALTER TABLE professional_services ADD COLUMN company_id UUID REFERENCES companies(id);
  END IF;
END;
$$ LANGUAGE plpgsql;

-- =============================================
-- 9. Revoke broad permissions and ensure RLS is enforced
-- =============================================
ALTER TABLE appointments FORCE ROW LEVEL SECURITY;
ALTER TABLE customers FORCE ROW LEVEL SECURITY;
ALTER TABLE companies FORCE ROW LEVEL SECURITY;
ALTER TABLE plans FORCE ROW LEVEL SECURITY;
ALTER TABLE invoices FORCE ROW LEVEL SECURITY;
ALTER TABLE services FORCE ROW LEVEL SECURITY;
ALTER TABLE blocked_times FORCE ROW LEVEL SECURITY;
ALTER TABLE professional_services FORCE ROW LEVEL SECURITY;
ALTER TABLE waiting_list FORCE ROW LEVEL SECURITY;
ALTER TABLE punch_cards FORCE ROW LEVEL SECURITY;
ALTER TABLE templates FORCE ROW LEVEL SECURITY;
ALTER TABLE stylist_levels FORCE ROW LEVEL SECURITY;
ALTER TABLE customer_companies FORCE ROW LEVEL SECURITY;
ALTER TABLE company_integrations FORCE ROW LEVEL SECURITY;
ALTER TABLE service_combos FORCE ROW LEVEL SECURITY;
ALTER TABLE service_combo_items FORCE ROW LEVEL SECURITY;
