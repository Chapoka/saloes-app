-- Tabela de overrides: controla o status ativo de serviços globais por salão
CREATE TABLE IF NOT EXISTS company_service_overrides (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  service_id UUID NOT NULL REFERENCES services(id) ON DELETE CASCADE,
  active BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(company_id, service_id)
);

ALTER TABLE company_service_overrides ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "cso_select" ON company_service_overrides;
CREATE POLICY "cso_select" ON company_service_overrides
  FOR SELECT USING (public.user_owns_company(company_id) OR public.is_super_admin());

DROP POLICY IF EXISTS "cso_insert" ON company_service_overrides;
CREATE POLICY "cso_insert" ON company_service_overrides
  FOR INSERT WITH CHECK (public.user_owns_company(company_id) OR public.is_super_admin());

DROP POLICY IF EXISTS "cso_update" ON company_service_overrides;
CREATE POLICY "cso_update" ON company_service_overrides
  FOR UPDATE USING (public.user_owns_company(company_id) OR public.is_super_admin());

DROP POLICY IF EXISTS "cso_delete" ON company_service_overrides;
CREATE POLICY "cso_delete" ON company_service_overrides
  FOR DELETE USING (public.user_owns_company(company_id) OR public.is_super_admin());
