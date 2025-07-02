import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'

dotenv.config()

const supabaseUrl = process.env.SUPABASE_URL || 'https://lrnxluoicdtonxrbteit.supabase.co'
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || 'your-service-role-key-here'

// Create Supabase client with service role for backend operations
export const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
})

// Types for backend use
export interface Book {
  id: string
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
  createdAt: string
  updatedAt: string
}

export interface Thread {
  id: string
  title: string
  description: string
  upvotes: number
  comments: number
  tags?: string[] | null
  createdById?: string | null
  createdAt: string
  updatedAt: string
}

export interface User {
  id: string
  username: string
  email: string
  favoriteGenres?: string[] | null
  preferredPace?: string | null
  favoriteThemes?: string[] | null
  createdAt: string
  updatedAt: string
} 