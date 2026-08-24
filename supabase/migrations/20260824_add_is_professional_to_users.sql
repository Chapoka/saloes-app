-- Add is_professional flag to users table
-- Allows any user (admin, super_admin, etc.) to also function as a professional
ALTER TABLE users ADD COLUMN IF NOT EXISTS is_professional BOOLEAN DEFAULT false;

-- Auto-set is_professional for users with role = 'profissional'
UPDATE users SET is_professional = true WHERE role = 'profissional' AND is_professional = false;
