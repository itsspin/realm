# Backend Setup Guide

This guide explains how to set up the backend for REALM's cloud-saved accounts and multiple characters per account.

## Option 1: Supabase (Recommended - Easiest)

Supabase provides PostgreSQL database + Auth + REST API out of the box.

### Steps:

1. **Create Supabase Project**
   - Go to https://supabase.com
   - Sign up/login
   - Create a new project
   - Note your project URL and anon key

2. **Run Database Schema**
   - In Supabase dashboard, go to SQL Editor
   - Copy contents of `backend/schema.sql`
   - Paste and run the SQL script
   - This creates `accounts` and `characters` tables

3. **Configure Row Level Security (RLS)**
   - Go to Authentication > Policies
   - Create policies for `accounts` and `characters` tables:
   
   ```sql
   -- Allow users to read their own account
   CREATE POLICY "Users can read own account" ON accounts
     FOR SELECT USING (auth.uid() = id);
   
   -- Allow users to read their own characters
   CREATE POLICY "Users can read own characters" ON characters
     FOR SELECT USING (auth.uid() = account_id);
   
   -- Allow users to create their own characters
   CREATE POLICY "Users can create own characters" ON characters
     FOR INSERT WITH CHECK (auth.uid() = account_id);
   
   -- Allow users to update their own characters
   CREATE POLICY "Users can update own characters" ON characters
     FOR UPDATE USING (auth.uid() = account_id);
   
   -- Allow users to delete their own characters
   CREATE POLICY "Users can delete own characters" ON characters
     FOR DELETE USING (auth.uid() = account_id);
   ```

4. **Configure Client**
   - In `index.html`, add before other scripts:
   ```html
   <script>
     window.REALM_SUPABASE_URL = 'https://your-project.supabase.co';
     window.REALM_SUPABASE_ANON_KEY = 'your-anon-key';
   </script>
   ```

## Option 2: Custom Node.js/Express API

If you prefer a custom backend, here's a basic setup:

### Prerequisites:
- Node.js 16+
- PostgreSQL database

### Setup:

1. **Install Dependencies**
   ```bash
   cd backend
   npm init -y
   npm install express pg bcrypt jsonwebtoken cors dotenv
   ```

2. **Create `.env` file**
   ```
   DATABASE_URL=postgresql://user:password@localhost:5432/realm
   JWT_SECRET=your-secret-key-here
   PORT=3000
   ```

3. **Run Database Schema**
   ```bash
   psql -U postgres -d realm -f schema.sql
   ```

4. **Create `backend/server.js`** (basic example):
   ```javascript
   const express = require('express');
   const { Pool } = require('pg');
   const bcrypt = require('bcrypt');
   const jwt = require('jsonwebtoken');
   const cors = require('cors');
   require('dotenv').config();

   const app = express();
   app.use(cors());
   app.use(express.json());

   const pool = new Pool({ connectionString: process.env.DATABASE_URL });

   // Auth middleware
   const authenticate = async (req, res, next) => {
     const token = req.headers.authorization?.replace('Bearer ', '');
     if (!token) return res.status(401).json({ error: 'Unauthorized' });
     
     try {
       const decoded = jwt.verify(token, process.env.JWT_SECRET);
       req.userId = decoded.userId;
       next();
     } catch (e) {
       res.status(401).json({ error: 'Invalid token' });
     }
   };

   // Register
   app.post('/api/auth/register', async (req, res) => {
     const { email, username, passwordHash } = req.body;
     // ... implement registration
   });

   // Login
   app.post('/api/auth/login', async (req, res) => {
     const { email, passwordHash } = req.body;
     // ... implement login
   });

   // Get characters
   app.get('/api/characters', authenticate, async (req, res) => {
     // ... fetch characters for req.userId
   });

   // Create character
   app.post('/api/characters', authenticate, async (req, res) => {
     // ... create character for req.userId
   });

   // Update character
   app.patch('/api/characters/:id', authenticate, async (req, res) => {
     // ... update character (verify ownership)
   });

   // Delete character
   app.delete('/api/characters/:id', authenticate, async (req, res) => {
     // ... delete character (verify ownership)
   });

   app.listen(process.env.PORT, () => {
     console.log(`Server running on port ${process.env.PORT}`);
   });
   ```

5. **Start Server**
   ```bash
   node server.js
   ```

6. **Configure Client**
   - In `index.html`:
   ```html
   <script>
     window.REALM_API_URL = 'http://localhost:3000/api';
   </script>
   ```

## Configuration

### Environment Variables (for custom API)

- `DATABASE_URL`: PostgreSQL connection string
- `JWT_SECRET`: Secret key for JWT tokens
- `PORT`: Server port (default: 3000)

### Client Configuration

Set these in `index.html` before loading game scripts:

**For Supabase:**
```html
<script>
  window.REALM_SUPABASE_URL = 'https://your-project.supabase.co';
  window.REALM_SUPABASE_ANON_KEY = 'your-anon-key';
</script>
```

**For Custom API:**
```html
<script>
  window.REALM_API_URL = 'http://localhost:3000/api';
</script>
```

## Save Flow

The game automatically saves:
- **Periodically**: Every 30 seconds (configurable)
- **On level up**: Immediately
- **On zone change**: Immediately
- **On logout**: Immediately
- **On important events**: Inventory changes, quest completion, etc.

All saves are debounced (2 second delay) to avoid excessive API calls.

## Security Notes

1. **Password Hashing**: Passwords are hashed client-side (SHA-256) but should also be hashed server-side (bcrypt recommended)
2. **JWT Tokens**: Tokens expire after 7 days (configurable)
3. **Row Level Security**: Supabase RLS policies ensure users can only access their own data
4. **Validation**: Character data is validated both client and server-side

## Troubleshooting

### "Not authenticated" errors
- Check that auth credentials are set correctly
- Verify session hasn't expired
- Check browser console for API errors

### Save failures
- Check network connection
- Verify backend is running
- Check database connection
- Review server logs

### Character limit reached
- Default limit is 8 characters per account
- Can be adjusted in database schema (constraint)

## Testing

1. Register a new account
2. Create a character
3. Play the game and verify saves work
4. Logout and login again
5. Verify character loads correctly
6. Create multiple characters and verify character select works

