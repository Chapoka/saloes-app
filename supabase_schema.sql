-- ============================================
-- Supabase Schema para Salon Management
-- ============================================

-- Extensões
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ============================================
-- 1. COMPANIES
-- ============================================
CREATE TABLE companies (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  cnpj TEXT,
  tipo TEXT CHECK (tipo IN ('MATRIZ', 'FILIAL')),
  estabelecimento_tipo TEXT CHECK (estabelecimento_tipo IN ('barbearia', 'salao_beleza')),
  razao_social TEXT,
  situacao_cadastral TEXT,
  data_abertura DATE,
  capital_social NUMERIC(12, 2),
  porte TEXT,
  cnae_principal TEXT,
  natureza_juridica TEXT,
  cep TEXT,
  uf TEXT,
  cidade TEXT,
  bairro TEXT,
  logradouro TEXT,
  numero TEXT,
  complemento TEXT,
  phone TEXT,
  email TEXT,
  active BOOLEAN DEFAULT true,
  owner_email TEXT,
  owner_name TEXT,
  owner_phone TEXT,
  has_branch BOOLEAN DEFAULT false,
  branding_app_name TEXT,
  branding_logo_url TEXT,
  branding_primary_color TEXT DEFAULT '#0077b6',
  branding_secondary_color TEXT DEFAULT '#2a9d8f',
  branding_accent_color TEXT DEFAULT '#1e293b',
  branding_background_color TEXT DEFAULT '#f8fafc',
  branding_palette TEXT DEFAULT 'barbearia',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ
);

-- ============================================
-- 2. COMPANY INTEGRATIONS (1:1 com companies)
-- ============================================
CREATE TABLE company_integrations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  company_id UUID UNIQUE NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  asaas_api_key TEXT,
  asaas_environment TEXT DEFAULT 'sandbox' CHECK (asaas_environment IN ('sandbox', 'production')),
  asaas_subaccount_id TEXT,
  asaas_subaccount_wallet_id TEXT,
  whatsapp_provider TEXT DEFAULT 'meta' CHECK (whatsapp_provider IN ('waha', 'evolution', 'meta')),
  whatsapp_api_url TEXT,
  whatsapp_api_token TEXT,
  whatsapp_phone TEXT,
  whatsapp_webhook_url TEXT,
  whatsapp_instance TEXT,
  whatsapp_connected BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ
);

-- ============================================
-- 3. USERS (vincula com auth.users do Supabase)
-- ============================================
CREATE TABLE users (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name TEXT,
  email TEXT,
  cpf TEXT,
  rg TEXT,
  birth_date DATE,
  role TEXT DEFAULT 'cliente' CHECK (role IN ('super_admin', 'admin', 'profissional', 'cliente')),
  active BOOLEAN DEFAULT true,
  temp_password TEXT,
  must_change_password BOOLEAN DEFAULT false,
  company_id UUID REFERENCES companies(id) ON DELETE SET NULL,
  company_ids UUID[] DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ
);

-- Trigger para criar registro automaticamente ao criar auth.user
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.users (id, full_name, email, role)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email),
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'role', 'cliente')
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ============================================
-- 4. USER COMPANIES (N:N)
-- ============================================
CREATE TABLE user_companies (
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT now(),
  PRIMARY KEY (user_id, company_id)
);

-- ============================================
-- 5. PLANS
-- ============================================
CREATE TABLE plans (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  modality TEXT NOT NULL,
  duration_mins INTEGER NOT NULL CHECK (duration_mins IN (30, 60, 90)),
  price NUMERIC(10, 2) NOT NULL,
  session_count INTEGER DEFAULT 4,
  active BOOLEAN DEFAULT true,
  company_id UUID REFERENCES companies(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ
);

-- ============================================
-- 6. CUSTOMERS
-- ============================================
CREATE TABLE customers (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  cpf TEXT,
  rg TEXT,
  email TEXT,
  whatsapp TEXT,
  address_street TEXT,
  address_number TEXT,
  address_complement TEXT,
  address_neighborhood TEXT,
  address_city TEXT,
  address_state TEXT,
  address_zipcode TEXT,
  birth_date DATE,
  medical_certificate_url TEXT,
  plan_id UUID REFERENCES plans(id) ON DELETE SET NULL,
  custom_plan JSONB,
  current_credits NUMERIC(10, 2) DEFAULT 0,
  access_token TEXT,
  asaas_customer_id TEXT,
  asaas_subscription_id TEXT,
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'pending', 'cancelled')),
  notes TEXT,
  teacher_id UUID REFERENCES users(id) ON DELETE SET NULL,
  guardian_id UUID REFERENCES customers(id) ON DELETE SET NULL,
  billing_mode TEXT DEFAULT 'individual' CHECK (billing_mode IN ('individual', 'consolidated')),
  portal_enabled BOOLEAN DEFAULT true,
  company_id UUID REFERENCES companies(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ
);

-- ============================================
-- 7. CUSTOMER COMPANIES (N:N)
-- ============================================
CREATE TABLE customer_companies (
  customer_id UUID NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT now(),
  PRIMARY KEY (customer_id, company_id)
);

-- ============================================
-- 8. APPOINTMENTS (agendamentos)
-- ============================================
CREATE TABLE appointments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  customer_id UUID NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
  customer_name TEXT,
  plan_id UUID REFERENCES plans(id) ON DELETE SET NULL,
  date DATE NOT NULL,
  start_time TIME NOT NULL,
  end_time TIME,
  duration_mins INTEGER NOT NULL CHECK (duration_mins IN (30, 60, 90)),
  service_category TEXT CHECK (service_category IN ('corte', 'barba', 'coloracao', 'tratamento', 'manicure', 'pedicure', 'sobrancelha', 'outro')),
  status TEXT DEFAULT 'scheduled' CHECK (status IN ('scheduled', 'confirmed', 'present', 'absent', 'cancelled', 'trial', 'makeup')),
  appointment_type TEXT CHECK (appointment_type IN ('plan', 'trial', 'makeup')),
  cancellation_reason TEXT,
  service_performed BOOLEAN DEFAULT false,
  notes TEXT,
  rescheduled BOOLEAN DEFAULT false,
  rescheduled_appointment_id UUID REFERENCES appointments(id) ON DELETE SET NULL,
  original_appointment_id UUID REFERENCES appointments(id) ON DELETE SET NULL,
  company_id UUID REFERENCES companies(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ
);

-- ============================================
-- 9. INVOICES
-- ============================================
CREATE TABLE invoices (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  customer_id UUID NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
  customer_name TEXT,
  asaas_id TEXT,
  asaas_url TEXT,
  plan_id UUID REFERENCES plans(id) ON DELETE SET NULL,
  plan_name TEXT,
  value NUMERIC(10, 2) NOT NULL,
  due_date DATE,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'received', 'overdue', 'cancelled')),
  payment_date DATE,
  company_id UUID REFERENCES companies(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ
);

-- ============================================
-- 10. MODALITIES
-- ============================================
CREATE TABLE modalities (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ
);

-- ============================================
-- 11. TEMPLATES
-- ============================================
CREATE TABLE templates (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  trigger TEXT NOT NULL CHECK (trigger IN ('welcome', 'payment_link', 'service_confirmation', 'low_credits', 'monthly_billing', 'service_cancelled')),
  message TEXT NOT NULL,
  enabled BOOLEAN DEFAULT true,
  send_before_hours INTEGER,
  company_id UUID REFERENCES companies(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ
);

-- ============================================
-- 12. SETTINGS
-- ============================================
CREATE TABLE settings (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  key TEXT NOT NULL,
  value TEXT NOT NULL,
  description TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ
);

-- ============================================
-- 13. AUDIT LOGS
-- ============================================
CREATE TABLE audit_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  action TEXT NOT NULL CHECK (action IN ('create', 'update', 'delete')),
  entity_type TEXT NOT NULL,
  entity_id TEXT,
  category TEXT CHECK (category IN ('financial', 'schedule', 'students', 'system')),
  description TEXT NOT NULL,
  user_name TEXT,
  user_email TEXT,
  ip_address TEXT,
  metadata JSONB,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- ============================================
-- 14. WAITING LIST
-- ============================================
CREATE TABLE waiting_list (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  customer_name TEXT NOT NULL,
  whatsapp TEXT,
  email TEXT,
  modality TEXT NOT NULL CHECK (modality IN ('corte', 'barba', 'coloracao', 'tratamento', 'outro')),
  duration_mins INTEGER CHECK (duration_mins IN (30, 60, 90)),
  preferred_days JSONB,
  priority TEXT DEFAULT 'normal' CHECK (priority IN ('normal', 'urgent', 'flexible')),
  notes TEXT,
  status TEXT DEFAULT 'waiting' CHECK (status IN ('waiting', 'contacted', 'scheduled', 'cancelled')),
  company_id UUID REFERENCES companies(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ
);

-- ============================================
-- ÍNDICES
-- ============================================
CREATE INDEX idx_customers_company_id ON customers(company_id);
CREATE INDEX idx_customers_plan_id ON customers(plan_id);
CREATE INDEX idx_customers_guardian_id ON customers(guardian_id);
CREATE INDEX idx_customers_status ON customers(status);
CREATE INDEX idx_customers_email ON customers(email);

CREATE INDEX idx_appointments_customer_id ON appointments(customer_id);
CREATE INDEX idx_appointments_date ON appointments(date);
CREATE INDEX idx_appointments_company_id ON appointments(company_id);
CREATE INDEX idx_appointments_status ON appointments(status);

CREATE INDEX idx_invoices_customer_id ON invoices(customer_id);
CREATE INDEX idx_invoices_company_id ON invoices(company_id);
CREATE INDEX idx_invoices_status ON invoices(status);
CREATE INDEX idx_invoices_due_date ON invoices(due_date);

CREATE INDEX idx_plans_company_id ON plans(company_id);

CREATE INDEX idx_templates_company_id ON templates(company_id);
CREATE INDEX idx_templates_trigger ON templates(trigger);

CREATE INDEX idx_audit_logs_entity_type ON audit_logs(entity_type);
CREATE INDEX idx_audit_logs_category ON audit_logs(category);
CREATE INDEX idx_audit_logs_created_at ON audit_logs(created_at);

CREATE INDEX idx_user_companies_user_id ON user_companies(user_id);
CREATE INDEX idx_user_companies_company_id ON user_companies(company_id);

CREATE INDEX idx_customer_companies_customer_id ON customer_companies(customer_id);
CREATE INDEX idx_customer_companies_company_id ON customer_companies(company_id);

CREATE INDEX idx_waiting_list_status ON waiting_list(status);

-- ============================================
-- FUNÇÃO PARA ATUALIZAR updated_at
-- ============================================
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DO $$
DECLARE
  t TEXT;
BEGIN
  FOR t IN
    SELECT table_name FROM information_schema.columns
    WHERE column_name = 'updated_at' AND table_schema = 'public'
  LOOP
    EXECUTE format(
      'CREATE TRIGGER set_updated_at BEFORE UPDATE ON %I FOR EACH ROW EXECUTE FUNCTION update_updated_at()',
      t
    );
  END LOOP;
END;
$$ LANGUAGE plpgsql;

-- ============================================
-- ROW LEVEL SECURITY (RLS)
-- ============================================
-- Habilitar RLS em todas as tabelas
DO $$
DECLARE
  t TEXT;
BEGIN
  FOR t IN
    SELECT table_name FROM information_schema.tables
    WHERE table_schema = 'public' AND table_type = 'BASE TABLE'
  LOOP
    EXECUTE format('ALTER TABLE %I ENABLE ROW LEVEL SECURITY', t);
  END LOOP;
END;
$$ LANGUAGE plpgsql;

-- Drop old policies if they exist (fixes 400 errors from deprecated auth.role())
DO $$
DECLARE
  t TEXT;
BEGIN
  FOR t IN
    SELECT table_name FROM information_schema.tables
    WHERE table_schema = 'public' AND table_type = 'BASE TABLE'
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS "authenticated_read_all" ON %I', t);
    EXECUTE format('DROP POLICY IF EXISTS "authenticated_insert_all" ON %I', t);
    EXECUTE format('DROP POLICY IF EXISTS "authenticated_update_all" ON %I', t);
    EXECUTE format('DROP POLICY IF EXISTS "authenticated_delete_all" ON %I', t);
  END LOOP;
END;
$$ LANGUAGE plpgsql;

-- Política base: usuários autenticados podem ler tudo (using auth.uid() instead of deprecated auth.role())
DO $$
DECLARE
  t TEXT;
BEGIN
  FOR t IN
    SELECT table_name FROM information_schema.tables
    WHERE table_schema = 'public' AND table_type = 'BASE TABLE'
      AND table_name NOT IN ('users')
  LOOP
    EXECUTE format(
      'CREATE POLICY "authenticated_read_all" ON %I FOR SELECT USING (auth.uid() IS NOT NULL)',
      t
    );
    EXECUTE format(
      'CREATE POLICY "authenticated_insert_all" ON %I FOR INSERT WITH CHECK (auth.uid() IS NOT NULL)',
      t
    );
    EXECUTE format(
      'CREATE POLICY "authenticated_update_all" ON %I FOR UPDATE USING (auth.uid() IS NOT NULL)',
      t
    );
    EXECUTE format(
      'CREATE POLICY "authenticated_delete_all" ON %I FOR DELETE USING (auth.uid() IS NOT NULL)',
      t
    );
  END LOOP;
END;
$$ LANGUAGE plpgsql;

-- Função is_super_admin (evita recursão nas RLS policies)
CREATE OR REPLACE FUNCTION public.is_super_admin()
RETURNS BOOLEAN
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.users
    WHERE id = auth.uid() AND role = 'super_admin'
  );
END;
$$ LANGUAGE plpgsql;

-- Função para super_admin redefinir senha de qualquer usuário no auth.users
CREATE OR REPLACE FUNCTION public.admin_reset_user_password(user_id uuid, new_password text)
RETURNS void
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT public.is_super_admin() THEN
    RAISE EXCEPTION 'Permission denied';
  END IF;

  UPDATE auth.users
  SET encrypted_password = crypt(new_password, gen_salt('bf')),
      email_confirmed_at = now(),
      confirmed_at = now(),
      updated_at = now()
  WHERE id = user_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'User not found in auth.users';
  END IF;
END;
$$ LANGUAGE plpgsql;

-- Política específica para users: apenas o próprio usuário ou super_admin pode ver/editar
CREATE POLICY "users_read_own" ON users
  FOR SELECT USING (auth.uid() = id OR public.is_super_admin());

CREATE POLICY "users_update_own" ON users
  FOR UPDATE USING (auth.uid() = id OR public.is_super_admin())
  WITH CHECK (auth.uid() = id OR public.is_super_admin());

-- Apenas o próprio usuário pode se deletar (master só deletado por ele mesmo)
CREATE POLICY "users_delete_own" ON users
  FOR DELETE USING (auth.uid() = id);

-- ============================================
-- COLUNAS ADICIONAIS (migrações)
-- ============================================

-- Gorjetas nos agendamentos
ALTER TABLE appointments ADD COLUMN IF NOT EXISTS tip_amount NUMERIC(10,2) DEFAULT 0;
ALTER TABLE appointments ADD COLUMN IF NOT EXISTS tip_payment_method TEXT DEFAULT 'cash';

-- Nível do profissional
ALTER TABLE users ADD COLUMN IF NOT EXISTS stylist_level_id UUID REFERENCES stylist_levels(id) ON DELETE SET NULL;

-- CPF do proprietário
ALTER TABLE companies ADD COLUMN IF NOT EXISTS owner_cpf TEXT;

-- ============================================
-- 10. SERVICES (catálogo de serviços)
-- ============================================
CREATE TABLE IF NOT EXISTS services (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  company_id UUID REFERENCES companies(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  type TEXT NOT NULL DEFAULT 'service',
  category TEXT NOT NULL DEFAULT 'corte',
  duration_mins INTEGER NOT NULL DEFAULT 30,
  price NUMERIC(10,2) NOT NULL DEFAULT 0,
  preco_custo NUMERIC(10,2) DEFAULT 0,
  description TEXT,
  active BOOLEAN DEFAULT true,
  unidade_medida TEXT DEFAULT 'unidade',
  quantidade_estoque INTEGER DEFAULT 0,
  desconto NUMERIC(5,2) DEFAULT 0,
  comissao NUMERIC(5,2) DEFAULT 0,
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_services_company ON services(company_id);
ALTER TABLE services ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Services per company" ON services FOR ALL USING (true);

-- ============================================
-- 11. SERVICE COMBOS
-- ============================================
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

CREATE TABLE IF NOT EXISTS service_combo_items (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  combo_id UUID REFERENCES service_combos(id) ON DELETE CASCADE,
  service_id UUID REFERENCES services(id) ON DELETE CASCADE,
  quantity INTEGER DEFAULT 1,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_combos_company ON service_combos(company_id);
ALTER TABLE service_combos ENABLE ROW LEVEL SECURITY;
ALTER TABLE service_combo_items ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Combos per company" ON service_combos FOR ALL USING (true);
CREATE POLICY "Combo items per company" ON service_combo_items FOR ALL USING (true);

-- ============================================
-- 12. STYLIST LEVELS (níveis de profissionais)
-- ============================================
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

CREATE INDEX IF NOT EXISTS idx_stylist_levels_company ON stylist_levels(company_id);
ALTER TABLE stylist_levels ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Stylist levels per company" ON stylist_levels FOR ALL USING (true);

-- ============================================
-- 13. PUNCH CARDS (cartões pré-pagos)
-- ============================================
CREATE TABLE IF NOT EXISTS punch_cards (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  customer_id UUID REFERENCES customers(id) ON DELETE CASCADE,
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

CREATE INDEX IF NOT EXISTS idx_punch_cards_customer ON punch_cards(customer_id);
CREATE INDEX IF NOT EXISTS idx_punch_cards_company ON punch_cards(company_id);
ALTER TABLE punch_cards ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Punch cards per company" ON punch_cards FOR ALL USING (true);

-- ============================================
-- STORAGE BUCKETS
-- ============================================
INSERT INTO storage.buckets (id, name, public) VALUES
  ('company_assets', 'company_assets', true),
  ('customer_documents', 'customer_documents', true)
ON CONFLICT (id) DO NOTHING;

-- ============================================
-- CONFIGURAÇÕES INICIAIS
-- ============================================
INSERT INTO settings (key, value, description) VALUES
  ('app_name', 'Salon Management', 'Nome do sistema'),
  ('login_title', 'Salon Management', 'Título da tela de login'),
  ('login_subtitle', 'Sistema de Gestão', 'Subtítulo da tela de login')
ON CONFLICT DO NOTHING;
