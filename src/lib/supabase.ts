import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.REACT_APP_SUPABASE_URL || 'https://lrnxluoicdtonxrbteit.supabase.co'
const supabaseAnonKey = process.env.REACT_APP_SUPABASE_ANON_KEY || 'your-anon-key-here'

// Debug: Log the values being used
console.log('Supabase URL:', supabaseUrl)
console.log('Supabase Anon Key:', supabaseAnonKey ? supabaseAnonKey.substring(0, 20) + '...' : 'NOT SET')

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