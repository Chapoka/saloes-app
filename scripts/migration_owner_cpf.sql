-- ============================================
-- MIGRAÇÃO: Adicionar owner_cpf na tabela companies
-- ============================================

-- Adicionar coluna owner_cpf
ALTER TABLE companies ADD COLUMN IF NOT EXISTS owner_cpf TEXT;
