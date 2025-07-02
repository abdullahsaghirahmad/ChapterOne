import { Router } from 'express';
import { AuthService } from '../services/auth.service.supabase';

const router = Router();
const authService = new AuthService();

/**
 * POST /api/auth/signup
 * Register a new user
 */
router.post('/signup', async (req, res) => {
  try {
    const { email, password, username, favoriteGenres, preferredPace, favoriteThemes } = req.body;

    // Validate required fields
    if (!email || !password || !username) {
      return res.status(400).json({ 
        message: 'Email, password, and username are required' 
      });
    }

    const { user, error } = await authService.signUp({
      email,
      password,
      username,
      favoriteGenres,
      preferredPace,
      favoriteThemes
    });

    if (error) {
      return res.status(400).json({ message: error });
    }

    res.status(201).json({ 
      message: 'User created successfully. Please check your email to confirm your account.',
      user 
    });
  } catch (error) {
    console.error('Error in signup:', error);
    res.status(500).json({ 
      message: 'Failed to create user', 
      error: error instanceof Error ? error.message : 'Unknown error' 
    });
  }
});

/**
 * POST /api/auth/signin
 * Sign in an existing user
 */
router.post('/signin', async (req, res) => {
  try {
    const { email, password } = req.body;

    // Validate required fields
    if (!email || !password) {
      return res.status(400).json({ 
        message: 'Email and password are required' 
      });
    }

    const { user, session, error } = await authService.signIn({ email, password });

    if (error) {
      return res.status(401).json({ message: error });
    }

    res.json({ 
      message: 'Signed in successfully',
      user,
      session
    });
  } catch (error) {
    console.error('Error in signin:', error);
    res.status(500).json({ 
      message: 'Failed to sign in', 
      error: error instanceof Error ? error.message : 'Unknown error' 
    });
  }
});

/**
 * POST /api/auth/signout
 * Sign out the current user
 */
router.post('/signout', async (req, res) => {
  try {
    const { error } = await authService.signOut();

    if (error) {
      return res.status(400).json({ message: error });
    }

    res.json({ message: 'Signed out successfully' });
  } catch (error) {
    console.error('Error in signout:', error);
    res.status(500).json({ 
      message: 'Failed to sign out', 
      error: error instanceof Error ? error.message : 'Unknown error' 
    });
  }
});

/**
 * GET /api/auth/user
 * Get current user information
 */
router.get('/user', async (req, res) => {
  try {
    // Extract token from Authorization header
    const token = req.headers.authorization?.replace('Bearer ', '');
    
    if (!token) {
      return res.status(401).json({ message: 'No token provided' });
    }

    const { user, error } = await authService.verifyToken(token);

    if (error) {
      return res.status(401).json({ message: error });
    }

    res.json({ user });
  } catch (error) {
    console.error('Error in get user:', error);
    res.status(500).json({ 
      message: 'Failed to get user', 
      error: error instanceof Error ? error.message : 'Unknown error' 
    });
  }
});

/**
 * PUT /api/auth/user
 * Update user profile
 */
router.put('/user', async (req, res) => {
  try {
    // Extract token from Authorization header
    const token = req.headers.authorization?.replace('Bearer ', '');
    
    if (!token) {
      return res.status(401).json({ message: 'No token provided' });
    }

    // Verify token and get user ID
    const { user: currentUser, error: tokenError } = await authService.verifyToken(token);

    if (tokenError || !currentUser) {
      return res.status(401).json({ message: 'Invalid token' });
    }

    const { username, favoriteGenres, preferredPace, favoriteThemes } = req.body;

    const { user, error } = await authService.updateUserProfile(currentUser.id, {
      username,
      favoriteGenres,
      preferredPace,
      favoriteThemes
    });

    if (error) {
      return res.status(400).json({ message: error });
    }

    res.json({ 
      message: 'Profile updated successfully',
      user 
    });
  } catch (error) {
    console.error('Error in update user:', error);
    res.status(500).json({ 
      message: 'Failed to update profile', 
      error: error instanceof Error ? error.message : 'Unknown error' 
    });
  }
});

/**
 * POST /api/auth/oauth/:provider
 * Initiate OAuth sign in with provider
 */
router.post('/oauth/:provider', async (req, res) => {
  try {
    const { provider } = req.params;
    const { redirectTo } = req.body;

    // Validate provider
    const validProviders = ['google', 'github', 'facebook', 'twitter', 'discord'];
    if (!validProviders.includes(provider)) {
      return res.status(400).json({ 
        message: 'Invalid OAuth provider. Supported providers: ' + validProviders.join(', ')
      });
    }

    const { url, error } = await authService.signInWithOAuth(
      provider as 'google' | 'github' | 'facebook' | 'twitter' | 'discord',
      redirectTo
    );

    if (error) {
      return res.status(400).json({ message: error });
    }

    res.json({ 
      message: 'OAuth URL generated successfully',
      url 
    });
  } catch (error) {
    console.error('Error in OAuth initiation:', error);
    res.status(500).json({ 
      message: 'Failed to initiate OAuth', 
      error: error instanceof Error ? error.message : 'Unknown error' 
    });
  }
});

/**
 * POST /api/auth/oauth/callback
 * Handle OAuth callback
 */
router.post('/oauth/callback', async (req, res) => {
  try {
    const { user: userData } = req.body;

    if (!userData) {
      return res.status(400).json({ message: 'User data is required' });
    }

    const { user, error } = await authService.handleOAuthCallback(userData);

    if (error) {
      return res.status(400).json({ message: error });
    }

    res.json({ 
      message: 'OAuth authentication successful',
      user 
    });
  } catch (error) {
    console.error('Error in OAuth callback:', error);
    res.status(500).json({ 
      message: 'Failed to handle OAuth callback', 
      error: error instanceof Error ? error.message : 'Unknown error' 
    });
  }
});

/**
 * POST /api/auth/reset-password
 * Request password reset
 */
router.post('/reset-password', async (req, res) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({ message: 'Email is required' });
    }

    const { error } = await authService.resetPassword(email);

    if (error) {
      return res.status(400).json({ message: error });
    }

    res.json({ 
      message: 'Password reset email sent. Please check your inbox.' 
    });
  } catch (error) {
    console.error('Error in reset password:', error);
    res.status(500).json({ 
      message: 'Failed to send reset email', 
      error: error instanceof Error ? error.message : 'Unknown error' 
    });
  }
});

/**
 * POST /api/auth/update-password
 * Update password (for authenticated users)
 */
router.post('/update-password', async (req, res) => {
  try {
    // Extract token from Authorization header
    const token = req.headers.authorization?.replace('Bearer ', '');
    
    if (!token) {
      return res.status(401).json({ message: 'No token provided' });
    }

    // Verify token
    const { user, error: tokenError } = await authService.verifyToken(token);

    if (tokenError || !user) {
      return res.status(401).json({ message: 'Invalid token' });
    }

    const { password } = req.body;

    if (!password) {
      return res.status(400).json({ message: 'New password is required' });
    }

    if (password.length < 6) {
      return res.status(400).json({ message: 'Password must be at least 6 characters long' });
    }

    const { error } = await authService.updatePassword(password);

    if (error) {
      return res.status(400).json({ message: error });
    }

    res.json({ 
      message: 'Password updated successfully' 
    });
  } catch (error) {
    console.error('Error in update password:', error);
    res.status(500).json({ 
      message: 'Failed to update password', 
      error: error instanceof Error ? error.message : 'Unknown error' 
    });
  }
});

export default router; 