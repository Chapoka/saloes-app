-- Migration: Adicionar novos campos à tabela plans
-- Data: 2026-08-05

-- 1. Tipo de Produto
ALTER TABLE plans ADD COLUMN IF NOT EXISTS product_type TEXT;

-- 2. Tipo de Combo
ALTER TABLE plans ADD COLUMN IF NOT EXISTS combo_type TEXT;

-- 3. Comissão (%)
ALTER TABLE plans ADD COLUMN IF NOT EXISTS commission NUMERIC(5,2) DEFAULT 0;

-- 4. Profissional responsável
ALTER TABLE plans ADD COLUMN IF NOT EXISTS professional TEXT;

-- 5. Descrição do plano
ALTER TABLE plans ADD COLUMN IF NOT EXISTS description TEXT;

-- 6. Desconto (persistir no banco — antes era apenas UI)
ALTER TABLE plans ADD COLUMN IF NOT EXISTS discount NUMERIC(10,2) DEFAULT 0;
