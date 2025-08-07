import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    include: ['test/basic.test.js'], // Only run the basic test for now
  },
  css: {
    postcss: false, // Disable PostCSS
  }
});