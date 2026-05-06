-- ============================================================
-- RIGHTS TRACKER - COMPLETE DATABASE SCHEMA
-- Run this in Supabase SQL Editor
-- ============================================================

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- CLUSTERS
CREATE TABLE IF NOT EXISTS clusters (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  name TEXT NOT NULL UNIQUE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- BRANCHES
CREATE TABLE IF NOT EXISTS branches (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  name TEXT NOT NULL UNIQUE,
  code TEXT NOT NULL UNIQUE,
  cluster_id UUID REFERENCES clusters(id),
  cluster_name TEXT,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- USER PROFILES
CREATE TABLE IF NOT EXISTS user_profiles (
  id UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
  email TEXT NOT NULL,
  full_name TEXT,
  role TEXT NOT NULL DEFAULT 'viewer' CHECK (role IN ('admin', 'editor', 'viewer')),
  branch_id UUID REFERENCES branches(id),
  can_view BOOLEAN DEFAULT TRUE,
  can_edit BOOLEAN DEFAULT FALSE,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- CREDIT TRACKER
CREATE TABLE IF NOT EXISTS credit_tracker (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  month TEXT NOT NULL,
  year INTEGER NOT NULL,
  branch_id UUID REFERENCES branches(id),
  sr_no INTEGER,
  case_no TEXT,
  applicant_name TEXT,
  loan_type TEXT,
  loan_amount NUMERIC(15,2),
  sanction_amount NUMERIC(15,2),
  disbursement_amount NUMERIC(15,2),
  status TEXT DEFAULT 'Pending',
  bank_name TEXT,
  product TEXT,
  login_date DATE,
  sanction_date DATE,
  disbursement_date DATE,
  remarks TEXT,
  created_by UUID REFERENCES auth.users(id),
  updated_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- LOGIN DESK
CREATE TABLE IF NOT EXISTS login_desk (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  month TEXT NOT NULL,
  year INTEGER NOT NULL,
  branch_id UUID REFERENCES branches(id),
  sr_no INTEGER,
  date DATE,
  applicant_name TEXT,
  loan_type TEXT,
  bank_name TEXT,
  product TEXT,
  loan_amount NUMERIC(15,2),
  co_applicant TEXT,
  mobile TEXT,
  file_status TEXT DEFAULT 'Pending',
  assigned_to TEXT,
  remarks TEXT,
  created_by UUID REFERENCES auth.users(id),
  updated_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- MIS TRACKER
CREATE TABLE IF NOT EXISTS mis_tracker (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  month TEXT NOT NULL,
  year INTEGER NOT NULL,
  branch_id UUID REFERENCES branches(id),
  total_cases INTEGER DEFAULT 0,
  total_login_amount NUMERIC(15,2) DEFAULT 0,
  total_sanction_amount NUMERIC(15,2) DEFAULT 0,
  total_disbursement_amount NUMERIC(15,2) DEFAULT 0,
  approved_cases INTEGER DEFAULT 0,
  rejected_cases INTEGER DEFAULT 0,
  pending_cases INTEGER DEFAULT 0,
  disbursed_cases INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- ROW LEVEL SECURITY
-- ============================================================
ALTER TABLE clusters ENABLE ROW LEVEL SECURITY;
ALTER TABLE branches ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE credit_tracker ENABLE ROW LEVEL SECURITY;
ALTER TABLE login_desk ENABLE ROW LEVEL SECURITY;
ALTER TABLE mis_tracker ENABLE ROW LEVEL SECURITY;

-- Clusters
DROP POLICY IF EXISTS "clusters_read" ON clusters;
CREATE POLICY "clusters_read" ON clusters FOR SELECT USING (true);
DROP POLICY IF EXISTS "clusters_admin" ON clusters;
CREATE POLICY "clusters_admin" ON clusters FOR ALL USING (
  EXISTS (SELECT 1 FROM user_profiles WHERE id = auth.uid() AND role = 'admin')
);

-- Branches
DROP POLICY IF EXISTS "branches_read" ON branches;
CREATE POLICY "branches_read" ON branches FOR SELECT USING (true);
DROP POLICY IF EXISTS "branches_admin" ON branches;
CREATE POLICY "branches_admin" ON branches FOR ALL USING (
  EXISTS (SELECT 1 FROM user_profiles WHERE id = auth.uid() AND role = 'admin')
);

-- User profiles
DROP POLICY IF EXISTS "profiles_select" ON user_profiles;
CREATE POLICY "profiles_select" ON user_profiles FOR SELECT USING (
  id = auth.uid() OR EXISTS (SELECT 1 FROM user_profiles WHERE id = auth.uid() AND role = 'admin')
);
DROP POLICY IF EXISTS "profiles_update_own" ON user_profiles;
CREATE POLICY "profiles_update_own" ON user_profiles FOR UPDATE USING (
  id = auth.uid() OR EXISTS (SELECT 1 FROM user_profiles WHERE id = auth.uid() AND role = 'admin')
);
DROP POLICY IF EXISTS "profiles_admin_all" ON user_profiles;
CREATE POLICY "profiles_admin_all" ON user_profiles FOR ALL USING (
  EXISTS (SELECT 1 FROM user_profiles WHERE id = auth.uid() AND role = 'admin')
);

-- Credit Tracker
DROP POLICY IF EXISTS "credit_select" ON credit_tracker;
CREATE POLICY "credit_select" ON credit_tracker FOR SELECT USING (
  EXISTS (SELECT 1 FROM user_profiles up WHERE up.id = auth.uid() AND up.is_active = true AND up.can_view = true
    AND (up.role = 'admin' OR up.branch_id IS NULL OR up.branch_id = credit_tracker.branch_id))
);
DROP POLICY IF EXISTS "credit_insert" ON credit_tracker;
CREATE POLICY "credit_insert" ON credit_tracker FOR INSERT WITH CHECK (
  EXISTS (SELECT 1 FROM user_profiles up WHERE up.id = auth.uid() AND up.is_active = true
    AND (up.role IN ('admin','editor') OR up.can_edit = true)
    AND (up.branch_id IS NULL OR up.branch_id = branch_id))
);
DROP POLICY IF EXISTS "credit_update" ON credit_tracker;
CREATE POLICY "credit_update" ON credit_tracker FOR UPDATE USING (
  EXISTS (SELECT 1 FROM user_profiles up WHERE up.id = auth.uid() AND up.is_active = true
    AND (up.role IN ('admin','editor') OR up.can_edit = true)
    AND (up.branch_id IS NULL OR up.branch_id = credit_tracker.branch_id))
);
DROP POLICY IF EXISTS "credit_delete" ON credit_tracker;
CREATE POLICY "credit_delete" ON credit_tracker FOR DELETE USING (
  EXISTS (SELECT 1 FROM user_profiles WHERE id = auth.uid() AND role = 'admin')
);

-- Login Desk
DROP POLICY IF EXISTS "logindesk_select" ON login_desk;
CREATE POLICY "logindesk_select" ON login_desk FOR SELECT USING (
  EXISTS (SELECT 1 FROM user_profiles up WHERE up.id = auth.uid() AND up.is_active = true AND up.can_view = true
    AND (up.role = 'admin' OR up.branch_id IS NULL OR up.branch_id = login_desk.branch_id))
);
DROP POLICY IF EXISTS "logindesk_insert" ON login_desk;
CREATE POLICY "logindesk_insert" ON login_desk FOR INSERT WITH CHECK (
  EXISTS (SELECT 1 FROM user_profiles up WHERE up.id = auth.uid() AND up.is_active = true
    AND (up.role IN ('admin','editor') OR up.can_edit = true)
    AND (up.branch_id IS NULL OR up.branch_id = branch_id))
);
DROP POLICY IF EXISTS "logindesk_update" ON login_desk;
CREATE POLICY "logindesk_update" ON login_desk FOR UPDATE USING (
  EXISTS (SELECT 1 FROM user_profiles up WHERE up.id = auth.uid() AND up.is_active = true
    AND (up.role IN ('admin','editor') OR up.can_edit = true)
    AND (up.branch_id IS NULL OR up.branch_id = login_desk.branch_id))
);
DROP POLICY IF EXISTS "logindesk_delete" ON login_desk;
CREATE POLICY "logindesk_delete" ON login_desk FOR DELETE USING (
  EXISTS (SELECT 1 FROM user_profiles WHERE id = auth.uid() AND role = 'admin')
);

-- MIS Tracker
DROP POLICY IF EXISTS "mis_select" ON mis_tracker;
CREATE POLICY "mis_select" ON mis_tracker FOR SELECT USING (
  EXISTS (SELECT 1 FROM user_profiles up WHERE up.id = auth.uid() AND up.is_active = true AND up.can_view = true)
);
DROP POLICY IF EXISTS "mis_admin" ON mis_tracker;
CREATE POLICY "mis_admin" ON mis_tracker FOR ALL USING (
  EXISTS (SELECT 1 FROM user_profiles WHERE id = auth.uid() AND role = 'admin')
);

-- ============================================================
-- FUNCTIONS & TRIGGERS
-- ============================================================
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$ BEGIN NEW.updated_at = NOW(); RETURN NEW; END; $$ language 'plpgsql';

DROP TRIGGER IF EXISTS credit_updated_at ON credit_tracker;
CREATE TRIGGER credit_updated_at BEFORE UPDATE ON credit_tracker FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
DROP TRIGGER IF EXISTS login_desk_updated_at ON login_desk;
CREATE TRIGGER login_desk_updated_at BEFORE UPDATE ON login_desk FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
DROP TRIGGER IF EXISTS profiles_updated_at ON user_profiles;
CREATE TRIGGER profiles_updated_at BEFORE UPDATE ON user_profiles FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.user_profiles (id, email, full_name, role)
  VALUES (NEW.id, NEW.email, COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email), 'viewer')
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created AFTER INSERT ON auth.users FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ============================================================
-- CLUSTERS DATA
-- ============================================================
INSERT INTO clusters (name) VALUES
  ('Delhi Cluster'),('Faridabad Cluster'),('Gurgaon Cluster'),
  ('Ghaziabad Cluster'),('Karnataka Cluster')
ON CONFLICT (name) DO NOTHING;

-- ============================================================
-- ALL 36 BRANCHES
-- ============================================================
INSERT INTO branches (name, code, cluster_name, cluster_id, is_active)
SELECT b.name, b.code, b.cluster_name, c.id, true
FROM (VALUES
  ('Delhi-Pitampura','DL-PIT','Delhi Cluster'),
  ('Delhi-Nangloi','DL-NAN','Delhi Cluster'),
  ('Haryana-Panipat','HR-PAN','Delhi Cluster'),
  ('Haryana-Sonipat','HR-SON','Delhi Cluster'),
  ('Delhi-Alipur','DL-ALI','Delhi Cluster'),
  ('Haryana-Karnal','HR-KAR','Delhi Cluster'),
  ('Haryana-Kurukshetra','HR-KUR','Delhi Cluster'),
  ('Haryana-Palwal','HR-PAL','Faridabad Cluster'),
  ('Uttar Pradesh-Mathura','UP-MAT','Faridabad Cluster'),
  ('Uttar Pradesh-Hathras','UP-HAT','Faridabad Cluster'),
  ('Uttar Pradesh-Jewar','UP-JEW','Faridabad Cluster'),
  ('Haryana-Badarpur','HR-BAD','Faridabad Cluster'),
  ('Uttar Pradesh-Goverdhan','UP-GOV','Faridabad Cluster'),
  ('Uttar Pradesh-Agra','UP-AGR','Faridabad Cluster'),
  ('Haryana-Faridabad','HR-FAR','Faridabad Cluster'),
  ('Haryana-Gurugram','HR-GUR','Gurgaon Cluster'),
  ('Rajasthan-Bhiwadi','RJ-BHI','Gurgaon Cluster'),
  ('Haryana-Rewari','HR-REW','Gurgaon Cluster'),
  ('Haryana-Sohna','HR-SOH','Gurgaon Cluster'),
  ('Haryana-Narnaul','HR-NAR','Gurgaon Cluster'),
  ('Rajasthan-Behror','RJ-BEH','Gurgaon Cluster'),
  ('Haryana-Pataudi','HR-PAT','Gurgaon Cluster'),
  ('Rajasthan-Khairthal','RJ-KHA','Gurgaon Cluster'),
  ('Delhi-East Delhi','DL-EAS','Ghaziabad Cluster'),
  ('Uttar Pradesh-Bulandshahr','UP-BUL','Ghaziabad Cluster'),
  ('Uttar Pradesh-Hapur','UP-HAP','Ghaziabad Cluster'),
  ('Uttar Pradesh-Loni','UP-LON','Ghaziabad Cluster'),
  ('Uttar Pradesh-Ghaziabad','UP-GHZ','Ghaziabad Cluster'),
  ('Uttar Pradesh-Meerut','UP-MEE','Ghaziabad Cluster'),
  ('Uttar Pradesh-Surajpur','UP-SUR','Ghaziabad Cluster'),
  ('Karnataka-Yelahanka','KA-YEL','Karnataka Cluster'),
  ('Karnataka-Kanakpura','KA-KAN','Karnataka Cluster'),
  ('Karnataka-Davangere','KA-DAV','Karnataka Cluster'),
  ('Karnataka-Kengeri','KA-KEN','Karnataka Cluster'),
  ('Karnataka-Mandya','KA-MAN','Karnataka Cluster'),
  ('Karnataka-Ramnagar','KA-RAM','Karnataka Cluster')
) AS b(name, code, cluster_name)
JOIN clusters c ON c.name = b.cluster_name
ON CONFLICT (name) DO UPDATE SET cluster_name = EXCLUDED.cluster_name, cluster_id = EXCLUDED.cluster_id;

-- ============================================================
-- SET ADMIN USER (run AFTER creating Admin001@rightstrack.com in Auth)
-- ============================================================
UPDATE user_profiles
SET role = 'admin', can_view = true, can_edit = true, is_active = true
WHERE email = 'Admin001@rightstrack.com';
