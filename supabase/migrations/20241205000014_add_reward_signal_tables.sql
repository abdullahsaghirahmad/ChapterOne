-- Add Reward Signal Tables for Phase 2 Implementation
-- Migration: 20241205000014_add_reward_signal_tables.sql

-- =============================================================================
-- RECOMMENDATION IMPRESSIONS TABLE
-- Tracks when recommendations are shown to users
-- =============================================================================
CREATE TABLE IF NOT EXISTS recommendation_impressions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id TEXT, -- Using TEXT to match RewardSignalService expectations
  session_id TEXT,
  book_id TEXT NOT NULL,
  context_vector JSONB NOT NULL, -- Context when recommendation was shown
  source TEXT NOT NULL, -- 'semantic', 'bandit', 'collaborative', etc.
  rank INTEGER NOT NULL, -- Position in recommendation list (1st, 2nd, 3rd)
  score REAL NOT NULL, -- Recommendation confidence score
  reward REAL, -- Attributed reward (updated when user takes action)
  attributed_at TIMESTAMP WITH TIME ZONE, -- When reward was attributed
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =============================================================================
-- RECOMMENDATION ACTIONS TABLE  
-- Tracks user interactions with books
-- =============================================================================
CREATE TABLE IF NOT EXISTS recommendation_actions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id TEXT, -- Using TEXT to match RewardSignalService expectations
  session_id TEXT,
  book_id TEXT NOT NULL,
  action_type TEXT NOT NULL, -- 'click', 'save', 'unsave', 'rate', 'view', 'dismiss', 'share'
  value REAL, -- For ratings (1-5), duration (ms), etc.
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =============================================================================
-- INDEXES FOR PERFORMANCE
-- =============================================================================

-- Recommendation impressions indexes
CREATE INDEX IF NOT EXISTS idx_recommendation_impressions_user_session 
ON recommendation_impressions(user_id, session_id);

CREATE INDEX IF NOT EXISTS idx_recommendation_impressions_book_id 
ON recommendation_impressions(book_id);

CREATE INDEX IF NOT EXISTS idx_recommendation_impressions_created_at 
ON recommendation_impressions(created_at DESC);

-- Recommendation actions indexes  
CREATE INDEX IF NOT EXISTS idx_recommendation_actions_user_session 
ON recommendation_actions(user_id, session_id);

CREATE INDEX IF NOT EXISTS idx_recommendation_actions_book_id 
ON recommendation_actions(book_id);

CREATE INDEX IF NOT EXISTS idx_recommendation_actions_created_at 
ON recommendation_actions(created_at DESC);

CREATE INDEX IF NOT EXISTS idx_recommendation_actions_type 
ON recommendation_actions(action_type);

-- =============================================================================
-- ROW LEVEL SECURITY POLICIES
-- =============================================================================

-- Enable RLS
ALTER TABLE recommendation_impressions ENABLE ROW LEVEL SECURITY;
ALTER TABLE recommendation_actions ENABLE ROW LEVEL SECURITY;

-- Impression policies - allow all operations for development/testing
CREATE POLICY "Allow all impression operations for development" 
ON recommendation_impressions
FOR ALL 
USING (true)
WITH CHECK (true);

-- Action policies - allow all operations for development/testing  
CREATE POLICY "Allow all action operations for development"
ON recommendation_actions
FOR ALL
USING (true) 
WITH CHECK (true);