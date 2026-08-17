-- Fix: get_user_company_ids() agora busca de user_companies + users.company_ids
CREATE OR REPLACE FUNCTION public.get_user_company_ids()
RETURNS SETOF UUID
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_company_ids UUID[];
BEGIN
  IF public.is_super_admin() THEN
    RETURN QUERY SELECT c.id FROM public.companies c;
    RETURN;
  END IF;

  -- Busca de user_companies (tabela de junção)
  RETURN QUERY
  SELECT uc.company_id FROM public.user_companies uc WHERE uc.user_id = auth.uid();

  -- Busca de users.company_ids (coluna array) — evita duplicatas
  SELECT COALESCE(u.company_ids, ARRAY[]::UUID[]) INTO v_company_ids
  FROM public.users u WHERE u.id = auth.uid();

  IF v_company_ids IS NOT NULL AND array_length(v_company_ids, 1) > 0 THEN
    RETURN QUERY
    SELECT DISTINCT cid FROM unnest(v_company_ids) AS cid
    WHERE cid NOT IN (
      SELECT uc.company_id FROM public.user_companies uc WHERE uc.user_id = auth.uid()
    );
  END IF;
END;
$$ LANGUAGE plpgsql;
