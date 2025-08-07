// Authentication utilities for Cloudflare Workers
import { createHash } from 'crypto';

// Simple JWT-like token validation (for demonstration)
// In production, use proper JWT libraries or Cloudflare Access
export async function validateApiKey(request) {
  const authHeader = request.headers.get('Authorization');
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return null;
  }
  
  const token = authHeader.substring(7);
  // In a real implementation, validate against KV store or external service
  return { token, valid: token.length > 10 };
}

// Session management using KV store
export async function getSession(request) {
  const sessionCookie = request.headers.get('Cookie')?.match(/session_id=([^;]+)/)?.[1];
  if (!sessionCookie) {
    return null;
  }
  
  try {
    const sessionData = await request.env.KV_SESSIONS.get(sessionCookie);
    return sessionData ? JSON.parse(sessionData) : null;
  } catch (error) {
    console.error('Session retrieval error:', error);
    return null;
  }
}

// Create a new session
export async function createSession(request, userData) {
  const sessionId = createHash('sha256').update(Date.now() + Math.random().toString()).digest('hex');
  const sessionData = {
    user_id: userData.id,
    email: userData.email,
    created_at: new Date().toISOString(),
    expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(), // 7 days
  };
  
  await request.env.KV_SESSIONS.put(sessionId, JSON.stringify(sessionData), {
    expirationTtl: 7 * 24 * 60 * 60, // 7 days in seconds
  });
  
  return { sessionId, sessionData };
}

// Rate limiting using KV store
export async function isRateLimited(request, identifier) {
  const key = `rate_limit:${identifier}`;
  const current = await request.env.KV_CACHE.get(key);
  const count = current ? parseInt(current) : 0;
  
  if (count >= 100) { // 100 requests per minute limit
    return true;
  }
  
  await request.env.KV_CACHE.put(key, (count + 1).toString(), {
    expirationTtl: 60, // 1 minute
  });
  
  return false;
}