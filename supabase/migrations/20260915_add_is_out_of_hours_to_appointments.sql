ALTER TABLE appointments ADD COLUMN IF NOT EXISTS is_out_of_hours BOOLEAN DEFAULT false;
