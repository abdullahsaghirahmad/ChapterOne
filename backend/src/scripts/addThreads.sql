-- First, insert a default admin user if it doesn't exist
DO $$
DECLARE
  admin_id UUID := '11111111-1111-1111-1111-111111111111';
BEGIN
  INSERT INTO "user" (id, username, email, password)
  VALUES (admin_id, 'admin', 'admin@example.com', 'hashedpassword')
  ON CONFLICT (username) DO NOTHING;
END $$;

-- Get the admin user ID
DO $$
DECLARE
  admin_id UUID;
BEGIN
  SELECT id INTO admin_id FROM "user" WHERE username = 'admin';

  -- Thread 1
  INSERT INTO thread (id, title, description, upvotes, comments, tags, "createdById")
  VALUES (
    '22222222-2222-2222-2222-222222222222',
    'Books that changed your perspective on life?',
    'I''m looking for books that fundamentally shifted how you see the world. Books that made you question your assumptions or changed your outlook on important issues. What book changed your perspective the most and how?',
    89,
    32,
    ARRAY['Philosophy', 'Life', 'Perspective', 'Recommendations'],
    admin_id
  ) ON CONFLICT (id) DO NOTHING;

  -- Thread 2
  INSERT INTO thread (id, title, description, upvotes, comments, tags, "createdById")
  VALUES (
    '33333333-3333-3333-3333-333333333333',
    'What''s your favorite epic fantasy series?',
    'I just finished Wheel of Time and need a new epic fantasy series to dive into. I love detailed world-building, complex magic systems, and character development over multiple books. What are your top recommendations for epic fantasy series?',
    124,
    45,
    ARRAY['Fantasy', 'Series', 'Epic', 'Recommendations'],
    admin_id
  ) ON CONFLICT (id) DO NOTHING;

  -- Thread 3
  INSERT INTO thread (id, title, description, upvotes, comments, tags, "createdById")
  VALUES (
    '44444444-4444-4444-4444-444444444444',
    'Books with unreliable narrators',
    'I''m fascinated by books where you can''t fully trust the narrator. Books like Gone Girl, Fight Club, or The Murder of Roger Ackroyd where the narrator is deliberately misleading or has a limited perspective. What are your favorite books with unreliable narrators?',
    56,
    19,
    ARRAY['Unreliable Narrator', 'Fiction', 'Psychological', 'Recommendations'],
    admin_id
  ) ON CONFLICT (id) DO NOTHING;

  -- Thread 4
  INSERT INTO thread (id, title, description, upvotes, comments, tags, "createdById")
  VALUES (
    '55555555-5555-5555-5555-555555555555',
    'Best non-fiction books of 2023 so far?',
    'We''re halfway through the year and I''m looking to catch up on great non-fiction. What are the best non-fiction books you''ve read that were published in 2023? Biographies, science, history, psychology - all topics welcome!',
    42,
    13,
    ARRAY['Non-fiction', '2023', 'Recommendations', 'New Releases'],
    admin_id
  ) ON CONFLICT (id) DO NOTHING;

  -- Thread 5
  INSERT INTO thread (id, title, description, upvotes, comments, tags, "createdById")
  VALUES (
    '66666666-6666-6666-6666-666666666666',
    'Classic literature that''s actually enjoyable to read',
    'I want to read more classics but some of them feel like a chore. Which classic novels are genuinely enjoyable and don''t feel like homework? Looking for classics with engaging stories, relatable characters, or beautiful prose that pulls you in.',
    78,
    27,
    ARRAY['Classics', 'Literature', 'Enjoyable', 'Recommendations'],
    admin_id
  ) ON CONFLICT (id) DO NOTHING;

  -- Thread 6
  INSERT INTO thread (id, title, description, upvotes, comments, tags, "createdById")
  VALUES (
    '77777777-7777-7777-7777-777777777777',
    'Books that made you laugh out loud',
    'I need something genuinely funny to read. What books actually made you laugh out loud, not just smile? Looking for any genre - comedy, memoir, fiction - as long as it''s truly funny.',
    92,
    38,
    ARRAY['Humor', 'Comedy', 'Funny', 'Recommendations'],
    admin_id
  ) ON CONFLICT (id) DO NOTHING;
END $$;

-- Add relationships between threads and books
DO $$
DECLARE
  book_ids UUID[];
  book_id UUID;
  thread_ids UUID[] := ARRAY[
    '22222222-2222-2222-2222-222222222222',
    '33333333-3333-3333-3333-333333333333',
    '44444444-4444-4444-4444-444444444444',
    '55555555-5555-5555-5555-555555555555',
    '66666666-6666-6666-6666-666666666666',
    '77777777-7777-7777-7777-777777777777'
  ];
BEGIN
  -- Get all book IDs
  SELECT array_agg(id) INTO book_ids FROM book;
  
  -- Exit if no books found
  IF book_ids IS NULL OR array_length(book_ids, 1) = 0 THEN
    RAISE NOTICE 'No books found in the database. Please import books first.';
    RETURN;
  END IF;
  
  -- Associate each thread with 1-3 random books
  FOR i IN 1..array_length(thread_ids, 1) LOOP
    -- Select 1-3 random books
    FOR j IN 1..1 + floor(random() * 2)::int LOOP
      book_id := book_ids[1 + floor(random() * array_length(book_ids, 1))::int];
      
      -- Add relationship
      INSERT INTO thread_books_book ("threadId", "bookId")
      VALUES (thread_ids[i], book_id)
      ON CONFLICT DO NOTHING;
    END LOOP;
  END LOOP;
END $$; 