// Checkout routes - purchase flow functionality
import { Router } from 'itty-router';
import { corsHeaders } from '../utils/cors';
import { createSession } from '../utils/auth';

const router = Router({ base: '/checkout' });

// Get checkout page data
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
    
    if (!product.is_published) {
      return new Response(JSON.stringify({ error: 'Product not available' }), {
        status: 404,
        headers: { 'Content-Type': 'application/json', ...corsHeaders },
      });
    }
    
    // Return checkout page data
    return new Response(JSON.stringify({
      product: {
        id: product.id,
        name: product.name,
        description: product.description,
        price: product.price,
        currency: product.currency,
        thumbnail_url: product.thumbnail_url,
        seller: product.seller,
      },
      checkout_options: {
        payment_methods: ['card', 'paypal'], // Simplified for demo
        currencies: ['USD', 'EUR', 'GBP'],
        tax_inclusive: false,
      }
    }), {
      headers: { 'Content-Type': 'application/json', ...corsHeaders },
    });
    
  } catch (error) {
    console.error('Checkout page error:', error);
    return new Response(JSON.stringify({ error: 'Internal server error' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json', ...corsHeaders },
    });
  }
});

// Process purchase (simplified)
router.post('/:permalink/purchase', async (request) => {
  const { permalink } = request.params;
  
  try {
    const body = await request.json();
    const { email, payment_method, card_token, price } = body;
    
    if (!email || !payment_method || !price) {
      return new Response(JSON.stringify({
        error: 'Validation failed',
        details: { email: 'required', payment_method: 'required', price: 'required' }
      }), {
        status: 400,
        headers: { 'Content-Type': 'application/json', ...corsHeaders },
      });
    }
    
    // Get product information
    const productKey = `product:${permalink}`;
    const productData = await request.env.KV_PRODUCTS.get(productKey);
    
    if (!productData) {
      return new Response(JSON.stringify({ error: 'Product not found' }), {
        status: 404,
        headers: { 'Content-Type': 'application/json', ...corsHeaders },
      });
    }
    
    const product = JSON.parse(productData);
    
    // Validate price
    if (parseFloat(price) !== product.price) {
      return new Response(JSON.stringify({ error: 'Price mismatch' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json', ...corsHeaders },
      });
    }
    
    // In a real implementation, process payment with Stripe/PayPal here
    // For demo purposes, simulate successful payment
    
    // Generate purchase/license
    const purchaseId = `purch_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const licenseKey = `${Math.random().toString(36).substr(2, 9)}-${Math.random().toString(36).substr(2, 9)}-${Math.random().toString(36).substr(2, 9)}`.toUpperCase();
    
    const purchase = {
      id: purchaseId,
      product_id: product.id,
      product_name: product.name,
      permalink: product.permalink,
      email,
      price: product.price,
      currency: product.currency,
      license_key: licenseKey,
      seller_id: product.seller.id,
      created_at: new Date().toISOString(),
      payment_method,
      status: 'completed',
    };
    
    // Store purchase
    const purchaseKey = `purchase:${purchaseId}`;
    await request.env.KV_PRODUCTS.put(purchaseKey, JSON.stringify(purchase));
    
    // Store license for verification
    const licenseStoreKey = `license:${permalink}:${licenseKey}`;
    const licenseData = {
      seller_id: product.seller.id,
      product_id: product.id,
      product_name: product.name,
      permalink: product.permalink,
      email,
      price: product.price,
      created_at: purchase.created_at,
      uses_count: 0,
      disabled: false,
    };
    await request.env.KV_PRODUCTS.put(licenseStoreKey, JSON.stringify(licenseData));
    
    // Create buyer session
    const { sessionId } = await createSession(request, { id: purchaseId, email });
    
    return new Response(JSON.stringify({
      success: true,
      purchase: {
        id: purchaseId,
        product_name: product.name,
        license_key: licenseKey,
        download_url: `https://your-domain.com/downloads/${purchaseId}`, // Would be R2 URL
        receipt_url: `https://your-domain.com/receipts/${purchaseId}`,
      }
    }), {
      status: 201,
      headers: {
        'Content-Type': 'application/json',
        'Set-Cookie': `session_id=${sessionId}; HttpOnly; Secure; SameSite=Strict; Max-Age=${7 * 24 * 60 * 60}`,
        ...corsHeaders,
      },
    });
    
  } catch (error) {
    console.error('Purchase processing error:', error);
    return new Response(JSON.stringify({ error: 'Internal server error' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json', ...corsHeaders },
    });
  }
});

export async function handleCheckoutRoutes(request) {
  return router.handle(request);
}