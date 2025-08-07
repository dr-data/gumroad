# Cloudflare Deployment Guide for Gumroad

This guide walks you through deploying the Gumroad application to Cloudflare's platform using Cloudflare Pages for static assets and Cloudflare Workers for dynamic functionality.

## Overview

The Cloudflare deployment setup includes:

- **Cloudflare Pages**: Hosts static assets, images, CSS, JavaScript files
- **Cloudflare Workers**: Handles API routes, dynamic content, and proxying
- **Cloudflare KV**: Caching and session storage
- **Cloudflare R2**: File storage for user uploads
- **Cloudflare D1**: Optional database for simple data (requires migration)

## Prerequisites

1. **Cloudflare Account**: Sign up at [cloudflare.com](https://cloudflare.com)
2. **Domain**: Add your domain to Cloudflare (optional, can use `.pages.dev` subdomain)
3. **Wrangler CLI**: Installed via `npm install wrangler` (already included in package.json)
4. **External Services**: Database, Redis, etc. (see External Services section)

## Quick Start

### 1. Install Dependencies

```bash
npm install
```

### 2. Configure Environment

Copy the Cloudflare environment template:

```bash
cp .env.cloudflare.example .env.cloudflare
```

Edit `.env.cloudflare` with your actual values:

```bash
# Required
CLOUDFLARE_ACCOUNT_ID=your_account_id_here
CLOUDFLARE_API_TOKEN=your_api_token_here

# Optional but recommended
ORIGIN_SERVER_URL=https://your-existing-server.com
CLOUDFLARE_R2_BUCKET_NAME=gumroad-assets
```

### 3. Authenticate Wrangler

```bash
npx wrangler auth login
```

### 4. Create Cloudflare Resources

```bash
# Create KV namespace for caching
npx wrangler kv:namespace create "CACHE"

# Create R2 bucket for assets
npx wrangler r2 bucket create gumroad-assets

# Optional: Create D1 database
npx wrangler d1 create gumroad-db
```

### 5. Update wrangler.toml

Update the `wrangler.toml` file with the IDs from step 4:

```toml
[[kv_namespaces]]
binding = "CACHE"
id = "your_kv_namespace_id"

[[r2_buckets]]
binding = "ASSETS"
bucket_name = "gumroad-assets"

[[d1_databases]]
binding = "DB"
database_id = "your_d1_database_id"
```

### 6. Build and Deploy

```bash
# Build assets for Cloudflare
npm run build:cloudflare

# Deploy to Cloudflare Pages
npm run deploy:cloudflare
```

## Detailed Configuration

### Environment Variables

| Variable | Description | Required |
|----------|-------------|----------|
| `CLOUDFLARE_ACCOUNT_ID` | Your Cloudflare account ID | Yes |
| `CLOUDFLARE_API_TOKEN` | API token with Pages and Workers permissions | Yes |
| `ORIGIN_SERVER_URL` | URL of your existing Rails server for proxying | No |
| `CLOUDFLARE_R2_BUCKET_NAME` | R2 bucket name for file storage | No |
| `RATE_LIMIT_MAX_REQUESTS` | Max requests per minute per IP | No (default: 100) |

### Custom Domains

To use a custom domain:

1. Add your domain to Cloudflare
2. Update `wrangler.toml` routes:

```toml
[env.production]
routes = ["yourdomain.com/*", "*.yourdomain.com/*"]
```

3. Deploy:

```bash
npx wrangler pages deploy public --project-name gumroad --compatibility-date 2024-08-07
```

### SSL/TLS Configuration

Cloudflare automatically provides SSL certificates. Configure SSL mode in Cloudflare dashboard:

1. Go to SSL/TLS → Overview
2. Set encryption mode to "Full (strict)" for enhanced security
3. Enable "Always Use HTTPS"

## External Services

Since Cloudflare Workers have limitations, you'll need external services for:

### Database Options

1. **Keep existing setup**: Proxy database requests to your current server
2. **Cloudflare D1**: For simple data (SQLite-based, limited)
3. **External providers**: 
   - [PlanetScale](https://planetscale.com) for MySQL
   - [Neon](https://neon.tech) for PostgreSQL
   - [MongoDB Atlas](https://mongodb.com/atlas) for MongoDB

### Redis/Caching

1. **Cloudflare KV**: For simple caching (included in setup)
2. **External Redis**: [Upstash](https://upstash.com), [Redis Cloud](https://redis.com/cloud/)

### Background Jobs

1. **Cloudflare Queues**: For simple job processing
2. **External providers**: [Sidekiq Pro](https://sidekiq.org), [Inngest](https://inngest.com)

## Deployment Commands

```bash
# Development preview
npm run preview:cloudflare

# Production deployment
npm run deploy:cloudflare

# Check deployment status
npx wrangler pages deployment list --project-name gumroad

# View logs
npx wrangler pages deployment tail --project-name gumroad
```

## Monitoring and Debugging

### Cloudflare Analytics

Access analytics in the Cloudflare dashboard:
- Pages → gumroad → Analytics
- Workers → gumroad → Analytics

### Logs

```bash
# Real-time logs
npx wrangler pages deployment tail --project-name gumroad

# Worker logs
npx wrangler tail gumroad
```

### Error Handling

The setup includes custom error pages:
- `cloudflare_challenge.html`
- `cloudflare_down.html`
- `cloudflare_timeout.html`
- `cloudflare_not_available.html`

## Performance Optimization

### Caching Strategy

The deployment implements multiple caching layers:

1. **Static Assets**: Cached for 1 year with immutable headers
2. **API Responses**: Cached for 5 minutes using Cloudflare KV
3. **Dynamic Pages**: Proxied to origin with custom cache rules

### CDN Configuration

Static assets are automatically distributed via Cloudflare's global CDN with:
- Brotli compression
- Image optimization
- Minification

## Security Features

### Headers

Security headers are automatically applied:
- X-Frame-Options: DENY
- X-Content-Type-Options: nosniff
- X-XSS-Protection: 1; mode=block
- Strict-Transport-Security
- Content-Security-Policy

### Rate Limiting

Built-in rate limiting (100 requests/minute per IP) using Cloudflare KV.

### DDoS Protection

Cloudflare's DDoS protection is automatically enabled.

## Migration Strategy

### Gradual Migration

1. **Phase 1**: Deploy static assets to Cloudflare Pages
2. **Phase 2**: Route API traffic through Cloudflare Workers
3. **Phase 3**: Migrate background jobs to Cloudflare Queues
4. **Phase 4**: Move databases to Cloudflare D1 or external providers

### Rollback Plan

Keep your existing infrastructure running and use DNS to switch between:
- Cloudflare deployment (new)
- Original deployment (fallback)

## Troubleshooting

### Common Issues

**Build Errors**
```bash
# Clear cache and rebuild
rm -rf node_modules package-lock.json
npm install
npm run build:cloudflare
```

**Authentication Issues**
```bash
# Re-authenticate
npx wrangler auth login
```

**Permission Errors**
- Ensure API token has correct permissions:
  - Cloudflare Pages:Edit
  - Cloudflare Workers:Edit
  - Account settings:Read

### Support Resources

- [Cloudflare Workers Documentation](https://developers.cloudflare.com/workers/)
- [Cloudflare Pages Documentation](https://developers.cloudflare.com/pages/)
- [Wrangler CLI Documentation](https://developers.cloudflare.com/workers/wrangler/)

## Cost Optimization

### Free Tier Limits

Cloudflare's free tier includes:
- Pages: Unlimited static requests
- Workers: 100,000 requests/day
- KV: 100,000 reads/day, 1,000 writes/day
- R2: 10GB storage, 1M Class A operations/month

### Paid Features

For production use, consider:
- Workers Paid ($5/month): 10M requests/month
- R2 Paid: $0.015/GB/month storage
- KV Paid: $0.50/million operations

## Next Steps

1. **Monitor Performance**: Use Cloudflare Analytics to track performance
2. **Optimize Images**: Enable Cloudflare Image Optimization
3. **Add Monitoring**: Set up alerts for errors and performance issues
4. **Scale Gradually**: Move more functionality to Cloudflare as needed

For questions or issues, refer to the Cloudflare documentation or create an issue in this repository.