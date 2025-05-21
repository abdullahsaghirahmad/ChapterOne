export type Pace = 'Fast' | 'Moderate' | 'Slow';

export interface Book {
  id: string;
  title: string;
  author: string;
  coverImage: string;
  pace: Pace;
  tone: string[];
  themes: string[];
  description: string;
  bestFor: string[];
  isbn?: string;
  publishedYear?: number;
  rating?: number;
  reviewSnippet?: string;
  isExternal?: boolean;
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
  readingPreferences?: {
    favoriteGenres: string[];
    preferredPace: Pace;
    favoriteThemes: string[];
  };
  savedBooks?: string[]; // Book IDs
  savedThreads?: string[]; // Thread IDs
} 