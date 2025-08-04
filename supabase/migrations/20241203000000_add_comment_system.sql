-- Comment System Implementation for Threads MVP
-- Create comments table with hierarchical structure (max 2 levels deep)

CREATE TABLE IF NOT EXISTS comments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  "threadId" UUID NOT NULL REFERENCES thread(id) ON DELETE CASCADE,
  "userId" UUID NOT NULL REFERENCES "user"(id) ON DELETE CASCADE,
  "parentId" UUID REFERENCES comments(id) ON DELETE CASCADE,
  content TEXT NOT NULL CHECK (char_length(content) >= 1 AND char_length(content) <= 2000),
  upvotes INTEGER DEFAULT 0,
  "isEdited" BOOLEAN DEFAULT FALSE,
  "editedAt" TIMESTAMP,
  "createdAt" TIMESTAMP NOT NULL DEFAULT NOW(),
  "updatedAt" TIMESTAMP NOT NULL DEFAULT NOW()
);

-- Create comment upvotes tracking table
CREATE TABLE IF NOT EXISTS comment_upvotes (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  "commentId" UUID NOT NULL REFERENCES comments(id) ON DELETE CASCADE,
  "userId" UUID NOT NULL REFERENCES "user"(id) ON DELETE CASCADE,
  "createdAt" TIMESTAMP NOT NULL DEFAULT NOW(),
  
  -- Prevent duplicate upvotes
  UNIQUE("commentId", "userId")
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_comments_thread_id ON comments("threadId");
CREATE INDEX IF NOT EXISTS idx_comments_user_id ON comments("userId");
CREATE INDEX IF NOT EXISTS idx_comments_parent_id ON comments("parentId");
CREATE INDEX IF NOT EXISTS idx_comments_created_at ON comments("createdAt");
CREATE INDEX IF NOT EXISTS idx_comment_upvotes_comment_id ON comment_upvotes("commentId");
CREATE INDEX IF NOT EXISTS idx_comment_upvotes_user_id ON comment_upvotes("userId");

-- Enable RLS
ALTER TABLE comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE comment_upvotes ENABLE ROW LEVEL SECURITY;

-- RLS policies for comments
CREATE POLICY "Comments are viewable by everyone" ON comments
  FOR SELECT USING (true);

CREATE POLICY "Users can create comments" ON comments
  FOR INSERT WITH CHECK (auth.uid() = "userId");

CREATE POLICY "Users can update their own comments" ON comments
  FOR UPDATE USING (auth.uid() = "userId");

CREATE POLICY "Users can delete their own comments" ON comments
  FOR DELETE USING (auth.uid() = "userId");

-- RLS policies for comment upvotes
CREATE POLICY "Comment upvotes are viewable by everyone" ON comment_upvotes
  FOR SELECT USING (true);

CREATE POLICY "Users can manage their own upvotes" ON comment_upvotes
  FOR ALL USING (auth.uid() = "userId");

-- Function to update comment counts on threads
CREATE OR REPLACE FUNCTION update_thread_comment_count()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    -- Increment comment count
    UPDATE thread 
    SET comments = comments + 1, "updatedAt" = NOW()
    WHERE id = NEW."threadId";
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    -- Decrement comment count
    UPDATE thread 
    SET comments = GREATEST(comments - 1, 0), "updatedAt" = NOW()
    WHERE id = OLD."threadId";
    RETURN OLD;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- Function to update comment upvote counts
CREATE OR REPLACE FUNCTION update_comment_upvote_count()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    -- Increment upvote count
    UPDATE comments 
    SET upvotes = upvotes + 1, "updatedAt" = NOW()
    WHERE id = NEW."commentId";
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    -- Decrement upvote count
    UPDATE comments 
    SET upvotes = GREATEST(upvotes - 1, 0), "updatedAt" = NOW()
    WHERE id = OLD."commentId";
    RETURN OLD;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- Function to create comment notifications
CREATE OR REPLACE FUNCTION notify_comment_interactions()
RETURNS TRIGGER AS $$
DECLARE
  thread_record RECORD;
  parent_comment_record RECORD;
  thread_creator_id UUID;
  parent_comment_user_id UUID;
BEGIN
  -- Get thread information
  SELECT * INTO thread_record FROM thread WHERE id = NEW."threadId";
  
  IF TG_OP = 'INSERT' THEN
    -- Notify thread creator (unless they're the commenter)
    IF thread_record."createdById" IS NOT NULL AND thread_record."createdById" != NEW."userId" THEN
      PERFORM create_notification(
        thread_record."createdById",
        'thread_reply',
        'New comment on your thread',
        'Someone commented on "' || thread_record.title || '"',
        jsonb_build_object(
          'threadId', NEW."threadId",
          'threadTitle', thread_record.title,
          'commentId', NEW.id,
          'commentUserId', NEW."userId"
        )
      );
    END IF;
    
    -- If this is a reply to another comment, notify the parent comment author
    IF NEW."parentId" IS NOT NULL THEN
      SELECT * INTO parent_comment_record FROM comments WHERE id = NEW."parentId";
      
      IF parent_comment_record."userId" IS NOT NULL AND parent_comment_record."userId" != NEW."userId" THEN
        PERFORM create_notification(
          parent_comment_record."userId",
          'thread_reply',
          'Someone replied to your comment',
          'New reply in "' || thread_record.title || '"',
          jsonb_build_object(
            'threadId', NEW."threadId",
            'threadTitle', thread_record.title,
            'commentId', NEW.id,
            'parentCommentId', NEW."parentId",
            'commentUserId', NEW."userId"
          )
        );
      END IF;
    END IF;
    
    -- Notify thread followers (except commenter and thread creator to avoid duplicates)
    INSERT INTO notifications ("userId", type, title, message, data)
    SELECT 
      tf."userId",
      'thread_activity',
      'New comment in followed thread',
      'Someone commented on "' || thread_record.title || '"',
      jsonb_build_object(
        'threadId', NEW."threadId",
        'threadTitle', thread_record.title,
        'commentId', NEW.id,
        'actionType', 'comment',
        'commentUserId', NEW."userId"
      )
    FROM thread_follows tf
    WHERE tf."threadId" = NEW."threadId"
      AND tf."userId" != NEW."userId"
      AND tf."userId" != COALESCE(thread_record."createdById", '00000000-0000-0000-0000-000000000000'::UUID);
    
    RETURN NEW;
  END IF;
  
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- Create triggers
DROP TRIGGER IF EXISTS thread_comment_count_trigger ON comments;
CREATE TRIGGER thread_comment_count_trigger
  AFTER INSERT OR DELETE ON comments
  FOR EACH ROW
  EXECUTE FUNCTION update_thread_comment_count();

DROP TRIGGER IF EXISTS comment_upvote_count_trigger ON comment_upvotes;
CREATE TRIGGER comment_upvote_count_trigger
  AFTER INSERT OR DELETE ON comment_upvotes
  FOR EACH ROW
  EXECUTE FUNCTION update_comment_upvote_count();

DROP TRIGGER IF EXISTS comment_notification_trigger ON comments;
CREATE TRIGGER comment_notification_trigger
  AFTER INSERT ON comments
  FOR EACH ROW
  EXECUTE FUNCTION notify_comment_interactions();

-- Function to enforce max depth of 2 levels
CREATE OR REPLACE FUNCTION enforce_comment_depth()
RETURNS TRIGGER AS $$
BEGIN
  -- If this is a reply (has parentId), check if the parent is already a reply
  IF NEW."parentId" IS NOT NULL THEN
    IF EXISTS (
      SELECT 1 FROM comments 
      WHERE id = NEW."parentId" 
      AND "parentId" IS NOT NULL
    ) THEN
      RAISE EXCEPTION 'Comments can only be nested 2 levels deep';
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to enforce depth limit
DROP TRIGGER IF EXISTS comment_depth_check ON comments;
CREATE TRIGGER comment_depth_check
  BEFORE INSERT ON comments
  FOR EACH ROW
  EXECUTE FUNCTION enforce_comment_depth();

-- Grant permissions
GRANT SELECT, INSERT, UPDATE, DELETE ON comments TO authenticated;
GRANT SELECT, INSERT, DELETE ON comment_upvotes TO authenticated;

-- Create helpful views for comment queries with user information
CREATE OR REPLACE VIEW comment_details AS
SELECT 
  c.*,
  u.username,
  u."displayName",
  u."avatarUrl",
  CASE 
    WHEN c."parentId" IS NULL THEN 0
    ELSE 1
  END as depth,
  (
    SELECT COUNT(*)::INTEGER 
    FROM comments replies 
    WHERE replies."parentId" = c.id
  ) as reply_count,
  (
    SELECT COUNT(*)::INTEGER 
    FROM comment_upvotes cu 
    WHERE cu."commentId" = c.id
  ) as actual_upvotes
FROM comments c
JOIN "user" u ON c."userId" = u.id;

-- Grant access to the view
GRANT SELECT ON comment_details TO authenticated;

-- Function to get threaded comments for a thread
CREATE OR REPLACE FUNCTION get_thread_comments(thread_id UUID)
RETURNS TABLE (
  id UUID,
  "threadId" UUID,
  "userId" UUID,
  "parentId" UUID,
  content TEXT,
  upvotes INTEGER,
  "isEdited" BOOLEAN,
  "editedAt" TIMESTAMP,
  "createdAt" TIMESTAMP,
  "updatedAt" TIMESTAMP,
  username VARCHAR,
  "displayName" VARCHAR,
  "avatarUrl" VARCHAR,
  depth INTEGER,
  reply_count INTEGER,
  actual_upvotes INTEGER
) AS $$
BEGIN
  RETURN QUERY
  SELECT cd.*
  FROM comment_details cd
  WHERE cd."threadId" = thread_id
  ORDER BY 
    COALESCE(cd."parentId", cd.id),
    cd."createdAt";
END;
$$ LANGUAGE plpgsql;

-- Grant execution permission
GRANT EXECUTE ON FUNCTION get_thread_comments(UUID) TO authenticated; 