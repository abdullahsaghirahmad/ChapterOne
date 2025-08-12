-- Fix thread_follows RLS policies to allow proper follower counting
-- This migration fixes the production issue where authenticated users cannot access thread follow data

-- Drop existing restrictive policies
DROP POLICY IF EXISTS "Users can view their own follows" ON thread_follows;
DROP POLICY IF EXISTS "Users can manage their own follows" ON thread_follows;

-- Create new, properly scoped policies

-- Allow all authenticated users to view all follows (needed for counting and display)
CREATE POLICY "Authenticated users can view all follows" ON thread_follows
  FOR SELECT USING (auth.role() = 'authenticated');

-- Allow anonymous users to view all follows (for public follower counts)
CREATE POLICY "Anonymous users can view all follows" ON thread_follows
  FOR SELECT USING (auth.role() = 'anon');

-- Users can only insert their own follows
CREATE POLICY "Users can create their own follows" ON thread_follows
  FOR INSERT WITH CHECK (auth.uid() = "userId");

-- Users can only delete their own follows
CREATE POLICY "Users can delete their own follows" ON thread_follows
  FOR DELETE USING (auth.uid() = "userId");

-- Add index for better performance on follower count queries if not exists
CREATE INDEX IF NOT EXISTS idx_thread_follows_composite ON thread_follows("threadId", "userId");

-- Add helpful comment for future developers
COMMENT ON TABLE thread_follows IS 'Tracks which users follow which threads. RLS policies allow all users to view (for counting), but only authenticated users can modify their own follows.';
