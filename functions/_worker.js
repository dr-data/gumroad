/**
 * Cloudflare Worker for Gumroad
 * Handles dynamic requests and proxies to the Rails backend
 */

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);
    
    // Handle static assets - serve from R2 or pass through
    if (isStaticAsset(url.pathname)) {
      return await handleStaticAsset(request, env);
    }
    
    // Handle API routes and dynamic content
    if (isDynamicRoute(url.pathname)) {
      return await handleDynamicRequest(request, env);
    }
    
    // Default: pass through to origin server
    return await handleDefaultRequest(request, env);
  }
};

/**
 * Check if the request is for a static asset
 */
function isStaticAsset(pathname) {
  const staticExtensions = ['.css', '.js', '.png', '.jpg', '.jpeg', '.gif', '.svg', '.ico', '.pdf', '.txt', '.xml'];
  const staticPaths = ['/assets/', '/js/', '/button/', '/help/', '/mobile/', '/analytics/'];
  
  return staticExtensions.some(ext => pathname.endsWith(ext)) ||
         staticPaths.some(path => pathname.startsWith(path));
}

/**
 * Check if the request needs dynamic handling
 */
function isDynamicRoute(pathname) {
  const dynamicPaths = ['/api/', '/webhooks/', '/auth/', '/admin/', '/oauth/', '/healthcheck'];
  return dynamicPaths.some(path => pathname.startsWith(path));
}

/**
 * Handle static asset requests
 */
async function handleStaticAsset(request, env) {
  const url = new URL(request.url);
  
  try {
    // Try to serve from R2 bucket if available
    if (env.ASSETS) {
      const objectKey = url.pathname.substring(1); // Remove leading slash
      const object = await env.ASSETS.get(objectKey);
      
      if (object) {
        const headers = new Headers();
        headers.set('Cache-Control', 'public, max-age=31536000'); // Cache for 1 year
        headers.set('Content-Type', getContentType(url.pathname));
        
        return new Response(object.body, { headers });
      }
    }
    
    // Fallback to origin server
    return fetch(request);
  } catch (error) {
    console.error('Error serving static asset:', error);
    return fetch(request);
  }
}

/**
 * Handle dynamic requests
 */
async function handleDynamicRequest(request, env) {
  const url = new URL(request.url);
  
  // Add Cloudflare-specific headers
  const modifiedRequest = new Request(request);
  modifiedRequest.headers.set('CF-Connecting-IP', request.headers.get('CF-Connecting-IP') || '');
  modifiedRequest.headers.set('CF-Ray', request.headers.get('CF-Ray') || '');
  modifiedRequest.headers.set('CF-Visitor', request.headers.get('CF-Visitor') || '');
  
  // Cache dynamic responses based on path
  const cacheKey = `${request.method}:${url.pathname}:${url.search}`;
  
  if (env.CACHE && request.method === 'GET') {
    const cached = await env.CACHE.get(cacheKey);
    if (cached) {
      return new Response(cached, {
        headers: {
          'Content-Type': 'application/json',
          'Cache-Control': 'public, max-age=300' // Cache for 5 minutes
        }
      });
    }
  }
  
  try {
    const response = await fetch(modifiedRequest);
    
    // Cache successful GET responses
    if (env.CACHE && request.method === 'GET' && response.ok) {
      const responseText = await response.text();
      await env.CACHE.put(cacheKey, responseText, { expirationTtl: 300 });
      return new Response(responseText, response);
    }
    
    return response;
  } catch (error) {
    console.error('Error handling dynamic request:', error);
    return new Response('Internal Server Error', { status: 500 });
  }
}

/**
 * Handle default requests (pass through to origin)
 */
async function handleDefaultRequest(request, env) {
  return fetch(request);
}

/**
 * Get content type based on file extension
 */
function getContentType(pathname) {
  const ext = pathname.split('.').pop()?.toLowerCase();
  
  const mimeTypes = {
    'css': 'text/css',
    'js': 'application/javascript',
    'png': 'image/png',
    'jpg': 'image/jpeg',
    'jpeg': 'image/jpeg',
    'gif': 'image/gif',
    'svg': 'image/svg+xml',
    'ico': 'image/x-icon',
    'pdf': 'application/pdf',
    'txt': 'text/plain',
    'xml': 'application/xml',
    'json': 'application/json',
    'html': 'text/html'
  };
  
  return mimeTypes[ext] || 'application/octet-stream';
}