-- ============================================
-- Migration: plan_services (N:N entre plans e services)
-- ============================================

CREATE TABLE IF NOT EXISTS plan_services (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  plan_id UUID NOT NULL REFERENCES plans(id) ON DELETE CASCADE,
  service_id UUID NOT NULL REFERENCES services(id) ON DELETE CASCADE,
  quantity INTEGER NOT NULL DEFAULT 1,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(plan_id, service_id)
);

CREATE INDEX IF NOT EXISTS idx_plan_services_plan ON plan_services(plan_id);
CREATE INDEX IF NOT EXISTS idx_plan_services_service ON plan_services(service_id);

ALTER TABLE plan_services ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Plan services per company" ON plan_services FOR ALL USING (true);
