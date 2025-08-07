/**
 * Anonymous Session Management Service
 * 
 * Handles persistent sessions for anonymous users, browser fingerprinting,
 * and session-to-user migration when users sign up.
 */

import { supabase } from '../lib/supabase';

interface AnonymousSession {
  sessionId: string;
  fingerprint: string;
  createdAt: string;
  lastActiveAt: string;
  interactionCount: number;
  preferences?: {
    mood?: string;
    situation?: string;
    goal?: string;
    favoriteGenres?: string[];
    readingStyle?: string;
    recentInteractions?: string[];
  };
}

interface BrowserFingerprint {
  userAgent: string;
  language: string;
  platform: string;
  screenResolution: string;
  timezone: string;
  colorDepth: number;
  touchSupport: boolean;
  hash: string;
}

export class AnonymousSessionService {
  private static readonly LOG_PREFIX = '[ANONYMOUS_SESSION]';
  private static readonly STORAGE_KEY = 'chapterone_anonymous_session';
  private static readonly SESSION_EXPIRY_DAYS = 30;

  /**
   * Get or create a persistent anonymous session
   */
  static async getOrCreateSession(): Promise<AnonymousSession> {
    try {
      // Try to load existing session
      const existingSession = this.loadSessionFromStorage();
      
      if (existingSession && this.isSessionValid(existingSession)) {
        // Update last active time
        existingSession.lastActiveAt = new Date().toISOString();
        this.saveSessionToStorage(existingSession);
        
        console.log(`${this.LOG_PREFIX} Loaded existing session:`, existingSession.sessionId);
        return existingSession;
      }

      // Create new session
      const fingerprint = await this.generateBrowserFingerprint();
      const newSession: AnonymousSession = {
        sessionId: this.generateSessionId(),
        fingerprint: fingerprint.hash,
        createdAt: new Date().toISOString(),
        lastActiveAt: new Date().toISOString(),
        interactionCount: 0,
        preferences: {}
      };

      this.saveSessionToStorage(newSession);
      console.log(`${this.LOG_PREFIX} Created new session:`, newSession.sessionId);
      
      return newSession;
    } catch (error) {
      console.error(`${this.LOG_PREFIX} Error managing session:`, error);
      
      // Fallback to basic session
      return {
        sessionId: this.generateSessionId(),
        fingerprint: 'fallback',
        createdAt: new Date().toISOString(),
        lastActiveAt: new Date().toISOString(),
        interactionCount: 0,
        preferences: {}
      };
    }
  }

  /**
   * Update session with new interaction or preference data
   */
  static updateSession(updates: Partial<Omit<AnonymousSession, 'sessionId' | 'fingerprint' | 'createdAt'>>): void {
    try {
      const session = this.loadSessionFromStorage();
      if (!session) return;

      const updatedSession = {
        ...session,
        ...updates,
        lastActiveAt: new Date().toISOString(),
        interactionCount: (updates.interactionCount !== undefined) 
          ? updates.interactionCount 
          : session.interactionCount + 1
      };

      this.saveSessionToStorage(updatedSession);
      console.log(`${this.LOG_PREFIX} Updated session:`, updatedSession.sessionId);
    } catch (error) {
      console.error(`${this.LOG_PREFIX} Error updating session:`, error);
    }
  }

  /**
   * Increment interaction count for the session
   */
  static async incrementInteractionCount(sessionId: string): Promise<void> {
    try {
      const session = this.loadSessionFromStorage();
      if (!session || session.sessionId !== sessionId) {
        console.warn(`${this.LOG_PREFIX} Session mismatch or not found for interaction count`);
        return;
      }

      this.updateSession({ 
        interactionCount: session.interactionCount + 1 
      });
      
      console.log(`${this.LOG_PREFIX} Incremented interaction count for session ${sessionId}:`, session.interactionCount + 1);
    } catch (error) {
      console.error(`${this.LOG_PREFIX} Error incrementing interaction count:`, error);
    }
  }

  /**
   * Migrate anonymous session data to authenticated user
   */
  static async migrateSessionToUser(userId: string): Promise<boolean> {
    try {
      const session = this.loadSessionFromStorage();
      if (!session) {
        console.log(`${this.LOG_PREFIX} No session to migrate`);
        return false;
      }

      console.log(`${this.LOG_PREFIX} Migrating session ${session.sessionId} to user ${userId}`);

      // 1. Migrate contextual bandit models
      await this.migrateBanditModels(session.sessionId, userId);

      // 2. Migrate recommendation impressions and actions
      await this.migrateRecommendationData(session.sessionId, userId);

      // 3. Migrate user preferences if any
      if (session.preferences && Object.keys(session.preferences).length > 0) {
        await this.migratePreferences(session.preferences, userId);
      }

      // 4. Clear anonymous session
      this.clearSession();

      console.log(`${this.LOG_PREFIX} Successfully migrated session to user ${userId}`);
      return true;
    } catch (error) {
      console.error(`${this.LOG_PREFIX} Error migrating session:`, error);
      return false;
    }
  }

  /**
   * Clear current anonymous session
   */
  static clearSession(): void {
    try {
      localStorage.removeItem(this.STORAGE_KEY);
      console.log(`${this.LOG_PREFIX} Cleared anonymous session`);
    } catch (error) {
      console.error(`${this.LOG_PREFIX} Error clearing session:`, error);
    }
  }

  /**
   * Get session ID for current anonymous session
   */
  static getCurrentSessionId(): string | null {
    const session = this.loadSessionFromStorage();
    return session?.sessionId || null;
  }

  // Private helper methods

  private static generateSessionId(): string {
    const timestamp = Date.now().toString(36);
    const random = Math.random().toString(36).substr(2, 9);
    return `anon_${timestamp}_${random}`;
  }

  private static async generateBrowserFingerprint(): Promise<BrowserFingerprint> {
    const nav = navigator;
    const screen = window.screen;

    const fingerprint: Omit<BrowserFingerprint, 'hash'> = {
      userAgent: nav.userAgent,
      language: nav.language,
      platform: nav.platform,
      screenResolution: `${screen.width}x${screen.height}`,
      timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
      colorDepth: screen.colorDepth,
      touchSupport: 'ontouchstart' in window
    };

    // Generate hash from fingerprint components
    const fingerprintString = JSON.stringify(fingerprint);
    const hash = await this.simpleHash(fingerprintString);

    return {
      ...fingerprint,
      hash
    };
  }

  private static async simpleHash(str: string): Promise<string> {
    const encoder = new TextEncoder();
    const data = encoder.encode(str);
    const hashBuffer = await crypto.subtle.digest('SHA-256', data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
  }

  private static loadSessionFromStorage(): AnonymousSession | null {
    try {
      const stored = localStorage.getItem(this.STORAGE_KEY);
      if (!stored) return null;

      return JSON.parse(stored) as AnonymousSession;
    } catch (error) {
      console.error(`${this.LOG_PREFIX} Error loading session from storage:`, error);
      return null;
    }
  }

  private static saveSessionToStorage(session: AnonymousSession): void {
    try {
      localStorage.setItem(this.STORAGE_KEY, JSON.stringify(session));
    } catch (error) {
      console.error(`${this.LOG_PREFIX} Error saving session to storage:`, error);
    }
  }

  private static isSessionValid(session: AnonymousSession): boolean {
    const expiry = new Date(session.createdAt);
    expiry.setDate(expiry.getDate() + this.SESSION_EXPIRY_DAYS);
    
    return new Date() < expiry;
  }

  private static async migrateBanditModels(sessionId: string, userId: string): Promise<void> {
    try {
      // Update user_contextual_preferences from session to user
      const { error } = await supabase
        .from('user_contextual_preferences')
        .update({ user_id: userId })
        .eq('user_id', sessionId);

      if (error) {
        console.warn(`${this.LOG_PREFIX} Error migrating bandit models:`, error);
      }
    } catch (error) {
      console.error(`${this.LOG_PREFIX} Error in migrateBanditModels:`, error);
    }
  }

  private static async migrateRecommendationData(sessionId: string, userId: string): Promise<void> {
    try {
      // Migrate impressions
      await supabase
        .from('recommendation_impressions')
        .update({ user_id: userId })
        .eq('session_id', sessionId);

      // Migrate actions  
      await supabase
        .from('recommendation_actions')
        .update({ user_id: userId })
        .eq('session_id', sessionId);

      console.log(`${this.LOG_PREFIX} Migrated recommendation data for session ${sessionId}`);
    } catch (error) {
      console.error(`${this.LOG_PREFIX} Error migrating recommendation data:`, error);
    }
  }

  private static async migratePreferences(preferences: AnonymousSession['preferences'], userId: string): Promise<void> {
    try {
      if (!preferences) return;

      // Store preferences in user profile or preferences table
      // This would depend on your user preferences schema
      console.log(`${this.LOG_PREFIX} Would migrate preferences:`, preferences, 'to user:', userId);
      
      // TODO: Implement based on your user preferences schema
    } catch (error) {
      console.error(`${this.LOG_PREFIX} Error migrating preferences:`, error);
    }
  }
}