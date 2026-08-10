-- =============================================
-- RENAME lessons -> appointments (salão context)
-- =============================================

-- 1. Rename table
ALTER TABLE IF EXISTS lessons RENAME TO appointments;

-- 2. Rename columns
ALTER TABLE appointments RENAME COLUMN lesson_type TO appointment_type;
ALTER TABLE appointments RENAME COLUMN modality TO service_category;
ALTER TABLE appointments RENAME COLUMN credit_consumed TO service_performed;
ALTER TABLE appointments RENAME COLUMN rescheduled_lesson_id TO rescheduled_appointment_id;
ALTER TABLE appointments RENAME COLUMN original_lesson_id TO original_appointment_id;

-- 3. Update CHECK constraints
ALTER TABLE appointments DROP CONSTRAINT IF EXISTS lessons_modality_check;
ALTER TABLE appointments ADD CONSTRAINT appointments_service_category_check
  CHECK (service_category IN ('corte', 'barba', 'coloracao', 'tratamento', 'manicure', 'pedicure', 'sobrancelha', 'outro'));

ALTER TABLE appointments DROP CONSTRAINT IF EXISTS lessons_lesson_type_check;
ALTER TABLE appointments ADD CONSTRAINT appointments_type_check
  CHECK (appointment_type IN ('plan', 'trial', 'makeup'));

ALTER TABLE appointments DROP CONSTRAINT IF EXISTS lessons_status_check;
ALTER TABLE appointments ADD CONSTRAINT appointments_status_check
  CHECK (status IN ('scheduled', 'confirmed', 'present', 'absent', 'cancelled', 'trial', 'makeup'));

-- 4. Rename indexes
ALTER INDEX IF EXISTS idx_lessons_customer_id RENAME TO idx_appointments_customer_id;
ALTER INDEX IF EXISTS idx_lessons_date RENAME TO idx_appointments_date;
ALTER INDEX IF EXISTS idx_lessons_company_id RENAME TO idx_appointments_company_id;
ALTER INDEX IF EXISTS idx_lessons_status RENAME TO idx_appointments_status;

-- 5. Rename plan column
ALTER TABLE plans DROP CONSTRAINT IF EXISTS plans_duration_mins_check;
ALTER TABLE plans ADD CONSTRAINT plans_duration_mins_check CHECK (duration_mins IN (30, 60, 90));
ALTER TABLE plans RENAME COLUMN lesson_count TO session_count;

-- 6. Update default service_category
ALTER TABLE appointments ALTER COLUMN service_category SET DEFAULT 'corte';

-- 7. Drop old RLS policies on appointments
DO $$ DECLARE t TEXT; BEGIN
  FOR t IN SELECT tablename FROM pg_policies WHERE schemaname = 'public' AND tablename = 'appointments' GROUP BY tablename LOOP
    EXECUTE format('DROP POLICY IF EXISTS "l_select" ON %I', t);
    EXECUTE format('DROP POLICY IF EXISTS "l_insert" ON %I', t);
    EXECUTE format('DROP POLICY IF EXISTS "l_update" ON %I', t);
    EXECUTE format('DROP POLICY IF EXISTS "l_delete" ON %I', t);
  END LOOP;
END; $$ LANGUAGE plpgsql;

-- 8. Recreate RLS policies for appointments
CREATE POLICY "appointments_select" ON appointments FOR SELECT USING (public.user_owns_company(company_id));
CREATE POLICY "appointments_insert" ON appointments FOR INSERT WITH CHECK (public.user_owns_company(company_id));
CREATE POLICY "appointments_update" ON appointments FOR UPDATE USING (public.user_owns_company(company_id));
CREATE POLICY "appointments_delete" ON appointments FOR DELETE USING (public.user_owns_company(company_id));

-- 9. Update existing data: convert old modality values
UPDATE appointments SET service_category = 'corte' WHERE service_category = 'natacao';
UPDATE appointments SET service_category = 'barba' WHERE service_category = 'hidroginastica';
