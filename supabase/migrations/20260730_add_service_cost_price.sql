-- Add preco_custo and missing columns to services table
-- Execute this migration in Supabase SQL Editor

-- Add cost price column
ALTER TABLE services ADD COLUMN IF NOT EXISTS preco_custo NUMERIC(10,2) DEFAULT 0;

-- Also add other missing columns that the frontend uses but schema lacked
ALTER TABLE services ADD COLUMN IF NOT EXISTS type TEXT NOT NULL DEFAULT 'service';
ALTER TABLE services ADD COLUMN IF NOT EXISTS unidade_medida TEXT DEFAULT 'unidade';
ALTER TABLE services ADD COLUMN IF NOT EXISTS quantidade_estoque INTEGER DEFAULT 0;
ALTER TABLE services ADD COLUMN IF NOT EXISTS desconto NUMERIC(5,2) DEFAULT 0;
ALTER TABLE services ADD COLUMN IF NOT EXISTS comissao NUMERIC(5,2) DEFAULT 0;
