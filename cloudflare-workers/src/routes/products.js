// Product routes - core product management functionality
import { Router } from 'itty-router';
import { corsHeaders } from '../utils/cors';
import { validateApiKey, getSession } from '../utils/auth';

const router = Router({ base: '/products' });

// Get product by permalink (public endpoint)
router.get('/:permalink', async (request) => {
  const { permalink } = request.params;
  
  try {
    const productKey = `product:${permalink}`;
    const productData = await request.env.KV_PRODUCTS.get(productKey);
    
    if (!productData) {
      return new Response(JSON.stringify({ error: 'Product not found' }), {
        status: 404,
        headers: { 'Content-Type': 'application/json', ...corsHeaders },
      });
    }
    
    const product = JSON.parse(productData);
    
    // Return public product information
    return new Response(JSON.stringify({
      product: {
        id: product.id,
        name: product.name,
        description: product.description,
        permalink: product.permalink,
        price: product.price,
        currency: product.currency,
        preview_url: product.preview_url,
        thumbnail_url: product.thumbnail_url,
        tags: product.tags,
        created_at: product.created_at,
        updated_at: product.updated_at,
        is_published: product.is_published,
        seller: {
          id: product.seller.id,
          display_name: product.seller.display_name,
          profile_url: product.seller.profile_url,
        }
      }
    }), {
      headers: { 'Content-Type': 'application/json', ...corsHeaders },
    });
    
  } catch (error) {
    console.error('Product fetch error:', error);
    return new Response(JSON.stringify({ error: 'Internal server error' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json', ...corsHeaders },
    });
  }
});

// Create new product (authenticated endpoint)
router.post('/', async (request) => {
  const auth = await validateApiKey(request);
  if (!auth?.valid) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), {
      status: 401,
      headers: { 'Content-Type': 'application/json', ...corsHeaders },
    });
  }
  
  try {
    const body = await request.json();
    const { name, description, price, currency = 'USD', tags = [] } = body;
    
    if (!name || price === undefined) {
      return new Response(JSON.stringify({
        error: 'Validation failed',
        details: { name: 'required', price: 'required' }
      }), {
        status: 400,
        headers: { 'Content-Type': 'application/json', ...corsHeaders },
      });
    }
    
    // Generate product ID and permalink
    const productId = `prod_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const permalink = name.toLowerCase().replace(/[^a-z0-9]/g, '-').replace(/-+/g, '-');
    
    const product = {
      id: productId,
      name,
      description: description || '',
      permalink,
      price: parseFloat(price),
      currency,
      tags,
      is_published: false,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      seller: {
        id: 'demo_seller', // In real implementation, get from auth token
        display_name: 'Demo Seller',
        profile_url: `https://gumroad.com/demo_seller`,
      }
    };
    
    // Store in KV
    const productKey = `product:${permalink}`;
    await request.env.KV_PRODUCTS.put(productKey, JSON.stringify(product));
    
    // Update products list
    const productsListKey = 'products:list';
    const existingList = await request.env.KV_PRODUCTS.get(productsListKey) || '[]';
    const productsList = JSON.parse(existingList);
    productsList.push(product);
    await request.env.KV_PRODUCTS.put(productsListKey, JSON.stringify(productsList));
    
    return new Response(JSON.stringify({ product }), {
      status: 201,
      headers: { 'Content-Type': 'application/json', ...corsHeaders },
    });
    
  } catch (error) {
    console.error('Product creation error:', error);
    return new Response(JSON.stringify({ error: 'Internal server error' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json', ...corsHeaders },
    });
  }
});

// Update product (authenticated endpoint)
router.put('/:permalink', async (request) => {
  const auth = await validateApiKey(request);
  if (!auth?.valid) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), {
      status: 401,
      headers: { 'Content-Type': 'application/json', ...corsHeaders },
    });
  }
  
  const { permalink } = request.params;
  
  try {
    const productKey = `product:${permalink}`;
    const existingData = await request.env.KV_PRODUCTS.get(productKey);
    
    if (!existingData) {
      return new Response(JSON.stringify({ error: 'Product not found' }), {
        status: 404,
        headers: { 'Content-Type': 'application/json', ...corsHeaders },
      });
    }
    
    const existingProduct = JSON.parse(existingData);
    const updates = await request.json();
    
    // Update allowed fields
    const updatedProduct = {
      ...existingProduct,
      ...updates,
      id: existingProduct.id, // Preserve ID
      permalink: existingProduct.permalink, // Preserve permalink
      created_at: existingProduct.created_at, // Preserve creation date
      updated_at: new Date().toISOString(),
    };
    
    await request.env.KV_PRODUCTS.put(productKey, JSON.stringify(updatedProduct));
    
    return new Response(JSON.stringify({ product: updatedProduct }), {
      headers: { 'Content-Type': 'application/json', ...corsHeaders },
    });
    
  } catch (error) {
    console.error('Product update error:', error);
    return new Response(JSON.stringify({ error: 'Internal server error' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json', ...corsHeaders },
    });
  }
});

export async function handleProductRoutes(request) {
  return router.handle(request);
}