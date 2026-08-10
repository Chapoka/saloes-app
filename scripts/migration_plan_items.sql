-- Migration: Criar tabela plan_items (itens do plano estilo nota fiscal)
-- Data: 2026-08-05

CREATE TABLE IF NOT EXISTS plan_items (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  plan_id UUID NOT NULL REFERENCES plans(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  item_type TEXT NOT NULL CHECK (item_type IN ('service', 'product', 'combo')),
  price NUMERIC(10,2) NOT NULL DEFAULT 0,
  discount NUMERIC(10,2) NOT NULL DEFAULT 0,
  commission NUMERIC(5,2) NOT NULL DEFAULT 0,
  quantity INTEGER NOT NULL DEFAULT 1,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Índice para buscas por plano
CREATE INDEX IF NOT EXISTS idx_plan_items_plan_id ON plan_items(plan_id);

-- RLS permissivo (mesmo padrão do plan_services)
ALTER TABLE plan_items ENABLE ROW LEVEL SECURITY;
CREATE POLICY "plan_items_permissive" ON plan_items USING (true);
