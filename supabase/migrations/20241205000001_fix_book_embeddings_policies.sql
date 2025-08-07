-- Fix book_embeddings INSERT permissions and policies
-- Migration: 20241205000001_fix_book_embeddings_policies.sql

-- Add INSERT policy for service role (used by embeddings API)
CREATE POLICY "Service role can insert book embeddings" ON book_embeddings
  FOR INSERT TO service_role
  WITH CHECK (true);

-- Add INSERT policy for authenticated users (for admin panel)
CREATE POLICY "Authenticated users can insert book embeddings" ON book_embeddings
  FOR INSERT TO authenticated
  WITH CHECK (true);

-- Add UPDATE policy for service role (for metadata updates)
CREATE POLICY "Service role can update book embeddings" ON book_embeddings
  FOR UPDATE TO service_role
  USING (true)
  WITH CHECK (true);