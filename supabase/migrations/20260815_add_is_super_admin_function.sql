-- =============================================
-- FIX: Todas as correções de uma vez
-- =============================================

-- 1. Criar is_super_admin() — TODAS as políticas RLS dependem disso
CREATE OR REPLACE FUNCTION public.is_super_admin()
RETURNS BOOLEAN
VOLATILE
SECURITY DEFINER
SET search_path = public, auth, pg_temp
AS $$
DECLARE
  v_role TEXT;
BEGIN
  -- Check public.users first
  SELECT role INTO v_role FROM public.users WHERE id = auth.uid();
  IF v_role = 'super_admin' THEN RETURN TRUE; END IF;
  -- Fallback: check JWT user_metadata
  v_role := COALESCE(
    auth.jwt() -> 'user_metadata' ->> 'role',
    auth.jwt() ->> 'role'
  );
  RETURN v_role = 'super_admin';
END;
$$ LANGUAGE plpgsql;

-- 1b. Corrigir get_user_company_ids() — era STABLE, causa cache no PostgREST
CREATE OR REPLACE FUNCTION public.get_user_company_ids()
RETURNS SETOF UUID
VOLATILE
SECURITY DEFINER
SET search_path = public, auth, pg_temp
AS $$
BEGIN
  RETURN QUERY
  SELECT unnest(
    CASE
      WHEN EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND role = 'super_admin')
      THEN (SELECT array_agg(c.id) FROM public.companies c)
      ELSE COALESCE(
        (SELECT u.company_ids FROM public.users u WHERE u.id = auth.uid()),
        ARRAY[]::UUID[]
      )
    END
  );
END;
$$ LANGUAGE plpgsql;

-- 1c. Corrigir user_owns_company() — era STABLE
CREATE OR REPLACE FUNCTION public.user_owns_company(p_company_id UUID)
RETURNS BOOLEAN
VOLATILE
SECURITY DEFINER
SET search_path = public, auth, pg_temp
AS $$
BEGIN
  IF public.is_super_admin() THEN
    RETURN TRUE;
  END IF;
  IF p_company_id IS NULL THEN
    RETURN FALSE;
  END IF;
  RETURN EXISTS (
    SELECT 1 FROM public.get_user_company_ids() AS cid WHERE cid = p_company_id
  );
END;
$$ LANGUAGE plpgsql;

-- 1d. Corrigir user_owns_customer() — era STABLE
CREATE OR REPLACE FUNCTION public.user_owns_customer(p_customer_id UUID)
RETURNS BOOLEAN
VOLATILE
SECURITY DEFINER
SET search_path = public, auth, pg_temp
AS $$
BEGIN
  IF public.is_super_admin() THEN
    RETURN TRUE;
  END IF;
  RETURN EXISTS (
    SELECT 1 FROM public.customers c
    WHERE c.id = p_customer_id
      AND (
        public.user_owns_company(c.company_id)
        OR c.company_id IS NULL
        OR EXISTS (
          SELECT 1 FROM public.customer_companies cc
          WHERE cc.customer_id = p_customer_id
            AND public.user_owns_company(cc.company_id)
        )
      )
  );
END;
$$ LANGUAGE plpgsql;

-- 2. Criar delete_user_direct() — usado por Settings.jsx
CREATE OR REPLACE FUNCTION public.delete_user_direct(p_user_id UUID)
RETURNS BOOLEAN
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT public.is_super_admin() THEN
    RAISE EXCEPTION 'Apenas super_admin pode excluir usuários';
  END IF;
  DELETE FROM auth.users WHERE id = p_user_id;
  RETURN TRUE;
END;
$$ LANGUAGE plpgsql;

-- 3. RLS professional_services (tem company_id)
ALTER TABLE professional_services ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "professional_services_select" ON professional_services;
DROP POLICY IF EXISTS "professional_services_insert" ON professional_services;
DROP POLICY IF EXISTS "professional_services_update" ON professional_services;
DROP POLICY IF EXISTS "professional_services_delete" ON professional_services;
CREATE POLICY "professional_services_select" ON professional_services FOR SELECT USING (public.is_super_admin() OR public.user_owns_company(company_id));
CREATE POLICY "professional_services_insert" ON professional_services FOR INSERT WITH CHECK (public.is_super_admin() OR public.user_owns_company(company_id));
CREATE POLICY "professional_services_update" ON professional_services FOR UPDATE USING (public.is_super_admin() OR public.user_owns_company(company_id));
CREATE POLICY "professional_services_delete" ON professional_services FOR DELETE USING (public.is_super_admin() OR public.user_owns_company(company_id));

-- 4. RLS plan_services (NÃO tem company_id — usa plan_id → plans.company_id)
ALTER TABLE plan_services ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "plan_services_select" ON plan_services;
DROP POLICY IF EXISTS "plan_services_insert" ON plan_services;
DROP POLICY IF EXISTS "plan_services_update" ON plan_services;
DROP POLICY IF EXISTS "plan_services_delete" ON plan_services;
CREATE POLICY "plan_services_select" ON plan_services FOR SELECT USING (public.is_super_admin() OR EXISTS (SELECT 1 FROM plans p WHERE p.id = plan_id AND public.user_owns_company(p.company_id)));
CREATE POLICY "plan_services_insert" ON plan_services FOR INSERT WITH CHECK (public.is_super_admin() OR EXISTS (SELECT 1 FROM plans p WHERE p.id = plan_id AND public.user_owns_company(p.company_id)));
CREATE POLICY "plan_services_update" ON plan_services FOR UPDATE USING (public.is_super_admin() OR EXISTS (SELECT 1 FROM plans p WHERE p.id = plan_id AND public.user_owns_company(p.company_id)));
CREATE POLICY "plan_services_delete" ON plan_services FOR DELETE USING (public.is_super_admin() OR EXISTS (SELECT 1 FROM plans p WHERE p.id = plan_id AND public.user_owns_company(p.company_id)));

-- 5. RLS plan_items (NÃO tem company_id — usa plan_id → plans.company_id)
ALTER TABLE plan_items ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "plan_items_select" ON plan_items;
DROP POLICY IF EXISTS "plan_items_insert" ON plan_items;
DROP POLICY IF EXISTS "plan_items_update" ON plan_items;
DROP POLICY IF EXISTS "plan_items_delete" ON plan_items;
CREATE POLICY "plan_items_select" ON plan_items FOR SELECT USING (public.is_super_admin() OR EXISTS (SELECT 1 FROM plans p WHERE p.id = plan_id AND public.user_owns_company(p.company_id)));
CREATE POLICY "plan_items_insert" ON plan_items FOR INSERT WITH CHECK (public.is_super_admin() OR EXISTS (SELECT 1 FROM plans p WHERE p.id = plan_id AND public.user_owns_company(p.company_id)));
CREATE POLICY "plan_items_update" ON plan_items FOR UPDATE USING (public.is_super_admin() OR EXISTS (SELECT 1 FROM plans p WHERE p.id = plan_id AND public.user_owns_company(p.company_id)));
CREATE POLICY "plan_items_delete" ON plan_items FOR DELETE USING (public.is_super_admin() OR EXISTS (SELECT 1 FROM plans p WHERE p.id = plan_id AND public.user_owns_company(p.company_id)));

-- 6. RLS user_companies (tem user_id e company_id)
ALTER TABLE user_companies ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "user_companies_select" ON user_companies;
DROP POLICY IF EXISTS "user_companies_insert" ON user_companies;
DROP POLICY IF EXISTS "user_companies_delete" ON user_companies;
CREATE POLICY "user_companies_select" ON user_companies FOR SELECT USING (public.is_super_admin() OR user_id = auth.uid());
CREATE POLICY "user_companies_insert" ON user_companies FOR INSERT WITH CHECK (public.is_super_admin());
CREATE POLICY "user_companies_delete" ON user_companies FOR DELETE USING (public.is_super_admin());
