import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'https://lrnxluoicdtonxrbteit.supabase.co'
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImxybnhsdW9pY2R0b254cmJ0ZWl0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTE0Nzc1MTIsImV4cCI6MjA2NzA1MzUxMn0.yWiRPG5ABO2mXBtwgkZquLG0EnKmPDkj2UIVfRj8Yyk'

export const supabase = createClient(supabaseUrl, supabaseAnonKey)

// Database Types (based on our schema)
export interface Database {
  public: {
    Tables: {
      user: {
        Row: {
          id: string
          username: string
          email: string
          password: string
          favoriteGenres: string[] | null
          preferredPace: string | null
          favoriteThemes: string[] | null
          createdAt: string
          updatedAt: string
        }
        Insert: {
          id?: string
          username: string
          email: string
          password: string
          favoriteGenres?: string[] | null
          preferredPace?: string | null
          favoriteThemes?: string[] | null
          createdAt?: string
          updatedAt?: string
        }
        Update: {
          id?: string
          username?: string
          email?: string
          password?: string
          favoriteGenres?: string[] | null
          preferredPace?: string | null
          favoriteThemes?: string[] | null
          createdAt?: string
          updatedAt?: string
        }
      }
      book: {
        Row: {
          id: string
          title: string
          author: string
          isbn: string | null
          publishedYear: string | null
          coverImage: string | null
          rating: number | null
          description: string | null
          pace: 'Fast' | 'Moderate' | 'Slow' | null
          tone: string[] | null
          themes: string[] | null
          bestFor: string[] | null
          categories: string[] | null
          professions: string[] | null
          pageCount: number | null
          createdAt: string
          updatedAt: string
        }
        Insert: {
          id?: string
          title: string
          author: string
          isbn?: string | null
          publishedYear?: string | null
          coverImage?: string | null
          rating?: number | null
          description?: string | null
          pace?: 'Fast' | 'Moderate' | 'Slow' | null
          tone?: string[] | null
          themes?: string[] | null
          bestFor?: string[] | null
          categories?: string[] | null
          professions?: string[] | null
          pageCount?: number | null
          createdAt?: string
          updatedAt?: string
        }
        Update: {
          id?: string
          title?: string
          author?: string
          isbn?: string | null
          publishedYear?: string | null
          coverImage?: string | null
          rating?: number | null
          description?: string | null
          pace?: 'Fast' | 'Moderate' | 'Slow' | null
          tone?: string[] | null
          themes?: string[] | null
          bestFor?: string[] | null
          categories?: string[] | null
          professions?: string[] | null
          pageCount?: number | null
          createdAt?: string
          updatedAt?: string
        }
      }
      thread: {
        Row: {
          id: string
          title: string
          description: string
          upvotes: number
          comments: number
          tags: string[] | null
          createdById: string | null
          createdAt: string
          updatedAt: string
        }
        Insert: {
          id?: string
          title: string
          description: string
          upvotes?: number
          comments?: number
          tags?: string[] | null
          createdById?: string | null
          createdAt?: string
          updatedAt?: string
        }
        Update: {
          id?: string
          title?: string
          description?: string
          upvotes?: number
          comments?: number
          tags?: string[] | null
          createdById?: string | null
          createdAt?: string
          updatedAt?: string
        }
      }
      thread_books_book: {
        Row: {
          id: string
          threadId: string
          bookId: string
          createdAt: string
        }
        Insert: {
          id?: string
          threadId: string
          bookId: string
          createdAt?: string
        }
        Update: {
          id?: string
          threadId?: string
          bookId?: string
          createdAt?: string
        }
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      [_ in never]: never
    }
  }
} 