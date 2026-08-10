-- Campo de gorjeta na tabela lessons
ALTER TABLE lessons ADD COLUMN IF NOT EXISTS tip_amount NUMERIC(10,2) DEFAULT 0;
ALTER TABLE lessons ADD COLUMN IF NOT EXISTS tip_payment_method TEXT DEFAULT 'cash';

-- Tabela de relatório de gorjetas (para consultas rápidas no dashboard)
CREATE TABLE IF NOT EXISTS tips_summary (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  company_id UUID REFERENCES companies(id) ON DELETE CASCADE,
  stylist_user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  lesson_id UUID REFERENCES lessons(id) ON DELETE CASCADE,
  student_id UUID REFERENCES students(id) ON DELETE SET NULL,
  amount NUMERIC(10,2) NOT NULL,
  payment_method TEXT DEFAULT 'cash',
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_tips_summary_company ON tips_summary(company_id);
CREATE INDEX IF NOT EXISTS idx_tips_summary_stylist ON tips_summary(stylist_user_id);
CREATE INDEX IF NOT EXISTS idx_tips_summary_date ON tips_summary(created_at);

ALTER TABLE tips_summary ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Tips summary per company" ON tips_summary FOR ALL USING (true);
