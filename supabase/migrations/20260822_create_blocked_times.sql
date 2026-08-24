CREATE TABLE IF NOT EXISTS blocked_times (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  date TEXT NOT NULL,
  start_time TEXT NOT NULL,
  end_time TEXT NOT NULL,
  description TEXT,
  block_all_barbers BOOLEAN DEFAULT false,
  recurrence_type TEXT DEFAULT 'none' CHECK (recurrence_type IN ('none', 'weekly', 'daily', 'period')),
  recurrence_day_of_week INTEGER,
  period_start_date TEXT,
  period_end_date TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_blocked_times_company_id ON blocked_times(company_id);
CREATE INDEX idx_blocked_times_date ON blocked_times(date);
CREATE INDEX idx_blocked_times_company_date ON blocked_times(company_id, date);

ALTER TABLE blocked_times ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view blocked times for their companies" ON blocked_times
  FOR SELECT USING (
    company_id IN (
      SELECT company_id FROM user_companies WHERE user_id = auth.uid()
    )
    OR company_id IN (
      SELECT id FROM companies WHERE owner_email = (
        SELECT email FROM auth.users WHERE id = auth.uid()
      )
    )
  );

CREATE POLICY "Admins can insert blocked times" ON blocked_times
  FOR INSERT WITH CHECK (
    company_id IN (
      SELECT company_id FROM user_companies WHERE user_id = auth.uid()
    )
    OR company_id IN (
      SELECT id FROM companies WHERE owner_email = (
        SELECT email FROM auth.users WHERE id = auth.uid()
      )
    )
  );

CREATE POLICY "Admins can update blocked times" ON blocked_times
  FOR UPDATE USING (
    company_id IN (
      SELECT company_id FROM user_companies WHERE user_id = auth.uid()
    )
    OR company_id IN (
      SELECT id FROM companies WHERE owner_email = (
        SELECT email FROM auth.users WHERE id = auth.uid()
      )
    )
  );

CREATE POLICY "Admins can delete blocked times" ON blocked_times
  FOR DELETE USING (
    company_id IN (
      SELECT company_id FROM user_companies WHERE user_id = auth.uid()
    )
    OR company_id IN (
      SELECT id FROM companies WHERE owner_email = (
        SELECT email FROM auth.users WHERE id = auth.uid()
      )
    )
  );
