-- Add professional profile columns to users table
ALTER TABLE users ADD COLUMN IF NOT EXISTS phone TEXT;
ALTER TABLE users ADD COLUMN IF NOT EXISTS photo_url TEXT;
ALTER TABLE users ADD COLUMN IF NOT EXISTS specialty TEXT;
ALTER TABLE users ADD COLUMN IF NOT EXISTS commission_pct NUMERIC DEFAULT 0;
ALTER TABLE users ADD COLUMN IF NOT EXISTS work_days TEXT[] DEFAULT ARRAY['seg','ter','qua','qui','sex','sab'];
