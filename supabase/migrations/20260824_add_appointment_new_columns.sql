-- Add service_id and product_id to appointments table
ALTER TABLE appointments ADD COLUMN IF NOT EXISTS service_id UUID REFERENCES services(id);
ALTER TABLE appointments ADD COLUMN IF NOT EXISTS product_id UUID REFERENCES services(id);
ALTER TABLE appointments ADD COLUMN IF NOT EXISTS professional_id UUID REFERENCES users(id);
