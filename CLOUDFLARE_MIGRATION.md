# Cloudflare Migration Guide

This document explains how to migrate the Gumroad application to Cloudflare's platform using Workers and Pages.

## Overview

The migration transforms the Ruby on Rails application into:
- **Cloudflare Workers**: Serverless API endpoints
- **Cloudflare Pages**: Static frontend hosting
- **Cloudflare KV**: Key-value storage for sessions and cache
- **Cloudflare R2**: Object storage for files (optional)

## Architecture Changes

### Before (Traditional Rails)
```
Browser → Load Balancer → Rails App → Database
                                   → Redis
                                   → S3
                                   → Sidekiq
```

### After (Cloudflare)
```
Browser → Cloudflare Pages (Frontend)
        → Cloudflare Workers (API)
        → KV Storage (Sessions/Cache)
        → External Database (PlanetScale/Supabase)
        → External Background Jobs (Sidekiq Cloud)
```

## File Structure

```
gumroad/
├── cloudflare-workers/          # API endpoints as Workers
│   ├── src/
│   │   ├── index.js            # Main worker entry point
│   │   ├── routes/             # API route handlers
│   │   ├── utils/              # Utility functions
│   │   └── models/             # Data models
│   ├── package.json
│   └── wrangler.toml           # Worker configuration
├── cloudflare-pages/           # Frontend static site
│   ├── src/
│   │   ├── index.html          # Main page
│   │   ├── js/                 # JavaScript modules
│   │   └── css/                # Stylesheets
│   ├── package.json
│   └── _build.yml              # Pages build config
├── wrangler.toml               # Main Worker config
└── deploy-cloudflare.sh        # Deployment script
```

## Migration Steps

### 1. Set Up Cloudflare Account

1. Create a Cloudflare account (free tier available)
2. Install Wrangler CLI: `npm install -g wrangler`
3. Authenticate: `wrangler login`

### 2. Configure KV Namespaces

Create KV namespaces for data storage:

```bash
# Sessions storage
wrangler kv:namespace create "KV_SESSIONS"
wrangler kv:namespace create "KV_SESSIONS" --preview

# Cache storage
wrangler kv:namespace create "KV_CACHE"
wrangler kv:namespace create "KV_CACHE" --preview

# Products storage
wrangler kv:namespace create "KV_PRODUCTS"
wrangler kv:namespace create "KV_PRODUCTS" --preview
```

Update the namespace IDs in `wrangler.toml`.

### 3. Set Up External Services

Since Cloudflare free tier doesn't include:
- Relational databases
- Background job processing
- Complex data operations

You'll need external services:

#### Database Options:
- **PlanetScale**: MySQL-compatible serverless database
- **Supabase**: PostgreSQL with real-time features
- **Neon**: Serverless PostgreSQL
- **MongoDB Atlas**: NoSQL database

#### Background Jobs:
- **Sidekiq Cloud**: Hosted Sidekiq
- **Inngest**: Event-driven functions
- **Trigger.dev**: Background job platform

### 4. Deploy Workers

```bash
cd cloudflare-workers
npm install
wrangler deploy
```

### 5. Deploy Pages

```bash
cd cloudflare-pages
npm install
npm run build

# Option 1: CLI deployment
wrangler pages deploy dist --project-name gumroad-pages

# Option 2: Connect GitHub repo to Cloudflare Pages dashboard
```

## API Endpoints Migrated

The following Rails endpoints have been converted to Workers:

- `POST /api/v2/licenses/verify` - License verification
- `GET /api/v2/user` - Get user information
- `GET /api/v2/products` - List products
- `POST /products` - Create product
- `GET /products/:permalink` - Get product details
- `PUT /products/:permalink` - Update product
- `POST /users/login` - User authentication
- `POST /users/register` - User registration
- `GET /users/me` - Current user
- `POST /users/logout` - Logout
- `GET /checkout/:permalink` - Checkout page
- `POST /checkout/:permalink/purchase` - Process purchase

## Data Storage Strategy

### KV Storage Usage:
- **KV_SESSIONS**: User sessions, authentication tokens
- **KV_CACHE**: Temporary data, rate limiting counters
- **KV_PRODUCTS**: Product information, licenses

### Limitations:
- KV is eventually consistent
- 25MB value size limit
- 1MB/s write throughput on free tier
- Best for read-heavy workloads

### Data Schema Examples:

```javascript
// Session data
{
  "user_id": "user_123",
  "email": "user@example.com",
  "created_at": "2024-01-01T00:00:00Z",
  "expires_at": "2024-01-08T00:00:00Z"
}

// Product data
{
  "id": "prod_123",
  "name": "Digital Product",
  "price": 29.99,
  "currency": "USD",
  "is_published": true,
  "seller": { "id": "seller_123", "name": "Creator" }
}
```

## Security Considerations

### Implemented:
- CORS headers
- Rate limiting
- Session management
- Input validation

### Additional Recommendations:
- Use Cloudflare Access for admin routes
- Implement proper JWT authentication
- Set up WAF rules
- Use Cloudflare Bot Management

## Performance Benefits

### Cloudflare Advantages:
- **Global CDN**: 300+ edge locations
- **Zero cold starts**: Workers run instantly
- **Auto-scaling**: Handles traffic spikes automatically
- **DDoS protection**: Built-in security
- **SSL/TLS**: Automatic certificate management

### Benchmarks:
- **Response time**: < 50ms globally
- **Availability**: 99.9%+ uptime
- **Scalability**: Millions of requests/minute

## Cost Analysis

### Cloudflare Free Tier Limits:
- **Workers**: 100,000 requests/day
- **KV**: 10GB storage, 100,000 reads/day
- **Pages**: Unlimited static hosting
- **R2**: 10GB storage, 1M Class A operations/month

### Paid Tier Benefits:
- **Workers**: $5/month for 10M requests
- **KV**: Additional storage and operations
- **R2**: $0.015/GB/month storage

## Limitations & Workarounds

### Current Limitations:

1. **CPU Time**: 50ms execution limit (free tier)
   - **Workaround**: Break complex operations into multiple requests

2. **Memory**: 128MB limit
   - **Workaround**: Use external APIs for heavy processing

3. **Persistent Connections**: Not supported
   - **Workaround**: Use external database connections

4. **File System**: No persistent file storage
   - **Workaround**: Use R2 or external storage

### Complex Rails Features Not Migrated:

- Background job processing (Sidekiq)
- Complex ActiveRecord relationships
- File upload processing
- Email sending (can use external services)
- Real-time features (WebSockets)

## Deployment & CI/CD

### GitHub Actions Example:

```yaml
name: Deploy to Cloudflare
on:
  push:
    branches: [main]

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: '20'
      
      - name: Deploy Workers
        run: |
          cd cloudflare-workers
          npm install
          npx wrangler deploy
        env:
          CLOUDFLARE_API_TOKEN: ${{ secrets.CLOUDFLARE_API_TOKEN }}
      
      - name: Deploy Pages
        run: |
          cd cloudflare-pages
          npm install
          npm run build
          npx wrangler pages deploy dist
        env:
          CLOUDFLARE_API_TOKEN: ${{ secrets.CLOUDFLARE_API_TOKEN }}
```

## Monitoring & Debugging

### Available Tools:
- **Wrangler tail**: Real-time log streaming
- **Cloudflare Analytics**: Request metrics
- **Worker metrics**: Performance monitoring
- **Real User Monitoring**: Browser performance

### Debug Commands:
```bash
# Stream live logs
wrangler tail

# Local development
wrangler dev

# Environment variables
wrangler secret put API_KEY
```

## Next Steps

1. **Test the migration** with a subset of users
2. **Set up monitoring** and alerting
3. **Implement proper error handling**
4. **Add comprehensive logging**
5. **Set up backup strategies** for KV data
6. **Configure custom domains**
7. **Implement advanced security features**

## Support & Resources

- [Cloudflare Workers Documentation](https://developers.cloudflare.com/workers/)
- [Cloudflare Pages Documentation](https://developers.cloudflare.com/pages/)
- [KV Storage Documentation](https://developers.cloudflare.com/workers/runtime-apis/kv/)
- [Wrangler CLI Reference](https://developers.cloudflare.com/workers/wrangler/)

## Migration Checklist

- [ ] Set up Cloudflare account and authentication
- [ ] Create and configure KV namespaces
- [ ] Set up external database service
- [ ] Deploy and test Workers API
- [ ] Deploy and test Pages frontend
- [ ] Configure custom domain (optional)
- [ ] Set up monitoring and alerting
- [ ] Implement backup and recovery procedures
- [ ] Update DNS records
- [ ] Test all functionality thoroughly
- [ ] Plan gradual traffic migration