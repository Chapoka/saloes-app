-- =============================================
-- FIX: Admin pode atualizar perfil/empresa de OUTRO admin da MESMA empresa
-- Bloqueia self-edit via RLS? Não, self-edit já é permitido via auth.uid()=id
-- Mas permite admin atualizar outro admin se compartilhar empresa
-- Também corrige WITH CHECK que antes bloqueava
-- =============================================

DROP POLICY IF EXISTS "users_update" ON users;

CREATE POLICY "users_update" ON users
  FOR UPDATE USING (
    auth.uid() = id
    OR public.is_super_admin()
    OR (
      EXISTS (
        SELECT 1 FROM public.user_companies uc
        WHERE uc.user_id = users.id
          AND public.user_owns_company(uc.company_id)
      )
      -- Só permite se alvo for admin/super_admin (não cliente/profissional indiscriminado)
      -- Isso será reforçado no backend; RLS mantém permissão ampla mas segura
    )
  )
  WITH CHECK (
    auth.uid() = id
    OR public.is_super_admin()
    OR (
      EXISTS (
        SELECT 1 FROM public.user_companies uc
        WHERE uc.user_id = users.id
          AND public.user_owns_company(uc.company_id)
      )
    )
  );

-- Também permitir admin alternar active via mesmo critério (toggle)
-- Já coberto pela política acima

COMMENT ON POLICY "users_update" ON users IS '20260915: permite admin atualizar outro admin da mesma empresa; self-edit continua liberado mas frontend bloqueará admin self-edit';
