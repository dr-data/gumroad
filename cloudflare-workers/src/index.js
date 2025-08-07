import { Router } from 'itty-router';
import { corsHeaders, handleCORS } from './utils/cors';
import { handleApiV2Routes } from './routes/api-v2';
import { handleCheckoutRoutes } from './routes/checkout';
import { handleUserRoutes } from './routes/users';
import { handleProductRoutes } from './routes/products';

const router = Router();

// CORS preflight handler
router.options('*', handleCORS);

// Health check endpoint
router.get('/healthcheck', () => {
  return new Response(JSON.stringify({ status: 'ok', timestamp: new Date().toISOString() }), {
    headers: {
      'Content-Type': 'application/json',
      ...corsHeaders,
    },
  });
});

// API v2 routes (migrated from Rails API)
router.all('/api/v2/*', handleApiV2Routes);

// Core application routes
router.all('/checkout/*', handleCheckoutRoutes);
router.all('/users/*', handleUserRoutes);
router.all('/products/*', handleProductRoutes);
router.all('/links/*', handleProductRoutes); // Legacy route mapping

// Catch-all for unhandled routes
router.all('*', () => {
  return new Response(JSON.stringify({ error: 'Not Found' }), {
    status: 404,
    headers: {
      'Content-Type': 'application/json',
      ...corsHeaders,
    },
  });
});

// Main export for Cloudflare Workers
export default {
  async fetch(request, env, ctx) {
    try {
      // Add environment and context to request for access in handlers
      request.env = env;
      request.ctx = ctx;
      
      return await router.handle(request);
    } catch (error) {
      console.error('Worker error:', error);
      return new Response(JSON.stringify({ 
        error: 'Internal Server Error',
        message: error.message 
      }), {
        status: 500,
        headers: {
          'Content-Type': 'application/json',
          ...corsHeaders,
        },
      });
    }
  },
};