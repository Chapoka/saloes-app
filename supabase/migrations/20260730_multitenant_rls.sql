-- =============================================
-- MULTI-TENANT RLS POLICIES
-- super_admin vê tudo, admin vê suas empresas
-- =============================================

-- 1. Adicionar company_id e company_ids na tabela users
ALTER TABLE users ADD COLUMN IF NOT EXISTS company_id UUID REFERENCES companies(id) ON DELETE SET NULL;
ALTER TABLE users ADD COLUMN IF NOT EXISTS company_ids UUID[] DEFAULT '{}';

-- 2. Função helper: retorna IDs das empresas do usuário logado
CREATE OR REPLACE FUNCTION public.get_user_company_ids()
RETURNS SETOF UUID
STABLE
SECURITY DEFINER
SET search_path = public
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

-- 3. Função helper: usuário pode acessar empresa?
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

-- 4. Função helper: usuário pode acessar customer?
CREATE OR REPLACE FUNCTION public.user_owns_customer(p_customer_id UUID)
RETURNS BOOLEAN
STABLE
SECURITY DEFINER
SET search_path = public
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

-- =============================================
-- 5. Drop all old permissive policies
-- =============================================
DO $$
DECLARE t TEXT;
BEGIN
  FOR t IN
    SELECT tablename FROM pg_policies
    WHERE schemaname = 'public'
      AND policyname IN (
        'authenticated_read_all','authenticated_insert_all',
        'authenticated_update_all','authenticated_delete_all',
        'authenticated_all','Services per company','Combos per company',
        'Combo items per company','Stylist levels per company',
        'Punch cards per company'
      )
    GROUP BY tablename
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS "authenticated_read_all" ON %I', t);
    EXECUTE format('DROP POLICY IF EXISTS "authenticated_insert_all" ON %I', t);
    EXECUTE format('DROP POLICY IF EXISTS "authenticated_update_all" ON %I', t);
    EXECUTE format('DROP POLICY IF EXISTS "authenticated_delete_all" ON %I', t);
    EXECUTE format('DROP POLICY IF EXISTS "authenticated_all" ON %I', t);
    EXECUTE format('DROP POLICY IF EXISTS "Services per company" ON %I', t);
    EXECUTE format('DROP POLICY IF EXISTS "Combos per company" ON %I', t);
    EXECUTE format('DROP POLICY IF EXISTS "Combo items per company" ON %I', t);
    EXECUTE format('DROP POLICY IF EXISTS "Stylist levels per company" ON %I', t);
    EXECUTE format('DROP POLICY IF EXISTS "Punch cards per company" ON %I', t);
  END LOOP;
END;
$$ LANGUAGE plpgsql;

-- =============================================
-- 6. POLICIES: companies (super_admin vê todas, admin vê vinculadas)
-- =============================================
CREATE POLICY "companies_select" ON companies
  FOR SELECT USING (public.is_super_admin() OR id IN (SELECT public.get_user_company_ids()));

CREATE POLICY "companies_insert" ON companies
  FOR INSERT WITH CHECK (public.is_super_admin());

CREATE POLICY "companies_update" ON companies
  FOR UPDATE USING (public.is_super_admin() OR id IN (SELECT public.get_user_company_ids()));

CREATE POLICY "companies_delete" ON companies
  FOR DELETE USING (public.is_super_admin());

-- =============================================
-- 7. POLICIES: company_integrations (mesma empresa)
-- =============================================
CREATE POLICY "company_integrations_select" ON company_integrations
  FOR SELECT USING (public.user_owns_company(company_id));

CREATE POLICY "company_integrations_insert" ON company_integrations
  FOR INSERT WITH CHECK (public.user_owns_company(company_id));

CREATE POLICY "company_integrations_update" ON company_integrations
  FOR UPDATE USING (public.user_owns_company(company_id));

CREATE POLICY "company_integrations_delete" ON company_integrations
  FOR DELETE USING (public.user_owns_company(company_id));

-- =============================================
-- 8. POLICIES: users (próprio + super_admin vê todos)
-- =============================================
DROP POLICY IF EXISTS "users_read_own" ON users;
DROP POLICY IF EXISTS "users_update_own" ON users;
DROP POLICY IF EXISTS "users_delete_own" ON users;

CREATE POLICY "users_select" ON users
  FOR SELECT USING (auth.uid() = id OR public.is_super_admin());

CREATE POLICY "users_insert" ON users
  FOR INSERT WITH CHECK (auth.uid() = id OR public.is_super_admin());

CREATE POLICY "users_update" ON users
  FOR UPDATE USING (auth.uid() = id OR public.is_super_admin())
  WITH CHECK (auth.uid() = id OR public.is_super_admin());

CREATE POLICY "users_delete" ON users
  FOR DELETE USING (public.is_super_admin());

-- =============================================
-- 9. POLICIES: customer_companies
-- =============================================
CREATE POLICY "customer_companies_select" ON customer_companies
  FOR SELECT USING (public.user_owns_company(company_id));

CREATE POLICY "customer_companies_insert" ON customer_companies
  FOR INSERT WITH CHECK (public.user_owns_company(company_id));

CREATE POLICY "customer_companies_delete" ON customer_companies
  FOR DELETE USING (public.user_owns_company(company_id));

-- =============================================
-- 10. POLICIES: customers
-- =============================================
CREATE POLICY "customers_select" ON customers
  FOR SELECT USING (
    public.is_super_admin()
    OR public.user_owns_company(company_id)
    OR EXISTS (
      SELECT 1 FROM public.customer_companies cc
      WHERE cc.customer_id = customers.id
        AND public.user_owns_company(cc.company_id)
    )
  );

CREATE POLICY "customers_insert" ON customers
  FOR INSERT WITH CHECK (public.user_owns_company(company_id));

CREATE POLICY "customers_update" ON customers
  FOR UPDATE USING (
    public.is_super_admin()
    OR public.user_owns_company(company_id)
  );

CREATE POLICY "customers_delete" ON customers
  FOR DELETE USING (
    public.is_super_admin()
    OR public.user_owns_company(company_id)
  );

-- =============================================
-- 11. POLICIES: tabelas com company_id
-- (plans, lessons, invoices, templates,
--  waiting_list, services, service_combos,
--  service_combo_items, stylist_levels,
--  punch_cards, audit_logs)
-- =============================================

-- PLANS
CREATE POLICY "plans_select" ON plans FOR SELECT USING (public.user_owns_company(company_id));
CREATE POLICY "plans_insert" ON plans FOR INSERT WITH CHECK (public.user_owns_company(company_id));
CREATE POLICY "plans_update" ON plans FOR UPDATE USING (public.user_owns_company(company_id));
CREATE POLICY "plans_delete" ON plans FOR DELETE USING (public.user_owns_company(company_id));

-- LESSONS
CREATE POLICY "lessons_select" ON lessons FOR SELECT USING (public.user_owns_company(company_id));
CREATE POLICY "lessons_insert" ON lessons FOR INSERT WITH CHECK (public.user_owns_company(company_id));
CREATE POLICY "lessons_update" ON lessons FOR UPDATE USING (public.user_owns_company(company_id));
CREATE POLICY "lessons_delete" ON lessons FOR DELETE USING (public.user_owns_company(company_id));

-- INVOICES
CREATE POLICY "invoices_select" ON invoices FOR SELECT USING (public.user_owns_company(company_id));
CREATE POLICY "invoices_insert" ON invoices FOR INSERT WITH CHECK (public.user_owns_company(company_id));
CREATE POLICY "invoices_update" ON invoices FOR UPDATE USING (public.user_owns_company(company_id));
CREATE POLICY "invoices_delete" ON invoices FOR DELETE USING (public.user_owns_company(company_id));

-- TEMPLATES
CREATE POLICY "templates_select" ON templates FOR SELECT USING (public.user_owns_company(company_id));
CREATE POLICY "templates_insert" ON templates FOR INSERT WITH CHECK (public.user_owns_company(company_id));
CREATE POLICY "templates_update" ON templates FOR UPDATE USING (public.user_owns_company(company_id));
CREATE POLICY "templates_delete" ON templates FOR DELETE USING (public.user_owns_company(company_id));

-- WAITING_LIST
CREATE POLICY "waiting_list_select" ON waiting_list FOR SELECT USING (public.user_owns_company(company_id));
CREATE POLICY "waiting_list_insert" ON waiting_list FOR INSERT WITH CHECK (public.user_owns_company(company_id));
CREATE POLICY "waiting_list_update" ON waiting_list FOR UPDATE USING (public.user_owns_company(company_id));
CREATE POLICY "waiting_list_delete" ON waiting_list FOR DELETE USING (public.user_owns_company(company_id));

-- SERVICES
CREATE POLICY "services_select" ON services FOR SELECT USING (public.user_owns_company(company_id));
CREATE POLICY "services_insert" ON services FOR INSERT WITH CHECK (public.user_owns_company(company_id));
CREATE POLICY "services_update" ON services FOR UPDATE USING (public.user_owns_company(company_id));
CREATE POLICY "services_delete" ON services FOR DELETE USING (public.user_owns_company(company_id));

-- SERVICE_COMBOS
CREATE POLICY "service_combos_select" ON service_combos FOR SELECT USING (public.user_owns_company(company_id));
CREATE POLICY "service_combos_insert" ON service_combos FOR INSERT WITH CHECK (public.user_owns_company(company_id));
CREATE POLICY "service_combos_update" ON service_combos FOR UPDATE USING (public.user_owns_company(company_id));
CREATE POLICY "service_combos_delete" ON service_combos FOR DELETE USING (public.user_owns_company(company_id));

-- SERVICE_COMBO_ITEMS (via combo)
CREATE POLICY "service_combo_items_select" ON service_combo_items FOR SELECT USING (
  EXISTS (SELECT 1 FROM service_combos sc WHERE sc.id = combo_id AND public.user_owns_company(sc.company_id))
);
CREATE POLICY "service_combo_items_insert" ON service_combo_items FOR INSERT WITH CHECK (
  EXISTS (SELECT 1 FROM service_combos sc WHERE sc.id = combo_id AND public.user_owns_company(sc.company_id))
);
CREATE POLICY "service_combo_items_delete" ON service_combo_items FOR DELETE USING (
  EXISTS (SELECT 1 FROM service_combos sc WHERE sc.id = combo_id AND public.user_owns_company(sc.company_id))
);

-- STYLIST_LEVELS
CREATE POLICY "stylist_levels_select" ON stylist_levels FOR SELECT USING (public.user_owns_company(company_id));
CREATE POLICY "stylist_levels_insert" ON stylist_levels FOR INSERT WITH CHECK (public.user_owns_company(company_id));
CREATE POLICY "stylist_levels_update" ON stylist_levels FOR UPDATE USING (public.user_owns_company(company_id));
CREATE POLICY "stylist_levels_delete" ON stylist_levels FOR DELETE USING (public.user_owns_company(company_id));

-- PUNCH_CARDS
CREATE POLICY "punch_cards_select" ON punch_cards FOR SELECT USING (public.user_owns_company(company_id));
CREATE POLICY "punch_cards_insert" ON punch_cards FOR INSERT WITH CHECK (public.user_owns_company(company_id));
CREATE POLICY "punch_cards_update" ON punch_cards FOR UPDATE USING (public.user_owns_company(company_id));
CREATE POLICY "punch_cards_delete" ON punch_cards FOR DELETE USING (public.user_owns_company(company_id));

-- =============================================
-- 12. POLICIES: tabelas globais (settings, modalities)
-- =============================================
CREATE POLICY "settings_select" ON settings FOR SELECT USING (auth.uid() IS NOT NULL);
CREATE POLICY "settings_insert" ON settings FOR INSERT WITH CHECK (public.is_super_admin());
CREATE POLICY "settings_update" ON settings FOR UPDATE USING (public.is_super_admin());
CREATE POLICY "settings_delete" ON settings FOR DELETE USING (public.is_super_admin());

CREATE POLICY "modalities_select" ON modalities FOR SELECT USING (auth.uid() IS NOT NULL);
CREATE POLICY "modalities_insert" ON modalities FOR INSERT WITH CHECK (public.is_super_admin());
CREATE POLICY "modalities_update" ON modalities FOR UPDATE USING (public.is_super_admin());
CREATE POLICY "modalities_delete" ON modalities FOR DELETE USING (public.is_super_admin());

-- AUDIT_LOGS
CREATE POLICY "audit_logs_select" ON audit_logs FOR SELECT USING (public.is_super_admin());
CREATE POLICY "audit_logs_insert" ON audit_logs FOR INSERT WITH CHECK (public.is_super_admin());
