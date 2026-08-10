-- Migration: Adicionar colunas discount_type, commission_type e ref_id à tabela plan_items
-- Data: 2026-08-05

-- Tipo do desconto: "fixed" (R$) ou "percent" (%)
ALTER TABLE plan_items ADD COLUMN IF NOT EXISTS discount_type TEXT NOT NULL DEFAULT 'fixed';

-- Tipo da comissão: "fixed" (R$) ou "percent" (%)
ALTER TABLE plan_items ADD COLUMN IF NOT EXISTS commission_type TEXT NOT NULL DEFAULT 'percent';

-- Referência ao item original (service_id, etc.)
ALTER TABLE plan_items ADD COLUMN IF NOT EXISTS ref_id UUID;
