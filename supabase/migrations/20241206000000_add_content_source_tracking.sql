-- Content Source Tracking for Hybrid AI/External Data Strategy
-- Migration: 20241206000000_add_content_source_tracking.sql
-- Safe, backwards-compatible migration with rollback support

-- =============================================================================
-- 1. ADD CONTENT SOURCE AND QUALITY TRACKING FIELDS
-- =============================================================================

-- Add content source tracking columns (nullable, with sensible defaults)
DO $$ 
BEGIN 
    -- Description source tracking
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'book' AND column_name = 'description_source') THEN
        ALTER TABLE book ADD COLUMN description_source VARCHAR(50) DEFAULT 'unknown';
        COMMENT ON COLUMN book.description_source IS 'Source of description: google_books, open_library, ai_generated, ai_refined, manual, unknown';
    END IF;

    -- Quote source tracking  
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'book' AND column_name = 'quote_source') THEN
        ALTER TABLE book ADD COLUMN quote_source VARCHAR(50) DEFAULT 'unknown';
        COMMENT ON COLUMN book.quote_source IS 'Source of quote: google_books, open_library, ai_generated, ai_refined, manual, unknown';
    END IF;

    -- Content quality scores (1-5 scale)
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'book' AND column_name = 'description_quality_score') THEN
        ALTER TABLE book ADD COLUMN description_quality_score INTEGER CHECK (description_quality_score >= 1 AND description_quality_score <= 5);
        COMMENT ON COLUMN book.description_quality_score IS 'Quality score 1-5: 1=missing, 2=poor, 3=okay, 4=good, 5=perfect';
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'book' AND column_name = 'quote_quality_score') THEN
        ALTER TABLE book ADD COLUMN quote_quality_score INTEGER CHECK (quote_quality_score >= 1 AND quote_quality_score <= 5);
        COMMENT ON COLUMN book.quote_quality_score IS 'Quality score 1-5: 1=missing, 2=poor, 3=okay, 4=good, 5=perfect';
    END IF;

    -- Enhancement flags
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'book' AND column_name = 'ai_enhancement_needed') THEN
        ALTER TABLE book ADD COLUMN ai_enhancement_needed BOOLEAN DEFAULT FALSE;
        COMMENT ON COLUMN book.ai_enhancement_needed IS 'Flag indicating content needs AI enhancement/review';
    END IF;

    -- Enhancement timestamp
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'book' AND column_name = 'last_ai_enhancement_at') THEN
        ALTER TABLE book ADD COLUMN last_ai_enhancement_at TIMESTAMP WITH TIME ZONE;
        COMMENT ON COLUMN book.last_ai_enhancement_at IS 'When content was last enhanced by AI';
    END IF;

    -- Preserve original external data (for rollback/comparison)
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'book' AND column_name = 'original_description') THEN
        ALTER TABLE book ADD COLUMN original_description TEXT;
        COMMENT ON COLUMN book.original_description IS 'Original description from external source before AI enhancement';
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'book' AND column_name = 'original_quote') THEN
        ALTER TABLE book ADD COLUMN original_quote TEXT;
        COMMENT ON COLUMN book.original_quote IS 'Original quote from external source before AI enhancement';
    END IF;

    -- External API metadata
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'book' AND column_name = 'external_api_data') THEN
        ALTER TABLE book ADD COLUMN external_api_data JSONB DEFAULT '{}';
        COMMENT ON COLUMN book.external_api_data IS 'Raw data from external APIs (Google Books, Open Library, etc.)';
    END IF;

    -- Content enhancement history
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'book' AND column_name = 'enhancement_history') THEN
        ALTER TABLE book ADD COLUMN enhancement_history JSONB DEFAULT '[]';
        COMMENT ON COLUMN book.enhancement_history IS 'Array of enhancement records with timestamps and changes';
    END IF;

END $$;

-- =============================================================================
-- 2. CREATE INDEXES FOR PERFORMANCE
-- =============================================================================

-- Indexes for admin filtering and bulk operations
CREATE INDEX IF NOT EXISTS idx_book_description_source ON book(description_source);
CREATE INDEX IF NOT EXISTS idx_book_quote_source ON book(quote_source);
CREATE INDEX IF NOT EXISTS idx_book_ai_enhancement_needed ON book(ai_enhancement_needed) WHERE ai_enhancement_needed = TRUE;
CREATE INDEX IF NOT EXISTS idx_book_description_quality ON book(description_quality_score) WHERE description_quality_score IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_book_quote_quality ON book(quote_quality_score) WHERE quote_quality_score IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_book_last_enhancement ON book(last_ai_enhancement_at) WHERE last_ai_enhancement_at IS NOT NULL;

-- =============================================================================
-- 3. CREATE CONTENT AUDIT LOG TABLE
-- =============================================================================

CREATE TABLE IF NOT EXISTS content_enhancement_log (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  book_id UUID NOT NULL REFERENCES book(id) ON DELETE CASCADE,
  enhancement_type VARCHAR(50) NOT NULL, -- 'description', 'quote', 'metadata'
  source_before VARCHAR(50), -- Previous source
  source_after VARCHAR(50) NOT NULL, -- New source
  content_before TEXT, -- Previous content
  content_after TEXT NOT NULL, -- New content
  quality_score_before INTEGER CHECK (quality_score_before >= 1 AND quality_score_before <= 5),
  quality_score_after INTEGER CHECK (quality_score_after >= 1 AND quality_score_after <= 5),
  enhancement_reason TEXT, -- Why enhancement was triggered
  ai_model_used VARCHAR(100), -- Which AI model was used
  processing_time_ms INTEGER, -- Performance tracking
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes for audit log
CREATE INDEX IF NOT EXISTS idx_content_log_book_id ON content_enhancement_log(book_id);
CREATE INDEX IF NOT EXISTS idx_content_log_type ON content_enhancement_log(enhancement_type);
CREATE INDEX IF NOT EXISTS idx_content_log_created_at ON content_enhancement_log(created_at DESC);

-- =============================================================================
-- 4. UPDATE EXISTING BOOKS WITH DEFAULT VALUES
-- =============================================================================

-- Safely update existing books to have proper source tracking
-- Only update books that don't already have source information
UPDATE book 
SET 
  description_source = CASE 
    WHEN description IS NOT NULL AND description != '' THEN 'legacy_data'
    ELSE 'unknown'
  END,
  quote_source = CASE 
    WHEN quote IS NOT NULL AND quote != '' THEN 'legacy_data'
    ELSE 'unknown'
  END,
  description_quality_score = CASE 
    WHEN description IS NOT NULL AND LENGTH(description) > 50 THEN 3
    WHEN description IS NOT NULL AND LENGTH(description) > 10 THEN 2
    ELSE 1
  END,
  quote_quality_score = CASE 
    WHEN quote IS NOT NULL AND LENGTH(quote) > 10 THEN 3
    ELSE 1
  END,
  ai_enhancement_needed = CASE 
    WHEN description IS NULL OR LENGTH(description) < 50 OR quote IS NULL THEN TRUE
    ELSE FALSE
  END
WHERE description_source IS NULL OR description_source = 'unknown';

-- =============================================================================
-- 5. CREATE HELPER FUNCTIONS
-- =============================================================================

-- Function to calculate content quality score
CREATE OR REPLACE FUNCTION calculate_content_quality_score(content TEXT, content_type VARCHAR)
RETURNS INTEGER AS $$
BEGIN
  IF content IS NULL OR LENGTH(content) = 0 THEN
    RETURN 1; -- Missing
  END IF;
  
  IF content_type = 'description' THEN
    IF LENGTH(content) < 20 THEN RETURN 2; -- Too short
    IF LENGTH(content) > 300 THEN RETURN 2; -- Too long for UI
    IF content ILIKE '%no description%' OR content ILIKE '%coming soon%' THEN RETURN 2; -- Generic
    IF LENGTH(content) BETWEEN 50 AND 200 THEN RETURN 4; -- Good length
    RETURN 3; -- Okay
  END IF;
  
  IF content_type = 'quote' THEN
    IF LENGTH(content) < 10 THEN RETURN 2; -- Too short
    IF LENGTH(content) > 150 THEN RETURN 2; -- Too long for UI
    IF content ILIKE '%quote not available%' THEN RETURN 2; -- Generic
    RETURN 3; -- Default okay for quotes
  END IF;
  
  RETURN 3; -- Default okay
END;
$$ LANGUAGE plpgsql;

-- Function to determine if content needs AI enhancement
CREATE OR REPLACE FUNCTION needs_ai_enhancement(
  description TEXT, 
  description_quality INTEGER,
  quote TEXT,
  quote_quality INTEGER
)
RETURNS BOOLEAN AS $$
BEGIN
  -- Need enhancement if any content is missing or poor quality
  IF description_quality <= 2 OR quote_quality <= 2 THEN
    RETURN TRUE;
  END IF;
  
  -- Need enhancement if description doesn't fit UI constraints
  IF description IS NOT NULL AND (LENGTH(description) < 30 OR LENGTH(description) > 200) THEN
    RETURN TRUE;
  END IF;
  
  -- Need enhancement if quote doesn't fit UI constraints  
  IF quote IS NOT NULL AND (LENGTH(quote) < 10 OR LENGTH(quote) > 100) THEN
    RETURN TRUE;
  END IF;
  
  RETURN FALSE;
END;
$$ LANGUAGE plpgsql;

-- =============================================================================
-- 6. CREATE RLS POLICIES FOR AUDIT LOG
-- =============================================================================

-- Enable RLS on audit log
ALTER TABLE content_enhancement_log ENABLE ROW LEVEL SECURITY;

-- Admin users can see all enhancement logs
CREATE POLICY "Admin users can view all enhancement logs" ON content_enhancement_log
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM auth.users 
      WHERE auth.users.id = auth.uid() 
      AND auth.users.raw_app_meta_data->>'role' = 'admin'
    )
  );

-- Users can see logs for their own enhancements
CREATE POLICY "Users can view their own enhancement logs" ON content_enhancement_log
  FOR SELECT USING (created_by = auth.uid());

-- =============================================================================
-- 7. ADD HELPFUL COMMENTS AND DOCUMENTATION
-- =============================================================================

COMMENT ON TABLE content_enhancement_log IS 'Audit trail for all content enhancements, AI generations, and quality improvements';
COMMENT ON FUNCTION calculate_content_quality_score IS 'Automatically assess content quality on 1-5 scale based on length and content analysis';
COMMENT ON FUNCTION needs_ai_enhancement IS 'Determine if book content needs AI enhancement based on quality scores and UI constraints';

-- Add table comment
COMMENT ON TABLE book IS 'Books table with hybrid content strategy: external API data + AI enhancement + source tracking';