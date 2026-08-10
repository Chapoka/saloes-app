-- ============================================
-- MIGRAÇÃO FINAL PRÉ-LANÇAMENTO
-- ============================================

-- 1. SEGURANÇA: Remover GRANT TO anon das RPCs críticas
REVOKE EXECUTE ON FUNCTION public.create_user_direct FROM anon;
REVOKE EXECUTE ON FUNCTION public.delete_user_direct FROM anon;

-- 2. GARANTIR QUE AS RPCs SÓ ACEITAM authenticated
GRANT EXECUTE ON FUNCTION public.create_user_direct TO authenticated;
GRANT EXECUTE ON FUNCTION public.delete_user_direct TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_reset_user_password TO authenticated;

-- 3. ADICIONAR TRIGGER updated_at PARA user_companies e student_companies (estavam faltando)
CREATE TRIGGER set_updated_at_user_companies
  BEFORE UPDATE ON user_companies
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER set_updated_at_student_companies
  BEFORE UPDATE ON student_companies
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();
