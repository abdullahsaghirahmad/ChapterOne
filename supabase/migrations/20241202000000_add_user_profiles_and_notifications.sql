-- User Profile Extensions for Threads MVP
-- Add profile fields to existing user table
ALTER TABLE "user" ADD COLUMN IF NOT EXISTS "displayName" VARCHAR(100);
ALTER TABLE "user" ADD COLUMN IF NOT EXISTS "bio" TEXT CHECK (char_length(bio) <= 160);
ALTER TABLE "user" ADD COLUMN IF NOT EXISTS "avatarUrl" VARCHAR(500);
ALTER TABLE "user" ADD COLUMN IF NOT EXISTS "privacySettings" JSONB DEFAULT '{"profileVisible": true, "readingActivityVisible": true}';
ALTER TABLE "user" ADD COLUMN IF NOT EXISTS "notificationSettings" JSONB DEFAULT '{"emailNotifications": true, "inAppNotifications": true, "threadComments": true, "threadMentions": true, "digestFrequency": "weekly"}';

-- Create notifications table
CREATE TABLE IF NOT EXISTS notifications (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  "userId" UUID NOT NULL REFERENCES "user"(id) ON DELETE CASCADE,
  type VARCHAR(50) NOT NULL,
  title VARCHAR(200) NOT NULL,
  message TEXT,
  data JSONB,
  "isRead" BOOLEAN DEFAULT FALSE,
  "createdAt" TIMESTAMP NOT NULL DEFAULT NOW(),
  "readAt" TIMESTAMP
);

-- Create thread follows table for notification system
CREATE TABLE IF NOT EXISTS thread_follows (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  "userId" UUID NOT NULL REFERENCES "user"(id) ON DELETE CASCADE,
  "threadId" UUID NOT NULL REFERENCES thread(id) ON DELETE CASCADE,
  "createdAt" TIMESTAMP NOT NULL DEFAULT NOW(),
  
  -- Prevent duplicate follows
  UNIQUE("userId", "threadId")
);

-- Create user mentions table for notification triggers
CREATE TABLE IF NOT EXISTS user_mentions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  "mentionedUserId" UUID NOT NULL REFERENCES "user"(id) ON DELETE CASCADE,
  "mentioningUserId" UUID NOT NULL REFERENCES "user"(id) ON DELETE CASCADE,
  "threadId" UUID REFERENCES thread(id) ON DELETE CASCADE,
  "commentId" UUID, -- For future comment system
  "content" TEXT,
  "createdAt" TIMESTAMP NOT NULL DEFAULT NOW()
);

-- Function to create notification
CREATE OR REPLACE FUNCTION create_notification(
  p_user_id UUID,
  p_type VARCHAR,
  p_title VARCHAR,
  p_message TEXT DEFAULT NULL,
  p_data JSONB DEFAULT NULL
) RETURNS UUID AS $$
DECLARE
  notification_id UUID;
BEGIN
  INSERT INTO notifications ("userId", type, title, message, data)
  VALUES (p_user_id, p_type, p_title, p_message, p_data)
  RETURNING id INTO notification_id;
  
  RETURN notification_id;
END;
$$ LANGUAGE plpgsql;

-- Trigger function for thread follow notifications
CREATE OR REPLACE FUNCTION notify_thread_followers()
RETURNS TRIGGER AS $$
BEGIN
  -- When a thread is updated (new comment, etc.)
  -- Notify all followers except the person who made the update
  INSERT INTO notifications ("userId", type, title, message, data)
  SELECT 
    tf."userId",
    'thread_activity',
    'New activity in followed thread',
    'Someone commented on "' || NEW.title || '"',
    jsonb_build_object(
      'threadId', NEW.id,
      'threadTitle', NEW.title,
      'actionType', 'comment'
    )
  FROM thread_follows tf
  WHERE tf."threadId" = NEW.id
    AND tf."userId" != COALESCE(NEW."createdById", '00000000-0000-0000-0000-000000000000'::UUID);
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger for thread upvote notifications (milestones)
CREATE OR REPLACE FUNCTION notify_upvote_milestones()
RETURNS TRIGGER AS $$
BEGIN
  -- Notify thread creator on upvote milestones (10, 25, 50, 100)
  IF NEW.upvotes IN (10, 25, 50, 100) AND NEW."createdById" IS NOT NULL THEN
    PERFORM create_notification(
      NEW."createdById",
      'upvote_milestone',
      'Your thread hit ' || NEW.upvotes || ' upvotes!',
      '"' || NEW.title || '" is getting popular',
      jsonb_build_object(
        'threadId', NEW.id,
        'threadTitle', NEW.title,
        'upvotes', NEW.upvotes
      )
    );
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create triggers
DROP TRIGGER IF EXISTS thread_activity_notification ON thread;
CREATE TRIGGER thread_activity_notification
  AFTER UPDATE ON thread
  FOR EACH ROW
  WHEN (OLD.comments != NEW.comments)
  EXECUTE FUNCTION notify_thread_followers();

DROP TRIGGER IF EXISTS thread_upvote_milestone ON thread;
CREATE TRIGGER thread_upvote_milestone
  AFTER UPDATE ON thread
  FOR EACH ROW
  WHEN (OLD.upvotes != NEW.upvotes)
  EXECUTE FUNCTION notify_upvote_milestones();

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_user_display_name ON "user"("displayName");
CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON notifications("userId");
CREATE INDEX IF NOT EXISTS idx_notifications_type ON notifications(type);
CREATE INDEX IF NOT EXISTS idx_notifications_created_at ON notifications("createdAt");
CREATE INDEX IF NOT EXISTS idx_notifications_read_status ON notifications("isRead", "userId");
CREATE INDEX IF NOT EXISTS idx_notifications_unread ON notifications("userId", "isRead") WHERE "isRead" = FALSE;
CREATE INDEX IF NOT EXISTS idx_thread_follows_user_id ON thread_follows("userId");
CREATE INDEX IF NOT EXISTS idx_thread_follows_thread_id ON thread_follows("threadId");
CREATE INDEX IF NOT EXISTS idx_user_mentions_mentioned_user ON user_mentions("mentionedUserId");
CREATE INDEX IF NOT EXISTS idx_user_mentions_thread ON user_mentions("threadId");

-- Add RLS (Row Level Security) policies
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE thread_follows ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_mentions ENABLE ROW LEVEL SECURITY;

-- Notifications RLS policies
CREATE POLICY "Users can view their own notifications" ON notifications
  FOR SELECT USING ("userId" = auth.uid());

CREATE POLICY "Users can update their own notifications" ON notifications
  FOR UPDATE USING ("userId" = auth.uid());

-- Thread follows RLS policies
CREATE POLICY "Users can view their own follows" ON thread_follows
  FOR SELECT USING ("userId" = auth.uid());

CREATE POLICY "Users can manage their own follows" ON thread_follows
  FOR ALL USING ("userId" = auth.uid());

-- User mentions RLS policies
CREATE POLICY "Users can view mentions about them" ON user_mentions
  FOR SELECT USING ("mentionedUserId" = auth.uid());

CREATE POLICY "Users can create mentions" ON user_mentions
  FOR INSERT WITH CHECK ("mentioningUserId" = auth.uid());

-- Grant necessary permissions
GRANT SELECT, INSERT, UPDATE ON notifications TO authenticated;
GRANT SELECT, INSERT, DELETE ON thread_follows TO authenticated;
GRANT SELECT, INSERT ON user_mentions TO authenticated;

-- Create helpful view for user profile data
CREATE OR REPLACE VIEW user_profiles AS
SELECT 
  id,
  username,
  email,
  "displayName",
  bio,
  "avatarUrl",
  "createdAt",
  "privacySettings",
  "notificationSettings",
  (SELECT COUNT(*) FROM thread WHERE "createdById" = "user".id) as thread_count,
  (SELECT COUNT(*) FROM thread_follows WHERE "userId" = "user".id) as following_count
FROM "user";

-- Grant access to the view
GRANT SELECT ON user_profiles TO authenticated; 