-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Create Users table
CREATE TABLE IF NOT EXISTS "user" (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    username VARCHAR NOT NULL UNIQUE,
    email VARCHAR NOT NULL UNIQUE,
    password VARCHAR NOT NULL,
    "favoriteGenres" TEXT[],
    "preferredPace" VARCHAR,
    "favoriteThemes" TEXT[],
    "createdAt" TIMESTAMP NOT NULL DEFAULT NOW(),
    "updatedAt" TIMESTAMP NOT NULL DEFAULT NOW()
);

-- Create Books table
CREATE TABLE IF NOT EXISTS book (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    title VARCHAR NOT NULL,
    author VARCHAR NOT NULL,
    isbn VARCHAR,
    "publishedYear" VARCHAR,
    "coverImage" VARCHAR,
    rating REAL,
    description TEXT,
    pace VARCHAR CHECK (pace IN ('Fast', 'Moderate', 'Slow')),
    tone TEXT[],
    themes TEXT[],
    "bestFor" TEXT[],
    categories TEXT[],
    professions TEXT[],
    "pageCount" INTEGER,
    "createdAt" TIMESTAMP NOT NULL DEFAULT NOW(),
    "updatedAt" TIMESTAMP NOT NULL DEFAULT NOW()
);

-- Create Threads table
CREATE TABLE IF NOT EXISTS thread (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    title VARCHAR NOT NULL,
    description TEXT NOT NULL,
    upvotes INTEGER NOT NULL DEFAULT 0,
    comments INTEGER NOT NULL DEFAULT 0,
    tags TEXT[],
    "createdById" UUID REFERENCES "user"(id) ON DELETE SET NULL,
    "createdAt" TIMESTAMP NOT NULL DEFAULT NOW(),
    "updatedAt" TIMESTAMP NOT NULL DEFAULT NOW()
);

-- Create Thread-Book relationship table (Many-to-Many)
CREATE TABLE IF NOT EXISTS thread_books_book (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    "threadId" UUID NOT NULL REFERENCES thread(id) ON DELETE CASCADE,
    "bookId" UUID NOT NULL REFERENCES book(id) ON DELETE CASCADE,
    "createdAt" TIMESTAMP NOT NULL DEFAULT NOW(),
    UNIQUE("threadId", "bookId")
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_user_username ON "user"(username);
CREATE INDEX IF NOT EXISTS idx_user_email ON "user"(email);
CREATE INDEX IF NOT EXISTS idx_book_title ON book(title);
CREATE INDEX IF NOT EXISTS idx_book_author ON book(author);
CREATE INDEX IF NOT EXISTS idx_book_categories ON book USING GIN(categories);
CREATE INDEX IF NOT EXISTS idx_book_themes ON book USING GIN(themes);
CREATE INDEX IF NOT EXISTS idx_thread_title ON thread(title);
CREATE INDEX IF NOT EXISTS idx_thread_created_by ON thread("createdById");
CREATE INDEX IF NOT EXISTS idx_thread_books_thread ON thread_books_book("threadId");
CREATE INDEX IF NOT EXISTS idx_thread_books_book_id ON thread_books_book("bookId");

-- Enable Row Level Security
ALTER TABLE "user" ENABLE ROW LEVEL SECURITY;
ALTER TABLE book ENABLE ROW LEVEL SECURITY;
ALTER TABLE thread ENABLE ROW LEVEL SECURITY;
ALTER TABLE thread_books_book ENABLE ROW LEVEL SECURITY;

-- Create policies for authenticated users
CREATE POLICY "Users can read all users" ON "user" FOR SELECT USING (true);
CREATE POLICY "Users can update own profile" ON "user" FOR UPDATE USING (auth.uid() = id);
CREATE POLICY "Users can insert their own profile" ON "user" FOR INSERT WITH CHECK (auth.uid() = id);

-- Books are readable by all, but only authenticated users can modify
CREATE POLICY "Anyone can read books" ON book FOR SELECT USING (true);
CREATE POLICY "Authenticated users can manage books" ON book FOR ALL USING (auth.role() = 'authenticated');

-- Threads are readable by all, but only authenticated users can create/modify
CREATE POLICY "Anyone can read threads" ON thread FOR SELECT USING (true);
CREATE POLICY "Authenticated users can create threads" ON thread FOR INSERT WITH CHECK (auth.role() = 'authenticated');
CREATE POLICY "Thread creators can update their threads" ON thread FOR UPDATE USING (auth.uid() = "createdById");
CREATE POLICY "Thread creators can delete their threads" ON thread FOR DELETE USING (auth.uid() = "createdById");

-- Thread-book relationships follow thread permissions
CREATE POLICY "Anyone can read thread-book relationships" ON thread_books_book FOR SELECT USING (true);
CREATE POLICY "Authenticated users can manage thread-book relationships" ON thread_books_book FOR ALL USING (auth.role() = 'authenticated'); 