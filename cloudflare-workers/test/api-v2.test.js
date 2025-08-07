import { describe, it, expect, beforeEach } from 'vitest';
import { handleApiV2Routes } from '../src/routes/api-v2.js';

// Mock environment for testing
const mockEnv = {
  KV_PRODUCTS: {
    get: async (key) => {
      // Mock license data
      if (key === 'license:test-product:TEST-LICENSE-KEY') {
        return JSON.stringify({
          seller_id: 'seller_123',
          product_id: 'prod_123',
          product_name: 'Test Product',
          permalink: 'test-product',
          email: 'buyer@example.com',
          price: 29.99,
          created_at: '2024-01-01T00:00:00Z',
          uses_count: 5,
          disabled: false,
        });
      }
      return null;
    },
    put: async (key, value) => {
      // Mock successful put
      return;
    },
  },
  KV_CACHE: {
    get: async (key) => null,
    put: async (key, value, options) => undefined,
  },
};

// Mock request helper
function createMockRequest(url, options = {}) {
  const request = new Request(url, options);
  request.env = mockEnv;
  
  // Mock CF-Connecting-IP header
  if (!request.headers.has('CF-Connecting-IP')) {
    request.headers.set('CF-Connecting-IP', '192.168.1.1');
  }
  
  return request;
}

describe('API v2 Routes', () => {
  describe('License Verification', () => {
    it('should verify a valid license', async () => {
      const request = createMockRequest('https://example.com/api/v2/licenses/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          product_permalink: 'test-product',
          license_key: 'TEST-LICENSE-KEY',
          increment_uses_count: true,
        }),
      });

      const response = await handleApiV2Routes(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.uses).toBe(5);
      expect(data.purchase.product_name).toBe('Test Product');
    });

    it('should reject invalid license', async () => {
      const request = createMockRequest('https://example.com/api/v2/licenses/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          product_permalink: 'test-product',
          license_key: 'INVALID-LICENSE',
        }),
      });

      const response = await handleApiV2Routes(request);
      const data = await response.json();

      expect(response.status).toBe(404);
      expect(data.success).toBe(false);
      expect(data.message).toBe('License not found');
    });

    it('should validate required parameters', async () => {
      const request = createMockRequest('https://example.com/api/v2/licenses/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          product_permalink: 'test-product',
          // Missing license_key
        }),
      });

      const response = await handleApiV2Routes(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.success).toBe(false);
      expect(data.message).toBe('Missing required parameters');
    });
  });

  describe('User Info', () => {
    it('should require authentication for user endpoint', async () => {
      const request = createMockRequest('https://example.com/api/v2/user');

      const response = await handleApiV2Routes(request);
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.error).toBe('Unauthorized');
    });

    it('should return user info with valid token', async () => {
      const request = createMockRequest('https://example.com/api/v2/user', {
        headers: {
          'Authorization': 'Bearer valid-token-here',
        },
      });

      const response = await handleApiV2Routes(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.user.id).toBe('12345');
      expect(data.user.email).toBe('seller@example.com');
    });
  });

  describe('CORS', () => {
    it('should include CORS headers in responses', async () => {
      const request = createMockRequest('https://example.com/api/v2/licenses/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          product_permalink: 'test-product',
          license_key: 'INVALID-LICENSE',
        }),
      });

      const response = await handleApiV2Routes(request);

      expect(response.headers.get('Access-Control-Allow-Origin')).toBe('*');
      expect(response.headers.get('Access-Control-Allow-Methods')).toContain('POST');
    });
  });
});