import { supabase } from '../lib/supabase';

export interface AuthUser {
  id: string;
  email: string;
  user_metadata?: {
    username?: string;
    favoriteGenres?: string[];
    preferredPace?: string;
    favoriteThemes?: string[];
  };
}

export interface SignUpData {
  email: string;
  password: string;
  username: string;
  favoriteGenres?: string[];
  preferredPace?: string;
  favoriteThemes?: string[];
}

export interface SignInData {
  email: string;
  password: string;
}

export class AuthService {
  /**
   * Sign in with OAuth provider
   */
  async signInWithOAuth(provider: 'google' | 'github' | 'facebook' | 'twitter' | 'discord' | 'linkedin_oidc', redirectTo?: string): Promise<{ url: string | null; error: string | null }> {
    try {
      const { data, error } = await supabase.auth.signInWithOAuth({
        provider: provider,
        options: {
          redirectTo: redirectTo || `${process.env.FRONTEND_URL || 'http://localhost:3000'}/auth/callback`
        }
      });

      if (error) {
        return { url: null, error: error.message };
      }

      return { url: data.url, error: null };
    } catch (error) {
      console.error('Error in OAuth sign in:', error);
      return { 
        url: null, 
        error: error instanceof Error ? error.message : 'Unknown error' 
      };
    }
  }

  /**
   * Handle OAuth callback and create user profile if needed
   */
  async handleOAuthCallback(user: any): Promise<{ user: AuthUser | null; error: string | null }> {
    try {
      if (!user) {
        return { user: null, error: 'No user data provided' };
      }

      // Check if user record exists in our database
      const { data: existingUser, error: fetchError } = await supabase
        .from('user')
        .select('*')
        .eq('id', user.id)
        .single();

      if (fetchError && fetchError.code !== 'PGRST116') { // PGRST116 = no rows returned
        console.error('Error fetching user:', fetchError);
      }

      // If user doesn't exist in our table, create a record
      if (!existingUser) {
        const username = user.user_metadata?.full_name || 
                        user.user_metadata?.name || 
                        user.email?.split('@')[0] || 
                        'user';

        const { error: insertError } = await supabase
          .from('user')
          .insert([{
            id: user.id,
            username: username,
            email: user.email || '',
            password: '', // OAuth users don't have passwords
            favoriteGenres: [],
            preferredPace: null,
            favoriteThemes: [],
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
          }]);

        if (insertError) {
          console.error('Error creating user record:', insertError);
          // Don't return error here as auth was successful
        }
      }

      return { 
        user: {
          id: user.id,
          email: user.email!,
          user_metadata: user.user_metadata
        }, 
        error: null 
      };
    } catch (error) {
      console.error('Error in handleOAuthCallback:', error);
      return { 
        user: null, 
        error: error instanceof Error ? error.message : 'Unknown error' 
      };
    }
  }

  /**
   * Sign up a new user
   */
  async signUp(signUpData: SignUpData): Promise<{ user: AuthUser | null; error: string | null }> {
    try {
      const { data, error } = await supabase.auth.signUp({
        email: signUpData.email,
        password: signUpData.password,
        options: {
          data: {
            username: signUpData.username,
            favoriteGenres: signUpData.favoriteGenres || [],
            preferredPace: signUpData.preferredPace || null,
            favoriteThemes: signUpData.favoriteThemes || []
          }
        }
      });

      if (error) {
        return { user: null, error: error.message };
      }

      if (!data.user) {
        return { user: null, error: 'Failed to create user' };
      }

      // Also create a record in our user table
      const { error: insertError } = await supabase
        .from('user')
        .insert([{
          id: data.user.id,
          username: signUpData.username,
          email: signUpData.email,
          password: '', // Password is handled by Supabase Auth
          favoriteGenres: signUpData.favoriteGenres || [],
          preferredPace: signUpData.preferredPace || null,
          favoriteThemes: signUpData.favoriteThemes || [],
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        }]);

      if (insertError) {
        console.error('Error creating user record:', insertError);
        // Note: User auth was created successfully, but profile creation failed
      }

      return { 
        user: {
          id: data.user.id,
          email: data.user.email!,
          user_metadata: data.user.user_metadata
        }, 
        error: null 
      };
    } catch (error) {
      console.error('Error in signUp:', error);
      return { 
        user: null, 
        error: error instanceof Error ? error.message : 'Unknown error' 
      };
    }
  }

  /**
   * Sign in an existing user
   */
  async signIn(signInData: SignInData): Promise<{ user: AuthUser | null; session: any; error: string | null }> {
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email: signInData.email,
        password: signInData.password
      });

      if (error) {
        return { user: null, session: null, error: error.message };
      }

      if (!data.user || !data.session) {
        return { user: null, session: null, error: 'Failed to sign in' };
      }

      return { 
        user: {
          id: data.user.id,
          email: data.user.email!,
          user_metadata: data.user.user_metadata
        },
        session: data.session,
        error: null 
      };
    } catch (error) {
      console.error('Error in signIn:', error);
      return { 
        user: null, 
        session: null,
        error: error instanceof Error ? error.message : 'Unknown error' 
      };
    }
  }

  /**
   * Sign out a user
   */
  async signOut(): Promise<{ error: string | null }> {
    try {
      const { error } = await supabase.auth.signOut();
      
      if (error) {
        return { error: error.message };
      }

      return { error: null };
    } catch (error) {
      console.error('Error in signOut:', error);
      return { 
        error: error instanceof Error ? error.message : 'Unknown error' 
      };
    }
  }

  /**
   * Get current user from session
   */
  async getCurrentUser(): Promise<{ user: AuthUser | null; error: string | null }> {
    try {
      const { data: { user }, error } = await supabase.auth.getUser();

      if (error) {
        return { user: null, error: error.message };
      }

      if (!user) {
        return { user: null, error: null };
      }

      return { 
        user: {
          id: user.id,
          email: user.email!,
          user_metadata: user.user_metadata
        }, 
        error: null 
      };
    } catch (error) {
      console.error('Error in getCurrentUser:', error);
      return { 
        user: null, 
        error: error instanceof Error ? error.message : 'Unknown error' 
      };
    }
  }

  /**
   * Update user profile
   */
  async updateUserProfile(userId: string, updates: {
    username?: string;
    favoriteGenres?: string[];
    preferredPace?: string;
    favoriteThemes?: string[];
  }): Promise<{ user: any; error: string | null }> {
    try {
      // Update Supabase Auth metadata
      const { data: authData, error: authError } = await supabase.auth.updateUser({
        data: updates
      });

      if (authError) {
        return { user: null, error: authError.message };
      }

      // Update our user table
      const { data: userData, error: userError } = await supabase
        .from('user')
        .update({
          ...updates,
          updatedAt: new Date().toISOString()
        })
        .eq('id', userId)
        .select()
        .single();

      if (userError) {
        console.error('Error updating user profile:', userError);
        // Auth was updated successfully, but profile update failed
      }

      return { 
        user: authData.user, 
        error: null 
      };
    } catch (error) {
      console.error('Error in updateUserProfile:', error);
      return { 
        user: null, 
        error: error instanceof Error ? error.message : 'Unknown error' 
      };
    }
  }

  /**
   * Reset password
   */
  async resetPassword(email: string): Promise<{ error: string | null }> {
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${process.env.FRONTEND_URL || 'http://localhost:3000'}/reset-password`
      });

      if (error) {
        return { error: error.message };
      }

      return { error: null };
    } catch (error) {
      console.error('Error in resetPassword:', error);
      return { 
        error: error instanceof Error ? error.message : 'Unknown error' 
      };
    }
  }

  /**
   * Update password
   */
  async updatePassword(newPassword: string): Promise<{ error: string | null }> {
    try {
      const { error } = await supabase.auth.updateUser({
        password: newPassword
      });

      if (error) {
        return { error: error.message };
      }

      return { error: null };
    } catch (error) {
      console.error('Error in updatePassword:', error);
      return { 
        error: error instanceof Error ? error.message : 'Unknown error' 
      };
    }
  }

  /**
   * Verify JWT token from frontend
   */
  async verifyToken(token: string): Promise<{ user: AuthUser | null; error: string | null }> {
    try {
      const { data: { user }, error } = await supabase.auth.getUser(token);

      if (error) {
        return { user: null, error: error.message };
      }

      if (!user) {
        return { user: null, error: 'Invalid token' };
      }

      return { 
        user: {
          id: user.id,
          email: user.email!,
          user_metadata: user.user_metadata
        }, 
        error: null 
      };
    } catch (error) {
      console.error('Error in verifyToken:', error);
      return { 
        user: null, 
        error: error instanceof Error ? error.message : 'Unknown error' 
      };
    }
  }
} 