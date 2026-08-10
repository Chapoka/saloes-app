-- Tabela de serviços do catálogo
-- Cada salão/barbearia define seus próprios serviços
CREATE TABLE IF NOT EXISTS services (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  company_id UUID REFERENCES companies(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  category TEXT NOT NULL DEFAULT 'corte',
  duration_mins INTEGER NOT NULL DEFAULT 30,
  price NUMERIC(10,2) NOT NULL DEFAULT 0,
  description TEXT,
  active BOOLEAN DEFAULT true,
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ
);

-- Índices
CREATE INDEX IF NOT EXISTS idx_services_company ON services(company_id);
CREATE INDEX IF NOT EXISTS idx_services_category ON services(category);
CREATE INDEX IF NOT EXISTS idx_services_active ON services(active);

-- Tabela de combos (pacotes de serviços com desconto)
CREATE TABLE IF NOT EXISTS service_combos (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  company_id UUID REFERENCES companies(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  combo_price NUMERIC(10,2) NOT NULL,
  description TEXT,
  active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ
);

-- Itens do combo (quais serviços fazem parte)
CREATE TABLE IF NOT EXISTS service_combo_items (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  combo_id UUID REFERENCES service_combos(id) ON DELETE CASCADE,
  service_id UUID REFERENCES services(id) ON DELETE CASCADE,
  quantity INTEGER DEFAULT 1,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_combos_company ON service_combos(company_id);
CREATE INDEX IF NOT EXISTS idx_combo_items_combo ON service_combo_items(combo_id);

-- Habilitar RLS
ALTER TABLE services ENABLE ROW LEVEL SECURITY;
ALTER TABLE service_combos ENABLE ROW LEVEL SECURITY;
ALTER TABLE service_combo_items ENABLE ROW LEVEL SECURITY;

-- Policies (acesso por company_id)
CREATE POLICY "Services per company" ON services FOR ALL USING (true);
CREATE POLICY "Combos per company" ON service_combos FOR ALL USING (true);
CREATE POLICY "Combo items per company" ON service_combo_items FOR ALL USING (true);
