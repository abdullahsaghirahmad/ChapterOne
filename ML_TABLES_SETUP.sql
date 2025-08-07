-- 🗃️ Create Missing ML Tables for Contextual Bandits
-- Run this in Supabase SQL Editor to fix the 404 errors

-- 1. User contextual preferences (for bandit learning)
CREATE TABLE IF NOT EXISTS user_contextual_preferences (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id TEXT NOT NULL,
  context_signature TEXT NOT NULL,
  context_data JSONB NOT NULL,
  feature_weights JSONB NOT NULL DEFAULT '{}',
  action_counts JSONB NOT NULL DEFAULT '{}',
  reward_totals JSONB NOT NULL DEFAULT '{}',
  confidence_intervals JSONB NOT NULL DEFAULT '{}',
  last_updated TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  interaction_count INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id, context_signature)
);

-- 2. Recommendation impressions (for reward tracking)
CREATE TABLE IF NOT EXISTS recommendation_impressions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id TEXT,
  session_id TEXT,
  book_id TEXT NOT NULL,
  context_vector JSONB NOT NULL,
  source TEXT NOT NULL,
  rank INTEGER NOT NULL,
  score REAL NOT NULL,
  reward REAL,
  attributed_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 3. Recommendation actions (for user interactions)
CREATE TABLE IF NOT EXISTS recommendation_actions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id TEXT,
  session_id TEXT,
  book_id TEXT NOT NULL,
  action_type TEXT NOT NULL,
  value REAL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 4. Book embeddings (for future Hugging Face integration)
CREATE TABLE IF NOT EXISTS book_embeddings (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  book_id TEXT NOT NULL UNIQUE,
  embedding_model VARCHAR(100) NOT NULL DEFAULT 'all-MiniLM-L6-v2',
  embedding VECTOR(384),
  text_content TEXT NOT NULL,
  embedding_metadata JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 5. Enable RLS for security
ALTER TABLE user_contextual_preferences ENABLE ROW LEVEL SECURITY;
ALTER TABLE recommendation_impressions ENABLE ROW LEVEL SECURITY;
ALTER TABLE recommendation_actions ENABLE ROW LEVEL SECURITY;
ALTER TABLE book_embeddings ENABLE ROW LEVEL SECURITY;

-- 6. Create permissive policies for development
DROP POLICY IF EXISTS "ML tables accessible for development" ON user_contextual_preferences;
CREATE POLICY "ML tables accessible for development" ON user_contextual_preferences
FOR ALL USING (true);

DROP POLICY IF EXISTS "Impressions accessible for development" ON recommendation_impressions;
CREATE POLICY "Impressions accessible for development" ON recommendation_impressions
FOR ALL USING (true);

DROP POLICY IF EXISTS "Actions accessible for development" ON recommendation_actions;
CREATE POLICY "Actions accessible for development" ON recommendation_actions
FOR ALL USING (true);

DROP POLICY IF EXISTS "Embeddings accessible for development" ON book_embeddings;
CREATE POLICY "Embeddings accessible for development" ON book_embeddings
FOR ALL USING (true);

-- 7. Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_user_contextual_prefs_user_id ON user_contextual_preferences(user_id);
CREATE INDEX IF NOT EXISTS idx_user_contextual_prefs_context ON user_contextual_preferences(context_signature);
CREATE INDEX IF NOT EXISTS idx_recommendation_impressions_user_session ON recommendation_impressions(user_id, session_id);
CREATE INDEX IF NOT EXISTS idx_recommendation_actions_user_session ON recommendation_actions(user_id, session_id);
CREATE INDEX IF NOT EXISTS idx_book_embeddings_book_id ON book_embeddings(book_id);

-- 8. Verify tables exist
SELECT 
  table_name,
  CASE WHEN table_name IS NOT NULL THEN '✅ Created' ELSE '❌ Missing' END as status
FROM information_schema.tables 
WHERE table_schema = 'public' 
  AND table_name IN ('user_contextual_preferences', 'recommendation_impressions', 'recommendation_actions', 'book_embeddings')
ORDER BY table_name;