/**
 * Cloudflare Worker function for API routes
 * Handles /api/* requests with enhanced caching and error handling
 */

export async function onRequest({ request, env, params, waitUntil, next, data }) {
  const url = new URL(request.url);
  
  // Add security headers
  const headers = new Headers();
  headers.set('X-Frame-Options', 'DENY');
  headers.set('X-Content-Type-Options', 'nosniff');
  headers.set('X-XSS-Protection', '1; mode=block');
  headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');
  
  // Handle CORS for API requests
  if (request.method === 'OPTIONS') {
    return new Response(null, {
      status: 204,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Requested-With',
        'Access-Control-Max-Age': '86400'
      }
    });
  }
  
  try {
    // Rate limiting using Cloudflare's rate limiting
    const clientIP = request.headers.get('CF-Connecting-IP') || 
                    request.headers.get('X-Forwarded-For') || 
                    'unknown';
    
    // Check rate limit in KV store
    if (env.CACHE) {
      const rateLimitKey = `rate_limit:${clientIP}`;
      const currentCount = parseInt(await env.CACHE.get(rateLimitKey) || '0');
      
      if (currentCount > 100) { // 100 requests per minute
        return new Response('Rate limit exceeded', { 
          status: 429,
          headers: {
            'Retry-After': '60',
            'X-RateLimit-Limit': '100',
            'X-RateLimit-Remaining': '0'
          }
        });
      }
      
      // Increment counter
      await env.CACHE.put(rateLimitKey, (currentCount + 1).toString(), { expirationTtl: 60 });
    }
    
    // Enhance request with Cloudflare data
    const enhancedRequest = new Request(request, {
      headers: {
        ...Object.fromEntries(request.headers),
        'CF-Connecting-IP': request.headers.get('CF-Connecting-IP') || '',
        'CF-IPCountry': request.headers.get('CF-IPCountry') || '',
        'CF-Ray': request.headers.get('CF-Ray') || '',
        'CF-Visitor': request.headers.get('CF-Visitor') || '',
        'X-Forwarded-Proto': 'https'
      }
    });
    
    // Forward to origin server
    const response = await fetch(enhancedRequest);
    
    // Add CORS headers to response
    const corsHeaders = {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Requested-With'
    };
    
    // Create new response with additional headers
    const newResponse = new Response(response.body, {
      status: response.status,
      statusText: response.statusText,
      headers: {
        ...Object.fromEntries(response.headers),
        ...corsHeaders,
        ...Object.fromEntries(headers),
        'X-Powered-By': 'Cloudflare Workers',
        'X-Request-ID': crypto.randomUUID()
      }
    });
    
    return newResponse;
    
  } catch (error) {
    console.error('API request error:', error);
    
    return new Response(JSON.stringify({
      error: 'Internal Server Error',
      message: 'An error occurred processing your request',
      timestamp: new Date().toISOString()
    }), {
      status: 500,
      headers: {
        'Content-Type': 'application/json',
        ...Object.fromEntries(headers)
      }
    });
  }
}