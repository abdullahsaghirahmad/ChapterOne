-- Create thread_book relationship table
CREATE TABLE IF NOT EXISTS thread_book (
    id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
    thread_id uuid NOT NULL REFERENCES thread(id) ON DELETE CASCADE,
    book_id uuid NOT NULL REFERENCES book(id) ON DELETE CASCADE,
    "createdAt" TIMESTAMP NOT NULL DEFAULT NOW(),
    UNIQUE(thread_id, book_id)
);

-- Create index for better performance
CREATE INDEX IF NOT EXISTS idx_thread_book_thread_id ON thread_book(thread_id);
CREATE INDEX IF NOT EXISTS idx_thread_book_book_id ON thread_book(book_id); 