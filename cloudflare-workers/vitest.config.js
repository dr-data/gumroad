import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: true,
    environment: 'miniflare',
    environmentOptions: {
      // Miniflare options
      kvNamespaces: ['KV_SESSIONS', 'KV_CACHE', 'KV_PRODUCTS'],
      r2Buckets: ['ASSETS_BUCKET'],
    },
  },
});