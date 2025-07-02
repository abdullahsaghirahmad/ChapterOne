# Social Authentication Setup Guide

This guide will help you set up social login with Google, GitHub, and Discord for your ChapterOne application using Supabase.

## Prerequisites

- Supabase project set up and running
- Frontend and backend applications configured
- Access to the provider platforms (Google Cloud Console, GitHub, Discord Developer Portal)

## 1. Supabase Configuration

### 1.1 Access Authentication Settings
1. Go to your [Supabase Dashboard](https://supabase.com/dashboard)
2. Select your project
3. Navigate to **Authentication** → **Providers**

### 1.2 Configure Site URL
1. Go to **Authentication** → **URL Configuration**
2. Set your Site URL to: `http://localhost:3000` (for development)
3. Add redirect URLs:
   - `http://localhost:3000/auth/callback`
   - `https://yourdomain.com/auth/callback` (for production)

## 2. Google OAuth Setup

### 2.1 Create Google OAuth Application
1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project or select an existing one
3. Enable the **Google+ API**
4. Go to **Credentials** → **Create Credentials** → **OAuth 2.0 Client IDs**
5. Set application type to **Web application**
6. Add authorized redirect URIs:
   ```
   https://[your-supabase-project-ref].supabase.co/auth/v1/callback
   ```

### 2.2 Configure in Supabase
1. In Supabase Dashboard, go to **Authentication** → **Providers**
2. Find **Google** and toggle it on
3. Enter your Google OAuth credentials:
   - **Client ID**: From Google Cloud Console
   - **Client Secret**: From Google Cloud Console

## 3. GitHub OAuth Setup

### 3.1 Create GitHub OAuth App
1. Go to [GitHub Settings](https://github.com/settings/applications/new)
2. Click **New OAuth App**
3. Fill in the details:
   - **Application name**: ChapterOne
   - **Homepage URL**: `http://localhost:3000`
   - **Authorization callback URL**: 
     ```
     https://[your-supabase-project-ref].supabase.co/auth/v1/callback
     ```

### 3.2 Configure in Supabase
1. In Supabase Dashboard, go to **Authentication** → **Providers**
2. Find **GitHub** and toggle it on
3. Enter your GitHub OAuth credentials:
   - **Client ID**: From GitHub OAuth App
   - **Client Secret**: From GitHub OAuth App

## 4. Discord OAuth Setup

### 4.1 Create Discord Application
1. Go to [Discord Developer Portal](https://discord.com/developers/applications)
2. Click **New Application**
3. Name your application "ChapterOne"
4. Go to **OAuth2** section
5. Add redirect URI:
   ```
   https://[your-supabase-project-ref].supabase.co/auth/v1/callback
   ```

### 4.2 Configure in Supabase
1. In Supabase Dashboard, go to **Authentication** → **Providers**
2. Find **Discord** and toggle it on
3. Enter your Discord OAuth credentials:
   - **Client ID**: From Discord Application
   - **Client Secret**: From Discord Application

## 5. Environment Variables

Update your environment files with the necessary configurations:

### Backend (.env)
```env
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
FRONTEND_URL=http://localhost:3000
```

### Frontend (.env or .env.local)
```env
REACT_APP_SUPABASE_URL=https://your-project.supabase.co
REACT_APP_SUPABASE_ANON_KEY=your-anon-key
```

## 6. Testing Social Authentication

### 6.1 Start Your Applications
```bash
# Terminal 1 - Backend
cd backend
npm run dev:supabase

# Terminal 2 - Frontend
npm start
```

### 6.2 Test Authentication Flow
1. Visit `http://localhost:3000`
2. Click **Sign In** button
3. Try social login with Google, GitHub, or Discord
4. Verify redirect to `/auth/callback`
5. Check that user is logged in and appears in navigation

### 6.3 Verify Database Records
1. Go to Supabase Dashboard → **Table Editor**
2. Check the `user` table for new records
3. Verify user metadata is populated correctly

## 7. Production Deployment

### 7.1 Update OAuth Provider Settings
For each OAuth provider, update the callback URLs to your production domain:
```
https://yourdomain.com
https://your-supabase-project.supabase.co/auth/v1/callback
```

### 7.2 Update Supabase Site URL
1. In Supabase Dashboard → **Authentication** → **URL Configuration**
2. Update Site URL to your production domain
3. Add production callback URL to redirect URLs

### 7.3 Environment Variables
Update your production environment variables with the correct URLs and keys.

## 8. Troubleshooting

### Common Issues

#### "Invalid Redirect URI"
- Ensure callback URLs match exactly in OAuth provider settings
- Check for trailing slashes
- Verify HTTP vs HTTPS

#### "User Not Created in Database"
- Check backend logs for database insertion errors
- Verify user table permissions
- Ensure Supabase service role key is correct

#### "OAuth Provider Not Found"
- Verify provider is enabled in Supabase Dashboard
- Check client ID and secret are correct
- Ensure provider-specific APIs are enabled

#### "Session Not Persisting"
- Check if cookies are being blocked
- Verify domain settings in production
- Check browser console for auth errors

### Debug Tips
1. Check browser developer tools for network errors
2. Monitor Supabase auth logs
3. Enable verbose logging in your application
4. Test with different browsers/incognito mode

## 9. Security Considerations

### Best Practices
1. **Environment Variables**: Never commit OAuth secrets to version control
2. **HTTPS**: Always use HTTPS in production
3. **Domain Validation**: Ensure redirect URIs are exact matches
4. **Rate Limiting**: Implement rate limiting for auth endpoints
5. **User Permissions**: Set appropriate RLS policies in Supabase

### Supabase Row Level Security (RLS)
Enable RLS on your user table and create policies:

```sql
-- Enable RLS
ALTER TABLE "user" ENABLE ROW LEVEL SECURITY;

-- Policy for users to read their own data
CREATE POLICY "Users can view their own data" ON "user"
  FOR SELECT USING (auth.uid() = id);

-- Policy for users to update their own data
CREATE POLICY "Users can update their own data" ON "user"
  FOR UPDATE USING (auth.uid() = id);
```

## 10. Additional Features

### Profile Completion Flow
Consider implementing a profile completion flow for OAuth users:
1. Check if user has completed profile setup
2. Redirect to profile completion page if needed
3. Update user metadata and database record

### Social Login Analytics
Track social login usage:
1. Monitor which providers are most popular
2. Track conversion rates
3. Analyze user engagement by auth method

---

## Support

If you encounter issues:
1. Check the [Supabase Documentation](https://supabase.com/docs/guides/auth)
2. Review the [OAuth Provider Documentation](#provider-docs)
3. Check the application logs for detailed error messages

### Provider Documentation Links
- [Google OAuth 2.0](https://developers.google.com/identity/protocols/oauth2)
- [GitHub OAuth Apps](https://docs.github.com/en/developers/apps/building-oauth-apps)
- [Discord OAuth2](https://discord.com/developers/docs/topics/oauth2) 