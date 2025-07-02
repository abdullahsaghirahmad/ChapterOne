import React, { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { auth } from '../services/api.supabase';

interface User {
  id: string;
  email: string;
  user_metadata?: {
    username?: string;
    full_name?: string;
    name?: string;
    avatar_url?: string;
    favoriteGenres?: string[];
    preferredPace?: string;
    favoriteThemes?: string[];
  };
}

interface AuthContextType {
  user: User | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (email: string, password: string, username: string) => Promise<void>;
  signOut: () => Promise<void>;
  signInWithOAuth: (provider: 'google' | 'github' | 'facebook' | 'twitter' | 'discord' | 'linkedin_oidc') => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

interface AuthProviderProps {
  children: ReactNode;
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  // Check for existing session on mount
  useEffect(() => {
    const getSession = async () => {
      try {
        const session = await auth.getSession();
        if (session?.user) {
          setUser({
            id: session.user.id,
            email: session.user.email!,
            user_metadata: session.user.user_metadata
          });
        }
      } catch (error) {
        console.error('Error getting session:', error);
      } finally {
        setLoading(false);
      }
    };

    getSession();
  }, []);

  // Listen for auth state changes
  useEffect(() => {
    const { unsubscribe } = auth.onAuthStateChange((event, session) => {
      console.log('Auth state changed:', event, session);
      
      if (session?.user) {
        setUser({
          id: session.user.id,
          email: session.user.email!,
          user_metadata: session.user.user_metadata
        });
      } else {
        setUser(null);
      }
      
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const handleSignIn = async (email: string, password: string) => {
    try {
      const result = await auth.signIn(email, password);
      console.log('Sign in successful:', result);
    } catch (error) {
      console.error('Sign in error:', error);
      throw error;
    }
  };

  const handleSignUp = async (email: string, password: string, username: string) => {
    try {
      const result = await auth.signUp(email, password, username);
      console.log('Sign up successful:', result);
    } catch (error) {
      console.error('Sign up error:', error);
      throw error;
    }
  };

  const handleSignOut = async () => {
    try {
      await auth.signOut();
      setUser(null);
    } catch (error) {
      console.error('Sign out error:', error);
      throw error;
    }
  };

  const handleSignInWithOAuth = async (provider: 'google' | 'github' | 'facebook' | 'twitter' | 'discord' | 'linkedin_oidc') => {
    try {
      const result = await auth.signInWithOAuth(provider);
      console.log('OAuth initiated:', result);
      // The actual authentication will happen via redirect
    } catch (error) {
      console.error('OAuth error:', error);
      throw error;
    }
  };

  const value: AuthContextType = {
    user,
    loading,
    signIn: handleSignIn,
    signUp: handleSignUp,
    signOut: handleSignOut,
    signInWithOAuth: handleSignInWithOAuth
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}; 