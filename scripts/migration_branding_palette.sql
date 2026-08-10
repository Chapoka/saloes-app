-- Migração: Adicionar accent, background e palette ao branding das empresas
ALTER TABLE companies ADD COLUMN IF NOT EXISTS branding_accent_color TEXT DEFAULT '#1e293b';
ALTER TABLE companies ADD COLUMN IF NOT EXISTS branding_background_color TEXT DEFAULT '#f8fafc';
ALTER TABLE companies ADD COLUMN IF NOT EXISTS branding_palette TEXT DEFAULT 'barbearia';
