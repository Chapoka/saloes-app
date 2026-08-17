-- Ensure all columns used by the frontend exist in the companies table
-- PGRST204 occurs when PostgREST receives a column not defined in the table schema

ALTER TABLE companies ADD COLUMN IF NOT EXISTS owner_cpf TEXT;
ALTER TABLE companies ADD COLUMN IF NOT EXISTS branding_accent_color TEXT;
ALTER TABLE companies ADD COLUMN IF NOT EXISTS branding_background_color TEXT;
ALTER TABLE companies ADD COLUMN IF NOT EXISTS branding_palette TEXT;
ALTER TABLE companies ADD COLUMN IF NOT EXISTS branding_app_name TEXT;
ALTER TABLE companies ADD COLUMN IF NOT EXISTS branding_logo_url TEXT;
