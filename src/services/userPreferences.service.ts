import { supabase } from '../lib/supabase';
import { ReadingPreferences, UserWithPreferences } from '../types';

export class UserPreferencesService {
  // Save user reading preferences
  static async savePreferences(preferences: ReadingPreferences): Promise<void> {
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      throw new Error('Must be logged in to save preferences');
    }

    const { error } = await supabase
      .from('user')
      .update({
        reading_preferences: preferences,
        onboarding_completed: true
      })
      .eq('id', user.id);

    if (error) {
      throw new Error(`Failed to save preferences: ${error.message}`);
    }
  }

  // Get user reading preferences
  static async getPreferences(): Promise<ReadingPreferences | null> {
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      return null;
    }

    const { data, error } = await supabase
      .from('user')
      .select('reading_preferences')
      .eq('id', user.id)
      .single();

    if (error) {
      console.error('Error getting preferences:', error);
      return null;
    }

    return data?.reading_preferences || null;
  }

  // Check if user has completed onboarding
  static async hasCompletedOnboarding(): Promise<boolean> {
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      return false;
    }

    const { data, error } = await supabase
      .from('user')
      .select('onboarding_completed')
      .eq('id', user.id)
      .single();

    if (error) {
      console.error('Error checking onboarding status:', error);
      return false;
    }

    return data?.onboarding_completed || false;
  }

  // Get user with preferences
  static async getUserWithPreferences(): Promise<UserWithPreferences | null> {
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      return null;
    }

    const { data, error } = await supabase
      .from('user')
      .select('*')
      .eq('id', user.id)
      .single();

    if (error) {
      console.error('Error getting user with preferences:', error);
      return null;
    }

    return {
      id: data.id,
      email: user.email || '', // Get email from auth user
      username: data.username,
      displayName: data.display_name,
      bio: data.bio,
      avatarUrl: data.avatar_url,
      createdAt: data.created_at,
      privacySettings: data.privacy_settings,
      notificationSettings: data.notification_settings,
      threadCount: 0, // TODO: Get actual count
      followingCount: 0, // TODO: Get actual count
      readingPreferences: data.reading_preferences,
      onboardingCompleted: data.onboarding_completed
    };
  }

  // Update current mood (quick preference update)
  static async updateCurrentMood(mood: string): Promise<void> {
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      throw new Error('Must be logged in to update mood');
    }

    // Get current preferences
    const currentPrefs = await this.getPreferences() || {};
    
    // Update mood
    const updatedPrefs = {
      ...currentPrefs,
      currentMood: mood
    };

    await this.savePreferences(updatedPrefs);
  }

  // Get reading recommendations based on preferences
  static async getPersonalizedRecommendationContext(): Promise<{
    genres: string[];
    pace: string;
    mood: string;
    reasons: string[];
  }> {
    const preferences = await this.getPreferences();
    
    if (!preferences) {
      return {
        genres: [],
        pace: 'moderate',
        mood: '',
        reasons: []
      };
    }

    return {
      genres: preferences.favoriteGenres || [],
      pace: preferences.preferredPace || 'moderate',
      mood: preferences.currentMood || '',
      reasons: preferences.readingGoals?.primaryReasons || []
    };
  }
}