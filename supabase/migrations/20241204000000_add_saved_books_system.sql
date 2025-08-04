-- Add saved books system for user library functionality
-- Migration: 20241204000000_add_saved_books_system.sql

-- Create saved_books table for user's personal library
CREATE TABLE IF NOT EXISTS saved_books (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  book_id TEXT NOT NULL, -- External book ID (can be from various sources)
  book_data JSONB NOT NULL, -- Store book metadata (title, author, cover, etc.)
  status TEXT NOT NULL DEFAULT 'want_to_read' CHECK (status IN ('want_to_read', 'currently_reading', 'finished')),
  saved_reason TEXT, -- User's reason for saving (mood/context capture)
  saved_context JSONB, -- Additional context data (mood, situation, etc.)
  rating INTEGER CHECK (rating >= 1 AND rating <= 5), -- User's rating after reading
  notes TEXT, -- User's personal notes
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  -- Ensure one book per user (prevent duplicates)
  UNIQUE(user_id, book_id)
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_saved_books_user_id ON saved_books(user_id);
CREATE INDEX IF NOT EXISTS idx_saved_books_status ON saved_books(status);
CREATE INDEX IF NOT EXISTS idx_saved_books_created_at ON saved_books(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_saved_books_user_status ON saved_books(user_id, status);

-- Create updated_at trigger function if it doesn't exist
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Add updated_at trigger
CREATE TRIGGER update_saved_books_updated_at 
  BEFORE UPDATE ON saved_books 
  FOR EACH ROW 
  EXECUTE FUNCTION update_updated_at_column();

-- Enable RLS (Row Level Security)
ALTER TABLE saved_books ENABLE ROW LEVEL SECURITY;

-- RLS Policies
-- Users can only see their own saved books
CREATE POLICY "Users can view their own saved books" ON saved_books
  FOR SELECT USING (auth.uid() = user_id);

-- Users can insert their own saved books
CREATE POLICY "Users can save their own books" ON saved_books
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Users can update their own saved books
CREATE POLICY "Users can update their own saved books" ON saved_books
  FOR UPDATE USING (auth.uid() = user_id);

-- Users can delete their own saved books
CREATE POLICY "Users can delete their own saved books" ON saved_books
  FOR DELETE USING (auth.uid() = user_id);

-- Create function to get user's library statistics
CREATE OR REPLACE FUNCTION get_user_library_stats(user_uuid UUID)
RETURNS TABLE(
  total_books BIGINT,
  want_to_read BIGINT,
  currently_reading BIGINT,
  finished BIGINT
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    COUNT(*) as total_books,
    COUNT(*) FILTER (WHERE status = 'want_to_read') as want_to_read,
    COUNT(*) FILTER (WHERE status = 'currently_reading') as currently_reading,
    COUNT(*) FILTER (WHERE status = 'finished') as finished
  FROM saved_books 
  WHERE user_id = user_uuid;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Add reading_preferences to users table (extending existing table)
DO $$ 
BEGIN
  -- Add reading_preferences column if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'user' AND column_name = 'reading_preferences'
  ) THEN
    ALTER TABLE "user" ADD COLUMN reading_preferences JSONB DEFAULT '{}';
  END IF;
  
  -- Add onboarding_completed column if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'user' AND column_name = 'onboarding_completed'
  ) THEN
    ALTER TABLE "user" ADD COLUMN onboarding_completed BOOLEAN DEFAULT FALSE;
  END IF;
END $$;

-- Create index on reading_preferences for efficient queries
CREATE INDEX IF NOT EXISTS idx_users_reading_preferences ON "user" USING GIN (reading_preferences);