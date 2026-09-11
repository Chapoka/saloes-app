-- =============================================
-- FIX: get_user_company_ids() deve considerar TODAS as fontes (user_companies + users.company_ids + users.company_id)
-- Corrige bug onde Admin via Empresa Rodrigo não via clientes (cliente aparecia só para super_admin)
--
-- HISTÓRICO:
-- 20260730: get_user_company_ids() usava apenas users.company_ids
-- 20260815: ainda só users.company_ids, user_owns_company(NULL)=FALSE
-- 20260817: corrigiu para UNION user_companies + users.company_ids (correto)
-- 20260831 & 20260904: regrediu para APENAS user_companies => admins/profissionais com link só via users.company_id ficaram sem visibilidade
-- 20260910: volta a UNION robusta + backfill + user_owns_company(NULL)=FALSE (seguro)
-- =============================================

-- 1. BACKFILL: garantir que user_companies contenha todas as ligações de users.company_id e users.company_ids
INSERT INTO public.user_companies (user_id, company_id)
SELECT u.id, u.company_id
FROM public.users u
WHERE u.company_id IS NOT NULL
  AND NOT EXISTS (
    SELECT 1 FROM public.user_companies uc
    WHERE uc.user_id = u.id AND uc.company_id = u.company_id
  );

INSERT INTO public.user_companies (user_id, company_id)
SELECT u.id, cid
FROM public.users u
CROSS JOIN LATERAL unnest(COALESCE(u.company_ids, ARRAY[]::UUID[])) AS cid
WHERE cid IS NOT NULL
  AND NOT EXISTS (
    SELECT 1 FROM public.user_companies uc
    WHERE uc.user_id = u.id AND uc.company_id = cid
  );

-- Sincronizar users.company_ids e users.company_id a partir de user_companies (fonte de verdade após backfill)
-- Mantém company_ids como UNION de todas as fontes
UPDATE public.users u
SET company_ids = COALESCE((
  SELECT ARRAY_AGG(DISTINCT x ORDER BY x)
  FROM (
    SELECT uc.company_id AS x FROM public.user_companies uc WHERE uc.user_id = u.id
    UNION
    SELECT unnest(COALESCE(u.company_ids, ARRAY[]::UUID[]))
    UNION
    SELECT u.company_id WHERE u.company_id IS NOT NULL
  ) s
), ARRAY[]::UUID[])
WHERE u.role != 'super_admin';

UPDATE public.users u
SET company_id = COALESCE(
  u.company_id,
  (SELECT uc.company_id FROM public.user_companies uc WHERE uc.user_id = u.id LIMIT 1)
)
WHERE u.role != 'super_admin' AND u.company_id IS NULL
  AND EXISTS (SELECT 1 FROM public.user_companies uc WHERE uc.user_id = u.id);

-- 2. CORRIGIR get_user_company_ids(): UNION de user_companies + users.company_ids + users.company_id
CREATE OR REPLACE FUNCTION public.get_user_company_ids()
RETURNS SETOF UUID
VOLATILE
SECURITY DEFINER
SET search_path = public, auth, pg_temp
AS $$
DECLARE
  v_company_ids UUID[];
  v_company_id UUID;
BEGIN
  IF public.is_super_admin() THEN
    RETURN QUERY SELECT c.id FROM public.companies c;
    RETURN;
  END IF;

  -- 2a. Fonte principal: user_companies (junção)
  RETURN QUERY
  SELECT uc.company_id FROM public.user_companies uc WHERE uc.user_id = auth.uid();

  -- 2b. Fallback: users.company_ids (array) — evita duplicatas já retornadas
  SELECT COALESCE(u.company_ids, ARRAY[]::UUID[]) INTO v_company_ids
  FROM public.users u WHERE u.id = auth.uid();

  IF v_company_ids IS NOT NULL AND array_length(v_company_ids, 1) > 0 THEN
    RETURN QUERY
    SELECT DISTINCT cid FROM unnest(v_company_ids) AS cid
    WHERE cid NOT IN (
      SELECT uc.company_id FROM public.user_companies uc WHERE uc.user_id = auth.uid()
    );
  END IF;

  -- 2c. Fallback adicional: users.company_id (coluna única) — legado
  SELECT u.company_id INTO v_company_id
  FROM public.users u WHERE u.id = auth.uid();

  IF v_company_id IS NOT NULL THEN
    IF NOT EXISTS (
      SELECT 1 FROM public.user_companies uc WHERE uc.user_id = auth.uid() AND uc.company_id = v_company_id
    ) AND (v_company_ids IS NULL OR NOT (v_company_id = ANY(v_company_ids))) THEN
      RETURN QUERY SELECT v_company_id;
    END IF;
  END IF;
END;
$$ LANGUAGE plpgsql;

-- 3. CORRIGIR user_owns_company(): NULL deve ser FALSE (seguro, evita vazamento de clientes sem empresa)
-- super_admin já tem bypass via is_super_admin(), então FALSE é correto para isolamento
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

-- 4. Garantir que customers com company_id NULL mas com customer_companies sejam visíveis
-- A policy customers_select já verifica EXISTS(customer_companies ...) com user_owns_company, então clientes corretamente vinculados via junction continuarão visíveis
-- Se houver clientes órfãos (company_id NULL e sem junction), permanecerão invisíveis para admin (apenas super_admin vê) — evita vazamento

-- 5. Comentário para debug
COMMENT ON FUNCTION public.get_user_company_ids() IS '20260910: UNION user_companies + users.company_ids + users.company_id, corrige visibilidade Empresa Rodrigo';
COMMENT ON FUNCTION public.user_owns_company(UUID) IS '20260910: NULL => FALSE para isolamento, super_admin bypass';
