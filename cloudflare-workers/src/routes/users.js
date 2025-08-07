// User routes - user management functionality
import { Router } from 'itty-router';
import { corsHeaders } from '../utils/cors';
import { getSession, createSession } from '../utils/auth';

const router = Router({ base: '/users' });

// User login
router.post('/login', async (request) => {
  try {
    const body = await request.json();
    const { email, password } = body;
    
    if (!email || !password) {
      return new Response(JSON.stringify({
        error: 'Validation failed',
        details: { email: 'required', password: 'required' }
      }), {
        status: 400,
        headers: { 'Content-Type': 'application/json', ...corsHeaders },
      });
    }
    
    // In a real implementation, validate credentials against external database
    // For demo purposes, use hardcoded credentials
    if (email === 'seller@example.com' && password === 'password') {
      const userData = {
        id: 'demo_seller',
        email: 'seller@example.com',
        display_name: 'Demo Seller',
        role: 'seller',
      };
      
      const { sessionId, sessionData } = await createSession(request, userData);
      
      return new Response(JSON.stringify({
        success: true,
        user: userData,
        redirect_url: '/dashboard',
      }), {
        headers: {
          'Content-Type': 'application/json',
          'Set-Cookie': `session_id=${sessionId}; HttpOnly; Secure; SameSite=Strict; Max-Age=${7 * 24 * 60 * 60}`,
          ...corsHeaders,
        },
      });
    }
    
    return new Response(JSON.stringify({
      error: 'Invalid credentials'
    }), {
      status: 401,
      headers: { 'Content-Type': 'application/json', ...corsHeaders },
    });
    
  } catch (error) {
    console.error('Login error:', error);
    return new Response(JSON.stringify({ error: 'Internal server error' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json', ...corsHeaders },
    });
  }
});

// User registration
router.post('/register', async (request) => {
  try {
    const body = await request.json();
    const { email, password, display_name } = body;
    
    if (!email || !password || !display_name) {
      return new Response(JSON.stringify({
        error: 'Validation failed',
        details: { 
          email: !email ? 'required' : null,
          password: !password ? 'required' : null,
          display_name: !display_name ? 'required' : null
        }
      }), {
        status: 400,
        headers: { 'Content-Type': 'application/json', ...corsHeaders },
      });
    }
    
    // Check if user already exists
    const userKey = `user:${email}`;
    const existingUser = await request.env.KV_SESSIONS.get(userKey);
    
    if (existingUser) {
      return new Response(JSON.stringify({
        error: 'User already exists'
      }), {
        status: 409,
        headers: { 'Content-Type': 'application/json', ...corsHeaders },
      });
    }
    
    // Create new user (in real implementation, hash password properly)
    const userId = `user_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const userData = {
      id: userId,
      email,
      display_name,
      role: 'seller',
      created_at: new Date().toISOString(),
      verified: false,
    };
    
    // Store user data
    await request.env.KV_SESSIONS.put(userKey, JSON.stringify({
      ...userData,
      password_hash: password, // In real implementation, use proper hashing
    }));
    
    // Create session
    const { sessionId } = await createSession(request, userData);
    
    return new Response(JSON.stringify({
      success: true,
      user: userData,
      message: 'Registration successful',
    }), {
      status: 201,
      headers: {
        'Content-Type': 'application/json',
        'Set-Cookie': `session_id=${sessionId}; HttpOnly; Secure; SameSite=Strict; Max-Age=${7 * 24 * 60 * 60}`,
        ...corsHeaders,
      },
    });
    
  } catch (error) {
    console.error('Registration error:', error);
    return new Response(JSON.stringify({ error: 'Internal server error' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json', ...corsHeaders },
    });
  }
});

// Get current user
router.get('/me', async (request) => {
  const session = await getSession(request);
  
  if (!session) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), {
      status: 401,
      headers: { 'Content-Type': 'application/json', ...corsHeaders },
    });
  }
  
  // In a real implementation, fetch full user data from database
  return new Response(JSON.stringify({
    user: {
      id: session.user_id,
      email: session.email,
      display_name: 'Demo User', // Would be fetched from database
      role: 'seller',
    }
  }), {
    headers: { 'Content-Type': 'application/json', ...corsHeaders },
  });
});

// User logout
router.post('/logout', async (request) => {
  const session = await getSession(request);
  
  if (session) {
    // Remove session from KV store
    const sessionCookie = request.headers.get('Cookie')?.match(/session_id=([^;]+)/)?.[1];
    if (sessionCookie) {
      await request.env.KV_SESSIONS.delete(sessionCookie);
    }
  }
  
  return new Response(JSON.stringify({ success: true }), {
    headers: {
      'Content-Type': 'application/json',
      'Set-Cookie': 'session_id=; HttpOnly; Secure; SameSite=Strict; Max-Age=0',
      ...corsHeaders,
    },
  });
});

export async function handleUserRoutes(request) {
  return router.handle(request);
}