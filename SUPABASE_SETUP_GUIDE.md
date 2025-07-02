# 🚀 Complete Supabase Setup Guide for New Projects

> **Save this file for future projects!** A comprehensive, step-by-step guide to set up Supabase with any new project.

## 📋 Prerequisites

```bash
# Install required tools
npm install -g supabase

# Verify versions
node --version  # Should be 16+ 
npm --version   # Should be 8+
```

---

## 🎯 Phase 1: Supabase Project Setup

### Step 1: Create Supabase Project

1. Go to: https://supabase.com/dashboard
2. Click **"New Project"**
3. Fill in project details:
   - **Name**: your-project-name
   - **Database Password**: Generate a strong password
   - **Region**: Choose closest to your users
4. Wait 2-3 minutes for project creation
5. **Save your project URL**: `https://supabase.com/dashboard/project/YOUR_PROJECT_ID`

### Step 2: Get API Keys

1. In Supabase dashboard: **Settings → API**
2. Copy these keys:
   - **Project URL**: `https://YOUR_PROJECT_ID.supabase.co`
   - **anon public key**: `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...`
   - **service_role secret key**: `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...`

---

## 🎯 Phase 2: Local Development Setup

### Step 3: Initialize Supabase in Your Project

```bash
# Navigate to your project root
cd your-project-directory

# Initialize Supabase
supabase init

# Login to Supabase CLI
supabase login

# Link to your remote project (replace YOUR_PROJECT_ID)
supabase link --project-ref YOUR_PROJECT_ID
```

### Step 4: Environment Configuration

**Create Backend Environment File:**

```bash
# Create backend environment file
cat > backend/.env << 'EOF'
# Supabase Configuration
SUPABASE_URL=https://YOUR_PROJECT_ID.supabase.co
SUPABASE_ANON_KEY=your_anon_public_key_here
SUPABASE_SERVICE_ROLE_KEY=your_service_role_secret_key_here

# Server Configuration
PORT=3001
NODE_ENV=development
FRONTEND_URL=http://localhost:3000,http://localhost:3002
EOF
```

**Create Frontend Environment File:**

```bash
# Create frontend environment file
cat > .env.local << 'EOF'
REACT_APP_SUPABASE_URL=https://YOUR_PROJECT_ID.supabase.co
REACT_APP_SUPABASE_ANON_KEY=your_anon_public_key_here
EOF
```

---

## 🎯 Phase 3: Database Schema Setup

### Step 5: Create Database Migration

```bash
# Create a new migration file
supabase migration new create_initial_schema
```

### Step 6: Define Your Schema

```bash
# Edit the migration file (replace TIMESTAMP with actual timestamp)
nano supabase/migrations/*_create_initial_schema.sql
```

**Example Schema (copy into migration file):**

```sql
-- Enable necessary extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Create users table
CREATE TABLE public.users (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    email VARCHAR(255) UNIQUE NOT NULL,
    username VARCHAR(100) UNIQUE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create your main entity table
CREATE TABLE public.your_main_entity (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    created_by UUID REFERENCES public.users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for performance
CREATE INDEX idx_your_main_entity_created_by ON public.your_main_entity(created_by);
CREATE INDEX idx_your_main_entity_created_at ON public.your_main_entity(created_at);

-- Enable Row Level Security (RLS)
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.your_main_entity ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
CREATE POLICY "Users can view their own profile" ON public.users
    FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Users can update their own profile" ON public.users
    FOR UPDATE USING (auth.uid() = id);

CREATE POLICY "Anyone can view public entities" ON public.your_main_entity
    FOR SELECT USING (true);

CREATE POLICY "Authenticated users can create entities" ON public.your_main_entity
    FOR INSERT WITH CHECK (auth.role() = 'authenticated');
```

### Step 7: Apply Migration

```bash
# Push migration to remote Supabase
supabase db push

# Verify the migration worked
supabase db diff

# Check tables were created
supabase db psql
```

**In psql:**
```sql
\dt
\q
```

---

## 🎯 Phase 4: Backend Integration

### Step 8: Install Supabase Dependencies

```bash
cd backend
npm install @supabase/supabase-js
npm install --save-dev @types/node typescript ts-node-dev
```

### Step 9: Create Supabase Client

```bash
# Create lib directory
mkdir -p src/lib

# Create Supabase client file
cat > src/lib/supabase.ts << 'EOF'
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

const supabaseUrl = process.env.SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

if (!supabaseUrl || !supabaseServiceKey) {
  throw new Error('Missing Supabase environment variables');
}

export const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

// For client-side usage (with anon key)
export const supabaseClient = createClient(
  supabaseUrl, 
  process.env.SUPABASE_ANON_KEY!
);
EOF
```

### Step 10: Create Service Layer

```bash
# Create services directory
mkdir -p src/services

# Create entity service file
cat > src/services/entity.service.supabase.ts << 'EOF'
import { supabase } from '../lib/supabase';

export interface YourEntity {
  id: string;
  title: string;
  description?: string;
  created_by?: string;
  created_at: string;
  updated_at: string;
}

export class EntityService {
  static async getAll(): Promise<YourEntity[]> {
    const { data, error } = await supabase
      .from('your_main_entity')
      .select('*')
      .order('created_at', { ascending: false });
    
    if (error) throw error;
    return data || [];
  }

  static async getById(id: string): Promise<YourEntity | null> {
    const { data, error } = await supabase
      .from('your_main_entity')
      .select('*')
      .eq('id', id)
      .single();
    
    if (error && error.code !== 'PGRST116') throw error;
    return data;
  }

  static async create(entity: Omit<YourEntity, 'id' | 'created_at' | 'updated_at'>): Promise<YourEntity> {
    const { data, error } = await supabase
      .from('your_main_entity')
      .insert([entity])
      .select()
      .single();
    
    if (error) throw error;
    return data;
  }

  static async update(id: string, updates: Partial<YourEntity>): Promise<YourEntity> {
    const { data, error } = await supabase
      .from('your_main_entity')
      .update({ ...updates, updated_at: new Date().toISOString() })
      .eq('id', id)
      .select()
      .single();
    
    if (error) throw error;
    return data;
  }

  static async delete(id: string): Promise<void> {
    const { error } = await supabase
      .from('your_main_entity')
      .delete()
      .eq('id', id);
    
    if (error) throw error;
  }

  static async search(query: string): Promise<YourEntity[]> {
    const { data, error } = await supabase
      .from('your_main_entity')
      .select('*')
      .or(`title.ilike.%${query}%,description.ilike.%${query}%`)
      .order('created_at', { ascending: false });
    
    if (error) throw error;
    return data || [];
  }
}
EOF
```

### Step 11: Create API Routes

```bash
# Create routes directory
mkdir -p src/routes

# Create entity routes file
cat > src/routes/entity.routes.supabase.ts << 'EOF'
import { Router } from 'express';
import { EntityService } from '../services/entity.service.supabase';

const router = Router();

// GET /api/entities
router.get('/', async (req, res) => {
  try {
    const entities = await EntityService.getAll();
    res.json(entities);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch entities' });
  }
});

// GET /api/entities/:id
router.get('/:id', async (req, res) => {
  try {
    const entity = await EntityService.getById(req.params.id);
    if (!entity) {
      return res.status(404).json({ error: 'Entity not found' });
    }
    res.json(entity);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch entity' });
  }
});

// POST /api/entities
router.post('/', async (req, res) => {
  try {
    const entity = await EntityService.create(req.body);
    res.status(201).json(entity);
  } catch (error) {
    res.status(500).json({ error: 'Failed to create entity' });
  }
});

// PUT /api/entities/:id
router.put('/:id', async (req, res) => {
  try {
    const entity = await EntityService.update(req.params.id, req.body);
    res.json(entity);
  } catch (error) {
    res.status(500).json({ error: 'Failed to update entity' });
  }
});

// DELETE /api/entities/:id
router.delete('/:id', async (req, res) => {
  try {
    await EntityService.delete(req.params.id);
    res.status(204).send();
  } catch (error) {
    res.status(500).json({ error: 'Failed to delete entity' });
  }
});

// GET /api/entities/search?q=query
router.get('/search', async (req, res) => {
  try {
    const query = req.query.q as string;
    if (!query) {
      return res.status(400).json({ error: 'Search query required' });
    }
    const entities = await EntityService.search(query);
    res.json(entities);
  } catch (error) {
    res.status(500).json({ error: 'Failed to search entities' });
  }
});

export default router;
EOF
```

### Step 12: Create Main Server File

```bash
# Create main server file for Supabase
cat > src/index.supabase.ts << 'EOF'
import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import entityRoutes from './routes/entity.routes.supabase';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(cors({
  origin: process.env.FRONTEND_URL?.split(',') || ['http://localhost:3000', 'http://localhost:3002'],
  credentials: true
}));
app.use(express.json());

// Health check
app.get('/health', (req, res) => {
  res.json({ 
    status: 'OK', 
    timestamp: new Date().toISOString(),
    database: 'Supabase',
    environment: process.env.NODE_ENV || 'development'
  });
});

// API Routes
app.use('/api/entities', entityRoutes);

// Default route
app.get('/', (req, res) => {
  res.json({ 
    message: 'Your Project API with Supabase',
    version: '1.0.0',
    database: 'Supabase',
    endpoints: {
      health: '/health',
      entities: '/api/entities'
    }
  });
});

// Start server
app.listen(PORT, () => {
  console.log(`🚀 Your Project API Server running on port ${PORT}`);
  console.log(`📚 Using Supabase for data storage`);
  console.log(`🔗 Frontend URLs: ${process.env.FRONTEND_URL || 'http://localhost:3000, http://localhost:3002'}`);
  console.log(`📍 API Base URL: http://localhost:${PORT}`);
  console.log(`🏥 Health Check: http://localhost:${PORT}/health`);
});

export default app;
EOF
```

### Step 13: Update Package.json Scripts

```bash
# Add Supabase scripts to package.json
npm pkg set scripts.dev:supabase="ts-node-dev --respawn --transpile-only src/index.supabase.ts"
npm pkg set scripts.start:supabase="node dist/index.supabase.js"
npm pkg set scripts.build:supabase="tsc && cp -r src/migrations dist/"
```

---

## 🎯 Phase 5: Frontend Integration

### Step 14: Install Frontend Dependencies

```bash
# Go back to project root
cd ..

# Install Supabase for frontend
npm install @supabase/supabase-js
```

### Step 15: Create Frontend Supabase Client

```bash
# Create frontend lib directory
mkdir -p src/lib

# Create frontend Supabase client
cat > src/lib/supabase.ts << 'EOF'
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.REACT_APP_SUPABASE_URL!;
const supabaseAnonKey = process.env.REACT_APP_SUPABASE_ANON_KEY!;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing Supabase environment variables');
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

// TypeScript types for your database
export interface YourEntity {
  id: string;
  title: string;
  description?: string;
  created_by?: string;
  created_at: string;
  updated_at: string;
}
EOF
```

### Step 16: Create API Service

```bash
# Create frontend services directory
mkdir -p src/services

# Create API service for backend communication
cat > src/services/api.ts << 'EOF'
const API_BASE_URL = 'http://localhost:3001/api';

export const api = {
  // Entities
  getEntities: async () => {
    const response = await fetch(`${API_BASE_URL}/entities`);
    if (!response.ok) throw new Error('Failed to fetch entities');
    return response.json();
  },

  getEntityById: async (id: string) => {
    const response = await fetch(`${API_BASE_URL}/entities/${id}`);
    if (!response.ok) throw new Error('Failed to fetch entity');
    return response.json();
  },

  createEntity: async (entity: any) => {
    const response = await fetch(`${API_BASE_URL}/entities`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(entity),
    });
    if (!response.ok) throw new Error('Failed to create entity');
    return response.json();
  },

  updateEntity: async (id: string, updates: any) => {
    const response = await fetch(`${API_BASE_URL}/entities/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(updates),
    });
    if (!response.ok) throw new Error('Failed to update entity');
    return response.json();
  },

  deleteEntity: async (id: string) => {
    const response = await fetch(`${API_BASE_URL}/entities/${id}`, {
      method: 'DELETE',
    });
    if (!response.ok) throw new Error('Failed to delete entity');
  },

  searchEntities: async (query: string) => {
    const response = await fetch(`${API_BASE_URL}/entities/search?q=${encodeURIComponent(query)}`);
    if (!response.ok) throw new Error('Failed to search entities');
    return response.json();
  }
};
EOF
```

---

## 🎯 Phase 6: Testing & Data Import

### Step 17: Test Your Setup

**Start Backend:**
```bash
cd backend
npm run dev:supabase
```

**In another terminal, start Frontend:**
```bash
cd ..
npm start
```

**Test API endpoints:**
```bash
# Test health check
curl http://localhost:3001/health

# Test entities endpoint
curl http://localhost:3001/api/entities

# Check frontend loads
open http://localhost:3000
```

### Step 18: Import Sample Data (Optional)

```bash
# Create data import script
cat > backend/src/scripts/importData.ts << 'EOF'
import { supabase } from '../lib/supabase';

const importData = async () => {
  console.log('🔄 Starting data import...');
  
  try {
    // Example: Import sample data
    const sampleData = [
      { title: 'Sample Entity 1', description: 'This is a test entity' },
      { title: 'Sample Entity 2', description: 'Another test entity' }
    ];

    const { data, error } = await supabase
      .from('your_main_entity')
      .insert(sampleData)
      .select();

    if (error) throw error;

    console.log(`✅ Successfully imported ${data.length} entities`);
    console.log('📊 Sample data:', data);
  } catch (error) {
    console.error('❌ Import failed:', error);
  }
};

importData();
EOF

# Add import script to package.json
npm pkg set scripts.import-data="ts-node src/scripts/importData.ts"

# Run the import
npm run import-data
```

---

## 🎯 Phase 7: Advanced Features (Optional)

### Step 19: Add Authentication

**Enable auth in Supabase dashboard: Authentication → Settings**

```bash
# Add auth helpers
cat > src/lib/auth.ts << 'EOF'
import { supabase } from './supabase';

export const auth = {
  async signUp(email: string, password: string) {
    const { data, error } = await supabase.auth.signUp({ email, password });
    if (error) throw error;
    return data;
  },

  async signIn(email: string, password: string) {
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) throw error;
    return data;
  },

  async signOut() {
    const { error } = await supabase.auth.signOut();
    if (error) throw error;
  },

  async getCurrentUser() {
    const { data: { user }, error } = await supabase.auth.getUser();
    if (error) throw error;
    return user;
  }
};
EOF
```

### Step 20: Add Real-time Subscriptions

```bash
# Add real-time updates hook
cat > src/hooks/useRealtime.ts << 'EOF'
import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';

export const useRealtimeEntities = () => {
  const [entities, setEntities] = useState<any[]>([]);

  useEffect(() => {
    // Subscribe to changes
    const subscription = supabase
      .channel('entities-channel')
      .on('postgres_changes', 
        { event: '*', schema: 'public', table: 'your_main_entity' },
        (payload) => {
          console.log('Real-time update:', payload);
          // Update your state based on the payload
        }
      )
      .subscribe();

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  return entities;
};
EOF
```

---

## 🎯 Phase 8: Production Deployment

### Step 21: Build for Production

```bash
# Build backend
cd backend
npm run build:supabase

# Build frontend
cd ..
npm run build
```

### Step 22: Deploy to Vercel (Example)

```bash
# Install Vercel CLI
npm install -g vercel

# Deploy
vercel --prod
```

**Set these environment variables in your deployment platform:**
- `SUPABASE_URL=https://YOUR_PROJECT_ID.supabase.co`
- `SUPABASE_ANON_KEY=your_anon_key`
- `SUPABASE_SERVICE_ROLE_KEY=your_service_role_key`

---

## 📚 Quick Reference Commands

```bash
# Project Setup
supabase init
supabase login
supabase link --project-ref YOUR_PROJECT_ID

# Database Operations
supabase migration new migration_name
supabase db push
supabase db pull
supabase db diff
supabase db reset

# Local Development
supabase start        # Start local Supabase
supabase stop         # Stop local Supabase
supabase status       # Check status

# Development Servers
cd backend && npm run dev:supabase    # Start backend
npm start                             # Start frontend

# Testing
curl http://localhost:3001/health     # Test backend
curl http://localhost:3001/api/entities # Test API
```

---

## 🔧 Troubleshooting

### Common Issues & Solutions

**1. CORS errors:**
```bash
# Update FRONTEND_URL in backend/.env
FRONTEND_URL=http://localhost:3000,http://localhost:3002
```

**2. API keys not working:**
- Double-check keys in Supabase dashboard
- Ensure no extra spaces in `.env` files

**3. Migration fails:**
- Check SQL syntax
- Verify table names match your code

**4. Port conflicts:**
```bash
# Kill process on port 3001
lsof -ti:3001 | xargs kill -9

# Or change port in .env
PORT=3002
```

**5. Database connection issues:**
```bash
# Test connection
supabase db psql
SELECT current_database();
\q
```

### Debug Commands

```bash
# Check Supabase connection
supabase db psql
SELECT * FROM your_main_entity LIMIT 5;
\q

# Test API endpoints
curl -X GET http://localhost:3001/health
curl -X GET http://localhost:3001/api/entities

# Check environment variables
cd backend && node -e "console.log(process.env.SUPABASE_URL)"
```

---

## ✅ Checklist

- [ ] Created Supabase project and got API keys
- [ ] Initialized Supabase CLI and linked project
- [ ] Set up environment files (.env and .env.local)
- [ ] Created and applied database migration
- [ ] Installed backend dependencies (@supabase/supabase-js)
- [ ] Created Supabase client and service layer
- [ ] Set up API routes and main server file
- [ ] Updated package.json scripts
- [ ] Installed frontend dependencies
- [ ] Created frontend Supabase client and API service
- [ ] Tested backend and frontend integration
- [ ] Imported sample data (optional)
- [ ] Set up authentication (optional)
- [ ] Added real-time features (optional)
- [ ] Deployed to production (optional)

---

## 🎉 You're Done!

Your Supabase project is now set up with:
- ✅ Database schema and migrations
- ✅ Backend API with full CRUD operations  
- ✅ Frontend integration
- ✅ Authentication ready
- ✅ Real-time capabilities
- ✅ Production deployment ready

**Save this guide for your future projects!** 🚀

---

**Next Steps:**
1. Customize the schema for your specific needs
2. Add more complex business logic
3. Implement authentication UI
4. Add real-time features
5. Deploy to production

> **💡 Tip:** Keep this file in your project root and update it with project-specific customizations for easy reference! 