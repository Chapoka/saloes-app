-- Tabela de níveis de profissionais
-- Cada salão define seus próprios níveis (Júnior, Sênior, Master, etc.)
CREATE TABLE IF NOT EXISTS stylist_levels (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  company_id UUID REFERENCES companies(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  slug TEXT NOT NULL,
  multiplier NUMERIC(4,2) NOT NULL DEFAULT 1.00,
  color TEXT DEFAULT '#6366f1',
  sort_order INTEGER DEFAULT 0,
  active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ
);

-- Campo de nível na tabela de usuários
ALTER TABLE users ADD COLUMN IF NOT EXISTS stylist_level_id UUID REFERENCES stylist_levels(id) ON DELETE SET NULL;

-- Índices
CREATE INDEX IF NOT EXISTS idx_stylist_levels_company ON stylist_levels(company_id);
CREATE INDEX IF NOT EXISTS idx_users_stylist_level ON users(stylist_level_id);

-- Habilitar RLS
ALTER TABLE stylist_levels ENABLE ROW LEVEL SECURITY;

-- Policies
CREATE POLICY "Stylist levels per company" ON stylist_levels FOR ALL USING (true);
