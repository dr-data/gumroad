# Gumroad Cloudflare Migration

This directory contains the Cloudflare implementation of Gumroad's core functionality, migrated from the original Ruby on Rails application to run on Cloudflare's serverless platform.

## 🏗️ Architecture Overview

```
┌─────────────────┐    ┌──────────────────┐    ┌─────────────────┐
│ Cloudflare      │    │ Cloudflare       │    │ External        │
│ Pages           │ ───│ Workers          │ ───│ Services        │
│ (Frontend)      │    │ (API)            │    │ (Database, etc) │
└─────────────────┘    └──────────────────┘    └─────────────────┘
```

- **Cloudflare Pages**: Static frontend hosting with global CDN
- **Cloudflare Workers**: Serverless API endpoints with edge computing
- **Cloudflare KV**: Key-value storage for sessions, cache, and simple data
- **External Services**: Database, background jobs, and complex processing

## 📁 Directory Structure

```
├── cloudflare-workers/         # API implementation
│   ├── src/
│   │   ├── index.js           # Main worker entry point
│   │   ├── routes/            # API route handlers
│   │   │   ├── api-v2.js      # Gumroad API v2 endpoints
│   │   │   ├── products.js    # Product management
│   │   │   ├── checkout.js    # Purchase flow
│   │   │   └── users.js       # User authentication
│   │   └── utils/             # Utility functions
│   ├── test/                  # Unit tests
│   ├── package.json
│   └── wrangler.toml          # Worker configuration
├── cloudflare-pages/          # Frontend implementation
│   ├── src/
│   │   ├── index.html         # Homepage
│   │   ├── js/app.js          # Main application logic
│   │   └── products/demo.html # Example product page
│   └── package.json
├── wrangler.toml              # Main configuration
├── deploy-cloudflare.sh       # Deployment script
└── CLOUDFLARE_MIGRATION.md    # Detailed migration guide
```

## 🚀 Quick Start

### Prerequisites

1. **Cloudflare Account**: Sign up at [cloudflare.com](https://cloudflare.com)
2. **Node.js 20+**: Install from [nodejs.org](https://nodejs.org)
3. **Wrangler CLI**: Install globally
   ```bash
   npm install -g wrangler
   ```

### Setup

1. **Clone and navigate**:
   ```bash
   git clone <repository-url>
   cd gumroad
   ```

2. **Authenticate with Cloudflare**:
   ```bash
   wrangler login
   ```

3. **Create KV namespaces**:
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

4. **Update wrangler.toml** with your namespace IDs

5. **Deploy**:
   ```bash
   ./deploy-cloudflare.sh
   ```

## 🧪 Development

### Workers Development

```bash
cd cloudflare-workers
npm install
npm run dev        # Start local development server
npm test          # Run tests
npm run deploy    # Deploy to Cloudflare
```

### Pages Development

```bash
cd cloudflare-pages
npm install
npm run dev       # Start local development server
npm run build     # Build for production
```

## 📡 API Endpoints

The migrated API maintains compatibility with Gumroad's existing endpoints:

### License Verification
```http
POST /api/v2/licenses/verify
Content-Type: application/json

{
  "product_permalink": "my-product",
  "license_key": "ABCD-EFGH-IJKL",
  "increment_uses_count": true
}
```

### User Authentication
```http
POST /users/login
Content-Type: application/json

{
  "email": "seller@example.com",
  "password": "password"
}
```

### Product Management
```http
GET /products/my-product-permalink
POST /products
PUT /products/my-product-permalink
```

### Checkout Flow
```http
GET /checkout/my-product-permalink
POST /checkout/my-product-permalink/purchase
```

## 💾 Data Storage

### KV Namespaces

- **KV_SESSIONS**: User sessions and authentication data
- **KV_CACHE**: Temporary data and rate limiting
- **KV_PRODUCTS**: Product information and licenses

### Data Examples

```javascript
// Session data in KV_SESSIONS
{
  "user_id": "user_123",
  "email": "user@example.com", 
  "created_at": "2024-01-01T00:00:00Z",
  "expires_at": "2024-01-08T00:00:00Z"
}

// Product data in KV_PRODUCTS  
{
  "id": "prod_123",
  "name": "My Digital Product",
  "price": 29.99,
  "currency": "USD",
  "seller": { "id": "seller_123", "name": "Creator" }
}
```

## 🔧 Configuration

### Environment Variables

Set these in your Cloudflare Workers dashboard or via Wrangler:

```bash
# Required for production
wrangler secret put DATABASE_URL
wrangler secret put JWT_SECRET
wrangler secret put STRIPE_SECRET_KEY

# Optional for features
wrangler secret put SENDGRID_API_KEY
wrangler secret put REDIS_URL
```

### External Services

For full functionality, configure:

1. **Database**: PlanetScale, Supabase, or Neon for primary data
2. **Background Jobs**: Sidekiq Cloud or Inngest for async processing
3. **Email**: Resend, SendGrid, or Cloudflare Email Routing
4. **Payments**: Stripe, PayPal, or similar payment processor

## 🎯 Performance

### Benchmarks

- **Response Time**: < 50ms globally (vs ~200ms traditional hosting)
- **Cold Start**: ~5ms (vs seconds for containers)
- **Availability**: 99.9%+ (Cloudflare SLA)
- **Scalability**: Millions of requests/minute

### Optimizations

- Edge caching for static content
- KV storage for frequently accessed data
- Minimal bundle sizes with tree shaking
- Optimized images and assets

## 🛡️ Security

### Implemented Features

- CORS headers for cross-origin requests
- Rate limiting to prevent abuse
- Input validation and sanitization
- Session management with secure cookies
- HTTPS everywhere with automatic certificates

### Additional Recommendations

- Enable Cloudflare WAF (Web Application Firewall)
- Use Cloudflare Access for admin areas
- Implement proper JWT authentication
- Set up bot management and DDoS protection

## 📊 Monitoring

### Available Metrics

- Request count and latency
- Error rates and status codes
- Cache hit rates
- Worker execution time
- KV operation metrics

### Debugging

```bash
# Stream live logs
wrangler tail

# View metrics
wrangler dev --remote

# Local debugging
wrangler dev --local
```

## 🚀 Deployment

### Automated with GitHub Actions

The repository includes CI/CD workflows for:

- Running tests on pull requests
- Deploying to staging on pushes to develop
- Deploying to production on pushes to main
- Creating preview deployments for PRs

### Manual Deployment

```bash
# Deploy Workers
cd cloudflare-workers
wrangler deploy

# Deploy Pages
cd cloudflare-pages
npm run build
wrangler pages deploy dist --project-name gumroad-pages
```

## 💰 Cost Analysis

### Cloudflare Free Tier
- **Workers**: 100,000 requests/day
- **KV**: 10GB storage, 100,000 reads/day
- **Pages**: Unlimited static hosting
- **Bandwidth**: Unlimited

### Paid Tier ($5/month)
- **Workers**: 10M requests/month
- **KV**: Additional storage and operations
- **Analytics**: Advanced metrics
- **Support**: Email support

## 🔄 Migration from Rails

### Automated Scripts

For migrating data from the existing Rails application:

1. **Export Products**: `rails runner scripts/export_products_to_kv.rb`
2. **Export Users**: `rails runner scripts/export_users_to_kv.rb` 
3. **Migrate Files**: Upload assets to R2 or external storage

### Gradual Migration

1. Set up Cloudflare in parallel to existing infrastructure
2. Route a percentage of traffic to Cloudflare
3. Monitor performance and error rates
4. Gradually increase traffic percentage
5. Decommission old infrastructure

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch: `git checkout -b feature/amazing-feature`
3. Make your changes and test thoroughly
4. Commit your changes: `git commit -m 'Add amazing feature'`
5. Push to the branch: `git push origin feature/amazing-feature`
6. Open a Pull Request

## 📚 Resources

- [Cloudflare Workers Documentation](https://developers.cloudflare.com/workers/)
- [Cloudflare Pages Documentation](https://developers.cloudflare.com/pages/)
- [Wrangler CLI Reference](https://developers.cloudflare.com/workers/wrangler/)
- [KV Storage Documentation](https://developers.cloudflare.com/workers/runtime-apis/kv/)

## 📄 License

This project maintains the same license as the original Gumroad codebase.

---

**⚡ Powered by Cloudflare's Global Network**

For questions or support, please open an issue or contact the development team.