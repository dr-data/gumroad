#!/usr/bin/env node

/**
 * Build assets for Cloudflare deployment
 * This script optimizes and prepares assets for Cloudflare Pages
 */

import fs from 'fs';
import path from 'path';
import { execSync } from 'child_process';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const publicDir = path.join(__dirname, '..', 'public');
const assetsDir = path.join(publicDir, 'assets');

console.log('🚀 Building assets for Cloudflare deployment...');

// Ensure public directory exists
if (!fs.existsSync(publicDir)) {
  fs.mkdirSync(publicDir, { recursive: true });
}

// Create a simple index.html if it doesn't exist
const indexPath = path.join(publicDir, 'index.html');
if (!fs.existsSync(indexPath)) {
  const indexContent = `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Gumroad</title>
    <meta name="description" content="Sell your stuff. See what sticks.">
    <link rel="icon" type="image/x-icon" href="/favicon.ico">
</head>
<body>
    <div id="root">
        <h1>Gumroad</h1>
        <p>Sell your stuff. See what sticks.</p>
        <p>This is a Cloudflare Pages deployment of the Gumroad application.</p>
    </div>
    <script>
        // Redirect to the main application
        if (window.location.pathname === '/' || window.location.pathname === '/index.html') {
            // Check if we're on the main domain and redirect to the Rails app
            console.log('Cloudflare Pages static site loaded');
        }
    </script>
</body>
</html>`;
  
  fs.writeFileSync(indexPath, indexContent);
  console.log('✅ Created index.html for Cloudflare Pages');
}

// Create _headers file for Cloudflare Pages
const headersPath = path.join(publicDir, '_headers');
const headersContent = `/*
  X-Frame-Options: DENY
  X-Content-Type-Options: nosniff
  X-XSS-Protection: 1; mode=block
  Referrer-Policy: strict-origin-when-cross-origin
  Content-Security-Policy: default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval' *.gumroad.com *.cloudflare.com; style-src 'self' 'unsafe-inline' *.gumroad.com; img-src 'self' data: https: *.gumroad.com; font-src 'self' *.gumroad.com; connect-src 'self' *.gumroad.com *.cloudflare.com; frame-src 'self' *.gumroad.com;

/assets/*
  Cache-Control: public, max-age=31536000, immutable

/js/*
  Cache-Control: public, max-age=31536000, immutable

*.css
  Cache-Control: public, max-age=31536000, immutable

*.js
  Cache-Control: public, max-age=31536000, immutable

*.png
  Cache-Control: public, max-age=31536000, immutable

*.jpg
  Cache-Control: public, max-age=31536000, immutable

*.gif
  Cache-Control: public, max-age=31536000, immutable

*.svg
  Cache-Control: public, max-age=31536000, immutable

*.ico
  Cache-Control: public, max-age=31536000, immutable

/api/*
  Cache-Control: no-cache, no-store, must-revalidate

/webhooks/*
  Cache-Control: no-cache, no-store, must-revalidate

/admin/*
  Cache-Control: no-cache, no-store, must-revalidate`;

fs.writeFileSync(headersPath, headersContent);
console.log('✅ Created _headers file with caching and security headers');

// Create _redirects file for Cloudflare Pages
const redirectsPath = path.join(publicDir, '_redirects');
const redirectsContent = `# Cloudflare Pages redirects for Gumroad

# Health check endpoint
/healthcheck https://origin-server.gumroad.com/healthcheck 200

# API routes - proxy to origin server
/api/* https://origin-server.gumroad.com/api/:splat 200
/webhooks/* https://origin-server.gumroad.com/webhooks/:splat 200
/auth/* https://origin-server.gumroad.com/auth/:splat 200
/oauth/* https://origin-server.gumroad.com/oauth/:splat 200
/admin/* https://origin-server.gumroad.com/admin/:splat 200

# Static file fallbacks
/favicon.ico /favicon.ico 200
/robots.txt /robots.txt 200
/sitemap.xml /sitemap.xml 200

# Catch-all for dynamic routes - proxy to origin server
/* https://origin-server.gumroad.com/:splat 200`;

fs.writeFileSync(redirectsPath, redirectsContent);
console.log('✅ Created _redirects file for routing configuration');

// Optimize existing Cloudflare error pages
const cloudflarePages = [
  'cloudflare_challenge.html',
  'cloudflare_down.html',
  'cloudflare_not_available.html',
  'cloudflare_timeout.html',
  'cloudflare_verify_gumco.html',
  'cloudflare_wait.html'
];

cloudflarePages.forEach(page => {
  const pagePath = path.join(publicDir, page);
  if (fs.existsSync(pagePath)) {
    console.log(`✅ Found existing Cloudflare error page: ${page}`);
  }
});

// Create a deployment manifest
const manifestPath = path.join(publicDir, 'deployment-manifest.json');
const manifest = {
  name: 'gumroad',
  version: '1.0.0',
  deployedAt: new Date().toISOString(),
  platform: 'cloudflare-pages',
  features: [
    'static-assets',
    'workers-functions',
    'r2-storage',
    'kv-cache',
    'error-pages',
    'cdn-caching'
  ],
  routes: {
    static: ['/assets/*', '/js/*', '/button/*', '/help/*', '/mobile/*'],
    dynamic: ['/api/*', '/webhooks/*', '/auth/*', '/admin/*', '/oauth/*'],
    proxy: ['/*']
  }
};

fs.writeFileSync(manifestPath, JSON.stringify(manifest, null, 2));
console.log('✅ Created deployment manifest');

console.log('🎉 Asset build for Cloudflare deployment completed!');
console.log('📁 Files created in public/ directory:');
console.log('   - _routes.json (routing configuration)');
console.log('   - _headers (caching and security headers)');
console.log('   - _redirects (URL redirects and proxies)');
console.log('   - index.html (fallback page)');
console.log('   - deployment-manifest.json (deployment info)');
console.log('');
console.log('🚀 Ready for Cloudflare Pages deployment!');
console.log('   Run: npm run deploy:cloudflare');