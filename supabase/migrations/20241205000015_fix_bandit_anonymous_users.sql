-- Fix user_contextual_preferences to support anonymous users
-- Migration: 20241205000015_fix_bandit_anonymous_users.sql

-- =============================================================================
-- DROP FOREIGN KEY CONSTRAINT AND CHANGE user_id TO TEXT
-- This allows both authenticated users (UUID) and anonymous users ('anonymous')
-- =============================================================================

-- First, drop the foreign key constraint
ALTER TABLE user_contextual_preferences 
DROP CONSTRAINT IF EXISTS user_contextual_preferences_user_id_fkey;

-- Change user_id from UUID to TEXT to match reward signal tables
ALTER TABLE user_contextual_preferences 
ALTER COLUMN user_id TYPE TEXT USING user_id::TEXT;

-- Update the unique constraint to match
ALTER TABLE user_contextual_preferences 
DROP CONSTRAINT IF EXISTS user_contextual_preferences_user_id_context_signature_key;

ALTER TABLE user_contextual_preferences 
ADD CONSTRAINT unique_user_context UNIQUE(user_id, context_signature);

-- Update the index
DROP INDEX IF EXISTS idx_user_contextual_prefs_user_id;
CREATE INDEX idx_user_contextual_prefs_user_id ON user_contextual_preferences(user_id);

-- =============================================================================
-- UPDATE RLS POLICIES TO HANDLE TEXT user_id
-- =============================================================================

-- Drop existing policies
DROP POLICY IF EXISTS "Users can view their own contextual preferences" ON user_contextual_preferences;
DROP POLICY IF EXISTS "Users can manage their own contextual preferences" ON user_contextual_preferences;
DROP POLICY IF EXISTS "Authenticated users can insert user contextual preferences" ON user_contextual_preferences;
DROP POLICY IF EXISTS "Authenticated users can update user contextual preferences" ON user_contextual_preferences;

-- Create new policies that handle both UUID and anonymous users
CREATE POLICY "Allow contextual preferences access" ON user_contextual_preferences
  FOR ALL
  USING (
    -- Allow access if user_id matches current user (for authenticated users)
    (auth.uid()::TEXT = user_id) OR 
    -- Allow access for anonymous users
    (user_id = 'anonymous') OR
    -- Allow service role access
    (auth.role() = 'service_role')
  )
  WITH CHECK (
    -- Same conditions for inserts/updates
    (auth.uid()::TEXT = user_id) OR 
    (user_id = 'anonymous') OR
    (auth.role() = 'service_role')
  );

-- =============================================================================
-- ENSURE PROPER INDEXING FOR PERFORMANCE
-- =============================================================================

-- Add index for anonymous user lookups
CREATE INDEX IF NOT EXISTS idx_user_contextual_prefs_anonymous 
ON user_contextual_preferences(context_signature) 
WHERE user_id = 'anonymous';

-- Add composite index for efficient lookups
CREATE INDEX IF NOT EXISTS idx_user_contextual_prefs_user_context 
ON user_contextual_preferences(user_id, context_signature);