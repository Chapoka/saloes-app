-- Tabela de punch cards (cartões pré-pagos)
CREATE TABLE IF NOT EXISTS punch_cards (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  student_id UUID REFERENCES students(id) ON DELETE CASCADE,
  company_id UUID REFERENCES companies(id) ON DELETE CASCADE,
  service_id UUID REFERENCES services(id) ON DELETE SET NULL,
  service_category TEXT,
  total_services INTEGER NOT NULL DEFAULT 1,
  used_services INTEGER NOT NULL DEFAULT 0,
  remaining_services INTEGER GENERATED ALWAYS AS (total_services - used_services) STORED,
  price_paid NUMERIC(10,2) NOT NULL DEFAULT 0,
  price_per_service NUMERIC(10,2) GENERATED ALWAYS AS (NULLIF(total_services, 0)) STORED,
  name TEXT NOT NULL DEFAULT 'Punch Card',
  notes TEXT,
  expires_at DATE,
  active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ
);

-- Índices
CREATE INDEX IF NOT EXISTS idx_punch_cards_student ON punch_cards(student_id);
CREATE INDEX IF NOT EXISTS idx_punch_cards_company ON punch_cards(company_id);
CREATE INDEX IF NOT EXISTS idx_punch_cards_active ON punch_cards(active);

-- Habilitar RLS
ALTER TABLE punch_cards ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Punch cards per company" ON punch_cards FOR ALL USING (true);
