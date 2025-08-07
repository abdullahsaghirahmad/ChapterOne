export type Pace = 'Fast' | 'Moderate' | 'Slow';

export interface Book {
  id: string;
  title: string;
  author: string;
  coverImage: string;
  pace: Pace | { type: string; value: string };
  tone: (string | { type: string; value: string })[];
  themes: (string | { type: string; value: string })[];
  description: string;
  bestFor: string[];
  professions?: string[];
  isbn?: string;
  publishedYear?: number;
  rating?: number;
  reviewSnippet?: string;
  isExternal?: boolean;
  pageCount?: number;
  categories?: string[];
  quote?: string;
}

export interface Thread {
  id: string;
  title: string;
  description: string;
  upvotes: number;
  comments: number;
  timestamp?: string;
  createdAt: string;
  updatedAt?: string;
  tags: string[];
  createdById?: string;
  createdBy: string;
  books?: Book[];
}

export interface User {
  id: string;
  username: string;
  email: string;
  displayName?: string;
  bio?: string;
  avatarUrl?: string;
  createdAt: string;
  privacySettings?: UserPrivacySettings;
  notificationSettings?: UserNotificationSettings;
  threadCount?: number;
  followingCount?: number;
  readingPreferences?: {
    favoriteGenres: string[];
    preferredPace: Pace;
    favoriteThemes: string[];
  };
  savedBooks?: string[]; // Book IDs
  savedThreads?: string[]; // Thread IDs
}

export interface UserPrivacySettings {
  profileVisible: boolean;
  readingActivityVisible: boolean;
}

export interface UserNotificationSettings {
  emailNotifications: boolean;
  inAppNotifications: boolean;
  threadComments: boolean;
  threadMentions: boolean;
  digestFrequency: 'never' | 'daily' | 'weekly' | 'monthly';
}

export interface Notification {
  id: string;
  userId: string;
  type: NotificationType;
  title: string;
  message?: string;
  data?: NotificationData;
  isRead: boolean;
  createdAt: string;
  readAt?: string;
}

export type NotificationType = 
  | 'thread_activity'
  | 'thread_mention'
  | 'thread_reply' 
  | 'upvote_milestone'
  | 'new_follower'
  | 'reading_recommendation'
  | 'weekly_digest';

export interface NotificationData {
  threadId?: string;
  threadTitle?: string;
  commentId?: string;
  userId?: string;
  username?: string;
  upvotes?: number;
  actionType?: string;
  bookId?: string;
  bookTitle?: string;
}

export interface ThreadFollow {
  id: string;
  userId: string;
  threadId: string;
  createdAt: string;
}

export interface UserMention {
  id: string;
  mentionedUserId: string;
  mentioningUserId: string;
  threadId?: string;
  commentId?: string;
  content?: string;
  createdAt: string;
}

export interface Comment {
  id: string;
  threadId: string;
  userId: string;
  parentId?: string;
  content: string;
  upvotes: number;
  isEdited: boolean;
  editedAt?: string;
  createdAt: string;
  updatedAt: string;
  // Populated from comment_details view
  username?: string;
  displayName?: string;
  avatarUrl?: string;
  depth?: number;
  replyCount?: number;
  actualUpvotes?: number;
}

export interface CommentUpvote {
  id: string;
  commentId: string;
  userId: string;
  createdAt: string;
}

export interface CommentInput {
  threadId: string;
  content: string;
  parentId?: string;
}

export interface FollowedThread {
  id: string;
  createdAt: string;
  thread: {
    id: string;
    title: string;
    description: string;
    upvotes: number;
    comments: number;
    createdAt: string;
    updatedAt: string;
    createdById: string;
    user: {
      username: string;
      displayName?: string;
      avatarUrl?: string;
    };
    threadBooks: Array<{
      book: {
        id: string;
        title: string;
        author: string;
        imageUrl?: string;
        isbn?: string;
      };
    }>;
  };
}

// Saved Books System Types
export type ReadingStatus = 'want_to_read' | 'currently_reading' | 'finished';

export interface SavedBook {
  id: string;
  userId: string;
  bookId: string;
  bookData: Book; // Full book metadata
  status: ReadingStatus;
  savedReason?: string; // User's reason for saving
  savedContext?: {
    mood?: string;
    situation?: string;
    goal?: string;
    tags?: string[];
  };
  rating?: number; // 1-5 rating after reading
  notes?: string; // User's personal notes
  createdAt: string;
  updatedAt: string;
}

export interface SaveBookRequest {
  bookId: string;
  bookData: Book;
  reason?: string;
  context?: {
    mood?: string;
    situation?: string;
    goal?: string;
  };
}

export interface LibraryStats {
  totalBooks: number;
  wantToRead: number;
  currentlyReading: number;
  finished: number;
}

export interface ReadingPreferences {
  favoriteGenres?: string[];
  preferredPace?: string;
  currentMood?: string;
  readingGoals?: {
    booksPerMonth?: number;
    preferredLength?: 'short' | 'medium' | 'long';
    primaryReasons?: string[]; // 'entertainment', 'learning', 'professional', etc.
  };
  avoidGenres?: string[];
}

// Extended User interface with reading preferences  
export interface UserWithPreferences extends Omit<User, 'readingPreferences'> {
  readingPreferences?: ReadingPreferences;
  onboardingCompleted?: boolean;
}

// User context for personalized recommendations
export interface UserContext {
  mood?: string;
  situation?: string;
  goal?: string;
  timeOfDay?: string;
  dayOfWeek?: string;
  customText?: string;
} 