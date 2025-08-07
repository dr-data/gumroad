// API v2 routes - migrated from Rails API endpoints
import { Router } from 'itty-router';
import { corsHeaders } from '../utils/cors';
import { validateApiKey, isRateLimited } from '../utils/auth';

const router = Router({ base: '/api/v2' });

// License verification endpoint (core Gumroad functionality)
router.post('/licenses/verify', async (request) => {
  const clientIp = request.headers.get('CF-Connecting-IP') || 'unknown';
  
  // Rate limiting
  if (await isRateLimited(request, clientIp)) {
    return new Response(JSON.stringify({ error: 'Rate limit exceeded' }), {
      status: 429,
      headers: { 'Content-Type': 'application/json', ...corsHeaders },
    });
  }
  
  try {
    const body = await request.json();
    const { product_permalink, license_key, increment_uses_count } = body;
    
    if (!product_permalink || !license_key) {
      return new Response(JSON.stringify({
        success: false,
        message: 'Missing required parameters'
      }), {
        status: 400,
        headers: { 'Content-Type': 'application/json', ...corsHeaders },
      });
    }
    
    // In a real implementation, verify against external database
    // For demo purposes, using KV store
    const licenseKey = `license:${product_permalink}:${license_key}`;
    const licenseData = await request.env.KV_PRODUCTS.get(licenseKey);
    
    if (!licenseData) {
      return new Response(JSON.stringify({
        success: false,
        message: 'License not found'
      }), {
        status: 404,
        headers: { 'Content-Type': 'application/json', ...corsHeaders },
      });
    }
    
    const license = JSON.parse(licenseData);
    
    // Check if license is valid
    if (license.disabled) {
      return new Response(JSON.stringify({
        success: false,
        message: 'License disabled'
      }), {
        status: 403,
        headers: { 'Content-Type': 'application/json', ...corsHeaders },
      });
    }
    
    // Increment usage count if requested
    if (increment_uses_count && license.uses_count !== undefined) {
      license.uses_count += 1;
      license.last_used_at = new Date().toISOString();
      await request.env.KV_PRODUCTS.put(licenseKey, JSON.stringify(license));
    }
    
    return new Response(JSON.stringify({
      success: true,
      uses: license.uses_count || 0,
      purchase: {
        seller_id: license.seller_id,
        product_id: license.product_id,
        product_name: license.product_name,
        permalink: license.permalink,
        email: license.email,
        price: license.price,
        created_at: license.created_at,
      }
    }), {
      headers: { 'Content-Type': 'application/json', ...corsHeaders },
    });
    
  } catch (error) {
    console.error('License verification error:', error);
    return new Response(JSON.stringify({
      success: false,
      message: 'Internal server error'
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json', ...corsHeaders },
    });
  }
});

// Get user info endpoint
router.get('/user', async (request) => {
  const auth = await validateApiKey(request);
  if (!auth?.valid) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), {
      status: 401,
      headers: { 'Content-Type': 'application/json', ...corsHeaders },
    });
  }
  
  // In a real implementation, fetch from external database
  // For demo, return mock data
  return new Response(JSON.stringify({
    user: {
      id: '12345',
      email: 'seller@example.com',
      display_name: 'Demo Seller',
      created_at: '2024-01-01T00:00:00Z',
    }
  }), {
    headers: { 'Content-Type': 'application/json', ...corsHeaders },
  });
});

// Products listing endpoint
router.get('/products', async (request) => {
  const auth = await validateApiKey(request);
  if (!auth?.valid) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), {
      status: 401,
      headers: { 'Content-Type': 'application/json', ...corsHeaders },
    });
  }
  
  // In a real implementation, fetch from external database with pagination
  // For demo, return mock data from KV
  const productsList = await request.env.KV_PRODUCTS.get('products:list') || '[]';
  const products = JSON.parse(productsList);
  
  return new Response(JSON.stringify({
    products: products.slice(0, 20), // Simple pagination
    total_count: products.length,
  }), {
    headers: { 'Content-Type': 'application/json', ...corsHeaders },
  });
});

export async function handleApiV2Routes(request) {
  return router.handle(request);
}