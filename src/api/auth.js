/**
 * Authentication API Client
 * 
 * Handles account registration, login, and session management.
 * Uses Supabase for backend (or can be configured for custom API).
 */

(function (global) {
  const API_BASE_URL = window.REALM_API_URL || 'http://localhost:3000/api';
  const SUPABASE_URL = window.REALM_SUPABASE_URL || '';
  const SUPABASE_ANON_KEY = window.REALM_SUPABASE_ANON_KEY || '';
  
  let currentSession = null;
  let useSupabase = false;

  // Initialize Supabase if credentials are provided
  if (SUPABASE_URL && SUPABASE_ANON_KEY) {
    useSupabase = true;
    // Supabase client would be loaded via script tag
    // For now, we'll use fetch API directly
  }

  /**
   * Hash password (client-side, but should be hashed server-side too)
   * Using Web Crypto API
   */
  async function hashPassword(password) {
    const encoder = new TextEncoder();
    const data = encoder.encode(password);
    const hash = await crypto.subtle.digest('SHA-256', data);
    return Array.from(new Uint8Array(hash))
      .map(b => b.toString(16).padStart(2, '0'))
      .join('');
  }

  /**
   * Store session in localStorage
   */
  function saveSession(session) {
    currentSession = session;
    try {
      localStorage.setItem('REALM_SESSION', JSON.stringify(session));
    } catch (e) {
      console.error('Failed to save session', e);
    }
  }

  /**
   * Load session from localStorage
   */
  function loadSession() {
    try {
      const stored = localStorage.getItem('REALM_SESSION');
      if (stored) {
        currentSession = JSON.parse(stored);
        return currentSession;
      }
    } catch (e) {
      console.error('Failed to load session', e);
    }
    return null;
  }

  /**
   * Clear session
   */
  function clearSession() {
    currentSession = null;
    localStorage.removeItem('REALM_SESSION');
  }

  /**
   * Get current session
   */
  function getSession() {
    if (!currentSession) {
      currentSession = loadSession();
    }
    return currentSession;
  }

  /**
   * Check if user is authenticated
   */
  function isAuthenticated() {
    const session = getSession();
    if (!session) return false;
    
    // In local mode, always allow if session exists
    const hasBackend = (SUPABASE_URL && SUPABASE_ANON_KEY) || 
                       (API_BASE_URL && API_BASE_URL !== 'http://localhost:3000/api');
    
    if (!hasBackend && session.accessToken === 'local_token') {
      // Local mode: always valid
      return true;
    }
    
    // Check if token is expired (if using JWT)
    if (session.expiresAt && Date.now() > session.expiresAt) {
      clearSession();
      return false;
    }
    
    return true;
  }

  /**
   * Register new account
   */
  async function register(email, username, password) {
    try {
      if (!email || !username || !password) {
        throw new Error('Email, username, and password are required');
      }

      if (password.length < 8) {
        throw new Error('Password must be at least 8 characters');
      }

      // If no backend is configured, create a mock session for local-only mode
      if (!useSupabase && (!API_BASE_URL || API_BASE_URL === 'http://localhost:3000/api')) {
        // Local-only mode: create a mock session
        const mockUserId = `local_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        saveSession({
          userId: mockUserId,
          email: email,
          username: username,
          accessToken: 'local_token',
          expiresAt: Date.now() + (365 * 24 * 60 * 60 * 1000) // 1 year
        });
        
        return { 
          success: true, 
          user: { 
            id: mockUserId, 
            email: email, 
            username: username 
          } 
        };
      }

      if (useSupabase && SUPABASE_URL) {
        // Use Supabase Auth API
        const response = await fetch(`${SUPABASE_URL}/auth/v1/signup`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'apikey': SUPABASE_ANON_KEY
          },
          body: JSON.stringify({
            email,
            password,
            data: { username }
          })
        });

        if (!response.ok) {
          const error = await response.json();
          throw new Error(error.message || 'Registration failed');
        }

        const data = await response.json();
        saveSession({
          userId: data.user.id,
          email: data.user.email,
          username: username,
          accessToken: data.access_token,
          expiresAt: Date.now() + (data.expires_in * 1000)
        });

        return { success: true, user: data.user };
      } else {
        // Use custom API
        const passwordHash = await hashPassword(password);
        const response = await fetch(`${API_BASE_URL}/auth/register`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            email,
            username,
            passwordHash
          })
        });

        if (!response.ok) {
          const error = await response.json();
          throw new Error(error.message || 'Registration failed');
        }

        const data = await response.json();
        saveSession({
          userId: data.user.id,
          email: data.user.email,
          username: data.user.username,
          accessToken: data.token,
          expiresAt: Date.now() + (7 * 24 * 60 * 60 * 1000) // 7 days
        });

        return { success: true, user: data.user };
      }
    } catch (error) {
      console.error('Registration error:', error);
      throw error;
    }
  }

  /**
   * Login
   */
  async function login(email, password) {
    try {
      if (!email || !password) {
        throw new Error('Email and password are required');
      }

      // If no backend is configured, check for existing local session or create one
      if (!useSupabase && (!API_BASE_URL || API_BASE_URL === 'http://localhost:3000/api')) {
        // Local-only mode: check for existing session or create new one
        const existingSession = getSession();
        if (existingSession && existingSession.email === email) {
          // Reuse existing session
          return { 
            success: true, 
            user: { 
              id: existingSession.userId, 
              email: existingSession.email, 
              username: existingSession.username 
            } 
          };
        }
        
        // Create new mock session for this email
        const mockUserId = `local_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        saveSession({
          userId: mockUserId,
          email: email,
          username: email.split('@')[0], // Use email prefix as username
          accessToken: 'local_token',
          expiresAt: Date.now() + (365 * 24 * 60 * 60 * 1000) // 1 year
        });
        
        return { 
          success: true, 
          user: { 
            id: mockUserId, 
            email: email, 
            username: email.split('@')[0] 
          } 
        };
      }

      if (useSupabase && SUPABASE_URL) {
        // Use Supabase Auth API
        const response = await fetch(`${SUPABASE_URL}/auth/v1/token?grant_type=password`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'apikey': SUPABASE_ANON_KEY
          },
          body: JSON.stringify({
            email,
            password
          })
        });

        if (!response.ok) {
          const error = await response.json();
          throw new Error(error.message || 'Login failed');
        }

        const data = await response.json();
        
        // Get user metadata
        const userResponse = await fetch(`${SUPABASE_URL}/rest/v1/accounts?email=eq.${encodeURIComponent(email)}&select=*`, {
          headers: {
            'apikey': SUPABASE_ANON_KEY,
            'Authorization': `Bearer ${data.access_token}`
          }
        });

        let username = email;
        if (userResponse.ok) {
          const users = await userResponse.json();
          if (users.length > 0) {
            username = users[0].username || email;
          }
        }

        saveSession({
          userId: data.user.id,
          email: data.user.email,
          username: username,
          accessToken: data.access_token,
          expiresAt: Date.now() + (data.expires_in * 1000)
        });

        return { success: true, user: data.user };
      } else {
        // Use custom API
        const passwordHash = await hashPassword(password);
        const response = await fetch(`${API_BASE_URL}/auth/login`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            email,
            passwordHash
          })
        });

        if (!response.ok) {
          const error = await response.json();
          throw new Error(error.message || 'Login failed');
        }

        const data = await response.json();
        saveSession({
          userId: data.user.id,
          email: data.user.email,
          username: data.user.username,
          accessToken: data.token,
          expiresAt: Date.now() + (7 * 24 * 60 * 60 * 1000) // 7 days
        });

        return { success: true, user: data.user };
      }
    } catch (error) {
      console.error('Login error:', error);
      throw error;
    }
  }

  /**
   * Logout
   */
  function logout() {
    clearSession();
    return { success: true };
  }

  /**
   * Get current user
   */
  function getCurrentUser() {
    const session = getSession();
    if (!session) return null;
    
    return {
      id: session.userId,
      email: session.email,
      username: session.username
    };
  }

  /**
   * Get auth headers for API requests
   */
  function getAuthHeaders() {
    const session = getSession();
    if (!session || !session.accessToken) {
      return {};
    }

    if (useSupabase) {
      return {
        'apikey': SUPABASE_ANON_KEY,
        'Authorization': `Bearer ${session.accessToken}`
      };
    } else {
      return {
        'Authorization': `Bearer ${session.accessToken}`
      };
    }
  }

  const Auth = {
    register,
    login,
    logout,
    isAuthenticated,
    getCurrentUser,
    getAuthHeaders,
    getSession
  };

  global.Auth = Auth;

  // Load session on init
  loadSession();
})(window);

