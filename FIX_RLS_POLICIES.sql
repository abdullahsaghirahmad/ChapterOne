-- 🔐 Fix RLS Policies for ML Tables
-- The 406 errors suggest permission issues, not missing tables

-- 1. Check if tables exist
SELECT table_name FROM information_schema.tables 
WHERE table_schema = 'public' 
  AND table_name IN ('user_contextual_preferences', 'recommendation_impressions', 'recommendation_actions');

-- 2. Disable RLS temporarily for debugging (ONLY for development)
ALTER TABLE user_contextual_preferences DISABLE ROW LEVEL SECURITY;
ALTER TABLE recommendation_impressions DISABLE ROW LEVEL SECURITY;
ALTER TABLE recommendation_actions DISABLE ROW LEVEL SECURITY;

-- 3. OR if you want to keep RLS enabled, create very permissive policies
-- (Re-enable RLS first if you disabled it above)
-- ALTER TABLE user_contextual_preferences ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE recommendation_impressions ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE recommendation_actions ENABLE ROW LEVEL SECURITY;

-- Drop all existing policies to start fresh
DROP POLICY IF EXISTS "ML tables accessible for development" ON user_contextual_preferences;
DROP POLICY IF EXISTS "Impressions accessible for development" ON recommendation_impressions;
DROP POLICY IF EXISTS "Actions accessible for development" ON recommendation_actions;

-- Create completely open policies for development
CREATE POLICY "Allow all operations for development" ON user_contextual_preferences
FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);

CREATE POLICY "Allow all operations for development" ON recommendation_impressions
FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);

CREATE POLICY "Allow all operations for development" ON recommendation_actions
FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);

-- 4. Test a simple insert to verify permissions
INSERT INTO user_contextual_preferences (user_id, context_signature, context_data, feature_weights) 
VALUES ('test_user', 'test_context', '{"mood":"excited"}', '{"content_based":0.5}')
ON CONFLICT (user_id, context_signature) DO NOTHING;

-- 5. Check if the insert worked
SELECT COUNT(*) as test_records FROM user_contextual_preferences WHERE user_id = 'test_user';