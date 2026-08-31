-- Migration: Desvincular empresas indevidas de admins e usar user_companies como fonte única
-- Execute no SQL Editor do Supabase se a migration não rodar automaticamente

-- =============================================
-- 1. LIMPAR DADOS: Desvincular Studio Lins do admin de The Black
-- =============================================
DELETE FROM user_companies
WHERE user_id IN (
  SELECT uc.user_id
  FROM user_companies uc
  JOIN companies c ON c.id = uc.company_id
  WHERE c.name ILIKE '%The Black%'
)
AND company_id IN (
  SELECT c.id FROM companies c WHERE c.name ILIKE '%Studio%Lins%'
);

-- Sincronizar users.company_ids com user_companies (fonte de verdade)
UPDATE users u
SET company_ids = COALESCE(
  (SELECT ARRAY_AGG(DISTINCT uc.company_id) FROM user_companies uc WHERE uc.user_id = u.id),
  '{}'::UUID[]
)
WHERE u.role IN ('admin', 'super_admin');

-- =============================================
-- 2. CORRIGIR get_user_company_ids(): usar APENAS user_companies
-- =============================================
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
