/**
 * Gumroad Cloudflare Worker
 * A minimal but functional worker that can handle basic routing and API requests
 */

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);
    
    // Handle different routes
    switch (url.pathname) {
      case '/health':
        return handleHealthCheck(request, env);
      
      case '/api/status':
        return handleStatusCheck(request, env);
        
      case '/api/ping':
        return handlePing(request, env);
        
      default:
        // For now, proxy to the main app for other routes
        return handleProxyToMain(request, env);
    }
  },
};

/**
 * Health check endpoint
 */
async function handleHealthCheck(request, env) {
  const healthData = {
    status: 'ok',
    timestamp: new Date().toISOString(),
    environment: env.ENVIRONMENT || 'development',
    worker_version: '1.0.0'
  };
  
  return new Response(JSON.stringify(healthData), {
    headers: {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': '*'
    }
  });
}

/**
 * Status check with KV store test
 */
async function handleStatusCheck(request, env) {
  const statusData = {
    status: 'ok',
    timestamp: new Date().toISOString(),
    environment: env.ENVIRONMENT || 'development',
    services: {
      kv_sessions: 'unknown',
      kv_cache: 'unknown',
      database: 'unknown',
      redis: 'unknown'
    }
  };
  
  // Test KV stores if available
  try {
    if (env.SESSIONS) {
      await env.SESSIONS.put('health_check', 'ok', { expirationTtl: 60 });
      const testValue = await env.SESSIONS.get('health_check');
      statusData.services.kv_sessions = testValue === 'ok' ? 'ok' : 'error';
    }
  } catch (error) {
    statusData.services.kv_sessions = 'error';
  }
  
  try {
    if (env.CACHE) {
      await env.CACHE.put('health_check', 'ok', { expirationTtl: 60 });
      const testValue = await env.CACHE.get('health_check');
      statusData.services.kv_cache = testValue === 'ok' ? 'ok' : 'error';
    }
  } catch (error) {
    statusData.services.kv_cache = 'error';
  }
  
  return new Response(JSON.stringify(statusData), {
    headers: {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': '*'
    }
  });
}

/**
 * Simple ping endpoint
 */
async function handlePing(request, env) {
  return new Response('pong', {
    headers: {
      'Content-Type': 'text/plain',
      'Access-Control-Allow-Origin': '*'
    }
  });
}

/**
 * Proxy requests to main application
 */
async function handleProxyToMain(request, env) {
  // For development, we'll return a simple response
  // In production, this would proxy to the main Rails app
  
  if (env.ENVIRONMENT === 'development') {
    return new Response(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>Gumroad Cloudflare Worker</title>
          <style>
            body { font-family: Arial, sans-serif; margin: 40px; }
            .container { max-width: 600px; margin: 0 auto; }
            .status { background: #e8f5e8; padding: 20px; border-radius: 5px; }
          </style>
        </head>
        <body>
          <div class="container">
            <h1>🚀 Gumroad Cloudflare Worker</h1>
            <div class="status">
              <h2>✅ Worker is running successfully!</h2>
              <p><strong>Environment:</strong> ${env.ENVIRONMENT || 'development'}</p>
              <p><strong>URL:</strong> ${request.url}</p>
              <p><strong>Method:</strong> ${request.method}</p>
            </div>
            
            <h3>Available Endpoints:</h3>
            <ul>
              <li><a href="/health">/health</a> - Health check</li>
              <li><a href="/api/status">/api/status</a> - Detailed status with KV tests</li>
              <li><a href="/api/ping">/api/ping</a> - Simple ping test</li>
            </ul>
            
            <h3>Next Steps:</h3>
            <ol>
              <li>Configure KV namespaces</li>
              <li>Set up database connections</li>
              <li>Add routing logic for your application</li>
              <li>Configure custom domains</li>
            </ol>
          </div>
        </body>
      </html>
    `, {
      headers: {
        'Content-Type': 'text/html',
      }
    });
  }
  
  // In production, proxy to main app
  const mainAppUrl = env.MAIN_APP_URL || 'https://gumroad.com';
  const proxyUrl = new URL(request.url);
  proxyUrl.hostname = new URL(mainAppUrl).hostname;
  
  const proxyRequest = new Request(proxyUrl.toString(), {
    method: request.method,
    headers: request.headers,
    body: request.body
  });
  
  return fetch(proxyRequest);
}