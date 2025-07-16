-- Add quote field to book table if it doesn't exist
DO $$ 
BEGIN 
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'book' AND column_name = 'quote') THEN
        ALTER TABLE book ADD COLUMN quote TEXT;
    END IF;
END $$; 