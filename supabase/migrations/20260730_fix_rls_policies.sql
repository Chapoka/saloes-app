-- FIX: Replace deprecated auth.role() with auth.uid() IS NOT NULL
-- This fixes the 400 errors on all table queries

-- Drop old policies
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

-- Recreate policies with correct auth check
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

-- Also fix user-specific policies
DROP POLICY IF EXISTS "users_read_own" ON users;
DROP POLICY IF EXISTS "users_update_own" ON users;
DROP POLICY IF EXISTS "users_delete_own" ON users;

CREATE POLICY "users_read_own" ON users
  FOR SELECT USING (auth.uid() = id OR public.is_super_admin());

CREATE POLICY "users_update_own" ON users
  FOR UPDATE USING (auth.uid() = id OR public.is_super_admin())
  WITH CHECK (auth.uid() = id OR public.is_super_admin());

CREATE POLICY "users_delete_own" ON users
  FOR DELETE USING (auth.uid() = id);
