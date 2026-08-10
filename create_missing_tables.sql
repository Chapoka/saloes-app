-- ============================================
-- TABELAS FALTANTES NO SUPABASE
-- Rode este SQL no Supabase SQL Editor
-- ============================================

-- 1. SERVICES (Serviços)
CREATE TABLE IF NOT EXISTS services (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid REFERENCES companies(id) ON DELETE CASCADE,
  name text NOT NULL,
  category text,
  duration_mins int DEFAULT 30,
  price numeric DEFAULT 0,
  description text,
  active boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_services_company ON services(company_id);

ALTER TABLE services ENABLE ROW LEVEL SECURITY;

-- 2. SERVICE COMBOS (Combos de serviços)
CREATE TABLE IF NOT EXISTS service_combos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid REFERENCES companies(id) ON DELETE CASCADE,
  name text NOT NULL,
  combo_price numeric DEFAULT 0,
  description text,
  active boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_service_combos_company ON service_combos(company_id);

ALTER TABLE service_combos ENABLE ROW LEVEL SECURITY;

-- 3. SERVICE COMBO ITEMS (Itens do combo)
CREATE TABLE IF NOT EXISTS service_combo_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  combo_id uuid REFERENCES service_combos(id) ON DELETE CASCADE,
  service_id uuid REFERENCES services(id) ON DELETE CASCADE,
  quantity int DEFAULT 1,
  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_service_combo_items_combo ON service_combo_items(combo_id);
CREATE INDEX IF NOT EXISTS idx_service_combo_items_service ON service_combo_items(service_id);

ALTER TABLE service_combo_items ENABLE ROW LEVEL SECURITY;

-- 4. STYLIST LEVELS (Níveis de profissional)
CREATE TABLE IF NOT EXISTS stylist_levels (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid REFERENCES companies(id) ON DELETE CASCADE,
  name text NOT NULL,
  slug text,
  multiplier numeric DEFAULT 1.0,
  color text DEFAULT '#6366f1',
  sort_order int DEFAULT 0,
  active boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_stylist_levels_company ON stylist_levels(company_id);

ALTER TABLE stylist_levels ENABLE ROW LEVEL SECURITY;

-- 5. PUNCH CARDS (Cartões pré-pagos)
CREATE TABLE IF NOT EXISTS punch_cards (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid REFERENCES companies(id) ON DELETE CASCADE,
  student_id uuid REFERENCES customers(id) ON DELETE CASCADE,
  service_id uuid REFERENCES services(id) ON DELETE SET NULL,
  name text DEFAULT 'Punch Card',
  total_services int DEFAULT 10,
  used_services int DEFAULT 0,
  price_paid numeric DEFAULT 0,
  price_per_service numeric DEFAULT 0,
  service_category text,
  expires_at timestamptz,
  active boolean DEFAULT true,
  notes text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_punch_cards_company ON punch_cards(company_id);
CREATE INDEX IF NOT EXISTS idx_punch_cards_student ON punch_cards(student_id);

ALTER TABLE punch_cards ENABLE ROW LEVEL SECURITY;

-- ============================================
-- RLS POLICIES (drop if exists, then create)
-- ============================================

-- Services
DROP POLICY IF EXISTS "Users can view services of their companies" ON services;
DROP POLICY IF EXISTS "Admins can manage services" ON services;
CREATE POLICY "Users can view services of their companies" ON services
  FOR SELECT USING (
    company_id IN (
      SELECT company_id FROM user_companies WHERE user_id = auth.uid()
    )
  );
CREATE POLICY "Admins can manage services" ON services
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM users WHERE id = auth.uid() AND role IN ('super_admin', 'admin')
    )
  );

-- Service Combos
DROP POLICY IF EXISTS "Users can view combos of their companies" ON service_combos;
DROP POLICY IF EXISTS "Admins can manage combos" ON service_combos;
CREATE POLICY "Users can view combos of their companies" ON service_combos
  FOR SELECT USING (
    company_id IN (
      SELECT company_id FROM user_companies WHERE user_id = auth.uid()
    )
  );
CREATE POLICY "Admins can manage combos" ON service_combos
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM users WHERE id = auth.uid() AND role IN ('super_admin', 'admin')
    )
  );

-- Service Combo Items
DROP POLICY IF EXISTS "Users can view combo items" ON service_combo_items;
DROP POLICY IF EXISTS "Admins can manage combo items" ON service_combo_items;
CREATE POLICY "Users can view combo items" ON service_combo_items
  FOR SELECT USING (
    combo_id IN (
      SELECT id FROM service_combos WHERE company_id IN (
        SELECT company_id FROM user_companies WHERE user_id = auth.uid()
      )
    )
  );
CREATE POLICY "Admins can manage combo items" ON service_combo_items
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM users WHERE id = auth.uid() AND role IN ('super_admin', 'admin')
    )
  );

-- Stylist Levels
DROP POLICY IF EXISTS "Users can view levels of their companies" ON stylist_levels;
DROP POLICY IF EXISTS "Admins can manage levels" ON stylist_levels;
CREATE POLICY "Users can view levels of their companies" ON stylist_levels
  FOR SELECT USING (
    company_id IN (
      SELECT company_id FROM user_companies WHERE user_id = auth.uid()
    )
  );
CREATE POLICY "Admins can manage levels" ON stylist_levels
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM users WHERE id = auth.uid() AND role IN ('super_admin', 'admin')
    )
  );

-- Punch Cards
DROP POLICY IF EXISTS "Users can view punch cards of their companies" ON punch_cards;
DROP POLICY IF EXISTS "Admins can manage punch cards" ON punch_cards;
CREATE POLICY "Users can view punch cards of their companies" ON punch_cards
  FOR SELECT USING (
    company_id IN (
      SELECT company_id FROM user_companies WHERE user_id = auth.uid()
    )
  );
CREATE POLICY "Admins can manage punch cards" ON punch_cards
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM users WHERE id = auth.uid() AND role IN ('super_admin', 'admin')
    )
  );