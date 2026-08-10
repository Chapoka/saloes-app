-- Adicionar colunas company_id e company_ids na tabela users
ALTER TABLE users ADD COLUMN IF NOT EXISTS company_id UUID REFERENCES companies(id) ON DELETE SET NULL;
ALTER TABLE users ADD COLUMN IF NOT EXISTS company_ids UUID[] DEFAULT '{}';
